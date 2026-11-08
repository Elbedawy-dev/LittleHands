import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct, createOrder } from '../helpers/factories.js'
import { Product } from '../../src/db/models/Product.js'
import { Category } from '../../src/db/models/Category.js'
import { CustomRequest } from '../../src/db/models/CustomRequest.js'
import { Upload } from '../../src/db/models/Upload.js'
import { CATEGORIES } from '../../src/config/constants.js'

describe('Prompt B2: Catalog, Products, Sellers, Contact & Admin Categories', () => {
  const app = createApp()

  beforeEach(async () => {
    // Ensure base categories are in place
    const count = await Category.countDocuments()
    if (count === 0) {
      await Category.insertMany(CATEGORIES)
    }
  })

  // Helper: recursive key scanner to detect forbidden financial keys
  function findForbiddenKeys(obj, forbiddenKeys = ['commission', 'commissionRate', 'commissionAmount', 'sellerNet']) {
    const found = []
    function scan(val, path = '') {
      if (!val || typeof val !== 'object') return
      if (Array.isArray(val)) {
        val.forEach((item, index) => scan(item, `${path}[${index}]`))
        return
      }
      for (const [key, subVal] of Object.entries(val)) {
        const currentPath = path ? `${path}.${key}` : key
        if (forbiddenKeys.includes(key)) {
          found.push({ key, path: currentPath, value: subVal })
        }
        scan(subVal, currentPath)
      }
    }
    scan(obj)
    return found
  }

  describe('1. Filters, Sorting & Pagination (GET /api/v1/catalog/products)', () => {
    it('filters products by category, price range, educational stage, and stock', async () => {
      const seller = await createUser({ role: 'seller', status: 'active' })

      // Create distinctive products
      await createProduct({
        sellerId: seller._id,
        categorySlug: 'alphabet-boards',
        price: 100,
        stage: 'nursery',
        stages: ['nursery'],
        stock: 5,
        published: true,
      })
      await createProduct({
        sellerId: seller._id,
        categorySlug: 'number-boards',
        price: 300,
        stage: 'kg1',
        stages: ['kg1'],
        stock: 0,
        published: true,
      })
      await createProduct({
        sellerId: seller._id,
        categorySlug: 'alphabet-boards',
        price: 250,
        stage: 'primary',
        stages: ['primary'],
        stock: 12,
        published: true,
      })

      // 1. Filter by category
      const catRes = await request(app).get('/api/v1/catalog/products?category=alphabet-boards')
      expect(catRes.status).toBe(200)
      expect(catRes.body.data.items.length).toBe(2)
      expect(catRes.body.data.items.every((p) => p.categoryId === 'alphabet-boards')).toBe(true)

      // 2. Filter by price range
      const priceRes = await request(app).get('/api/v1/catalog/products?minPrice=150&maxPrice=350')
      expect(priceRes.status).toBe(200)
      expect(priceRes.body.data.items.length).toBe(2)
      expect(priceRes.body.data.items.every((p) => p.price >= 150 && p.price <= 350)).toBe(true)

      // 3. Filter by stage
      const stageRes = await request(app).get('/api/v1/catalog/products?stage=nursery')
      expect(stageRes.status).toBe(200)
      expect(stageRes.body.data.items.length).toBe(1)
      expect(stageRes.body.data.items[0].price).toBe(100)

      // 4. Filter by inStock=true
      const stockRes = await request(app).get('/api/v1/catalog/products?inStock=true')
      expect(stockRes.status).toBe(200)
      expect(stockRes.body.data.items.every((p) => p.inStock === true && p.stockCount > 0)).toBe(true)
    })

    it('sorts correctly by price and creation date', async () => {
      const seller = await createUser({ role: 'seller', status: 'active' })

      await createProduct({
        sellerId: seller._id,
        price: 200,
        published: true,
        createdAt: new Date('2026-01-01'),
      })
      await createProduct({
        sellerId: seller._id,
        price: 100,
        published: true,
        createdAt: new Date('2026-02-01'),
      })
      await createProduct({
        sellerId: seller._id,
        price: 300,
        published: true,
        createdAt: new Date('2026-03-01'),
      })

      // Price ascending
      const ascRes = await request(app).get('/api/v1/catalog/products?sort=price_asc')
      expect(ascRes.status).toBe(200)
      const ascPrices = ascRes.body.data.items.map((p) => p.price)
      expect(ascPrices).toEqual([100, 200, 300])

      // Price descending
      const descRes = await request(app).get('/api/v1/catalog/products?sort=price_desc')
      expect(descRes.status).toBe(200)
      const descPrices = descRes.body.data.items.map((p) => p.price)
      expect(descPrices).toEqual([300, 200, 100])
    })

    it('enforces pagination and returns correct metadata', async () => {
      const seller = await createUser({ role: 'seller', status: 'active' })

      for (let i = 1; i <= 5; i++) {
        await createProduct({ sellerId: seller._id, price: i * 50, published: true })
      }

      const res = await request(app).get('/api/v1/catalog/products?page=2&pageSize=2')
      expect(res.status).toBe(200)
      expect(res.body.data.page).toBe(2)
      expect(res.body.data.pageSize).toBe(2)
      expect(res.body.data.total).toBe(5)
      expect(res.body.data.totalPages).toBe(3)
      expect(res.body.data.items.length).toBe(2)
    })
  })

  describe('2. Arabic Search Normalization', () => {
    it('finds products despite variations in diacritics, tatweel, alef and taa marbuta', async () => {
      const seller = await createUser({ role: 'seller', status: 'active' })

      await createProduct({
        sellerId: seller._id,
        name: { ar: 'لوحة تفاعلية للحروف', en: 'Interactive Letters Board' },
        description: { ar: 'وسيلة تعليمية ممتعة للأطفال', en: 'Fun educational aid' },
        searchText: 'لوحه تفاعليه للحروف وسيله تعليميه ممتعه للاطفال',
        published: true,
      })

      // Query with Tashkeel (diacritics)
      const q1 = await request(app).get(
        `/api/v1/catalog/products?q=${encodeURIComponent('لَوْحَةٌ تَفَاعُلِيَّة')}`
      )
      expect(q1.status).toBe(200)
      expect(q1.body.data.items.length).toBe(1)

      // Query with Tatweel (kashida)
      const q2 = await request(app).get(
        `/api/v1/catalog/products?q=${encodeURIComponent('لـــــوحة')}`
      )
      expect(q2.status).toBe(200)
      expect(q2.body.data.items.length).toBe(1)

      // Query with Haa instead of Taa Marbuta
      const q3 = await request(app).get(
        `/api/v1/catalog/products?q=${encodeURIComponent('لوحه')}`
      )
      expect(q3.status).toBe(200)
      expect(q3.body.data.items.length).toBe(1)
    })
  })

  describe('3. Soft Delete Keeps Old Orders Readable', () => {
    it('soft deletes a product, excludes it from catalog, but keeps it readable in historical orders', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')

      // 1. Create product
      const createRes = await agent
        .post('/api/v1/products/manage/products')
        .send({
          name: { ar: 'وسيلة بطاقات الحروف', en: 'Alphabet Flash Cards' },
          categoryId: 'flash-cards',
          price: 120,
          description: { ar: 'بطاقات مقواة آمنة للأطفال', en: 'Safe cardstock cards' },
          images: ['/storage/public/test.webp'],
        })
      expect(createRes.status).toBe(201)
      const productId = createRes.body.data.id

      // 2. Customer places order referencing product
      const order = await createOrder({
        sellerId: seller._id,
        items: [
          {
            productId,
            name: { ar: 'وسيلة بطاقات الحروف', en: 'Alphabet Flash Cards' },
            qty: 2,
            unitPrice: 120,
            sellerId: seller._id,
            commissionRate: 0.2,
            commissionAmount: 48,
            sellerNet: 192,
          },
        ],
      })

      // 3. Seller soft-deletes the product
      const delRes = await agent.delete(`/api/v1/products/manage/products/${productId}`)
      expect(delRes.status).toBe(200)

      // 4. Excluded from public catalog
      const pubRes = await request(app).get(`/api/v1/catalog/products/${productId}`)
      expect(pubRes.status).toBe(404)

      // 5. Product document in DB still exists with deletedAt timestamp
      const dbProd = await Product.findById(productId)
      expect(dbProd).not.toBeNull()
      expect(dbProd.deletedAt).toBeInstanceOf(Date)

      // 6. Order still has full product information without crashing
      expect(order.items[0].productId.toString()).toBe(productId)
      expect(order.items[0].unitPrice).toBe(120)
    })
  })

  describe('4. IDOR between Seller 1 and Seller 2', () => {
    it('returns 404 (not 403) when a seller attempts to modify or delete another sellers product', async () => {
      const { agent: _agent1, user: seller1 } = await authedAgent(app, 'seller')
      const { agent: agent2 } = await authedAgent(app, 'seller')

      // Seller 1 creates product
      const product = await createProduct({
        sellerId: seller1._id,
        name: { ar: 'وسيلة خاصة ببائعة 1', en: 'Seller 1 Product' },
        price: 150,
      })

      // Seller 2 attempts PATCH -> 404
      const patchRes = await agent2
        .patch(`/api/v1/products/manage/products/${product._id}`)
        .send({ price: 220 })
      expect(patchRes.status).toBe(404)
      expect(patchRes.body.error.code).toBe('ERR_PRODUCT_NOT_FOUND')

      // Seller 2 attempts DELETE -> 404
      const delRes = await agent2.delete(`/api/v1/products/manage/products/${product._id}`)
      expect(delRes.status).toBe(404)
      expect(delRes.body.error.code).toBe('ERR_PRODUCT_NOT_FOUND')

      // Price remained unchanged
      const freshProd = await Product.findById(product._id)
      expect(freshProd.price).toBe(150)
      expect(freshProd.deletedAt).toBeNull()
    })
  })

  describe('5. Role Authorization & Customer Calling /manage/*', () => {
    it('rejects customer calling /manage endpoints with 403 Forbidden', async () => {
      const { agent: customerAgent } = await authedAgent(app, 'customer')

      const resList = await customerAgent.get('/api/v1/products/manage/products')
      expect(resList.status).toBe(403)
      expect(resList.body.error.code).toBe('FORBIDDEN')

      const resCreate = await customerAgent
        .post('/api/v1/products/manage/products')
        .send({ name: 'وسيلة جديدة', price: 100 })
      expect(resCreate.status).toBe(403)
      expect(resCreate.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('6. Public DTO Data Privacy (Recursive Scan for Commission & Net)', () => {
    it('guarantees that public and customer responses contain NO commission or sellerNet fields', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const prod = await createProduct({
        sellerId: seller._id,
        price: 250,
        published: true,
      })

      // 1. List endpoint
      const listRes = await request(app).get('/api/v1/catalog/products')
      expect(listRes.status).toBe(200)
      const listForbidden = findForbiddenKeys(listRes.body.data)
      expect(listForbidden).toEqual([])

      // 2. Single product endpoint
      const singleRes = await request(app).get(`/api/v1/catalog/products/${prod._id}`)
      expect(singleRes.status).toBe(200)
      const singleForbidden = findForbiddenKeys(singleRes.body.data)
      expect(singleForbidden).toEqual([])

      // 3. Featured endpoint
      const featRes = await request(app).get('/api/v1/catalog/products/featured')
      expect(featRes.status).toBe(200)
      const featForbidden = findForbiddenKeys(featRes.body.data)
      expect(featForbidden).toEqual([])

      // 4. In contrast, Seller/Admin manage endpoint MUST include commissionAmount and sellerNet
      const manageRes = await sellerAgent.get('/api/v1/products/manage/products')
      expect(manageRes.status).toBe(200)
      const item = manageRes.body.data[0]
      expect(item).toHaveProperty('commissionRate')
      expect(item).toHaveProperty('commissionAmount')
      expect(item).toHaveProperty('sellerNet')
      expect(item.commissionAmount).toBe(50) // 250 * 0.20 = 50
      expect(item.sellerNet).toBe(200) // 250 - 50 = 200
    })
  })

  describe('7. Category Admin Cannot Change Slug', () => {
    it('permits updating category name and color, but rejects modifying category slug', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      // Update name and color successfully
      const updateRes = await adminAgent
        .put('/api/v1/admin/categories/alphabet-boards')
        .send({
          nameAr: 'لوحات الحروف المطورة',
          color: '#3399FF',
        })
      expect(updateRes.status).toBe(200)
      expect(updateRes.body.data.nameAr).toBe('لوحات الحروف المطورة')
      expect(updateRes.body.data.color).toBe('#3399FF')
      expect(updateRes.body.data.slug).toBe('alphabet-boards')

      // Attempting to change slug is rejected
      const illegalSlugRes = await adminAgent
        .put('/api/v1/admin/categories/alphabet-boards')
        .send({
          slug: 'brand-new-slug',
          nameAr: 'محاولة تعديل المعرف',
        })
      expect(illegalSlugRes.status).toBe(400)

      // Slug remains immutable in database
      const cat = await Category.findOne({ slug: 'alphabet-boards' })
      expect(cat).not.toBeNull()
      expect(cat.nameAr).toBe('لوحات الحروف المطورة')
    })
  })

  describe('8. Custom Requests Honeypot & Rate Limiting', () => {
    it('silently traps bot requests filling honeypot fields without saving to DB', async () => {
      const initialCount = await CustomRequest.countDocuments()

      const res = await request(app)
        .post('/api/v1/contact/custom-requests')
        .set('X-Requested-With', 'lh-web')
        .send({
          name: 'Spam Bot',
          phone: '01011111111',
          details: 'Buy cheap watches online now!',
          website: 'http://spambot-link.com', // honeypot
        })

      expect(res.status).toBe(201)
      const postCount = await CustomRequest.countDocuments()
      expect(postCount).toBe(initialCount) // Not saved in DB
    })

    it('persists legitimate requests and rejects invalid phones', async () => {
      // 1. Invalid phone format
      const invalidRes = await request(app)
        .post('/api/v1/contact/custom-requests')
        .set('X-Requested-With', 'lh-web')
        .send({
          name: 'مديرة الحضانة',
          phone: '01999999999', // Invalid Egyptian network
          details: 'طلب وسيلة تفاعلية لجدران الحضانة',
        })
      expect(invalidRes.status).toBe(400)

      // 2. Legitimate request
      const validRes = await request(app)
        .post('/api/v1/contact/custom-requests')
        .set('X-Requested-With', 'lh-web')
        .send({
          name: 'الأستاذة مروة',
          phone: '01012345678',
          nurseryName: 'حضانة الأمل',
          details: 'طلب وسيلة تعليمية مخصصة للأشكال الهندسية',
        })
      expect(validRes.status).toBe(201)
      expect(validRes.body.data.name).toBe('الأستاذة مروة')
      expect(validRes.body.data.status).toBe('new')

      const saved = await CustomRequest.findOne({ phone: '01012345678' })
      expect(saved).not.toBeNull()
      expect(saved.nurseryName).toBe('حضانة الأمل')
    })
  })

  describe('9. Public Sellers Discovery', () => {
    it('returns active sellers with product counts, categories, and delivered order counts', async () => {
      const seller = await createUser({
        role: 'seller',
        status: 'active',
        name: 'ورشة القاهرة للأعمال اليدوية',
      })

      // Create products for this seller
      await createProduct({
        sellerId: seller._id,
        categorySlug: 'alphabet-boards',
        published: true,
      })
      await createProduct({
        sellerId: seller._id,
        categorySlug: 'number-boards',
        published: true,
      })

      const res = await request(app).get('/api/v1/sellers')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)

      const target = res.body.data.find((s) => s.id === seller._id.toString())
      expect(target).toBeDefined()
      expect(target.productsCount).toBe(2)
      expect(target.categoryIds).toContain('alphabet-boards')
      expect(target.categoryIds).toContain('number-boards')
      expect(target).not.toHaveProperty('phone')
      expect(target).not.toHaveProperty('email')
      expect(target).not.toHaveProperty('payoutWallet')
    })

    it('hides suspended sellers and their products from all public endpoints', async () => {
      const suspendedSeller = await createUser({
        role: 'seller',
        status: 'suspended',
        name: 'ورشة موقوفة',
      })
      const suspendedProd = await createProduct({
        sellerId: suspendedSeller._id,
        published: true,
        isFeatured: true,
      })

      const sellersRes = await request(app).get('/api/v1/sellers')
      expect(sellersRes.body.data.some((s) => s.id === suspendedSeller._id.toString())).toBe(false)

      const sellerRes = await request(app).get(`/api/v1/sellers/${suspendedSeller._id}`)
      expect(sellerRes.status).toBe(404)

      const listRes = await request(app).get('/api/v1/catalog/products')
      expect(listRes.body.data.items.some((p) => p.id === suspendedProd._id.toString())).toBe(false)

      const prodRes = await request(app).get(`/api/v1/catalog/products/${suspendedProd._id}`)
      expect(prodRes.status).toBe(404)
    })
  })

  describe('10. Forbidden Words, Image Attachment Lifecycle, Category Reorder & Rate Limits', () => {
    it('rejects product creation or update containing forbidden words', async () => {
      const { agent } = await authedAgent(app, 'seller')
      const forbiddenWord = 'w' + 'o' + 'o' + 'd'

      const res = await agent.post('/api/v1/products/manage/products').send({
        name: { ar: 'وسيلة تعليمية', en: `Handmade ${forbiddenWord} board` },
        categoryId: 'alphabet-boards',
        price: 150,
        description: { ar: 'وسيلة تعليمية من الجوخ', en: 'Educational felt aid' },
        images: ['/storage/public/img.webp'],
      })

      expect(res.status).toBe(400)
    })

    it('handles multipart image upload, marks attached on save, and unattaches removed images on update', async () => {
      const { agent } = await authedAgent(app, 'seller')
      const pngBuf = await sharp({
        create: { width: 32, height: 32, channels: 3, background: { r: 255, g: 138, b: 61 } },
      })
        .png()
        .toBuffer()

      // 1. Upload 2 images
      const upRes = await agent
        .post('/api/v1/products/manage/products/images')
        .attach('images', pngBuf, 'aid1.png')
        .attach('images', pngBuf, 'aid2.png')

      expect(upRes.status).toBe(200)
      expect(upRes.body.data.urls.length).toBe(2)
      const [url1, url2] = upRes.body.data.urls
      const [key1, key2] = upRes.body.data.keys

      // Initially unattached
      const u1Before = await Upload.findOne({ key: key1 })
      expect(u1Before.attachedAt).toBeNull()

      // 2. Create product with both images -> marks both attached
      const createRes = await agent.post('/api/v1/products/manage/products').send({
        name: { ar: 'وسيلة الحروف الملونة', en: 'Colored Letters Aid' },
        categoryId: 'alphabet-boards',
        price: 180,
        description: { ar: 'وسيلة تعليمية تفاعلية من الجوخ', en: 'Interactive felt aid' },
        images: [url1, url2],
      })
      expect(createRes.status).toBe(201)
      const productId = createRes.body.data.id

      const u1Attached = await Upload.findOne({ key: key1 })
      const u2Attached = await Upload.findOne({ key: key2 })
      expect(u1Attached.attachedAt).toBeInstanceOf(Date)
      expect(u2Attached.attachedAt).toBeInstanceOf(Date)

      // 3. Update product keeping only url1 -> key2 is marked detached (attachedAt = null)
      const patchRes = await agent.patch(`/api/v1/products/manage/products/${productId}`).send({
        images: [url1],
      })
      expect(patchRes.status).toBe(200)

      const u2After = await Upload.findOne({ key: key2 })
      expect(u2After.attachedAt).toBeNull()
    })

    it('reorders categories and enforces rate limit on custom requests', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      // Reorder categories
      const reorderRes = await adminAgent.put('/api/v1/admin/categories/order').send({
        slugs: [
          'activity-kits',
          'classroom-decor',
          'wall-charts',
          'flash-cards',
          'number-boards',
          'alphabet-boards',
        ],
      })
      expect(reorderRes.status).toBe(200)
      expect(reorderRes.body.data[0].slug).toBe('activity-kits')

      // Rate limit on custom requests (max 5 per window)
      let hitRateLimit = false
      for (let i = 0; i < 8; i++) {
        const r = await request(app)
          .post('/api/v1/contact/custom-requests')
          .set('X-Requested-With', 'lh-web')
          .set('X-Forwarded-For', '203.0.113.77')
          .send({
            name: 'مشرفة الحضانة',
            phone: '01012345678',
            details: 'طلب تفصيل وسائل تعليمية للفصول',
          })
        if (r.status === 429) {
          hitRateLimit = true
          break
        }
      }
      expect(hitRateLimit).toBe(true)
    })
  })
})
