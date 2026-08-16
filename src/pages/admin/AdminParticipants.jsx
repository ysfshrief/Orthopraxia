import { useState } from 'react'
import { useData } from '../../context/DataContext'
import { create, update, remove, uid } from '../../lib/store'
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
      await create('participants', { id, name: edit.name, teamId: edit.teamId, phone: edit.phone || '', qr: id })
      toast('تمت الإضافة', 'ok')
    }
    setEdit(null)
  }
  const del = async (id) => { if (confirm('حذف المخدوم؟')) { await remove('participants', id); toast('تم الحذف', 'warn') } }

  const teamOf = (p) => teams.find(t => t.id === p.teamId)

  const printAll = () => {
    const w = window.open('', '_blank')
    if (!w) return toast('اسمح بالنوافذ المنبثقة', 'err')
    const cards = shown.map(p => {
      const t = teamOf(p)
      return `<div class="c" style="border-color:${t?.color || '#C99A3A'}">
        <div class="h">Orthopraxia</div>
        <div class="qr" id="q_${p.id}"></div>
        <div class="n">${p.name}</div>
        <div class="t" style="background:${t?.color || '#C99A3A'}">${t?.name || ''}</div>
        <div class="id">ID: ${p.id}</div>
      </div>`
    }).join('')
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf8">
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
    <style>
      body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:12px;padding:12px;background:#fff}
      .c{width:230px;border:2px solid;border-radius:14px;padding:14px;text-align:center;page-break-inside:avoid}
      .h{font-weight:900;color:#6B2318;margin-bottom:8px}
      .qr canvas{margin:auto}
      .n{font-weight:900;font-size:16px;margin-top:8px}
      .t{color:#fff;display:inline-block;padding:3px 12px;border-radius:99px;margin-top:6px;font-size:12px}
      .id{font-size:10px;color:#999;margin-top:4px}
      @media print{.c{border-width:1px}}
    </style></head><body>${cards}
    <script>
      const data=${JSON.stringify(shown.map(p => ({ id: p.id, qr: p.qr || p.id })))};
      Promise.all(data.map(d=>QRCode.toCanvas(d.qr,{width:130,margin:1,color:{dark:'#6B2318',light:'#fff'}}).then(cv=>{document.getElementById('q_'+d.id).appendChild(cv)})))
      .then(()=>setTimeout(()=>window.print(),400));
    </script></body></html>`)
    w.document.close()
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
                  <tr><th>#</th><th>الاسم</th><th>الفريق</th><th>الهاتف</th><th style={{ textAlign: 'end' }}>إجراءات</th></tr>
                </thead>
                <tbody>
                  {shown.map((p, i) => {
                    const t = teamOf(p)
                    return (
                      <tr key={p.id}>
                        <td className="subtle">{i + 1}</td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td><span className="pill" style={{ background: (t?.color || 'var(--gold)') + '22', color: t?.color || 'var(--maroon)' }}>{t?.name || 'بدون فريق'}</span></td>
                        <td className="subtle" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{p.phone || '—'}</td>
                        <td>
                          <div className="row-actions">
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
              return (
                <div key={p.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderInlineStart: `5px solid ${t?.color || 'var(--gold)'}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800 }}>{p.name}</div>
                    <div className="subtle">{t?.name || 'بدون فريق'}</div>
                  </div>
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
