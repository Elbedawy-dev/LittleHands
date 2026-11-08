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

// Admin accounts: POST /admin/sellers, GET /admin/sellers/accounts, PATCH /admin/users/:id/status
router.post('/sellers', csrfGuard, validate(createSellerSchema), userController.createSeller)
router.get('/sellers/accounts', userController.getSellerAccounts)
router.patch('/users/:id/status', csrfGuard, validate(updateUserStatusSchema), userController.updateUserStatus)

// Customers overview & list: GET /admin/customers
router.get('/customers', adminController.getCustomers)

// Dashboard analytics overview: GET /admin/overview
router.get('/overview', adminController.getOverview)

// Sellers earnings & drilldown: GET /admin/sellers/earnings, GET /admin/sellers/:id/orders
router.get('/sellers/earnings', adminController.getSellersEarnings)
router.get('/sellers/:id/orders', adminController.getSellerOrdersDrilldown)

// Payouts management: GET /admin/payouts, POST /admin/payouts
router.get('/payouts', adminController.getPayouts)
router.post('/payouts', csrfGuard, adminController.recordPayout)

// Settings management: PUT /admin/settings, PUT /admin/settings/shipping-rates
router.put('/settings', csrfGuard, settingsController.updateSettings)
router.put('/settings/shipping-rates', csrfGuard, settingsController.updateShippingRates)

// Categories management: PUT /admin/categories/:slug, PUT /admin/categories/order
router.put('/categories/order', csrfGuard, validate(reorderCategoriesSchema), adminController.reorderCategories)
router.put('/categories/:slug', csrfGuard, validate(updateCategorySchema), adminController.updateCategory)

// Custom Requests: GET /admin/custom-requests, PATCH /admin/custom-requests/:id
router.get('/custom-requests', validate({ query: customRequestQuerySchema }), contactController.getCustomRequests)
router.patch('/custom-requests/:id', csrfGuard, validate(updateCustomRequestStatusSchema), contactController.updateCustomRequestStatus)

export default router
