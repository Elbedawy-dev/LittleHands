import { Router } from 'express'
import { catalogController } from './controller.js'
import { validate } from '../../middlewares/validate.js'
import { productListQuerySchema } from './schemas.js'

const router = Router()

// Categories
router.get('/categories', catalogController.getCategories)

// Public Products Discovery
router.get('/products', validate({ query: productListQuerySchema }), catalogController.getProducts)
router.get('/products/featured', catalogController.getFeaturedProducts)
router.get('/products/:id', catalogController.getProduct)
router.get('/products/:id/related', catalogController.getRelatedProducts)

export default router
