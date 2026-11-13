import { sellerService } from './service.js'
import { userController } from '../users/controller.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, paginated } from '../../utils/response.js'

export const sellerController = {
  getCustomRequests: asyncHandler(async (req, res) => {
    const result = await sellerService.getCustomRequests(req.user, req.query)
    return paginated(res, result)
  }),

  claimCustomRequest: asyncHandler(async (req, res) => {
    const claimed = await sellerService.claimCustomRequest(req.user, req.params.id)
    return ok(res, claimed)
  }),

  updateCustomRequestStatus: asyncHandler(async (req, res) => {
    const updated = await sellerService.updateCustomRequestStatus(req.user, req.params.id, req.body.status)
    return ok(res, updated)
  }),

  getSellers: asyncHandler(async (req, res) => {
    const sellers = await sellerService.getSellers()
    return ok(res, sellers)
  }),

  getSeller: asyncHandler(async (req, res) => {
    const seller = await sellerService.getSeller(req.params.id)
    return ok(res, seller)
  }),

  getSellerProducts: asyncHandler(async (req, res) => {
    const products = await sellerService.getSellerProducts(req.params.id)
    return ok(res, products)
  }),

  // Delegated to B1 userController
  updateSellerProfile: userController.updateSellerProfile,
  createSeller: userController.createSeller,
  updateUserStatus: userController.updateUserStatus,
}

export default sellerController
