import { settingsService } from './service.js'
import { updateSettingsSchema, updateShippingRatesSchema } from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok } from '../../utils/response.js'

export const settingsController = {
  /**
   * GET /settings
   * Returns settings shaped by caller role:
   * - Seller & Admin receive commissionRate & payoutScheduleText
   * - Public & Customer NEVER receive commissionRate
   */
  getSettings: asyncHandler(async (req, res) => {
    const role = req.user?.role || 'public'
    const settings = await settingsService.getSettings(role)
    return ok(res, settings)
  }),

  /**
   * GET /settings/public
   * Strictly public settings. Never contains commissionRate.
   */
  getPublicSettings: asyncHandler(async (_req, res) => {
    const settings = await settingsService.getPublicSettings()
    return ok(res, settings)
  }),

  /**
   * GET /settings/shipping-rates
   */
  getShippingRates: asyncHandler(async (_req, res) => {
    const rates = await settingsService.getShippingRates()
    return ok(res, rates)
  }),

  /**
   * PUT/PATCH /settings
   * PUT/PATCH /admin/settings
   */
  updateSettings: asyncHandler(async (req, res) => {
    const validated = updateSettingsSchema.parse(req.body)
    const settings = await settingsService.updateSettings(validated, {
      actorId: req.user._id,
      ip: req.ip,
    })
    return ok(res, settings)
  }),

  /**
   * PUT/PATCH /settings/shipping-rates
   * PUT/PATCH /admin/settings/shipping-rates
   */
  updateShippingRates: asyncHandler(async (req, res) => {
    const validated = updateShippingRatesSchema.parse(req.body)
    const rates = await settingsService.updateShippingRates(validated, {
      actorId: req.user._id,
      ip: req.ip,
    })
    return ok(res, rates)
  }),
}

export default settingsController
