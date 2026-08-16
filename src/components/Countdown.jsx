import { useEffect, useState } from 'react'
import { retreatBounds } from '../lib/schedule'

export default function Countdown({ program }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const bounds = retreatBounds(program)
  if (!bounds) return null

  const start = bounds.start.getTime()
  const end = bounds.end.getTime()

  // State 3: after retreat
  if (now > end) {
    return (
      <div className="countdown-banner done">
        <div className="cd-msg">انتهت خلوة Orthopraxia</div>
        <div className="cd-sub">نشكر جميع المشاركين ❤️</div>
      </div>
    )
  }
  // State 2: during retreat
  if (now >= start) {
    return (
      <div className="countdown-banner live">
        <div className="cd-msg">الخلوة جارية الآن</div>
        <div className="cd-sub">نتمنى لكم وقتًا مباركًا ❤️</div>
      </div>
    )
  }
  // State 1: before retreat — countdown
  const diff = Math.max(0, start - now)
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  return (
    <div className="countdown-banner">
      <div className="cd-label">يبدأ العد التنازلي لبداية الخلوة</div>
      <div className="cd-grid">
        <Unit v={d} l="يوم" />
        <Unit v={h} l="ساعة" />
        <Unit v={m} l="دقيقة" />
        <Unit v={s} l="ثانية" />
      </div>
    </div>
  )
}

function Unit({ v, l }) {
  return (
    <div className="cd-unit">
      <div className="cd-num">{String(v).padStart(2, '0')}</div>
      <div className="cd-unit-l">{l}</div>
    </div>
  )
}
