import { createContext, useContext, useEffect, useState } from 'react'
import { PLATFORM_CONFIG } from '../config/constants'
import { settingsService } from '../services/settingsService'

const SettingsContext = createContext({
  settings: {
    commissionRate: PLATFORM_CONFIG.COMMISSION_RATE,
    platformWallet: '',
    supportPhone: '',
    supportEmail: '',
    whatsappNumber: '',
    payoutScheduleText: '',
    shippingRates: {},
    maintenanceMode: false,
  },
  isLoading: true,
  updateSettings: async () => {},
  getShippingRateForZone: () => 40,
})

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    commissionRate: PLATFORM_CONFIG.COMMISSION_RATE,
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
    async function fetchSettings() {
      try {
        const data = await settingsService.getSettings()
        setSettings(data)
      } catch (err) {
        console.warn('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

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
        commissionRate: settings.commissionRate || PLATFORM_CONFIG.COMMISSION_RATE,
        platformWallet: settings.platformWallet || PLATFORM_CONFIG.VODAFONE_CASH_WALLET,
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

