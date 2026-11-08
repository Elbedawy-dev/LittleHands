import { validateEnv } from '../config/env.js'

export function validateProductionEnv(customEnv = process.env) {
  const validated = validateEnv(customEnv)
  const errors = []

  // 1. Secrets length
  if (!validated.JWT_ACCESS_SECRET || validated.JWT_ACCESS_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production')
  }
  if (!validated.JWT_REFRESH_SECRET || validated.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production')
  }

  // 2. Client Origins must not contain localhost
  const hasLocalhost = validated.CLIENT_ORIGINS_ARRAY.some(
    (origin) => origin.includes('localhost')
  )
  if (hasLocalhost) {
    errors.push('CLIENT_ORIGINS must not contain localhost in production')
  }

  // 3. Email driver must be SMTP with credentials
  if (validated.EMAIL_DRIVER !== 'smtp') {
    errors.push('EMAIL_DRIVER must be set to "smtp" in production')
  } else {
    if (!validated.SMTP_HOST) errors.push('SMTP_HOST is required when EMAIL_DRIVER=smtp')
    if (!validated.SMTP_USER) errors.push('SMTP_USER is required when EMAIL_DRIVER=smtp')
    if (!validated.SMTP_PASS) errors.push('SMTP_PASS is required when EMAIL_DRIVER=smtp')
  }

  // 3b. Storage driver must be cloudinary in production
  if (validated.STORAGE_DRIVER !== 'cloudinary') {
    errors.push('STORAGE_DRIVER must be set to "cloudinary" in production')
  }

  // 4. Require email verification
  if (validated.REQUIRE_EMAIL_VERIFICATION !== true) {
    errors.push('REQUIRE_EMAIL_VERIFICATION must be true in production')
  }

  // 5. MongoDB URI must be Atlas
  if (!validated.MONGODB_URI.startsWith('mongodb+srv://') && !validated.MONGODB_URI.includes('.mongodb.net')) {
    errors.push('MONGODB_URI must be a MongoDB Atlas URI in production')
  }

  // 6. Admin credentials validation (if provided)
  if (validated.ADMIN_PASSWORD) {
    if (validated.ADMIN_PASSWORD === 'AdminPass123!') {
      errors.push('ADMIN_PASSWORD must not use default placeholder password in production')
    }
    if (validated.ADMIN_PASSWORD.length < 12 || !/(?=.*[A-Za-z])(?=.*\d)/.test(validated.ADMIN_PASSWORD)) {
      errors.push('ADMIN_PASSWORD must be at least 12 characters and contain both letters and digits')
    }
  }

  if (errors.length > 0) {
    throw new Error(`[CRITICAL] Production Environment validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
  }

  return validated
}

export function checkEnv({ isProduction } = {}) {
  const isProd =
    isProduction ??
    (process.argv.includes('--prod') ||
      process.argv.includes('--production') ||
      process.env.NODE_ENV === 'production')

  console.info(`[CHECK_ENV] Validating environment configuration (${isProd ? 'PRODUCTION' : 'DEVELOPMENT'})...`)
  try {
    const validated = isProd ? validateProductionEnv(process.env) : validateEnv(process.env)
    console.info('[CHECK_ENV] SUCCESS: All environment variables are properly formatted and valid.')
    console.info(`- NODE_ENV: ${validated.NODE_ENV}`)
    console.info(`- PORT: ${validated.PORT}`)
    console.info(`- STORAGE_DRIVER: ${validated.STORAGE_DRIVER}`)
    console.info(`- EMAIL_DRIVER: ${validated.EMAIL_DRIVER}`)
    console.info(`- ALLOWED ORIGINS: ${validated.CLIENT_ORIGINS_ARRAY.join(', ')}`)
    console.info(`- REQUIRE_EMAIL_VERIFICATION: ${validated.REQUIRE_EMAIL_VERIFICATION}`)
    return true
  } catch (error) {
    console.error(error.message)
    return false
  }
}

if (process.argv[1]?.endsWith('checkEnv.js')) {
  const isOk = checkEnv()
  process.exit(isOk ? 0 : 1)
}

export default checkEnv
