import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../db/connection.js'
import { User } from '../db/models/User.js'

export async function seedAdmin() {
  console.info('[SEED_ADMIN] Connecting to database...')
  await connectDB(env.MONGODB_URI)

  console.info(`[SEED_ADMIN] Seeding admin user (${env.ADMIN_EMAIL})...`)
  const salt = await bcrypt.genSalt(12)
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt)

  const adminUser = await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    {
      $set: {
        name: env.ADMIN_NAME,
        phone: env.ADMIN_PHONE,
        passwordHash,
        role: 'admin',
        emailVerified: true,
        status: 'active',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  console.info(`[SEED_ADMIN] Admin user ready. ID: ${adminUser.id}`)
}

if (process.argv[1]?.endsWith('seedAdmin.js')) {
  seedAdmin()
    .then(async () => {
      console.info('[SEED_ADMIN] Admin seed completed.')
      await disconnectDB()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('[SEED_ADMIN] Error seeding admin:', error)
      await disconnectDB()
      process.exit(1)
    })
}

export default seedAdmin

