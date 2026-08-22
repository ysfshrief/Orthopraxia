import { NavLink } from 'react-router-dom'
import Icon from './Icons'
import { useAuth } from '../context/AuthContext'
import { useParticipant } from '../context/ParticipantContext'

const base = [
  { to: '/', icon: 'home', label: 'الرئيسية', end: true },
  { to: '/program', icon: 'cal', label: 'البرنامج' },
  { to: '/leaderboard', icon: 'trophy', label: 'النتائج' },
]

export default function TabBar() {
  const { isAdmin } = useAuth()
  const { participantId, judgeId } = useParticipant()
  return (
    <nav className="tabbar">
      {base.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </NavLink>
      ))}
      {judgeId && (
        <NavLink to="/judge" className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name="trophy" />
          <span>الحكم</span>
        </NavLink>
      )}
      {participantId && (
        <NavLink to="/me" className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name="users" />
          <span>حسابي</span>
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
          <Icon name="gear" />
          <span>الأدمن</span>
        </NavLink>
      )}
    </nav>
  )
}
