import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { subscribe, create, update } from '../lib/store'
import { useData } from '../context/DataContext'
import { useToast, Header } from '../components/UI'
import { calcPoints } from '../lib/points'
import Icon from '../components/Icons'

/*
  Attendance workflow (organizer's phone):
  1. Pick a team + program item.
  2. Open scanner. Scan member cards.
  3. Each valid scan adds member to present list (no duplicates in this session).
  4. Progress X / N based on team size in DB.
  5. When a scanned person belongs to ANOTHER team, they are counted for THEIR
     own team's session (a separate live session is opened for that team) and a
     message says so.
  6. When a team reaches N/N -> completion time recorded, points calculated,
     result saved, added to team total. Cannot complete early.
*/

export default function Scan() {
  const { teams, participants, settings } = useData()
  const toast = useToast()
  const [program, setProgram] = useState([])
  const [teamId, setTeamId] = useState('')
  const [itemId, setItemId] = useState('')
  const [scanning, setScanning] = useState(false)
  // sessions: { [teamId]: { presentIds:Set, startedAt, completed:bool } }
  const [sessions, setSessions] = useState({})
  const qrRef = useRef(null)
  const lastScan = useRef({ code: '', t: 0 })

  useEffect(() => subscribe('program', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setProgram(arr)
  }), [])

  const teamMembers = (tid) => participants.filter(p => p.teamId === tid)
  const curTeam = teams.find(t => t.id === teamId)
  const curSession = sessions[teamId]
  const present = curSession ? curSession.presentIds : []
  const total = curTeam ? teamMembers(teamId).length : 0

  const beginSession = (tid) => {
    setSessions(s => s[tid] ? s : ({ ...s, [tid]: { presentIds: [], startedAt: Date.now(), completed: false } }))
  }

  const start = async () => {
    if (!teamId) return toast('اختر الفريق أولاً', 'warn')
    if (!itemId) return toast('اختر الفقرة أولاً', 'warn')
    if (total === 0) return toast('لا يوجد أعضاء في هذا الفريق', 'err')
    beginSession(teamId)
    setScanning(true)
    setTimeout(initCamera, 100)
  }

  const initCamera = async () => {
    try {
      const qr = new Html5Qrcode('qr-reader')
      qrRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 230, height: 230 } },
        onScan,
        () => {}
      )
    } catch (e) {
      toast('تعذّر فتح الكاميرا — تأكد من الإذن', 'err')
      setScanning(false)
    }
  }

  const stop = async () => {
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current.clear() } } catch {}
    qrRef.current = null
    setScanning(false)
  }
  useEffect(() => () => { stop() }, [])

  const onScan = (decoded) => {
    const now = Date.now()
    // debounce identical rapid scans
    if (decoded === lastScan.current.code && now - lastScan.current.t < 2500) return
    lastScan.current = { code: decoded, t: now }
    handleCode(decoded.trim())
  }

  const beep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = type === 'ok' ? 880 : 240
      g.gain.value = .12; o.start(); o.stop(ctx.currentTime + .12)
    } catch {}
    if (navigator.vibrate) navigator.vibrate(type === 'ok' ? 60 : [40, 40, 40])
  }

  const handleCode = (code) => {
    // QR must encode a participant id present in DB
    const person = participants.find(p => p.id === code || p.qr === code)
    if (!person) {
      beep('err'); toast('QR Code غير صالح أو غير مسجل في النظام', 'err'); return
    }

    const targetTeam = person.teamId
    const targetTeamName = teams.find(t => t.id === targetTeam)?.name || ''

    // ensure a session exists for the person's OWN team
    setSessions(prev => {
      const sess = { ...prev }
      if (!sess[targetTeam]) sess[targetTeam] = { presentIds: [], startedAt: Date.now(), completed: false }

      if (sess[targetTeam].presentIds.includes(person.id)) {
        beep('err'); toast(`${person.name} — تم تسجيل حضوره بالفعل`, 'err'); return prev
      }

      const newPresent = [...sess[targetTeam].presentIds, person.id]
      sess[targetTeam] = { ...sess[targetTeam], presentIds: newPresent }

      const teamSize = participants.filter(p => p.teamId === targetTeam).length

      if (targetTeam !== teamId) {
        beep('ok')
        toast(`${person.name} تابع لـ«${targetTeamName}» — تم احتساب حضوره في فريقه`, 'warn', 3200)
      } else {
        beep('ok')
        toast(`✓ ${person.name} — ${newPresent.length}/${teamSize}`, 'ok', 1500)
      }

      // completion check (cannot complete early)
      if (newPresent.length >= teamSize && teamSize > 0 && !sess[targetTeam].completed) {
        sess[targetTeam].completed = true
        finalizeTeam(targetTeam, teamSize)
      }
      return sess
    })
  }

  const finalizeTeam = async (tid, size) => {
    const completionDate = new Date()
    const pts = calcPoints(completionDate, settings.points)
    const item = program.find(p => p.id === itemId)
    const team = teams.find(t => t.id === tid)

    await create('attendanceResults', {
      teamId: tid,
      teamName: team?.name || '',
      programItemId: itemId,
      programItemTitle: item?.title || '',
      day: item?.day || '',
      completedCount: size,
      totalCount: size,
      completionTime: completionDate.toISOString(),
      points: pts
    })
    // add to team total via bonusPoints? No — attendance points are summed from results.
    toast(`🎉 اكتمل ${team?.name}! النقاط: ${pts}`, 'ok', 4000)
    beep('ok')
  }

  const availableItems = program // organizer chooses which item triggers attendance

  return (
    <div className="page">
      <Header title="تسجيل الحضور" />

      {!scanning ? (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>الفريق</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)}>
                <option value="">— اختر الفريق —</option>
                {teams.sort((a, b) => a.order - b.order).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({teamMembers(t.id).length} عضو)</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>الفقرة (جلسة الحضور)</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">— اختر الفقرة —</option>
                {availableItems.map(p => (
                  <option key={p.id} value={p.id}>{p.day} — {p.title}</option>
                ))}
              </select>
            </div>
            <button className="btn full" onClick={start}>
              <Icon name="scan" size={18} /> ابدأ تسجيل الحضور
            </button>
          </div>

          {/* live sessions summary */}
          {Object.keys(sessions).length > 0 && (
            <>
              <h3 className="section-title">الجلسات النشطة</h3>
              {Object.entries(sessions).map(([tid, s]) => {
                const t = teams.find(x => x.id === tid)
                const size = participants.filter(p => p.teamId === tid).length
                return (
                  <div key={tid} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>{t?.name}</span>
                      <span style={{ color: s.completed ? 'var(--green)' : 'var(--maroon)' }}>
                        {s.presentIds.length}/{size} {s.completed && '✓'}
                      </span>
                    </div>
                    <Progress value={s.presentIds.length} max={size} />
                  </div>
                )
              })}
            </>
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, color: 'var(--maroon)', fontSize: 18 }}>{curTeam?.name}</div>
            <div style={{ fontSize: 34, fontWeight: 900, margin: '6px 0', color: curSession?.completed ? 'var(--green)' : 'var(--ink)' }}>
              {present.length} / {total}
            </div>
            <Progress value={present.length} max={total} />
          </div>
          <div id="qr-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)' }} />
          <button className="btn red full" style={{ marginTop: 14 }} onClick={stop}>إيقاف الماسح</button>
          <p className="subtle" style={{ textAlign: 'center', marginTop: 10 }}>
            صوّر الـQR الموجود على كارنيه كل مخدوم
          </p>
        </>
      )}
    </div>
  )
}

function Progress({ value, max }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  const done = max > 0 && value >= max
  return (
    <div style={{ height: 12, borderRadius: 999, background: 'rgba(201,154,58,.2)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', width: pct + '%',
        background: done ? 'linear-gradient(90deg,#4f8062,var(--green))' : 'linear-gradient(90deg,var(--gold-2),var(--gold))',
        transition: 'width .3s ease'
      }} />
    </div>
  )
}
