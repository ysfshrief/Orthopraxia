/*
  Attendance periods per program item.
  Each period: { from: 'HH:MM', to: 'HH:MM', points: number }
  - The active grade at any moment = the period whose [from, to) contains now.
  - After the last period's `to`, attendance is CLOSED.
  - Grade is resolved from the DEVICE clock at scan time (client-side on Spark;
    on Blaze this must move to a Cloud Function using server time — see note).
*/

export function toMin(hhmm) {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (h > 23 || m > 59) return null
  return h * 60 + m
}

export function fmtClock(hhmm) {
  const mins = toMin(hhmm)
  if (mins == null) return hhmm
  let h = Math.floor(mins / 60), m = mins % 60
  const ampm = h >= 12 ? 'م' : 'ص'
  let hh = h % 12; if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

/*
  Validate a set of periods.
  Rules: valid times, from<to, sorted, no overlap, no gap-required (gaps allowed
  but flagged? we allow gaps but forbid overlaps), points is a finite number.
*/
export function validatePeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    return { ok: false, error: 'أضف فترة واحدة على الأقل' }
  }
  const norm = periods.map((p, i) => ({ i, from: toMin(p.from), to: toMin(p.to), points: Number(p.points) }))
  for (const p of norm) {
    if (p.from == null) return { ok: false, error: `الوقت "من" غير صحيح في الفترة ${p.i + 1}` }
    if (p.to == null) return { ok: false, error: `الوقت "إلى" غير صحيح في الفترة ${p.i + 1}` }
    if (p.from >= p.to) return { ok: false, error: `في الفترة ${p.i + 1}: "من" يجب أن يكون قبل "إلى"` }
    if (!Number.isFinite(p.points)) return { ok: false, error: `الدرجة غير صحيحة في الفترة ${p.i + 1}` }
  }
  // sort by from and check overlaps
  const sorted = [...norm].sort((a, b) => a.from - b.from)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].from < sorted[i - 1].to) {
      return { ok: false, error: `تعارض زمني بين فترتين (${sorted[i - 1].i + 1} و ${sorted[i].i + 1})` }
    }
  }
  return { ok: true }
}

// sort periods by start time (returns new array, normalized copies)
export function sortPeriods(periods) {
  return [...periods].sort((a, b) => (toMin(a.from) ?? 0) - (toMin(b.from) ?? 0))
}

/*
  Resolve current attendance status given periods and a Date.
  Returns:
    { state: 'before'|'active'|'ended', activeIndex, points, nextChange (ms epoch) }
*/
export function resolveStatus(periods, now = new Date()) {
  const sorted = sortPeriods(periods).map(p => ({ from: toMin(p.from), to: toMin(p.to), points: Number(p.points) }))
  if (sorted.length === 0) return { state: 'ended', points: 0 }
  const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

  const firstFrom = sorted[0].from
  const lastTo = sorted[sorted.length - 1].to

  if (mins < firstFrom) {
    return { state: 'before', points: null, startsInMin: firstFrom - mins, firstFrom }
  }
  if (mins >= lastTo) {
    return { state: 'ended', points: 0 }
  }
  // find active period
  for (let i = 0; i < sorted.length; i++) {
    if (mins >= sorted[i].from && mins < sorted[i].to) {
      return { state: 'active', activeIndex: i, points: sorted[i].points, endsAtMin: sorted[i].to }
    }
  }
  // in a gap between periods → no points but not ended
  return { state: 'active', activeIndex: -1, points: 0, gap: true }
}

// default period set for a new config
export function defaultPeriods() {
  return [
    { from: '19:00', to: '19:15', points: 100 },
    { from: '19:15', to: '19:30', points: 50 },
    { from: '19:30', to: '19:45', points: 25 },
  ]
}
