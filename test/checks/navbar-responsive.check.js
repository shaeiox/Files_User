/**
 * Navbar responsive layout regression check.
 *
 * Guards the one thing CSS cannot be unit-tested for statically: whether the
 * bar's content actually fits the page box. The navbar's floor is fixed
 * (5 x 44px touch targets + the brand mark + 28px of chrome) while its
 * optional text — the wordmark, the version badge, the two pill labels — is
 * what gets shed to pay for it. If a breakpoint is moved in the wrong
 * direction the bar regrows as it narrows and the theme / auth / disclosure
 * controls slide off the right edge.
 *
 * That regression shipped once (audit finding F1) and the fix went stale
 * because two more items joined the bar afterwards, so the check is a live
 * layout measurement, not a CSS grep.
 *
 * Run:  node test/checks/navbar-responsive.check.js
 * Exit: 0 = no overflow and every control reachable, 1 = a regression,
 *       0 with a SKIP notice when no browser is available (see SKIP below).
 *
 * SKIP: playwright is not a dependency of this project, so on a machine
 * without it (CI included) the check prints SKIP and passes. It is an
 * evidence tool, not a gate — run it when you want the numbers.
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const PORT = 43917;
const WIDTHS = [320, 360, 375, 390, 414, 480, 540, 600, 640];
const DIRECTIONS = ['ltr', 'rtl'];
const TARGET = 44; // the touch-target floor the navbar holds everywhere

const CONTROLS = ['#authBtn', '#themeBtn', '#navDisclosure', '.perf-pill', '#langBtn'];

async function load() {
  try {
    return { chromium: (await import('playwright')).chromium };
  } catch {
    return null;
  }
}

function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), RATE_LIMIT_MAX_REQUESTS: '1000000', LOG_FILE: 'off' },
    stdio: 'ignore',
  });
  return child;
}

async function waitForServer(deadline = 20000) {
  const until = Date.now() + deadline;
  while (Date.now() < until) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function main() {
  const pw = await load();
  if (!pw) {
    console.log('SKIP navbar-responsive: playwright is not installed.');
    console.log('     npm i -D playwright && npx playwright install chromium');
    return 0;
  }

  const server = startServer();
  let browser;
  try {
    if (!await waitForServer()) {
      console.error('FAIL: server did not start on port ' + PORT);
      return 1;
    }

    // Chromium's own revision may not match the installed playwright build;
    // reuse a previously-downloaded one rather than failing on a network fetch.
    let launchError;
    browser = await pw.chromium.launch().catch((err) => { launchError = err; });
    if (!browser) {
      console.log('SKIP navbar-responsive: ' + String(launchError.message).split('\n')[0]);
      return 0;
    }

    const failures = [];
    /* The callbacks passed to page.evaluate/waitForFunction below are
       serialised into the browser, so they see browser globals. */
    /* eslint-disable no-undef */
    for (const dir of DIRECTIONS) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: 700 } });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !!document.querySelector('.nav-bar'), null, { timeout: 10000 });
        // The bar fades up (250ms) and the auth button scales in (260ms);
        // getBoundingClientRect reports the transformed box, so measure at rest.
        await page.waitForTimeout(700);
        await page.evaluate((d) => document.documentElement.setAttribute('dir', d), dir);

        const report = await page.evaluate(({ controls, target }) => {
          const bar = document.querySelector('.nav-bar').getBoundingClientRect();
          const offenders = [...document.querySelectorAll('.nav *')]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.right > window.innerWidth + 0.5 || r.left < -0.5);
            })
            .map((el) => el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0]);
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            barRight: Math.round(bar.right),
            viewport: window.innerWidth,
            offenders: [...new Set(offenders)].slice(0, 4),
            controls: controls.map((s) => {
              const el = document.querySelector(s);
              if (!el || getComputedStyle(el).display === 'none') return null;
              const r = el.getBoundingClientRect();
              return {
                s,
                h: Math.round(r.height),
                left: Math.round(r.left),
                right: Math.round(r.right),
                ok: r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && r.height >= target - 0.5,
              };
            }).filter(Boolean),
          };
        }, { controls: CONTROLS, target: TARGET });

        const bad = report.controls.filter((c) => !c.ok);
        const why = [];
        if (report.overflow > 0) why.push(`+${report.overflow}px scrollWidth`);
        if (report.offenders.length) why.push(`past edge: ${report.offenders.join(', ')}`);
        if (bad.length) why.push(`unreachable/undersized: ${bad.map((c) => `${c.s} ${c.left}..${c.right}@${c.h}px`).join(', ')}`);

        if (why.length) failures.push(`${dir} ${width}px - ${why.join(' | ')}`);
        console.log(`${why.length ? 'FAIL' : 'ok  '} ${dir} ${String(width).padStart(4)}px  bar right=${report.barRight}/${report.viewport}  ${why.join(' | ')}`);
        await ctx.close();
      }
    }
    /* eslint-enable no-undef */

    console.log('');
    if (failures.length) {
      console.error(`${failures.length} navbar overflow regression(s).`);
      return 1;
    }
    console.log(`No navbar overflow at ${WIDTHS.length} widths x ${DIRECTIONS.length} directions.`);
    return 0;
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().then((code) => process.exit(code), (err) => {
  console.error('navbar-responsive check crashed:', err);
  process.exit(1);
});