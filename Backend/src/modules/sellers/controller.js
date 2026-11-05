import { sellerService } from './service.js'
import { userController } from '../users/controller.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok } from '../../utils/response.js'

export const sellerController = {
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
