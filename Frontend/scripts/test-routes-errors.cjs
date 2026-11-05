/**
 * scripts/test-routes-errors.cjs
 *
 * Automated regression suite for Agent CRASH.
 * Reads route list dynamically from router.jsx at runtime.
 * Seeds a realistic bilingual test dataset in localStorage.
 * Tests every (route x role x language x viewport) combination:
 * - Roles: guest, customer, seller1, seller2, admin
 * - Languages: ar, en
 * - Viewports: 390 (mobile), 1280 (desktop)
 *
 * Asserts:
 * - 0 uncaught exceptions
 * - 0 console.errors
 * - No default React Router error screen ("Unexpected Application Error")
 * - No custom ErrorPage boundary ("عذراً، حدث خطأ غير متوقع" / "Oops! An unexpected error occurred")
 * - No blank page
 *
 * Interacts with main tabs on each page.
 * Resets mock DB at the end.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9558;

async function getDevServerUrl() {
  for (const p of [5173, 5174]) {
    try {
      const res = await fetch(`http://localhost:${p}`);
      if (res.ok) return `http://localhost:${p}`;
    } catch (e) {}
  }
  return 'http://localhost:5174';
}

function extractRoutesFromRouter() {
  const routerPath = path.resolve(__dirname, '../src/app/router.jsx');
  const content = fs.readFileSync(routerPath, 'utf8');

  const extractBetween = (startStr, endStr) => {
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return '';
    const endIdx = endStr ? content.indexOf(endStr, startIdx) : content.length;
    return content.slice(startIdx, endIdx);
  };

  const publicBlock = extractBetween('// المسارات العامة والمتجر', '// مسارات المصادقة');
  const authBlock = extractBetween('// مسارات المصادقة', '// مسارات لوحة تحكم البائعة');
  const sellerBlock = extractBetween('// مسارات لوحة تحكم البائعة', '// مسارات لوحة تحكم الإدارة');
  const adminBlock = extractBetween('// مسارات لوحة تحكم الإدارة', '])');

  const getPaths = (block) => {
    const res = [];
    const pRegex = /path:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = pRegex.exec(block)) !== null) {
      const p = match[1];
      if (p === '*' || p === '/') continue;
      res.push(p);
    }
    return res;
  };

  const allRoutes = new Set(['/']);

  // Public & Account
  for (const p of getPaths(publicBlock)) {
    if (['orders', 'orders/:id', 'favorites', 'addresses', 'settings'].includes(p)) {
      allRoutes.add(`/account/${p}`);
    } else {
      allRoutes.add(`/${p.replace(/^\//, '')}`);
    }
  }
  allRoutes.add('/account');

  // Auth
  for (const p of getPaths(authBlock)) {
    allRoutes.add(`/${p.replace(/^\//, '')}`);
  }

  // Seller
  allRoutes.add('/seller');
  for (const p of getPaths(sellerBlock)) {
    const clean = p.replace(/^\//, '');
    if (clean !== 'seller') {
      allRoutes.add(`/seller/${clean}`);
    }
  }

  // Admin
  allRoutes.add('/admin');
  for (const p of getPaths(adminBlock)) {
    const clean = p.replace(/^\//, '');
    if (clean !== 'admin') {
      allRoutes.add(`/admin/${clean}`);
    }
  }

  // Resolve dynamic param segments
  const resolved = [];
  for (const r of allRoutes) {
    let clean = r.replace(/\/+/g, '/');
    if (clean !== '/' && clean.endsWith('/')) clean = clean.slice(0, -1);
    if (clean.includes('/sellers/:id')) {
      clean = clean.replace(':id', 'seller_1');
    } else if (clean.includes('/orders/:id')) {
      clean = clean.replace(':id', 'ord_1');
    } else {
      clean = clean.replace(':id', 'prod_1');
    }
    clean = clean.replace(':number', 'LH-2026-001');
    resolved.push(clean);
  }

  return Array.from(new Set(resolved)).sort();
}

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

  send(method, params = {}, timeoutMs = 20000) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`CDP timeout on ${method}`));
      }, timeoutMs);
      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression, timeoutMs = 20000) {
    try {
      const res = await this.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      }, timeoutMs);
      if (res.exceptionDetails) {
        return { exception: res.exceptionDetails };
      }
      return { value: res.result?.value };
    } catch (err) {
      return { exception: { text: err.message } };
    }
  }
}

const ROLES = {
  guest: null,
  customer: {
    id: 'usr_customer',
    name: 'أميرة أحمد',
    email: 'customer@test.com',
    role: 'customer',
  },
  seller1: {
    id: 'seller_1',
    name: 'البائعة الأولى',
    displayName: { ar: 'مشغل الأمل للوسائل', en: 'Al-Amal Craft Workshop' },
    bio: { ar: 'ورشة متخصصة في صناعة الوسائل التعليمية للأطفال', en: 'Handmade educational toys and aids for nurseries' },
    email: 'seller1@test.com',
    phone: '01012345678',
    walletNumber: '01012345678',
    role: 'seller',
    governorate: 'القاهرة',
    workshopAddress: 'المعادي، القاهرة',
  },
  seller2: {
    id: 'seller_2',
    name: 'البائعة الثانية',
    displayName: '',
    bio: { ar: '', en: '' },
    email: 'seller2@test.com',
    phone: '01098765432',
    walletNumber: '',
    role: 'seller',
    governorate: 'الجيزة',
    workshopAddress: '',
  },
  admin: {
    id: 'usr_admin',
    name: 'Admin',
    email: 'admin@test.com',
    role: 'admin',
  },
};

const LANGUAGES = ['ar', 'en'];
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
];

async function seedTestData(cdp) {
  const testData = {
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
        name: 'البائعة الأولى',
        displayName: { ar: 'مشغل الأمل للوسائل', en: 'Al-Amal Craft Workshop' },
        bio: { ar: 'ورشة متخصصة في صناعة الوسائل التعليمية للأطفال', en: 'Handmade educational toys and aids for nurseries' },
        email: 'seller1@test.com',
        phone: '01012345678',
        walletNumber: '01012345678',
        role: 'seller',
        governorate: 'القاهرة',
        workshopAddress: 'المعادي، القاهرة',
        createdAt: '2026-08-01T10:00:00Z',
      },
      {
        id: 'seller_2',
        name: 'البائعة الثانية',
        displayName: '',
        bio: { ar: '', en: '' },
        email: 'seller2@test.com',
        phone: '01098765432',
        walletNumber: '',
        role: 'seller',
        governorate: 'الجيزة',
        workshopAddress: '',
        createdAt: '2026-08-05T11:00:00Z',
      },
      {
        id: 'usr_customer',
        name: 'أميرة أحمد',
        email: 'customer@test.com',
        role: 'customer',
        createdAt: '2026-08-10T10:00:00Z',
      },
    ],
    products: [
      {
        id: 'prod_1',
        name: { ar: 'مكعبات الأرقام الخشبية', en: 'Wooden Number Blocks' },
        description: { ar: 'وسيلة تعليمية خشبية لتعليم الحساب والأرقام', en: 'Wooden educational aid for teaching counting' },
        sellerId: 'seller_1',
        sellerName: 'مشغل الأمل للوسائل',
        price: 250,
        inStock: true,
        isPublished: true,
        categoryId: 'math',
        images: ['/products/placeholder.jpg'],
        details: {
          size: { ar: '20 سم في 20 سم', en: '20cm x 20cm' },
          usage: { ar: 'حلقة الصباح والرياضيات', en: 'Morning circle and math' },
          care: { ar: 'المسح بقطعة قماش جافة', en: 'Wipe with dry cloth' },
        },
      },
    ],
    categories: [
      { id: 'math', name: 'الرياضيات والأرقام', nameEn: 'Math & Numbers' },
      { id: 'montessori', name: 'منتسوري', nameEn: 'Montessori' },
    ],
    orders: [
      {
        id: 'ord_1',
        orderNumber: 'LH-2026-001',
        customerId: 'usr_customer',
        customerName: 'أميرة أحمد',
        customerPhone: '01012345678',
        delivery: {
          name: 'أميرة أحمد',
          phone: '01012345678',
          address: 'المعادي، القاهرة',
          city: 'القاهرة',
        },
        payment: {
          method: 'vodafone_cash',
          status: 'pending',
          senderPhone: '01012345678',
          reference: 'TXN-001',
          receiptUrl: '/receipts/sample.jpg',
        },
        status: 'delivered',
        total: 250,
        createdAt: '2026-11-01T10:00:00Z',
        items: [
          {
            productId: 'prod_1',
            name: { ar: 'مكعبات الأرقام الخشبية', en: 'Wooden Number Blocks' },
            qty: 1,
            unitPrice: 250,
            image: '/products/placeholder.jpg',
            sellerId: 'seller_1',
          },
        ],
      },
    ],
    payouts: [
      {
        id: 'pay_1',
        sellerId: 'seller_1',
        sellerName: 'مشغل الأمل للوسائل',
        amount: 200,
        status: 'completed',
        walletNumber: '01012345678',
        createdAt: '2026-11-01T12:00:00Z',
      },
    ],
    notifications: [
      {
        id: 'notif_1',
        type: 'order_status_update',
        userId: 'seller_1',
        title: 'تم تحديث حالة الطلب',
        message: 'تم تسليم وسيلة تعليمية إلى الحضانة بنجاح',
        read: false,
        createdAt: '2026-11-02T14:00:00Z',
      },
    ],
    settings: {
      commissionRate: 0.20,
      platformWallet: '01000000000',
    },
    favorites: {},
    addresses: {},
    customRequests: [],
  };

  await cdp.eval(`
    (() => {
      localStorage.setItem('lh_mock_db_v3', JSON.stringify(${JSON.stringify(testData)}));
    })()
  `);
}

async function resetTestData(cdp) {
  await cdp.eval(`
    (() => {
      localStorage.removeItem('lh_mock_db_v3');
      localStorage.removeItem('lh_current_user');
      localStorage.removeItem('lh_auth_token');
    })()
  `);
}

async function waitForPageReady(cdp, maxWaitMs = 2500) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await cdp.eval(`
      (() => {
        const root = document.getElementById('root');
        const text = document.body ? document.body.textContent.trim() : '';
        const isLoading = text === 'جاري تجهيز الصفحة...' || text === 'Loading page...' || text === 'جاري التحميل...';
        const hasError = text.includes('Unexpected Application Error') || text.includes('عذراً، حدث خطأ غير متوقع') || text.includes('Oops! An unexpected error occurred');
        const hasMounted = root && root.children.length > 0;
        return {
          length: text.length,
          isLoading,
          hasError,
          ready: hasError || (hasMounted && text.length > 20 && !isLoading),
          snippet: text.slice(0, 150),
        };
      })()
    `);

    if (res.value && res.value.ready) {
      return res.value;
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  // Fallback check
  const fallback = await cdp.eval(`
    (() => {
      const text = document.body ? document.body.textContent.trim() : '';
      return {
        length: text.length,
        isLoading: false,
        hasError: text.includes('Unexpected Application Error') || text.includes('عذراً، حدث خطأ غير متوقع') || text.includes('Oops! An unexpected error occurred'),
        snippet: text.slice(0, 150),
      };
    })()
  `);
  return fallback.value || { length: 0, hasError: false };
}

async function main() {
  const BASE_URL = await getDevServerUrl();
  console.log(`\n======================================================`);
  console.log(`TEST: ROUTES REGRESSION SUITE (Agent CRASH)`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const routes = extractRoutesFromRouter();
  console.log(`Extracted ${routes.length} routes from router.jsx:`);
  console.log(routes.join(', '));

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-test-routes-'));

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

  let totalTested = 0;
  let totalPassed = 0;
  const failures = [];

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
    const cdp = new CDPClient(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const consoleErrors = [];
    const uncaughtExceptions = [];

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
          if (!text.includes('favicon') && !text.includes('Failed to load resource') && !text.includes('non-boolean attribute')) {
            consoleErrors.push(text);
          }
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        uncaughtExceptions.push(msg.params.exceptionDetails);
      }
    });

    // Initial navigation to mount app
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1200));
    await seedTestData(cdp);

    const rolesList = Object.keys(ROLES);

    for (const roleKey of rolesList) {
      const user = ROLES[roleKey];

      for (const lang of LANGUAGES) {
        for (const vp of VIEWPORTS) {
          // Set viewport
          await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: vp.width,
            height: vp.height,
            deviceScaleFactor: 1,
            mobile: vp.name === 'mobile',
          });

          // Set user session and language in localStorage
          await cdp.eval(`
            (() => {
              if (${JSON.stringify(user)}) {
                localStorage.setItem('lh_current_user', JSON.stringify(${JSON.stringify(user)}));
                localStorage.setItem('lh_auth_token', 'mock_token_${user ? user.id : ''}');
              } else {
                localStorage.removeItem('lh_current_user');
                localStorage.removeItem('lh_auth_token');
              }
              localStorage.setItem('lh_lang', '${lang}');
              document.documentElement.lang = '${lang}';
              document.documentElement.dir = '${lang === 'ar' ? 'rtl' : 'ltr'}';
            })()
          `);

          for (const route of routes) {
            totalTested++;
            consoleErrors.length = 0;
            uncaughtExceptions.length = 0;

            // Client-side navigate
            await cdp.eval(`
              (() => {
                history.pushState(null, '', '${route}');
                window.dispatchEvent(new PopStateEvent('popstate'));
              })()
            `);

            // Wait for render
            const bodyInfo = await waitForPageReady(cdp);

            // Safe tab interaction (only [role="tab"], no buttons that might submit forms)
            await cdp.eval(`
              (() => {
                const tabs = document.querySelectorAll('[role="tab"]');
                if (tabs.length > 1) {
                  tabs[1].click();
                }
              })()
            `);

            await new Promise((r) => setTimeout(r, 40));

            let failureReason = null;

            if (uncaughtExceptions.length > 0) {
              failureReason = `Uncaught Exception: ${uncaughtExceptions[0].text || uncaughtExceptions[0].exception?.description || 'unknown'}`;
            } else if (consoleErrors.length > 0) {
              failureReason = `Console Error: ${consoleErrors[0].slice(0, 150)}`;
            } else if (bodyInfo.hasError) {
              failureReason = bodyInfo.snippet.includes('Unexpected Application Error')
                ? 'Unexpected Application Error visible on page'
                : 'Route ErrorPage boundary triggered';
            } else if (bodyInfo.length === 0) {
              failureReason = 'Blank page detected (0 text length)';
            }

            if (failureReason) {
              failures.push({
                route,
                role: roleKey,
                language: lang,
                viewport: vp.name,
                error: failureReason,
              });
              process.stdout.write('F');
            } else {
              totalPassed++;
              process.stdout.write('.');
            }
          }
        }
      }
    }

    console.log('\n\n--- Resetting Mock DB ---');
    await resetTestData(cdp);

  } finally {
    browser.kill();
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log('\n======================================================');
  console.log(`TEST RUN SUMMARY`);
  console.log(`Total Combinations: ${totalTested}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${failures.length}`);
  console.log('======================================================\n');

  if (failures.length > 0) {
    console.table(failures);
    process.exit(1);
  } else {
    console.log(`\x1b[32mALL ${totalTested} ROUTE COMBINATIONS PASSED WITH ZERO CRASHES!\x1b[0m\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
