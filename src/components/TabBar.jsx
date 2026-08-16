import { NavLink } from 'react-router-dom'
import Icon from './Icons'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/', icon: 'home', label: 'الرئيسية', end: true },
  { to: '/program', icon: 'cal', label: 'البرنامج' },
  { to: '/leaderboard', icon: 'trophy', label: 'النتائج' },
  { to: '/scan', icon: 'scan', label: 'الحضور' },
]

export default function TabBar() {
  const { isAdmin } = useAuth()
  return (
    <nav className="tabbar">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name="gear" />
          <span>الأدمن</span>
        </NavLink>
      )}
    </nav>
  )
}
