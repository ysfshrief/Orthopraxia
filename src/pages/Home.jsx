import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useParticipant } from '../context/ParticipantContext'
import { useToast, Modal } from '../components/UI'
import Countdown from '../components/Countdown'
import MainVideo from '../components/MainVideo'
import Icon from '../components/Icons'

const quick = [
  { to: '/program', icon: 'cal', label: 'برنامج الخلوة', c: 'var(--maroon)' },
  { to: '/leaderboard', icon: 'trophy', label: 'النتائج', c: 'var(--gold)' },
  { to: '/videos', icon: 'video', label: 'الفيديوهات', c: 'var(--green)' },
  { to: '/competition', icon: 'quiz', label: 'المسابقة', c: '#3A5A78' },
  { to: '/secret-friend', icon: 'quiz', label: 'الصديق الخفي', c: '#8B2E6E' },
  { to: '/audio', icon: 'music', label: 'الصلاة والترانيم', c: '#8B4A9E' },
]

export default function Home() {
  const nav = useNavigate()
  const { settings } = useData()
  const { isAdmin, login, logout } = useAuth()
  const { participantId, judgeId } = useParticipant()
  const toast = useToast()
  const [program, setProgram] = useState([])
  const [taps, setTaps] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [pw, setPw] = useState('')

  useEffect(() => subscribe('program', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setProgram(arr)
  }), [])

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
      setShowLogin(false); setPw(''); nav('/admin')
    } else toast('كلمة المرور غير صحيحة', 'err')
  }

  return (
    <div className="page">
      <div className="center-col" style={{ paddingTop: 6 }}>
        <div className="logo-ring">
          <img src="/logo-circle.png" alt="Orthopraxia" />
        </div>
        <h1 style={{ margin: '12px 0 2px', color: 'var(--maroon)', fontSize: 30 }}>{settings.retreatName}</h1>
        <div className="pill" style={{ background: 'rgba(201,154,58,.2)', color: 'var(--maroon)' }}>{settings.subtitle}</div>
      </div>

      <div style={{ marginTop: 18 }}>
        <MainVideo />
      </div>

      <div style={{ marginTop: 18 }}>
        <Countdown program={program} />
      </div>

      <p className="subtle" style={{ marginTop: 14, lineHeight: 1.7, textAlign: 'center' }}>{settings.about}</p>

      {!participantId && !judgeId ? (
        <button className="btn gold full" style={{ marginTop: 16 }} onClick={() => nav('/login')}>
          <Icon name="scan" size={18} /> تسجيل الدخول بالكارنيه
        </button>
      ) : judgeId ? (
        <button className="btn full" style={{ marginTop: 16 }} onClick={() => nav('/judge')}>
          <Icon name="trophy" size={18} /> لوحة الحكم
        </button>
      ) : (
        <button className="btn full" style={{ marginTop: 16 }} onClick={() => nav('/me')}>
          <Icon name="users" size={18} /> حسابي وفريقي
        </button>
      )}

      <h3 className="section-title" style={{ marginTop: 22 }}>الوصول السريع</h3>
      <div className="grid2">
        {quick.map(q => (
          <button key={q.to} className="card" onClick={() => nav(q.to)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: 'none', textAlign: 'right' }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: q.c, color: '#fff' }}>
              <Icon name={q.icon} size={22} />
            </span>
            <span style={{ fontWeight: 800 }}>{q.label}</span>
          </button>
        ))}
      </div>

      <footer className="site-footer">
        <div onClick={tapLogo} style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-circle.png" alt="" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        </div>
        <div className="foot-line" style={{ marginTop: 10, fontWeight: 700 }}>
          كنيسة الملاك الجليل ميخائيل بدمنهور
        </div>
        <div className="foot-line">خدمة الشباب — Sons Of Heaven</div>
        <div className="foot-divider" />
        <div className="foot-copy">
          © {new Date().getFullYear()} جميع الحقوق محفوظة
        </div>
        <div className="foot-line dev">Developed &amp; designed by: Youssef Shrief</div>
        {isAdmin && (
          <button className="btn ghost" style={{ marginTop: 12, padding: '6px 14px' }} onClick={() => { logout(); toast('تم تسجيل الخروج', 'warn') }}>
            <Icon name="logout" size={16} /> خروج الأدمن
          </button>
        )}
      </footer>

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
