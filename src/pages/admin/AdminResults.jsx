import { useEffect, useState } from 'react'
import { subscribe, update, remove } from '../../lib/store'
import { useToast, Modal, Header } from '../../components/UI'
import Icon from '../../components/Icons'

export default function AdminResults({ back }) {
  const toast = useToast()
  const [results, setResults] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('attendanceResults', arr => {
    arr.sort((a, b) => new Date(b.completionTime) - new Date(a.completionTime)); setResults(arr)
  }), [])

  const save = async () => {
    await update('attendanceResults', edit.id, { points: Number(edit.points) || 0 })
    toast('تم تعديل النقاط', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف نتيجة الحضور؟')) { await remove('attendanceResults', id); toast('تم الحذف', 'warn') } }

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('ar-EG') } catch { return iso } }

  return (
    <div className="page">
      <Header title="الحضور والنقاط" back={back} />
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
    </div>
  )
}
