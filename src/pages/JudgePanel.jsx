import { useEffect, useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { subscribe, create, remove } from '../lib/store'
import { useData } from '../context/DataContext'
import { useParticipant } from '../context/ParticipantContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

/*
  Judge privacy (frontend enforcement on Spark):
  A judge sees ONLY the points THEY entered — never attendance, never other
  judges' points, never team totals. We filter judgePoints to this judge's id
  and never read/display attendanceResults or other judges' entries here.

  NOTE: on Spark this is UI-level only. A determined user could still query
  Firestore directly from DevTools. True server-side isolation needs Firebase
  Auth + Security Rules (each judge authenticated) or a Cloud Function, which
  require the Blaze plan. The accompanying firestore.rules file locks writes to
  match the judge's own id as far as rules can without full Auth.
*/

export default function JudgePanel() {
  const { teams } = useData()
  const { judgeId, logout } = useParticipant()
  const toast = useToast()
  const [judges, setJudges] = useState([])
  const [myPoints, setMyPoints] = useState([])
  const [modal, setModal] = useState(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => subscribe('judges', setJudges), [])
  // only THIS judge's entries are kept in state — nothing else is displayed
  useEffect(() => subscribe('judgePoints', arr => {
    const mine = arr.filter(p => p.judgeId === judgeId)
    mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    setMyPoints(mine)
  }), [judgeId])

  const judge = judges.find(j => j.id === judgeId)

  // per-team sum of MY OWN points only (no attendance, no other judges)
  const myByTeam = useMemo(() => {
    const m = {}
    for (const p of myPoints) m[p.teamId] = (m[p.teamId] || 0) + (p.points || 0)
    return m
  }, [myPoints])

  if (!judgeId) return <Navigate to="/login" replace />
  if (judge && judge.active === false) {
    return (
      <div className="page">
        <Header title="لوحة الحكم" />
        <div className="empty" style={{ marginTop: 40 }}>
          <p style={{ fontWeight: 700 }}>حساب الحكم معطّل حالياً</p>
          <button className="btn ghost" style={{ marginTop: 14 }} onClick={logout}>خروج</button>
        </div>
      </div>
    )
  }

  const submit = async () => {
    const n = Number(amount)
    if (!n || n <= 0) return toast('ادخل رقم صحيح', 'warn')
    const pts = modal.mode === 'add' ? n : -n
    await create('judgePoints', {
      teamId: modal.team.id, teamName: modal.team.name,
      points: pts, reason: reason || '', judgeId, judgeName: judge?.name || 'الحكم',
      source: 'judge', createdAt: Date.now()
    })
    toast(`${modal.mode === 'add' ? 'أُضيفت' : 'خُصمت'} ${n} نقطة لـ${modal.team.name}`, 'ok')
    setModal(null); setAmount(''); setReason('')
  }

  const delEntry = async (id) => {
    if (!confirm('حذف هذا التعديل؟')) return
    await remove('judgePoints', id); toast('تم الحذف', 'warn')
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: 'var(--maroon)', fontSize: 22 }}>⚖️ لوحة الحكم</h2>
        <button className="btn ghost" style={{ padding: '8px 12px' }} onClick={logout}>
          <Icon name="logout" size={16} /> خروج
        </button>
      </div>
      <p className="subtle" style={{ marginBottom: 14 }}>
        أهلاً {judge?.name} — تقدر تضيف أو تخصم نقاط لأي فريق. بتشوف درجاتك إنت بس.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.slice().sort((a, b) => a.order - b.order).map(t => (
          <div key={t.id} className="card" style={{ borderInlineStart: `6px solid ${t.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{t.name}</div>
                <div className="subtle">درجاتك لهذا الفريق: <b style={{ color: 'var(--maroon)' }}>{(myByTeam[t.id] || 0) >= 0 ? '+' : ''}{myByTeam[t.id] || 0}</b></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn green" style={{ flex: 1 }} onClick={() => { setModal({ team: t, mode: 'add' }); setAmount(''); setReason('') }}>
                <Icon name="plus" size={16} /> إضافة نقاط
              </button>
              <button className="btn red" style={{ flex: 1 }} onClick={() => { setModal({ team: t, mode: 'remove' }); setAmount(''); setReason('') }}>
                <Icon name="trash" size={16} /> خصم نقاط
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* history — MY entries only */}
      <h3 className="section-title" style={{ marginTop: 22 }}>سجل درجاتي</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {myPoints.length === 0 && <div className="empty">لا توجد درجات بعد</div>}
        {myPoints.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.teamName} {p.reason ? `— ${p.reason}` : ''}</div>
              <div className="subtle" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleString('ar-EG')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pill" style={{ background: p.points >= 0 ? 'rgba(62,107,79,.15)' : 'rgba(178,58,47,.15)', color: p.points >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {p.points >= 0 ? '+' : ''}{p.points}
              </span>
              <button className="btn ghost" style={{ padding: '6px', color: 'var(--red)' }} onClick={() => delEntry(p.id)}><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={`${modal.mode === 'add' ? 'إضافة' : 'خصم'} نقاط — ${modal.team.name}`} onClose={() => setModal(null)}>
          <div className="field"><label>عدد النقاط</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus inputMode="numeric" min="1" />
          </div>
          <div className="field"><label>السبب (اختياري)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: الفوز في المسابقة" />
          </div>
          <button className={`btn full ${modal.mode === 'add' ? 'green' : 'red'}`} onClick={submit}>
            {modal.mode === 'add' ? 'إضافة' : 'خصم'}
          </button>
        </Modal>
      )}
    </div>
  )
}
