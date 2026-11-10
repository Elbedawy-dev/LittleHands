import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const customRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    nurseryName: {
      type: String,
      trim: true,
      default: '',
    },
    details: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'pending', 'contacted', 'closed'],
      default: 'new',
      index: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

customRequestSchema.plugin(toJSONPlugin)

export const CustomRequest =
  mongoose.models.CustomRequest || mongoose.model('CustomRequest', customRequestSchema)
export default CustomRequest

