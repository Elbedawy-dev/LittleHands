import { Router } from 'express'
import multer from 'multer'
import { userController } from './controller.js'
import {
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
  updateAddressSchema,
  notificationPrefsSchema,
  sellerProfileSchema,
  createSellerSchema,
  updateUserStatusSchema,
} from './schemas.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Profile & me
router.get('/me', authenticate, userController.getProfile)
router.get('/profile', authenticate, userController.getProfile)
router.patch('/me', authenticate, csrfGuard, validate(updateProfileSchema), userController.updateProfile)
router.patch('/profile', authenticate, csrfGuard, validate(updateProfileSchema), userController.updateProfile)

// Avatar upload
router.post('/me/avatar', authenticate, csrfGuard, upload.single('avatar'), userController.uploadAvatar)
router.post('/avatar', authenticate, csrfGuard, upload.single('avatar'), userController.uploadAvatar)

// Password change
router.put('/change-password', authenticate, csrfGuard, validate(changePasswordSchema), userController.changePassword)
router.post('/change-password', authenticate, csrfGuard, validate(changePasswordSchema), userController.changePassword)

// Favorites (customer & admin)
router.get('/me/favorites', authenticate, authorize('customer', 'admin'), userController.getFavorites)
router.get('/favorites', authenticate, authorize('customer', 'admin'), userController.getFavorites)
router.post('/me/favorites/:productId', authenticate, authorize('customer', 'admin'), csrfGuard, userController.toggleFavorite)
router.post('/favorites/:productId/toggle', authenticate, authorize('customer', 'admin'), csrfGuard, userController.toggleFavorite)

// Addresses (customer & admin)
router.get('/me/addresses', authenticate, authorize('customer', 'admin'), userController.getAddresses)
router.get('/addresses', authenticate, authorize('customer', 'admin'), userController.getAddresses)
router.post('/me/addresses', authenticate, authorize('customer', 'admin'), csrfGuard, validate(addressSchema), userController.saveAddress)
router.post('/addresses', authenticate, authorize('customer', 'admin'), csrfGuard, validate(addressSchema), userController.saveAddress)
router.put('/me/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, validate(updateAddressSchema), userController.updateAddress)
router.put('/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, validate(updateAddressSchema), userController.updateAddress)
router.delete('/me/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, userController.deleteAddress)
router.delete('/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, userController.deleteAddress)

// Notification Preferences
router.patch('/me/notification-prefs', authenticate, csrfGuard, validate(notificationPrefsSchema), userController.updateNotificationPrefs)
router.patch('/notification-prefs', authenticate, csrfGuard, validate(notificationPrefsSchema), userController.updateNotificationPrefs)

// Seller profile & Admin aliases inside users module
router.patch('/seller-profile', authenticate, authorize('seller'), csrfGuard, validate(sellerProfileSchema), userController.updateSellerProfile)
router.post('/admin/sellers', authenticate, authorize('admin'), csrfGuard, validate(createSellerSchema), userController.createSeller)
router.get('/admin/sellers/accounts', authenticate, authorize('admin'), userController.getSellerAccounts)
router.patch('/admin/:id/status', authenticate, authorize('admin'), csrfGuard, validate(updateUserStatusSchema), userController.updateUserStatus)

export default router
