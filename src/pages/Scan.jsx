import { useEffect, useState, useRef, useMemo } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  subscribe, upsert, subscribeSession, saveSession,
  subscribeSessionScans, recordSessionScan,
  recordLocalScan, getLocalScans, uploadLocalScans, clearLocalScans, getSessionScansOnce
} from '../lib/store'
import { useData } from '../context/DataContext'
import { useToast, Header } from '../components/UI'
import {
  newSessionId, defaultSessionPeriods, validateSessionPeriods,
  resolveSession, fmtRemaining, computeTeamScores
} from '../lib/attendanceSession'
import Icon from '../components/Icons'

/*
  Central attendance SESSION scanner with TWO modes:

  • Online (default): scans write to Firestore live; every admin device sees
    the same tally in realtime.

  • Local / Offline (zero-quota): each device records scans to its OWN
    localStorage — NO Firestore reads/writes during scanning at all. At the
    end the admin presses "رفع النتائج" to push this device's scans once, in a
    single batch. Deterministic docIds dedupe the same person scanned on
    multiple devices. Best when you want to avoid the Firestore free quota.
*/

export default function Scan() {
  const { participants, teams } = useData()
  const toast = useToast()
  const [session, setSession] = useState(null)
  const [scans, setScans] = useState([])
  const [localScans, setLocalScans] = useState([])
  const [periods, setPeriods] = useState(defaultSessionPeriods())
  const [offlineMode, setOfflineMode] = useState(true) // default to zero-quota
  const [now, setNow] = useState(Date.now())
  const [camFailed, setCamFailed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const qrRef = useRef(null)
  const lastScan = useRef({ code: '', t: 0 })

  useEffect(() => subscribeSession(setSession), [])
  // Only subscribe to the (quota-costing) online scans when NOT in offline mode.
  useEffect(() => {
    if (offlineMode) { setScans([]); return }
    return subscribeSessionScans(setScans)
  }, [offlineMode])

  // refresh local scans from localStorage on a light interval + on change event
  useEffect(() => {
    const refresh = () => setLocalScans(getLocalScans(session?.id))
    refresh()
    window.addEventListener('ortho-change', refresh)
    return () => window.removeEventListener('ortho-change', refresh)
  }, [session])

  // shared clock tick (drives period display derived from central startedAt)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const status = useMemo(() => resolveSession(session, now), [session, now])
  const isActive = status.state === 'active'
  const isScannerOpen = session && session.status === 'active' // camera stays open whole session

  // ----- session control (admin) -----
  const setRow = (i, patch) => setPeriods(ps => ps.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  const addRow = () => setPeriods(ps => [...ps, { minutes: 10, points: 50 }])
  const delRow = (i) => setPeriods(ps => ps.filter((_, idx) => idx !== i))

  const startSession = async () => {
    const v = validateSessionPeriods(periods)
    if (!v.ok) return toast(v.error, 'err')
    const sess = {
      id: newSessionId(),
      startedAt: new Date().toISOString(), // central shared reference
      periods: periods.map(p => ({ minutes: Number(p.minutes), points: Number(p.points) })),
      status: 'active', endedAt: null,
      createdAt: new Date().toISOString(),
    }
    await saveSession(sess)
    setCamFailed(false); setNow(Date.now())
    toast('بدأت الجلسة ✓', 'ok')
  }

  const endSession = async () => {
    if (!session) return
    if (!confirm('إنهاء الجلسة؟ لن يمكن تسجيل حضور بعد ذلك.')) return
    await saveSession({ ...session, status: 'ended', endedAt: new Date().toISOString() })
    await stopCamera()
    toast('انتهت الجلسة', 'warn')
  }

  // auto-end when time runs out. Guarded so it persists the 'ended' flip
  // AT MOST ONCE (a ref latch), instead of re-writing on every snapshot —
  // which previously multiplied Firestore writes across every admin device.
  const endedWritten = useRef(false)
  useEffect(() => {
    if (!session) return
    if (session.status !== 'active') { endedWritten.current = false; return }
    if (status.state === 'ended' && !endedWritten.current) {
      endedWritten.current = true
      saveSession({ ...session, status: 'ended', endedAt: new Date().toISOString() })
    }
  }, [status.state, session])

  // ----- camera -----
  useEffect(() => {
    if (!isScannerOpen) { stopCamera(); return }
    if (qrRef.current || camFailed) return
    let cancelled = false, tries = 0
    const tryInit = () => {
      if (cancelled) return
      const el = document.getElementById('qr-reader')
      if (el && !qrRef.current) { initCamera(); return }
      if (tries++ < 20) setTimeout(tryInit, 100)
    }
    tryInit()
    return () => { cancelled = true }
  }, [isScannerOpen, camFailed])

  const initCamera = async () => {
    if (qrRef.current) return
    if (!document.getElementById('qr-reader')) return
    try {
      const qr = new Html5Qrcode('qr-reader')
      await qr.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 240, height: 240 } }, onScan, () => {})
      qrRef.current = qr
    } catch (e) {
      toast('تعذّر فتح الكاميرا — اضغط "إعادة المحاولة"', 'err')
      setCamFailed(true)
    }
  }
  const stopCamera = async () => {
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current.clear() } } catch {}
    qrRef.current = null
  }
  const retryCamera = async () => { setCamFailed(false); await stopCamera(); setTimeout(initCamera, 200) }
  useEffect(() => () => { stopCamera() }, [])

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
    // re-resolve from central session at the exact scan moment
    const st = resolveSession(session, Date.now())
    if (st.state === 'ended' || !session || session.status !== 'active') {
      beep('err'); toast('✕ انتهت الجلسة — تسجيل الحضور مغلق', 'err'); return
    }
    if (st.state !== 'active') { beep('err'); toast('✕ لا يمكن تسجيل الحضور حالياً', 'warn'); return }

    const person = participants.find(p => p.id === code || p.qr === code)
    if (!person) { beep('err'); toast('✕ QR غير صالح أو غير مسجّل', 'err'); return }

    const teamName = teams.find(x => x.id === person.teamId)?.name || ''

    if (offlineMode) {
      // Zero-quota: record on THIS device only. Nothing hits Firestore.
      const res = recordLocalScan({
        sessionId: session.id, participantId: person.id, personName: person.name,
        teamId: person.teamId, teamName, periodIndex: st.periodIndex
      })
      if (res.duplicate) { beep('err'); toast(`⚠ ${person.name} — مسجّل بالفعل على هذا الجهاز`, 'err'); return }
      beep('ok'); toast(`✓ تم تسجيل ${person.name} محلياً (فترة ${st.periodIndex + 1})`, 'ok', 1600)
      return
    }

    // Online mode: check already-loaded realtime scans (no extra read), then write.
    const already = scans.some(s => s.id === `${session.id}__${person.id}`)
    const res = await recordSessionScan({
      sessionId: session.id, participantId: person.id, personName: person.name,
      teamId: person.teamId, teamName, periodIndex: st.periodIndex,
      knownDuplicate: already
    })
    if (res.duplicate) { beep('err'); toast(`⚠ ${person.name} — تم تسجيله بالفعل في هذه الجلسة`, 'err'); return }
    if (res.error) { beep('err'); toast('خطأ في الحفظ: ' + res.error, 'err'); return }
    beep('ok'); toast(`✓ تم تسجيل ${person.name} (فترة ${st.periodIndex + 1})`, 'ok', 1800)
  }

  // ----- live scores (from local scans in offline mode, else online) -----
  const activeScans = offlineMode ? localScans : scans
  const sessionScans = useMemo(
    () => activeScans.filter(s => session && s.sessionId === session.id),
    [activeScans, session]
  )
  const teamScores = useMemo(
    () => computeTeamScores(sessionScans, teams, participants, session?.periods || []),
    [sessionScans, teams, participants, session]
  )

  // upload this device's local scans (offline mode) — one batched write
  const uploadLocal = async () => {
    if (!session) return
    setUploading(true)
    try {
      const res = await uploadLocalScans(session.id)
      if (res.error) { toast('خطأ في الرفع: ' + res.error, 'err'); return }
      toast(`تم رفع ${res.uploaded} حضور ✓`, 'ok')
    } catch (e) { toast('خطأ: ' + e.message, 'err') }
    finally { setUploading(false) }
  }

  // commit final results into attendanceResults for the admin standings
  const [committing, setCommitting] = useState(false)
  const commitToTeams = async () => {
    if (!session) return
    setCommitting(true)
    try {
      // In offline mode, first push this device's scans, then aggregate from
      // the MERGED set (all devices) so no team is undercounted. In online mode
      // teamScores already reflects the live merged data.
      let scores = teamScores
      if (offlineMode) {
        await uploadLocalScans(session.id)
        const merged = await getSessionScansOnce(session.id)
        scores = computeTeamScores(merged, teams, participants, session?.periods || [])
      }
      for (const t of teams) {
        const b = scores[t.id]
        if (!b || b.present === 0) continue
        await upsert('attendanceResults', `${session.id}__${t.id}`, {
          itemId: session.id, itemTitle: 'جلسة حضور',
          teamId: t.id, teamName: t.name,
          points: b.points, completedCount: b.present, totalCount: b.total,
          completionTime: new Date().toISOString(),
        })
      }
      toast('تم إضافة الدرجات للفرق ✓', 'ok')
    } catch (e) { toast('خطأ: ' + e.message, 'err') }
    finally { setCommitting(false) }
  }

  const periodValidation = validateSessionPeriods(periods)
  const noSession = !session || session.status === 'ended'

  return (
    <div className="page">
      <Header title="تسجيل الحضور" />

      {/* ============ NO ACTIVE SESSION → admin sets up & starts ============ */}
      {noSession && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>إنشاء جلسة حضور</h3>
          <p className="subtle" style={{ marginBottom: 12 }}>
            حدّد مدة ونقاط كل فترة. النقاط = إجمالي نقاط الفريق للفترة، وتتوزّع على الحاضرين حسب عدد أعضاء الفريق.
          </p>

          {/* Scan mode: offline (zero-quota) vs online (live sync) */}
          <div className="scan-mode">
            <button className={'scan-mode-btn' + (offlineMode ? ' on' : '')} onClick={() => setOfflineMode(true)}>
              📴 محلي (بدون إنترنت/كوتا)
            </button>
            <button className={'scan-mode-btn' + (!offlineMode ? ' on' : '')} onClick={() => setOfflineMode(false)}>
              🌐 أونلاين (مزامنة مباشرة)
            </button>
          </div>
          <p className="subtle" style={{ fontSize: 12, marginBottom: 12 }}>
            {offlineMode
              ? 'الوضع المحلي: كل جهاز يسجّل عنده بدون أي استهلاك كوتا. في الآخر اضغط "رفع النتائج" لرفع حضور الجهاز مرة واحدة.'
              : 'الوضع الأونلاين: كل جهاز يكتب مباشرة وكل الأجهزة تشوف نفس الحضور لحظياً (بيستهلك كوتا).'}
          </p>
          <div className="att-periods">
            <div className="att-row att-head att-row-session">
              <span>الفترة</span><span>المدة (دقائق)</span><span>نقاط الفريق</span><span></span>
            </div>
            {periods.map((p, i) => (
              <div className="att-row att-row-session" key={i}>
                <span style={{ fontWeight: 800, color: 'var(--maroon)' }}>{i + 1}</span>
                <input type="number" min="1" value={p.minutes} onChange={e => setRow(i, { minutes: e.target.value })} />
                <input type="number" min="0" value={p.points} onChange={e => setRow(i, { points: e.target.value })} />
                <button className="btn ghost" style={{ padding: '4px 6px', color: 'var(--red)' }} onClick={() => delRow(i)} disabled={periods.length <= 1}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
          <button className="btn ghost" style={{ marginTop: 8, fontSize: 13 }} onClick={addRow}>+ فترة</button>
          {!periodValidation.ok && <div className="att-warn">⚠️ {periodValidation.error}</div>}
          {session && session.status === 'ended' && (
            <div className="card" style={{ background: 'rgba(178,58,47,.08)', marginTop: 12, marginBottom: 0 }}>
              <div className="subtle">آخر جلسة انتهت. تقدر تضيف درجاتها للفرق قبل ما تبدأ جلسة جديدة.</div>
              <button className="btn gold full" style={{ marginTop: 8 }} onClick={commitToTeams} disabled={committing}>
                {committing ? 'جارٍ الإضافة...' : '➕ إضافة درجات آخر جلسة للفرق'}
              </button>
            </div>
          )}
          <button className="btn full" style={{ marginTop: 12 }} onClick={startSession} disabled={!periodValidation.ok}>
            <Icon name="scan" size={18} /> بدء الجلسة
          </button>
        </div>
      )}

      {/* ============ ACTIVE SESSION → central status + camera ============ */}
      {session && session.status === 'active' && (
        <>
          <SessionStatus status={status} periods={session.periods} />

          {status.state === 'ended' ? (
            <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 40 }}>⛔</div>
              <div style={{ fontWeight: 800, color: 'var(--red)' }}>انتهت الجلسة</div>
              <div className="subtle">تسجيل الحضور مغلق</div>
            </div>
          ) : (
            <>
              <div id="qr-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)', marginTop: 8, minHeight: camFailed ? 0 : 240 }} />
              {camFailed && (
                <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
                  <div style={{ fontSize: 36 }}>📷</div>
                  <div style={{ fontWeight: 800, color: 'var(--red)', marginBottom: 4 }}>تعذّر فتح الكاميرا</div>
                  <div className="subtle" style={{ marginBottom: 12 }}>تأكد من إذن الكاميرا وإن مفيش تطبيق تاني ماسكها</div>
                  <button className="btn full" onClick={retryCamera}>إعادة المحاولة</button>
                </div>
              )}
            </>
          )}

          {/* live team tally */}
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, color: 'var(--maroon)', marginBottom: 8 }}>الحضور المباشر</div>
            {teams.slice().sort((a, b) => a.order - b.order).map(t => {
              const b = teamScores[t.id] || { present: 0, total: 0, points: 0 }
              return (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
                  <span style={{ fontWeight: 700, color: t.color }}>{t.name}</span>
                  <span style={{ fontWeight: 800 }}>{b.present}/{b.total} • {b.points} ن</span>
                </div>
              )
            })}
          </div>

          {offlineMode && (
            <div className="card" style={{ marginTop: 12, background: 'rgba(201,154,58,.08)' }}>
              <div className="subtle" style={{ fontSize: 12, marginBottom: 8 }}>
                📴 وضع محلي — {sessionScans.length} حضور على هذا الجهاز. اضغط "رفع النتائج" في الآخر (كل جهاز يرفع مرة واحدة).
              </div>
              <button className="btn full" onClick={uploadLocal} disabled={uploading || sessionScans.length === 0}>
                {uploading ? 'جارٍ الرفع...' : '⬆️ رفع النتائج (رفعة واحدة)'}
              </button>
              <button className="btn gold full" style={{ marginTop: 8 }} onClick={commitToTeams} disabled={committing}>
                {committing ? 'جارٍ الإضافة...' : '➕ إضافة الدرجات للفرق'}
              </button>
            </div>
          )}

          <button className="btn red full" style={{ marginTop: 14 }} onClick={endSession}>إنهاء الجلسة</button>
        </>
      )}
    </div>
  )
}

