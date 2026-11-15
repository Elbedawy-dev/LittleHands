import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createProduct, createUser } from '../helpers/factories.js'

describe('Seller Avatar DTOs across all endpoints (A5)', () => {
  let app
  let adminAgent
  let sellerWithAvatar
  let sellerWithoutAvatar
  const AVATAR_URL = 'https://res.cloudinary.com/demo/image/upload/v1/avatars/workshop-a.webp'

  beforeEach(async () => {
    app = createApp()
    const admin = await authedAgent(app, 'admin')
    adminAgent = admin.agent

    sellerWithAvatar = await createUser({
      role: 'seller',
      name: 'ورشة أميرة',
      avatar: { key: 'avatars/workshop-a.webp', url: AVATAR_URL },
      seller: {
        displayName: { ar: 'ورشة أميرة للجوخ', en: 'Amira Felt Workshop' },
        bio: { ar: 'نبذة عن الورشة', en: 'Workshop bio' },
        stages: ['nursery'],
        materials: ['felt'],
        payoutWallet: '01011223344',
      },
    })

    sellerWithoutAvatar = await createUser({
      role: 'seller',
      name: 'ورشة بدون صورة',
    })

    await createProduct({
      sellerId: sellerWithAvatar._id,
      sellerName: 'ورشة أميرة',
      published: true,
    })
  })

  it('returns string avatar URL (and safe display metadata) in GET /api/v1/admin/sellers/earnings', async () => {
    const res = await adminAgent.get('/api/v1/admin/sellers/earnings')
    expect(res.status).toBe(200)
    const rows = res.body.data
    expect(Array.isArray(rows)).toBe(true)

    const withAv = rows.find((r) => r.sellerId === sellerWithAvatar._id.toString())
    const withoutAv = rows.find((r) => r.sellerId === sellerWithoutAvatar._id.toString())

    expect(withAv).toBeTruthy()
    expect(withAv.avatar).toBe(AVATAR_URL)
    expect(typeof withAv.avatar).toBe('string')
    expect(withAv.status).toBe('active')
    expect(withAv.displayName).toEqual({ ar: 'ورشة أميرة للجوخ', en: 'Amira Felt Workshop' })
    expect(withAv.passwordHash).toBeUndefined()

    expect(withoutAv).toBeTruthy()
    expect(withoutAv.avatar).toBeNull()
  })

  it('returns string avatar URL in GET /api/v1/admin/sellers/accounts', async () => {
    const res = await adminAgent.get('/api/v1/admin/sellers/accounts')
    expect(res.status).toBe(200)
    const items = res.body.data.items
    const withAv = items.find((s) => s.id === sellerWithAvatar._id.toString())
    const withoutAv = items.find((s) => s.id === sellerWithoutAvatar._id.toString())

    expect(withAv.avatar).toBe(AVATAR_URL)
    expect(withoutAv.avatar).toBeNull()
  })

  it('returns string avatar URL (no private fields) in GET /api/v1/sellers and GET /api/v1/sellers/:id', async () => {
    const listRes = await request(app).get('/api/v1/sellers')
    expect(listRes.status).toBe(200)
    const listItem = listRes.body.data.find((s) => s.id === sellerWithAvatar._id.toString())
    expect(listItem).toBeTruthy()
    expect(listItem.avatar).toBe(AVATAR_URL)
    expect(listItem.email).toBeUndefined()
    expect(listItem.phone).toBeUndefined()

    const detailRes = await request(app).get(`/api/v1/sellers/${sellerWithAvatar._id}`)
    expect(detailRes.status).toBe(200)
    const detail = detailRes.body.data
    expect(detail.id).toBe(sellerWithAvatar._id.toString())
    expect(detail.avatar).toBe(AVATAR_URL)
    expect(detail.email).toBeUndefined()
    expect(detail.phone).toBeUndefined()
    expect(detail.payoutWallet).toBeUndefined()

    const emptyDetailRes = await request(app).get(`/api/v1/sellers/${sellerWithoutAvatar._id}`)
    expect(emptyDetailRes.status).toBe(200)
    expect(emptyDetailRes.body.data.avatar).toBeNull()
  })

  it('returns string avatar URL inside product.seller on GET /api/v1/catalog/products', async () => {
    const catRes = await request(app).get('/api/v1/catalog/products')
    expect(catRes.status).toBe(200)
    const prod = catRes.body.data.items.find((p) => p.sellerId === sellerWithAvatar._id.toString())
    expect(prod).toBeTruthy()
    expect(prod.seller?.avatar).toBe(AVATAR_URL)
  })
})
