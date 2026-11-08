import { createContext, useContext, useEffect, useState } from 'react'
import { settingsService } from '../services/settingsService'
import { useAuth } from './AuthContext'

const SettingsContext = createContext({
  settings: {},
  isLoading: true,
  updateSettings: async () => {},
  getShippingRateForZone: () => 40,
  commissionRate: undefined,
  platformWallet: '',
})

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const isPrivileged = user && (user.role === 'seller' || user.role === 'admin')

  const [settings, setSettings] = useState({
    platformWallet: '',
    supportPhone: '',
    supportEmail: '',
    whatsappNumber: '',
    payoutScheduleText: '',
    shippingRates: {
      greater_cairo: 40,
      giza: 45,
      alexandria: 50,
      delta_canal: 55,
      upper_egypt: 65,
    },
    maintenanceMode: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchSettings() {
      setIsLoading(true)
      try {
        let data
        if (isPrivileged) {
          data = await settingsService.getSettings()
        } else {
          data = await settingsService.getPublicSettings()
        }

        if (isMounted && data) {
          // Hard rule: commissionRate must never exist in customer or guest state
          if (!isPrivileged) {
            delete data.commissionRate
          }
          setSettings(data)
        }
      } catch (err) {
        console.warn('Failed to load settings:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchSettings()

    return () => {
      isMounted = false
    }
  }, [isPrivileged])

  const updateSettings = async (values) => {
    const updated = await settingsService.updateSettings(values)
    setSettings(updated)
    return updated
  }

  const getShippingRateForZone = (zoneId) => {
    if (settings.shippingRates && settings.shippingRates[zoneId]) {
      return settings.shippingRates[zoneId]
    }
    return 40
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        getShippingRateForZone,
        commissionRate: isPrivileged ? settings.commissionRate : undefined,
        platformWallet: settings.platformWallet || '',
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

export default SettingsContext
