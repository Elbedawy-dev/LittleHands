import { Router } from 'express'
import multer from 'multer'
import { userController } from './controller.js'
import {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  notificationPrefsSchema,
} from './schemas.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

// Canonical routes:
// users: GET /users/me, PATCH /users/me, POST /users/me/avatar, GET /users/me/favorites, POST /users/me/favorites/:productId,
//        GET /users/me/addresses, POST /users/me/addresses, PUT /users/me/addresses/:id, DELETE /users/me/addresses/:id, PATCH /users/me/notification-prefs

// Profile & me
router.get('/me', authenticate, userController.getProfile)
router.patch('/me', authenticate, csrfGuard, validate(updateProfileSchema), userController.updateProfile)

// Avatar upload
router.post('/me/avatar', authenticate, csrfGuard, upload.single('avatar'), userController.uploadAvatar)

// Favorites (customer & admin)
router.get('/me/favorites', authenticate, authorize('customer', 'admin'), userController.getFavorites)
router.post('/me/favorites/:productId', authenticate, authorize('customer', 'admin'), csrfGuard, userController.toggleFavorite)

// Addresses (customer & admin)
router.get('/me/addresses', authenticate, authorize('customer', 'admin'), userController.getAddresses)
router.post('/me/addresses', authenticate, authorize('customer', 'admin'), csrfGuard, validate(addressSchema), userController.saveAddress)
router.put('/me/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, validate(updateAddressSchema), userController.updateAddress)
router.delete('/me/addresses/:id', authenticate, authorize('customer', 'admin'), csrfGuard, userController.deleteAddress)

// Notification Preferences
router.patch('/me/notification-prefs', authenticate, csrfGuard, validate(notificationPrefsSchema), userController.updateNotificationPrefs)

export default router
