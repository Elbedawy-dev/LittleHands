import { describe, it, expect } from 'vitest'
import { validateEnv } from '../../src/config/env.js'
import { validateProductionEnv } from '../../src/scripts/checkEnv.js'
import { validateAdminCredentials } from '../../src/scripts/seedAdmin.js'

describe('Environment Validation', () => {
  it('allows booting without any ADMIN_* variables', () => {
    const minimal = {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb+srv://mock.mongodb.net/test',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_min_32_characters_12345',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_min_32_characters_12345',
    }
    const parsed = validateEnv(minimal)
    expect(parsed.ADMIN_EMAIL).toBeUndefined()
    expect(parsed.ADMIN_PASSWORD).toBeUndefined()
    expect(parsed.ADMIN_NAME).toBeUndefined()
    expect(parsed.ADMIN_PHONE).toBeUndefined()
  })

  it('validates admin credentials for seed:admin strictly', () => {
    // Missing variables
    expect(() => validateAdminCredentials({})).toThrow(/all required/)

    // Rejects default placeholder password
    expect(() =>
      validateAdminCredentials({
        ADMIN_EMAIL: 'admin@littlehands.eg',
        ADMIN_NAME: 'Admin',
        ADMIN_PHONE: '01000000001',
        ADMIN_PASSWORD: 'AdminPass123!',
      })
    ).toThrow(/cannot use the insecure default placeholder/)

    // Rejects password shorter than 12 characters
    expect(() =>
      validateAdminCredentials({
        ADMIN_EMAIL: 'admin@littlehands.eg',
        ADMIN_NAME: 'Admin',
        ADMIN_PHONE: '01000000001',
        ADMIN_PASSWORD: 'ShortPass1!',
      })
    ).toThrow(/at least 12 characters long/)

    // Rejects password without digits
    expect(() =>
      validateAdminCredentials({
        ADMIN_EMAIL: 'admin@littlehands.eg',
        ADMIN_NAME: 'Admin',
        ADMIN_PHONE: '01000000001',
        ADMIN_PASSWORD: 'NoDigitsPasswordHere!',
      })
    ).toThrow(/contain both letters and digits/)

    // Accepts valid strong credentials
    expect(() =>
      validateAdminCredentials({
        ADMIN_EMAIL: 'admin@littlehands.eg',
        ADMIN_NAME: 'Super Admin',
        ADMIN_PHONE: '01000000001',
        ADMIN_PASSWORD: 'StrongSecretPassword2026!',
      })
    ).not.toThrow()
  })

  it('seedAdmin does not overwrite password without --reset-password flag', async () => {
    const { seedAdmin } = await import('../../src/scripts/seedAdmin.js')
    const { User } = await import('../../src/db/models/User.js')
    const bcrypt = (await import('bcryptjs')).default

    const originalConfig = {
      ADMIN_EMAIL: 'admin_test_preserve@littlehands.eg',
      ADMIN_NAME: 'Original Admin',
      ADMIN_PHONE: '01000000001',
      ADMIN_PASSWORD: 'InitialPassword123!',
    }
    const { env } = await import('../../src/config/env.js')
    env.ADMIN_EMAIL = originalConfig.ADMIN_EMAIL
    env.ADMIN_NAME = originalConfig.ADMIN_NAME
    env.ADMIN_PHONE = originalConfig.ADMIN_PHONE
    env.ADMIN_PASSWORD = originalConfig.ADMIN_PASSWORD

    // First seed
    const created = await seedAdmin()
    const firstHash = created.passwordHash

    // Try re-seeding with different password without --reset-password
    env.ADMIN_PASSWORD = 'NewDifferentPassword456!'
    const secondCall = await seedAdmin()
    expect(secondCall.passwordHash).toBe(firstHash)

    const matchesOriginal = await bcrypt.compare('InitialPassword123!', secondCall.passwordHash)
    expect(matchesOriginal).toBe(true)

    // Now re-seed with resetPassword: true
    const thirdCall = await seedAdmin({ resetPassword: true })
    expect(thirdCall.passwordHash).not.toBe(firstHash)
    const matchesNew = await bcrypt.compare('NewDifferentPassword456!', thirdCall.passwordHash)
    expect(matchesNew).toBe(true)

    // Cleanup
    await User.deleteOne({ _id: created._id })
  })
  it('parses valid environment configuration', () => {
    const valid = {
      NODE_ENV: 'test',
      PORT: '5000',
      MONGODB_URI: 'mongodb+srv://mock.mongodb.net/test',
      CLIENT_ORIGINS: 'http://localhost:5173, http://localhost:3000',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_min_32_characters_12345',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_min_32_characters_12345',
      ACCESS_TTL: '15m',
      REFRESH_TTL_DAYS: '7',
      REQUIRE_EMAIL_VERIFICATION: 'false',
      PENDING_ORDER_TTL_HOURS: '48',
      EMAIL_DRIVER: 'console',
      EMAIL_FROM: 'test@littlehands.eg',
      STORAGE_DRIVER: 'cloudinary',
      ADMIN_NAME: 'Admin Test',
      ADMIN_EMAIL: 'admin@test.eg',
      ADMIN_PHONE: '01000000001',
      ADMIN_PASSWORD: 'AdminPassword123!',
    }

    const parsed = validateEnv(valid)
    expect(parsed.PORT).toBe(5000)
    expect(parsed.CLIENT_ORIGINS_ARRAY).toEqual(['http://localhost:5173', 'http://localhost:3000'])
    expect(parsed.REQUIRE_EMAIL_VERIFICATION).toBe(false)
  })

  it('fails fast when JWT_ACCESS_SECRET is under 32 characters', () => {
    const invalid = {
      NODE_ENV: 'development',
      JWT_ACCESS_SECRET: 'short_secret',
    }

    expect(() => validateEnv(invalid)).toThrow(/Environment configuration validation failed/)
  })

  it('fails fast when ADMIN_PHONE is not an Egyptian mobile number', () => {
    const invalid = {
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_min_32_characters_12345',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_min_32_characters_12345',
      ADMIN_PHONE: '12345678',
    }

    expect(() => validateEnv(invalid)).toThrow(/ADMIN_PHONE must be a valid Egyptian mobile number/)
  })

  it('validates production environment requirements', () => {
    const validProd = {
      NODE_ENV: 'production',
      PORT: '5000',
      MONGODB_URI: 'mongodb+srv://app_user:StrongPass123@cluster.mongodb.net/little_hands_prod',
      CLIENT_ORIGINS: 'https://littlehands.eg, https://www.littlehands.eg',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_min_32_characters_12345_prod!',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_min_32_characters_12345_prod!',
      EMAIL_DRIVER: 'smtp',
      SMTP_HOST: 'smtp.sendgrid.net',
      SMTP_USER: 'apikey',
      SMTP_PASS: 'SG.valid_smtp_pass_key_secret',
      STORAGE_DRIVER: 'cloudinary',
      REQUIRE_EMAIL_VERIFICATION: 'true',
      ADMIN_PASSWORD: 'CustomSuperSecureAdminPassword2026!',
    }

    const result = validateProductionEnv(validProd)
    expect(result.EMAIL_DRIVER).toBe('smtp')
    expect(result.STORAGE_DRIVER).toBe('cloudinary')
    expect(result.REQUIRE_EMAIL_VERIFICATION).toBe(true)

    // Fails if STORAGE_DRIVER is not cloudinary
    expect(() =>
      validateProductionEnv({
        ...validProd,
        STORAGE_DRIVER: 'memory',
      })
    ).toThrow(/STORAGE_DRIVER must be set to "cloudinary"/)

    // Fails if CLIENT_ORIGINS has localhost
    expect(() =>
      validateProductionEnv({
        ...validProd,
        CLIENT_ORIGINS: 'https://littlehands.eg, http://localhost:5173',
      })
    ).toThrow(/CLIENT_ORIGINS must not contain localhost/)

    // Fails if EMAIL_DRIVER is console
    expect(() =>
      validateProductionEnv({
        ...validProd,
        EMAIL_DRIVER: 'console',
      })
    ).toThrow(/EMAIL_DRIVER must be set to "smtp"/)

    // Fails if REQUIRE_EMAIL_VERIFICATION is false
    expect(() =>
      validateProductionEnv({
        ...validProd,
        REQUIRE_EMAIL_VERIFICATION: 'false',
      })
    ).toThrow(/REQUIRE_EMAIL_VERIFICATION must be true/)
  })
})
