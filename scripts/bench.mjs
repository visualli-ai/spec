// Benchmark driver for the Visualli SDK.
//
//   node scripts/bench.mjs --label baseline [--sizes 500,2000,10000] [--layers 1000,10000] [--dpr 1] [--no-build] [--channel chrome] [--out file.json]
//
// To compare a change with main, use scripts/bench-compare.mjs (npm run bench:compare): numbers are only meaningful as
// a before/after pair measured in the same session on the same machine (see bench/results/README.md).
//
// For each node count it opens /bench.html in headless Chromium (or the installed Chrome with --channel chrome) and records
// requestAnimationFrame frame times during:
//   pan        real mouse drag on the canvas
//   zoom       real wheel events (in / out)
//   transition clicking the root node (layer zoom-in) -- also reports the
//              click -> layer-ready latency
// And for each layer count (--layers; 'none' skips them) it opens a map of that many small layers (8 ideas each, every
// idea opening the next layer) and records: parsing the file, stepping inside from the root, stepping deeper three
// times (median), and backing out with Escape - the click / key -> layer-ready latency each time.
// Results are written to bench/results/<label>.json (or --out) and printed as a table.

import { startPreview } from './lib/preview.mjs';
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
const layerCounts = args.layers === 'none' ? [] : String(args.layers ?? '1000,10000').split(',').map(Number).filter((x) => x > 0);
const dpr = Number(args.dpr ?? 1);
const theme = args.theme ?? 'light';

const sh = (cmd, a, opts = {}) => new Promise((res, rej) => {
  const p = spawn(cmd, a, { stdio: 'inherit', ...opts });
  p.on('exit', c => (c === 0 ? res() : rej(new Error(`${cmd} ${a.join(' ')} exited ${c}`))));
});

if (!args['no-build']) await sh('npm', ['run', 'build'], { cwd: root });
await sh('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir });

// A free port and a check that the server serves this tree's build (scripts/lib/preview.mjs).
const server = await startPreview(appDir);
const { port } = server;

const sleep = ms => new Promise(r => setTimeout(r, ms));
// The arrival animation is not part of the pan / zoom numbers: wait until it's over (data-vi-reveal="idle"). Renderers
// without that attribute (the 0.1.x SDK, when bench:compare measures an older base) get a fixed settle time instead.
const settled = async (page) => {
  const hasReveal = await page.evaluate(() => document.querySelector('.vi-map')?.dataset.viReveal !== undefined);
  if (hasReveal) await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 });
  else await sleep(1500);
};
const results = [];
const layerResults = [];
const browser = await chromium.launch({ ...(args.channel ? { channel: String(args.channel) } : {}), args: ['--enable-precise-memory-info'] });

try {
  for (const n of sizes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/bench.html?n=${n}&theme=${theme}`);
    await page.evaluate(() => window.__bench.ready);
    await page.waitForSelector('canvas');
    await settled(page);
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
    await settled(page);
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

  // ── many layers, few ideas each ──
  for (const layers of layerCounts) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/bench.html?layers=${layers}&theme=${theme}`);
    await page.evaluate(() => window.__bench.ready);
    await page.waitForSelector('canvas');
    // A bench page without the many-layers map (an older base) renders its default map instead: nothing to measure.
    if (await page.evaluate(() => window.__bench.layers) !== layers) { await ctx.close(); console.error(`layers=${layers}: not supported by this bench page, skipped`); continue; }
    await settled(page);
    const row = { layers, dpr, parseMs: await page.evaluate(() => window.__bench.parseMs) };
    /** Click (or press) and time it until the next layer is on screen, then let it settle. */
    const timed = async (act) => {
      const t0 = await page.evaluate(() => window.__bench.now());
      await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
      await act();
      const t = await page.evaluate(() => window.__bench.changed);
      await settled(page);
      await sleep(300);
      return Math.round(t - t0);
    };
    const click = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up(); };
    row.stepInMs = await timed(async () => click(await page.evaluate(() => window.__bench.hubScreen())));
    const deeper = [];
    for (let i = 0; i < 3; i++) {
      const p = await page.evaluate(() => window.__bench.childScreen());
      if (!p) break;
      deeper.push(await timed(() => click(p)));
    }
    deeper.sort((a, b) => a - b);
    row.deeperMs = deeper.length ? deeper[Math.floor((deeper.length - 1) / 2)] : NaN;
    await page.focus('.vi-map');
    row.backMs = await timed(() => page.keyboard.press('Escape'));
    row.errors = errors;
    layerResults.push(row);
    await ctx.close();
    console.error(`layers=${layers} done`);
  }
} finally {
  await browser.close();
  await server.stop();
}

const outFile = args.out ? resolve(String(args.out)) : resolve(root, 'bench/results', `${label}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ label, dpr, theme, date: new Date().toISOString(), chromium: browser.version?.() ?? '', results, layerResults }, null, 2));

const f = x => (x ? `${x.fps.toFixed(1)} fps / p95 ${x.p95.toFixed(1)}ms` : 'n/a');
console.log(`\n${label} (dpr ${dpr}, ${theme})\n| nodes | layer ready | transition | pan | zoom |\n|---|---|---|---|---|`);
for (const r of results) console.log(`| ${r.n} | ${r.layerReadyMs} ms | ${f(r.transition)} | ${f(r.pan)} | ${f(r.zoom)} |`);
if (layerResults.length) {
  console.log(`\n| layers | parse | step inside | step deeper | back out |\n|---|---|---|---|---|`);
  for (const r of layerResults) console.log(`| ${r.layers} | ${r.parseMs.toFixed(0)} ms | ${r.stepInMs} ms | ${r.deeperMs} ms | ${r.backMs} ms |`);
}
