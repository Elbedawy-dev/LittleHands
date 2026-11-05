import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  switchMockRole: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await authService.me()
        setUser(currentUser)
      } catch (err) {
        console.error('Failed to restore user auth:', err)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    initAuth()
  }, [])

  const login = async ({ identifier, password }) => {
    const res = await authService.login({ identifier, password })
    setUser(res.user)
    return res
  }

  const register = async (data) => {
    const res = await authService.register(data)
    setUser(res.user)
    return res
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const updateProfile = async (data) => {
    const updated = await authService.updateProfile(data)
    setUser(updated)
    return updated
  }

  // تبديل سريع للمستخدم التجريبي في بيئة التطوير
  const switchMockRole = async (role) => {
    const emailMap = {
      seller1: 'seller1@test.com',
      seller2: 'seller2@test.com',
      seller: 'seller1@test.com',
      admin: 'admin@test.com',
    }
    const email = emailMap[role]
    if (email) {
      return login({ identifier: email, password: '123456' })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role: user ? user.role : null,
        login,
        register,
        logout,
        updateProfile,
        switchMockRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

