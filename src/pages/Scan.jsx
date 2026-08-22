import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { subscribe, create } from '../lib/store'
import { useData } from '../context/DataContext'
import { useToast, Header } from '../components/UI'
import { calcIndividualPoints, tierPoints } from '../lib/points'
import Icon from '../components/Icons'

/*
  PROPORTIONAL ATTENDANCE SCORING
  ================================
  Each scan immediately calculates that individual's point contribution:
    points = basePoints(tier) / teamSize
  
  All scans are saved individually to attendanceScans collection.
  Per-session totals are tracked in real-time.
  
  No need to wait for full-team completion — each person's share
  is added the moment they scan.
*/

export default function Scan() {
  const { teams, participants, settings } = useData()
  const toast = useToast()
  const [program, setProgram] = useState([])
  const [itemId, setItemId] = useState('')
  const [scanning, setScanning] = useState(false)
  // sessions: { [teamId]: { scans: [{personId, name, points, time}], teamPts } }
  const [sessions, setSessions] = useState({})
  const [allScannedIds, setAllScannedIds] = useState(new Set())
  const qrRef = useRef(null)
  const lastScan = useRef({ code: '', t: 0 })

  useEffect(() => subscribe('program', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setProgram(arr)
  }), [])

  const start = async () => {
    if (!itemId) return toast('اختر الفقرة أولاً', 'warn')
    setScanning(true)
    setTimeout(initCamera, 100)
  }

  const resetSession = () => {
    if (!confirm('بدء جلسة جديدة؟ سيتم مسح قوائم الحضور الحالية من الشاشة (النتائج المحفوظة تبقى).')) return
    setSessions({})
    setAllScannedIds(new Set())
    toast('تم بدء جلسة جديدة', 'ok')
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
    const person = participants.find(p => p.id === code || p.qr === code)
    if (!person) {
      beep('err'); toast('QR Code غير صالح أو غير مسجل في النظام', 'err'); return
    }

    // Check if already scanned in THIS session
    if (allScannedIds.has(person.id)) {
      beep('err'); toast(`${person.name} — تم تسجيل حضوره بالفعل`, 'err'); return
    }

    const tid = person.teamId
    const teamName = teams.find(t => t.id === tid)?.name || ''
    const teamSize = participants.filter(p => p.teamId === tid).length
    const scanTime = new Date()
    const pts = calcIndividualPoints(scanTime, teamSize, settings.points)
    const basePts = tierPoints(scanTime, settings.points)
    const roundPts = Math.round(pts * 100) / 100

    // Save scan
    const item = program.find(p => p.id === itemId)
    saveScan({
      personId: person.id, personName: person.name,
      teamId: tid, teamName,
      programItemId: itemId, programItemTitle: item?.title || '',
      day: item?.day || '',
      scanTime: scanTime.toISOString(),
      baseTierPoints: basePts, individualPoints: roundPts, teamSize,
    })

    // Update session state
    setAllScannedIds(prev => new Set([...prev, person.id]))
    setSessions(prev => {
      const sess = { ...prev }
      if (!sess[tid]) sess[tid] = { scans: [], teamPts: 0 }
      const newScans = [...sess[tid].scans, { personId: person.id, name: person.name, points: roundPts, basePts, time: scanTime.toLocaleTimeString('ar-EG') }]
      const newTeamPts = Math.round(newScans.reduce((s, sc) => s + sc.points, 0) * 100) / 100
      sess[tid] = { scans: newScans, teamPts: newTeamPts }
      return sess
    })

    beep('ok')
    const presentCount = (sessions[tid]?.scans.length || 0) + 1
    toast(`✓ ${person.name} — +${roundPts} (${presentCount}/${teamSize})`, 'ok', 2000)
  }

  const saveScan = async (data) => {
    await create('attendanceScans', data)
  }

  // End session: save summary result
  const endSession = async (tid) => {
    const sess = sessions[tid]
    if (!sess || sess.scans.length === 0) return
    const team = teams.find(t => t.id === tid)
    const item = program.find(p => p.id === itemId)
    const teamSize = participants.filter(p => p.teamId === tid).length
    await create('attendanceResults', {
      teamId: tid, teamName: team?.name || '',
      programItemId: itemId, programItemTitle: item?.title || '',
      day: item?.day || '',
      completedCount: sess.scans.length, totalCount: teamSize,
      completionTime: new Date().toISOString(),
      points: sess.teamPts,
      details: sess.scans.map(s => ({ name: s.name, points: s.points, basePts: s.basePts, time: s.time }))
    })
    toast(`✓ تم حفظ نتيجة ${team?.name}: ${sess.teamPts} نقطة`, 'ok', 3000)
  }

  const sortedTeams = teams.slice().sort((a, b) => a.order - b.order)

  return (
    <div className="page">
      <Header title="تسجيل الحضور" />

      {!scanning ? (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>الفقرة (جلسة الحضور)</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">— اختر الفقرة —</option>
                {program.map(p => (
                  <option key={p.id} value={p.id}>{p.day} — {p.title}</option>
                ))}
              </select>
            </div>
            <button className="btn full" onClick={start}>
              <Icon name="scan" size={18} /> ابدأ تسجيل الحضور
            </button>
            <p className="subtle" style={{ textAlign: 'center', marginTop: 8 }}>
              صوّر كارنيه أي مخدوم — يتم احتسابه في فريقه تلقائياً
            </p>
          </div>

          {/* live sessions summary */}
          {Object.keys(sessions).length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title" style={{ marginBottom: 0 }}>الفرق في هذه الجلسة</h3>
                <button className="btn ghost" style={{ padding: '6px 12px' }} onClick={resetSession}>جلسة جديدة</button>
              </div>
              {Object.entries(sessions).map(([tid, s]) => {
                const t = teams.find(x => x.id === tid)
                const size = participants.filter(p => p.teamId === tid).length
                return (
                  <div key={tid} className="card" style={{ marginBottom: 10, borderInlineStart: `5px solid ${t?.color || 'var(--gold)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>{t?.name}</span>
                      <span style={{ color: 'var(--maroon)' }}>{s.teamPts} نقطة</span>
                    </div>
                    <div className="subtle">{s.scans.length}/{size} حضور</div>
                    <Progress value={s.scans.length} max={size} />
                    {/* details */}
                    <details style={{ marginTop: 8 }}>
                      <summary className="subtle" style={{ cursor: 'pointer' }}>تفاصيل الحضور</summary>
                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        {s.scans.map((sc, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(201,154,58,.15)' }}>
                            <span>{sc.name}</span>
                            <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{sc.points} ({sc.time})</span>
                          </div>
                        ))}
                      </div>
                    </details>
                    <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => endSession(tid)}>
                      <Icon name="check" size={16} /> حفظ نتيجة الفريق
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>صوّر كارنيه أي مخدوم من أي فريق</div>
            {Object.entries(sessions).map(([tid, s]) => {
              const t = teams.find(x => x.id === tid)
              const size = participants.filter(p => p.teamId === tid).length
              return (
                <div key={tid} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontWeight: 700, color: t?.color }}>{t?.name}</span>
                  <span style={{ fontWeight: 800 }}>{s.scans.length}/{size} — {s.teamPts} ن</span>
                </div>
              )
            })}
          </div>
          <div id="qr-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)' }} />
          <button className="btn red full" style={{ marginTop: 14 }} onClick={stop}>إيقاف الماسح</button>
        </>
      )}
    </div>
  )
}

function Progress({ value, max }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ height: 12, borderRadius: 999, background: 'rgba(201,154,58,.2)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', width: pct + '%',
        background: 'linear-gradient(90deg,var(--gold-2),var(--gold))',
        transition: 'width .3s ease'
      }} />
    </div>
  )
}
