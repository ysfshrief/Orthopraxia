/*
  Attendance SESSION model (central-time based).

  A session has:
    id        : unique session id (also used to scope scans)
    startedAt : ISO string — the CENTRAL time source. On Spark we can't get a
                true server clock, so this timestamp (written once at Start by
                the admin's device and stored in Firestore) is the single shared
                reference every device reads. Current period is DERIVED from it,
                never from a local JS countdown — so refresh / late-open / other
                devices all compute the same period and remaining time.
    periods   : [{ minutes, points }, ...] (usually 3) — points = TOTAL team
                points for that period; each present member gets an equal share.
    status    : 'active' | 'ended'
    endedAt   : ISO string when ended (manual End or auto after last period)
    itemId/itemTitle : optional link to a program item for labeling.

  Scoring (per team, per period the members attended in):
    teamPeriodScore = periodPoints * (presentMembersInThatPeriod / totalTeamMembers)
    memberShare     = periodPoints / totalTeamMembers
  A member attends the session ONCE; the period they scanned in fixes their share.
*/

export function newSessionId() {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

export function defaultSessionPeriods() {
  return [
    { minutes: 10, points: 100 },
    { minutes: 15, points: 75 },
    { minutes: 20, points: 50 },
  ]
}

export function validateSessionPeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return { ok: false, error: 'أضف فترة واحدة على الأقل' }
  }
  for (let i = 0; i < periods.length; i++) {
    const m = Number(periods[i].minutes), p = Number(periods[i].points)
    if (!Number.isFinite(m) || m <= 0) return { ok: false, error: `مدة الفترة ${i + 1} غير صحيحة` }
    if (!Number.isFinite(p) || p < 0) return { ok: false, error: `نقاط الفترة ${i + 1} غير صحيحة` }
  }
  return { ok: true }
}

// total session duration in ms
export function sessionDurationMs(periods) {
  return periods.reduce((s, p) => s + Number(p.minutes) * 60000, 0)
}

/*
  Resolve which period is active right now, using the stored startedAt as the
  shared clock reference. `now` defaults to the device clock, which is only used
  to measure ELAPSED time since the shared startedAt — not as the source of
  truth for when the session began.

  Returns:
    { state: 'idle'|'before'|'active'|'ended',
      periodIndex, periodPoints, remainingMs, elapsedMs,
      periodStartMs, periodEndMs }
*/
export function resolveSession(session, now = Date.now()) {
  if (!session || session.status !== 'active' || !session.startedAt) {
    if (session && session.status === 'ended') return { state: 'ended' }
    return { state: 'idle' }
  }
  const periods = session.periods || []
  const start = new Date(session.startedAt).getTime()
  const totalMs = sessionDurationMs(periods)
  const elapsed = now - start

  if (elapsed < 0) return { state: 'before', remainingMs: -elapsed }
  if (elapsed >= totalMs) return { state: 'ended', elapsedMs: elapsed }

  // walk periods to find the active one
  let acc = 0
  for (let i = 0; i < periods.length; i++) {
    const dur = Number(periods[i].minutes) * 60000
    if (elapsed < acc + dur) {
      return {
        state: 'active',
        periodIndex: i,
        periodPoints: Number(periods[i].points),
        elapsedMs: elapsed,
        remainingMs: (acc + dur) - elapsed,
        periodStartMs: start + acc,
        periodEndMs: start + acc + dur,
      }
    }
    acc += dur
  }
  return { state: 'ended', elapsedMs: elapsed }
}

export function fmtRemaining(ms) {
  if (ms == null || ms < 0) ms = 0
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/*
  Compute per-team attendance scores from the session's scans.
  scans: [{ teamId, participantId, periodIndex }]
  teams: [{ id }]
  participants: [{ id, teamId }] (to get total members per team)
  periods: [{ points }]

  Returns { [teamId]: { present, total, points, perPeriod: {idx: count} } }
*/
export function computeTeamScores(scans, teams, participants, periods) {
  const totalByTeam = {}
  for (const t of teams) totalByTeam[t.id] = participants.filter(p => p.teamId === t.id).length

  const out = {}
  for (const t of teams) {
    out[t.id] = { present: 0, total: totalByTeam[t.id] || 0, points: 0, perPeriod: {} }
  }
  for (const s of scans) {
    const bucket = out[s.teamId]
    if (!bucket) continue
    bucket.present++
    bucket.perPeriod[s.periodIndex] = (bucket.perPeriod[s.periodIndex] || 0) + 1
  }
  // score = sum over periods of periodPoints * (presentInPeriod / totalMembers)
  for (const t of teams) {
    const b = out[t.id]
    if (!b.total) { b.points = 0; continue }
    let pts = 0
    for (const [idx, cnt] of Object.entries(b.perPeriod)) {
      const pp = Number(periods[idx]?.points || 0)
      pts += pp * (cnt / b.total)
    }
    b.points = Math.round(pts * 100) / 100
  }
  return out
}
