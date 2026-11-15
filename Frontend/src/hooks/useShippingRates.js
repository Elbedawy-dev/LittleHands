import { useCallback, useEffect, useState } from 'react'
import { SHIPPING_ZONES, getGovernorateName } from '../config/constants'
import { useSettings } from '../context/SettingsContext'
import { settingsService } from '../services/settingsService'

const isValidRate = (val) => typeof val === 'number' && Number.isFinite(val) && val >= 0

const findZoneLabel = (zoneId) => SHIPPING_ZONES.find((z) => z.id === zoneId)

/**
 * تطبيع رد نقطة /settings/shipping-rates (يدعم meta.governorates + meta.zones + خريطة الأسعار).
 * لا يضع أي أسعار افتراضية إطلاقاً: الأسعار غير المحملة تظل غائبة/null.
 */
export function normalizeShippingRatesPayload(payload) {
  if (!payload || typeof payload !== 'object') return null

  const metaZones = Array.isArray(payload.meta?.zones) ? payload.meta.zones : []
  const metaGovs = Array.isArray(payload.meta?.governorates) ? payload.meta.governorates : []

  const rates = {}
  if (payload.rates && typeof payload.rates === 'object' && !Array.isArray(payload.rates)) {
    for (const [key, val] of Object.entries(payload.rates)) {
      if (isValidRate(val)) rates[key] = val
    }
  } else {
    for (const [key, val] of Object.entries(payload)) {
      if (key === 'meta' || key === '_raw') continue
      if (isValidRate(val)) rates[key] = val
    }
  }

  let zones = []
  if (metaZones.length > 0) {
    zones = metaZones
      .filter((z) => z && z.zone && isValidRate(z.price))
      .map((z) => {
        const ref = findZoneLabel(z.zone)
        rates[z.zone] = z.price
        return {
          zone: z.zone,
          name: z.name || ref?.nameAr || z.zone,
          nameEn: z.nameEn || ref?.nameEn || z.name || z.zone,
          price: z.price,
          governorates: Array.isArray(z.governorates) ? [...z.governorates] : [],
        }
      })
  } else if (Object.keys(rates).length > 0) {
    zones = SHIPPING_ZONES.filter((z) => isValidRate(rates[z.id])).map((z) => ({
      zone: z.id,
      name: z.nameAr,
      nameEn: z.nameEn,
      price: rates[z.id],
      governorates: [...z.governorates],
    }))
  }

  let governorates = []
  if (metaGovs.length > 0) {
    governorates = metaGovs
      .filter((g) => g && g.name && isValidRate(g.price))
      .map((g) => ({
        name: g.name,
        nameEn: g.nameEn || getGovernorateName(g.name, 'en'),
        zoneId: g.zoneId,
        price: g.price,
      }))
  } else if (zones.length > 0) {
    governorates = zones.flatMap((z) =>
      (z.governorates || []).map((gov) => ({
        name: gov,
        nameEn: getGovernorateName(gov, 'en'),
        zoneId: z.zone,
        price: z.price,
      }))
    )
  }

  if (governorates.length === 0 && Object.keys(rates).length === 0) {
    return null
  }

  return { rates, zones, governorates }
}

/**
 * استخراج قائمة خيارات المحافظات المترجمة مع أو بدون سعر الشحن بناءً على بيانات الباك.
 * يقبل كائن useShippingRates أو مصفوفة governorates أو خريطة أسعار مناطق.
 */
export function getGovernorateOptions(ratesInput, lang = 'ar', options = {}) {
  const { includePrice = true, currencyLabel } = options
  const isEn = String(lang || '').startsWith('en')
  const curr = currencyLabel ?? (isEn ? 'EGP' : 'ج.م')

  let list = []
  if (Array.isArray(ratesInput)) {
    list = ratesInput
  } else if (ratesInput && Array.isArray(ratesInput.governorates) && ratesInput.governorates.length > 0) {
    list = ratesInput.governorates
  } else if (ratesInput && typeof ratesInput === 'object') {
    const normalized = normalizeShippingRatesPayload(ratesInput)
    list = normalized?.governorates || []
  }

  return list.map((g) => {
    const govName = g.name
    const labelName = isEn ? (g.nameEn || getGovernorateName(govName, 'en')) : govName
    const hasPrice = isValidRate(g.price)
    return {
      value: govName,
      name: govName,
      nameEn: g.nameEn || getGovernorateName(govName, 'en'),
      zoneId: g.zoneId,
      price: hasPrice ? g.price : null,
      label: includePrice && hasPrice ? `${labelName} (${g.price} ${curr})` : labelName,
    }
  })
}

/**
 * حساب سعر الشحن لمحافظة محددة من بيانات الأسعار المحملة فقط (يرجع null لو غير متاح).
 */
export function getShippingRateForGovernorate(ratesInput, governorateName) {
  if (!governorateName) return null
  const target = String(governorateName).trim()
  if (!target) return null

  const normalized = Array.isArray(ratesInput)
    ? { governorates: ratesInput, rates: {} }
    : ratesInput?.governorates
      ? ratesInput
      : normalizeShippingRatesPayload(ratesInput)

  if (!normalized) return null

  const matched = normalized.governorates?.find((g) => g.name === target)
  if (matched && isValidRate(matched.price)) {
    return matched.price
  }

  const matchedZone = normalized.zones?.find((z) => z.governorates?.includes(target))
  if (matchedZone && isValidRate(matchedZone.price)) {
    return matchedZone.price
  }

  return null
}

/**
 * Hook مشترك لقراءة أسعار الشحن الحية من السياق العام (مع جلب مستقل إذا استُخدم خارج SettingsProvider).
 */
export function useShippingRates({ revalidate = false } = {}) {
  const ctx = useSettings()
  const hasProvider = Boolean(ctx?.hasProvider)

  const [standaloneState, setStandaloneState] = useState({
    rates: null,
    zones: [],
    governorates: [],
    isLoading: true,
    isLoaded: false,
    error: null,
  })

  const fetchStandalone = useCallback(async () => {
    setStandaloneState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await settingsService.getShippingRates()
      const parsed = normalizeShippingRatesPayload(res)
      if (!parsed) {
        throw new Error('EMPTY_SHIPPING_RATES')
      }
      setStandaloneState({
        ...parsed,
        isLoading: false,
        isLoaded: parsed.governorates.length > 0,
        error: null,
      })
      return parsed
    } catch (err) {
      setStandaloneState({
        rates: null,
        zones: [],
        governorates: [],
        isLoading: false,
        isLoaded: false,
        error: err,
      })
      return null
    }
  }, [])

  useEffect(() => {
    if (hasProvider) {
      if (revalidate && typeof ctx.refreshShippingRates === 'function') {
        ctx.refreshShippingRates({ force: false })
      }
      return
    }
    fetchStandalone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProvider, revalidate])

  const active = hasProvider ? ctx.shippingState : standaloneState
  const refresh = hasProvider ? ctx.refreshShippingRates : fetchStandalone

  const getRateForGov = useCallback(
    (governorateName) => getShippingRateForGovernorate(active, governorateName),
    [active]
  )

  return {
    rates: active.rates,
    zones: active.zones,
    governorates: active.governorates,
    isLoading: active.isLoading,
    isLoaded: active.isLoaded,
    error: active.error,
    refresh,
    getRateForGov,
  }
}
