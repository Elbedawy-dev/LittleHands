import { AuditLog } from '../../db/models/AuditLog.js'

/**
 * Fixed Audit Logging Infrastructure Interface
 */
export const audit = {
  /**
   * Logs an administrative or financial action for auditing and compliance.
   *
   * @param {string|null} actorId - ID of user performing action
   * @param {string} action - Action name (e.g. 'PAYMENT_CONFIRMED', 'PAYOUT_RECORDED')
   * @param {string} entityType - Entity type (e.g. 'Order', 'Payment', 'User')
   * @param {string|null} entityId - Target entity ID
   * @param {Object} [meta={}] - Relevant snapshot metadata
   * @param {string} [ip=''] - Client IP address
   * @returns {Promise<Object>} Created audit log document
   */
  async log(actorId, action, entityType, entityId, meta = {}, ip = '') {
    console.info(`[AUDIT_LOG] Actor: ${actorId || 'system'} | Action: ${action} | Entity: ${entityType}:${entityId}`)

    try {
      if (AuditLog && typeof AuditLog.create === 'function') {
        const entry = await AuditLog.create({
          actorId: actorId || null,
          action,
          entityType,
          entityId: entityId || null,
          meta,
          ip: ip || '',
        })
        return entry
      }
    } catch (e) {
      console.warn('[AUDIT_STUB] Failed to write AuditLog:', e.message)
    }

    return {
      actorId,
      action,
      entityType,
      entityId,
      meta,
      ip,
      createdAt: new Date().toISOString(),
    }
  },
}

export default audit

