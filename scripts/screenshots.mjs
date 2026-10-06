// Screenshots of docs/assets/example.visualli in every theme (root layer + one
// child layer), for visual review and for diffing against the design system's
// reference renders.
//
//   node scripts/screenshots.mjs --label after [--themes light,dark,...] [--dpr 2]
//
// Output: bench/screenshots/<label>/<theme>-<root|layer>.png

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
const port = 4174;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const run = (cmd, a, o = {}) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit', ...o }).on('exit', c => (c ? rej(new Error(`${cmd} ${c}`)) : res())));

if (!args['no-build']) { await run('npm', ['run', 'build'], { cwd: root }); }
await run('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await sleep(2500);

const out = resolve(root, 'bench/screenshots', label);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of themes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}/bench.html?doc=example&theme=${theme}${comfort}`);
    await page.evaluate(() => window.__bench.ready);
    await page.evaluate(() => document.fonts.ready);
    await sleep(800);
    await page.screenshot({ path: resolve(out, `${theme}-root.png`) });
    const hub = await page.evaluate(() => window.__bench.hubScreen());
    await page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
    await page.mouse.click(hub.x, hub.y);
    await page.evaluate(() => window.__bench.changed);
    await sleep(2200);
    await page.screenshot({ path: resolve(out, `${theme}-layer.png`) });
    await ctx.close();
    console.error(`${theme} done`);
  }
} finally { await browser.close(); server.kill(); }
