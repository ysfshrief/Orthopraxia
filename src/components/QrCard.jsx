import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

// A printable ID card for one participant.
export default function QrCard({ participant, team, retreatName }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (canvasRef.current && participant) {
      QRCode.toCanvas(canvasRef.current, participant.qr || participant.id, {
        width: 150, margin: 1,
        color: { dark: '#6B2318', light: '#ffffff' }
      })
    }
  }, [participant])

  if (!participant) return null
  return (
    <div className="qr-card" style={{
      width: 300, background: 'linear-gradient(160deg,#fffaf2,#f5e4c8)',
      borderRadius: 18, padding: 18, border: `2px solid ${team?.color || 'var(--gold)'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      boxShadow: '0 6px 20px rgba(107,35,24,.15)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.png" style={{ width: 34, height: 34, objectFit: 'contain' }} alt="" />
        <span style={{ fontWeight: 900, color: 'var(--maroon)' }}>{retreatName || 'Orthopraxia'}</span>
      </div>
      <div style={{ background: '#fff', padding: 8, borderRadius: 12 }}>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--ink)' }}>{participant.name}</div>
      {team && (
        <span style={{ padding: '4px 14px', borderRadius: 999, background: team.color, color: '#fff', fontWeight: 700, fontSize: 13 }}>
          {team.name}
        </span>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', direction: 'ltr' }}>ID: {participant.id}</div>
    </div>
  )
}
