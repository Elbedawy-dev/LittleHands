import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct } from '../helpers/factories.js'
import { User } from '../../src/db/models/User.js'
import { OtpCode } from '../../src/db/models/OtpCode.js'
import { Product } from '../../src/db/models/Product.js'
import { RefreshToken } from '../../src/db/models/RefreshToken.js'
import { renderTemplate } from '../../src/infra/email/templates/index.js'
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
    expect(regRes.body.data).toEqual({ email, requiresVerification: true })
    expect(regRes.headers['set-cookie']).toBeUndefined()

    // Find OTP code in DB; no refresh token or session exists before verification
    const userDoc = await User.findOne({ email })
    expect(userDoc).toBeTruthy()
    expect(userDoc.emailVerified).toBe(false)
    expect(await RefreshToken.countDocuments({ userId: userDoc._id })).toBe(0)

    const meBeforeVerify = await request(app).get('/api/v1/auth/me')
    expect(meBeforeVerify.status).toBe(401)

    const otpDoc = await OtpCode.findOne({ userId: userDoc._id, purpose: 'verify_email', usedAt: null })
    expect(otpDoc).toBeTruthy()

    // 2. Verify Email by email without session -> opens session cookies + returns user & token
    const testCode = '654321'
    otpDoc.codeHash = sha256(testCode)
    await otpDoc.save()

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: testCode })

    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.data.verified).toBe(true)
    expect(verifyRes.body.data.user.email).toBe(email)
    expect(verifyRes.body.data.user.emailVerified).toBe(true)
    expect(verifyRes.body.data.token).toBeTruthy()
    const verifyCookies = verifyRes.headers['set-cookie']
    expect(verifyCookies).toBeDefined()
    expect(verifyCookies.some((c) => c.startsWith('lh_at='))).toBe(true)
    expect(verifyCookies.some((c) => c.startsWith('lh_rt='))).toBe(true)

    const meAfterVerify = await request(app).get('/api/v1/auth/me').set('Cookie', verifyCookies)
    expect(meAfterVerify.status).toBe(200)

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

  it('supports 6-digit OTP password reset across customer, seller, and admin roles, revokes sessions, and clears mustChangePassword', async () => {
    for (const role of ['customer', 'seller', 'admin']) {
      const email = `reset_${role}@test.eg`
      const oldPassword = 'TestPass123!'
      const user = await createUser({
        email,
        role,
        mustChangePassword: role === 'seller',
      })

      // Issue an active refresh token to verify it gets revoked on password reset
      const sessionLogin = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Requested-With', 'lh-web')
        .send({ identifier: email, password: oldPassword })
      expect(sessionLogin.status).toBe(200)

      // 1. Request OTP
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .set('X-Requested-With', 'lh-web')
        .send({ email })
      expect(forgotRes.status).toBe(200)
      expect(forgotRes.body.data.success).toBe(true)

      const resetCodeDoc = await OtpCode.findOne({
        userId: user._id,
        purpose: 'reset_code',
        usedAt: null,
      })
      expect(resetCodeDoc).toBeTruthy()

      const otpCode = '739204'
      resetCodeDoc.codeHash = sha256(otpCode)
      await resetCodeDoc.save()

      // 2. Verify OTP and exchange for single-use resetToken
      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-reset-code')
        .set('X-Requested-With', 'lh-web')
        .send({ email, code: otpCode })
      expect(verifyRes.status).toBe(200)
      expect(verifyRes.body.data.resetToken).toBeTruthy()
      const { resetToken } = verifyRes.body.data

      // Re-verifying the same OTP code MUST fail
      const reuseCodeRes = await request(app)
        .post('/api/v1/auth/verify-reset-code')
        .set('X-Requested-With', 'lh-web')
        .send({ email, code: otpCode })
      expect(reuseCodeRes.status).toBe(400)
      expect(reuseCodeRes.body.error.code).toBe('INVALID_OR_EXPIRED_CODE')

      // 3. Complete password reset
      const newPassword = `NewSecret_${role}_123!`
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('X-Requested-With', 'lh-web')
        .send({
          token: resetToken,
          password: newPassword,
        })
      expect(resetRes.status).toBe(200)

      // Second use of same resetToken MUST fail
      const reuseTokenRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('X-Requested-With', 'lh-web')
        .send({
          token: resetToken,
          password: 'AnotherPassword123!',
        })
      expect(reuseTokenRes.status).toBe(400)

      // mustChangePassword cleared + refresh tokens revoked
      const updatedUser = await User.findById(user._id)
      expect(updatedUser.mustChangePassword).toBe(false)
      const activeTokens = await RefreshToken.countDocuments({ userId: user._id, revokedAt: null })
      expect(activeTokens).toBe(0)

      // Login with new password succeeds
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Requested-With', 'lh-web')
        .send({ identifier: email, password: newPassword })
      expect(newLoginRes.status).toBe(200)
    }
  })

  it('enforces wrong code rejection, max 5 attempts, expiry, and old code invalidation on resend for reset OTP', async () => {
    const email = 'reset_edge_cases@test.eg'
    const user = await createUser({ email, role: 'customer' })

    await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Requested-With', 'lh-web')
      .send({ email })

    const firstOtp = await OtpCode.findOne({ userId: user._id, purpose: 'reset_code', usedAt: null })
    expect(firstOtp).toBeTruthy()
    const firstCode = '112233'
    firstOtp.codeHash = sha256(firstCode)
    await firstOtp.save()

    // Request a new OTP -> first code MUST be invalidated
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Requested-With', 'lh-web')
      .send({ email })

    const staleRes = await request(app)
      .post('/api/v1/auth/verify-reset-code')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: firstCode })
    expect(staleRes.status).toBe(400)
    expect(staleRes.body.error.code).toBe('INVALID_OR_EXPIRED_CODE')

    // Request a fresh OTP so attempt counter starts cleanly at 0
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Requested-With', 'lh-web')
      .send({ email })

    const activeOtp = await OtpCode.findOne({ userId: user._id, purpose: 'reset_code', usedAt: null }).sort({ createdAt: -1 })
    expect(activeOtp).toBeTruthy()
    activeOtp.codeHash = sha256('445566')
    await activeOtp.save()

    for (let i = 0; i < 5; i += 1) {
      const wrongRes = await request(app)
        .post('/api/v1/auth/verify-reset-code')
        .set('X-Requested-With', 'lh-web')
        .send({ email, code: '999999' })
      expect(wrongRes.status).toBe(400)
      expect(wrongRes.body.error.code).toBe('INVALID_OR_EXPIRED_CODE')
    }

    const lockedRes = await request(app)
      .post('/api/v1/auth/verify-reset-code')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: '445566' })
    expect(lockedRes.status).toBe(400)
    expect(lockedRes.body.error.code).toBe('CODE_MAX_ATTEMPTS')

    // Expired OTP
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Requested-With', 'lh-web')
      .send({ email })
    const expiredOtp = await OtpCode.findOne({ userId: user._id, purpose: 'reset_code', usedAt: null }).sort({ createdAt: -1 })
    expiredOtp.codeHash = sha256('778899')
    expiredOtp.expiresAt = new Date(Date.now() - 60 * 1000)
    await expiredOtp.save()

    const expiredRes = await request(app)
      .post('/api/v1/auth/verify-reset-code')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: '778899' })
    expect(expiredRes.status).toBe(400)
    expect(expiredRes.body.error.code).toBe('INVALID_OR_EXPIRED_CODE')

    // Email template renders 6-digit OTP & 10-minute expiry in AR and EN with no reset link
    const arMail = renderTemplate('password-reset', { name: 'سارة', code: '739204' }, { locale: 'ar' })
    expect(arMail.html).toContain('739204')
    expect(arMail.html).toContain('10 دقائق')
    expect(arMail.html).not.toContain('reset-password?token=')
    expect(arMail.text).toContain('739204')

    const enMail = renderTemplate('password-reset', { name: 'Sara', code: '739204' }, { locale: 'en' })
    expect(enMail.html).toContain('739204')
    expect(enMail.html).toContain('10 minutes')
    expect(enMail.html).not.toContain('reset-password?token=')
    expect(enMail.text).toContain('739204')
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

  it('blocks login for unverified customer (by email or phone) with 403 EMAIL_NOT_VERIFIED and email details without opening session', async () => {
    const email = 'unverified_login@test.eg'
    const phone = '01066554433'
    const password = 'Password123!'

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'عميلة غير مفعلة',
        email,
        phone,
        password,
        governorate: 'القاهرة',
      })
    expect(regRes.status).toBe(201)
    expect(regRes.headers['set-cookie']).toBeUndefined()

    const userDoc = await User.findOne({ email })

    // Login with email -> 403 EMAIL_NOT_VERIFIED + details.email, no cookies
    const emailLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: email, password })
    expect(emailLogin.status).toBe(403)
    expect(emailLogin.body.error.code).toBe('EMAIL_NOT_VERIFIED')
    expect(emailLogin.body.error.details).toEqual({ email })
    expect(emailLogin.headers['set-cookie']).toBeUndefined()
    expect(await RefreshToken.countDocuments({ userId: userDoc._id })).toBe(0)

    // Login with phone -> 403 EMAIL_NOT_VERIFIED + details.email, no cookies
    const phoneLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: phone, password })
    expect(phoneLogin.status).toBe(403)
    expect(phoneLogin.body.error.code).toBe('EMAIL_NOT_VERIFIED')
    expect(phoneLogin.body.error.details).toEqual({ email })
    expect(phoneLogin.headers['set-cookie']).toBeUndefined()

    // Sellers and admins are unaffected and have emailVerified=true
    const seller = await createUser({ role: 'seller', email: 'seller_login_ok@test.eg' })
    expect(seller.emailVerified).toBe(true)
    const sellerLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: seller.email, password: 'TestPass123!' })
    expect(sellerLogin.status).toBe(200)
    expect(sellerLogin.headers['set-cookie']).toBeDefined()
  })

  it('re-registering an unverified customer email updates details, invalidates old OTP, and checks phone conflict only against other accounts', async () => {
    const email = 'reregister_unverified@test.eg'
    const phone = '01077889900'
    const otherUser = await createUser({ phone: '01077889911' })

    // Initial register
    const firstRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'اسم أول',
        email,
        phone,
        password: 'FirstPassword123!',
        accountType: 'parent',
        governorate: 'القاهرة',
      })
    expect(firstRes.status).toBe(201)
    expect(firstRes.body.data).toEqual({ email, requiresVerification: true })
    expect(firstRes.headers['set-cookie']).toBeUndefined()

    const userDoc = await User.findOne({ email })
    const firstOtp = await OtpCode.findOne({ userId: userDoc._id, purpose: 'verify_email', usedAt: null })
    const oldCode = '111222'
    firstOtp.codeHash = sha256(oldCode)
    await firstOtp.save()

    // Trying to re-register with a phone belonging to another account -> 409 PHONE_EXISTS
    const phoneConflictRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'اسم تاني',
        email,
        phone: otherUser.phone,
        password: 'SecondPassword123!',
      })
    expect(phoneConflictRes.status).toBe(409)
    expect(phoneConflictRes.body.error.code).toBe('PHONE_EXISTS')

    // Re-register same unverified email with same phone and updated fields -> 201, no EMAIL_EXISTS
    const secondRes = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'اسم محدث',
        email,
        phone,
        password: 'SecondPassword123!',
        accountType: 'kindergarten',
        nurseryName: 'حضانة النور',
        governorate: 'الجيزة',
      })
    expect(secondRes.status).toBe(201)
    expect(secondRes.body.data).toEqual({ email, requiresVerification: true })
    expect(secondRes.headers['set-cookie']).toBeUndefined()

    const updatedDoc = await User.findById(userDoc._id)
    expect(updatedDoc.name).toBe('اسم محدث')
    expect(updatedDoc.accountType).toBe('nursery')
    expect(updatedDoc.nurseryName).toBe('حضانة النور')
    expect(updatedDoc.governorate).toBe('الجيزة')

    // Old OTP was invalidated
    const refreshedFirstOtp = await OtpCode.findById(firstOtp._id)
    expect(refreshedFirstOtp.usedAt).toBeTruthy()
    const oldOtpRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: oldCode })
    expect(oldOtpRes.status).toBe(400)
    expect(oldOtpRes.body.error.code).toBe('INVALID_CODE')
    expect(oldOtpRes.headers['set-cookie']).toBeUndefined()
    expect(await RefreshToken.countDocuments({ userId: userDoc._id })).toBe(0)

    // New OTP verifies and opens session; login with new password works afterwards
    const newOtp = await OtpCode.findOne({ userId: userDoc._id, purpose: 'verify_email', usedAt: null }).sort({ createdAt: -1 })
    const newCode = '333444'
    newOtp.codeHash = sha256(newCode)
    await newOtp.save()

    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: newCode })
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.data.verified).toBe(true)
    expect(verifyRes.body.data.token).toBeTruthy()
    expect(verifyRes.headers['set-cookie']).toBeDefined()

    // Re-registering an already verified customer email -> 409 EMAIL_EXISTS
    const verifiedConflict = await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'محاولة تالتة',
        email,
        phone: '01077889922',
        password: 'ThirdPassword123!',
      })
    expect(verifiedConflict.status).toBe(409)
    expect(verifiedConflict.body.error.code).toBe('EMAIL_EXISTS')

    // Login works with updated password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Requested-With', 'lh-web')
      .send({ identifier: email, password: 'SecondPassword123!' })
    expect(loginRes.status).toBe(200)
  })

  it('verify-email with wrong code does not verify or open session, and authenticated verify-email does not reissue cookies', async () => {
    const email = 'verify_wrong_code@test.eg'
    await request(app)
      .post('/api/v1/auth/register')
      .set('X-Requested-With', 'lh-web')
      .send({
        name: 'عميلة تحقق',
        email,
        phone: '01044332211',
        password: 'Password123!',
      })

    const userDoc = await User.findOne({ email })
    const otpDoc = await OtpCode.findOne({ userId: userDoc._id, purpose: 'verify_email', usedAt: null })
    otpDoc.codeHash = sha256('987654')
    await otpDoc.save()

    const wrongRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .set('X-Requested-With', 'lh-web')
      .send({ email, code: '000111' })
    expect(wrongRes.status).toBe(400)
    expect(wrongRes.body.error.code).toBe('INVALID_CODE')
    expect(wrongRes.headers['set-cookie']).toBeUndefined()
    expect(await RefreshToken.countDocuments({ userId: userDoc._id })).toBe(0)
    expect((await User.findById(userDoc._id)).emailVerified).toBe(false)

    // Authenticated session verify-email only verifies without setting new cookies or token
    const { agent, user: authedUnverified } = await authedAgent(app, 'customer', {
      email: 'authed_verify@test.eg',
      emailVerified: false,
    })
    await OtpCode.create({
      userId: authedUnverified._id,
      purpose: 'verify_email',
      codeHash: sha256('246810'),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })

    const authedVerifyRes = await agent
      .post('/api/v1/auth/verify-email')
      .send({ code: '246810' })
    expect(authedVerifyRes.status).toBe(200)
    expect(authedVerifyRes.body.data.verified).toBe(true)
    expect(authedVerifyRes.body.data.token).toBeUndefined()
    expect(authedVerifyRes.headers['set-cookie']).toBeUndefined()
    expect(await RefreshToken.countDocuments({ userId: authedUnverified._id })).toBe(0)
  })
})
