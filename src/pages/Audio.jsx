import { useEffect, useState, useMemo } from 'react'
import { subscribe, create, update, remove } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal, Header } from '../components/UI'
import { drivePreviewUrl, driveOpenUrl, isDriveLink } from '../lib/drive'
import Icon from '../components/Icons'

const CATS = [
  { key: 'prayer', label: 'الصلاة', icon: '🙏', color: 'var(--maroon)' },
  { key: 'hymn', label: 'الترانيم', icon: '🎵', color: 'var(--gold)' },
]

export default function Audio() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [cat, setCat] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('audio', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setItems(arr)
  }), [])

  const catItems = useMemo(() => cat ? items.filter(i => (i.category || 'prayer') === cat) : [], [items, cat])

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
  const move = async (item, dir) => {
    const list = catItems
    const idx = list.findIndex(x => x.id === item.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= list.length) return
    const a = list[idx], b = list[swapIdx]
    await update('audio', a.id, { order: b.order || 0 })
    await update('audio', b.id, { order: a.order || 0 })
  }

  if (viewer) {
    const preview = drivePreviewUrl(viewer.url)
    return (
      <div className="page pdf-viewer-page">
        <div className="pdf-viewer-bar">
          <button className="btn ghost" style={{ padding: '8px 12px' }} onClick={() => setViewer(null)}>
            <Icon name="back" size={18} /> رجوع
          </button>
          <div className="pdf-viewer-title">{viewer.name}</div>
          <a className="btn ghost" style={{ padding: '8px 12px' }} href={driveOpenUrl(viewer.url)} target="_blank" rel="noopener noreferrer">
            فتح ↗
          </a>
        </div>
        {preview ? (
          <div className="pdf-frame-wrap">
            <iframe src={preview} title={viewer.name} className="pdf-frame" allow="autoplay" />
          </div>
        ) : (
          <div className="empty">تعذّر عرض الملف — تأكد من رابط Drive</div>
        )}
        <p className="subtle" style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
          لو الملف مش ظاهر، اضغط "فتح" لعرضه في Google Drive
        </p>
      </div>
    )
  }

  if (!cat) {
    return (
      <div className="page">
        <Header title="الصلاة والترانيم" />
        <div className="lib-cats">
          {CATS.map(c => {
            const count = items.filter(i => (i.category || 'prayer') === c.key).length
            return (
              <button key={c.key} className="lib-cat" style={{ borderColor: c.color }} onClick={() => setCat(c.key)}>
                <div className="lib-cat-icon" style={{ background: c.color }}>{c.icon}</div>
                <div className="lib-cat-label">{c.label}</div>
                <div className="lib-cat-count">{count} ملف</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const catMeta = CATS.find(c => c.key === cat)
  return (
    <div className="page">
      <div className="pdf-viewer-bar" style={{ marginBottom: 14 }}>
        <button className="btn ghost" style={{ padding: '8px 12px' }} onClick={() => setCat(null)}>
          <Icon name="back" size={18} /> الأقسام
        </button>
        <div className="pdf-viewer-title">{catMeta.icon} {catMeta.label}</div>
        <span style={{ width: 40 }} />
      </div>

      {isAdmin && (
        <button className="btn gold full" style={{ marginBottom: 14 }}
          onClick={() => setEdit({ name: '', url: '', category: cat, order: (catItems[catItems.length - 1]?.order || 0) + 1 })}>
          <Icon name="plus" size={18} /> إضافة ملف
        </button>
      )}

      {catItems.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 46 }}>{catMeta.icon}</div>
          <p style={{ fontWeight: 700, marginTop: 8 }}>لا توجد ملفات بعد</p>
          {isAdmin && <p className="subtle">اضغط "إضافة ملف" لبدء المكتبة</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catItems.map((it, i) => (
            <div key={it.id} className="lib-item">
              <button className="lib-item-main" onClick={() => setViewer(it)}>
                <div className="lib-item-icon" style={{ background: catMeta.color }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lib-item-name">{it.name}</div>
                  <div className="subtle" style={{ fontSize: 12 }}>اضغط للعرض داخل التطبيق</div>
                </div>
                <span style={{ fontSize: 18, color: 'var(--muted)' }}>‹</span>
              </button>
              {isAdmin && (
                <div className="lib-item-actions">
                  <button className="btn ghost" style={{ padding: 6 }} onClick={() => move(it, -1)} disabled={i === 0}>▲</button>
                  <button className="btn ghost" style={{ padding: 6 }} onClick={() => move(it, 1)} disabled={i === catItems.length - 1}>▼</button>
                  <button className="btn ghost" style={{ padding: 6 }} onClick={() => setEdit(it)}><Icon name="edit" size={15} /></button>
                  <button className="btn ghost" style={{ padding: 6, color: 'var(--red)' }} onClick={() => del(it.id)}><Icon name="trash" size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
          <p className="subtle" style={{ fontSize: 12, marginBottom: 12 }}>تأكد أن مشاركة الملف "أي شخص لديه الرابط" حتى يظهر داخل التطبيق.</p>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
