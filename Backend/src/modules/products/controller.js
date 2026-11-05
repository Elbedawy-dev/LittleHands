import { productService } from './service.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created } from '../../utils/response.js'

export const productController = {
  getManageableProducts: asyncHandler(async (req, res) => {
    const products = await productService.getManageableProducts({
      user: req.user,
      q: req.query.q,
      status: req.query.status,
      sellerId: req.query.sellerId,
    })
    return ok(res, products)
  }),

  createProduct: asyncHandler(async (req, res) => {
    const product = await productService.createProduct({
      user: req.user,
      data: req.body,
    })
    return created(res, product)
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const product = await productService.updateProduct({
      user: req.user,
      productId: req.params.id,
      data: req.body,
    })
    return ok(res, product)
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct({
      user: req.user,
      productId: req.params.id,
    })
    return ok(res, result)
  }),

  setPublished: asyncHandler(async (req, res) => {
    const published =
      req.body.published !== undefined ? req.body.published : req.body.isPublished
    const product = await productService.setPublished({
      user: req.user,
      productId: req.params.id,
      published,
    })
    return ok(res, product)
  }),

  uploadImages: asyncHandler(async (req, res) => {
    const files = req.files || (req.file ? [req.file] : [])
    const result = await productService.uploadImages({
      user: req.user,
      files,
    })
    return ok(res, result)
  }),
}

export default productController
