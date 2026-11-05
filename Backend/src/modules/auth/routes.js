import { Router } from 'express'
import { authController } from './controller.js'
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendCodeSchema,
  changePasswordSchema,
} from './schemas.js'
import { authenticate } from '../../middlewares/auth.js'
import { validate } from '../../middlewares/validate.js'
import { authLimiter, otpLimiter, passwordResetLimiter } from '../../middlewares/rateLimiter.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { AppError } from '../../utils/appError.js'

const router = Router()

function authenticateOrEmail(req, res, next) {
  authenticate(req, res, (err) => {
    if (!err && req.user) return next()
    if (req.body && req.body.email) return next()
    return next(new AppError('UNAUTHENTICATED', 401))
  })
}

router.post('/register', authLimiter, csrfGuard, validate(registerSchema), authController.register)
router.post('/login', authLimiter, csrfGuard, validate(loginSchema), authController.login)
router.post('/logout', csrfGuard, authController.logout)
router.post('/refresh', csrfGuard, authController.refresh)
router.get('/me', authenticate, authController.me)
router.post('/forgot-password', passwordResetLimiter, csrfGuard, validate(forgotPasswordSchema), authController.forgotPassword)
router.post('/reset-password', passwordResetLimiter, csrfGuard, validate(resetPasswordSchema), authController.resetPassword)
router.post('/verify-email', otpLimiter, authenticateOrEmail, csrfGuard, validate(verifyEmailSchema), authController.verifyEmail)
router.post('/resend-code', otpLimiter, authenticateOrEmail, csrfGuard, validate(resendCodeSchema), authController.resendCode)
router.post('/change-password', authenticate, csrfGuard, validate(changePasswordSchema), authController.changePassword)

export default router
