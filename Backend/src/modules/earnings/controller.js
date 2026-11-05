import { earningsService } from './service.js'
import { earningsPeriodQuerySchema, sellerPayoutsQuerySchema, recordPayoutSchema } from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created } from '../../utils/response.js'

export const earningsController = {
  /**
   * GET /earnings/seller/overview
   * GET /earnings/seller
   */
  getSellerOverview: asyncHandler(async (req, res) => {
    const { period } = earningsPeriodQuerySchema.parse(req.query)
    const sellerId = req.user._id
    const overview = await earningsService.getSellerOverview(sellerId, period)
    return ok(res, overview)
  }),

  /**
   * GET /earnings/seller/earnings
   */
  getSellerEarnings: asyncHandler(async (req, res) => {
    const sellerId = req.user._id
    const earnings = await earningsService.getSellerEarnings(sellerId)
    return ok(res, earnings)
  }),

  /**
   * GET /earnings/admin
   */
  getAdminOverview: asyncHandler(async (req, res) => {
    const { period } = earningsPeriodQuerySchema.parse(req.query)
    const overview = await earningsService.getAdminOverview(period)
    return ok(res, overview)
  }),

  /**
   * GET /earnings/sellers
   */
  getSellersEarnings: asyncHandler(async (req, res) => {
    const sellersEarnings = await earningsService.getSellersEarnings()
    return ok(res, sellersEarnings)
  }),

  /**
   * GET /earnings/payouts
   * GET /earnings/seller/payouts
   */
  getPayouts: asyncHandler(async (req, res) => {
    const query = sellerPayoutsQuerySchema.parse(req.query)

    // Object-level authorization: seller only ever sees her own payouts
    let sellerId = query.sellerId
    if (req.user.role === 'seller') {
      sellerId = req.user._id.toString()
    }

    const payouts = await earningsService.getPayouts({
      sellerId,
      page: query.page,
      pageSize: query.pageSize,
    })

    return ok(res, payouts)
  }),

  /**
   * POST /earnings/payouts
   */
  recordPayout: asyncHandler(async (req, res) => {
    const validated = recordPayoutSchema.parse(req.body)
    const payout = await earningsService.recordPayout({
      ...validated,
      recordedBy: req.user._id,
      ip: req.ip,
    })
    return created(res, payout)
  }),
}

export default earningsController
