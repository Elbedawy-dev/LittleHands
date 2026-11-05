import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const sellerSchema = new mongoose.Schema(
  {
    displayName: {
      ar: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    bio: {
      ar: { type: String, trim: true },
      en: { type: String, trim: true },
    },
    stages: [{ type: String, trim: true }],
    materials: [{ type: String, trim: true }],
    payoutWallet: { type: String, trim: true },
  },
  { _id: false }
)

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
      index: true,
    },
    accountType: {
      type: String,
      enum: ['parent', 'teacher', 'nursery'],
      default: 'parent',
    },
    nurseryName: {
      type: String,
      trim: true,
      default: '',
    },
    governorate: {
      type: String,
      trim: true,
      default: 'القاهرة',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      key: { type: String, default: null },
      url: { type: String, default: null },
    },
    locale: {
      type: String,
      enum: ['ar', 'en'],
      default: 'ar',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      index: true,
    },
    seller: {
      type: sellerSchema,
      default: undefined,
    },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },
    failedLoginCount: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

userSchema.plugin(toJSONPlugin)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User

