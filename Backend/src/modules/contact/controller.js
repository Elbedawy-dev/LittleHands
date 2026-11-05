import { contactService } from './service.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created, paginated } from '../../utils/response.js'

export const contactController = {
  sendCustomRequest: asyncHandler(async (req, res) => {
    const request = await contactService.sendCustomRequest(req.body)
    return created(res, request)
  }),

  getCustomRequests: asyncHandler(async (req, res) => {
    const result = await contactService.getCustomRequests(req.query)
    return paginated(res, result)
  }),

  updateCustomRequestStatus: asyncHandler(async (req, res) => {
    const request = await contactService.updateCustomRequestStatus(
      req.params.id,
      req.body.status
    )
    return ok(res, request)
  }),
}

export default contactController
