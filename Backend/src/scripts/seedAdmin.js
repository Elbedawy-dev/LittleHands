import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../db/connection.js'
import { User } from '../db/models/User.js'

export function validateAdminCredentials(envConfig = env) {
  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD } = envConfig
  if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PHONE || !ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_EMAIL, ADMIN_NAME, ADMIN_PHONE, and ADMIN_PASSWORD are all required to seed the admin user.'
    )
  }

  if (ADMIN_PASSWORD === 'AdminPass123!') {
    throw new Error('ADMIN_PASSWORD cannot use the insecure default placeholder "AdminPass123!".')
  }

  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.')
  }

  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(ADMIN_PASSWORD)) {
    throw new Error('ADMIN_PASSWORD must contain both letters and digits.')
  }

  if (!/^01[0125]\d{8}$/.test(ADMIN_PHONE)) {
    throw new Error('ADMIN_PHONE must be a valid Egyptian mobile number.')
  }
}

export async function seedAdmin({ resetPassword } = {}) {
  validateAdminCredentials(env)

  console.info('[SEED_ADMIN] Connecting to database...')
  await connectDB(env.MONGODB_URI)

  console.info(`[SEED_ADMIN] Seeding admin user (${env.ADMIN_EMAIL})...`)
  const shouldReset = Boolean(resetPassword || process.argv.includes('--reset-password'))

  const existing = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() }).select('+passwordHash')
  if (existing) {
    if (shouldReset) {
      const salt = await bcrypt.genSalt(12)
      existing.passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt)
    }
    existing.name = env.ADMIN_NAME
    existing.phone = env.ADMIN_PHONE
    existing.role = 'admin'
    existing.emailVerified = true
    existing.status = 'active'
    await existing.save()
    console.info(
      `[SEED_ADMIN] Admin user updated. ID: ${existing.id} (password reset: ${shouldReset})`
    )
    return existing
  }

  const salt = await bcrypt.genSalt(12)
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, salt)

  const adminUser = await User.create({
    email: env.ADMIN_EMAIL.toLowerCase(),
    name: env.ADMIN_NAME,
    phone: env.ADMIN_PHONE,
    passwordHash,
    role: 'admin',
    emailVerified: true,
    status: 'active',
  })

  console.info(`[SEED_ADMIN] Admin user created. ID: ${adminUser.id}`)
  return adminUser
}

if (process.argv[1]?.endsWith('seedAdmin.js')) {
  seedAdmin()
    .then(async () => {
      console.info('[SEED_ADMIN] Admin seed completed.')
      await disconnectDB()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('[SEED_ADMIN] Error seeding admin:', error.message)
      await disconnectDB()
      process.exit(1)
    })
}

export default seedAdmin
