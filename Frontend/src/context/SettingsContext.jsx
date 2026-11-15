import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { normalizeShippingRatesPayload } from '../hooks/useShippingRates'
import { settingsService } from '../services/settingsService'
import { useAuth } from './AuthContext'

const EMPTY_SHIPPING_STATE = {
  rates: null,
  zones: [],
  governorates: [],
  isLoading: true,
  isLoaded: false,
  error: null,
}

const SettingsContext = createContext({
  hasProvider: false,
  settings: {},
  isLoading: true,
  updateSettings: async () => {},
  getShippingRateForZone: () => null,
  shippingState: EMPTY_SHIPPING_STATE,
  refreshShippingRates: async () => null,
  commissionRate: undefined,
  platformWallet: '',
})

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const isPrivileged = user && (user.role === 'seller' || user.role === 'admin')
  const inFlightShippingRef = useRef(null)
  const lastFetchedShippingAtRef = useRef(0)
  const mountedRef = useRef(true)

  const [settings, setSettings] = useState({
    platformWallet: '',
    supportPhone: '',
    supportEmail: '',
    whatsappNumber: '',
    payoutScheduleText: '',
    shippingRates: null,
    maintenanceMode: false,
  })
  const [shippingState, setShippingState] = useState(EMPTY_SHIPPING_STATE)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshShippingRates = useCallback(async ({ force = true } = {}) => {
    if (inFlightShippingRef.current) {
      return inFlightShippingRef.current
    }
    if (!force && lastFetchedShippingAtRef.current && Date.now() - lastFetchedShippingAtRef.current < 5000) {
      return null
    }

    if (mountedRef.current) {
      setShippingState((prev) => ({
        ...prev,
        isLoading: !prev.isLoaded,
        error: null,
      }))
    }

    const req = (async () => {
      try {
        const res = await settingsService.getShippingRates()
        const parsed = normalizeShippingRatesPayload(res)
        if (!parsed) {
          throw new Error('EMPTY_SHIPPING_RATES')
        }
        lastFetchedShippingAtRef.current = Date.now()
        if (mountedRef.current) {
          setShippingState({
            ...parsed,
            isLoading: false,
            isLoaded: parsed.governorates.length > 0,
            error: null,
          })
        }
        return parsed
      } catch (err) {
        lastFetchedShippingAtRef.current = 0
        if (mountedRef.current) {
          setShippingState({
            rates: null,
            zones: [],
            governorates: [],
            isLoading: false,
            isLoaded: false,
            error: err,
          })
        }
        return null
      } finally {
        inFlightShippingRef.current = null
      }
    })()

    inFlightShippingRef.current = req
    return req
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchSettings() {
      setIsLoading(true)
      try {
        const [settingsRes] = await Promise.allSettled([
          isPrivileged ? settingsService.getSettings() : settingsService.getPublicSettings(),
          refreshShippingRates(),
        ])

        if (isMounted && settingsRes.status === 'fulfilled' && settingsRes.value) {
          const data = { ...settingsRes.value }
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
  }, [isPrivileged, refreshShippingRates])

  const updateSettings = async (values) => {
    const updated = await settingsService.updateSettings(values)
    setSettings(updated)
    await refreshShippingRates()
    return updated
  }

  const getShippingRateForZone = (zoneId) => {
    if (shippingState.rates && shippingState.rates[zoneId] !== undefined) {
      return shippingState.rates[zoneId]
    }
    if (settings.shippingRates && settings.shippingRates[zoneId] !== undefined) {
      return settings.shippingRates[zoneId]
    }
    return null
  }

  return (
    <SettingsContext.Provider
      value={{
        hasProvider: true,
        settings,
        isLoading,
        updateSettings,
        getShippingRateForZone,
        shippingState,
        refreshShippingRates,
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
