import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Header } from '../components/UI'
import Icon from '../components/Icons'
import AdminTeams from './admin/AdminTeams'
import AdminParticipants from './admin/AdminParticipants'
import AdminResults from './admin/AdminResults'
import AdminSettings from './admin/AdminSettings'
import AdminNotifications from './admin/AdminNotifications'

const SECTIONS = [
  { key: 'teams', label: 'الفرق', icon: 'users' },
  { key: 'participants', label: 'المخدومين + الكارنيهات', icon: 'card' },
  { key: 'results', label: 'الحضور والنقاط', icon: 'trophy' },
  { key: 'notifications', label: 'الإشعارات', icon: 'bell' },
  { key: 'settings', label: 'الإعدادات', icon: 'gear' },
]

export default function Admin() {
  const { isAdmin } = useAuth()
  const { teams, participants } = useData()
  const [section, setSection] = useState(null)
  const [results, setResults] = useState([])

  useEffect(() => subscribe('attendanceResults', setResults), [])

  if (!isAdmin) return <Navigate to="/" replace />

  const lastResults = [...results].sort((a, b) => new Date(b.completionTime) - new Date(a.completionTime)).slice(0, 4)

  if (section) {
    const back = () => setSection(null)
    const Cmp = { teams: AdminTeams, participants: AdminParticipants, results: AdminResults, settings: AdminSettings, notifications: AdminNotifications }[section]
    return <Cmp back={back} />
  }

  return (
    <div className="page">
      <Header title="لوحة التحكم" />

      <div className="grid2" style={{ marginBottom: 18 }}>
        <Stat label="المخدومين" value={participants.length} c="var(--maroon)" />
        <Stat label="الفرق" value={teams.length} c="var(--gold)" />
        <Stat label="جلسات الحضور" value={results.length} c="var(--green)" />
        <Stat label="إجمالي نقاط الحضور" value={results.reduce((s, r) => s + (r.points || 0), 0)} c="#3A5A78" />
      </div>

      <a className="card" href="#/organizer" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, border: '2px solid var(--maroon)', textDecoration: 'none' }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--maroon)', color: '#fff', display: 'grid', placeItems: 'center' }}>
          <Icon name="scan" size={22} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: 'var(--maroon)' }}>ماسح الحضور (للمنظم)</div>
          <div className="subtle">الرابط الخاص: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>#/organizer</span></div>
        </div>
      </a>

      <h3 className="section-title">الإدارة</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SECTIONS.map(s => (
          <button key={s.key} className="card" onClick={() => setSection(s.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, border: 'none', textAlign: 'right' }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(107,35,24,.1)', color: 'var(--maroon)', display: 'grid', placeItems: 'center' }}>
              <Icon name={s.icon} size={22} />
            </span>
            <span style={{ fontWeight: 800, flex: 1 }}>{s.label}</span>
            <Icon name="back" size={18} style={{ transform: 'scaleX(-1)', color: 'var(--muted)' }} />
          </button>
        ))}
      </div>

      {lastResults.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 22 }}>آخر عمليات تسجيل</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lastResults.map(r => (
              <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.teamName}</div>
                  <div className="subtle">{r.programItemTitle}</div>
                </div>
                <span className="pill" style={{ background: 'rgba(62,107,79,.15)', color: 'var(--green)' }}>+{r.points}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, c }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: c }}>{value}</div>
      <div className="subtle" style={{ marginTop: 2 }}>{label}</div>
    </div>
  )
}
