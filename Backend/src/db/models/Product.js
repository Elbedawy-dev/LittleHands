import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const localizedStringSchema = new mongoose.Schema(
  {
    ar: { type: String, required: true, trim: true },
    en: { type: String, default: '', trim: true },
  },
  { _id: false }
)

const productDetailsSchema = new mongoose.Schema(
  {
    material: {
      ar: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    size: {
      ar: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    usage: {
      ar: { type: String, default: '' },
      en: { type: String, default: '' },
    },
    care: {
      ar: { type: String, default: '' },
      en: { type: String, default: '' },
    },
  },
  { _id: false }
)

const productImageSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    url: { type: String, required: true },
  },
  { _id: false }
)

const productSchema = new mongoose.Schema(
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
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: localizedStringSchema,
      required: true,
    },
    nameEn: {
      type: String,
      default: '',
    },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: localizedStringSchema,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      default: 10,
      min: 0,
    },
    stage: {
      type: String,
      default: 'nursery',
    },
    stages: [{ type: String }],
    materials: [{ type: String }],
    details: {
      type: productDetailsSchema,
      default: () => ({}),
    },
    images: [productImageSchema],
    published: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    searchText: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

productSchema.plugin(toJSONPlugin)

// Text index for search
productSchema.index({
  'name.ar': 'text',
  'name.en': 'text',
  'description.ar': 'text',
  'description.en': 'text',
  searchText: 'text',
})

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
export default Product

