import { useEffect, useState } from 'react'
import { subscribe, create, update, remove } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

export default function Competition() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('competitions', setItems), [])

  const save = async () => {
    const { id, ...data } = edit
    if (id) await update('competitions', id, data)
    else await create('competitions', data)
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف المسابقة؟')) { await remove('competitions', id); toast('تم الحذف', 'warn') } }

  return (
    <div className="page">
      <Header title="المسابقة" />
      {isAdmin && (
        <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ title: '', description: '', formUrl: '', date: '', status: 'Active' })}>
          <Icon name="plus" size={18} /> إضافة مسابقة
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{c.title || 'مسابقة'}</div>
              <span className="pill" style={{
                background: c.status === 'Active' ? 'rgba(62,107,79,.18)' : 'rgba(178,58,47,.15)',
                color: c.status === 'Active' ? 'var(--green)' : 'var(--red)'
              }}>{c.status === 'Active' ? 'مفتوحة' : 'مغلقة'}</span>
            </div>
            {c.description && <p className="subtle" style={{ marginTop: 6 }}>{c.description}</p>}
            {c.date && <div className="subtle" style={{ marginTop: 4 }}>🗓 {c.date}</div>}
            {c.status === 'Active' && c.formUrl && (
              <a className="btn full" style={{ marginTop: 12 }} href={c.formUrl} target="_blank" rel="noopener noreferrer">
                <Icon name="quiz" size={18} /> ابدأ المسابقة
              </a>
            )}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEdit(c)}><Icon name="edit" size={16} /> تعديل</button>
                <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => del(c.id)}><Icon name="trash" size={16} /></button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="empty">لا توجد مسابقات بعد</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل مسابقة' : 'إضافة مسابقة'} onClose={() => setEdit(null)}>
          <div className="field"><label>العنوان</label><input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
          <div className="field"><label>الوصف</label><textarea rows={2} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></div>
          <div className="field"><label>رابط Google Form</label><input value={edit.formUrl} onChange={e => setEdit({ ...edit, formUrl: e.target.value })} placeholder="https://forms.gle/..." /></div>
          <div className="field"><label>الموعد (اختياري)</label><input value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} /></div>
          <div className="field"><label>الحالة</label>
            <select value={edit.status} onChange={e => setEdit({ ...edit, status: e.target.value })}>
              <option value="Active">مفتوحة</option>
              <option value="Closed">مغلقة</option>
            </select>
          </div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
