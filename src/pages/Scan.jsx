import { useEffect, useState, useRef, useMemo } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { subscribe, update, upsert, recordAttendance } from '../lib/store'
import { useData } from '../context/DataContext'
import { useToast, Header } from '../components/UI'
import { validatePeriods, resolveStatus, sortPeriods, fmtClock, defaultPeriods } from '../lib/attendancePeriods'
import Icon from '../components/Icons'

/*
  Advanced attendance:
  1) Admin picks a program item.
  2) Configures multiple timer periods (from/to/points) in a table.
  3) Start â†’ camera opens; a status circle shows the CURRENT grade,
     auto-transitioning as real time crosses period boundaries, and
     showing "Ø§Ù†ØªÙ‡Ù‰" after the last period.
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
  const [camFailed, setCamFailed] = useState(false)
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

  // start the camera only once the #qr-reader element is actually in the DOM
  // (it renders only while scanning && not ended). Retries briefly if needed.
  useEffect(() => {
    if (!scanning) return
    if (qrRef.current) return // already running
    if (camFailed) return // user must press retry
    let cancelled = false
    let tries = 0
    const tryInit = () => {
      if (cancelled) return
      const el = document.getElementById('qr-reader')
      if (el && !qrRef.current) { initCamera(); return }
      if (tries++ < 20) setTimeout(tryInit, 100) // wait up to ~2s for the element
    }
    tryInit()
    return () => { cancelled = true }
  }, [scanning, camFailed])

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
    toast('ØªÙ… Ø­ÙØ¸ Ø§Ù„ÙØªØ±Ø§Øª', 'ok')
    return true
  }

  const start = async () => {
    if (!itemId) return toast('Ø§Ø®ØªØ± Ø§Ù„ÙÙ‚Ø±Ø© Ø£ÙˆÙ„Ø§Ù‹', 'warn')
    const v = validatePeriods(periods)
    if (!v.ok) return toast(v.error, 'err')
    await update('program', itemId, { attendancePeriods: sortPeriods(periods) })
    setScanning(true); setNow(Date.now()); setCamFailed(false)
  }

  const retryCamera = async () => {
    setCamFailed(false)
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current.clear() } } catch {}
    qrRef.current = null
    setTimeout(initCamera, 200)
  }

  const initCamera = async () => {
    if (qrRef.current) return
    const el = document.getElementById('qr-reader')
    if (!el) return
    try {
      const qr = new Html5Qrcode('qr-reader')
      await qr.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 240, height: 240 } }, onScan, () => {})
      qrRef.current = qr // only mark running after a successful start
    } catch (e) {
      // clean up any half-initialized instance and let the user retry
      toast('ØªØ¹Ø°Ù‘Ø± ÙØªØ­ Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ â€” Ø§Ø¶ØºØ· "Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©"', 'err')
      setCamFailed(true)
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
    if (st.state === 'ended') { beep('err'); toast('Ø§Ù†ØªÙ‡Ù‰ ÙˆÙ‚Øª ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±', 'err'); return }
    if (st.state === 'before') { beep('err'); toast('Ù„Ù… ÙŠØ¨Ø¯Ø£ ÙˆÙ‚Øª Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ø¹Ø¯', 'warn'); return }

    const person = participants.find(p => p.id === code || p.qr === code)
    if (!person) { beep('err'); toast('QR ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ ØºÙŠØ± Ù…Ø³Ø¬Ù‘Ù„', 'err'); return }

    const tid = person.teamId
    const teamName = teams.find(x => x.id === tid)?.name || ''
    const pts = st.points || 0

    const res = await recordAttendance({
      itemId, personId: person.id, personName: person.name,
      teamId: tid, teamName,
      points: pts, periodLabel: st.activeIndex >= 0 ? `ÙØªØ±Ø© ${st.activeIndex + 1}` : 'Ø®Ø§Ø±Ø¬ Ø§Ù„ÙØªØ±Ø§Øª',
      itemTitle: item?.title || '', day: item?.day || ''
    })

    if (res.duplicate) { beep('err'); toast(`${person.name} â€” ØªÙ… ØªØ³Ø¬ÙŠÙ„Ù‡ Ù…Ù† Ù‚Ø¨Ù„`, 'err'); return }
    if (res.error) { beep('err'); toast('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø­ÙØ¸: ' + res.error, 'err'); return }
    beep('ok'); toast(`âœ“ ${person.name} â€” +${pts}`, 'ok', 1800)
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

  // Aggregate this item's scans into per-team attendanceResults rows so the
  // points show up in the admin standings / leaderboard. Uses a stable doc id
  // `${itemId}__${teamId}` via upsert, so pressing the button again just
  // refreshes the totals instead of creating duplicates.
  const [committing, setCommitting] = useState(false)
  const commitToTeams = async () => {
    if (!itemId) return toast('Ø§Ø®ØªØ± Ø§Ù„ÙÙ‚Ø±Ø© Ø£ÙˆÙ„Ø§Ù‹', 'warn')
    const entries = Object.entries(perTeam)
    if (entries.length === 0) return toast('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø­Ø¶ÙˆØ± Ù…Ø³Ø¬Ù‘Ù„ Ù„Ù‡Ø°Ù‡ Ø§Ù„ÙÙ‚Ø±Ø©', 'warn')
    setCommitting(true)
    try {
      const totalMembers = participants.length
      for (const [teamId, agg] of entries) {
        const teamMembers = participants.filter(p => p.teamId === teamId).length
        await upsert('attendanceResults', `${itemId}__${teamId}`, {
          itemId,
          itemTitle: item?.title || '',
          teamId,
          teamName: teams.find(t => t.id === teamId)?.name || '',
          points: Math.round(agg.pts * 100) / 100,
          completedCount: agg.count,
          totalCount: teamMembers || totalMembers,
          completionTime: new Date().toISOString(),
        })
      }
      toast('ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ù„Ù„ÙØ±Ù‚ âœ“', 'ok')
    } catch (e) {
      toast('Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø¥Ø¶Ø§ÙØ©: ' + e.message, 'err')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="page">
      <Header title="ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±" />

      {!scanning ? (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Ø§Ù„ÙÙ‚Ø±Ø©</label>
              <select value={itemId} onChange={e => setItemId(e.target.value)}>
                <option value="">â€” Ø§Ø®ØªØ± Ø§Ù„ÙÙ‚Ø±Ø© â€”</option>
                {program.map(p => <option key={p.id} value={p.id}>{p.day} â€” {p.title}</option>)}
              </select>
            </div>

            {itemId && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                  <label style={{ fontWeight: 800, color: 'var(--maroon)' }}>ÙØªØ±Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„Ø¯Ø±Ø¬Ø§Øª</label>
                  <button className="btn ghost" style={{ padding: '5px 10px', fontSize: 13 }} onClick={addRow}>+ ÙØªØ±Ø©</button>
                </div>
                <div className="att-periods">
                  <div className="att-row att-head">
                    <span>Ù…Ù†</span><span>Ø¥Ù„Ù‰</span><span>Ø§Ù„Ø¯Ø±Ø¬Ø©</span><span></span>
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
                {!periodValidation.ok && <div className="att-warn">âš ï¸ {periodValidation.error}</div>}

                <button className="btn full" style={{ marginTop: 12 }} onClick={start} disabled={!periodValidation.ok}>
                  <Icon name="scan" size={18} /> Ø¨Ø¯Ø¡ Ø§Ù„ØªØ³Ø¬ÙŠÙ„
                </button>
                <p className="subtle" style={{ textAlign: 'center', marginTop: 8 }}>
                  Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ù‡ØªÙØªØ­ ÙˆØªÙ†ØªÙ‚Ù„ Ø§Ù„Ø¯Ø±Ø¬Ø© Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒ Ø­Ø³Ø¨ Ø§Ù„ÙˆÙ‚Øª
                </p>
              </>
            )}
          </div>

          {itemId && Object.keys(perTeam).length > 0 && (
            <>
              <h3 className="section-title">Ø­Ø¶ÙˆØ± Ù‡Ø°Ù‡ Ø§Ù„ÙÙ‚Ø±Ø©</h3>
              {teams.filter(t => perTeam[t.id]).sort((a,b)=>a.order-b.order).map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderInlineStart: `5px solid ${t.color}` }}>
                  <span style={{ fontWeight: 800 }}>{t.name}</span>
                  <span className="subtle">{perTeam[t.id].count} Ø­Ø¶ÙˆØ± â€¢ {perTeam[t.id].pts} Ù†Ù‚Ø·Ø©</span>
                </div>
              ))}
              <button className="btn gold full" style={{ marginTop: 12 }} onClick={commitToTeams} disabled={committing}>
                {committing ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø¶Ø§ÙØ©...' : 'âž• Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ù„Ù„ÙØ±Ù‚'}
              </button>
              <p className="subtle" style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
                Ø¨ÙŠØ¬Ù…Ø¹ Ø¯Ø±Ø¬Ø§Øª Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆÙŠØ¶ÙŠÙÙ‡Ø§ Ù„Ù†ØªØ§Ø¦Ø¬ Ø§Ù„ÙØ±Ù‚. ØªÙ‚Ø¯Ø± ØªØ¯ÙˆØ³Ù‡ Ø£ÙƒØªØ± Ù…Ù† Ù…Ø±Ø©ØŒ Ù‡ÙŠØ­Ø¯Ù‘Ø« Ø§Ù„Ù‚ÙŠÙ… Ù…Ø´ ÙŠÙƒØ±Ø±Ù‡Ø§.
              </p>
            </>
          )}
        </>
      ) : (
        <>
          {/* status circle */}
          <div className="att-status-wrap">
            <StatusCircle status={status} periods={periods} />
          </div>

          {status.state === 'ended' && (
            <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 40 }}>â›”</div>
              <div style={{ fontWeight: 800, color: 'var(--red)' }}>Ø§Ù†ØªÙ‡Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±</div>
              <div className="subtle">Ù„Ø§ ÙŠÙ…ÙƒÙ† ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø¬Ø¯ÙŠØ¯ â€” Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ù…ÙØªÙˆØ­Ø© Ù„Ù„Ù…Ø¹Ø§ÙŠÙ†Ø© ÙÙ‚Ø·</div>
            </div>
          )}

          {/* Reader is ALWAYS mounted while scanning (like the login page),
              so the camera opens regardless of the time window. Time only
              controls the grade / whether a scan is accepted. */}
          <div id="qr-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)', marginTop: 8, minHeight: camFailed ? 0 : 240, opacity: status.state === 'ended' ? 0.5 : 1 }} />
          {camFailed && (
            <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 36 }}>ðŸ“·</div>
              <div style={{ fontWeight: 800, color: 'var(--red)', marginBottom: 4 }}>ØªØ¹Ø°Ù‘Ø± ÙØªØ­ Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§</div>
              <div className="subtle" style={{ marginBottom: 12 }}>ØªØ£ÙƒØ¯ Ø¥Ù†Ùƒ Ø³Ø§Ù…Ø­ Ù„Ù„Ù…ÙˆÙ‚Ø¹ Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ØŒ ÙˆØ¥Ù† Ù…ÙÙŠØ´ ØªØ·Ø¨ÙŠÙ‚ ØªØ§Ù†ÙŠ Ù…Ø§Ø³ÙƒÙ‡Ø§</div>
              <button className="btn full" onClick={retryCamera}>Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©</button>
            </div>
          )}

          {/* live per-team tally */}
          {Object.keys(perTeam).length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              {teams.filter(t => perTeam[t.id]).sort((a,b)=>a.order-b.order).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontWeight: 700, color: t.color }}>{t.name}</span>
                  <span style={{ fontWeight: 800 }}>{perTeam[t.id].count} â€¢ {perTeam[t.id].pts} Ù†</span>
                </div>
              ))}
            </div>
          )}

          {Object.keys(perTeam).length > 0 && (
            <button className="btn gold full" style={{ marginTop: 12 }} onClick={commitToTeams} disabled={committing}>
              {committing ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø¶Ø§ÙØ©...' : 'âž• Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¯Ø±Ø¬Ø§Øª Ù„Ù„ÙØ±Ù‚'}
            </button>
          )}
          <button className="btn red full" style={{ marginTop: 14 }} onClick={stop}>Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ù…Ø§Ø³Ø­</button>
        </>
      )}
    </div>
  )
}

function StatusCircle({ status, periods }) {
  let big, label, color, sub
  if (status.state === 'before') {
    big = 'â³'; label = 'Ù„Ù… ÙŠØ¨Ø¯Ø£ Ø¨Ø¹Ø¯'; color = 'var(--muted)'
    sub = `ÙŠØ¨Ø¯Ø£ ${fmtClock(sortPeriods(periods)[0].from)}`
  } else if (status.state === 'ended') {
    big = 'â›”'; label = 'Ø§Ù†ØªÙ‡Ù‰'; color = 'var(--red)'; sub = 'ØªÙ… Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ³Ø¬ÙŠÙ„'
  } else if (status.gap) {
    big = 'â¸'; label = 'Ø¨ÙŠÙ† Ø§Ù„ÙØªØ±Ø§Øª'; color = 'var(--gold)'; sub = '0 Ù†Ù‚Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹'
  } else {
    big = status.points; label = 'Ø§Ù„Ø¯Ø±Ø¬Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©'; color = 'var(--green)'
    sub = `Ø§Ù„ÙØªØ±Ø© ${status.activeIndex + 1} â€¢ ØªÙ†ØªÙ‡ÙŠ ${fmtClock(minToHHMM(status.endsAtMin))}`
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
