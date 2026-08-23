import { useEffect, useState, useMemo } from 'react'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useParticipant } from '../context/ParticipantContext'
import { Header } from '../components/UI'
import Icon from '../components/Icons'
import QrCard from '../components/QrCard'

export default function MyTeam() {
  const { participants, teams } = useData()
  const { participantId, logout } = useParticipant()
  const [results, setResults] = useState([])
  const [judgePoints, setJudgePoints] = useState([])
  const [showCard, setShowCard] = useState(false)

  useEffect(() => subscribe('attendanceResults', setResults), [])
  useEffect(() => subscribe('judgePoints', setJudgePoints), [])

  const me = participants.find(p => p.id === participantId)
  const team = me ? teams.find(t => t.id === me.teamId) : null
  const members = useMemo(() => me ? participants.filter(p => p.teamId === me.teamId) : [], [participants, me])

  const teamResults = useMemo(() => me ? results.filter(r => r.teamId === me.teamId) : [], [results, me])
  const attPts = teamResults.reduce((s, r) => s + (r.points || 0), 0)
  const myJudgePts = useMemo(() => me ? judgePoints.filter(p => p.teamId === me.teamId).reduce((s, p) => s + (p.points || 0), 0) : 0, [judgePoints, me])
  const totalPts = Math.round((attPts + myJudgePts + (team?.bonusPoints || 0)) * 100) / 100

  // my rank
  const rank = useMemo(() => {
    const rows = teams.map(t => ({
      id: t.id,
      total: results.filter(r => r.teamId === t.id).reduce((s, r) => s + (r.points || 0), 0)
        + judgePoints.filter(p => p.teamId === t.id).reduce((s, p) => s + (p.points || 0), 0)
        + (t.bonusPoints || 0)
    })).sort((a, b) => b.total - a.total)
    return rows.findIndex(r => r.id === me?.teamId) + 1
  }, [teams, results, judgePoints, me])

  if (!me) {
    return (
      <div className="page">
        <Header title="حسابي" />
        <div className="empty">لم يتم العثور على بياناتك — سجّل الدخول من جديد.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title="حسابي" />

      {/* profile */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, borderInlineStart: `6px solid ${team?.color || 'var(--gold)'}` }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', background: team?.color || 'var(--gold)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22 }}>
          {me.name?.[0] || '؟'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{me.name}</div>
          <div className="subtle">{team?.name}</div>
        </div>
        <button className="btn ghost" style={{ padding: '8px 10px' }} onClick={() => setShowCard(v => !v)}>
          <Icon name="card" size={18} />
        </button>
      </div>

      {showCard && (
        <div className="center-col" style={{ marginTop: 14 }}>
          <QrCard participant={me} retreatName="Orthopraxia" />
        </div>
      )}

      {/* team stats */}
      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--maroon)' }}>{totalPts}</div>
          <div className="subtle">نقاط الفريق</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)' }}>{rank || '—'}</div>
          <div className="subtle">ترتيب الفريق</div>
        </div>
      </div>

      {/* attendance history */}
      <h3 className="section-title" style={{ marginTop: 20 }}>حضور فريقك</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teamResults.length === 0 && <div className="empty">لا يوجد حضور مسجّل بعد</div>}
        {teamResults.map(r => (
          <div key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{r.programItemTitle || 'فقرة'}</div>
              <div className="subtle">{r.day}</div>
            </div>
            <span className="pill" style={{ background: 'rgba(62,107,79,.15)', color: 'var(--green)' }}>+{r.points}</span>
          </div>
        ))}
      </div>

      {/* members */}
      <h3 className="section-title" style={{ marginTop: 20 }}>أعضاء الفريق ({members.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.map(mem => (
          <div key={mem.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: team?.color || 'var(--gold)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
              {mem.name?.[0]}
            </div>
            <div style={{ fontWeight: 700, flex: 1 }}>
              {mem.name}
              {team?.leader && mem.name === team.leader && <span className="pill" style={{ marginInlineStart: 8, background: 'rgba(201,154,58,.25)', color: 'var(--maroon)', fontSize: 11 }}>قائد</span>}
            </div>
            {mem.id === me.id && <span className="subtle" style={{ fontSize: 12 }}>أنت</span>}
          </div>
        ))}
      </div>

      <button className="btn ghost full" style={{ marginTop: 22 }} onClick={logout}>
        <Icon name="logout" size={18} /> تسجيل الخروج
      </button>
    </div>
  )
}
