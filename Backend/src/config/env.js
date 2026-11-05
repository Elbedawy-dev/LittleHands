import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables from .env if present
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://localhost:27017/little_hands_dev'),
  CLIENT_ORIGINS: z.string().default('http://localhost:5173'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_SAMESITE: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(z.enum(['lax', 'strict', 'none']))
    .default('lax'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().positive().default(7),
  REQUIRE_EMAIL_VERIFICATION: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(false),
  PENDING_ORDER_TTL_HOURS: z.coerce.number().positive().default(48),
  EMAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().default('no-reply@littlehands.eg'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === 'true')
    .default(false),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  ADMIN_NAME: z.string().min(2).default('Admin'),
  ADMIN_EMAIL: z.string().email().default('admin@littlehands.eg'),
  ADMIN_PHONE: z
    .string()
    .regex(/^01[0125]\d{8}$/, 'ADMIN_PHONE must be a valid Egyptian mobile number')
    .default('01000000001'),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be at least 8 characters').default('AdminPass123!'),
})

export function validateEnv(customEnv = process.env) {
  const result = envSchema.safeParse(customEnv)
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`[CRITICAL] Environment configuration validation failed:\n${errorDetails}`)
  }

  const parsed = result.data
  const origins = parsed.CLIENT_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    ...parsed,
    CLIENT_ORIGINS_ARRAY: origins.length > 0 ? origins : ['http://localhost:5173'],
  }
}

let envInstance
try {
  envInstance = validateEnv()
} catch (error) {
  // If in test mode with partial env, allow lazy initialization or fail fast in production/dev
  if (process.env.NODE_ENV === 'test') {
    // Provide safe defaults for testing
    envInstance = validateEnv({
      ...process.env,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_min_32_characters_here!',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_min_32_characters_here!',
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/little_hands_test',
    })
  } else {
    console.error(error.message)
    process.exit(1)
  }
}

export const env = envInstance
export default env

