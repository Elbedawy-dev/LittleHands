import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const shippingZoneRateSchema = new mongoose.Schema(
  {
    zone: { type: String, required: true },
    price: { type: Number, required: true },
    governorates: [{ type: String }],
  },
  { _id: false }
)

const settingSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'platform_settings',
      unique: true,
    },
    commissionRate: {
      type: Number,
      default: 0.20,
    },
    platformWallet: {
      type: String,
      default: '',
    },
    shippingRates: [shippingZoneRateSchema],
    deliveryTimeText: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        ar: 'التوصيل خلال ٢-٤ أيام عمل',
        en: 'Delivery within 2-4 business days',
      }),
    },
    supportPhone: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: '',
    },
    whatsappNumber: {
      type: String,
      default: '',
    },
    payoutScheduleText: {
      type: String,
      default: '',
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    notifications: {
      orderCreated: { type: Boolean, default: true },
      paymentSubmitted: { type: Boolean, default: true },
      payoutRecorded: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
)

settingSchema.plugin(toJSONPlugin)

export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema)
export default Setting

