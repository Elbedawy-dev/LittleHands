import mongoose from 'mongoose'
import { env } from '../config/env.js'

let isConnected = false

export async function connectDB(uri = env.MONGODB_URI) {
  if (isConnected || mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (process.env.NODE_ENV !== 'test') {
    if (!uri || (!uri.startsWith('mongodb+srv://') && !uri.includes('.mongodb.net'))) {
      throw new Error('[FATAL] R1 VIOLATION: MONGODB_URI must be a MongoDB Atlas URI (starts with mongodb+srv:// or host ends with .mongodb.net)!')
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    })
    isConnected = true
    return conn
  } catch (error) {
    console.error('[DATABASE] Failed to connect to MongoDB:', error.message)
    throw error
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
    isConnected = false
  }
}

export default { connectDB, disconnectDB }

