import { createContext, useContext, useState } from 'react'

const PCtx = createContext()
const KEY = 'ortho:participantId'
const JKEY = 'ortho:judgeId'

export function ParticipantProvider({ children }) {
  const [participantId, setParticipantId] = useState(() => localStorage.getItem(KEY) || null)
  const [judgeId, setJudgeId] = useState(() => localStorage.getItem(JKEY) || null)

  const login = (id) => {
    localStorage.setItem(KEY, id)
    localStorage.removeItem(JKEY)
    setParticipantId(id); setJudgeId(null)
  }
  const loginJudge = (id) => {
    localStorage.setItem(JKEY, id)
    localStorage.removeItem(KEY)
    setJudgeId(id); setParticipantId(null)
  }
  const logout = () => {
    localStorage.removeItem(KEY)
    localStorage.removeItem(JKEY)
    setParticipantId(null); setJudgeId(null)
  }

  return (
    <PCtx.Provider value={{ participantId, judgeId, login, loginJudge, logout }}>
      {children}
    </PCtx.Provider>
  )
}

export const useParticipant = () => useContext(PCtx)
