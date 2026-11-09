import { env } from '../src/config/env.js'
import { connectDB } from '../src/db/connection.js'
import { createApp } from '../src/app.js'

const app = createApp()

export default async function handler(req, res) {
  try {
    await connectDB(env.MONGODB_URI)
    return app(req, res)
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } })
  }
}