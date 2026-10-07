// Screenshots of docs/assets/example.visualli in every theme (root layer + one
// child layer), for visual review and for diffing against the design system's
// reference renders.
//
//   node scripts/screenshots.mjs --label after [--themes light,dark,...] [--dpr 2]
//
// Output: bench/screenshots/<label>/<theme>-<root|layer>.png

import { startPreview } from './lib/preview.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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
const themes = String(args.themes ?? 'light,dark,focus-light,focus-dark,colorsafe-light,colorsafe-dark,contrast-light,contrast-dark').split(',');
const dpr = Number(args.dpr ?? 2);
const comfort = args.comfort ? `&comfort=${args.comfort}` : '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, a, o = {}) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit', ...o }).on('exit', c => (c ? rej(new Error(`${cmd} ${c}`)) : res())));

if (!args['no-build']) { await run('npm', ['run', 'build'], { cwd: root }); }
await run('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir });
// A free port and a check that the server serves this tree's build (scripts/lib/preview.mjs).
const server = await startPreview(appDir);
const { port } = server;

const out = resolve(root, 'bench/screenshots', label);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${port}/bench.html?doc=example&theme=${theme}${comfort}`);
    await page.evaluate(() => window.__bench.ready);
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(4, 4); // park the pointer on empty canvas so no idea is hovered
    await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 });
    await sleep(300);
    await page.screenshot({ path: resolve(out, `${theme}-root.png`) });
    const hub = await page.evaluate(() => window.__bench.hubScreen());
    await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
    await page.mouse.click(hub.x, hub.y);
    await page.evaluate(() => window.__bench.changed);
    await page.mouse.move(4, 4);
    await sleep(400);
    await page.waitForFunction(() => document.querySelector('.vi-map')?.dataset.viReveal === 'idle', null, { timeout: 15000 });
    await sleep(300);
    await page.screenshot({ path: resolve(out, `${theme}-layer.png`) });
    await ctx.close();
    console.error(`${theme} done`);
  }
} finally { await browser.close(); await server.stop(); }
