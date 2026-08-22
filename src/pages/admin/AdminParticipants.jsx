import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { create, update, remove, uid } from '../../lib/store'
import { printCards } from '../../lib/printCards'
import { useToast, Modal, Header } from '../../components/UI'
import QrCard from '../../components/QrCard'
import Icon from '../../components/Icons'

export default function AdminParticipants({ back, embedded }) {
  const { teams, participants } = useData()
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [card, setCard] = useState(null)
  const [filter, setFilter] = useState('')
  const [bulk, setBulk] = useState(false)
  const [search, setSearch] = useState('')

  const shown = participants
    .filter(p => !filter || p.teamId === filter)
    .filter(p => !search || (p.name || '').includes(search))

  const save = async () => {
    if (!edit.name) return toast('ادخل الاسم', 'warn')
    if (!edit.teamId) return toast('اختر الفريق', 'warn')
    if (edit.id) { await update('participants', edit.id, { name: edit.name, teamId: edit.teamId, phone: edit.phone || '' }); toast('تم الحفظ', 'ok') }
    else {
      const id = uid()
      await create('participants', { id, name: edit.name, teamId: edit.teamId, phone: edit.phone || '', qr: id, active: true })
      toast('تمت الإضافة', 'ok')
    }
    setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف المخدوم؟')) { await remove('participants', id); toast('تم الحذف', 'warn') } }
  const toggleActive = async (p) => {
    await update('participants', p.id, { active: !(p.active !== false) })
    toast(p.active !== false ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب', 'ok')
  }

  const teamOf = (p) => teams.find(t => t.id === p.teamId)

  const printAll = async () => {
    if (shown.length === 0) return
    toast('جارٍ تجهيز الكارنيهات...', 'ok', 1500)
    const items = shown.map(p => {
      const t = teamOf(p)
      return {
        qrValue: p.qr || p.id,
        name: p.name,
        subtitle: t?.name || '',
        subColor: t?.color || '#C99A3A',
        idLabel: `ID: ${p.id}`
      }
    })
    const ok = await printCards(items)
    if (!ok) toast('اسمح بالنوافذ المنبثقة (Popups)', 'err')
  }

  return (
    <div className="page">
      {!embedded && <Header title="المخدومين والكارنيهات" back={back} />}

      {embedded ? (
        <>
          <div className="adm-toolbar">
            <input className="grow" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">كل الفرق</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="subtle" style={{ marginInlineEnd: 'auto' }}>{shown.length} مخدوم</div>
            <button className="btn" onClick={printAll} disabled={shown.length === 0}><Icon name="card" size={16} /> طباعة الكارنيهات</button>
            <button className="btn gold" onClick={() => setEdit({ name: '', teamId: teams[0]?.id || '', phone: '' })}><Icon name="plus" size={16} /> إضافة مخدوم</button>
          </div>

          <div className="adm-panel">
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>الفريق</th><th>الحالة</th><th style={{ textAlign: 'end' }}>إجراءات</th></tr>
                </thead>
                <tbody>
                  {shown.map((p, i) => {
                    const t = teamOf(p)
                    const active = p.active !== false
                    return (
                      <tr key={p.id} style={{ opacity: active ? 1 : 0.5 }}>
                        <td className="subtle">{i + 1}</td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td><span className="pill" style={{ background: (t?.color || 'var(--gold)') + '22', color: t?.color || 'var(--maroon)' }}>{t?.name || 'بدون فريق'}</span></td>
                        <td><span className="pill" style={{ background: active ? 'rgba(62,107,79,.15)' : 'rgba(178,58,47,.15)', color: active ? 'var(--green)' : 'var(--red)' }}>{active ? 'مفعّل' : 'معطّل'}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => toggleActive(p)} title={active ? 'تعطيل' : 'تفعيل'}>{active ? '🔴' : '🟢'}</button>
                            <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setCard(p)} title="الكارنيه"><Icon name="card" size={16} /></button>
                            <button className="btn ghost" style={{ padding: '6px 8px' }} onClick={() => setEdit(p)} title="تعديل"><Icon name="edit" size={16} /></button>
                            <button className="btn ghost" style={{ padding: '6px 8px', color: 'var(--red)' }} onClick={() => del(p.id)} title="حذف"><Icon name="trash" size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {shown.length === 0 && <tr><td colSpan={5}><div className="empty">لا يوجد مخدومين — اضغط إضافة</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn gold" style={{ flex: 1 }} onClick={() => setEdit({ name: '', teamId: teams[0]?.id || '', phone: '' })}>
              <Icon name="plus" size={18} /> إضافة
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={printAll} disabled={shown.length === 0}>
              <Icon name="card" size={18} /> طباعة الكارنيهات
            </button>
          </div>

          <div className="field"><input placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
            <button className="pill" onClick={() => setFilter('')} style={pillStyle(!filter)}>الكل</button>
            {teams.map(t => <button key={t.id} className="pill" onClick={() => setFilter(t.id)} style={pillStyle(filter === t.id, t.color)}>{t.name}</button>)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map(p => {
              const t = teamOf(p)
              const active = p.active !== false
              return (
                <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, opacity: active ? 1 : 0.55, borderInlineStart: `5px solid ${t?.color || 'var(--gold)'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div className="subtle">{t?.name || 'بدون فريق'} • {active ? 'مفعّل' : 'معطّل'}</div>
                  </div>
                  <button className="btn ghost" style={{ padding: '8px' }} onClick={() => toggleActive(p)} title={active ? 'تعطيل' : 'تفعيل'}>{active ? '🔴' : '🟢'}</button>
                  <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setCard(p)}><Icon name="card" size={16} /></button>
                  <button className="btn ghost" style={{ padding: '8px' }} onClick={() => setEdit(p)}><Icon name="edit" size={16} /></button>
                  <button className="btn ghost" style={{ padding: '8px', color: 'var(--red)' }} onClick={() => del(p.id)}><Icon name="trash" size={16} /></button>
                </div>
              )
            })}
            {shown.length === 0 && <div className="empty">لا يوجد مخدومين — اضغط إضافة</div>}
          </div>
        </>
      )}

      {edit && (
        <Modal title={edit.id ? 'تعديل مخدوم' : 'إضافة مخدوم'} onClose={() => setEdit(null)}>
          <div className="field"><label>الاسم</label><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} autoFocus /></div>
          <div className="field"><label>الفريق</label>
            <select value={edit.teamId} onChange={e => setEdit({ ...edit, teamId: e.target.value })}>
              <option value="">— اختر —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field"><label>الهاتف (اختياري)</label><input value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} inputMode="tel" /></div>
          <button className="btn full" onClick={save}>حفظ</button>
        </Modal>
      )}

      {card && (
        <Modal title="كارنيه المخدوم" onClose={() => setCard(null)}>
          <div className="center-col">
            <QrCard participant={card} team={teamOf(card)} retreatName="Orthopraxia" />
            <button className="btn full" style={{ marginTop: 16 }} onClick={async () => {
              const t = teamOf(card)
              await printCards([{ qrValue: card.qr || card.id, name: card.name, subtitle: t?.name || '', subColor: t?.color || '#C99A3A', idLabel: `ID: ${card.id}` }])
            }}>
              <Icon name="card" size={18} /> طباعة الكارنيه
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function pillStyle(active, color) {
  return {
    whiteSpace: 'nowrap', padding: '8px 14px', border: 'none',
    background: active ? (color || 'var(--maroon)') : '#fffdf8',
    color: active ? '#fff' : 'var(--maroon)', boxShadow: 'var(--shadow)', fontSize: 13
  }
}
