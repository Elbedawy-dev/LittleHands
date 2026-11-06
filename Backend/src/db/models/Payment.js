import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const screenshotSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    hash: { type: String, default: '' },
    mime: { type: String, default: '' },
    size: { type: Number, default: 0 },
    url: { type: String, default: '' },
  },
  { _id: false }
)

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    senderPhone: {
      type: String,
      required: true,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    transferredAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    screenshot: {
      type: screenshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'rejected'],
      default: 'pending',
      index: true,
    },
    flags: [{ type: String }],
    rejectReason: {
      type: String,
      default: null,
    },
    rejectNotes: {
      type: String,
      default: '',
    },
    notifyCustomer: {
      type: Boolean,
      default: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for order payment lookups and admin pending payment reviews
paymentSchema.index({ orderId: 1, attempt: -1 })
paymentSchema.index({ status: 1, submittedAt: -1 })

paymentSchema.plugin(toJSONPlugin)

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment

