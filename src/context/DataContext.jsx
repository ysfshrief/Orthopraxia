import { createContext, useContext, useState, useEffect } from 'react'
import { subscribeSettings, subscribe, ensureSeed } from '../lib/store'
import { SEED } from '../lib/seed'

const DataCtx = createContext()

export function DataProvider({ children }) {
  const [settings, setSettings] = useState(SEED.settings)
  const [teams, setTeams] = useState([])
  const [participants, setParticipants] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let unsubs = []
    ensureSeed().then(() => {
      unsubs.push(subscribeSettings(setSettings))
      unsubs.push(subscribe('teams', setTeams))
      unsubs.push(subscribe('participants', setParticipants))
      setReady(true)
    })
    return () => unsubs.forEach(u => u && u())
  }, [])

  return (
    <DataCtx.Provider value={{ settings, teams, participants, ready }}>
      {children}
    </DataCtx.Provider>
  )
}

export const useData = () => useContext(DataCtx)
