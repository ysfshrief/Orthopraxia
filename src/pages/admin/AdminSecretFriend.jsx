import { useEffect, useState, useMemo } from 'react'
import { subscribe, create, remove, listAll, saveSettings, subscribeSettings } from '../../lib/store'
import { useData } from '../../context/DataContext'
import { useToast, Modal, Header } from '../../components/UI'
import { generateAssignments, validateAssignments, SF_STATUS } from '../../lib/secretFriend'
import Icon from '../../components/Icons'

const STAGES = [
  { key: 'none', icon: '👥', label: 'المشاركون' },
  { key: 'draft', icon: '🎲', label: 'التوزيع' },
  { key: 'approved', icon: '🔒', label: 'الاعتماد' },
  { key: 'revealed', icon: '🎁', label: 'بدء اللعبة' },
  { key: 'final', icon: '🎉', label: 'الكشف' },
]

export default function AdminSecretFriend({ back, embedded }) {
  const { participants } = useData()
  const toast = useToast()
  const [settings, setSettings] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(null) // {title, msg, action}

  useEffect(() => subscribeSettings(setSettings), [])
  useEffect(() => subscribe('secretFriend', setAssignments), [])

  const status = settings?.secretFriend?.status || 'none'
  const instructions = settings?.secretFriend?.instructions || ''

  // preselect existing participants in assignments when loaded
  useEffect(() => {
    if (assignments.length && selected.size === 0 && status !== 'none') {
      setSelected(new Set(assignments.map(a => a.giverId)))
    }
  }, [assignments, status])

  const activeParticipants = participants.filter(p => p.active !== false)
  const shown = activeParticipants.filter(p => !search || (p.name || '').includes(search))

  const setStatus = async (newStatus, extra = {}) => {
    await saveSettings({ ...settings, secretFriend: { ...settings.secretFriend, status: newStatus, ...extra } })
  }

  const clearAssignments = async () => {
    const all = await listAll('secretFriend')
    await Promise.all(all.map(a => remove('secretFriend', a.id)))
  }

  const toggle = (id) => {
    if (status !== 'none' && status !== 'draft') return
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }
  const selectAll = () => setSelected(new Set(activeParticipants.map(p => p.id)))
  const clearSel = () => setSelected(new Set())

  // ----- Actions -----
  const distribute = async () => {
    const chosen = activeParticipants.filter(p => selected.has(p.id))
    if (chosen.length < 2) return toast('اختر مشاركَين على الأقل', 'warn')
    setBusy(true)
    try {
      const asg = generateAssignments(chosen)
      const check = validateAssignments(asg, chosen.map(p => p.id))
      if (!check.ok) { toast('فشل التوزيع: ' + check.error, 'err'); setBusy(false); return }
      await clearAssignments()
      // save each assignment
      for (const a of asg) await create('secretFriend', a)
      await setStatus(SF_STATUS.DRAFT)
      toast('تم إنشاء توزيعة جديدة (مسودة)', 'ok')
    } catch (e) { toast(e.message, 'err') }
    setBusy(false)
  }

  const approve = () => setConfirm({
    title: 'اعتماد التوزيعة',
    msg: 'بعد الاعتماد لا يمكن إعادة التوزيع. متأكد؟',
    action: async () => { await setStatus(SF_STATUS.APPROVED); toast('تم اعتماد التوزيعة 🔒', 'ok') }
  })

  const reveal = () => setConfirm({
    title: 'بدء اللعبة (إظهار المرسل إليه)',
    msg: 'سيرى كل مخدوم الشخص المطلوب منه تجهيز هدية له. متأكد؟',
    action: async () => { await setStatus(SF_STATUS.REVEALED); toast('بدأت اللعبة 🎁', 'ok') }
  })

  const finalReveal = () => setConfirm({
    title: 'الكشف النهائي',
    msg: 'سيرى الجميع صديقهم الخفي. لا يمكن التراجع. متأكد؟',
    action: async () => { await setStatus(SF_STATUS.FINAL); toast('تم الكشف النهائي 🎉', 'ok') }
  })

  const resetGame = () => setConfirm({
    title: 'إعادة ضبط اللعبة',
    msg: 'سيتم حذف التوزيعة بالكامل والبدء من جديد. متأكد؟',
    action: async () => {
      await clearAssignments()
      await setStatus(SF_STATUS.NONE)
      setSelected(new Set())
      toast('تمت إعادة الضبط', 'warn')
    }
  })

  const saveInstructions = async () => { await setStatus(status, { instructions }); toast('تم حفظ التعليمات', 'ok') }

  // full table with secret friend (admin only)
  const table = useMemo(() => {
    return assignments.map(a => {
      const secretFriend = assignments.find(x => x.receiverId === a.giverId)
      return {
        person: a.giverName,
        giveTo: a.receiverName,
        secretFriend: secretFriend ? secretFriend.giverName : '—'
      }
    })
  }, [assignments])

  const [tableSearch, setTableSearch] = useState('')
  const tableShown = table.filter(r => !tableSearch || r.person.includes(tableSearch))

  if (!settings) return <div className="page"><Header title="الصديق الخفي" back={back} /><div className="empty"><div className="spinner" /></div></div>

  const stageIdx = STAGES.findIndex(s => s.key === status)

  return (
    <div className="page">
      {!embedded && <Header title="🕵️ الصديق الخفي" back={back} />}

      {/* Timeline */}
      <div className="sf-timeline">
        {STAGES.map((s, i) => (
          <div key={s.key} className={`sf-stage ${i <= stageIdx ? 'done' : ''} ${i === stageIdx ? 'current' : ''}`}>
            <div className="sf-stage-icon">{s.icon}</div>
            <div className="sf-stage-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ===== STAGE: participant selection (none/draft) ===== */}
      {(status === 'none' || status === 'draft') && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 className="section-title" style={{ margin: 0 }}>👥 المشاركون ({selected.size})</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={selectAll}>الكل</button>
              <button className="btn ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={clearSel}>مسح</button>
            </div>
          </div>
          <div className="field"><input placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {shown.map(p => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: selected.has(p.id) ? 'rgba(201,154,58,.15)' : '#fffdf8', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} style={{ width: 18, height: 18 }} />
                <span style={{ fontWeight: 700 }}>{p.name}</span>
              </label>
            ))}
            {shown.length === 0 && <div className="empty">لا يوجد مشاركون</div>}
          </div>
          <button className="btn full" style={{ marginTop: 12 }} onClick={distribute} disabled={busy || selected.size < 2}>
            🎲 {busy ? 'جارٍ التوزيع...' : (status === 'draft' ? 'إعادة التوزيع العشوائي' : 'توزيع عشوائي')}
          </button>
        </div>
      )}

      {/* ===== Full distribution table (admin only) — visible from draft onward ===== */}
      {status !== 'none' && assignments.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>التوزيعة الكاملة</h3>
          <div className="field"><input placeholder="بحث..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} /></div>
          <div className="adm-table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>👤 المخدوم</th><th>🎁 المرسل إليه</th><th>🕵️ الصديق الخفي</th></tr></thead>
              <tbody>
                {tableShown.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{r.person}</td>
                    <td>{r.giveTo}</td>
                    <td style={{ color: 'var(--maroon)' }}>{r.secretFriend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="subtle" style={{ marginTop: 8 }}>⚠️ هذه البيانات للأدمن فقط ولا تظهر للمخدومين.</p>
        </div>
      )}

      {/* ===== Instructions ===== */}
      {status !== 'none' && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 className="section-title" style={{ marginTop: 0 }}>تعليمات الهدية (اختياري)</h3>
          <textarea rows={2} className="sf-textarea" value={instructions}
            onChange={e => setSettings({ ...settings, secretFriend: { ...settings.secretFriend, instructions: e.target.value } })}
            placeholder="مثال: الهدية في حدود 50 جنيه، تُسلّم يوم الجمعة..." style={{ width: '100%', padding: 11, borderRadius: 12, border: '1.5px solid rgba(201,154,58,.4)', background: '#fffdf8' }} />
          <button className="btn ghost full" style={{ marginTop: 8 }} onClick={saveInstructions}>حفظ التعليمات</button>
        </div>
      )}

      {/* ===== Action buttons per stage ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {status === 'draft' && (
          <button className="btn gold full" onClick={approve}>🔒 اعتماد التوزيعة</button>
        )}
        {status === 'approved' && (
          <button className="btn green full" onClick={reveal}>🎁 إظهار المرسل إليه (بدء اللعبة)</button>
        )}
        {status === 'revealed' && (
          <button className="btn full" onClick={finalReveal}>🎉 الكشف النهائي (إظهار الصديق الخفي)</button>
        )}
        {status === 'final' && (
          <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg,#fff9ec,#fff)' }}>
            <div style={{ fontSize: 40 }}>🎉</div>
            <div style={{ fontWeight: 800, color: 'var(--maroon)' }}>تم الكشف النهائي</div>
            <div className="subtle">جميع المخدومين يرون صديقهم الخفي الآن</div>
          </div>
        )}
        {status !== 'none' && (
          <button className="btn red full" onClick={resetGame}>♻️ إعادة ضبط اللعبة من البداية</button>
        )}
      </div>

      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p style={{ lineHeight: 1.7 }}>{confirm.msg}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirm(null)}>إلغاء</button>
            <button className="btn" style={{ flex: 1 }} onClick={async () => { const a = confirm.action; setConfirm(null); await a() }}>تأكيد</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
