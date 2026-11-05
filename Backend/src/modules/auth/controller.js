import { authService, getCookieOptions } from './service.js'
import { toAuthUserDTO } from './dto.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { created, ok } from '../../utils/response.js'

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.cookie('lh_at', result.accessToken, getCookieOptions('access'))
    res.cookie('lh_rt', result.refreshToken, getCookieOptions('refresh'))

    return created(res, {
      user: toAuthUserDTO(result.user),
      token: result.accessToken,
    })
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login({
      identifier: req.body.identifier,
      password: req.body.password,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.cookie('lh_at', result.accessToken, getCookieOptions('access'))
    res.cookie('lh_rt', result.refreshToken, getCookieOptions('refresh'))

    return ok(res, {
      user: toAuthUserDTO(result.user),
      token: result.accessToken,
    })
  }),

  logout: asyncHandler(async (req, res) => {
    const rt = req.cookies?.lh_rt || req.body?.refreshToken
    await authService.logout(rt)

    res.clearCookie('lh_at', { path: '/' })
    res.clearCookie('lh_rt', { path: '/' })

    return ok(res, { message: 'Logged out successfully' })
  }),

  refresh: asyncHandler(async (req, res) => {
    const rt = req.cookies?.lh_rt || req.body?.refreshToken
    const result = await authService.refresh(rt, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.cookie('lh_at', result.accessToken, getCookieOptions('access'))
    res.cookie('lh_rt', result.refreshToken, getCookieOptions('refresh'))

    return ok(res, {
      user: toAuthUserDTO(result.user),
      token: result.accessToken,
    })
  }),

  me: asyncHandler(async (req, res) => {
    return ok(res, { user: toAuthUserDTO(req.user) })
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email)
    return ok(res, result)
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body)
    return ok(res, { message: 'Password has been reset successfully' })
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const result = await authService.verifyEmail({
      code: req.body.code,
      user: req.user,
      email: req.body.email,
    })
    return ok(res, {
      verified: true,
      user: toAuthUserDTO(result.user),
    })
  }),

  resendCode: asyncHandler(async (req, res) => {
    await authService.resendCode({
      user: req.user,
      email: req.body.email,
    })
    return ok(res, { message: 'Verification code resent successfully' })
  }),

  changePassword: asyncHandler(async (req, res) => {
    const currentRefreshToken = req.cookies?.lh_rt
    await authService.changePassword({
      userId: req.userId,
      current: req.body.current,
      next: req.body.next,
      currentRefreshToken,
    })
    return ok(res, { message: 'Password changed successfully' })
  }),
}

export default authController
