import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'

describe('GET /api/v1/health', () => {
  const app = createApp()

  it('returns healthy status and database connection state', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body.data).toHaveProperty('status', 'healthy')
    expect(res.body.data).toHaveProperty('database', 'connected')
    expect(res.body.data).toHaveProperty('uptime')
    expect(res.body.data).toHaveProperty('timestamp')
  })
})

