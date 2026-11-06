import { adminService } from './service.js'
import {
  adminCustomersQuerySchema,
  adminOverviewQuerySchema,
  adminPayoutsQuerySchema,
  adminSellerOrdersParamsSchema,
  adminSellerOrdersQuerySchema,
  recordPayoutSchema,
} from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created, paginated } from '../../utils/response.js'

export const adminController = {
  /** GET /admin/customers?q&governorate&page&pageSize */
  getCustomers: asyncHandler(async (req, res) => {
    const query = adminCustomersQuerySchema.parse(req.query)
    return paginated(res, await adminService.getCustomers(query))
  }),

  /** GET /admin/overview?period=week|month */
  getOverview: asyncHandler(async (req, res) => {
    const { period } = adminOverviewQuerySchema.parse(req.query)
    return ok(res, await adminService.getOverview(period))
  }),

  /** GET /admin/sellers/earnings */
  getSellersEarnings: asyncHandler(async (_req, res) => {
    return ok(res, await adminService.getSellersEarnings())
  }),

  /** GET /admin/sellers/:id/orders */
  getSellerOrdersDrilldown: asyncHandler(async (req, res) => {
    const { id } = adminSellerOrdersParamsSchema.parse(req.params)
    const query = adminSellerOrdersQuerySchema.parse(req.query)
    return paginated(res, await adminService.getSellerOrdersDrilldown(id, query))
  }),

  /** GET /admin/payouts?sellerId&page&pageSize */
  getPayouts: asyncHandler(async (req, res) => {
    const query = adminPayoutsQuerySchema.parse(req.query)
    return paginated(res, await adminService.getPayouts(query))
  }),

  /** POST /admin/payouts {sellerId, amount, reference, date, note} */
  recordPayout: asyncHandler(async (req, res) => {
    const data = recordPayoutSchema.parse(req.body)
    const payout = await adminService.recordPayout(data, {
      actorId: req.user._id,
      ip: req.ip,
    })
    return created(res, payout)
  }),

  /** Category handlers: bodies are already validated by the catalog schemas on the route. */
  updateCategory: asyncHandler(async (req, res) => {
    const idOrSlug = req.params.slug || req.params.id
    return ok(res, await adminService.updateCategory(idOrSlug, req.body))
  }),

  reorderCategories: asyncHandler(async (req, res) => {
    const list = Array.isArray(req.body)
      ? req.body
      : req.body.slugs || req.body.ids || []
    return ok(res, await adminService.reorderCategories(list))
  }),
}

export default adminController
