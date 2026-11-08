import { describe, it, expect } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'

describe('Security Middlewares & Error Envelope', () => {
  const app = createApp()

  it('rejects mutating requests missing X-Requested-With: lh-web (CSRF Guard)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'test', password: 'pass' })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('success', false)
    expect(res.body.error).toHaveProperty('code', 'CSRF_ERROR')
    expect(res.body.error).toHaveProperty('message')
  })

  it('accepts mutating requests with valid X-Requested-With and allowed origin', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .set('Origin', 'http://localhost:5173')
      .send({ identifier: 'test', password: 'pass' })

    // Request passed CSRF guard and reached auth handler
    expect([401, 501]).toContain(res.status)
  })

  it('rejects mutating requests with unallowed Origin header', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .set('Origin', 'http://malicious-attacker-site.com')
      .send({ identifier: 'test', password: 'pass' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_ERROR')
  })

  it('rejects multipart file uploads missing X-Requested-With header', async () => {
    const { agent } = await authedAgent(app, 'seller')

    // Construct a multipart post with cleared X-Requested-With
    const res = await agent
      .post('/api/v1/products/manage/products/images')
      .set('X-Requested-With', '')
      .attach('images', Buffer.from('fake'), 'test.jpg')

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_ERROR')
  })

  it('verifies helmet security headers are present on responses', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff')
    expect(res.headers).toHaveProperty('x-dns-prefetch-control')
    expect(res.headers).toHaveProperty('x-download-options', 'noopen')
    expect(res.headers).toHaveProperty('x-frame-options')
  })

  it('verifies authentication cookies carry httpOnly and sameSite flags', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'أمن الكوكيز',
        email: `cookies_${Date.now()}@nursery.eg`,
        phone: '01012345679',
        password: 'Password123!',
        governorate: 'القاهرة',
        city: 'المعادي',
        address: 'شارع 1',
      })

    expect(res.status).toBe(201)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()

    // Access token cookie (lh_at)
    const lhAtCookie = setCookie.find((c) => c.startsWith('lh_at='))
    expect(lhAtCookie).toBeDefined()
    expect(lhAtCookie).toMatch(/HttpOnly/i)
    expect(lhAtCookie).toMatch(/SameSite=Lax/i)
    expect(lhAtCookie).toMatch(/Path=\//i)

    // Refresh token cookie (lh_rt)
    const lhRtCookie = setCookie.find((c) => c.startsWith('lh_rt='))
    expect(lhRtCookie).toBeDefined()
    expect(lhRtCookie).toMatch(/HttpOnly/i)
    expect(lhRtCookie).toMatch(/SameSite=Lax/i)
    expect(lhRtCookie).toMatch(/Path=\//i)
  })

  it('rejects NoSQL injection attempts with $ in body keys (Sanitizer)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .set('Origin', 'http://localhost:5173')
      .send({
        identifier: { $gt: '' },
        password: 'pass',
      })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('rejects NoSQL injection attempts with dot in query keys (Sanitizer)', async () => {
    const res = await request(app)
      .get('/api/v1/catalog/products?filter.admin=true')

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('enforces role authorization (401 unauthenticated, 403 unauthorized role)', async () => {
    // 1. Unauthenticated call to customer route
    const unauthRes = await request(app).get('/api/v1/orders/my')
    expect(unauthRes.status).toBe(401)
    expect(unauthRes.body.error.code).toBe('UNAUTHENTICATED')

    // 2. Customer trying to access Admin route
    const { agent } = await authedAgent(app, 'customer')
    const forbiddenRes = await agent.get('/api/v1/admin/customers')
    expect(forbiddenRes.status).toBe(403)
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects tampered JWTs, bad signatures, and alg:none attempts', async () => {
    // 1. Forged token with invalid secret
    const forgedToken = jwt.sign(
      { sub: '6aeea0000000000000000001', role: 'admin' },
      'wrong_attacker_secret_that_does_not_match_at_all_123',
      { algorithm: 'HS256' }
    )

    const resForged = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${forgedToken}`)

    expect(resForged.status).toBe(401)
    expect(resForged.body.error.code).toBe('UNAUTHENTICATED')

    // 2. Token signed with alg: 'none'
    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const nonePayload = Buffer.from(JSON.stringify({ sub: '6aeea0000000000000000001', role: 'admin' })).toString('base64url')
    const algNoneToken = `${noneHeader}.${nonePayload}.`

    const resNone = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${algNoneToken}`)

    expect(resNone.status).toBe(401)
    expect(resNone.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('never returns secrets, password hashes, or token hashes in responses', async () => {
    const { agent } = await authedAgent(app, 'customer')

    const resMe = await agent.get('/api/v1/auth/me')
    expect(resMe.status).toBe(200)

    const jsonStr = JSON.stringify(resMe.body)
    expect(jsonStr).not.toContain('passwordHash')
    expect(jsonStr).not.toContain('tokenHash')
    expect(jsonStr).not.toContain('codeHash')
    expect(jsonStr).not.toContain('__v')
    expect(resMe.body.data.user.id).toBeDefined()
    expect(resMe.body.data.user._id).toBeUndefined()
  })

  it('error responses never leak stack traces or internal server details', async () => {
    const res = await request(app).get('/api/v1/catalog/products/invalid_non_existent_id')
    expect([400, 404]).toContain(res.status)
    expect(res.body).toHaveProperty('success', false)
    expect(res.body.error).toHaveProperty('code')
    expect(res.body.error).toHaveProperty('message')
    expect(res.body).not.toHaveProperty('stack')
    expect(res.body.error).not.toHaveProperty('stack')
  })

  it('localizes error envelope message using Accept-Language header', async () => {
    // Arabic default
    const resAr = await request(app).get('/api/v1/orders/my')
    expect(resAr.body.error.message).toBe('يرجى تسجيل الدخول أولاً')

    // English request
    const resEn = await request(app)
      .get('/api/v1/orders/my')
      .set('Accept-Language', 'en')
    expect(resEn.body.error.message).toBe('Authentication required. Please log in.')
  })
})
