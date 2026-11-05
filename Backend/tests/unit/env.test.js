import { describe, it, expect } from 'vitest'
import { validateEnv } from '../../src/config/env.js'

describe('Environment Validation', () => {
  it('parses valid environment configuration', () => {
    const valid = {
      NODE_ENV: 'test',
      PORT: '5000',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      CLIENT_ORIGINS: 'http://localhost:5173, http://localhost:3000',
      JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_min_32_characters_12345',
      JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_min_32_characters_12345',
      ACCESS_TTL: '15m',
      REFRESH_TTL_DAYS: '7',
      REQUIRE_EMAIL_VERIFICATION: 'false',
      PENDING_ORDER_TTL_HOURS: '48',
      EMAIL_DRIVER: 'console',
      EMAIL_FROM: 'test@littlehands.eg',
      STORAGE_DRIVER: 'local',
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
})

