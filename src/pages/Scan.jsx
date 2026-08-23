import { useEffect, useState, useRef, useMemo } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { subscribe, update, recordAttendance } from '../lib/store'
import { useData } from '../context/DataContext'
import { useToast, Header } from '../components/UI'
import { validatePeriods, resolveStatus, sortPeriods, fmtClock, defaultPeriods } from '../lib/attendancePeriods'
import Icon from '../components/Icons'

/*
  Advanced attendance:
  1) Admin picks a program item.
  2) Configures multiple timer periods (from/to/points) in a table.
  3) Start → camera opens; a status circle shows the CURRENT grade,
     auto-transitioning as real time crosses period boundaries, and
     showing "انتهى" after the last period.
  4) Each scan is recorded immediately & idempotently (no Save button);
     multiple admins can scan concurrently without duplicates.
*/

export default function Scan() {
  const { participants, teams } = useData()
  const toast = useToast()
  const [program, setProgram] = useState([])
  const [scans, setScans] = useState([])
  const [itemId, setItemId] = useState('')
  const [periods, setPeriods] = useState(defaultPeriods())
  const [scanning, setScanning] = useState(false)
  const [now, setNow] = useState(Date.now())
  const qrRef = useRef(null)
  const lastScan = useRef({ code: '', t: 0 })

  useEffect(() => subscribe('program', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setProgram(arr)
  }), [])
  useEffect(() => subscribe('attendanceScans', setScans), [])

  // tick every second while scanning (drives the auto-transition)
  useEffect(() => {
    if (!scanning) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [scanning])

  const item = program.find(p => p.id === itemId)

  // load periods from the item when selected (or default)
  useEffect(() => {
    if (item) {
      setPeriods(item.attendancePeriods && item.attendancePeriods.length ? item.attendancePeriods : defaultPeriods())
    }
  }, [itemId])

  const status = useMemo(() => resolveStatus(periods, new Date(now)), [periods, now])

  // ---- period table editing ----
  const setRow = (i, patch) => setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const addRow = () => {
    const last = periods[periods.length - 1]
    setPeriods([...periods, { from: last?.to || '19:00', to: '', points: 0 }])
  }
  const delRow = (i) => setPeriods(ps => ps.filter((_, idx) => idx !== i))

  const savePeriods = async () => {
    const v = validatePeriods(periods)
    if (!v.ok) { toast(v.error, 'err'); return false }
    await update('program', itemId, { attendancePeriods: sortPeriods(periods) })
    toast('تم حفظ الفترات', 'ok')
    return true
  }

  const start = async () => {
    if (!itemId) return toast('اختر الفقرة أولاً', 'warn')
    const v = validatePeriods(periods)
    if (!v.ok) return toast(v.error, 'err')
    await update('program', itemId, { attendancePeriods: sortPeriods(periods) })
    setScanning(true); setNow(Date.now())
    setTimeout(initCamera, 100)
  }

  const initCamera = async () => {
    try {
      const qr = new Html5Qrcode('qr-reader')
      qrRef.current = qr
      await qr.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 240, height: 240 } }, onScan, () => {})
    } catch (e) {
      toast('تعذّر فتح الكاميرا — تأكد من الإذن', 'err'); setScanning(false)
    }
  }
  const stop = async () => {
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current.clear() } } catch {}
    qrRef.current = null; setScanning(false)
  }
  useEffect(() => () => { stop() }, [])

  const beep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = type === 'ok' ? 880 : 240
      g.gain.value = .12; o.start(); o.stop(ctx.currentTime + .12)
    } catch {}
    if (navigator.vibrate) navigator.vibrate(type === 'ok' ? 60 : [40, 40, 40])
  }

  const onScan = (decoded) => {
    const t = Date.now()
    if (decoded === lastScan.current.code && t - lastScan.current.t < 2500) return
    lastScan.current = { code: decoded, t }
    handleCode(decoded.trim())
  }

  const handleCode = async (code) => {
    // re-resolve status at the exact scan moment
    const st = resolveStatus(periods, new Date())
    if (st.state === 'ended') { beep('err'); toast('انتهى وقت تسجيل الحضور', 'err'); return }
    if (st.state === 'before') { beep('err'); toast('لم يبدأ وقت التسجيل بعد', 'warn'); return }

    const person = participants.find(p => p.id === code || p.qr === code)
    if (!person) { beep('err'); toast('QR غير صالح أو غير مسجّل', 'err'); return }

    const tid = person.teamId
    const teamName = teams.find(x => x.id === tid)?.name || ''
    const pts = st.points || 0

    const res = await recordAttendance({
      itemId, personId: person.id, personName: person.name,
      teamId: tid, teamName,
      points: pts, periodLabel: st.activeIndex >= 0 ? `فترة ${st.activeIndex + 1}` : 'خارج الفترات',
      itemTitle: item?.title || '', day: item?.day || ''
    })

    if (res.duplicate) { beep('err'); toast(`${person.name} — تم تسجيله من قبل`, 'err'); return }
    if (res.error) { beep('err'); toast('خطأ في الحفظ: ' + res.error, 'err'); return }
    beep('ok'); toast(`✓ ${person.name} — +${pts}`, 'ok', 1800)
  }

  // stats for current item
  const itemScans = scans.filter(s => s.itemId === itemId)
  const perTeam = useMemo(() => {
    const m = {}
    itemScans.forEach(s => {
      if (!m[s.teamId]) m[s.teamId] = { count: 0, pts: 0 }
      m[s.teamId].count++; m[s.teamId].pts += (s.points || 0)
    })
    return m
  }, [itemScans])

  const periodValidation = validatePeriods(periods)

  return (
    <div className="page">
      <Header title="تسجيل الحضور" />

      {!scanning ? (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>الفقرة</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">— اختر الفقرة —</option>
                {program.map(p => <option key={p.id} value={p.id}>{p.day} — {p.title}</option>)}
              </select>
            </div>

            {itemId && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                  <label style={{ fontWeight: 800, color: 'var(--maroon)' }}>فترات الحضور والدرجات</label>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 13 }} onClick={addRow}>+ فترة</button>
                </div>
                <div className="att-periods">
                  <div className="att-row att-head">
                    <span>من</span><span>إلى</span><span>الدرجة</span><span></span>
                  </div>
                  {periods.map((p, i) => (
                    <div className="att-row" key={i}>
                      <input type="time" value={p.from} onChange={e => setRow(i, { from: e.target.value })} />
                      <input type="time" value={p.to} onChange={e => setRow(i, { to: e.target.value })} />
                      <input type="number" value={p.points} onChange={e => setRow(i, { points: e.target.value })} />
                      <button className="btn ghost" style={{ padding: '4px 6px', color: 'var(--red)' }} onClick={() => delRow(i)} disabled={periods.length <= 1}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {!periodValidation.ok && <div className="att-warn">⚠️ {periodValidation.error}</div>}

                <button className="btn full" style={{ marginTop: 12 }} onClick={start} disabled={!periodValidation.ok}>
                  <Icon name="scan" size={18} /> بدء التسجيل
                </button>
                <p className="subtle" style={{ textAlign: 'center', marginTop: 8 }}>
                  الكاميرا هتفتح وتنتقل الدرجة أوتوماتيك حسب الوقت
                </p>
              </>
            )}
          </div>

          {itemId && Object.keys(perTeam).length > 0 && (
            <>
              <h3 className="section-title">حضور هذه الفقرة</h3>
              {teams.filter(t => perTeam[t.id]).sort((a,b)=>a.order-b.order).map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderInlineStart: `5px solid ${t.color}` }}>
                  <span style={{ fontWeight: 800 }}>{t.name}</span>
                  <span className="subtle">{perTeam[t.id].count} حضور • {perTeam[t.id].pts} نقطة</span>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          {/* status circle */}
          <div className="att-status-wrap">
            <StatusCircle status={status} periods={periods} />
          </div>

          {status.state !== 'ended' ? (
            <div id="qr-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)', marginTop: 8 }} />
          ) : (
            <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 40 }}>⛔</div>
              <div style={{ fontWeight: 800, color: 'var(--red)' }}>انتهى تسجيل الحضور</div>
              <div className="subtle">لا يمكن تسجيل حضور جديد</div>
            </div>
          )}

          {/* live per-team tally */}
          {Object.keys(perTeam).length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              {teams.filter(t => perTeam[t.id]).sort((a,b)=>a.order-b.order).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontWeight: 700, color: t.color }}>{t.name}</span>
                  <span style={{ fontWeight: 800 }}>{perTeam[t.id].count} • {perTeam[t.id].pts} ن</span>
                </div>
              ))}
            </div>
          )}

          <button className="btn red full" style={{ marginTop: 14 }} onClick={stop}>إنهاء الماسح</button>
        </>
      )}
    </div>
  )
}

function StatusCircle({ status, periods }) {
  let big, label, color, sub
  if (status.state === 'before') {
    big = '⏳'; label = 'لم يبدأ بعد'; color = 'var(--muted)'
    sub = `يبدأ ${fmtClock(sortPeriods(periods)[0].from)}`
  } else if (status.state === 'ended') {
    big = '⛔'; label = 'انتهى'; color = 'var(--red)'; sub = 'تم إغلاق التسجيل'
  } else if (status.gap) {
    big = '⏸'; label = 'بين الفترات'; color = 'var(--gold)'; sub = '0 نقطة حالياً'
  } else {
    big = status.points; label = 'الدرجة الحالية'; color = 'var(--green)'
    sub = `الفترة ${status.activeIndex + 1} • تنتهي ${fmtClock(minToHHMM(status.endsAtMin))}`
  }
  return (
    <div className="att-circle" style={{ borderColor: color }}>
      <div className="att-circle-big" style={{ color }}>{big}</div>
      <div className="att-circle-label">{label}</div>
      <div className="att-circle-sub">{sub}</div>
    </div>
  )
}

function minToHHMM(mins) {
  if (mins == null) return ''
  const h = Math.floor(mins / 60), m = Math.round(mins % 60)
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
