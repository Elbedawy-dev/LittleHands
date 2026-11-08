import { Router } from 'express'
import multer from 'multer'
import { productController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import {
  productMutationSchema,
  productUpdateSchema,
  publishProductSchema,
  manageableProductsQuerySchema,
} from './schemas.js'

const router = Router()

// Multer memory storage configuration for in-memory Sharp processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6,
  },
})

// Canonical routes:
// product management: GET /products/manage/products, POST /products/manage/products, PATCH /products/manage/products/:id, DELETE /products/manage/products/:id, PATCH /products/manage/products/:id/publish, POST /products/manage/products/images

// Manageable products list for Sellers and Admins
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

export default router
