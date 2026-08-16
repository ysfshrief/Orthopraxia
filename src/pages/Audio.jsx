import { useEffect, useState } from 'react'
import { subscribe, create, update, remove } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

const TYPES = ['صلاة', 'لحن', 'ترنيمة', 'أخرى']
const typeColor = { 'صلاة': 'var(--maroon)', 'لحن': 'var(--gold)', 'ترنيمة': 'var(--green)', 'أخرى': '#3A5A78' }

export default function Audio() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('audio', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setItems(arr)
  }), [])

  const save = async () => {
    if (!edit.name) return toast('ادخل اسم الملف', 'warn')
    const { id, ...data } = edit
    data.order = Number(data.order) || 0
    if (id) await update('audio', id, data)
    else await create('audio', data)
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف العنصر؟')) { await remove('audio', id); toast('تم الحذف', 'warn') } }

  return (
    <div className="page">
      <Header title="الصلاة والتسبحة" />
      {isAdmin && (
        <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ name: '', type: 'صلاة', url: '', order: items.length + 1 })}>
          <Icon name="plus" size={18} /> إضافة عنصر
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(a => (
          <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: typeColor[a.type] || 'var(--gold)', display: 'grid', placeItems: 'center', color: '#fff' }}>
              <Icon name={a.type === 'صلاة' ? 'pray' : 'music'} size={20} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{a.name}</div>
              <span className="subtle">{a.type}</span>
            </div>
            {a.url && <a className="btn" style={{ padding: '8px 14px' }} href={a.url} target="_blank" rel="noopener noreferrer">فتح</a>}
            {isAdmin && (
              <>
                <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setEdit(a)}><Icon name="edit" size={16} /></button>
                <button className="btn ghost" style={{ padding: '8px', color: 'var(--red)' }} onClick={() => del(a.id)}><Icon name="trash" size={16} /></button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && <div className="empty">لا توجد عناصر بعد</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل' : 'إضافة'} onClose={() => setEdit(null)}>
          <div className="field"><label>اسم الملف</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
          <div className="field"><label>النوع</label>
            <select value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>رابط Google Drive</label><input value={edit.url} onChange={e => setEdit({ ...edit, url: e.target.value })} placeholder="https://drive.google.com/..." /></div>
          <div className="field"><label>ترتيب العرض</label><input type="number" value={edit.order} onChange={e => setEdit({ ...edit, order: e.target.value })} /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
