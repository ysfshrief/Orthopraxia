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
import AdminOverview from './admin/AdminOverview'
import AdminJudges from './admin/AdminJudges'
import AdminMainVideo from './admin/AdminMainVideo'
import AdminSecretFriend from './admin/AdminSecretFriend'

const SECTIONS = [
  { key: 'overview', label: 'نظرة عامة', icon: 'grid' },
  { key: 'teams', label: 'الفرق', icon: 'users' },
  { key: 'participants', label: 'المخدومين + الكارنيهات', icon: 'card' },
  { key: 'judges', label: 'الحكام', icon: 'trophy' },
  { key: 'results', label: 'الحضور والنقاط', icon: 'trophy' },
  { key: 'mainvideo', label: 'Main Video', icon: 'video' },
  { key: 'secretfriend', label: 'الصديق الخفي', icon: 'quiz' },
  { key: 'notifications', label: 'الإشعارات', icon: 'bell' },
  { key: 'settings', label: 'الإعدادات', icon: 'gear' },
]

const CMP = {
  teams: AdminTeams, participants: AdminParticipants, results: AdminResults,
  settings: AdminSettings, notifications: AdminNotifications,
  judges: AdminJudges, mainvideo: AdminMainVideo, secretfriend: AdminSecretFriend,
}

export default function Admin() {
  const { isAdmin, logout } = useAuth()
  const { teams, participants } = useData()
  const [results, setResults] = useState([])
  const [notifs, setNotifs] = useState([])

  // mobile: null = menu; desktop: default overview
  const [mSection, setMSection] = useState(null)
  const [dSection, setDSection] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => subscribe('attendanceResults', setResults), [])
  useEffect(() => subscribe('notifications', setNotifs), [])

  // toggle body class so global CSS can widen/hide tabbar on desktop admin
  useEffect(() => {
    document.body.classList.add('admin-mode')
    return () => document.body.classList.remove('admin-mode')
  }, [])

  if (!isAdmin) return <Navigate to="/" replace />

  const stats = {
    participants: participants.length,
    teams: teams.length,
    sessions: results.length,
    points: results.reduce((s, r) => s + (r.points || 0), 0),
  }

  // ---------- DESKTOP CONTENT ----------
  const renderDesktopContent = () => {
    if (dSection === 'overview') {
      return <AdminOverview teams={teams} participants={participants} results={results} stats={stats} goto={setDSection} />
    }
    const Cmp = CMP[dSection]
    return <Cmp embedded />
  }

  const curLabel = SECTIONS.find(s => s.key === dSection)?.label || 'لوحة التحكم'
  const hasNewNotif = notifs.some(n => n.createdAt && Date.now() - n.createdAt < 1000 * 60 * 60 * 6)

  return (
    <>
      {/* ================= MOBILE (unchanged behavior) ================= */}
      <div className="admin-mobile">
        <AdminMobile
          mSection={mSection} setMSection={setMSection}
          stats={stats} results={results}
        />
      </div>

      {/* ================= DESKTOP ================= */}
      <div className="admin-desktop">
        <div className={`adm-shell ${collapsed ? 'collapsed' : ''}`}>
          <aside className={`adm-side ${collapsed ? 'collapsed' : ''}`}>
            <div className="adm-side-top">
              <img src="/logo-circle.png" alt="" />
              <span className="brand">Orthopraxia</span>
            </div>
            <nav className="adm-nav">
              {SECTIONS.map(s => (
                <button key={s.key} className={dSection === s.key ? 'active' : ''} onClick={() => setDSection(s.key)} title={s.label}>
                  <Icon name={s.icon} size={20} />
                  <span>{s.label}</span>
                </button>
              ))}
              <a href="#/organizer" className="adm-nav-link" style={{ textDecoration: 'none' }}>
                <button title="ماسح الحضور">
                  <Icon name="scan" size={20} />
                  <span>ماسح الحضور</span>
                </button>
              </a>
            </nav>
            <div className="adm-side-foot">
              <button className="adm-collapse-btn" onClick={() => setCollapsed(c => !c)}>
                <Icon name="back" size={16} style={{ transform: collapsed ? 'scaleX(-1)' : 'none' }} />
                <span>{collapsed ? '' : 'طي القائمة'}</span>
              </button>
            </div>
          </aside>

          <div className="adm-main">
            <header className="adm-header">
              <h1>{curLabel}</h1>
              <div className="adm-header-right">
                <button className="adm-bell" title="الإشعارات" onClick={() => setDSection('notifications')}>
                  <Icon name="bell" size={20} />
                  {hasNewNotif && <span className="dot" />}
                </button>
                <div className="adm-userchip">
                  <span className="av">A</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>الأدمن</span>
                </div>
                <button className="btn ghost" style={{ padding: '9px 14px' }} onClick={logout}>
                  <Icon name="logout" size={16} /> خروج
                </button>
              </div>
            </header>
            <div className="adm-content">
              <div className="adm-container">
                {renderDesktopContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ---------------- MOBILE (original flow preserved) ---------------- */
function AdminMobile({ mSection, setMSection, stats, results }) {
  if (mSection) {
    const back = () => setMSection(null)
    const Cmp = CMP[mSection]
    return <Cmp back={back} />
  }

  const lastResults = [...results].sort((a, b) => new Date(b.completionTime) - new Date(a.completionTime)).slice(0, 4)
  const M = [
    { key: 'teams', label: 'الفرق', icon: 'users' },
    { key: 'participants', label: 'المخدومين + الكارنيهات', icon: 'card' },
    { key: 'judges', label: 'الحكام', icon: 'trophy' },
    { key: 'results', label: 'الحضور والنقاط', icon: 'trophy' },
    { key: 'mainvideo', label: 'Main Video', icon: 'video' },
    { key: 'secretfriend', label: 'الصديق الخفي', icon: 'quiz' },
    { key: 'notifications', label: 'الإشعارات', icon: 'bell' },
    { key: 'settings', label: 'الإعدادات', icon: 'gear' },
  ]

  return (
    <div className="page">
      <Header title="لوحة التحكم" />

      <div className="grid2" style={{ marginBottom: 18 }}>
        <Stat label="المخدومين" value={stats.participants} c="var(--maroon)" />
        <Stat label="الفرق" value={stats.teams} c="var(--gold)" />
        <Stat label="جلسات الحضور" value={stats.sessions} c="var(--green)" />
        <Stat label="إجمالي نقاط الحضور" value={stats.points} c="#3A5A78" />
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
        {M.map(s => (
          <button key={s.key} className="card" onClick={() => setMSection(s.key)}
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
