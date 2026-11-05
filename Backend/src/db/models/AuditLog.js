import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    ip: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

auditLogSchema.plugin(toJSONPlugin)

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)
export default AuditLog

