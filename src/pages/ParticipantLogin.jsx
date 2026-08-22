import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useParticipant } from '../context/ParticipantContext'
import { useToast, Header } from '../components/UI'
import Icon from '../components/Icons'

export default function ParticipantLogin() {
  const nav = useNavigate()
  const { participants } = useData()
  const { login, loginJudge } = useParticipant()
  const toast = useToast()
  const [judges, setJudges] = useState([])
  const [scanning, setScanning] = useState(false)
  const qrRef = useRef(null)
  const lock = useRef(false)

  useEffect(() => subscribe('judges', setJudges), [])

  const startScan = () => { setScanning(true); setTimeout(init, 100) }

  const init = async () => {
    try {
      const qr = new Html5Qrcode('login-reader')
      qrRef.current = qr
      await qr.start({ facingMode: 'environment' }, { fps: 12, qrbox: { width: 220, height: 220 } }, onScan, () => {})
    } catch {
      toast('تعذّر فتح الكاميرا — تأكد من الإذن', 'err'); setScanning(false)
    }
  }
  const stop = async () => {
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current.clear() } } catch {}
    qrRef.current = null; setScanning(false)
  }
  useEffect(() => () => { stop() }, [])

  const onScan = (code) => {
    if (lock.current) return
    const c = code.trim()

    // Check judges first (by QR / id — no manual code)
    const judge = judges.find(j => j.qr === c || j.id === c)
    if (judge) {
      if (judge.active === false) { toast('حساب الحكم معطّل حالياً', 'err'); return }
      lock.current = true
      if (navigator.vibrate) navigator.vibrate(60)
      stop(); loginJudge(judge.id)
      toast(`أهلاً ${judge.name} ⚖️`, 'ok')
      nav('/judge')
      return
    }

    // Then participants
    const person = participants.find(p => p.id === c || p.qr === c)
    if (!person) { toast('QR غير صالح أو غير مسجّل', 'err'); return }
    if (person.active === false) { toast('هذا الحساب معطّل — راجع المسؤول', 'err'); return }
    lock.current = true
    if (navigator.vibrate) navigator.vibrate(60)
    stop(); login(person.id)
    toast(`أهلاً ${person.name} 👋`, 'ok')
    nav('/me')
  }

  return (
    <div className="page">
      <Header title="تسجيل الدخول" />
      <div className="center-col" style={{ paddingTop: 10 }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--gold)', boxShadow: 'var(--shadow-lg)' }}>
          <img src="/logo.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <p className="subtle" style={{ marginTop: 14, maxWidth: 320 }}>
          صوّر رمز الـQR الموجود على الكارنيه الخاص بك للدخول ومتابعة فريقك ودرجاتك.
        </p>
      </div>

      {!scanning ? (
        <button className="btn full" style={{ marginTop: 18 }} onClick={startScan}>
          <Icon name="scan" size={18} /> تصوير الكارنيه للدخول
        </button>
      ) : (
        <>
          <div id="login-reader" style={{ width: '100%', borderRadius: 18, overflow: 'hidden', border: '2px solid var(--gold)', marginTop: 16 }} />
          <button className="btn red full" style={{ marginTop: 14 }} onClick={stop}>إلغاء</button>
        </>
      )}
    </div>
  )
}
