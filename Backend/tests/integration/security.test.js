import { describe, it, expect } from 'vitest'
import request from 'supertest'
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

    // Request passed CSRF guard (501 stub before B1, 401 after B1 auth handler is implemented)
    expect([401, 501]).toContain(res.status)
  })

  it('rejects NoSQL injection attempts with $ in body keys (Sanitizer)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
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

