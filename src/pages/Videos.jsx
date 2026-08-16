import { useEffect, useState } from 'react'
import { subscribe, create, update, remove } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

function ytId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function Videos() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [videos, setVideos] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('videos', setVideos), [])

  const save = async () => {
    if (!edit.url) return toast('ادخل رابط الفيديو', 'warn')
    const { id, ...data } = edit
    if (id) await update('videos', id, data)
    else await create('videos', data)
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف الفيديو؟')) { await remove('videos', id); toast('تم الحذف', 'warn') } }

  return (
    <div className="page">
      <Header title="الفيديوهات" />
      {isAdmin && (
        <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ title: '', url: '', description: '', programItem: '' })}>
          <Icon name="plus" size={18} /> إضافة فيديو
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {videos.map(v => {
          const id = ytId(v.url)
          return (
            <div key={v.id} className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{v.title || 'فيديو'}</div>
              {id ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 12, overflow: 'hidden' }}>
                  <iframe loading="lazy" src={`https://www.youtube.com/embed/${id}`} title={v.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : <div className="subtle">رابط غير صالح</div>}
              {v.description && <p className="subtle" style={{ marginTop: 8 }}>{v.description}</p>}
              {v.programItem && <span className="pill" style={{ background: 'rgba(201,154,58,.2)', color: 'var(--maroon)', marginTop: 6 }}>{v.programItem}</span>}
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn ghost" style={{ flex: 1 }} onClick={() => setEdit(v)}><Icon name="edit" size={16} /> تعديل</button>
                  <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => del(v.id)}><Icon name="trash" size={16} /></button>
                </div>
              )}
            </div>
          )
        })}
        {videos.length === 0 && <div className="empty">لا توجد فيديوهات بعد</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل فيديو' : 'إضافة فيديو'} onClose={() => setEdit(null)}>
          <div className="field"><label>العنوان</label><input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
          <div className="field"><label>رابط YouTube</label><input value={edit.url} onChange={e => setEdit({ ...edit, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
          <div className="field"><label>الوصف (اختياري)</label><textarea rows={2} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></div>
          <div className="field"><label>الفقرة المرتبطة (اختياري)</label><input value={edit.programItem} onChange={e => setEdit({ ...edit, programItem: e.target.value })} /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
