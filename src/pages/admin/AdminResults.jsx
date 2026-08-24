import { useEffect, useState, useMemo } from 'react'
import { subscribe, update, remove, create } from '../../lib/store'
import { useData } from '../../context/DataContext'
import { useToast, Modal, Header } from '../../components/UI'
import Icon from '../../components/Icons'

export default function AdminResults({ back, embedded }) {
  const { teams } = useData()
  const toast = useToast()
  const [results, setResults] = useState([])
  const [judgePoints, setJudgePoints] = useState([])
  const [edit, setEdit] = useState(null)
  const [ptModal, setPtModal] = useState(null) // {team, mode}
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => subscribe('attendanceResults', arr => {
    arr.sort((a, b) => new Date(b.completionTime) - new Date(a.completionTime)); setResults(arr)
  }), [])
  useEffect(() => subscribe('judgePoints', arr => {
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); setJudgePoints(arr)
  }), [])

  const standings = useMemo(() => teams.map(t => {
    const att = results.filter(r => r.teamId === t.id).reduce((s, r) => s + (r.points || 0), 0)
    const teamPts = judgePoints.filter(p => p.teamId === t.id)
    const judgeSum = teamPts.filter(p => p.source !== 'admin' && p.judgeId !== 'admin').reduce((s, p) => s + (p.points || 0), 0)
    const adminSum = teamPts.filter(p => p.source === 'admin' || p.judgeId === 'admin').reduce((s, p) => s + (p.points || 0), 0)
    const jp = judgeSum + adminSum
    return { ...t, att, jp, judgeSum, adminSum, total: Math.round((att + jp + (t.bonusPoints || 0)) * 100) / 100 }
  }).sort((a, b) => b.total - a.total), [teams, results, judgePoints])

  const save = async () => {
    await update('attendanceResults', edit.id, { points: Number(edit.points) || 0 })
    toast('تم تعديل النقاط', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف نتيجة الحضور؟')) { await remove('attendanceResults', id); toast('تم الحذف', 'warn') } }

  const submitPts = async () => {
    const n = Number(amount)
    if (!n || n <= 0) return toast('ادخل رقم صحيح', 'warn')
    const pts = ptModal.mode === 'add' ? n : -n
    await create('judgePoints', {
      teamId: ptModal.team.id, teamName: ptModal.team.name,
      points: pts, reason: reason || '', judgeId: 'admin', judgeName: 'الإدارة',
      source: 'admin', createdAt: Date.now()
    })
    toast(`${ptModal.mode === 'add' ? 'أُضيفت' : 'خُصمت'} ${n} نقطة لـ${ptModal.team.name}`, 'ok')
    setPtModal(null); setAmount(''); setReason('')
  }
  const delJp = async (id) => { if (confirm('حذف هذا التعديل؟')) { await remove('judgePoints', id); toast('تم الحذف', 'warn') } }

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('ar-EG') } catch { return iso } }

  return (
    <div className="page">
      {!embedded && <Header title="الحضور والنقاط" back={back} />}

      {/* ===== Admin manual team points control ===== */}
      <h3 className="section-title" style={{ marginTop: 0 }}>التحكم في نقاط الفرق</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {standings.map((t, i) => (
          <div key={t.id} className="card" style={{ borderInlineStart: `6px solid ${t.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 900, minWidth: 26, textAlign: 'center', color: 'var(--muted)' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{t.name}</div>
                <div className="subtle" style={{ fontSize: 12 }}>
                  حضور: <b>{t.att}</b> • حكم: <b>{t.judgeSum >= 0 ? '+' : ''}{t.judgeSum}</b> • إدارة: <b>{t.adminSum >= 0 ? '+' : ''}{t.adminSum}</b>
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--maroon)' }}>{t.total}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn green" style={{ flex: 1 }} onClick={() => { setPtModal({ team: t, mode: 'add' }); setAmount(''); setReason('') }}>
                <Icon name="plus" size={16} /> إضافة
              </button>
              <button className="btn red" style={{ flex: 1 }} onClick={() => { setPtModal({ team: t, mode: 'remove' }); setAmount(''); setReason('') }}>
                <Icon name="trash" size={16} /> خصم
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* manual points log */}
      {judgePoints.length > 0 && (
        <>
          <h3 className="section-title">سجل التعديلات اليدوية</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {judgePoints.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.teamName} {p.reason ? `— ${p.reason}` : ''}</div>
                  <div className="subtle" style={{ fontSize: 12 }}>{p.judgeName || 'الحكم'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pill" style={{ background: p.points >= 0 ? 'rgba(62,107,79,.15)' : 'rgba(178,58,47,.15)', color: p.points >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {p.points >= 0 ? '+' : ''}{p.points}
                  </span>
                  <button className="btn ghost" style={{ padding: '6px', color: 'var(--red)' }} onClick={() => delJp(p.id)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== Attendance results ===== */}
      <h3 className="section-title">نتائج الحضور</h3>
      <p className="subtle" style={{ marginBottom: 12 }}>تعديل وقت/نقاط الحضور من صلاحيات الأدمن فقط.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(r => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{r.teamName}</div>
              <span className="pill" style={{ background: 'rgba(62,107,79,.15)', color: 'var(--green)' }}>{r.points} نقطة</span>
            </div>
            <div className="subtle" style={{ marginTop: 4 }}>{r.programItemTitle} — {r.day}</div>
            <div className="subtle">اكتمل: {r.completedCount}/{r.totalCount} • {fmt(r.completionTime)}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEdit(r)}><Icon name="edit" size={16} /> تعديل النقاط</button>
              <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => del(r.id)}><Icon name="trash" size={16} /></button>
            </div>
          </div>
        ))}
        {results.length === 0 && <div className="empty">لا توجد نتائج حضور بعد</div>}
      </div>

      {edit && (
        <Modal title="تعديل النقاط" onClose={() => setEdit(null)}>
          <p className="subtle">{edit.teamName} — {edit.programItemTitle}</p>
          <div className="field"><label>النقاط</label><input type="number" value={edit.points} onChange={e => setEdit({ ...edit, points: e.target.value })} autoFocus /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}

      {ptModal && (
        <Modal title={`${ptModal.mode === 'add' ? 'إضافة' : 'خصم'} نقاط — ${ptModal.team.name}`} onClose={() => setPtModal(null)}>
          <div className="field"><label>عدد النقاط</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus inputMode="numeric" min="1" />
          </div>
          <div className="field"><label>السبب (اختياري)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: مخالفة / مكافأة" />
          </div>
          <button className={`btn full ${ptModal.mode === 'add' ? 'green' : 'red'}`} onClick={submitPts}>
            {ptModal.mode === 'add' ? 'إضافة' : 'خصم'}
          </button>
        </Modal>
      )}
    </div>
  )
}
