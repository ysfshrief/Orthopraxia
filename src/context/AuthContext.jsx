import { createContext, useContext, useState, useEffect } from 'react'

const AuthCtx = createContext()
const KEY = 'ortho:isAdmin'

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem(KEY) === '1')

  const login = (pw, correctPw) => {
    if (pw === String(correctPw)) {
      sessionStorage.setItem(KEY, '1')
      setIsAdmin(true)
      return true
    }
    return false
  }
  const logout = () => {
    sessionStorage.removeItem(KEY)
    setIsAdmin(false)
  }

  return (
    <AuthCtx.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
