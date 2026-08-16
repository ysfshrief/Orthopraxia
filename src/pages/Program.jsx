import { useEffect, useState, useMemo } from 'react'
import { subscribe, update, create, remove } from '../lib/store'
import { useAuth } from '../context/AuthContext'
import { useToast, Modal, Header } from '../components/UI'
import Icon from '../components/Icons'

export default function Program() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [activeDay, setActiveDay] = useState(null)
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('program', (arr) => {
    arr.sort((a, b) => (a.order || 0) - (b.order || 0))
    setItems(arr)
  }), [])

  const days = useMemo(() => [...new Set(items.map(i => i.day))], [items])
  useEffect(() => { if (days.length && !activeDay) setActiveDay(days[0]) }, [days, activeDay])

  const dayItems = items.filter(i => i.day === activeDay)

  const save = async () => {
    const { id, ...data } = edit
    if (id) { await update('program', id, data); toast('تم الحفظ', 'ok') }
    else {
      const maxOrder = Math.max(0, ...items.map(i => i.order || 0))
      await create('program', { ...data, order: maxOrder + 1 })
      toast('تمت الإضافة', 'ok')
    }
    setEdit(null)
  }

  const del = async (id) => {
    if (!confirm('حذف هذه الفقرة؟')) return
    await remove('program', id); toast('تم الحذف', 'warn')
  }

  return (
    <div className="page">
      <Header title="برنامج الخلوة" />

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
        {days.map(d => (
          <button key={d} onClick={() => setActiveDay(d)}
            className="pill"
            style={{
              whiteSpace: 'nowrap', padding: '9px 14px', border: 'none',
              background: d === activeDay ? 'var(--maroon)' : '#fffdf8',
              color: d === activeDay ? '#fff' : 'var(--maroon)',
              boxShadow: 'var(--shadow)', fontSize: 13
            }}>
            {d}
          </button>
        ))}
      </div>

      {isAdmin && (
        <button className="btn gold full" style={{ marginBottom: 14 }}
          onClick={() => setEdit({ day: activeDay, time: '', title: '', place: '' })}>
          <Icon name="plus" size={18} /> إضافة فقرة
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {dayItems.map(it => (
          <div key={it.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'stretch', padding: 14 }}>
            <div style={{
              minWidth: 92, borderInlineEnd: '2px solid rgba(201,154,58,.35)', paddingInlineEnd: 12,
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <span style={{ fontWeight: 800, color: 'var(--maroon)', fontSize: 13, lineHeight: 1.5 }}>
                {it.time || <span className="subtle">—</span>}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{it.title || <span className="subtle">(بدون عنوان)</span>}</div>
              {it.place
                ? <div className="subtle" style={{ marginTop: 3 }}>📍 {it.place}</div>
                : isAdmin && <div className="subtle" style={{ marginTop: 3, fontStyle: 'italic' }}>المكان فارغ — اضغط تعديل</div>}
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setEdit(it)}><Icon name="edit" size={16} /></button>
                <button className="btn ghost" style={{ padding: '6px 8px', color: 'var(--red)' }} onClick={() => del(it.id)}><Icon name="trash" size={16} /></button>
              </div>
            )}
          </div>
        ))}
        {dayItems.length === 0 && <div className="empty">لا توجد فقرات في هذا اليوم</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل فقرة' : 'إضافة فقرة'} onClose={() => setEdit(null)}>
          <div className="field"><label>اليوم</label>
            <input value={edit.day || ''} onChange={e => setEdit({ ...edit, day: e.target.value })} /></div>
          <div className="field"><label>الوقت</label>
            <input value={edit.time || ''} onChange={e => setEdit({ ...edit, time: e.target.value })} placeholder="مثال: 2:00 م - 3:00 م" /></div>
          <div className="field"><label>اسم الفقرة</label>
            <input value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} /></div>
          <div className="field"><label>المكان (اختياري)</label>
            <input value={edit.place || ''} onChange={e => setEdit({ ...edit, place: e.target.value })} /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
