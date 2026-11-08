import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
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

// Compound index for user notification list and unread counts
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
notificationSchema.index(
  { dedupKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupKey: { $type: 'string', $gt: '' } },
  }
)


notificationSchema.plugin(toJSONPlugin)

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
export default Notification

