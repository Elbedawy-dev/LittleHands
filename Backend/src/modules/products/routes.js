import { Router } from 'express'
import multer from 'multer'
import { productController } from './controller.js'
import { catalogController } from '../catalog/controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import {
  productMutationSchema,
  productUpdateSchema,
  publishProductSchema,
  manageableProductsQuerySchema,
} from './schemas.js'
import { productListQuerySchema } from '../catalog/schemas.js'

const router = Router()

// Multer memory storage configuration for in-memory Sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6,
  },
})

// Manageable products list for Sellers and Admins
router.get(
  '/manage',
  authenticate,
  authorize('seller', 'admin'),
  validate({ query: manageableProductsQuerySchema }),
  productController.getManageableProducts
)
router.get(
  '/manage/products',
  authenticate,
  authorize('seller', 'admin'),
  validate({ query: manageableProductsQuerySchema }),
  productController.getManageableProducts
)

// Image uploads
router.post(
  '/manage/products/images',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  upload.array('images', 6),
  productController.uploadImages
)
router.post(
  '/upload-images',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  upload.array('images', 6),
  productController.uploadImages
)
router.post(
  '/images',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  upload.array('images', 6),
  productController.uploadImages
)

// Manageable product mutations
router.post(
  '/manage/products',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(productMutationSchema),
  productController.createProduct
)
router.patch(
  '/manage/products/:id',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(productUpdateSchema),
  productController.updateProduct
)
router.delete(
  '/manage/products/:id',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  productController.deleteProduct
)
router.patch(
  '/manage/products/:id/publish',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(publishProductSchema),
  productController.setPublished
)

// Base mutations
router.post(
  '/',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(productMutationSchema),
  productController.createProduct
)
router.patch(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(productUpdateSchema),
  productController.updateProduct
)
router.delete(
  '/:id',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  productController.deleteProduct
)
router.patch(
  '/:id/publish',
  authenticate,
  authorize('seller', 'admin'),
  csrfGuard,
  validate(publishProductSchema),
  productController.setPublished
)

// Public discovery endpoints when accessed via /api/v1/products
router.get('/featured', catalogController.getFeaturedProducts)
router.get('/:id/related', catalogController.getRelatedProducts)
router.get('/:id', catalogController.getProduct)
router.get('/', validate({ query: productListQuerySchema }), catalogController.getProducts)

export default router
