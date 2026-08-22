import { useEffect, useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { subscribe, create, remove } from '../lib/store'
import { useData } from '../context/DataContext'
import { useParticipant } from '../context/ParticipantContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

export default function JudgePanel() {
  const { teams } = useData()
  const { judgeId, logout } = useParticipant()
  const toast = useToast()
  const [judges, setJudges] = useState([])
  const [judgePoints, setJudgePoints] = useState([])
  const [results, setResults] = useState([])
  const [modal, setModal] = useState(null) // {team, mode:'add'|'remove'}
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => subscribe('judges', setJudges), [])
  useEffect(() => subscribe('judgePoints', arr => {
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); setJudgePoints(arr)
  }), [])
  useEffect(() => subscribe('attendanceResults', setResults), [])

  const judge = judges.find(j => j.id === judgeId)

  // team totals = attendance + judge points + bonus
  const standings = useMemo(() => {
    return teams.map(t => {
      const att = results.filter(r => r.teamId === t.id).reduce((s, r) => s + (r.points || 0), 0)
      const jp = judgePoints.filter(p => p.teamId === t.id).reduce((s, p) => s + (p.points || 0), 0)
      return { ...t, att, jp, total: Math.round((att + jp + (t.bonusPoints || 0)) * 100) / 100 }
    }).sort((a, b) => b.total - a.total)
  }, [teams, results, judgePoints])

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
      createdAt: Date.now()
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
      <p className="subtle" style={{ marginBottom: 14 }}>أهلاً {judge?.name} — يمكنك إضافة أو خصم نقاط لأي فريق.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {standings.map((t, i) => (
          <div key={t.id} className="card" style={{ borderInlineStart: `6px solid ${t.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 900, minWidth: 30, textAlign: 'center', color: 'var(--muted)' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{t.name}</div>
                <div className="subtle">حضور: {t.att} • حكم: {t.jp >= 0 ? '+' : ''}{t.jp}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--maroon)' }}>{t.total}</div>
                <div className="subtle" style={{ fontSize: 11 }}>نقطة</div>
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

      {/* history */}
      <h3 className="section-title" style={{ marginTop: 22 }}>سجل تعديلات الحكم</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {judgePoints.length === 0 && <div className="empty">لا توجد تعديلات بعد</div>}
        {judgePoints.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.teamName} {p.reason ? `— ${p.reason}` : ''}</div>
              <div className="subtle" style={{ fontSize: 12 }}>{p.judgeName}</div>
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
