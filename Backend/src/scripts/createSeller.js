import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../db/connection.js'
import { User } from '../db/models/User.js'
import { eventBus, EVENT_TYPES } from '../events/index.js'

function parseArgs() {
  const args = process.argv.slice(2)
  const params = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.substring(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        params[key] = next
        i++
      } else {
        params[key] = true
      }
    }
  }
  return params
}

export async function createSellerCLI() {
  const args = parseArgs()

  const name = args.name || 'البائعة الأولى'
  const email = (args.email || 'seller1@littlehands.eg').toLowerCase()
  const phone = args.phone || '01011111111'
  const password = args.password || 'SellerPass123!'

  console.info(`[CREATE_SELLER] Connecting to database...`)
  await connectDB(env.MONGODB_URI)

  console.info(`[CREATE_SELLER] Creating seller: ${name} (${email}, ${phone})...`)
  const salt = await bcrypt.genSalt(12)
  const passwordHash = await bcrypt.hash(password, salt)

  const sellerUser = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        phone,
        passwordHash,
        role: 'seller',
        status: 'active',
        emailVerified: true,
        seller: {
          displayName: { ar: name, en: name },
          bio: { ar: '', en: '' },
          stages: ['nursery', 'kg1'],
          materials: ['felt', 'fabric'],
          payoutWallet: phone,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  // Emit documented system event
  eventBus.emit(EVENT_TYPES.SELLER_CREATED, {
    user: sellerUser,
    tempPassword: password,
  })

  console.info(`[CREATE_SELLER] Seller created successfully. ID: ${sellerUser.id}`)
  return sellerUser
}

if (process.argv[1]?.endsWith('createSeller.js')) {
  createSellerCLI()
    .then(async () => {
      await disconnectDB()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error('[CREATE_SELLER] Error creating seller:', error)
      await disconnectDB()
      process.exit(1)
    })
}

export default createSellerCLI

