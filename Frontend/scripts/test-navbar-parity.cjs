/**
 * test-navbar-parity.cjs
 * Automated verification of mobile & desktop navbar parity.
 *
 * Requirements (Part 1):
 * 1. At 390px for guest, customer, seller1, and admin in AR & EN:
 *    - Measures bounding boxes of: hamburger, logo mark, avatar, bell, cart
 *    - Asserts identical positions (+-2px) across roles and languages
 *    - Asserts no AR|EN switch, no theme toggle, and no role chip in the mobile bar
 * 2. At 1280px for AR & EN:
 *    - Asserts desktop bar has AR|EN nearest to nav links and search icon next
 * 3. Asserts each avatar click lands on the right URL:
 *    - guest -> /login
 *    - customer -> /account
 *    - seller1 -> /seller/profile
 *    - admin -> /admin/account
 * 4. Saves side-by-side screenshots (roles x languages).
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CDP_PORT = 9560;
const OUTPUT_DIR = path.resolve(__dirname, '../../screenshots/navbar-parity');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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

async function waitForSelector(cdp, selector, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await cdp.eval(`!!document.querySelector('${selector}')`);
      if (found) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

const ROLES = [
  {
    role: 'guest',
    user: null,
    path: '/',
    expectedAvatarUrl: '/login',
  },
  {
    role: 'customer',
    user: {
      id: 'usr_customer_1',
      name: 'منى أحمد',
      email: 'customer@test.com',
      role: 'customer',
    },
    path: '/',
    expectedAvatarUrl: '/account',
  },
  {
    role: 'seller1',
    user: {
      id: 'seller_1',
      name: { ar: 'البائعة الأولى', en: 'First Seller' },
      email: 'seller1@test.com',
      role: 'seller',
    },
    path: '/seller',
    expectedAvatarUrl: '/seller/profile',
  },
  {
    role: 'admin',
    user: {
      id: 'usr_admin',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
    },
    path: '/admin',
    expectedAvatarUrl: '/admin/account',
  },
];

async function detectBaseUrl() {
  const hosts = ['127.0.0.1', 'localhost'];
  const ports = [5173, 5174];
  for (const h of hosts) {
    for (const p of ports) {
      try {
        const res = await fetch(`http://${h}:${p}`);
        if (res.ok) return `http://${h}:${p}`;
      } catch (e) {}
    }
  }
  return 'http://127.0.0.1:5173';
}

async function main() {
  console.log('\n=== Little Hands — Navbar Parity Verification (Part 1) ===\n');

  const BASE_URL = await detectBaseUrl();
  console.log(`[NAVBAR-TEST] Testing against dev server at: ${BASE_URL}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-navbar-parity-'));

  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
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
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
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

    let allPassed = true;

    // =========================================================================
    // STEP 1: MOBILE 390px BOUNDING BOXES & NO EXTRA TOGGLES / CHIPS
    // =========================================================================
    console.log('[TEST 1/3] Measuring mobile 390px top bar bounding boxes across 8 combinations (4 roles x 2 languages)...');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    const measurements = [];

    for (const r of ROLES) {
      for (const lang of ['ar', 'en']) {
        const testId = `${r.role}-${lang}`;
        process.stdout.write(`  Measuring ${testId}... `);

        // Prime state on path
        await cdp.send('Page.navigate', { url: `${BASE_URL}${r.path}` });
        await new Promise((resolve) => setTimeout(resolve, 350));

        const userJson = r.user ? JSON.stringify(r.user) : 'null';

        await cdp.eval(`
          try {
            if (${r.user ? 'true' : 'false'}) {
              localStorage.setItem('lh_current_user', ${JSON.stringify(userJson)});
              localStorage.setItem('lh_auth_token', 'mock_token_${r.user ? r.user.id : ''}');
            } else {
              localStorage.removeItem('lh_current_user');
              localStorage.removeItem('lh_auth_token');
            }
            localStorage.setItem('lh_lang', '${lang}');
            localStorage.setItem('i18nextLng', '${lang}');
          } catch(e) {}
        `);

        // Reload to apply
        await cdp.send('Page.navigate', { url: `${BASE_URL}${r.path}?lang=${lang}` });
        const ready = await waitForSelector(cdp, '[data-testid="shared-mobile-topbar"]', 6000);

        if (!ready) {
          console.log(`FAILED: shared-mobile-topbar did not appear within 6s`);
          allPassed = false;
          continue;
        }

        // Small stabilization delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Evaluate bounding boxes and elements inside mobile bar
        const data = await cdp.eval(`
          (() => {
            const bar = document.querySelector('[data-testid="shared-mobile-topbar"]');
            if (!bar) return { error: 'Mobile top bar not found' };

            const getBox = (sel) => {
              const el = bar.querySelector(sel);
              if (!el) return null;
              const r = el.getBoundingClientRect();
              return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
            };

            const hamburger = getBox('[data-testid="mobile-hamburger"]');
            const logo = getBox('[data-testid="mobile-logo-mark"]');
            const cart = getBox('[data-testid="mobile-cart-btn"]');
            const bell = getBox('[data-testid="mobile-bell-btn"]');
            const avatar = getBox('[data-testid="mobile-avatar-btn"]');

            // Assert forbidden items inside mobile bar:
            // 1. Language switch (AR | EN)
            const hasLangSwitch = !!bar.querySelector('[data-testid="drawer-lang-btn"]') ||
                                  !!bar.querySelector('button[aria-label*="اللغة"], button[aria-label*="language"]');
            // 2. Theme switch
            const hasThemeSwitch = !!bar.querySelector('[data-testid="drawer-theme-btn"]') ||
                                   !!bar.querySelector('button[aria-label*="النهاري"], button[aria-label*="الليلي"], button[aria-label*="light"], button[aria-label*="dark"]');
            // 3. Role chip (e.g. "Platform Admin", "Seller", "لوحة تحكم")
            const hasRoleChip = !!bar.querySelector('[data-testid="role-chip"]') ||
                                Array.from(bar.querySelectorAll('span.rounded-full')).some(s =>
                                  s.innerText.includes('لوحة') || s.innerText.includes('Dashboard')
                                );

            const barHeight = Math.round(bar.getBoundingClientRect().height);

            return {
              barHeight,
              hamburger,
              logo,
              cart,
              bell,
              avatar,
              hasLangSwitch,
              hasThemeSwitch,
              hasRoleChip,
            };
          })()
        `);

        if (data.error) {
          console.log(`FAILED: ${data.error}`);
          allPassed = false;
          continue;
        }

        // Capture screenshot
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUTPUT_DIR, `mobile-${testId}.png`), Buffer.from(shot.data, 'base64'));

        measurements.push({
          role: r.role,
          lang,
          ...data,
        });

        console.log(`OK (h=${data.barHeight}px, hamburger x=${data.hamburger?.x}, avatar x=${data.avatar?.x})`);
      }
    }

    // Parity assertion across all 8 combinations (+-2px)
    console.log('\n[ASSERTION] Checking bounding boxes across all 8 combinations (+-2px threshold):');
    if (measurements.length === 8) {
      const base = measurements[0];

      for (let i = 0; i < measurements.length; i++) {
        const m = measurements[i];
        const name = `${m.role}-${m.lang}`;

        // Assert forbidden controls
        if (m.hasLangSwitch || m.hasThemeSwitch || m.hasRoleChip) {
          console.error(`  [FAIL] ${name} has forbidden controls in mobile bar! (lang: ${m.hasLangSwitch}, theme: ${m.hasThemeSwitch}, role: ${m.hasRoleChip})`);
          allPassed = false;
        }

        // Assert bar height 56-64px
        if (m.barHeight < 56 || m.barHeight > 64) {
          console.error(`  [FAIL] ${name} bar height ${m.barHeight}px outside 56-64px range!`);
          allPassed = false;
        }

        // Assert bounding boxes (+-2px compared to base)
        const elements = ['hamburger', 'logo', 'cart', 'bell', 'avatar'];
        for (const el of elements) {
          const b = base[el];
          const cur = m[el];

          if (!cur) {
            console.error(`  [FAIL] ${name} missing element ${el}`);
            allPassed = false;
            continue;
          }

          const dx = Math.abs(cur.x - b.x);
          const dy = Math.abs(cur.y - b.y);
          const dw = Math.abs(cur.width - b.width);
          const dh = Math.abs(cur.height - b.height);

          if (dx > 2 || dy > 2 || dw > 2 || dh > 2) {
            console.error(`  [FAIL] ${name} element ${el} shifted! diff: dx=${dx}, dy=${dy}, dw=${dw}, dh=${dh}`);
            allPassed = false;
          }
        }
      }

      if (allPassed) {
        console.log('  [PASS] All 8 mobile bar bounding boxes are identical within +-2px, no forbidden toggles/chips, bar height 56-64px.');
      }
    } else {
      console.error(`  [FAIL] Expected 8 measurements but got ${measurements.length}`);
      allPassed = false;
    }

    // =========================================================================
    // STEP 2: DESKTOP 1280px NAVBAR ORDER [AR|EN] [SEARCH] [THEME] [BELL] [CART] [AVATAR]
    // =========================================================================
    console.log('\n[TEST 2/3] Verifying desktop 1280px navbar order in AR and EN...');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (const lang of ['ar', 'en']) {
      await cdp.send('Page.navigate', { url: `${BASE_URL}/?lang=${lang}` });
      await waitForSelector(cdp, '[data-testid="desktop-nav-controls"]', 6000);

      const desktopCheck = await cdp.eval(`
        (() => {
          const controls = document.querySelector('[data-testid="desktop-nav-controls"]');
          if (!controls) return { error: 'desktop-nav-controls not found' };

          const children = Array.from(controls.children);
          const langBtn = controls.querySelector('[data-testid="desktop-lang-btn"]');
          const searchBtn = controls.querySelector('[data-testid="desktop-search-btn"]');

          const langIdx = children.indexOf(langBtn);
          const searchIdx = children.indexOf(searchBtn);

          return {
            langIdx,
            searchIdx,
            childrenCount: children.length,
          };
        })()
      `);

      if (desktopCheck.error) {
        console.error(`  [FAIL] Desktop check in ${lang}: ${desktopCheck.error}`);
        allPassed = false;
      } else {
        if (desktopCheck.langIdx !== 0 || desktopCheck.searchIdx !== 1) {
          console.error(`  [FAIL] Desktop order in ${lang} incorrect: langIdx=${desktopCheck.langIdx}, searchIdx=${desktopCheck.searchIdx} (expected 0 and 1)`);
          allPassed = false;
        } else {
          console.log(`  [PASS] Desktop order in ${lang}: [AR|EN] is nearest to nav links (index 0), [search] is next (index 1).`);
        }
      }

      // Capture desktop screenshot
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUTPUT_DIR, `desktop-public-${lang}.png`), Buffer.from(shot.data, 'base64'));
    }

    // =========================================================================
    // STEP 3: AVATAR CLICK NAVIGATION (guest, customer, seller1, admin)
    // =========================================================================
    console.log('\n[TEST 3/3] Verifying avatar click navigation for all roles...');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    for (const r of ROLES) {
      process.stdout.write(`  Checking avatar navigation for role "${r.role}"... `);

      await cdp.send('Page.navigate', { url: `${BASE_URL}${r.path}` });
      await new Promise((resolve) => setTimeout(resolve, 300));

      const userJson = r.user ? JSON.stringify(r.user) : 'null';

      await cdp.eval(`
        try {
          if (${r.user ? 'true' : 'false'}) {
            localStorage.setItem('lh_current_user', ${JSON.stringify(userJson)});
            localStorage.setItem('lh_auth_token', 'mock_token_${r.user ? r.user.id : ''}');
          } else {
            localStorage.removeItem('lh_current_user');
            localStorage.removeItem('lh_auth_token');
          }
        } catch(e) {}
      `);

      await cdp.send('Page.navigate', { url: `${BASE_URL}${r.path}` });
      await waitForSelector(cdp, '[data-testid="mobile-avatar-btn"]', 6000);
      // Wait for auth initialization (authService.me delay is 150ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Click avatar button
      await cdp.eval(`
        const btn = document.querySelector('[data-testid="mobile-avatar-btn"]');
        if (btn) btn.click();
      `);

      await new Promise((resolve) => setTimeout(resolve, 600));

      const currentUrl = await cdp.eval('window.location.pathname');

      if (currentUrl === r.expectedAvatarUrl) {
        console.log(`OK (navigated to ${currentUrl})`);
      } else {
        console.error(`FAILED: landed on ${currentUrl}, expected ${r.expectedAvatarUrl}`);
        allPassed = false;
      }
    }

    console.log('\n-------------------------------------------------------------');
    if (allPassed) {
      console.log('✅ ALL NAVBAR PARITY TESTS PASSED SUCCESSFULLY! (0 violations)');
      console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
      process.exit(0);
    } else {
      console.error('❌ SOME NAVBAR PARITY TESTS FAILED!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    try {
      browser.kill();
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (e) {}
  }
}

main();
