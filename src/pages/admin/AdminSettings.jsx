import { useState, useEffect } from 'react'
import { subscribeSettings, saveSettings } from '../../lib/store'
import { useToast, Header } from '../../components/UI'
import { fmt } from '../../lib/points'
import Icon from '../../components/Icons'

export default function AdminSettings({ back, embedded }) {
  const toast = useToast()
  const [s, setS] = useState(null)

  useEffect(() => subscribeSettings(setS), [])
  if (!s) return <div className="page"><Header title="الإعدادات" back={back} /><div className="empty"><div className="spinner" /></div></div>

  const set = (patch) => setS({ ...s, ...patch })
  const setPoints = (patch) => setS({ ...s, points: { ...s.points, ...patch } })
  const setTier = (i, patch) => {
    const tiers = s.points.tiers.map((t, idx) => idx === i ? { ...t, ...patch } : t)
    setPoints({ tiers })
  }
  const addTier = () => setPoints({ tiers: [...s.points.tiers, { untilTime: '21:00', points: 0 }] })
  const delTier = (i) => setPoints({ tiers: s.points.tiers.filter((_, idx) => idx !== i) })

  const save = async () => { await saveSettings(s); toast('تم حفظ الإعدادات', 'ok') }

  return (
    <div className="page">
      {!embedded && <Header title="الإعدادات" back={back} />}

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ marginTop: 0 }}>معلومات الخلوة</h3>
        <div className="field"><label>اسم الخلوة</label><input value={s.retreatName} onChange={e => set({ retreatName: e.target.value })} /></div>
        <div className="field"><label>العنوان الفرعي</label><input value={s.subtitle} onChange={e => set({ subtitle: e.target.value })} /></div>
        <div className="field"><label>نبذة</label><textarea rows={3} value={s.about} onChange={e => set({ about: e.target.value })} /></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ marginTop: 0 }}>النتائج</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
          <input type="checkbox" checked={s.leaderboardVisible} onChange={e => set({ leaderboardVisible: e.target.checked })} style={{ width: 20, height: 20 }} />
          إظهار لوحة النتائج للمشاركين
        </label>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ marginTop: 0 }}>نظام نقاط الحضور</h3>
        <p className="subtle">النقاط تُحسب حسب وقت اكتمال حضور الفريق بالكامل.</p>
        {s.points.tiers.map((t, i) => (
          <div key={i} className="card" style={{ marginBottom: 8, padding: 12, background: 'rgba(201,154,58,.08)' }}>
            <div className="subtle" style={{ marginBottom: 6 }}>
              {i === 0 ? `عند أو قبل ${fmt(t.untilTime)}` : `بعد ${fmt(s.points.tiers[i - 1].untilTime)} وحتى ${fmt(t.untilTime)}`}
            </div>
            <div className="grid2">
              <div className="field" style={{ margin: 0 }}><label>حتى الساعة</label><input type="time" value={t.untilTime} onChange={e => setTier(i, { untilTime: e.target.value })} /></div>
              <div className="field" style={{ margin: 0 }}><label>النقاط</label><input type="number" value={t.points} onChange={e => setTier(i, { points: Number(e.target.value) })} /></div>
            </div>
            {s.points.tiers.length > 1 && (
              <button className="btn ghost" style={{ marginTop: 8, color: 'var(--red)', padding: '6px 12px' }} onClick={() => delTier(i)}><Icon name="trash" size={14} /> حذف الفترة</button>
            )}
          </div>
        ))}
        <button className="btn ghost full" onClick={addTier}><Icon name="plus" size={16} /> إضافة فترة</button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 className="section-title" style={{ marginTop: 0 }}>دخول الأدمن</h3>
        <div className="grid2">
          <div className="field"><label>كلمة المرور</label><input value={s.adminPassword} onChange={e => set({ adminPassword: e.target.value })} /></div>
          <div className="field"><label>عدد الضغطات على اللوجو</label><input type="number" value={s.adminTapCount} onChange={e => set({ adminTapCount: Number(e.target.value) })} /></div>
        </div>
      </div>

      <button className="btn full" onClick={save}><Icon name="check" size={18} /> حفظ كل الإعدادات</button>
    </div>
  )
}
