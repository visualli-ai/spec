// End-to-end smoke test of the read-only viewer behaviours, in a real browser:
// peek, term definitions, step inside, depth trail, zoom/fit, keyboard + the
// accessible DOM mirror, theme attributes. Uses docs/assets/example.visualli.
//
//   node scripts/smoke.mjs            (builds the playground first unless --no-build)

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The design system's interaction rules (term hover delays), read from the vendored module.
const { TERM } = await import(pathToFileURL(resolve(root, 'design-system/geometry/interaction.ts')).href);
const appDir = resolve(root, 'renderers/visualli-sdk/apps/react');
const run = (cmd, a, o = {}) => new Promise((res, rej) => spawn(cmd, a, { stdio: 'inherit', ...o }).on('exit', c => (c ? rej(new Error(`${cmd} ${c}`)) : res())));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 4178;

if (!process.argv.includes('--no-build')) { await run('npm', ['run', 'build'], { cwd: root }); }
await run('npx', ['vite', 'build', '--outDir', 'dist-bench'], { cwd: appDir, stdio: 'ignore' });
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-bench', '--port', String(port), '--strictPort'], { cwd: appDir, stdio: 'ignore' });
await sleep(2500);

let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); if (!ok) failures++; };

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/bench.html?doc=example&theme=light`);
  await page.evaluate(() => window.__bench.ready);
  await page.waitForSelector('canvas', { timeout: 8000 }); // the first draw waits for the fonts
  await page.waitForTimeout(800);
  // Hover an idea by title: two moves (the canvas throttles hover checks to one per 50 ms) and wait for its peek.
  const hover = async (title) => {
    const pos = await page.evaluate((t) => window.__bench.nodeScreen(t), title);
    await page.mouse.move(pos.x - 25, pos.y - 25);
    await page.waitForTimeout(80);
    await page.mouse.move(pos.x, pos.y);
    await page.waitForFunction((t) => document.querySelector('.vi-peek .vi-fact__title')?.textContent === t, title, { timeout: 4000 });
  };
  const layerChange = () => page.evaluate(() => { window.__bench.changed = window.__bench.nextLayerChange(); });
  const awaitLayer = async () => {
    await Promise.race([page.evaluate(() => window.__bench.changed), new Promise((_, rej) => setTimeout(() => rej(new Error('layer did not change')), 8000))]);
    await page.waitForTimeout(1800);
  };

  // ── theme attributes + design-system CSS ──
  check('map carries data-theme', await page.getAttribute('.vi-map', 'data-theme') === 'light');
  check('tokens reach the DOM', (await page.evaluate(() => getComputedStyle(document.querySelector('.vi-map')).getPropertyValue('--topic-teal').trim())) === '#87f2f8');
  check('canvas follows devicePixelRatio', await page.evaluate(() => { const c = document.querySelector('canvas'); return c.width === Math.round(c.getBoundingClientRect().width * devicePixelRatio); }));

  // ── accessible mirror ──
  const rootBtn = page.locator('.vi-sr button[data-node-id]').first();
  check('root idea is mirrored for screen readers', (await page.locator('.vi-sr button[data-node-id]').count()) === 1);
  const label = await rootBtn.getAttribute('aria-label');
  check('mirror exposes label, depth and "has more inside"', /The Water Cycle\. Depth 1\. Has more inside/.test(label ?? ''), label ?? '');
  await page.keyboard.press('Tab'); // first focusable: the mirrored idea
  check('Tab reaches the idea', await page.evaluate(() => document.activeElement?.getAttribute('data-node-id') !== null));

  // ── step inside with the keyboard ──
  await layerChange();
  await page.keyboard.press('Enter');
  await awaitLayer();
  check('Enter steps inside', (await page.locator('.vi-trail li').count()) === 2);
  // The trail starts with the map (TRAIL.rootLabel 'icon': the home glyph only, the map's title as its accessible name
  // and tooltip); each next entry is the idea stepped into — its title, its dot in that idea's own colour.
  const trail = await page.locator('.vi-trail li').allTextContents();
  const home = page.locator('.vi-trail li:first-child button');
  check('depth trail shows the path', trail.length === 2 && trail[0].trim() === '' && /The Water Cycle/.test(trail[1]), trail.join(' › '));
  check('the map entry is the home glyph, named by the map title', await home.getAttribute('aria-label') === 'The Water Cycle' && await home.getAttribute('title') === 'The Water Cycle' && (await home.locator('svg').count()) === 2);
  const dots = await page.$$eval('.vi-trail li > button > svg > path', (ps) => ps.map((p) => p.getAttribute('fill')));
  // The example has no colours: each idea takes the topics in sibling order (the design system's topicFor); the
  // root is the first idea of its layer, so teal.
  check('trail dots: the map in stone, then the clicked idea in its own colour', dots[0] === 'var(--topic-stone)' && dots[1] === 'var(--topic-teal)', dots.join(', '));
  check('mirror lists the new layer', (await page.locator('.vi-sr button[data-node-id]').count()) >= 5);

  // ── peek on hover, with Step inside ──
  await hover('Evaporation');
  check('hover opens the peek card', /Evaporation/.test(await page.textContent('.vi-peek .vi-fact__title') ?? ''));
  check('peek has Step inside for ideas with a layer', (await page.locator('.vi-peek .vi-fact__step').count()) === 1);
  // Evaporation has no colour in the file and is the first idea of its layer: the first topic in sibling order, teal.
  check('peek takes the idea\'s own colour', /--vi-fact-fill:\s*var\(--topic-teal\)/.test(await page.getAttribute('.vi-peek', 'style') ?? ''), await page.getAttribute('.vi-peek', 'style') ?? '');

  // ── step inside via the peek button, find a term ──
  await hover('Condensation');
  await layerChange();
  await page.click('.vi-peek .vi-fact__step');
  await awaitLayer();
  check('Step inside navigates', (await page.locator('.vi-trail li').count()) === 3);
  await hover('Cloud Formation');
  await page.waitForSelector('.vi-peek .vi-term', { timeout: 3000 });
  // Terms follow the design system's TERM rules (geometry/interaction.ts).
  const cards = () => page.locator('.vi-anchor-card').count();
  await page.hover('.vi-peek .vi-term');
  await sleep(TERM.hoverOpen / 2);
  check('a hovered term waits before opening', (await cards()) === 0);
  await sleep(TERM.hoverOpen + 150);
  check('hovering a term opens its definition card', (await cards()) === 1, `after ${TERM.hoverOpen}ms`);
  const link = page.locator('.vi-anchor-card .vi-fact__link');
  check('the term card says "Learn more", never "Know more"', !/Know more/.test(await page.textContent('.vi-anchor-card') ?? '') && ((await link.count()) === 0 || ((await link.textContent()) ?? '').includes(TERM.learnMoreLabel)));
  await page.hover('.vi-peek .vi-fact__title');
  await sleep(TERM.hoverClose + 150);
  check('leaving the term closes its card', (await cards()) === 0, `after ${TERM.hoverClose}ms`);
  await page.click('.vi-peek .vi-term');
  await page.hover('.vi-peek .vi-fact__title');
  await sleep(TERM.hoverClose + 150);
  check('a clicked term stays open when the pointer leaves (pinned)', (await cards()) === 1);
  await page.keyboard.press('Escape');
  await sleep(100);
  check('Escape closes the term card', (await cards()) === 0);
  check('…without stepping out of the layer', (await page.locator('.vi-trail li').count()) === 3);
  await page.hover('.vi-peek .vi-term');
  await page.click('.vi-peek .vi-term');
  check('clicking a term opens its definition card', /Water Vapor/i.test(await page.textContent('.vi-anchor-card') ?? ''));
  check('term card shows the definition', (await page.textContent('.vi-anchor-card__desc'))?.length > 20);

  // ── controls ──
  await page.mouse.move(5, 5);
  const pct0 = parseInt(await page.textContent('.vi-ctrls__pct'));
  // As the design system's controls: zoom is shown relative to the layer's fit, and Fit is disabled while fitted.
  check('a fitted layer reads 100%, with Fit disabled', pct0 === 100 && await page.isDisabled('button[aria-label="Fit map to view"]'), `${pct0}%`);
  await page.click('button[aria-label="Zoom in"]');
  await page.waitForTimeout(200);
  const pct1 = parseInt(await page.textContent('.vi-ctrls__pct'));
  check('zoom in raises the percentage', pct1 > pct0, `${pct0}% -> ${pct1}%`);
  await page.click('button[aria-label="Zoom out"]'); await page.click('button[aria-label="Zoom out"]');
  await page.waitForTimeout(200);
  const pct2 = parseInt(await page.textContent('.vi-ctrls__pct'));
  check('zoom out lowers it', pct2 < pct1, `${pct1}% -> ${pct2}%`);
  await page.click('button[aria-label="Fit map to view"]');
  await page.waitForTimeout(300);
  const pctFit = parseInt(await page.textContent('.vi-ctrls__pct'));
  check('fit returns to 100%', pctFit === 100, `${pct2}% -> ${pctFit}%`);

  // ── zooming never navigates (the design system has no zoom-to-step rule) ──
  const depth = () => page.locator('.vi-trail li').count();
  const before = await depth();
  await page.mouse.move(640, 420);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 600); await sleep(40); }
  await sleep(1200);
  check('zooming far out stays on the layer', (await depth()) === before, `${parseInt(await page.textContent('.vi-ctrls__pct'))}%`);
  check('…and stops at the design system\'s zoom floor (VIEW.zoomMin of the fit)', parseInt(await page.textContent('.vi-ctrls__pct')) === 30);
  for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, -600); await sleep(40); }
  await sleep(1200);
  check('zooming far in stays on the layer', (await depth()) === before, `${parseInt(await page.textContent('.vi-ctrls__pct'))}%`);
  check('…and stops at the design system\'s zoom ceiling (VIEW.zoomMax of the fit)', parseInt(await page.textContent('.vi-ctrls__pct')) === 500);
  await page.click('button[aria-label="Fit map to view"]');
  await sleep(300);

  // ⌘ / Ctrl + = zooms in, ⌘ / Ctrl + 0 fits (the design system's keyboard zoom)
  await page.mouse.click(30, 400);
  const pk0 = parseInt(await page.textContent('.vi-ctrls__pct'));
  await page.keyboard.press('ControlOrMeta+=');
  await sleep(250);
  const pk1 = parseInt(await page.textContent('.vi-ctrls__pct'));
  check('⌘/Ctrl + = zooms in', pk1 > pk0, `${pk0}% -> ${pk1}%`);
  await page.keyboard.press('ControlOrMeta+0');
  await sleep(300);
  check('⌘/Ctrl + 0 fits', parseInt(await page.textContent('.vi-ctrls__pct')) === pk0, `${parseInt(await page.textContent('.vi-ctrls__pct'))}%`);

  // ── go back up: trail click and Escape ──
  await layerChange();
  await page.click('.vi-trail li:nth-child(2) button');
  await awaitLayer();
  check('trail click steps back out', (await page.locator('.vi-trail li').count()) === 2);
  await layerChange();
  await page.mouse.click(30, 400); // focus the map by clicking empty canvas
  await page.keyboard.press('Escape');
  await awaitLayer();
  check('Escape steps back out', (await page.locator('.vi-trail li').count()) === 1);
  await layerChange();
  await page.locator('.vi-sr button[data-node-id]').first().focus();
  await page.keyboard.press('Enter'); // back into The Water Cycle
  await awaitLayer();
  await layerChange();
  await page.mouse.click(30, 400);
  await page.keyboard.press('Backspace');
  await awaitLayer();
  check('Backspace steps back out', (await page.locator('.vi-trail li').count()) === 1);

  // ── read-only: none of the product features exist ──
  const text = (await page.textContent('body')) ?? '';
  check('no product features in the UI', !/Go deeper|Map it|Export|Sources|Chat/i.test(text));
  check('no console / page errors', errors.length === 0, errors.join(' | ').slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
