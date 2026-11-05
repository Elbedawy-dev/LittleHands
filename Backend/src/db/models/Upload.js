import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const uploadSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['product', 'avatar', 'payment'],
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    attachedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

uploadSchema.plugin(toJSONPlugin)

export const Upload = mongoose.models.Upload || mongoose.model('Upload', uploadSchema)
export default Upload

