import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const payoutSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    note: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

payoutSchema.index({ sellerId: 1, createdAt: -1 })
payoutSchema.index(
  { sellerId: 1, reference: 1 },
  {
    unique: true,
    partialFilterExpression: {
      reference: { $type: 'string', $gt: '' },
    },
  }
)

payoutSchema.plugin(toJSONPlugin)

export const Payout = mongoose.models.Payout || mongoose.model('Payout', payoutSchema)
export default Payout

