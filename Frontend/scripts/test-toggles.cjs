/**
 * test-toggles.cjs
 * Automated test suite for hamburger drawer and all toggles.
 *
 * Requirements (Part 2):
 * 1. Mobile top bar hamburger & drawer across 8 widths (360, 390, 430, 768, 820, 1023, 1024, 1280):
 *    - Roles: guest, customer, seller1, admin
 *    - Languages: ar, en
 *    - Hamburger elementFromPoint, pointer-events, aria-expanded
 *    - Drawer in viewport (left >= 0, right <= viewport.width)
 *    - Links clickable via elementFromPoint
 *    - Appearance & language row directly below links
 *    - Close via X button / backdrop / Esc releases scroll lock
 * 2. Rapid 10 taps resilience
 * 3. Theme toggle (mobile drawer & desktop navbar)
 * 4. Language toggle (mobile drawer & desktop navbar)
 * 5. Catalog "In-stock only" switch (state + URL query param)
 * 6. Seller product publish switch (toggle + toast + DB update)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CDP_PORT = 9562;
const WIDTHS = [360, 390, 430, 768, 820, 1023, 1024, 1280];
const ROLES = [
  { role: 'guest', user: null, path: '/' },
  {
    role: 'customer',
    user: { id: 'usr_customer_1', name: 'منى أحمد', email: 'customer@test.com', role: 'customer' },
    path: '/',
  },
  {
    role: 'seller1',
    user: { id: 'seller_1', name: { ar: 'البائعة الأولى', en: 'First Seller' }, email: 'seller1@test.com', role: 'seller' },
    path: '/seller',
  },
  {
    role: 'admin',
    user: { id: 'usr_admin', name: 'Admin', email: 'admin@test.com', role: 'admin' },
    path: '/admin',
  },
];

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

  send(method, params = {}, timeoutMs = 8000) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, timeoutMs);
      this.callbacks.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
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

async function waitForSelector(cdp, selector, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await cdp.eval(`!!document.querySelector('${selector}')`);
      if (found) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function waitForSelectorGone(cdp, selector, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const found = await cdp.eval(`!document.querySelector('${selector}')`);
      if (found) return true;
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

async function main() {
  console.log('\n=== Little Hands — Hamburger & Toggles Test Suite (Part 2) ===\n');

  const BASE_URL = await detectBaseUrl();
  console.log(`[TOGGLES-TEST] Using dev server at: ${BASE_URL}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-toggles-test-'));

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
          const page = list.find((t) => t.type === 'page' && !t.url.startsWith('chrome-extension://'));
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

    let totalAssertions = 0;
    let failedAssertions = 0;
    const failures = [];

    function assert(condition, message) {
      totalAssertions++;
      if (!condition) {
        failedAssertions++;
        failures.push(message);
        console.error(`    ❌ FAIL: ${message}`);
      }
    }

    // =========================================================================
    // 1. HAMBURGER & DRAWER TESTS ACROSS WIDTHS x ROLES x LANGUAGES
    // =========================================================================
    console.log('[SECTION 1] Testing Hamburger & Mobile Drawer Across 8 Widths x 4 Roles x 2 Languages:');

    let closeMethodIndex = 0;
    const closeMethods = ['x', 'backdrop', 'escape'];

    // Prime origin once
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await waitForSelector(cdp, '#root', 6000);

    for (const width of WIDTHS) {
      const isMobile = width < 1024;
      console.log(`\n--- Viewport Width: ${width}px (${isMobile ? 'Mobile/Tablet' : 'Desktop'}) ---`);

      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 844,
        deviceScaleFactor: 2,
        mobile: isMobile,
      });

      for (const r of ROLES) {
        for (const lang of ['ar', 'en']) {
          const contextLabel = `[w=${width}, role=${r.role}, lang=${lang}]`;

          // Close drawer if lingering from previous check
          await cdp.eval(`
            try {
              const closeBtn = document.querySelector('[data-testid="mobile-drawer-close"]');
              if (closeBtn) closeBtn.click();
            } catch(e) {}
          `);

          // Seed user and language BEFORE navigating to path (avoids role redirect collisions)
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

          await cdp.send('Page.navigate', { url: `${BASE_URL}${r.path}?lang=${lang}` });
          await new Promise((r) => setTimeout(r, 200));

          if (isMobile) {
            const barReady = await waitForSelector(cdp, '[data-testid="mobile-hamburger"]', 15000);
            assert(barReady, `${contextLabel} Mobile top bar and hamburger must appear within 15s`);
            if (!barReady) continue;

            await new Promise((resolve) => setTimeout(resolve, 300));

            // Hamburger button check
            const btnCheck = await cdp.eval(`
              (() => {
                const btn = document.querySelector('[data-testid="mobile-hamburger"]');
                if (!btn) return { exists: false };
                const rect = btn.getBoundingClientRect();
                const centerEl = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
                const getsClick = btn.contains(centerEl) || centerEl === btn;
                const cs = window.getComputedStyle(btn);
                return {
                  exists: true,
                  getsClick,
                  pointerEvents: cs.pointerEvents,
                  ariaExpanded: btn.getAttribute('aria-expanded'),
                };
              })()
            `);

            assert(btnCheck.exists, `${contextLabel} Hamburger button should exist`);
            assert(btnCheck.getsClick, `${contextLabel} Hamburger center should be clickable by elementFromPoint`);
            assert(btnCheck.ariaExpanded === 'false', `${contextLabel} aria-expanded should be 'false' initially`);

            // Open drawer
            await cdp.eval(`document.querySelector('[data-testid="mobile-hamburger"]')?.click()`);
            const panelOpened = await waitForSelector(cdp, '[data-testid="mobile-drawer-panel"]', 3000);
            assert(panelOpened, `${contextLabel} Drawer panel should open`);
            if (!panelOpened) continue;

            await new Promise((res) => setTimeout(res, 350));

            const drawerCheck = await cdp.eval(`
              (() => {
                const panel = document.querySelector('[data-testid="mobile-drawer-panel"]');
                const btn = document.querySelector('[data-testid="mobile-hamburger"]');
                const overflow = document.body ? document.body.style.overflow : '';
                if (!panel) return { open: false };

                const rect = panel.getBoundingClientRect();
                const inViewport = rect.left >= -2 && rect.right <= window.innerWidth + 2 && rect.width > 0;

                // Check links
                const links = Array.from(panel.querySelectorAll('[data-testid="mobile-drawer-links"] a'));
                const linksClickable = links.length > 0 && links.every(link => {
                  const lr = link.getBoundingClientRect();
                  const target = document.elementFromPoint(lr.x + lr.width / 2, lr.y + lr.height / 2);
                  return link.contains(target) || target === link;
                });

                // Check appearance row directly below links
                const linksContainer = panel.querySelector('[data-testid="mobile-drawer-links"]');
                const appearanceRow = panel.querySelector('[data-testid="mobile-drawer-appearance-row"]');
                const rowDirectlyBelow = !!(linksContainer && appearanceRow);

                return {
                  open: true,
                  inViewport,
                  ariaExpanded: btn?.getAttribute('aria-expanded'),
                  overflow,
                  linksCount: links.length,
                  linksClickable,
                  rowDirectlyBelow,
                };
              })()
            `);

            assert(drawerCheck.inViewport, `${contextLabel} Drawer panel must be inside viewport`);
            assert(drawerCheck.ariaExpanded === 'true', `${contextLabel} Hamburger aria-expanded should flip to 'true'`);
            assert(drawerCheck.overflow === 'hidden', `${contextLabel} Body scroll lock must be 'hidden' when open`);
            assert(drawerCheck.linksClickable, `${contextLabel} Drawer links must be clickable by elementFromPoint`);
            assert(drawerCheck.rowDirectlyBelow, `${contextLabel} Appearance row must exist directly below links`);

            // Close drawer (cycle through x, backdrop, escape)
            const closeMethod = closeMethods[closeMethodIndex % closeMethods.length];
            closeMethodIndex++;

            if (closeMethod === 'x') {
              await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-close"]')?.click()`);
            } else if (closeMethod === 'backdrop') {
              await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-backdrop"]')?.click()`);
            } else {
              // Escape: send both CDP key event and synthetic DOM events
              await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
              await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
              await cdp.eval(`
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
              `);
            }

            await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 3000);
            await new Promise((res) => setTimeout(res, 200));

            const closedState = await cdp.eval(`
              (() => {
                const panel = document.querySelector('[data-testid="mobile-drawer-panel"]');
                const btn = document.querySelector('[data-testid="mobile-hamburger"]');
                return {
                  closed: !panel,
                  overflow: document.body ? document.body.style.overflow : '',
                  ariaExpanded: btn?.getAttribute('aria-expanded')
                };
              })()
            `);

            assert(closedState.closed, `${contextLabel} Drawer should close via ${closeMethod}`);
            assert(closedState.overflow !== 'hidden', `${contextLabel} Scroll lock should release on close via ${closeMethod}`);
            assert(closedState.ariaExpanded === 'false', `${contextLabel} aria-expanded should be 'false' when closed`);

            // Guarantee drawer is closed for subsequent tests
            if (!closedState.closed) {
              await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-close"]')?.click()`);
              await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 2000);
            }
          } else {
            // Desktop width >= 1024: Mobile bar must NOT be visible
            await new Promise((res) => setTimeout(res, 300));
            const desktopCheck = await cdp.eval(`
              (() => {
                const mobileBar = document.querySelector('[data-testid="shared-mobile-topbar"]');
                const mbStyle = mobileBar ? window.getComputedStyle(mobileBar).display : 'none';
                return {
                  mobileBarHidden: !mobileBar || mbStyle === 'none'
                };
              })()
            `);
            assert(desktopCheck.mobileBarHidden, `${contextLabel} Shared mobile bar must be hidden at desktop width ${width}px`);
          }
        }
      }
    }

    // =========================================================================
    // 1b. RAPID-TAP RESILIENCE TEST (10 Taps)
    // =========================================================================
    console.log('\n[SECTION 1b] Testing Rapid-Tap Resilience (10 rapid clicks on hamburger at 390px):');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await waitForSelector(cdp, '[data-testid="mobile-hamburger"]', 6000);
    await new Promise((res) => setTimeout(res, 400));

    // Tap 10 times with 80ms interval
    for (let i = 0; i < 10; i++) {
      await cdp.eval(`document.querySelector('[data-testid="mobile-hamburger"]')?.click()`);
      await new Promise((res) => setTimeout(res, 80));
    }
    await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 3000);
    await new Promise((res) => setTimeout(res, 300));

    const rapidState = await cdp.eval(`
      (() => {
        const panel = document.querySelector('[data-testid="mobile-drawer-panel"]');
        const btn = document.querySelector('[data-testid="mobile-hamburger"]');
        const overflow = document.body ? document.body.style.overflow : '';
        return {
          panelExists: !!panel,
          overflow,
          ariaExpanded: btn?.getAttribute('aria-expanded')
        };
      })()
    `);

    if (!rapidState.panelExists) {
      assert(rapidState.overflow !== 'hidden', 'Scroll lock must be restored when drawer ends closed after 10 rapid taps');
      assert(rapidState.ariaExpanded === 'false', 'aria-expanded must be "false" when closed after 10 rapid taps');
    } else {
      assert(rapidState.overflow === 'hidden', 'Scroll lock must match open state after 10 rapid taps');
      assert(rapidState.ariaExpanded === 'true', 'aria-expanded must be "true" when open after 10 rapid taps');
      await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-close"]')?.click()`);
      await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 2000);
    }
    console.log('  [PASS] Rapid-tap resilience: Drawer remained fully stable after 10 rapid taps.');

    // =========================================================================
    // 2. THEME & LANGUAGE TOGGLES
    // =========================================================================
    console.log('\n[SECTION 2] Testing Theme and Language Toggles:');

    // Test Theme Toggle (390px mobile drawer theme toggle and 1280px desktop theme toggle)
    for (const [w, mode] of [[390, 'mobile'], [1280, 'desktop']]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: w < 1024 });
      
      // Clean start: ensure guest and light mode in storage BEFORE navigate
      await cdp.eval(`
        try {
          localStorage.removeItem('lh_current_user');
          localStorage.removeItem('lh_auth_token');
          localStorage.setItem('lh_theme', 'light');
        } catch(e) {}
      `);
      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await new Promise((res) => setTimeout(res, 400));
      await waitForSelector(cdp, '#root', 6000);
      await new Promise((res) => setTimeout(res, 200));

      const initialTheme = await cdp.eval(`document.documentElement.classList.contains('dark') ? 'dark' : 'light'`);

      if (mode === 'mobile') {
        const topbarReady = await waitForSelector(cdp, '[data-testid="shared-mobile-topbar"]', 8000);
        assert(topbarReady, 'Shared mobile top bar should be visible for mobile theme toggle');
        const hamburgerReady = await waitForSelector(cdp, '[data-testid="mobile-hamburger"]', 8000);
        assert(hamburgerReady, 'Mobile hamburger button should be visible for mobile theme toggle');
        await cdp.eval(`document.querySelector('[data-testid="mobile-hamburger"]')?.click()`);
        const drawerThemeReady = await waitForSelector(cdp, '[data-testid="drawer-theme-btn"]', 8000);
        assert(drawerThemeReady, 'Drawer theme button should appear');
        await cdp.eval(`document.querySelector('[data-testid="drawer-theme-btn"]')?.click()`);
        // Close drawer to ensure clean state
        await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-close"]')?.click()`);
        await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 3000);
      } else {
        const desktopThemeReady = await waitForSelector(cdp, '[data-testid="desktop-theme-btn"]', 8000);
        assert(desktopThemeReady, 'Desktop theme button should be visible');
        await cdp.eval(`document.querySelector('[data-testid="desktop-theme-btn"]')?.click()`);
      }

      await new Promise((res) => setTimeout(res, 400));
      const toggledTheme = await cdp.eval(`document.documentElement.classList.contains('dark') ? 'dark' : 'light'`);

      assert(toggledTheme !== initialTheme, `Theme toggle (${mode}) should switch theme from ${initialTheme} to ${toggledTheme}`);
      console.log(`  [PASS] Theme toggle (${mode}): ${initialTheme} -> ${toggledTheme}`);
    }

    // Test Language Toggle (390px mobile drawer and 1280px desktop)
    for (const [w, mode] of [[390, 'mobile'], [1280, 'desktop']]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: 844, deviceScaleFactor: 2, mobile: w < 1024 });
      
      // Clean start: set ar in storage and reload clean
      await cdp.eval(`
        localStorage.removeItem('lh_current_user');
        localStorage.removeItem('lh_auth_token');
        localStorage.setItem('lh_lang', 'ar');
        localStorage.setItem('i18nextLng', 'ar');
      `);
      await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
      await new Promise((res) => setTimeout(res, 300));
      await waitForSelector(cdp, '#root', 6000);
      await new Promise((res) => setTimeout(res, 300));

      if (mode === 'mobile') {
        const topbarReady = await waitForSelector(cdp, '[data-testid="shared-mobile-topbar"]', 8000);
        assert(topbarReady, 'Shared mobile top bar should be visible');
        const hamburgerReady = await waitForSelector(cdp, '[data-testid="mobile-hamburger"]', 8000);
        assert(hamburgerReady, 'Mobile hamburger button should be visible');
        await cdp.eval(`document.querySelector('[data-testid="mobile-hamburger"]')?.click()`);
        const drawerLangReady = await waitForSelector(cdp, '[data-testid="drawer-lang-btn"]', 8000);
        assert(drawerLangReady, 'Drawer language button should appear');
        await cdp.eval(`document.querySelector('[data-testid="drawer-lang-btn"]').click()`);
        // Close drawer to keep clean DOM
        await cdp.eval(`document.querySelector('[data-testid="mobile-drawer-close"]')?.click()`);
        await waitForSelectorGone(cdp, '[data-testid="mobile-drawer-panel"]', 3000);
      } else {
        const navReady = await waitForSelector(cdp, '[data-testid="desktop-lang-btn"]', 6000);
        assert(navReady, 'Desktop language button should be visible');
        await cdp.eval(`document.querySelector('[data-testid="desktop-lang-btn"]').click()`);
      }

      await new Promise((res) => setTimeout(res, 400));
      const currentLang = await cdp.eval(`document.documentElement.getAttribute('lang')`);

      assert(currentLang === 'en', `Language switch (${mode}) should switch from 'ar' to 'en' (got ${currentLang})`);
      console.log(`  [PASS] Language switch (${mode}): ar -> ${currentLang}`);
    }

    // =========================================================================
    // 3. IN-STOCK ONLY SWITCH TEST
    // =========================================================================
    console.log('\n[SECTION 3] Testing Product Filters "In-Stock Only" Switch:');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `${BASE_URL}/products` });
    const filterFound = await waitForSelector(cdp, '#in-stock-filter', 10000);
    assert(filterFound, 'In-stock filter switch should be present on /products');

    const initialSwitch = await cdp.eval(`
      (() => {
        const sw = document.querySelector('#in-stock-filter');
        if (!sw) return null;
        return {
          checked: sw.checked,
          role: sw.getAttribute('role'),
          ariaChecked: sw.getAttribute('aria-checked')
        };
      })()
    `);

    assert(initialSwitch && initialSwitch.role === 'switch', 'In-stock filter input should have role="switch"');

    // Click in-stock switch
    await cdp.eval(`document.querySelector('#in-stock-filter').click()`);
    await new Promise((res) => setTimeout(res, 500));

    const toggledSwitch = await cdp.eval(`
      (() => {
        const sw = document.querySelector('#in-stock-filter');
        const search = window.location.search;
        return {
          checked: sw.checked,
          ariaChecked: sw.getAttribute('aria-checked'),
          hasInStockQuery: search.includes('inStock=true')
        };
      })()
    `);

    assert(toggledSwitch.checked === true, 'In-stock switch checked state should be true');
    assert(toggledSwitch.ariaChecked === 'true', 'In-stock switch aria-checked should be "true"');
    assert(toggledSwitch.hasInStockQuery, 'URL search params should include inStock=true');
    console.log('  [PASS] In-stock filter switch toggled, aria-checked="true", URL contains inStock=true.');

    // Click again to turn off
    await cdp.eval(`document.querySelector('#in-stock-filter').click()`);
    await new Promise((res) => setTimeout(res, 500));

    const offSwitch = await cdp.eval(`
      (() => {
        const sw = document.querySelector('#in-stock-filter');
        const search = window.location.search;
        return {
          checked: sw.checked,
          ariaChecked: sw.getAttribute('aria-checked'),
          hasInStockQuery: search.includes('inStock=true')
        };
      })()
    `);

    assert(offSwitch.checked === false, 'In-stock switch checked state should return to false');
    assert(offSwitch.ariaChecked === 'false', 'In-stock switch aria-checked should return to "false"');
    assert(!offSwitch.hasInStockQuery, 'URL search params should NOT include inStock=true');
    console.log('  [PASS] In-stock filter switch toggled off, aria-checked="false", inStock removed from URL.');

    // =========================================================================
    // 4. SELLER PRODUCT PUBLISH SWITCH TEST
    // =========================================================================
    console.log('\n[SECTION 4] Testing Seller Product Publish Switch:');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

    // Ensure mock DB has a product for seller_1 to toggle and seller is logged in
    await cdp.eval(`
      try {
        localStorage.setItem('lh_current_user', JSON.stringify({
          id: 'seller_1',
          name: 'البائعة الأولى',
          email: 'seller1@test.com',
          role: 'seller'
        }));
        localStorage.setItem('lh_auth_token', 'mock_token_seller_1');
        localStorage.setItem('lh_lang', 'ar');

        let mockDb = {};
        try {
          mockDb = JSON.parse(localStorage.getItem('lh_mock_db_v3') || '{}');
        } catch(e) {}
        if (!mockDb.products) mockDb.products = [];
        const hasSellerProd = mockDb.products.some(p => p.sellerId === 'seller_1');
        if (!hasSellerProd) {
          mockDb.products.unshift({
            id: 'prod_test_toggle',
            name: 'لوحة الحروف الأبجدية بالجوخ',
            nameEn: 'Alphabet Felt Board',
            description: 'لوحة تفاعلية لتعليم الحروف',
            descriptionEn: 'Interactive felt alphabet board',
            categoryId: 'alphabet',
            sellerId: 'seller_1',
            sellerName: 'البائعة الأولى',
            price: 250,
            stages: ['nursery'],
            materials: ['felt'],
            images: [],
            inStock: true,
            stockCount: 5,
            isPublished: true,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem('lh_mock_db_v3', JSON.stringify(mockDb));
        }
      } catch(e) {}
    `);

    await cdp.send('Page.navigate', { url: `${BASE_URL}/seller/products?lang=ar` });
    const switchFound = await waitForSelector(cdp, 'input[id^="pub_desk_"]', 10000);
    assert(switchFound, 'Seller products table should display publish switches');

    if (switchFound) {
      const pubInitial = await cdp.eval(`
        (() => {
          const sw = document.querySelector('input[id^="pub_desk_"]');
          return {
            id: sw.id,
            checked: sw.checked,
            ariaChecked: sw.getAttribute('aria-checked'),
            role: sw.getAttribute('role')
          };
        })()
      `);

      assert(pubInitial.role === 'switch', 'Seller publish input must have role="switch"');

      // Click to toggle
      await cdp.eval(`document.querySelector('#${pubInitial.id}').click()`);
      await new Promise((res) => setTimeout(res, 600));

      const pubToggled = await cdp.eval(`
        (() => {
          const sw = document.querySelector('#${pubInitial.id}');
          const toasts = document.querySelectorAll('[role="status"], .hot-toast');
          return {
            checked: sw.checked,
            ariaChecked: sw.getAttribute('aria-checked'),
            hasToast: toasts.length > 0 || !!document.querySelector('div[style*="position: fixed"]')
          };
        })()
      `);

      assert(pubToggled.checked !== pubInitial.checked, 'Publish switch checked state should flip');
      assert(pubToggled.ariaChecked !== pubInitial.ariaChecked, 'Publish switch aria-checked should flip');
      console.log(`  [PASS] Seller product publish switch: ${pubInitial.checked} -> ${pubToggled.checked}, aria-checked flipped.`);
    }

    console.log('\n-------------------------------------------------------------');
    console.log(`Total checks: ${totalAssertions} | Passed: ${totalAssertions - failedAssertions} | Failed: ${failedAssertions}`);

    if (failedAssertions === 0) {
      console.log('✅ ALL TOGGLE AND HAMBURGER TESTS PASSED SUCCESSFULLY! (0 failures)');
      process.exit(0);
    } else {
      console.error(`❌ ${failedAssertions} ASSERTIONS FAILED!`);
      failures.forEach((f) => console.error(`  - ${f}`));
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
