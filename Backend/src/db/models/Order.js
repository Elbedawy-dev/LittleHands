import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: {
      type: mongoose.Schema.Types.Mixed, // { ar: string, en: string } snapshot
      required: true,
    },
    image: {
      type: mongoose.Schema.Types.Mixed, // { key, url } or url string
      default: '',
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    commissionRate: {
      type: Number,
      required: true,
      default: 0.20,
    },
    commissionAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    sellerNet: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
)

const deliverySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    governorate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    nurseryName: { type: String, trim: true, default: '' },
  },
  { _id: false }
)

const sellerFulfillmentSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'shipped'],
      default: 'pending',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

const timelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    title: { type: String, default: '' },
    at: { type: Date, default: Date.now },
    timestamp: { type: Date, default: Date.now }, // Frontend compatibility
    byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    delivery: {
      type: deliverySchema,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'payment_confirmed',
        'preparing',
        'shipped',
        'delivered',
        'payment_rejected',
        'cancelled',
      ],
      default: 'pending_payment',
      index: true,
    },
    sellerFulfillment: [sellerFulfillmentSchema],
    timeline: [timelineEntrySchema],
    cancelReason: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for customer orders, multi-seller item fulfillment, and status filtering
orderSchema.index({ customerId: 1, createdAt: -1 })
orderSchema.index({ 'items.sellerId': 1, status: 1, createdAt: -1 })
orderSchema.index({ status: 1, createdAt: -1 })

orderSchema.plugin(toJSONPlugin)

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
export default Order

