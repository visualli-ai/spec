// Touch / responsive smoke test: tap behaviour, the bottom-sheet peek, layout classes
// across phone, tablet and desktop sizes. Uses docs/assets/example.visualli.
//
//   node scripts/smoke-mobile.mjs [--no-build]

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = resolve(root, 'renderers/visualli-sdk/apps/react');
const run = (cmd, a, o = {}) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit', ...o }).on('exit', c => (c ? rej(new Error(`${cmd} ${c}`)) : res())));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 4181;
if (!process.argv.includes('--no-build')) await run('npm', ['run', 'build'], { cwd: root });
await run('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir, stdio: 'ignore' });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await sleep(2500);

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };
const browser = await chromium.launch();

async function open(viewport, { touch }) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`http://localhost:${port}/bench.html?doc=example&theme=light`);
  await page.evaluate(() => window.__bench.ready);
  await page.waitForSelector('canvas', { timeout: 8000 });
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}
const layerChange = page => page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
const awaitLayer = async page => {
  await Promise.race([page.evaluate(() => window.__bench.changed), new Promise((_, rej) => setTimeout(() => rej(new Error('layer did not change')), 8000))]);
  await page.waitForTimeout(1800);
};
// A real tap: touch events, then the compatibility mouse events browsers fire after it
// (these used to reopen / close the peek and make it flash).
const tap = async (page, x, y) => {
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(30);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
};
const pos = (page, t) => page.evaluate(x => window.__bench.nodeScreen(x), t);

