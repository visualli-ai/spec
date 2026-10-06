// Screenshots of the responsive variants (phone, tablet, desktop) with the peek open on a leaf idea.
//   node scripts/screenshots-responsive.mjs [--theme dark] [--no-build]
// Output: bench/screenshots/responsive/<theme>-<phone|tablet|desktop>.png

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = resolve(root, 'renderers/visualli-sdk/apps/react');
const theme = process.argv.includes('--theme') ? process.argv[process.argv.indexOf('--theme') + 1] : 'light';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 4184;
await new Promise((res, rej) => spawn('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir, stdio: 'ignore' }).on('exit', c => (c ? rej() : res())));
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await sleep(2500);
const out = resolve(root, 'bench/screenshots/responsive');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, vp, touch] of [['phone', { width: 390, height: 844 }, true], ['tablet', { width: 820, height: 1180 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/bench.html?doc=example&theme=${theme}`);
    await page.evaluate(() => window.__bench.ready); await page.waitForSelector('canvas'); await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 }); await page.waitForTimeout(300);
    const pos = t => page.evaluate(x => window.__bench.nodeScreen(x), t);
    const go = async (t) => {
      const p = await pos(t);
      await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
      if (touch) { await page.touchscreen.tap(p.x, p.y); await page.waitForSelector('.vi-fact--sheet .vi-fact__step'); await page.tap('.vi-fact--sheet .vi-fact__step'); }
      else { await page.mouse.click(p.x, p.y); }
      await page.evaluate(() => window.__bench.changed); await page.waitForTimeout(400); await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 }); await page.waitForTimeout(300);
    };
    await go('The Water Cycle'); await go('Condensation');
    const leaf = await pos('Cloud Formation');
    if (touch) { await page.touchscreen.tap(leaf.x, leaf.y); await page.waitForSelector('.vi-fact--sheet'); }
    else { await page.mouse.move(leaf.x - 25, leaf.y - 25); await page.waitForTimeout(80); await page.mouse.move(leaf.x, leaf.y); await page.waitForSelector('.vi-peek'); }
    await page.waitForTimeout(800);
    await page.screenshot({ path: resolve(out, `${theme}-${name}.png`) });
    await ctx.close();
    console.error(name, 'done');
  }
} finally { await browser.close(); server.kill(); }
