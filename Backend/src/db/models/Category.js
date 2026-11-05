import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    descriptionAr: {
      type: String,
      trim: true,
      default: '',
    },
    descriptionEn: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      default: '#4DB6FF',
    },
    bgColor: {
      type: String,
      default: 'rgba(77, 182, 255, 0.15)',
    },
    textColor: {
      type: String,
      default: '#0B72B9',
    },
    icon: {
      type: String,
      default: 'BookOpen',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

categorySchema.plugin(toJSONPlugin)

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)
export default Category

