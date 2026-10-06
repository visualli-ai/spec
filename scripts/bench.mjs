// Benchmark driver for the Visualli SDK.
//
//   node scripts/bench.mjs --label baseline [--sizes 500,2000,10000] [--dpr 1] [--runs 1] [--no-build]
//
// For each node count it opens /bench.html in headless Chromium and records
// requestAnimationFrame frame times during:
//   pan        real mouse drag on the canvas
//   zoom       real wheel events (in / out)
//   transition clicking the root node (layer zoom-in) -- also reports the
//              click -> layer-ready latency
// Results are written to bench/results/<label>.json and printed as a table.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = resolve(root, 'renderers/visualli-sdk/apps/react');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => {
  if (x.startsWith('--')) a.push([x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return a;
}, []));
const label = args.label ?? 'run';
const sizes = String(args.sizes ?? '500,2000,10000').split(',').map(Number);
const dpr = Number(args.dpr ?? 1);
const theme = args.theme ?? 'light';
const port = 4173;

const sh = (cmd, a, opts = {}) => new Promise((res, rej) => {
  const p = spawn(cmd, a, { stdio: 'inherit', ...opts });
  p.on('exit', c => (c === 0 ? res() : rej(new Error(`${cmd} ${a.join(' ')} exited ${c}`))));
});

if (!args['no-build']) await sh('npm', ['run', 'build'], { cwd: root });
await sh('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir });

const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });

try {
  for (const n of sizes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/bench.html?n=${n}&theme=${theme}`);
    await page.evaluate(() => window.__bench.ready);
    await page.waitForSelector('canvas');
    await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 }); // the arrival animation is not part of the pan/zoom numbers
    const row = { n, dpr, buildMs: await page.evaluate(() => window.__bench.buildMs) };

    // ── layer transition (root -> N-node layer) ──
    const hub = await page.evaluate(() => window.__bench.hubScreen());
    await page.evaluate(() => window.__bench.start());
    const t0 = await page.evaluate(() => window.__bench.now());
    await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
    await page.mouse.move(hub.x, hub.y);
    await page.mouse.down(); await page.mouse.up();
    const tChange = await page.evaluate(() => window.__bench.changed);
    row.layerReadyMs = Math.round(tChange - t0);
    await sleep(1800);
    row.transition = await page.evaluate(() => window.__bench.stop());
    await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 });
    await sleep(500);

    // ── pan: drag in a sinusoid for 3 s ──
    const r = await page.evaluate(() => window.__bench.canvasRect());
    const cx = r.x + 40, cy = r.y + 40;
    await page.evaluate(() => window.__bench.start());
    await page.mouse.move(cx, cy); await page.mouse.down();
    const tp = Date.now();
    while (Date.now() - tp < 3000) {
      const k = (Date.now() - tp) / 3000;
      await page.mouse.move(cx + Math.sin(k * Math.PI * 6) * 400 + 400, cy + Math.cos(k * Math.PI * 4) * 150 + 150);
    }
    await page.mouse.up();
    row.pan = await page.evaluate(() => window.__bench.stop());
    await sleep(300);

    // ── zoom: alternate wheel in / out for 3 s around the canvas centre ──
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.evaluate(() => window.__bench.start());
    const tz = Date.now(); let dir = -1, i = 0;
    while (Date.now() - tz < 3000) {
      await page.mouse.wheel(0, dir * 120);
      if (++i % 12 === 0) dir = -dir;
      await sleep(8);
    }
    row.zoom = await page.evaluate(() => window.__bench.stop());

    row.errors = errors;
    results.push(row);
    await ctx.close();
    console.error(`n=${n} done`);
  }
} finally {
  await browser.close();
  server.kill();
}

const out = resolve(root, 'bench/results');
mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, `${label}.json`), JSON.stringify({ label, dpr, theme, date: new Date().toISOString(), chromium: browser.version?.() ?? '', results }, null, 2));

const f = x => (x ? `${x.fps.toFixed(1)} fps / p95 ${x.p95.toFixed(1)}ms` : 'n/a');
console.log(`\n${label} (dpr ${dpr}, ${theme})\n| nodes | layer ready | transition | pan | zoom |\n|---|---|---|---|---|`);
for (const r of results) console.log(`| ${r.n} | ${r.layerReadyMs} ms | ${f(r.transition)} | ${f(r.pan)} | ${f(r.zoom)} |`);
