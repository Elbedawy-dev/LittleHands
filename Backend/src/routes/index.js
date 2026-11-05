import { Router } from 'express'
import mongoose from 'mongoose'
import authRoutes from '../modules/auth/routes.js'
import usersRoutes from '../modules/users/routes.js'
import catalogRoutes from '../modules/catalog/routes.js'
import productsRoutes from '../modules/products/routes.js'
import sellersRoutes from '../modules/sellers/routes.js'
import contactRoutes from '../modules/contact/routes.js'
import ordersRoutes from '../modules/orders/routes.js'
import paymentsRoutes from '../modules/payments/routes.js'
import earningsRoutes from '../modules/earnings/routes.js'
import adminRoutes from '../modules/admin/routes.js'
import settingsRoutes from '../modules/settings/routes.js'
import notificationsRoutes from '../modules/notifications/routes.js'
import { authenticate, authorize } from '../middlewares/auth.js'
import { csrfGuard } from '../middlewares/csrfGuard.js'
import { storage } from '../infra/storage/index.js'
import { AppError } from '../utils/appError.js'
import { ok } from '../utils/response.js'

const router = Router()

/**
 * Health check endpoint
 * Reports API status and MongoDB connection state
 */
router.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1
  return ok(res, {
    status: 'healthy',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

// Mount feature routers under /api/v1
router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/catalog', catalogRoutes)
router.use('/products', productsRoutes)
router.use('/sellers', sellersRoutes)
router.use('/contact', contactRoutes)
router.use('/orders', ordersRoutes)
router.use('/payments', paymentsRoutes)
router.use('/earnings', earningsRoutes)
router.use('/admin', adminRoutes)
router.use('/settings', settingsRoutes)
router.use('/notifications', notificationsRoutes)

// Private file streaming (B5)
router.get('/files/:key', authenticate, (req, res) => {
  storage.streamPrivate(req.params.key, res)
})
router.post('/files/upload', authenticate, csrfGuard, (req, res, next) => {
  next(new AppError('NOT_IMPLEMENTED', 501))
})

// Job trigger (B5)
router.post('/jobs/run/:jobName', authenticate, authorize('admin'), csrfGuard, (req, res, next) => {
  next(new AppError('NOT_IMPLEMENTED', 501))
})

export default router