try {
  // ── phone ──
  {
    const { ctx, page, errors } = await open({ width: 390, height: 844 }, { touch: true });
    check('phone: map is in touch mode', await page.evaluate(() => document.querySelector('.vi-map').classList.contains('is-touch')));
    check('phone: compact layout class', await page.evaluate(() => document.querySelector('.vi-map').classList.contains('is-compact')));
    // root has a child layer: tap opens the sheet (it used to navigate straight away / flash)
    let p = await pos(page, 'The Water Cycle');
    await tap(page, p.x, p.y);
    await page.waitForSelector('.vi-fact--sheet', { timeout: 3000 });
    await page.waitForTimeout(2500);
    check('phone: tapping an idea opens a bottom sheet that stays open', (await page.locator('.vi-fact--sheet').count()) === 1);
    check('phone: sheet shows the idea title', /The Water Cycle/.test(await page.textContent('.vi-fact--sheet .vi-fact__title') ?? ''));
    check('phone: sheet is at the bottom edge', await page.evaluate(() => { const r = document.querySelector('.vi-fact--sheet').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 2; }));
    check('phone: no floating peek in touch mode', (await page.locator('.vi-map__fact').count()) === 0);
    check('phone: controls clear of the sheet', await page.evaluate(() => { const s = document.querySelector('.vi-fact--sheet').getBoundingClientRect(), c = document.querySelector('.vi-ctrls').getBoundingClientRect(); return c.bottom <= s.top + 1; }));
    // step inside from the sheet
    await layerChange(page);
    await page.tap('.vi-fact--sheet .vi-fact__step');
    await awaitLayer(page);
    check('phone: Step inside navigates and closes the sheet', (await page.locator('.vi-trail li').count()) === 2 && (await page.locator('.vi-fact--sheet').count()) === 0);
    // a leaf with a term: Cloud Formation lives two layers down
    p = await pos(page, 'Condensation');
    await tap(page, p.x, p.y);
    await page.waitForSelector('.vi-fact--sheet .vi-fact__step');
    await layerChange(page);
    await page.tap('.vi-fact--sheet .vi-fact__step');
    await awaitLayer(page);
    p = await pos(page, 'Cloud Formation');
    await tap(page, p.x, p.y);
    await page.waitForSelector('.vi-fact--sheet', { timeout: 3000 });
    await page.waitForTimeout(2500);
    check('phone: tapping a leaf idea keeps its sheet open', /Cloud Formation/.test(await page.textContent('.vi-fact--sheet .vi-fact__title') ?? ''));
    check('phone: leaf sheet has no Step inside', (await page.locator('.vi-fact--sheet .vi-fact__step').count()) === 0);
    check('phone: the tapped idea stays visible above the sheet', await page.evaluate(() => { const n = window.__bench.nodeScreen('Cloud Formation'), s = document.querySelector('.vi-fact--sheet').getBoundingClientRect(); return n.y < s.top; }));
    // term inside the sheet
    await page.tap('.vi-fact--sheet .vi-term');
    await page.waitForSelector('.vi-anchor-card.is-in-sheet', { timeout: 2000 });
    await page.waitForTimeout(1500);
    check('phone: term definition shows inside the sheet and stays', /Water Vapor/i.test(await page.textContent('.vi-anchor-card.is-in-sheet') ?? ''));
    await page.tap('.vi-fact--sheet .vi-fact__back');
    check('phone: Back returns to the idea', (await page.locator('.vi-fact--sheet .vi-anchor-card').count()) === 0 && (await page.locator('.vi-fact--sheet .vi-fact__title').count()) === 1);
    // expand / collapse via the grip
    const h0 = await page.evaluate(() => document.querySelector('.vi-fact--sheet').getBoundingClientRect().height);
    await page.tap('.vi-fact--sheet .vi-fact__handle');
    await page.waitForTimeout(500);
    check('phone: grip toggles expanded state', await page.evaluate(() => document.querySelector('.vi-fact--sheet').classList.contains('is-expanded')), `h0=${Math.round(h0)}`);
    await page.tap('.vi-fact--sheet .vi-fact__handle');
    // tap on empty canvas closes
    await tap(page, 20, 300);
    await page.waitForTimeout(500);
    check('phone: tapping empty canvas closes the sheet', (await page.locator('.vi-fact--sheet').count()) === 0);
    // close button
    p = await pos(page, 'Dew & Frost');
    await tap(page, p.x, p.y);
    await page.waitForSelector('.vi-fact--sheet');
    await page.tap('.vi-fact--sheet .vi-fact__close');
    await page.waitForTimeout(300);
    check('phone: close button closes the sheet', (await page.locator('.vi-fact--sheet').count()) === 0);
    check('phone: touch targets are at least 40px', await page.evaluate(() => [...document.querySelectorAll('.vi-ctrls button')].every(b => b.getBoundingClientRect().width >= 40)));
    check('phone: no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // ── tablet (touch, wide) ──
  {
    const { ctx, page } = await open({ width: 820, height: 1180 }, { touch: true });
    check('tablet: touch mode, not compact', await page.evaluate(() => { const c = document.querySelector('.vi-map').classList; return c.contains('is-touch') && !c.contains('is-compact'); }));
    const p = await pos(page, 'The Water Cycle');
    await tap(page, p.x, p.y);
    await page.waitForSelector('.vi-fact--sheet', { timeout: 3000 });
    await page.waitForTimeout(1500);
    check('tablet: sheet is centred and capped in width', await page.evaluate(() => { const r = document.querySelector('.vi-fact--sheet').getBoundingClientRect(); return r.width <= 561 && Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 2; }));
    await ctx.close();
  }
  // ── desktop (pointer) ──
  {
    const { ctx, page } = await open({ width: 1280, height: 800 }, { touch: false });
    check('desktop: pointer mode', await page.evaluate(() => { const c = document.querySelector('.vi-map').classList; return !c.contains('is-touch') && !c.contains('is-compact'); }));
    const p = await pos(page, 'The Water Cycle');
    await page.mouse.move(p.x - 20, p.y - 20); await page.waitForTimeout(80); await page.mouse.move(p.x, p.y);
    await page.waitForSelector('.vi-peek', { timeout: 3000 });
    check('desktop: hover shows the floating peek, not a sheet', (await page.locator('.vi-map__fact .vi-peek').count()) === 1 && (await page.locator('.vi-fact--sheet').count()) === 0);
    await ctx.close();
  }
  // ── controls position ──
  {
    const rect = async (q) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const page = await ctx.newPage(); await page.goto(`http://localhost:${port}/bench.html?doc=example${q}`); await page.waitForSelector('.vi-ctrls'); await page.waitForTimeout(500);
      const r = await page.evaluate(() => { const c = document.querySelector('.vi-ctrls').getBoundingClientRect(); return { top: c.top, bottom: c.bottom, right: c.right }; }); await ctx.close(); return r; };
    const def = await rect(''), top = await rect('&controls=top-right');
    check('controls: default is the design system placement (bottom-right)', def.bottom > 700 && def.right > 350, JSON.stringify(def));
    check('controls: controlsPosition="top-right" moves them to the top-right', top.top < 40 && top.right > 350, JSON.stringify(top));
  }
  // ── resize reacts ──
  {
    const { ctx, page } = await open({ width: 1280, height: 800 }, { touch: false });
    await page.setViewportSize({ width: 400, height: 800 });
    await page.waitForTimeout(800);
    check('resize: layout class follows the container width', await page.evaluate(() => document.querySelector('.vi-map').classList.contains('is-compact')));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(800);
    check('resize: and back', await page.evaluate(() => !document.querySelector('.vi-map').classList.contains('is-compact')));
    await ctx.close();
  }
} finally { await browser.close(); server.kill(); }
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
