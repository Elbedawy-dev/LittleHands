import mongoose from 'mongoose'
import { CustomRequest } from '../../db/models/CustomRequest.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { AppError } from '../../utils/appError.js'
import { toCustomRequestDTO } from './dto.js'

export const contactService = {
  /**
   * Submits a public custom teaching aid request.
   * Traps bots silently if honeypot field is filled.
   */
  async sendCustomRequest(data) {
    // 1. Honeypot check
    if (data.website || data.hp || data.honeypot) {
      // Return synthetic success without storing in database or notifying admin
      return {
        id: `req_${Date.now()}`,
        name: data.name,
        phone: data.phone,
        nurseryName: data.nurseryName || '',
        details: data.details,
        status: 'new',
        createdAt: new Date().toISOString(),
      }
    }

    // 2. Persist request
    const request = await CustomRequest.create({
      name: data.name.trim(),
      phone: data.phone.trim(),
      nurseryName: (data.nurseryName || '').trim(),
      details: data.details.trim(),
      status: 'new',
    })

    // 3. Emit system event for admin notification
    eventBus.emit(EVENT_TYPES.CUSTOM_REQUEST_CREATED, { request })

    return toCustomRequestDTO(request)
  },

  /**
   * Lists custom requests for Admin review.
   */
  async getCustomRequests({ status, page = 1, pageSize = 20 } = {}) {
    const filter = {}
    if (status) {
      filter.status = status
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))
    const skip = (pageNum - 1) * limitNum

    const total = await CustomRequest.countDocuments(filter)
    const requests = await CustomRequest.find(filter)
      .populate('claimedBy', 'name seller.displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    return {
      items: requests.map(toCustomRequestDTO),
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }
  },

  /**
   * Updates status of a custom request (Admin only).
   */
  async updateCustomRequestStatus(id, status) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const request = await CustomRequest.findById(id)
    if (!request) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (status === 'new') {
      request.claimedBy = null
      request.claimedAt = null
    }
    request.status = status
    await request.save()
    if (request.claimedBy) {
      await request.populate('claimedBy', 'name seller.displayName')
    }

    return toCustomRequestDTO(request)
  },
}

export default contactService
