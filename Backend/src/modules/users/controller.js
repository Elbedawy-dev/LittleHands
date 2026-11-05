import { userService } from './service.js'
import { toUserProfileDTO } from './dto.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { created, ok } from '../../utils/response.js'

export const userController = {
  getProfile: asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.userId)
    return ok(res, { user: toUserProfileDTO(user) })
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.userId, req.body)
    return ok(res, { user: toUserProfileDTO(user) })
  }),

  changePassword: asyncHandler(async (req, res) => {
    const currentRefreshToken = req.cookies?.lh_rt
    await userService.changePassword(
      req.userId,
      req.body.current,
      req.body.next,
      currentRefreshToken
    )
    return ok(res, { message: 'Password changed successfully' })
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    const result = await userService.uploadAvatar(req.userId, req.file)
    return ok(res, {
      avatar: result.avatar,
      user: toUserProfileDTO(result.user),
    })
  }),

  getFavorites: asyncHandler(async (req, res) => {
    const items = await userService.getFavorites(
      req.userId,
      req.user?.role || 'customer'
    )
    return ok(res, { items, total: items.length })
  }),

  toggleFavorite: asyncHandler(async (req, res) => {
    const result = await userService.toggleFavorite(
      req.userId,
      req.params.productId
    )
    return ok(res, result)
  }),

  getAddresses: asyncHandler(async (req, res) => {
    const items = await userService.getAddresses(req.userId)
    return ok(res, { items, total: items.length })
  }),

  saveAddress: asyncHandler(async (req, res) => {
    const address = await userService.saveAddress(req.userId, req.body)
    return created(res, { address })
  }),

  updateAddress: asyncHandler(async (req, res) => {
    const address = await userService.updateAddress(
      req.userId,
      req.params.id,
      req.body
    )
    return ok(res, { address })
  }),

  deleteAddress: asyncHandler(async (req, res) => {
    const result = await userService.deleteAddress(req.userId, req.params.id)
    return ok(res, result)
  }),

  updateNotificationPrefs: asyncHandler(async (req, res) => {
    const notificationPrefs = await userService.updateNotificationPrefs(
      req.userId,
      req.body
    )
    return ok(res, { notificationPrefs })
  }),

  updateSellerProfile: asyncHandler(async (req, res) => {
    const user = await userService.updateSellerProfile(req.userId, req.body)
    return ok(res, { user: toUserProfileDTO(user) })
  }),

  createSeller: asyncHandler(async (req, res) => {
    const result = await userService.createSeller(req.userId, req.body, {
      ip: req.ip,
    })
    return created(res, {
      user: toUserProfileDTO(result.seller, 'admin'),
      tempPassword: result.tempPassword,
    })
  }),

  updateUserStatus: asyncHandler(async (req, res) => {
    const user = await userService.updateUserStatus(
      req.userId,
      req.params.id,
      req.body.status,
      { ip: req.ip }
    )
    return ok(res, { user: toUserProfileDTO(user, 'admin') })
  }),

  getSellerAccounts: asyncHandler(async (req, res) => {
    const sellers = await userService.getSellerAccounts()
    return ok(res, {
      items: sellers.map((s) => toUserProfileDTO(s, 'admin')),
      total: sellers.length,
    })
  }),
}

export default userController
