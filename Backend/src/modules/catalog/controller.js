import { catalogService } from './service.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, paginated } from '../../utils/response.js'

export const catalogController = {
  getCategories: asyncHandler(async (req, res) => {
    const categories = await catalogService.getCategories()
    return ok(res, categories)
  }),

  getProducts: asyncHandler(async (req, res) => {
    const result = await catalogService.getProducts(req.query)
    return paginated(res, result)
  }),

  getProduct: asyncHandler(async (req, res) => {
    const product = await catalogService.getProduct(req.params.id, req.user)
    return ok(res, product)
  }),

  getFeaturedProducts: asyncHandler(async (req, res) => {
    const products = await catalogService.getFeaturedProducts(req.query.limit)
    return ok(res, products)
  }),

  getRelatedProducts: asyncHandler(async (req, res) => {
    const products = await catalogService.getRelatedProducts(req.params.id, req.query.limit)
    return ok(res, products)
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const category = await catalogService.updateCategory(req.params.id || req.params.slug, req.body)
    return ok(res, category)
  }),

  reorderCategories: asyncHandler(async (req, res) => {
    const categories = await catalogService.reorderCategories(req.body)
    return ok(res, categories)
  }),
}

export default catalogController
