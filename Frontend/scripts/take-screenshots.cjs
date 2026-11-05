/**
 * take-screenshots.cjs
 * Autonomous screenshot capture using native Node 22 CDP connection to Edge/Chrome.
 * Captures key screens across roles, viewports (390px & 1280px), and languages (AR & EN).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9555;
const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../../screenshots');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Minimal CDP Client
class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

// Realistic seed data
const SEED_DATA = {
  users: [
    {
      id: 'usr_admin',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
      createdAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'seller_1',
      name: { ar: 'البائعة الأولى', en: 'First Artisan Seller' },
      email: 'seller1@test.com',
      role: 'seller',
      phone: '01011111111',
      walletNumber: '01011111111',
      governorate: 'القاهرة',
      workshopAddress: 'مدينة نصر، القاهرة',
      bio: {
        ar: 'ورشة متخصصة في صناعة الوسائل التعليمية اليدوية لرياض الأطفال',
        en: 'Workshop specializing in handmade educational aids for nurseries',
      },
      avatar: '',
      createdAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'seller_2',
      name: { ar: 'البائعة الثانية', en: 'Second Artisan Seller' },
      email: 'seller2@test.com',
      role: 'seller',
      phone: '01022222222',
      walletNumber: '01022222222',
      governorate: 'الجيزة',
      workshopAddress: 'الدقي، الجيزة',
      bio: {
        ar: 'معلمة وصانعة وسائل تعليمية يدوية بخامات الجوخ والورق المقوى',
        en: 'Teacher and creator of educational felt and cardstock aids',
      },
      avatar: '',
      createdAt: '2026-08-05T11:00:00Z',
    },
    {
      id: 'usr_cust_1',
      name: 'سارة محمد',
      email: 'sarah@nursery.eg',
      phone: '01033333333',
      role: 'customer',
      nurseryName: 'روضة براعم الأمل',
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      address: 'شارع مكرم عبيد، مبنى 15',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ],
  products: [
    {
      id: 'prod_1',
      name: {
        ar: 'لوحة الحروف الأبجدية التفاعلية بالجوخ',
        en: 'Interactive Arabic Alphabet Felt Board',
      },
      slug: 'interactive-arabic-alphabet-felt-board',
      categoryId: 'felt-boards',
      sellerId: 'seller_1',
      sellerName: { ar: 'البائعة الأولى', en: 'First Artisan Seller' },
      price: 180,
      description: {
        ar: 'لوحة جدارية تعليمية مصنوعة يدوياً من الجوخ لتعليم الحروف لرياض الأطفال.',
        en: 'Handmade interactive felt wall board for early childhood alphabet learning.',
      },
      details: {
        material: { ar: 'جوخ ملون', en: 'Colored felt' },
        size: { ar: '50 × 70 سم', en: '50 x 70 cm' },
        usage: { ar: 'ركن اللغة وحلقة الصباح', en: 'Language corner and morning circle' },
        care: { ar: 'تمسح بقطعة قماش ناعمة جافة', en: 'Wipe with soft dry cloth' },
      },
      stages: ['nursery', 'kg1'],
      materials: ['felt'],
      images: ['/products/alphabet-board.jpg'],
      inStock: true,
      stockCount: 15,
      isPublished: true,
      isFeatured: true,
      createdAt: '2026-09-05T10:00:00Z',
    },
    {
      id: 'prod_2',
      name: {
        ar: 'بطاقات الأرقام والمعدود المصورة بالورق المقوى',
        en: '', // Intentionally missing English to showcase missing translation badge
      },
      slug: 'illustrated-flash-cards-for-numbers',
      categoryId: 'flashcards',
      sellerId: 'seller_1',
      sellerName: { ar: 'البائعة الأولى', en: 'First Artisan Seller' },
      price: 120,
      description: {
        ar: 'مجموعة بطاقات تعليمية مقواة ومغلفة حرارياً لتعليم الأرقام والعد.',
        en: '',
      },
      details: {
        material: { ar: 'ورق مقوى مغلف حرارياً', en: '' },
        size: { ar: '15 × 20 سم', en: '' },
        usage: { ar: 'طاولة الأنشطة الفردية والجماعية', en: '' },
        care: { ar: 'تنظف بمسحة خفيفة', en: '' },
      },
      stages: ['kg1', 'kg2'],
      materials: ['cardstock'],
      images: ['/products/numbers-card.jpg'],
      inStock: true,
      stockCount: 8,
      isPublished: false, // Draft
      isFeatured: false,
      createdAt: '2026-09-08T12:00:00Z',
    },
  ],
  categories: [
    { id: 'felt-boards', name: { ar: 'لوحات وبرية وتفاعلية', en: 'Felt & Interactive Boards' } },
    { id: 'flashcards', name: { ar: 'بطاقات ووسائل مصنفرة ومقواة', en: 'Flashcards & Cardstock' } },
    { id: 'fabric-models', name: { ar: 'مجسمات ومطابقة قماشية', en: 'Fabric Models & Matching' } },
    { id: 'math-aids', name: { ar: 'وسائل العد والحساب المبكر', en: 'Early Math & Counting Aids' } },
    { id: 'literacy-aids', name: { ar: 'وسائل الحروف والتهيئة للقراءة', en: 'Literacy & Reading Aids' } },
    { id: 'classroom-tools', name: { ar: 'أدوات تنظيم وإدارة الفصل والأنشطة', en: 'Classroom & Activity Tools' } },
  ],
  orders: [
    {
      id: 'ord_1',
      orderNumber: 'LH-2026-101',
      customerId: 'usr_cust_1',
      sellerId: 'seller_1',
      items: [
        {
          productId: 'prod_1',
          name: {
            ar: 'لوحة الحروف الأبجدية التفاعلية بالجوخ',
            en: 'Interactive Arabic Alphabet Felt Board',
          },
          qty: 2,
          unitPrice: 180,
          sellerId: 'seller_1',
          image: '/products/alphabet-board.jpg',
        },
      ],
      delivery: {
        name: 'سارة محمد',
        phone: '01033333333',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        address: 'شارع مكرم عبيد، مبنى 15',
        nurseryName: 'روضة براعم الأمل',
      },
      subtotal: 360,
      shipping: 40,
      total: 400,
      status: 'confirmed',
      payment: {
        senderPhone: '01033333333',
        reference: 'VF99887766',
        transferredAmount: 400,
        screenshotUrl: '/receipts/sample_confirmed.jpg',
        status: 'approved',
        submittedAt: '2026-09-15T12:00:00Z',
        reviewedAt: '2026-09-15T14:00:00Z',
      },
      timeline: [
        { status: 'pending_payment', title: 'تم إنشاء الطلب', timestamp: '2026-09-15T12:00:00Z' },
        { status: 'payment_submitted', title: 'تم إرسال إيصال الدفع', timestamp: '2026-09-15T12:10:00Z' },
        { status: 'confirmed', title: 'تم اعتماد الدفع وتأكيد الطلب', timestamp: '2026-09-15T14:00:00Z' },
      ],
      notes: 'يرجى التوصيل خلال ساعات دوام الروضة',
      createdAt: '2026-09-15T12:00:00Z',
      updatedAt: '2026-09-15T14:00:00Z',
    },
  ],
  payments: [
    {
      id: 'pay_rev_1',
      orderId: 'ord_1',
      orderNumber: 'LH-2026-101',
      amount: 400,
      senderPhone: '01033333333',
      reference: 'VF99887766',
      screenshotUrl: '/receipts/sample_confirmed.jpg',
      status: 'approved',
      submittedAt: '2026-09-15T12:10:00Z',
      reviewedAt: '2026-09-15T14:00:00Z',
    },
  ],
  payouts: [],
  notifications: [
    {
      id: 'notif_1',
      role: 'seller',
      userId: 'seller_1',
      type: 'new_order',
      params: { orderNumber: 'LH-2026-101' },
      read: false,
      createdAt: '2026-09-15T14:00:00Z',
    },
    {
      id: 'notif_2',
      role: 'seller',
      userId: 'seller_1',
      type: 'order_status',
      params: { orderNumber: 'LH-2026-101' },
      read: true,
      createdAt: '2026-09-15T14:30:00Z',
    },
  ],
  customRequests: [],
  settings: {
    commissionRate: 0.20,
    platformWallet: '01012345678',
    supportPhone: '01012345678',
    supportEmail: 'support@littlehands.eg',
    whatsappNumber: '01012345678',
    payoutScheduleText: {
      ar: 'يتم تحويل المستحقات أسبوعياً عبر فودافون كاش',
      en: 'Payouts are transferred weekly via Vodafone Cash',
    },
    shippingRates: {
      cairo_giza: 40,
      alexandria: 50,
      delta: 60,
      upper_egypt: 70,
      remote: 90,
    },
  },
};

const SCREENSHOT_TARGETS = [
  { name: '01-home-desktop-ar', path: '/', viewport: { width: 1280, height: 800 }, lang: 'ar', user: null },
  { name: '02-home-desktop-en', path: '/', viewport: { width: 1280, height: 800 }, lang: 'en', user: null },
  { name: '03-home-mobile-ar', path: '/', viewport: { width: 390, height: 844 }, lang: 'ar', user: null },
  { name: '04-home-mobile-en', path: '/', viewport: { width: 390, height: 844 }, lang: 'en', user: null },
  { name: '05-products-desktop-ar', path: '/products', viewport: { width: 1280, height: 800 }, lang: 'ar', user: null },
  { name: '06-products-desktop-en', path: '/products', viewport: { width: 1280, height: 800 }, lang: 'en', user: null },
  { name: '07-product-details-desktop-ar', path: '/products/prod_1', viewport: { width: 1280, height: 800 }, lang: 'ar', user: null },
  { name: '08-product-details-desktop-en', path: '/products/prod_1', viewport: { width: 1280, height: 800 }, lang: 'en', user: null },
  { name: '09-login-desktop-ar', path: '/login', viewport: { width: 1280, height: 800 }, lang: 'ar', user: null },
  { name: '10-login-desktop-en', path: '/login', viewport: { width: 1280, height: 800 }, lang: 'en', user: null },
  { name: '11-seller-overview-desktop-ar', path: '/seller', viewport: { width: 1280, height: 800 }, lang: 'ar', user: SEED_DATA.users[1] },
  { name: '12-seller-overview-desktop-en', path: '/seller', viewport: { width: 1280, height: 800 }, lang: 'en', user: SEED_DATA.users[1] },
  { name: '13-seller-products-desktop-ar', path: '/seller/products', viewport: { width: 1280, height: 800 }, lang: 'ar', user: SEED_DATA.users[1] },
  { name: '14-seller-product-form-desktop-ar', path: '/seller/products/new', viewport: { width: 1280, height: 800 }, lang: 'ar', user: SEED_DATA.users[1] },
  { name: '15-admin-payments-desktop-ar', path: '/admin/payments', viewport: { width: 1280, height: 800 }, lang: 'ar', user: SEED_DATA.users[0] },
  { name: '16-admin-products-desktop-ar', path: '/admin/products', viewport: { width: 1280, height: 800 }, lang: 'ar', user: SEED_DATA.users[0] },
  { name: '17-dev-design-system-desktop', path: '/dev/design-system', viewport: { width: 1280, height: 800 }, lang: 'ar', user: null },
];

async function main() {
  console.log('\n[SCREENSHOTS] Initializing screenshot capture process...');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  console.log(`[SCREENSHOTS] Using browser: ${browserPath}`);
  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-shots-profile-'));

  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${tempProfile}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp = null;

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        if (res.ok) {
          const list = await res.json();
          const page = list.find((t) => t.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
          }
        }
      } catch (e) {}
    }

    if (!wsUrl) throw new Error('Cannot connect to CDP debugger URL!');
    const ws = new WebSocket(wsUrl);
    await new Promise((res) => (ws.onopen = res));
    cdp = new CDPClient(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log(`[SCREENSHOTS] Connected to browser. Capturing ${SCREENSHOT_TARGETS.length} targets...\n`);

    for (const target of SCREENSHOT_TARGETS) {
      process.stdout.write(`Capturing ${target.name} (${target.path})... `);

      // Set viewport
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: target.viewport.width,
        height: target.viewport.height,
        deviceScaleFactor: target.viewport.width === 390 ? 2 : 1,
        mobile: target.viewport.width === 390,
      });

      // Navigate to blank to prime state
      await cdp.send('Page.navigate', { url: `${BASE_URL}${target.path}` });
      await new Promise((r) => setTimeout(r, 500));

      // Inject seeded state into localStorage
      const userJson = target.user ? JSON.stringify(target.user) : 'null';
      const dbJson = JSON.stringify(SEED_DATA);
      const lang = target.lang;

      await cdp.eval(`
        try {
          localStorage.setItem('lh_mock_db_v3', ${JSON.stringify(dbJson)});
          localStorage.setItem('lh_user', ${JSON.stringify(userJson)});
          localStorage.setItem('lh_language', '${lang}');
          localStorage.setItem('i18nextLng', '${lang}');
        } catch(e) {}
      `);

      // Reload so app picks up injected language & user
      await cdp.send('Page.navigate', { url: `${BASE_URL}${target.path}` });
      await new Promise((r) => setTimeout(r, 1200));

      // Capture screenshot
      const result = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const filePath = path.join(OUTPUT_DIR, `${target.name}.png`);
      fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
      console.log(`Saved: screenshots/${target.name}.png (${(result.data.length / 1024).toFixed(1)} KB)`);
    }

    // Capture Interactive States: Mobile Drawer open & Mobile Notifications Sheet open
    console.log('\nCapturing interactive mobile overlays...');

    // 1. Mobile Drawer
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1000));
    // Click hamburger button
    await cdp.eval(`
      const btn = document.querySelector('button[aria-label*="قائمة"], button[aria-label*="menu" i]');
      if (btn) btn.click();
    `);
    await new Promise((r) => setTimeout(r, 600));
    const drawerShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUTPUT_DIR, '18-mobile-drawer-ar.png'), Buffer.from(drawerShot.data, 'base64'));
    console.log('Saved: screenshots/18-mobile-drawer-ar.png');

    // 2. Mobile Notifications Sheet (with data)
    await cdp.eval(`
      try {
        localStorage.setItem('lh_mock_db_v3', ${JSON.stringify(JSON.stringify(SEED_DATA))});
        localStorage.setItem('lh_user', ${JSON.stringify(JSON.stringify(SEED_DATA.users[1]))});
      } catch(e) {}
    `);
    await cdp.send('Page.navigate', { url: `${BASE_URL}/seller` });
    await new Promise((r) => setTimeout(r, 1200));
    // Click bell icon
    await cdp.eval(`
      const bell = document.querySelector('button[aria-label*="إشعار"], button[aria-label*="notification" i]');
      if (bell) bell.click();
    `);
    await new Promise((r) => setTimeout(r, 600));
    const notifShot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUTPUT_DIR, '19-mobile-notifications-sheet-ar.png'), Buffer.from(notifShot.data, 'base64'));
    console.log('Saved: screenshots/19-mobile-notifications-sheet-ar.png');

    console.log('\n[SCREENSHOTS] All screenshots successfully captured and saved to screenshots/ directory!\n');
  } catch (err) {
    console.error('[SCREENSHOTS] Error:', err);
  } finally {
    try {
      browser.kill();
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (e) {}
  }
}

main();

