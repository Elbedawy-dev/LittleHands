import { Router } from 'express'
import { adminController } from './controller.js'
import { settingsController } from '../settings/controller.js'
import { userController } from '../users/controller.js'
import { contactController } from '../contact/controller.js'
import { validate } from '../../middlewares/validate.js'
import { createSellerSchema, updateUserStatusSchema } from '../users/schemas.js'
import { updateCategorySchema, reorderCategoriesSchema } from '../catalog/schemas.js'
import { updateCustomRequestStatusSchema, customRequestQuerySchema } from '../contact/schemas.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()

// All routes here strictly require admin authentication
router.use(authenticate, authorize('admin'))

// Seller Accounts & Status Management (B1)
router.post('/sellers', csrfGuard, validate(createSellerSchema), userController.createSeller)
router.get('/sellers/accounts', userController.getSellerAccounts)
router.patch('/users/:id/status', csrfGuard, validate(updateUserStatusSchema), userController.updateUserStatus)

// Customers overview & list (B4)
router.get('/customers', adminController.getCustomers)

// Dashboard analytics overview (B4)
router.get('/overview', adminController.getOverview)

// Sellers earnings & drilldown (B4)
router.get('/sellers/earnings', adminController.getSellersEarnings)
router.get('/sellers/:id/orders', adminController.getSellerOrdersDrilldown)

// Payouts management (B4)
router.get('/payouts', adminController.getPayouts)
router.post('/payouts', csrfGuard, adminController.recordPayout)

// Settings management under /admin (B4)
router.get('/settings', settingsController.getSettings)
router.put('/settings', csrfGuard, settingsController.updateSettings)
router.patch('/settings', csrfGuard, settingsController.updateSettings)

router.get('/settings/shipping-rates', settingsController.getShippingRates)
router.put('/settings/shipping-rates', csrfGuard, settingsController.updateShippingRates)
router.patch('/settings/shipping-rates', csrfGuard, settingsController.updateShippingRates)

// Categories management (B2)
router.patch('/categories/:id', csrfGuard, validate(updateCategorySchema), adminController.updateCategory)
router.put('/categories/:slug', csrfGuard, validate(updateCategorySchema), adminController.updateCategory)
router.put('/categories/reorder', csrfGuard, validate(reorderCategoriesSchema), adminController.reorderCategories)
router.put('/categories/order', csrfGuard, validate(reorderCategoriesSchema), adminController.reorderCategories)

// Custom Requests (B2)
router.get('/custom-requests', validate({ query: customRequestQuerySchema }), contactController.getCustomRequests)
router.patch('/custom-requests/:id', csrfGuard, validate(updateCustomRequestStatusSchema), contactController.updateCustomRequestStatus)

export default router