function SessionStatus({ status, periods }) {
  let label, big, color, sub
  if (status.state === 'before') {
    label = 'الجلسة تبدأ'; big = fmtRemaining(status.remainingMs); color = 'var(--muted)'; sub = 'قبل البداية'
  } else if (status.state === 'ended') {
    label = 'انتهت الجلسة'; big = '—'; color = 'var(--red)'; sub = 'مغلقة'
  } else if (status.state === 'active') {
    label = `الفترة ${status.periodIndex + 1} من ${periods.length}`
    big = fmtRemaining(status.remainingMs); color = 'var(--green)'
    sub = `${status.periodPoints} نقطة للفريق • باقي على الفترة الجاية`
  } else {
    label = 'لا توجد جلسة'; big = '—'; color = 'var(--muted)'; sub = ''
  }
  return (
    <div className="sess-status" style={{ borderColor: color }}>
      <div className="sess-status-label">{label}</div>
      <div className="sess-status-big" style={{ color }}>{big}</div>
      <div className="sess-status-sub">{sub}</div>
      {periods && periods.length > 0 && status.state === 'active' && (
        <div className="sess-dots">
          {periods.map((p, i) => (
            <span key={i} className={'sess-dot' + (i === status.periodIndex ? ' on' : i < status.periodIndex ? ' done' : '')} />
          ))}
        </div>
      )}
    </div>
  )
}
