import { createContext, useContext, useState, useCallback } from 'react'
import Icon from './Icons'

// ---------- Toast ----------
const ToastCtx = createContext()
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg, type = 'ok', ms = 2600) => {
    setToast({ msg, type })
    clearTimeout(window.__t)
    window.__t = setTimeout(() => setToast(null), ms)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast-wrap">
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ---------- Modal ----------
export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{title}</h3>
          <button className="btn ghost" style={{ padding: '6px 10px' }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Header ----------
export function Header({ title, back }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {back && (
        <button className="btn ghost" style={{ padding: '8px 10px' }} onClick={back}>
          <Icon name="back" size={18} />
        </button>
      )}
      <h2 style={{ margin: 0, color: 'var(--maroon)', fontSize: 22 }}>{title}</h2>
    </div>
  )
}
