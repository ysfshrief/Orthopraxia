import { useMemo } from 'react'
import { itemDate } from '../../lib/schedule'
import { useEffect, useState } from 'react'
import { subscribe } from '../../lib/store'

export default function AdminOverview({ teams, participants, results, stats, goto }) {
  const [program, setProgram] = useState([])
  const [judgePoints, setJudgePoints] = useState([])
  useEffect(() => subscribe('program', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setProgram(arr)
  }), [])
  useEffect(() => subscribe('judgePoints', setJudgePoints), [])

  // team standings (attendance + judge + bonus)
  const standings = useMemo(() => {
    return teams.map(t => {
      const att = results.filter(r => r.teamId === t.id).reduce((s, r) => s + (r.points || 0), 0)
      const jp = judgePoints.filter(p => p.teamId === t.id).reduce((s, p) => s + (p.points || 0), 0)
      return { ...t, att, jp, total: Math.round((att + jp + (t.bonusPoints || 0)) * 100) / 100, members: participants.filter(p => p.teamId === t.id).length }
    }).sort((a, b) => b.total - a.total)
  }, [teams, results, participants, judgePoints])

  const maxPts = Math.max(1, ...standings.map(s => s.total))

  // upcoming activities (next 5 from now)
  const upcoming = useMemo(() => {
    const now = Date.now()
    return program
      .map(p => ({ ...p, _d: itemDate(p, false) }))
      .filter(p => p._d && p._d.getTime() >= now)
      .sort((a, b) => a._d - b._d)
      .slice(0, 5)
  }, [program])

  const lastResults = [...results].sort((a, b) => new Date(b.completionTime) - new Date(a.completionTime)).slice(0, 6)
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) } catch { return '' } }

  return (
    <>
      <div className="adm-stats">
        <StatCard v={stats.participants} l="المخدومين" c="var(--maroon)" />
        <StatCard v={stats.teams} l="الفرق" c="var(--gold)" />
        <StatCard v={stats.sessions} l="جلسات الحضور" c="var(--green)" />
        <StatCard v={stats.points} l="إجمالي نقاط الحضور" c="#3A5A78" />
      </div>

      <div className="adm-cols">
        {/* left: standings chart + last attendance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="adm-panel">
            <div className="adm-panel-h">ترتيب الفرق</div>
            <div className="adm-panel-b" style={{ padding: 18 }}>
              {standings.map(s => (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700 }}>{s.name} <span className="subtle">({s.members} عضو)</span></span>
                    <span style={{ fontWeight: 900, color: 'var(--maroon)' }}>{s.total}</span>
                  </div>
                  <div style={{ height: 12, borderRadius: 999, background: 'rgba(201,154,58,.18)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.total / maxPts) * 100}%`, background: s.color || 'var(--gold)', borderRadius: 999, transition: 'width .4s' }} />
                  </div>
                </div>
              ))}
              {standings.length === 0 && <div className="empty">لا توجد فرق</div>}
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-h">آخر عمليات تسجيل الحضور</div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>الفريق</th><th>الفقرة</th><th>الوقت</th><th style={{ textAlign: 'end' }}>النقاط</th></tr>
                </thead>
                <tbody>
                  {lastResults.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.teamName}</td>
                      <td>{r.programItemTitle}</td>
                      <td className="subtle">{fmt(r.completionTime)}</td>
                      <td style={{ textAlign: 'end' }}><span className="pill" style={{ background: 'rgba(62,107,79,.15)', color: 'var(--green)' }}>+{r.points}</span></td>
                    </tr>
                  ))}
                  {lastResults.length === 0 && <tr><td colSpan={4}><div className="empty">لا يوجد حضور مسجّل بعد</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* right: upcoming + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="adm-panel">
            <div className="adm-panel-h">الأنشطة القادمة</div>
            <div className="adm-panel-b" style={{ padding: 14 }}>
              {upcoming.map(u => (
                <div key={u.id} style={{ display: 'flex', gap: 12, padding: '10px 6px', borderBottom: '1px solid rgba(201,154,58,.14)' }}>
                  <div style={{ minWidth: 8, borderRadius: 4, background: 'var(--gold)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.title}</div>
                    <div className="subtle" style={{ fontSize: 12 }}>{u.day} • {u.time}{u.place ? ` • ${u.place}` : ''}</div>
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && <div className="empty">لا توجد أنشطة قادمة</div>}
            </div>
          </div>

          <div className="adm-panel">
            <div className="adm-panel-h">اختصارات</div>
            <div className="adm-panel-b" style={{ padding: 14, display: 'grid', gap: 10 }}>
              <button className="btn full" onClick={() => goto('participants')}>إدارة المخدومين والكارنيهات</button>
              <button className="btn gold full" onClick={() => goto('teams')}>إدارة الفرق</button>
              <a className="btn ghost full" href="#/organizer" style={{ textAlign: 'center' }}>فتح ماسح الحضور</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function StatCard({ v, l, c }) {
  return (
    <div className="adm-stat">
      <div className="v" style={{ color: c }}>{v}</div>
      <div className="l">{l}</div>
    </div>
  )
}
