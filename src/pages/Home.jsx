import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal } from '../components/UI'
import Icon from '../components/Icons'

const quick = [
  { to: '/program', icon: 'cal', label: 'برنامج الخلوة', c: 'var(--maroon)' },
  { to: '/leaderboard', icon: 'trophy', label: 'النتائج', c: 'var(--gold)' },
  { to: '/videos', icon: 'video', label: 'الفيديوهات', c: 'var(--green)' },
  { to: '/competition', icon: 'quiz', label: 'المسابقة', c: '#3A5A78' },
  { to: '/audio', icon: 'music', label: 'الصلاة والتسبحة', c: '#8B4A9E' },
  { to: '/scan', icon: 'scan', label: 'تسجيل الحضور', c: 'var(--maroon-2)' },
]

export default function Home() {
  const nav = useNavigate()
  const { settings } = useData()
  const { isAdmin, login, logout } = useAuth()
  const toast = useToast()
  const [taps, setTaps] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [pw, setPw] = useState('')

  const tapLogo = () => {
    if (isAdmin) return
    const need = settings.adminTapCount || 3
    const n = taps + 1
    setTaps(n)
    clearTimeout(window.__tap)
    window.__tap = setTimeout(() => setTaps(0), 1200)
    if (n >= need) { setTaps(0); setShowLogin(true) }
  }

  const doLogin = () => {
    if (login(pw, settings.adminPassword)) {
      toast('تم تسجيل الدخول كأدمن', 'ok')
      setShowLogin(false); setPw('')
      nav('/admin')
    } else {
      toast('كلمة المرور غير صحيحة', 'err')
    }
  }

  return (
    <div className="page">
      <div className="center-col" style={{ paddingTop: 8 }}>
        <div style={{
          width: 168, height: 168, borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 40%, #fff7e8, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pop .5s ease'
        }}>
          <img src="/logo.png" alt="Orthopraxia" style={{ width: 150, height: 150, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(107,35,24,.25))' }} />
        </div>
        <h1 style={{ margin: '10px 0 2px', color: 'var(--maroon)', fontSize: 30, letterSpacing: '.5px' }}>
          {settings.retreatName}
        </h1>
        <div className="pill" style={{ background: 'rgba(201,154,58,.2)', color: 'var(--maroon)' }}>
          {settings.subtitle}
        </div>
        <p className="subtle" style={{ marginTop: 12, lineHeight: 1.7, maxWidth: 420 }}>
          {settings.about}
        </p>
      </div>

      <h3 className="section-title" style={{ marginTop: 20 }}>الوصول السريع</h3>
      <div className="grid2">
        {quick.map(q => (
          <button key={q.to} className="card" onClick={() => nav(q.to)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: 'none', textAlign: 'right' }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center',
              background: q.c, color: '#fff'
            }}><Icon name={q.icon} size={22} /></span>
            <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Footer with hidden admin login */}
      <div style={{ marginTop: 30, textAlign: 'center', paddingBottom: 8 }}>
        <div onClick={tapLogo} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <img src="/logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', opacity: .7, verticalAlign: 'middle' }} />
          <span className="subtle" style={{ marginInlineStart: 8 }}>Orthopraxia</span>
        </div>
        {isAdmin && (
          <button className="btn ghost" style={{ marginTop: 10, padding: '6px 14px' }} onClick={() => { logout(); toast('تم تسجيل الخروج', 'warn') }}>
            <Icon name="logout" size={16} /> خروج الأدمن
          </button>
        )}
      </div>

      {showLogin && (
        <Modal title="دخول الأدمن" onClose={() => setShowLogin(false)}>
          <div className="field">
            <label>كلمة المرور</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} autoFocus inputMode="numeric" />
          </div>
          <button className="btn full" onClick={doLogin}>دخول</button>
        </Modal>
      )}
    </div>
  )
}
