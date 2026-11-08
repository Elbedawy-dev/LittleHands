import mongoose from 'mongoose'
import toJSONPlugin from '../plugins/toJSON.js'

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

counterSchema.plugin(toJSONPlugin)

/**
 * Atomically generates the next formatted order number.
 * Format: LH-{year}-{seq padded to 3 digits}
 * e.g. LH-2026-001, LH-2026-102
 *
 * @param {number} [year] - Defaults to current UTC year
 * @returns {Promise<string>} Next order number string
 */
counterSchema.statics.nextOrderNumber = async function (year = new Date().getFullYear()) {
  const key = `order_${year}`
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const counter = await this.findOneAndUpdate(
        { key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      const paddedSeq = String(counter.seq).padStart(3, '0')
      return `LH-${year}-${paddedSeq}`
    } catch (err) {
      if (err.code === 11000 && attempt < 4) {
        continue
      }
      throw err
    }
  }
}

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema)
export default Counter

