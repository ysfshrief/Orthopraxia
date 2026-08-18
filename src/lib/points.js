/*
  PROPORTIONAL INDIVIDUAL SCORING
  ================================
  Each person's attendance time determines their share of the team's score.
  
  Example: team has 20 members, max score for the session = 100
  → each person's share = 100 / 20 = 5 points max
  
  Tiers (configurable from Admin):
    - 7:00–7:15 → 100 points base
    - 7:15–7:30 → 50 points base
    - after 7:30 → 0 points base
  
  If a person arrives at 7:10 (tier = 100):
    their contribution = (100 / 20) = 5 points added to team
  
  If another arrives at 7:20 (tier = 50):
    their contribution = (50 / 20) = 2.5 points added to team
  
  Total team points = sum of all individual contributions.
*/

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Get the BASE points for a given scan time (which tier they fall into)
export function tierPoints(scanDate, pointsConfig) {
  if (!pointsConfig || !pointsConfig.tiers) return 0
  const mins = scanDate.getHours() * 60 + scanDate.getMinutes()
  for (const tier of pointsConfig.tiers) {
    if (mins <= toMinutes(tier.untilTime)) return tier.points
  }
  const last = pointsConfig.tiers[pointsConfig.tiers.length - 1]
  return last ? last.points : 0
}

// Calculate one person's proportional contribution
export function calcIndividualPoints(scanDate, teamSize, pointsConfig) {
  if (!teamSize || teamSize <= 0) return 0
  const base = tierPoints(scanDate, pointsConfig)
  return base / teamSize
}

// human readable tier summary for Admin UI
export function tierLabel(tier, i, tiers) {
  if (i === 0) return `عند أو قبل ${fmt(tier.untilTime)}`
  return `بعد ${fmt(tiers[i - 1].untilTime)} وحتى ${fmt(tier.untilTime)}`
}

export function fmt(hhmm) {
  let [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'م' : 'ص'
  let hh = h % 12; if (hh === 0) hh = 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}
