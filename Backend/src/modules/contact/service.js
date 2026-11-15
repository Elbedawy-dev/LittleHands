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
  async sendCustomRequest(data, customerId = null) {
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
      customerId: customerId || null,
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
  async updateCustomRequestStatus(id, status, { actorId = null } = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const request = await CustomRequest.findById(id)
    if (!request) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (request.status === 'closed') {
      throw new AppError('CUSTOM_REQUEST_LOCKED', 409, {
        ar: 'لا يمكن تغيير حالة طلب مكتمل',
        en: 'Cannot change the status of a completed request',
      })
    }

    if (status === 'new') {
      request.claimedBy = null
      request.claimedAt = null
    }
    if (status === 'closed' && !request.closedAt) {
      request.closedAt = new Date()
    }
    request.status = status
    await request.save()
    if (request.claimedBy) {
      await request.populate('claimedBy', 'name seller.displayName')
    }

    if (actorId) {
      eventBus.emit(EVENT_TYPES.ACTOR_ACTION, {
        userId: actorId,
        role: 'admin',
        actionKey: `admin.custom_request.status:${request._id}:${status}`,
        title: {
          ar: 'تم تحديث حالة طلب تفصيل',
          en: 'Custom request status updated',
        },
        message: {
          ar: `تم تحديث حالة طلب التفصيل الخاص بـ "${request.name}".`,
          en: `Updated status of custom request from "${request.name}".`,
        },
        link: '/admin/custom-requests',
      })
    }

    return toCustomRequestDTO(request)
  },

  /**
   * Deletes a custom request (Admin only).
   */
  async deleteCustomRequest(id, { actorId = null } = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const request = await CustomRequest.findByIdAndDelete(id)
    if (!request) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (actorId) {
      eventBus.emit(EVENT_TYPES.ACTOR_ACTION, {
        userId: actorId,
        role: 'admin',
        actionKey: `admin.custom_request.delete:${id}`,
        title: {
          ar: 'تم حذف طلب تفصيل',
          en: 'Custom request deleted',
        },
        message: {
          ar: `تم حذف طلب التفصيل الخاص بـ "${request.name}".`,
          en: `Deleted custom request from "${request.name}".`,
        },
        link: '/admin/custom-requests',
      })
    }

    return { id, success: true }
  },
}

export default contactService
