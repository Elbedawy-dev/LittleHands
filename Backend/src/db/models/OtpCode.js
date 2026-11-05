import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const otpCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['verify_email', 'reset_password'],
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL index
    },
    attempts: {
      type: Number,
      default: 0,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

otpCodeSchema.plugin(toJSONPlugin)

export const OtpCode = mongoose.models.OtpCode || mongoose.model('OtpCode', otpCodeSchema)
export default OtpCode

