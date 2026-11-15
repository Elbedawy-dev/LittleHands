import mongoose from 'mongoose'
import { env } from '../config/env.js'

let isConnected = false
let connectionPromise = null

export async function connectDB(uri = env.MONGODB_URI, mongooseClient = mongoose) {
  if (
    mongooseClient.connection.readyState === 1 ||
    (isConnected && mongooseClient.connection.readyState === 1)
  ) {
    return mongooseClient.connection
  }

  if (process.env.NODE_ENV !== 'test') {
    if (!uri || (!uri.startsWith('mongodb+srv://') && !uri.includes('.mongodb.net'))) {
      throw new Error('[FATAL] R1 VIOLATION: MONGODB_URI must be a MongoDB Atlas URI (starts with mongodb+srv:// or host ends with .mongodb.net)!')
    }
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = mongooseClient
    .connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      maxPoolSize: 5,
    })
    .then((conn) => {
      isConnected = true
      return conn
    })
    .catch((error) => {
      isConnected = false
      connectionPromise = null
      console.error('[DATABASE] Failed to connect to MongoDB:', error.message)
      throw error
    })

  return connectionPromise
}

export async function disconnectDB(mongooseClient = mongoose) {
  connectionPromise = null
  isConnected = false
  if (mongooseClient.connection.readyState !== 0) {
    await mongooseClient.disconnect()
  }
}

export default { connectDB, disconnectDB }

