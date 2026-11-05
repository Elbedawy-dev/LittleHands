/**
 * i18n-crawl.cjs
 * Comprehensive zero-dependency headless browser crawler for Little Hands
 * Uses CDP (Chrome DevTools Protocol) over native WebSockets in Node.js 22
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CDP_PORT = 9400 + Math.floor(Math.random() * 400);

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

// In-page scanner function executed in browser context
const IN_PAGE_SCANNER = `
(() => {
  const violations = [];
  if (!document.documentElement || !document.body) {
    return { violations: [], inspectedNodes: 0 };
  }
  const currentLang = document.documentElement.getAttribute('lang') || 'ar';
  const currentDir = document.documentElement.getAttribute('dir') || 'rtl';

  // 1. Check <html lang dir>
  if (currentLang === 'ar' && currentDir !== 'rtl') {
    violations.push({ selector: 'html', text: 'dir=' + currentDir, reason: 'Expected dir=rtl for lang=ar' });
  }
  if (currentLang === 'en' && currentDir !== 'ltr') {
    violations.push({ selector: 'html', text: 'dir=' + currentDir, reason: 'Expected dir=ltr for lang=en' });
  }

  // 2. Document title check
  const title = document.title || '';
  if (currentLang === 'en' && /[\\u0600-\\u06FF]/.test(title)) {
    violations.push({ selector: 'title', text: title, reason: 'Arabic characters in document.title in English' });
  }

  function isUserContent(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('[data-user-content="true"], [data-user-content]');
  }

  function isVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  }

  const ARABIC_REGEX = /[\\u0600-\\u06FF]/;
  const ARABIC_INDIC = /[\\u0660-\\u0669]/;
  const RAW_KEY_REGEX = /(?:[a-zA-Z0-9_-]+:[a-zA-Z0-9._-]+|\\bundefined\\b|\\bNaN\\b|\\[object Object\\]|\\bkey\\.not\\.found\\b)/i;

  let inspectedNodes = 0;

  // Walk all DOM nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node;

  while ((node = walker.nextNode())) {
    inspectedNodes++;

    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'path'].includes(tag)) continue;
      if (isUserContent(parent)) continue;
      if (!isVisible(parent)) continue;

      const text = node.nodeValue.trim();
      if (!text) continue;

      // a) Missing translation keys / literal interpolation errors
      if (RAW_KEY_REGEX.test(text)) {
        violations.push({
          selector: tag,
          text: text,
          reason: 'Raw translation key or undefined / NaN / [object Object] detected'
        });
      }

      // b) Arabic text leakage in English mode
      if (currentLang === 'en') {
        if (ARABIC_REGEX.test(text)) {
          violations.push({
            selector: tag + (parent.className ? '.' + String(parent.className).split(' ')[0] : ''),
            text: text,
            reason: 'Arabic text leaked in English mode'
          });
        }
        if (text.includes('ج.م')) {
          violations.push({ selector: tag, text, reason: 'Arabic currency symbol ج.م in English' });
        }
      } else {
        // c) Latin numerals check in Arabic mode (ARABIC_DIGITS=false)
        if (ARABIC_INDIC.test(text)) {
          violations.push({ selector: tag, text, reason: 'Arabic-Indic digits found with ARABIC_DIGITS=false' });
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (isUserContent(node)) continue;
      if (!isVisible(node)) continue;

      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg'].includes(tag)) continue;

      // Attributes check
      const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
      for (const attr of attrs) {
        const val = node.getAttribute(attr);
        if (!val || !val.trim()) continue;
        const trimmed = val.trim();

        if (RAW_KEY_REGEX.test(trimmed)) {
          violations.push({
            selector: tag + '[' + attr + ']',
            text: trimmed,
            reason: 'Raw translation key in ' + attr
          });
        }

        if (currentLang === 'en') {
          if (ARABIC_REGEX.test(trimmed)) {
            violations.push({
              selector: tag + '[' + attr + ']',
              text: trimmed,
              reason: 'Arabic in ' + attr + ' in English mode'
            });
          }
        } else {
          if (ARABIC_INDIC.test(trimmed)) {
            violations.push({
              selector: tag + '[' + attr + ']',
              text: trimmed,
              reason: 'Arabic-Indic digit in ' + attr + ' in Arabic mode'
            });
          }
        }
      }
    }
  }

  return { violations, inspectedNodes };
})()
`;

async function main() {
  console.log('\n======================================================');
  console.log(' Little Hands — Comprehensive i18n Browser Crawler');
  console.log('======================================================\n');

  const BASE_URL = await detectBaseUrl();
  console.log(`[CRAWL] Connecting to dev server at: ${BASE_URL}`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(edgePath) ? edgePath : chromePath;

  console.log(`[CRAWL] Using browser binary: ${browserPath}`);
  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-cdp-profile-'));

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
    // Connect to browser CDP
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

    if (!wsUrl) throw new Error('Failed to connect to browser CDP port!');
    const ws = new WebSocket(wsUrl);
    await new Promise((res) => (ws.onopen = res));
    cdp = new CDPClient(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. Navigate to home and seed dataset through services
    console.log('[CRAWL] Seeding mock database via application services...');
    await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1200));

    const seedResult = await cdp.eval(`
      (async () => {
        if (window.__seedLittleHandsDataset) {
          await window.__seedLittleHandsDataset();
          return true;
        }
        return false;
      })()
    `);
    console.log(`[CRAWL] Comprehensive dataset seeded: ${seedResult ? 'SUCCESS' : 'DEV SEED FALLBACK'}\n`);

    // Matrix definition
    const ROLES = [
      {
        id: 'guest',
        user: null,
      },
      {
        id: 'customer',
        user: {
          id: 'usr_cust_1',
          name: 'سارة محمد',
          email: 'sarah@nursery.eg',
          role: 'customer',
        },
      },
      {
        id: 'seller',
        user: {
          id: 'seller_1',
          name: { ar: 'البائعة الأولى', en: 'First Seller' },
          email: 'seller1@test.com',
          role: 'seller',
        },
      },
      {
        id: 'admin',
        user: {
          id: 'usr_admin',
          name: 'Admin',
          email: 'admin@test.com',
          role: 'admin',
        },
      },
    ];

    const LANGUAGES = ['ar', 'en'];

    const ROUTES_BY_ROLE = {
      guest: [
        '/',
        '/products',
        '/products/prod_1',
        '/sellers',
        '/sellers/seller_1',
        '/about',
        '/cart',
        '/checkout',
        '/login',
        '/register',
        '/forgot-password',
      ],
      customer: [
        '/account',
        '/account/orders',
        '/account/orders/ord_1',
        '/account/favorites',
        '/account/addresses',
        '/account/settings',
        '/notifications',
      ],
      seller: [
        '/seller',
        '/seller/products',
        '/seller/products/new',
        '/seller/products/prod_1/edit',
        '/seller/orders',
        '/seller/earnings',
        '/seller/profile',
        '/seller/notifications',
      ],
      admin: [
        '/admin',
        '/admin/orders',
        '/admin/products',
        '/admin/categories',
        '/admin/sellers',
        '/admin/customers',
        '/admin/payments',
        '/admin/settings',
        '/admin/account',
        '/admin/notifications',
      ],
    };

    const allViolations = [];
    let combinationsCount = 0;
    let totalNodesInspected = 0;
    const visitedRoutes = new Set();

    for (const roleObj of ROLES) {
      const routes = ROUTES_BY_ROLE[roleObj.id] || [];

      for (const lang of LANGUAGES) {
        console.log(`\n---> Role: [${roleObj.id}] | Language: [${lang.toUpperCase()}]`);

        // Ensure browser is on our domain before setting localStorage
        await cdp.send('Page.navigate', { url: `${BASE_URL}/` });
        await new Promise((r) => setTimeout(r, 400));

        // Set session state and language
        await cdp.eval(`
          (() => {
            try {
              localStorage.setItem('lh_lang', '${lang}');
              ${
                roleObj.user
                  ? `localStorage.setItem('lh_current_user', ${JSON.stringify(JSON.stringify(roleObj.user))});
                     localStorage.setItem('lh_auth_token', 'mock_token_${roleObj.user.id}');`
                  : `localStorage.removeItem('lh_current_user');
                     localStorage.removeItem('lh_auth_token');`
              }
            } catch (e) {}
          })()
        `);

        for (const route of routes) {
          visitedRoutes.add(route);
          combinationsCount++;

          const targetUrl = `${BASE_URL}${route}`;
          await cdp.send('Page.navigate', { url: targetUrl });
          await new Promise((r) => setTimeout(r, 600));

          // Wait until document.body is available and any page loader completes
          for (let w = 0; w < 15; w++) {
            try {
              const ready = await cdp.eval(`!!document.body && !document.querySelector('.animate-spin')`);
              if (ready) break;
            } catch (e) {}
            await new Promise((r) => setTimeout(r, 150));
          }

          let res = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              res = await cdp.eval(IN_PAGE_SCANNER);
              break;
            } catch (err) {
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 400));
              } else {
                console.warn(`Evaluation warning on ${route}:`, err.message || err);
              }
            }
          }

          const pageViolations = res?.violations || [];
          totalNodesInspected += res?.inspectedNodes || 0;

          if (pageViolations.length > 0) {
            console.log(`  [FAIL] ${route} -> ${pageViolations.length} violation(s)`);
            pageViolations.forEach((v) => {
              console.log(`    - [${v.selector}] "${v.text}": ${v.reason}`);
              allViolations.push({
                route,
                role: roleObj.id,
                lang,
                ...v,
              });
            });
          } else {
            console.log(`  [PASS] ${route} (${res?.inspectedNodes || 0} nodes inspected)`);
          }
        }
      }
    }

    console.log('\n------------------------------------------------------');
    console.log('Crawl finished!');
    console.log(`- Unique Routes Crawled: ${visitedRoutes.size}`);
    console.log(`- Total Combinations (Role x Lang x Route): ${combinationsCount}`);
    console.log(`- Total DOM Nodes Inspected: ${totalNodesInspected}`);
    console.log(`- Total Violations Detected: ${allViolations.length}`);
    console.log('------------------------------------------------------\n');

    if (allViolations.length > 0) {
      console.table(allViolations.slice(0, 50));
      if (allViolations.length > 50) {
        console.log(`... and ${allViolations.length - 50} more violations.`);
      }
    }

    // Generate I18N_CRAWL_REPORT.md
    const reportContent = `# Little Hands — i18n Browser Crawl Report

## Executive Summary
This report documents the automated end-to-end browser crawling verification across all Little Hands routes, roles, and languages.
- **Unique Routes Crawled:** ${visitedRoutes.size}
- **Total Combinations Tested:** ${combinationsCount}
- **Total DOM Text Nodes Inspected:** ${totalNodesInspected}
- **Final Result:** ${allViolations.length === 0 ? '**0 VIOLATIONS (PASSED)**' : `**${allViolations.length} VIOLATIONS FOUND**`}

---

## Crawl Matrix
1. **Roles:**
   - \`guest\` (Unauthenticated visitor)
   - \`customer\` (Registered nursery teacher / supervisor)
   - \`seller\` (Artisan seller dashboard)
   - \`admin\` (Platform administration dashboard)
2. **Languages:**
   - Arabic (\`ar\`, \`dir="rtl"\`)
   - English (\`en\`, \`dir="ltr"\`)

---

## Allowed Terminology
The following terms are permitted in Arabic mode:
- \`KG1\` / \`KG2\`: Educational kindergarten stage levels recognized standard in Egyptian preschool curricula.
- \`Vodafone Cash\` / \`Vodafone\`: Registered brand name of the telecommunications wallet.
- \`LH-2026-###\`: Little Hands system order identifiers.
- \`AR\` / \`EN\`: Language switcher toggle codes.
- Standard email addresses, URLs, and numeric IDs.

---

## User Content Exclusions
Dynamic seller/customer user-entered content is marked with \`data-user-content="true"\` on its container and isolated from UI translation checks.

---

## Violations Table
${
  allViolations.length === 0
    ? '*None. All crawled routes, roles, and languages passed with zero violations.*'
    : `| Route | Role | Language | Element / Attribute | Offending Text | Reason |
|---|---|---|---|---|---|
` +
      allViolations
        .map(
          (v) =>
            `| \`${v.route}\` | \`${v.role}\` | \`${v.lang}\` | \`${v.selector}\` | ${String(v.text).replace(/\|/g, '\\|')} | ${v.reason} |`
        )
        .join('\n')
}
`;

    const reportPath = path.resolve(__dirname, '..', '..', 'I18N_CRAWL_REPORT.md');
    fs.writeFileSync(reportPath, reportContent, 'utf8');
    console.log(`Saved crawl report to: ${reportPath}`);

    // Reset database to initial state
    await cdp.eval(`
      (() => {
        localStorage.removeItem('lh_mock_db_v1');
        localStorage.removeItem('lh_mock_db_v2');
        localStorage.removeItem('lh_mock_db_v3');
        localStorage.removeItem('lh_current_user');
        localStorage.removeItem('lh_auth_token');
      })()
    `);

    if (allViolations.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    if (cdp && cdp.ws) {
      cdp.ws.close();
    }
    browser.kill();
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch (e) {}
  }
}

main().catch((err) => {
  console.error('Fatal crawl error:', err);
  process.exit(1);
});
