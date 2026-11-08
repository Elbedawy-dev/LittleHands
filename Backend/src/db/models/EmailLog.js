import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    template: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    dedupKey: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
)

emailLogSchema.index(
  { dedupKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupKey: { $type: 'string', $gt: '' } },
  }
)

emailLogSchema.plugin(toJSONPlugin)

export const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema)
export default EmailLog

