import { adminService } from './service.js'
import {
  adminCustomersQuerySchema,
  adminOverviewQuerySchema,
  adminSellerOrdersQuerySchema,
  adminPayoutsQuerySchema,
  recordPayoutSchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from './schemas.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created } from '../../utils/response.js'

export const adminController = {
  /**
   * GET /admin/customers?q
   */
  getCustomers: asyncHandler(async (req, res) => {
    const query = adminCustomersQuerySchema.parse(req.query)
    const result = await adminService.getCustomers(query)
    return ok(res, result)
  }),

  /**
   * GET /admin/overview?period
   */
  getOverview: asyncHandler(async (req, res) => {
    const { period } = adminOverviewQuerySchema.parse(req.query)
    const overview = await adminService.getOverview(period)
    return ok(res, overview)
  }),

  /**
   * GET /admin/sellers/earnings
   */
  getSellersEarnings: asyncHandler(async (_req, res) => {
    const earnings = await adminService.getSellersEarnings()
    return ok(res, earnings)
  }),

  /**
   * GET /admin/sellers/:id/orders
   */
  getSellerOrdersDrilldown: asyncHandler(async (req, res) => {
    const { id } = req.params
    const query = adminSellerOrdersQuerySchema.parse(req.query)
    const drilldown = await adminService.getSellerOrdersDrilldown(id, query)
    return ok(res, drilldown)
  }),

  /**
   * GET /admin/payouts?sellerId
   */
  getPayouts: asyncHandler(async (req, res) => {
    const query = adminPayoutsQuerySchema.parse(req.query)
    const payouts = await adminService.getPayouts(query)
    return ok(res, payouts)
  }),

  /**
   * POST /admin/payouts
   */
  recordPayout: asyncHandler(async (req, res) => {
    const validated = recordPayoutSchema.parse(req.body)
    const payout = await adminService.recordPayout({
      ...validated,
      recordedBy: req.user._id,
      ip: req.ip,
    })
    return created(res, payout)
  }),

  /**
   * PATCH/PUT /admin/categories/:id or :slug
   */
  updateCategory: asyncHandler(async (req, res) => {
    const idOrSlug = req.params.slug || req.params.id
    const validated = updateCategorySchema.parse(req.body)
    const category = await adminService.updateCategory(idOrSlug, validated)
    return ok(res, category)
  }),

  /**
   * PUT /admin/categories/reorder or /admin/categories/order
   */
  reorderCategories: asyncHandler(async (req, res) => {
    let list
    if (Array.isArray(req.body)) {
      list = req.body
    } else {
      const parsed = reorderCategoriesSchema.safeParse(req.body)
      list = parsed.success ? parsed.data.ids : (req.body.ids || req.body.slugs || [])
    }
    const categories = await adminService.reorderCategories(list)
    return ok(res, categories)
  }),
}

export default adminController
