import { settingsService } from './service.js'
import { updateSettingsSchema, updateShippingRatesSchema } from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok } from '../../utils/response.js'

export const settingsController = {
  /**
   * GET /settings — shaped by the caller's role:
   * seller/admin additionally receive commissionRate + payoutScheduleText; everyone else never does.
   */
  getSettings: asyncHandler(async (req, res) => {
    const role = req.user?.role === 'admin' || req.user?.role === 'seller' ? req.user.role : 'public'
    return ok(res, await settingsService.getSettings(role))
  }),

  /** GET /settings/public — never contains commission keys. */
  getPublicSettings: asyncHandler(async (_req, res) => {
    return ok(res, await settingsService.getPublicSettings())
  }),

  /** GET /settings/shipping-rates — price map by zone; full zones in meta. */
  getShippingRates: asyncHandler(async (_req, res) => {
    const { rates, zones } = await settingsService.getShippingRates()
    return ok(res, rates, { zones })
  }),

  /** PUT /admin/settings */
  updateSettings: asyncHandler(async (req, res) => {
    const values = updateSettingsSchema.parse(req.body)
    return ok(res, await settingsService.updateSettings(values, { actorId: req.user._id, ip: req.ip }))
  }),

  /** PUT /admin/settings/shipping-rates */
  updateShippingRates: asyncHandler(async (req, res) => {
    const input = updateShippingRatesSchema.parse(req.body)
    const { rates, zones } = await settingsService.updateShippingRates(input, {
      actorId: req.user._id,
      ip: req.ip,
    })
    return ok(res, rates, { zones })
  }),
}

export default settingsController
