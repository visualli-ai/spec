// Verifies the canvas runs the design system's choreography (design-system/geometry/motion.ts):
// layer arrival (bloom + connectors), step inside (zoom 3.2 + fade, swap, settle), back out,
// hover, and reduced motion / instant reveal.
//
//   node scripts/smoke-motion.mjs     (builds the playground first unless --no-build)

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = resolve(root, 'renderers/visualli-sdk/apps/react');
const run = (cmd, a, o = {}) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit', ...o }).on('exit', c => (c ? rej(new Error(`${cmd} ${c}`)) : res())));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 4179;

// The motion constants straight from the design system, parsed from its source.
const src = readFileSync(resolve(root, 'design-system/geometry/motion.ts'), 'utf8');
const num = (re) => Number(re.exec(src)[1]);
const M = {
  diveScale: num(/dive: \{[\s\S]*?scale: ([\d.]+)/), diveDur: num(/dive: \{[\s\S]*?duration: (\d+)/),
  surfaceScale: num(/surface: \{\s*scale: ([\d.]+)/), surfaceDur: num(/surface: \{\s*scale: [\d.]+, duration: (\d+)/),
  settleFrom: num(/settle: \{ fromScale: ([\d.]+)/), settleDur: num(/settle: \{ fromScale: [\d.]+, duration: (\d+)/),
  reducedFade: num(/reduced: \{ fade: (\d+)/), stagger: num(/stagger: (\d+)/), revealDur: num(/duration: (\d+),\s*\/\*\* stagger-reveal/),
};

if (!process.argv.includes('--no-build')) await run('npm', ['run', 'build'], { cwd: root });
await run('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir, stdio: 'ignore' });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await sleep(2500);

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

// Fraction of the canvas that differs from the canvas colour (how much of the map is drawn right now).
const ink = (page) => page.evaluate(() => {
  const cs = [...document.querySelectorAll('canvas')]; const { width: w, height: h } = cs[0];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = getComputedStyle(document.querySelector('.vi-map')).getPropertyValue('--canvas').trim() || '#fff'; x.fillRect(0, 0, w, h);
  for (const k of cs) x.drawImage(k, 0, 0);
  const d = x.getImageData(0, 0, w, h).data; const bg = [d[0], d[1], d[2]]; let n = 0;
  for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 24) n++;
  return n;
});
const anims = (page) => page.evaluate(() => document.querySelector('.vi-map > div[style*="z-index: 1"]').getAnimations().map(a => {
  const t = a.effect.getTiming(); const kf = a.effect.getKeyframes();
  return { dur: t.duration, delay: t.delay, easing: t.easing, from: kf[0].transform ?? kf[0].opacity, to: kf[kf.length - 1].transform ?? kf[kf.length - 1].opacity };
}));
const reveal = (page) => page.evaluate(() => document.querySelector('.vi-map').dataset.viReveal);
const open = async (page, q) => { await page.goto(`http://localhost:${port}/bench.html?doc=example&theme=light${q}`); await page.evaluate(() => window.__bench.ready); await page.waitForSelector('canvas'); };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));

  // ── arrival: ideas bloom in, connectors draw, then the map is idle ──
  await open(page, '');
  await page.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'running', null, { timeout: 4000 });
  check('a layer arrives with a running reveal', true);
  await page.evaluate(() => window.__bench.nextLayerChange && 0);
  await page.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'idle', null, { timeout: 5000 });
  check('the reveal ends (idle)', await reveal(page) === 'idle');
  const settled = await ink(page);
  check('the finished map is drawn', settled > 50, `${settled} samples`);

  // ── step inside: zoom + fade, swap, settle, bloom ──
  await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
  const hub = await page.evaluate(() => window.__bench.hubScreen());
  await page.mouse.click(hub.x, hub.y);
  await sleep(60);
  const dive = await anims(page);
  const zoom = dive.find(a => String(a.to).includes('scale'));
  check('step inside zooms the layer toward the idea', !!zoom && zoom.to === `scale(${M.diveScale})` && zoom.dur === M.diveDur, JSON.stringify(zoom));
  check('step inside uses ease-zoom', zoom?.easing === 'cubic-bezier(0.2, 0.8, 0.2, 1)', zoom?.easing);
  check('step inside fades the old layer', dive.some(a => Number(a.to) === 0 && Number(a.from) === 1));
  await page.evaluate(() => window.__bench.changed);
  await sleep(40);
  const settle = (await anims(page)).find(a => String(a.from).includes(`scale(${M.settleFrom})`));
  check('the new layer settles from a slightly small scale', !!settle && settle.dur === M.settleDur, JSON.stringify(settle));
  check('the new layer\'s reveal runs after the swap', await reveal(page) === 'running');
  await sleep(140);
  const early = await ink(page);
  await page.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'idle', null, { timeout: 6000 });
  await sleep(300);
  const late = await ink(page);
  check('ideas appear progressively (fewer drawn early than at the end)', early < late, `${early} < ${late}`);

  // ── back out: shrink toward the centre ──
  await page.keyboard.press('Escape');
  await sleep(60);
  const out = (await anims(page)).find(a => String(a.to).includes('scale'));
  check('back out shrinks the layer', !!out && out.to === `scale(${M.surfaceScale})` && out.dur === M.surfaceDur, JSON.stringify(out));
  await sleep(1800);

  // ── hover: lifts over time rather than snapping ──
  const pos = await page.evaluate(() => window.__bench.hubScreen());
  const shot = (p) => p.evaluate(() => { const cs = [...document.querySelectorAll('canvas')]; const c = document.createElement('canvas'); c.width = cs[0].width; c.height = cs[0].height; const x = c.getContext('2d'); cs.forEach(k => x.drawImage(k, 0, 0)); let h = 0; const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 37) h = (h * 31 + d[i]) | 0; return h; });
  await page.mouse.move(8, 8); await sleep(900);
  const rest = await shot(page);
  await page.mouse.move(pos.x - 40, pos.y - 40); await sleep(80); await page.mouse.move(pos.x, pos.y);
  const frames = [];
  for (let i = 0; i < 12; i++) { await sleep(30); frames.push(await shot(page)); }
  const distinct = new Set([rest, ...frames]).size;
  check('hover lifts over time (several distinct frames, not a snap)', distinct >= 3, `${distinct} distinct frames`);
  check('hover then rests', frames[frames.length - 1] === frames[frames.length - 2] && frames[frames.length - 1] !== rest);

  // ── reduced motion: no zoom, everything fades in together ──
  const rp = await ctx.newPage(); rp.on('pageerror', e => errors.push(String(e)));
  await open(rp, '&comfort=reduced');
  await rp.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'idle', null, { timeout: 4000 });
  await rp.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
  const h2 = await rp.evaluate(() => window.__bench.hubScreen());
  await rp.mouse.click(h2.x, h2.y);
  await sleep(40);
  check('reduced motion: no zoom animation', !(await anims(rp)).some(a => String(a.to).includes('scale')));
  await Promise.race([rp.evaluate(() => window.__bench.changed), sleep(4000)]);
  await sleep(50);
  const t0 = Date.now();
  await rp.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'idle', null, { timeout: 3000 });
  check('reduced motion: the layer is in within the short fade', Date.now() - t0 < M.reducedFade + 400, `${Date.now() - t0} ms`);

  // ── instant reveal: same, without reduced motion ──
  const ip = await ctx.newPage(); ip.on('pageerror', e => errors.push(String(e)));
  await open(ip, '&reveal=instant');
  const t1 = Date.now();
  await ip.waitForFunction(() => document.querySelector('.vi-map').dataset.viReveal === 'idle', null, { timeout: 4000 });
  check('reveal="instant": ideas arrive together', Date.now() - t1 < 1500 && (await ip.getAttribute('.vi-map', 'data-reveal')) === 'instant');

  check('no page errors', errors.length === 0, errors.join(' | '));
} finally { await browser.close(); server.kill(); }
process.exit(failures ? 1 : 0);
