import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct } from '../helpers/factories.js'
import { User } from '../../src/db/models/User.js'
import { OtpCode } from '../../src/db/models/OtpCode.js'
import { Product } from '../../src/db/models/Product.js'
import { sha256 } from '../../src/utils/crypto.js'

describe('Auth & Users Module Integration Tests (Prompt B1)', () => {
  const app = createApp()

  it('executes full flow: register -> verify -> login -> refresh rotation -> reuse detection revokes family', async () => {
    const email = 'new_customer@test.eg'
    const phone = '01099887766'
    const password = 'StrongPassword123!'

    // 1. Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'عميلة جديدة',
        email,
        phone,
        password,
        accountType: 'parent',
        governorate: 'القاهرة',
      })

    expect(regRes.status).toBe(201)
    expect(regRes.body.success).toBe(true)
    expect(regRes.body.data.user.email).toBe(email)
    expect(regRes.body.data.user.role).toBe('customer')
    expect(regRes.body.data.user.emailVerified).toBe(false)
    expect(regRes.body.data.user).not.toHaveProperty('passwordHash')

    // Find OTP code in DB
    const userDoc = await User.findOne({ email })
    expect(userDoc).toBeTruthy()
    const otpDoc = await OtpCode.findOne({ userId: userDoc._id, purpose: 'verify_email', usedAt: null })
    expect(otpDoc).toBeTruthy()

    // 2. Verify Email using cookies from register
    const regCookies = regRes.headers['set-cookie']
    // We can find the plain code or test verification directly
    // Since we know codeHash = sha256(code), let's find the plain code or set code
    const testCode = '654321'
    otpDoc.codeHash = sha256(testCode)
    await otpDoc.save()

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .set('Cookie', regCookies)
      .set('X-Requested-With', 'lh-web')
      .send({ code: testCode })

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.data.verified).toBe(true)

    const updatedUser = await User.findById(userDoc._id)
    expect(updatedUser.emailVerified).toBe(true)

    // 3. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({
        identifier: email,
        password,
      })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.success).toBe(true)
    const loginCookies = loginRes.headers['set-cookie']
    expect(loginCookies.some((c) => c.includes('lh_at='))).toBe(true)
    expect(loginCookies.some((c) => c.includes('lh_rt='))).toBe(true)

    // Extract first refresh token
    const rtCookie1 = loginCookies.find((c) => c.includes('lh_rt='))
    const rawRt1 = rtCookie1.split(';')[0].split('=')[1]

    // 4. Refresh rotation: use rawRt1 to get new tokens
    const refreshRes1 = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`lh_rt=${rawRt1}`])
      .set('X-Requested-With', 'lh-web')
      .send()

    expect(refreshRes1.status).toBe(200)
    expect(refreshRes1.body.success).toBe(true)
    const refreshCookies1 = refreshRes1.headers['set-cookie']
    const rtCookie2 = refreshCookies1.find((c) => c.includes('lh_rt='))
    const rawRt2 = rtCookie2.split(';')[0].split('=')[1]
    expect(rawRt2).not.toBe(rawRt1)

    // 5. Reuse detection: re-sending rawRt1 MUST trigger reuse detection
    const reuseAttackRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`lh_rt=${rawRt1}`])
      .set('X-Requested-With', 'lh-web')
      .send()

    expect(reuseAttackRes.status).toBe(401)

    // And now rawRt2 in the same family MUST ALSO be revoked
    const postAttackRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`lh_rt=${rawRt2}`])
      .set('X-Requested-With', 'lh-web')
      .send()

    expect(postAttackRes.status).toBe(401)
  })

  it('enforces lockout after 5 consecutive failed login attempts', async () => {
    const email = 'lockout_user@test.eg'
    const password = 'ValidPassword123!'
    await createUser({ email, password })

    // 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Requested-With', 'lh-web')
        .send({ identifier: email, password: 'WrongPassword!' })

      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
    }

    // 6th attempt with CORRECT password must be locked out
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: email, password })

    expect(lockedRes.status).toBe(423)
    expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED')
  })

  it('enforces OTP attempts limit and expiration', async () => {
    const { agent, user } = await authedAgent(app, 'customer', { email: 'otp_test@test.eg' })

    // Create active OTP
    await OtpCode.create({
      userId: user._id,
      purpose: 'verify_email',
      codeHash: sha256('123456'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })

    // 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      const res = await agent
        .post('/api/v1/auth/verify-email')
        .send({ code: '000000' })
      expect(res.status).toBe(400)
    }

    // 6th attempt (even with right code) exceeds max attempts
    const failRes = await agent
      .post('/api/v1/auth/verify-email')
      .send({ code: '123456' })
    expect(failRes.status).toBe(400)
    expect(failRes.body.error.code).toBe('CODE_MAX_ATTEMPTS')

    // Test expired OTP
    await OtpCode.deleteMany({ userId: user._id })
    await OtpCode.create({
      userId: user._id,
      purpose: 'verify_email',
      codeHash: sha256('888888'),
      expiresAt: new Date(Date.now() - 1000), // expired
      attempts: 0,
    })

    const expRes = await agent
      .post('/api/v1/auth/verify-email')
      .send({ code: '888888' })
    expect(expRes.status).toBe(400)
    expect(expRes.body.error.code).toBe('EXPIRED_CODE')
  })

  it('ensures password reset token is single-use and updates password', async () => {
    const email = 'reset_user@test.eg'
    const oldPassword = 'OldPassword123!'
    const user = await createUser({ email, password: oldPassword })

    // Request reset
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Requested-With', 'lh-web')
      .send({ email })

    expect(forgotRes.status).toBe(200)

    // Fetch token from DB
    const resetOtp = await OtpCode.findOne({ userId: user._id, purpose: 'reset_password', usedAt: null })
    expect(resetOtp).toBeTruthy()

    // Inject known plain token
    const testToken = 'a'.repeat(64)
    resetOtp.codeHash = sha256(testToken)
    await resetOtp.save()

    // Reset password
    const newPassword = 'NewSecretPassword123!'
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .set('X-Requested-With', 'lh-web')
      .send({
        token: testToken,
        password: newPassword,
      })

    expect(resetRes.status).toBe(200)

    // Second use of same token MUST fail
    const reuseRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .set('X-Requested-With', 'lh-web')
      .send({
        token: testToken,
        password: 'AnotherPassword123!',
      })

    expect(reuseRes.status).toBe(400)

    // Login with new password works
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: email, password: newPassword })
    expect(newLoginRes.status).toBe(200)
  })

  it('prevents IDOR on addresses (returns 404 for resources caller does not own)', async () => {
    const { agent: agentA } = await authedAgent(app, 'customer')
    const { agent: agentB } = await authedAgent(app, 'customer')

    // User A creates address
    const addRes = await agentA
      .post('/api/v1/users/me/addresses')
      .send({
        name: 'مقر حضانة النور',
        phone: '01012345678',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        address: 'شارع عباس العقاد',
      })

    expect(addRes.status).toBe(201)
    const addressId = addRes.body.data.address.id

    // User B attempts to update User A's address -> 404 NOT_FOUND (not 403)
    const updateRes = await agentB
      .put(`/api/v1/users/me/addresses/${addressId}`)
      .send({
        name: 'اسم مخترق',
      })

    expect(updateRes.status).toBe(404)
    expect(updateRes.body.error.code).toBe('NOT_FOUND')

    // User B attempts to delete User A's address -> 404 NOT_FOUND
    const delRes = await agentB
      .delete(`/api/v1/users/me/addresses/${addressId}`)

    expect(delRes.status).toBe(404)
    expect(delRes.body.error.code).toBe('NOT_FOUND')
  })

  it('prevents seller registration through public /auth/register', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'محاولة تسجيل بائعة',
        email: 'seller_hacker@test.eg',
        phone: '01011223344',
        password: 'Password123!',
        role: 'seller',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('rejects suspended users on login and authenticated calls', async () => {
    const email = 'suspended_user@test.eg'
    const password = 'TestPass123!'
    await createUser({ email, status: 'suspended' })

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: email, password })

    expect(loginRes.status).toBe(403)
    expect(loginRes.body.error.code).toBe('ACCOUNT_SUSPENDED')
  })

  it('requires CSRF header (X-Requested-With: lh-web) on all mutating endpoints', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'اختبار الحماية',
        email: 'nocsrf@test.eg',
        phone: '01055554444',
        password: 'Password123!',
      })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_ERROR')
  })

  it('enforces admin-only authorization: rejects customers/sellers and allows admin to create sellers and update status', async () => {
    const { agent: customerAgent } = await authedAgent(app, 'customer')
    const { agent: sellerAgent } = await authedAgent(app, 'seller')
    const { agent: adminAgent, user: adminUser } = await authedAgent(app, 'admin')

    const sellerPayload = {
      name: 'ورشة ألوان للأطفال',
      email: 'seller_created@test.eg',
      phone: '01098765432',
      governorate: 'الإسكندرية',
      workshopAddress: 'سموحة',
    }

    // Customer trying to create seller -> 403
    const custRes = await customerAgent
      .post('/api/v1/admin/sellers')
      .send(sellerPayload)
    expect(custRes.status).toBe(403)
    expect(custRes.body.error.code).toBe('FORBIDDEN')

    // Seller trying to create seller -> 403
    const selRes = await sellerAgent
      .post('/api/v1/admin/sellers')
      .send(sellerPayload)
    expect(selRes.status).toBe(403)
    expect(selRes.body.error.code).toBe('FORBIDDEN')

    // Admin creates seller -> 201 with tempPassword returned once
    const adminRes = await adminAgent
      .post('/api/v1/admin/sellers')
      .send(sellerPayload)

    expect(adminRes.status).toBe(201)
    expect(adminRes.body.data.tempPassword).toBeTruthy()
    expect(adminRes.body.data.user.role).toBe('seller')
    const createdSellerId = adminRes.body.data.user.id

    // Admin lists sellers
    const listRes = await adminAgent.get('/api/v1/admin/sellers/accounts')
    expect(listRes.status).toBe(200)
    expect(listRes.body.data.items.length).toBeGreaterThan(0)

    // Create a product for this seller to verify status suspension hiding
    await createProduct({ sellerId: createdSellerId, published: true })

    // Admin suspends the seller
    const suspRes = await adminAgent
      .patch(`/api/v1/admin/users/${createdSellerId}/status`)
      .send({ status: 'suspended' })

    expect(suspRes.status).toBe(200)
    expect(suspRes.body.data.user.status).toBe('suspended')

    // Products of suspended seller must now be hidden (published: false)
    const hiddenProduct = await Product.findOne({ sellerId: createdSellerId })
    expect(hiddenProduct.published).toBe(false)

    // Admin cannot suspend self
    const selfSuspRes = await adminAgent
      .patch(`/api/v1/admin/users/${adminUser._id}/status`)
      .send({ status: 'suspended' })

    expect(selfSuspRes.status).toBe(400)
  })

  it('allows seller to update seller profile and rejects customers', async () => {
    const { agent: customerAgent } = await authedAgent(app, 'customer')
    const { agent: sellerAgent } = await authedAgent(app, 'seller')

    const profileData = {
      displayName: { ar: 'ورشة الخيوط الملونة', en: 'Colored Threads Workshop' },
      bio: { ar: 'ورشة متخصصة في وسائل الجوخ والأنشطة', en: 'Specialized in felt aids' },
      stages: ['nursery', 'kg1'],
      materials: ['felt', 'fabric'],
      payoutWallet: '01011223355',
    }

    // Customer rejected
    const custRes = await customerAgent
      .patch('/api/v1/sellers/me/profile')
      .send(profileData)
    expect(custRes.status).toBe(403)

    // Seller allowed
    const sellerRes = await sellerAgent
      .patch('/api/v1/sellers/me/profile')
      .send(profileData)

    expect(sellerRes.status).toBe(200)
    expect(sellerRes.body.data.user.seller.displayName.ar).toBe('ورشة الخيوط الملونة')
    expect(sellerRes.body.data.user.seller.payoutWallet).toBe('01011223355')
  })
})
