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
import path from 'node:path'
import { authenticate, authorize } from '../middlewares/auth.js'
import { csrfGuard } from '../middlewares/csrfGuard.js'
import { storage } from '../infra/storage/index.js'
import { audit } from '../infra/audit/index.js'
import { jobs } from '../jobs/index.js'
import { Payment } from '../db/models/Payment.js'
import { Order } from '../db/models/Order.js'
import { Upload } from '../db/models/Upload.js'
import { AppError } from '../utils/appError.js'
import { ok } from '../utils/response.js'

const router = Router()

/**
 * Health check endpoint
 * Reports API status and MongoDB connection state
 */
router.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1
  const statusCode = isDbConnected ? 200 : 503
  return res.status(statusCode).json({
    success: isDbConnected,
    data: {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      database: isDbConnected ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
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

// Private file streaming with strict object-level authorization (IDOR protection)
router.get('/files/:key', authenticate, async (req, res, next) => {
  try {
    const rawKey = req.params.key
    const safeKey = path.basename(rawKey)
    const currentUser = req.user

    // Admin has access to all private files
    if (currentUser.role === 'admin') {
      return storage.streamPrivate(safeKey, res)
    }

    // Check if key is a payment screenshot
    const payment = await Payment.findOne({ 'screenshot.key': safeKey })
    if (payment) {
      const order = await Order.findById(payment.orderId)
      if (order && order.customerId.toString() === currentUser._id.toString()) {
        return storage.streamPrivate(safeKey, res)
      }
      return next(new AppError('RECEIPT_NOT_FOUND', 404))
    }

    // Check upload owner
    const upload = await Upload.findOne({ key: safeKey })
    if (upload && upload.ownerId && upload.ownerId.toString() === currentUser._id.toString()) {
      return storage.streamPrivate(safeKey, res)
    }

    return next(new AppError('FILE_NOT_FOUND', 404))
  } catch (err) {
    next(err)
  }
})

const ALLOWED_JOBS = [
  'cancelExpiredOrders',
  'pendingPaymentReminder',
  'retryFailedEmails',
  'cleanupOrphanUploads',
]

// Admin job trigger: admin-only, CSRF protected, whitelist validated, audited
router.post('/jobs/run/:jobName', authenticate, authorize('admin'), csrfGuard, async (req, res, next) => {
  try {
    const { jobName } = req.params
    if (!ALLOWED_JOBS.includes(jobName) || typeof jobs.jobHandlers?.[jobName] !== 'function') {
      return next(new AppError('NOT_FOUND', 404, `Unknown or unauthorized job: ${jobName}`))
    }

    const result = await jobs.jobHandlers[jobName]()
    await audit.log(
      req.user._id,
      'JOB_RUN_TRIGGERED',
      'Job',
      jobName,
      { jobName, result: result || { success: true } },
      req.ip
    )

    return ok(res, result || { success: true })
  } catch (err) {
    next(err)
  }
})

export default router

