// The browsers the SDK supports with its full experience are listed once, in package.json → "browserslist", and in the
// docs' Browser support table (docs/visualli-sdk/react/getting-started.md, renderers/visualli-sdk/README.md) — this
// check fails if they disagree, if the CSS the SDK injects (the design system's tokens.embed.css + css/spec.css, and
// the SDK's own layout rules) uses a feature those browsers lack, or if the built JavaScript (the SDK and the
// libraries it runs with) needs more than ES2020. Run after `npm run build`.
//
//   npm run check:browsers
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
import doiuse from 'doiuse';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const browsers = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).browserslist;
const problems = [];

// Reported by caniuse but not a difference a reader sees, with the reason.
const IGNORE = {
  'css-touch-action': 'desktop Safari has no touch input; iOS Safari supports touch-action',
  'css3-cursors-grab': 'iOS has no mouse cursor',
  'text-decoration': '"partial" in every browser (shorthand styling the SDK does not use)',
  'css-overflow': '"partial" only for overflow: clip and two-value overflow, which the SDK does not use',
  'intrinsic-width': '"partial" only for prefixed or stretch keywords; max-content is supported',
  'css-sticky': '"partial" only for sticky table headers and rows; the SDK makes a div sticky (the sheet grip)',
};

// 1. The documented table agrees with browserslist.
const WANT = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox', safari: 'Safari', ios_saf: 'Safari on iOS', opera: 'Opera', samsung: 'Samsung Internet' };
const floors = Object.fromEntries(browsers.map((q) => q.match(/^(\w+) >= ([\d.]+)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
for (const id of Object.keys(WANT)) if (!floors[id]) problems.push(`package.json browserslist has no "${id} >= …" line`);
for (const doc of ['docs/visualli-sdk/react/getting-started.md', 'renderers/visualli-sdk/README.md']) {
  const text = readFileSync(resolve(root, doc), 'utf8');
  for (const [id, name] of Object.entries(WANT)) {
    const row = text.match(new RegExp(`^\\| ${name.replace(/ /g, '\\s')} \\| ([^|]+)\\|`, 'm'));
    const v = row && row[1].match(/[\d.]+/)?.[0];
    if (v !== floors[id]) problems.push(`${doc}: ${name} is ${v ?? 'missing'}, package.json browserslist says ${floors[id]}`);
  }
}

// 2. The CSS the SDK injects.
const gen = readFileSync(resolve(root, 'renderers/visualli-sdk/sdk/react/src/generated/specCss.ts'), 'utf8');
const str = (name) => JSON.parse(gen.match(new RegExp(`export const ${name} = ("(?:[^"\\\\]|\\\\.)*");`))[1]);
const layout = readFileSync(resolve(root, 'renderers/visualli-sdk/sdk/react/src/design/runtime.ts'), 'utf8').match(/const LAYOUT_CSS = `([\s\S]*?)`;/)[1];
const css = [['tokens.embed.css', str('SPEC_TOKENS_CSS')], ['css/spec.css', str('SPEC_COMPONENT_CSS')], ['LAYOUT_CSS (runtime.ts)', layout]];
for (const [name, text] of css) {
  const found = [];
  await postcss([doiuse({ browsers, onFeatureUsage: (u) => { if (!IGNORE[u.feature]) found.push(u); } })]).process(text, { from: undefined });
  for (const u of found) problems.push(`${name}:${u.usage.source.start.line} ${u.message}`);
}

// 3. The JavaScript: ES2020 syntax in the SDK and the libraries it runs with.
const esCheck = require.resolve('es-check/index.js');
const js = ['renderers/visualli-sdk/sdk/core/dist/*.js', 'renderers/visualli-sdk/sdk/react/dist/index.js', 'node_modules/konva/lib/**/*.js', 'node_modules/react-konva/es/*.js', 'node_modules/zustand/esm/*.mjs'];
for (const g of js) {
  try { execFileSync(process.execPath, [esCheck, 'es2020', g, '--module'], { cwd: root, stdio: 'pipe' }); }
  catch (e) { problems.push(`${g}: newer than ES2020\n${String(e.stdout || e.message).trim().split('\n').slice(0, 6).join('\n')}`); }
}

if (problems.length) {
  console.error(`Browser support (${browsers.join(', ')}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`browser support: CSS and JavaScript fit ${browsers.join(', ')}; docs agree`);
