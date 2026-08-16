import { useEffect, useState } from 'react'
import { subscribe, create, remove } from '../../lib/store'
import { useData } from '../../context/DataContext'
import { useToast, Modal, Header } from '../../components/UI'
import Icon from '../../components/Icons'

/*
  Notifications are stored in Firestore. Architecture is FCM-ready:
  a Cloud Function can listen to the `notifications` collection and push via
  Firebase Cloud Messaging to the matching audience (all / team / urgent).
  See FIREBASE_SETUP.md for the wiring steps.
*/
export default function AdminNotifications({ back, embedded }) {
  const { teams } = useData()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [edit, setEdit] = useState(null)

  useEffect(() => subscribe('notifications', arr => {
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); setItems(arr)
  }), [])

  const send = async () => {
    if (!edit.title) return toast('ادخل عنوان الإشعار', 'warn')
    await create('notifications', {
      title: edit.title, body: edit.body || '',
      audience: edit.audience, teamId: edit.audience === 'team' ? edit.teamId : '',
      urgent: !!edit.urgent, createdAt: Date.now()
    })
    toast('تم إنشاء الإشعار', 'ok'); setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف الإشعار؟')) { await remove('notifications', id); toast('تم الحذف', 'warn') } }

  const audLabel = (n) => n.audience === 'all' ? 'للجميع' : n.audience === 'team' ? (teams.find(t => t.id === n.teamId)?.name || 'فريق') : 'فقرة'

  return (
    <div className="page">
      {!embedded && <Header title="الإشعارات" back={back} />}
      <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ title: '', body: '', audience: 'all', teamId: teams[0]?.id || '', urgent: false })}>
        <Icon name="plus" size={18} /> إشعار جديد
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(n => (
          <div key={n.id} className="card" style={{ borderInlineStart: `5px solid ${n.urgent ? 'var(--red)' : 'var(--gold)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800 }}>{n.title}</div>
              <span className="pill" style={{ background: 'rgba(107,35,24,.1)', color: 'var(--maroon)' }}>{audLabel(n)}{n.urgent ? ' • عاجل' : ''}</span>
            </div>
            {n.body && <p className="subtle" style={{ marginTop: 6 }}>{n.body}</p>}
            <button className="btn ghost" style={{ marginTop: 8, color: 'var(--red)', padding: '6px 12px' }} onClick={() => del(n.id)}><Icon name="trash" size={14} /> حذف</button>
          </div>
        ))}
        {items.length === 0 && <div className="empty">لا توجد إشعارات بعد</div>}
      </div>

      {edit && (
        <Modal title="إشعار جديد" onClose={() => setEdit(null)}>
          <div className="field"><label>العنوان</label><input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} autoFocus /></div>
          <div className="field"><label>النص</label><textarea rows={2} value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} /></div>
          <div className="field"><label>الجمهور</label>
            <select value={edit.audience} onChange={e => setEdit({ ...edit, audience: e.target.value })}>
              <option value="all">كل المشاركين</option>
              <option value="team">فريق معين</option>
            </select>
          </div>
          {edit.audience === 'team' && (
            <div className="field"><label>الفريق</label>
              <select value={edit.teamId} onChange={e => setEdit({ ...edit, teamId: e.target.value })}>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700, marginBottom: 14 }}>
            <input type="checkbox" checked={edit.urgent} onChange={e => setEdit({ ...edit, urgent: e.target.checked })} style={{ width: 20, height: 20 }} /> إشعار عاجل
          </label>
          <button className="btn full" onClick={send}>إنشاء الإشعار</button>
        </Modal>
      )}
    </div>
  )
}
