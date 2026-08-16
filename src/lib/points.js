// Points are awarded on the FULL-team completion time, not the first scan.
// Config comes from settings.points and is fully editable from Admin.

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// completionDate: a Date object (moment the last member was scanned)
export function calcPoints(completionDate, pointsConfig) {
  if (!pointsConfig || !pointsConfig.tiers) return 0
  const mins = completionDate.getHours() * 60 + completionDate.getMinutes()
  // tiers are ordered; first tier whose untilTime >= completion wins
  for (const tier of pointsConfig.tiers) {
    if (mins <= toMinutes(tier.untilTime)) return tier.points
  }
  // after last deadline
  const last = pointsConfig.tiers[pointsConfig.tiers.length - 1]
  return last ? last.points : 0
}

// human readable tier summary for Admin UI
export function tierLabel(tier, i, tiers) {
  const prev = i === 0 ? (null) : tiers[i - 1].untilTime
  if (i === 0) return `عند أو قبل ${fmt(tier.untilTime)}`
  return `بعد ${fmt(prev)} وحتى ${fmt(tier.untilTime)}`
}

export function fmt(hhmm) {
  let [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'م' : 'ص'
  let hh = h % 12; if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}
