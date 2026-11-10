import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { beforeAll, afterAll, afterEach } from 'vitest'
import { storage } from '../../src/infra/storage/index.js'
import { env } from '../../src/config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFilePath = path.resolve(__dirname, '../../.env')

// Extract Atlas URI from Backend/.env if it exists to ensure tests NEVER touch it
let atlasUriFromEnv = ''
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8')
  const match = envContent.match(/^MONGODB_URI\s*=\s*(.*)$/m)
  if (match) {
    atlasUriFromEnv = match[1].trim()
  }
}

// Ensure test environment flags are strictly set
process.env.NODE_ENV = 'test'
process.env.STORAGE_DRIVER = 'memory'
process.env.EMAIL_DRIVER = 'console'
env.NODE_ENV = 'test'
env.STORAGE_DRIVER = 'memory'
env.EMAIL_DRIVER = 'console'
env.CLIENT_ORIGINS_ARRAY = ['http://localhost:5173', 'http://littlehands-edu.vercel.app']

let mongoServer

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 60000,
    },
  })
  const memoryUri = mongoServer.getUri()

  // HARD GUARD per R1b:
  // Assert URI is the in-memory server's URI
  // Assert URI does NOT start with mongodb+srv://
  // Assert URI is NOT equal to MONGODB_URI from Backend/.env
  if (!memoryUri || !memoryUri.startsWith('mongodb://')) {
    throw new Error('[FATAL] R1b VIOLATION: Test database URI is not an in-memory URI!')
  }
  if (memoryUri.startsWith('mongodb+srv://') || memoryUri.includes('.mongodb.net')) {
    throw new Error('[FATAL] R1b VIOLATION: Test database URI points to MongoDB Atlas!')
  }
  if (atlasUriFromEnv && memoryUri === atlasUriFromEnv) {
    throw new Error('[FATAL] R1b VIOLATION: Test database URI matches Atlas MONGODB_URI from .env!')
  }

  // Tests must override MONGODB_URI themselves
  process.env.MONGODB_URI = memoryUri
  env.MONGODB_URI = memoryUri

  await mongoose.connect(memoryUri)
}, 60000)

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections
    for (const key in collections) {
      const collection = collections[key]
      await collection.deleteMany({})
    }
  }
  storage.clearMemory()
})

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
  storage.clearMemory()
})
