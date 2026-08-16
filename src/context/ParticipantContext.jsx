import { createContext, useContext, useState, useEffect } from 'react'

const PCtx = createContext()
const KEY = 'ortho:participantId'

export function ParticipantProvider({ children }) {
  const [participantId, setParticipantId] = useState(() => localStorage.getItem(KEY) || null)

  const login = (id) => {
    localStorage.setItem(KEY, id)
    setParticipantId(id)
  }
  const logout = () => {
    localStorage.removeItem(KEY)
    setParticipantId(null)
  }

  return (
    <PCtx.Provider value={{ participantId, login, logout }}>
      {children}
    </PCtx.Provider>
  )
}

export const useParticipant = () => useContext(PCtx)
