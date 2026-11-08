import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { ForcedChangePasswordModal } from '../components/auth/ForcedChangePasswordModal'

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const currentUser = await authService.me()
      setUser(currentUser)
      return currentUser
    } catch {
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    refreshUser().finally(() => {
      setIsLoading(false)
    })
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
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  const updateProfile = async (data) => {
    const updated = await authService.updateProfile(data)
    setUser(updated)
    return updated
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isLoading,
        role: user ? user.role : null,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
      {user && user.mustChangePassword && (
        <ForcedChangePasswordModal
          isOpen={true}
          onSuccess={async () => {
            await refreshUser()
          }}
          onLogout={logout}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
