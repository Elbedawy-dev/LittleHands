import mongoose from 'mongoose'
import { AppError } from '../../utils/appError.js'

const Lock = mongoose.models.Lock || mongoose.model(
  'Lock',
  new mongoose.Schema(
    { _id: String, expiresAt: { type: Date, index: { expireAfterSeconds: 0 } } },
    { versionKey: false }
  )
)

export async function withSellerMutex(sellerId, task) {
  const key = `seller:${sellerId?.toString() || 'global'}`
  const deadline = Date.now() + 8000
  for (;;) {
    try {
      await Lock.create({ _id: key, expiresAt: new Date(Date.now() + 15000) })
      break
    } catch (e) {
      if (e.code !== 11000) throw e
      await Lock.deleteOne({ _id: key, expiresAt: { $lt: new Date() } })
      if (Date.now() > deadline) throw new AppError('CONFLICT', 409, 'Another payout is in progress')
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  try { return await task() } finally { await Lock.deleteOne({ _id: key }) }
}
export default withSellerMutex