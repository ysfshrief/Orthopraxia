import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribe } from '../lib/store'
import { useData } from '../context/DataContext'
import { useParticipant } from '../context/ParticipantContext'
import { Header } from '../components/UI'
import { viewFor } from '../lib/secretFriend'
import Icon from '../components/Icons'

/*
  Participant view. Reads the whole `secretFriend` collection but ONLY renders
  the current participant's own data, gated by game status:
   - approved/earlier: nothing revealed (mystery waiting)
   - revealed: shows giveTo (المرسل إليه) only
   - final: shows giveTo + secretFriend
  NOTE: true privacy requires Firestore Security Rules (see SECURITY note in
  FIREBASE_SETUP). The client intentionally does not display others' data.
*/
export default function SecretFriend() {
  const nav = useNavigate()
  const { settings, participants } = useData()
  const { participantId } = useParticipant()
  const [assignments, setAssignments] = useState([])
  const [flipped, setFlipped] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => subscribe('secretFriend', setAssignments), [])

  const status = settings?.secretFriend?.status || 'none'
  const instructions = settings?.secretFriend?.instructions || ''
  const me = participants.find(p => p.id === participantId)

  const myView = useMemo(() => {
    if (!participantId) return { giveTo: null, secretFriend: null }
    return viewFor(assignments, participantId)
  }, [assignments, participantId])

  const amParticipant = assignments.some(a => a.giverId === participantId)

  const fireConfetti = () => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 3500)
  }

  if (!participantId) {
    return (
      <div className="page">
        <Header title="الصديق الخفي" />
        <div className="sf-empty">
          <div className="sf-big-icon">🕵️</div>
          <p style={{ fontWeight: 700, marginTop: 10 }}>سجّل الدخول بالكارنيه أولاً</p>
          <button className="btn gold" style={{ marginTop: 14 }} onClick={() => nav('/login')}>
            <Icon name="scan" size={18} /> تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page sf-page">
      <Header title="🕵️ الصديق الخفي" />
      {showConfetti && <Confetti />}

      {/* not participating */}
      {status !== 'none' && !amParticipant && (
        <div className="sf-empty">
          <div className="sf-big-icon">🎭</div>
          <p style={{ fontWeight: 700, marginTop: 10 }}>أنت لست ضمن مشاركي هذه اللعبة</p>
          <p className="subtle">اسأل المسؤول لو حابب تنضم في المرة الجاية</p>
        </div>
      )}

      {/* STATE: none — game not started (for everyone) */}
      {status === 'none' && (
        <WaitingState title="اللعبة لسه ماابتدتش" sub="استنى إعلان المسؤول عن بداية لعبة الصديق الخفي 🎁" />
      )}

      {amParticipant && (
        <>
          {/* STATE: approved (or draft) — waiting for reveal */}
          {(status === 'approved' || status === 'draft') && (
            <div className="sf-center">
              <MysteryCard label="🤫 الصديق الخفي يستعد..." sub="لسه السر مخبي... أول ما تبدأ اللعبة هتعرف مين مستني هديتك 🎁" pulse />
            </div>
          )}

          {/* STATE: revealed — show giveTo only */}
          {status === 'revealed' && (
            <>
              <div className="sf-center">
                {!flipped ? (
                  <button className="sf-flip-btn" onClick={() => { setFlipped(true); fireConfetti() }}>
                    <MysteryCard label="🎁 اضغط لكشف مهمتك" sub="مين الشخص اللي هتجهزله هدية؟ 👀" />
                  </button>
                ) : (
                  <div className="sf-reveal-card sf-flip-in">
                    <div className="sf-reveal-emoji">🎁</div>
                    <div className="sf-reveal-role">المرسل إليه</div>
                    <div className="sf-reveal-name">{myView.giveTo?.name || '—'}</div>
                    <div className="sf-reveal-msg">ده الشخص اللي مهمتك تجهز له هدية سرية 🎁</div>
                  </div>
                )}
              </div>
              {/* persistent mystery reminder */}
              <div className="sf-mystery-strip">
                <span className="sf-q">❓</span>
                <div>
                  <div style={{ fontWeight: 800 }}>مين بعتلك الهدية؟ 👀</div>
                  <div className="subtle" style={{ fontSize: 12 }}>السر هيتكشف في نهاية اللعبة</div>
                </div>
              </div>
              {instructions && <InstructionsBox text={instructions} />}
            </>
          )}

          {/* STATE: final — reveal both */}
          {status === 'final' && (
            <>
              <FinalReveal myView={myView} onOpen={fireConfetti} instructions={instructions} />
            </>
          )}
        </>
      )}
    </div>
  )
}

