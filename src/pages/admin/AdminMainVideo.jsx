import { useEffect, useState } from 'react'
import { subscribe, create, update, remove, saveSettings, subscribeSettings } from '../../lib/store'
import { useToast, Modal, Header } from '../../components/UI'
import Icon from '../../components/Icons'

function ytId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

export default function AdminMainVideo({ back, embedded }) {
  const toast = useToast()
  const [videos, setVideos] = useState([])
  const [settings, setSettings] = useState(null)
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('mainVideos', arr => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0)); setVideos(arr)
  }), [])
  useEffect(() => subscribeSettings(setSettings), [])

  const save = async () => {
    if (!edit.url) return toast('ادخل رابط الفيديو', 'warn')
    if (!ytId(edit.url)) return toast('رابط يوتيوب غير صالح', 'warn')
    const { id, ...data } = edit
    if (id) await update('mainVideos', id, data)
    else await create('mainVideos', { ...data, order: videos.length + 1, visible: data.visible !== false })
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف الفيديو؟')) { await remove('mainVideos', id); toast('تم الحذف', 'warn') } }
  const toggleRow = async (v) => {
    await update('mainVideos', v.id, { visible: !(v.visible !== false) })
  }
  const toggleSection = async () => {
    await saveSettings({ ...settings, mainVideoVisible: !settings?.mainVideoVisible })
    toast(settings?.mainVideoVisible ? 'تم إخفاء القسم من الرئيسية' : 'تم إظهار القسم في الرئيسية', 'ok')
  }

  return (
    <div className="page">
      {!embedded && <Header title="Main Video" back={back} />}

      <div className="card" style={{ marginBottom: 14, border: '2px solid var(--maroon)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
          <input type="checkbox" checked={!!settings?.mainVideoVisible} onChange={toggleSection} style={{ width: 22, height: 22 }} />
          إظهار قسم Main Video في الصفحة الرئيسية
        </label>
        <p className="subtle" style={{ marginTop: 8 }}>عند التفعيل، يظهر أول فيديو (مفعّل) في أعلى الصفحة الرئيسية بمشغّل احترافي.</p>
      </div>

      <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ title: '', url: '', visible: true })}>
        <Icon name="plus" size={18} /> إضافة فيديو
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {videos.map(v => {
          const vis = v.visible !== false
          const id = ytId(v.url)
          return (
            <div key={v.id} className="card" style={{ opacity: vis ? 1 : 0.55, borderInlineStart: `5px solid ${vis ? 'var(--green)' : 'var(--muted)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {id && <img src={`https://img.youtube.com/vi/${id}/default.jpg`} alt="" style={{ width: 60, height: 45, borderRadius: 8, objectFit: 'cover' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{v.title || 'فيديو'}</div>
                  <div className="subtle" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{v.url}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn ghost" style={{ flex: 1 }} onClick={() => toggleRow(v)}>
                  {vis ? '🔴 إخفاء' : '🟢 إظهار'}
                </button>
                <button className="btn ghost" onClick={() => setEdit(v)}><Icon name="edit" size={16} /></button>
                <button className="btn ghost" style={{ color: 'var(--red)' }} onClick={() => del(v.id)}><Icon name="trash" size={16} /></button>
              </div>
            </div>
          )
        })}
        {videos.length === 0 && <div className="empty">لا توجد فيديوهات — اضغط إضافة</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل فيديو' : 'إضافة فيديو'} onClose={() => setEdit(null)}>
          <div className="field"><label>العنوان (اختياري)</label><input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
          <div className="field"><label>رابط YouTube</label><input value={edit.url} onChange={e => setEdit({ ...edit, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700, marginBottom: 14 }}>
            <input type="checkbox" checked={edit.visible !== false} onChange={e => setEdit({ ...edit, visible: e.target.checked })} style={{ width: 20, height: 20 }} /> ظاهر
          </label>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
