import { useEffect, useState } from 'react'
import { subscribe, create, update, remove, uid } from '../../lib/store'
import { printCards } from '../../lib/printCards'
import { useToast, Modal, Header } from '../../components/UI'
import QrCard from '../../components/QrCard'
import Icon from '../../components/Icons'

export default function AdminJudges({ back, embedded }) {
  const toast = useToast()
  const [judges, setJudges] = useState([])
  const [edit, setEdit] = useState(null)
  const [card, setCard] = useState(null)

  useEffect(() => subscribe('judges', setJudges), [])

  const save = async () => {
    if (!edit.name) return toast('ادخل الاسم', 'warn')
    if (edit.id) {
      await update('judges', edit.id, { name: edit.name, active: edit.active !== false })
      toast('تم الحفظ', 'ok')
    } else {
      const id = uid()
      // QR value = the judge id itself (like participants)
      await create('judges', { id, name: edit.name, qr: id, active: true })
      toast('تمت إضافة الحكم', 'ok')
    }
    setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف الحكم؟')) { await remove('judges', id); toast('تم الحذف', 'warn') } }
  const toggle = async (j) => {
    await update('judges', j.id, { active: !(j.active !== false) })
    toast(j.active !== false ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب', 'ok')
  }

  const printOne = async (j) => {
    const ok = await printCards([{ qrValue: j.qr || j.id, name: j.name, roleLabel: 'حكم' }])
    if (!ok) toast('اسمح بالنوافذ المنبثقة', 'err')
  }
  const printAll = async () => {
    if (judges.length === 0) return
    toast('جارٍ تجهيز الكارنيهات...', 'ok', 1500)
    const items = judges.map(j => ({ qrValue: j.qr || j.id, name: j.name, roleLabel: 'حكم' }))
    const ok = await printCards(items)
    if (!ok) toast('اسمح بالنوافذ المنبثقة', 'err')
  }

  return (
    <div className="page">
      {!embedded && <Header title="الحكام" back={back} />}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn gold" style={{ flex: 1 }} onClick={() => setEdit({ name: '', active: true })}>
          <Icon name="plus" size={18} /> إضافة حكم
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={printAll} disabled={judges.length === 0}>
          <Icon name="card" size={18} /> طباعة كل الكارنيهات
        </button>
      </div>
      <p className="subtle" style={{ marginBottom: 14 }}>الحكم يدخل بتصوير الكارنيه (QR) فقط — لا يوجد كود يدوي.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {judges.map(j => {
          const active = j.active !== false
          return (
            <div key={j.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: active ? 1 : 0.55, borderInlineStart: `5px solid ${active ? 'var(--green)' : 'var(--muted)'}` }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--maroon)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>⚖️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{j.name}</div>
                <div className="subtle">{active ? 'مفعّل' : 'معطّل'}</div>
              </div>
              <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setCard(j)} title="الكارنيه"><Icon name="card" size={16} /></button>
              <button className="btn ghost" style={{ padding: '8px' }} onClick={() => toggle(j)} title={active ? 'تعطيل' : 'تفعيل'}>
                {active ? '🔴' : '🟢'}
              </button>
              <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setEdit(j)}><Icon name="edit" size={16} /></button>
              <button className="btn ghost" style={{ padding: '8px', color: 'var(--red)' }} onClick={() => del(j.id)}><Icon name="trash" size={16} /></button>
            </div>
          )
        })}
        {judges.length === 0 && <div className="empty">لا يوجد حكام — اضغط إضافة</div>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'تعديل حكم' : 'إضافة حكم'} onClose={() => setEdit(null)}>
          <div className="field"><label>الاسم</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} autoFocus /></div>
          {edit.id && (
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 700, marginBottom: 14 }}>
              <input type="checkbox" checked={edit.active !== false} onChange={e => setEdit({ ...edit, active: e.target.checked })} style={{ width: 20, height: 20 }} /> الحساب مفعّل
            </label>
          )}
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}

      {card && (
        <Modal title="كارنيه الحكم" onClose={() => setCard(null)}>
          <div className="center-col">
            <QrCard participant={{ id: card.id, name: card.name, qr: card.qr || card.id }} roleLabel="حكم" retreatName="Orthopraxia" />
            <button className="btn full" style={{ marginTop: 16 }} onClick={() => printOne(card)}>
              <Icon name="card" size={18} /> طباعة الكارنيه
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
