import { earningsService } from './service.js'
import { periodQuerySchema, sellerEarningsQuerySchema, payoutsQuerySchema } from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, paginated } from '../../utils/response.js'

/** Thin controllers: validate, call the service, shape the envelope. */
export const earningsController = {
  /** GET /earnings/seller/overview?period=week|month (the caller's own data only) */
  getSellerOverview: asyncHandler(async (req, res) => {
    const { period } = periodQuerySchema.parse(req.query)
    return ok(res, await earningsService.getSellerOverview(req.user._id, period))
  }),

  /** GET /earnings/seller/earnings */
  getSellerEarnings: asyncHandler(async (req, res) => {
    const query = sellerEarningsQuerySchema.parse(req.query)
    return ok(res, await earningsService.getSellerEarnings(req.user._id, query))
  }),

  /** GET /earnings/admin?period=week|month */
  getAdminOverview: asyncHandler(async (req, res) => {
    const { period } = periodQuerySchema.parse(req.query)
    return ok(res, await earningsService.getAdminOverview(period))
  }),

  /** GET /earnings/sellers */
  getSellersEarnings: asyncHandler(async (_req, res) => {
    return ok(res, await earningsService.getSellersEarnings())
  }),

  /**
   * GET /earnings/seller/payouts and /earnings/payouts
   * A seller is ALWAYS scoped to herself; a sellerId query from a seller is ignored.
   */
  getPayouts: asyncHandler(async (req, res) => {
    const query = payoutsQuerySchema.parse(req.query)
    const sellerId = req.user.role === 'seller' ? req.user._id.toString() : query.sellerId
    const result = await earningsService.getPayouts({ ...query, sellerId })
    return paginated(res, result)
  }),
}

export default earningsController
