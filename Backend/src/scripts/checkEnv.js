import { validateEnv } from '../config/env.js'

export function checkEnv() {
  console.info('[CHECK_ENV] Validating environment configuration...')
  try {
    const validated = validateEnv(process.env)
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

