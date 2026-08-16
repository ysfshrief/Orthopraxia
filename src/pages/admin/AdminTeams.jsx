import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { upsert, create, remove } from '../../lib/store'
import { useToast, Modal, Header } from '../../components/UI'
import Icon from '../../components/Icons'

export default function AdminTeams({ back }) {
  const { teams, participants } = useData()
  const toast = useToast()
  const [edit, setEdit] = useState(null)

  const count = (tid) => participants.filter(p => p.teamId === tid).length

  const save = async () => {
    if (!edit.name) return toast('ادخل اسم الفريق', 'warn')
    const data = { name: edit.name, color: edit.color, leader: edit.leader || '', order: Number(edit.order) || 0, bonusPoints: Number(edit.bonusPoints) || 0 }
    if (edit.id) await upsert('teams', edit.id, data)
    else await create('teams', data)
    toast('تم الحفظ', 'ok'); setEdit(null)
  }
  const del = async (id) => {
    if (count(id) > 0) return toast('لا يمكن حذف فريق به أعضاء', 'err')
    if (confirm('حذف الفريق؟')) { await remove('teams', id); toast('تم الحذف', 'warn') }
  }

  return (
    <div className="page">
      <Header title="الفرق" back={back} />
      <button className="btn gold full" style={{ marginBottom: 14 }} onClick={() => setEdit({ name: '', color: '#8B2E1E', leader: '', order: teams.length + 1, bonusPoints: 0 })}>
        <Icon name="plus" size={18} /> إضافة فريق
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {teams.sort((a, b) => a.order - b.order).map(t => (
          <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, borderInlineStart: `6px solid ${t.color}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{t.name}</div>
              <div className="subtle">{count(t.id)} عضو{t.leader ? ` • قائد: ${t.leader}` : ''}{t.bonusPoints ? ` • نقاط إضافية: ${t.bonusPoints}` : ''}</div>
            </div>
            <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setEdit(t)}><Icon name="edit" size={16} /></button>
            <button className="btn ghost" style={{ padding: '8px', color: 'var(--red)' }} onClick={() => del(t.id)}><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل فريق' : 'إضافة فريق'} onClose={() => setEdit(null)}>
          <div className="field"><label>اسم الفريق</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
          <div className="field"><label>قائد الفريق (اختياري)</label><input value={edit.leader} onChange={e => setEdit({ ...edit, leader: e.target.value })} /></div>
          <div className="grid2">
            <div className="field"><label>اللون</label><input type="color" value={edit.color} onChange={e => setEdit({ ...edit, color: e.target.value })} style={{ height: 44, padding: 4 }} /></div>
            <div className="field"><label>الترتيب</label><input type="number" value={edit.order} onChange={e => setEdit({ ...edit, order: e.target.value })} /></div>
          </div>
          <div className="field"><label>نقاط إضافية (يدوية)</label><input type="number" value={edit.bonusPoints} onChange={e => setEdit({ ...edit, bonusPoints: e.target.value })} /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}
    </div>
  )
}
