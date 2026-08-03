// Minimal auth context: holds the logged-in user, guards the dashboard.
import { createContext, useContext, useState } from 'react'
import { login as apiLogin, logout as apiLogout } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const name = localStorage.getItem('user_name')
    const role = localStorage.getItem('user_role')
    return name ? { name, role } : null
  })

  const login = async (email, password) => {
    const data = await apiLogin(email, password)
    setUser({ name: data.name, role: data.role })
    return data
  }

  const logout = () => {
    setUser(null)
    apiLogout()
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
