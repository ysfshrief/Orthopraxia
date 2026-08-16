import { useEffect, useState, useMemo } from 'react'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Header } from '../components/UI'
import Icon from '../components/Icons'

export default function Leaderboard() {
  const { teams, settings } = useData()
  const { isAdmin } = useAuth()
  const [results, setResults] = useState([])

  useEffect(() => subscribe('attendanceResults', setResults), [])

  const ranked = useMemo(() => {
    const rows = teams.map(t => {
      const attPts = results.filter(r => r.teamId === t.id).reduce((s, r) => s + (r.points || 0), 0)
      const bonus = t.bonusPoints || 0
      return { ...t, attPts, bonus, total: attPts + bonus }
    })
    rows.sort((a, b) => b.total - a.total)
    return rows
  }, [teams, results])

  const hidden = !settings.leaderboardVisible

  if (hidden && !isAdmin) {
    return (
      <div className="page">
        <Header title="النتائج" />
        <div className="empty" style={{ marginTop: 40 }}>
          <Icon name="trophy" size={54} style={{ color: 'var(--gold)', opacity: .5 }} />
          <p style={{ marginTop: 12, fontWeight: 700 }}>النتائج مخفية حاليًا</p>
          <p className="subtle">سيتم إعلانها قريبًا</p>
        </div>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="page">
      <Header title="لوحة النتائج" />
      {hidden && isAdmin && (
        <div className="card" style={{ background: 'rgba(201,154,58,.15)', marginBottom: 14, textAlign: 'center', fontWeight: 700, color: 'var(--maroon)' }}>
          👁 مخفية عن المشاركين — تراها كأدمن فقط
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ranked.map((t, i) => (
          <div key={t.id} className="card" style={{
            display: 'flex', alignItems: 'center', gap: 14,
            borderInlineStart: `6px solid ${t.color || 'var(--gold)'}`,
            background: i === 0 ? 'linear-gradient(135deg,#fff9ec,#fff)' : 'var(--white)'
          }}>
            <div style={{ fontSize: 26, minWidth: 40, textAlign: 'center' }}>
              {medals[i] || <span style={{ fontWeight: 900, color: 'var(--muted)' }}>{i + 1}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{t.name}</div>
              <div className="subtle">حضور: {t.attPts}{t.bonus ? ` + إضافي: ${t.bonus}` : ''}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--maroon)' }}>{t.total}</div>
              <div className="subtle" style={{ fontSize: 11 }}>نقطة</div>
            </div>
          </div>
        ))}
        {ranked.length === 0 && <div className="empty">لا توجد فرق بعد</div>}
      </div>
    </div>
  )
}
