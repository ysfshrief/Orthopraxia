/*
  Maps program items to real Date objects so the countdown timer and the
  per-item notifications know exactly when the retreat starts/ends and when
  each فقرة begins.
  Retreat dates (from PDF): 27, 28, 29 August 2026.
  All editable later, but these anchor the timer + notifications.
*/

export const RETREAT_YEAR = 2026
export const RETREAT_MONTH = 7 // August (0-indexed)

// day string -> day-of-month
export const DAY_TO_DATE = {
  'الخميس 27 أغسطس 2026': 27,
  'الجمعة 28 أغسطس 2026': 28,
  'السبت 29 أغسطس 2026': 29,
}

// parse an Arabic time range's START, e.g. "2:00 م - 3:00 م" -> {h,m}
export function parseStart(timeStr = '') {
  const first = timeStr.split('-')[0].trim() // "2:00 م"
  return parseClock(first)
}
export function parseEnd(timeStr = '') {
  const parts = timeStr.split('-')
  const last = (parts[1] || parts[0]).trim()
  return parseClock(last)
}

// "2:00 م" / "11 ص" / "12 ظ" -> {h24, m}
function parseClock(s) {
  if (!s) return null
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(ص|م|ظ)?/)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const suf = m[3] || ''
  if (suf === 'م') { if (h < 12) h += 12 }        // مساءً
  else if (suf === 'ظ') { if (h < 12) h += 12 }    // ظهراً (12ظ=12, 1ظ=13)
  else if (suf === 'ص') { if (h === 12) h = 0 }    // صباحاً
  return { h, m: min }
}

export function itemDate(item, useEnd = false) {
  const dom = DAY_TO_DATE[item.day]
  if (!dom) return null
  const t = useEnd ? parseEnd(item.time) : parseStart(item.time)
  if (!t) return null
  return new Date(RETREAT_YEAR, RETREAT_MONTH, dom, t.h, t.m, 0)
}

// first item's start (retreat begin) and last item's end (retreat end)
export function retreatBounds(program) {
  const withDates = program
    .map(p => ({ start: itemDate(p, false), end: itemDate(p, true) }))
    .filter(x => x.start)
  if (!withDates.length) return null
  const start = withDates.reduce((a, b) => (a.start < b.start ? a : b)).start
  const end = withDates.reduce((a, b) => ((a.end || a.start) > (b.end || b.start) ? a : b))
  return { start, end: end.end || end.start }
}
