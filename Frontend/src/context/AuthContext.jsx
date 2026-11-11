import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'
import { authService } from '../services/authService'
import { userService } from '../services/userService'
import { ForcedChangePasswordModal } from '../components/auth/ForcedChangePasswordModal'
import { Button } from '../components/ui/Button'

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
  const { t } = useTranslation('common')
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)

  const refreshUser = async () => {
    try {
      setConnectionError(false)
      const currentUser = await authService.me()
      setUser(currentUser)
      return currentUser
    } catch (err) {
      const status = err.response?.status
      const isNetworkOr5xx = !status || status >= 500 || err.code === 'ECONNABORTED'
      if (isNetworkOr5xx) {
        // Cold start or network glitch: retry once after a short delay
        try {
          await new Promise((r) => setTimeout(r, 1000))
          const retriedUser = await authService.me()
          setUser(retriedUser)
          setConnectionError(false)
          return retriedUser
        } catch (retryErr) {
          const retryStatus = retryErr.response?.status
          if (!retryStatus || retryStatus >= 500 || retryErr.code === 'ECONNABORTED') {
            setConnectionError(true)
            return null
          }
        }
      }
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    refreshUser().finally(() => {
      setIsLoading(false)
    })

    const handleLogout = () => {
      setUser(null)
    }
    window.addEventListener('lh:auth:logout', handleLogout)
    return () => window.removeEventListener('lh:auth:logout', handleLogout)
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
    await userService.updateProfile(data)
    return refreshUser()
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
      {connectionError ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-subtle">
          <div className="max-w-md w-full rounded-3xl bg-surface border border-surface-border p-6 text-center space-y-4 shadow-soft">
            <div className="w-14 h-14 mx-auto rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
              <WifiOff className="w-7 h-7" />
            </div>
            <h2 className="font-heading font-black text-lg text-text-main">
              {t('ui.connection_error', { defaultValue: 'تعذر الاتصال بالخادم' })}
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('ui.connection_error_desc', { defaultValue: 'يرجى التحقق من اتصالك بالإنترنت ثم إعادة المحاولة.' })}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setConnectionError(false)
                setIsLoading(true)
                refreshUser().finally(() => setIsLoading(false))
              }}
            >
              {t('actions.retry', { defaultValue: 'إعادة المحاولة' })}
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
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