function WaitingState({ title, sub }) {
  return (
    <div className="sf-center">
      <MysteryCard label={`🤫 ${title}`} sub={sub} pulse />
    </div>
  )
}

function MysteryCard({ label, sub, pulse }) {
  return (
    <div className={`sf-mystery-card ${pulse ? 'sf-pulse' : ''}`}>
      <div className="sf-q-big">❓</div>
      <div className="sf-mystery-label">{label}</div>
      {sub && <div className="sf-mystery-sub">{sub}</div>}
    </div>
  )
}

function InstructionsBox({ text }) {
  return (
    <div className="card" style={{ marginTop: 14, background: 'rgba(201,154,58,.1)' }}>
      <div style={{ fontWeight: 800, color: 'var(--maroon)', marginBottom: 6 }}>📋 تعليمات الهدية</div>
      <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  )
}

function FinalReveal({ myView, onOpen, instructions }) {
  const [opened, setOpened] = useState(false)
  return (
    <div className="sf-center">
      {!opened ? (
        <button className="sf-flip-btn" onClick={() => { setOpened(true); onOpen() }}>
          <div className="sf-mystery-card sf-pulse">
            <div className="sf-q-big">🎉</div>
            <div className="sf-mystery-label">اضغط لكشف السر!</div>
            <div className="sf-mystery-sub">اعرف مين كان صديقك الخفي 🕵️</div>
          </div>
        </button>
      ) : (
        <div className="sf-flip-in" style={{ width: '100%' }}>
          <div className="sf-final-title">🎉 السر اتكشف!</div>

          <div className="sf-reveal-card" style={{ marginBottom: 14 }}>
            <div className="sf-reveal-emoji">🎁</div>
            <div className="sf-reveal-role">المرسل إليه</div>
            <div className="sf-reveal-name">{myView.giveTo?.name || '—'}</div>
            <div className="sf-reveal-msg">الشخص اللي كنت بتجهزله هدية</div>
          </div>

          <div className="sf-reveal-card sf-secret">
            <div className="sf-reveal-emoji">🕵️</div>
            <div className="sf-reveal-role">الصديق الخفي</div>
            <div className="sf-reveal-name">{myView.secretFriend?.name || '—'}</div>
            <div className="sf-reveal-msg">الشخص اللي جهزلك هدية 🎁</div>
          </div>

          {instructions && <InstructionsBox text={instructions} />}
        </div>
      )}
    </div>
  )
}

// lightweight CSS confetti (no library)
function Confetti() {
  const pieces = useRef(Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    dur: 2 + Math.random() * 1.5,
    color: ['#C99A3A', '#8B2E1E', '#3E8B4F', '#5B9BD5', '#F1C40F'][i % 5],
    rot: Math.random() * 360
  }))).current
  return (
    <div className="sf-confetti" aria-hidden="true">
      {pieces.map(p => (
        <span key={p.id} style={{
          left: p.left + '%', background: p.color,
          animationDelay: p.delay + 's', animationDuration: p.dur + 's',
          transform: `rotate(${p.rot}deg)`
        }} />
      ))}
    </div>
  )
}
