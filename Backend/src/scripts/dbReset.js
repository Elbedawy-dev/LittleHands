import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../db/connection.js'
import { seedBase } from './seedBase.js'
import { seedAdmin } from './seedAdmin.js'

export async function dbReset() {
  if (env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.error('[DB_RESET] ABORTED: Cannot reset database in production environment!')
    process.exit(1)
  }

  console.info('[DB_RESET] Connecting to database...')
  await connectDB(env.MONGODB_URI)

  console.warn('[DB_RESET] Dropping database collections...')
  const collections = await mongoose.connection.db.collections()
  for (const collection of collections) {
    await collection.drop().catch((err) => {
      // Ignore ns not found
      if (err.code !== 26) console.warn(`Could not drop ${collection.collectionName}:`, err.message)
    })
  }

  console.info('[DB_RESET] Database cleared. Re-seeding baseline data...')
  await seedBase()
  await seedAdmin()
  console.info('[DB_RESET] Database successfully reset and baseline seeded.')
}

if (process.argv[1]?.endsWith('dbReset.js')) {
  dbReset()
    .then(async () => {
      await disconnectDB()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('[DB_RESET] Error during database reset:', error)
      await disconnectDB()
      process.exit(1)
    })
}

export default dbReset

