import { useEffect, useState, useMemo } from 'react'
import { subscribe, create, update, remove } from '../../lib/store'
import { useToast, Modal } from '../../components/UI'
import { isDriveLink, drivePreviewUrl } from '../../lib/drive'
import Icon from '../../components/Icons'

/*
  Admin management for the "الصلاة والترانيم" PDF library.
  Same data (`audio` collection) the public page reads, but here in a
  desktop-friendly admin layout with both categories side by side.
*/
const CATS = [
  { key: 'prayer', label: 'الصلاة', icon: '🙏', color: 'var(--maroon)' },
  { key: 'hymn', label: 'الترانيم', icon: '🎵', color: 'var(--gold)' },
]

export default function AdminLibrary() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('audio', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setItems(arr)
  }), [])

  const byCat = useMemo(() => {
    const m = { prayer: [], hymn: [] }
    for (const it of items) (m[it.category || 'prayer'] ||= []).push(it)
    return m
  }, [items])

  const save = async () => {
    if (!edit.name) return toast('ادخل العنوان', 'warn')
    if (!edit.url || !isDriveLink(edit.url)) return toast('ادخل رابط Google Drive صحيح', 'warn')
    const { id, ...data } = edit
    data.order = Number(data.order) || 0
    if (id) await update('audio', id, data)
    else await create('audio', data)
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف الملف؟')) { await remove('audio', id); toast('تم الحذف', 'warn') } }
  const move = async (list, item, dir) => {
    const idx = list.findIndex(x => x.id === item.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= list.length) return
    const a = list[idx], b = list[swapIdx]
    await update('audio', a.id, { order: b.order || 0 })
    await update('audio', b.id, { order: a.order || 0 })
  }

  return (
    <div>
      <div className="lib-admin-grid">
        {CATS.map(c => {
          const list = byCat[c.key] || []
          return (
            <div key={c.key} className="card lib-admin-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: c.color }}>{c.icon} {c.label} <span className="subtle" style={{ fontSize: 13 }}>({list.length})</span></h3>
                <button className="btn gold" style={{ padding: '6px 12px' }}
                  onClick={() => setEdit({ name: '', url: '', category: c.key, order: (list[list.length - 1]?.order || 0) + 1 })}>
                  <Icon name="plus" size={16} /> إضافة
                </button>
              </div>

              {list.length === 0 ? (
                <div className="empty" style={{ padding: 20 }}>لا توجد ملفات</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {list.map((it, i) => (
                    <div key={it.id} className="lib-admin-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="subtle" style={{ fontSize: 11, textDecoration: 'underline' }}>
                          {drivePreviewUrl(it.url) ? 'رابط صالح ✓' : 'رابط غير صالح ⚠'}
                        </a>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button className="btn ghost" style={{ padding: 6 }} onClick={() => move(list, it, -1)} disabled={i === 0}>▲</button>
                        <button className="btn ghost" style={{ padding: 6 }} onClick={() => move(list, it, 1)} disabled={i === list.length - 1}>▼</button>
                        <button className="btn ghost" style={{ padding: 6 }} onClick={() => setEdit(it)}><Icon name="edit" size={15} /></button>
                        <button className="btn ghost" style={{ padding: 6, color: 'var(--red)' }} onClick={() => del(it.id)}><Icon name="trash" size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل ملف' : 'إضافة ملف'} onClose={() => setEdit(null)}>
          <div className="field"><label>العنوان</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} autoFocus placeholder="مثال: صلاة باكر" /></div>
          <div className="field"><label>القسم</label>
            <select value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })}>
              {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="field"><label>رابط Google Drive (PDF)</label>
            <input value={edit.url} onChange={e => setEdit({ ...edit, url: e.target.value })} placeholder="https://drive.google.com/file/d/.../view" />
          </div>
          <p className="subtle" style={{ fontSize: 12, marginBottom: 12 }}>تأكد أن مشاركة الملف "أي شخص لديه الرابط".</p>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
