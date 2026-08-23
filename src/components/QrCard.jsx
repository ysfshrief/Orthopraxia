import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/*
  Team-NEUTRAL ID card: name + QR + logo only.
  No team name/color — so if a member is moved between teams, the SAME card
  and QR stay valid without reprinting. The QR encodes the PERSON's identity
  (participant.id), and the current team is always resolved live from the
  account data at scan time — never baked into the card.
*/
export default function QrCard({ participant, retreatName, roleLabel }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && participant) {
      QRCode.toCanvas(canvasRef.current, participant.qr || participant.id, {
        width: 160, margin: 1,
        color: { dark: '#6B2318', light: '#ffffff' }
      })
    }
  }, [participant])

  if (!participant) return null
  return (
    <div className="qr-card" style={{
      width: 300, background: 'linear-gradient(160deg,#fffaf2,#f5e4c8)',
      borderRadius: 18, padding: 20, border: '2px solid var(--gold)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      boxShadow: '0 6px 20px rgba(107,35,24,.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo-circle.png" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} alt="" />
        <span style={{ fontWeight: 900, color: 'var(--maroon)' }}>{retreatName || 'Orthopraxia'}</span>
      </div>
      <div style={{ background: '#fff', padding: 10, borderRadius: 14 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--ink)', textAlign: 'center' }}>{participant.name}</div>
      {roleLabel && (
        <span style={{ padding: '4px 16px', borderRadius: 999, background: 'var(--maroon)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
          {roleLabel}
        </span>
      )}
    </div>
  )
}
