// Before / after performance comparison for the Visualli SDK.
//
//   npm run bench:compare                                  # main vs this checkout
//   npm run bench:compare -- --base <git ref> [--runs 3] [--sizes 500,2000,10000] [--dpr 1] [--channel chrome]
//
// Benchmark numbers only mean something as a pair measured in the same session on the same machine, so this script
// measures both sides back to back: it checks the base ref out into a temporary git worktree, builds both, and runs
// scripts/bench.mjs on them alternately (base, this checkout, base, this checkout, …) so that machine drift affects both
// sides alike. It prints one before / after table (medians) to paste into the PR, and writes nothing into the repo.
//
// --channel chrome uses the installed Google Chrome instead of Playwright's Chromium (needed when Playwright's browser
// isn't installed; `npx playwright install chromium` installs it).

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => {
  if (x.startsWith('--')) a.push([x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return a;
}, []));
const base = String(args.base ?? 'origin/main');
const runs = Math.max(1, Number(args.runs ?? 3));
const sizes = String(args.sizes ?? '500,2000,10000');
const dpr = String(args.dpr ?? 1);
const channel = args.channel ? ['--channel', String(args.channel)] : [];

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const run = (cmd, a, cwd) => {
  const r = spawnSync(cmd, a, { cwd, stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) throw new Error(`${cmd} ${a.join(' ')} failed in ${cwd}`);
};

const baseSha = git('rev-parse', '--short', base);
const headSha = git('rev-parse', '--short', 'HEAD');
const dirty = git('status', '--porcelain', '--untracked-files=no') !== '';
const work = mkdtempSync(join(tmpdir(), 'visualli-bench-'));
const baseDir = join(work, 'base');
const results = join(work, 'results');
mkdirSync(results);

// The worktree shares the checkout's node_modules, except the workspace packages (@visualli/*), which must point at
// the worktree's own sources.
function linkNodeModules(dir) {
  const src = join(root, 'node_modules');
  mkdirSync(join(dir, 'node_modules'));
  for (const e of readdirSync(src)) {
    if (e === '@visualli') continue;
    symlinkSync(join(src, e), join(dir, 'node_modules', e));
  }
  mkdirSync(join(dir, 'node_modules/@visualli'));
  for (const e of readdirSync(join(src, '@visualli'))) symlinkSync(readlinkSync(join(src, '@visualli', e)), join(dir, 'node_modules/@visualli', e));
}

// Older refs may predate the benchmark page: give them this checkout's (it only uses VisualliCanvas's public props).
function ensureBenchPage(dir) {
  const app = 'renderers/visualli-sdk/apps/react';
  if (existsSync(join(dir, app, 'src/bench.tsx'))) return false;
  for (const f of ['bench.html', 'src/bench.tsx', 'vite.config.ts']) copyFileSync(join(root, app, f), join(dir, app, f));
  return true;
}

// The SDK packages only: bench.mjs bundles the benchmark page itself (vite build, no type check), so a borrowed page
// works against an older SDK.
const build = (dir) => run('npx', ['turbo', 'run', 'build', '--filter=@visualli/react...'], dir);
const bench = (dir, file) => {
  // This checkout's bench driver, run inside each tree (it resolves the app relative to its own location).
  const driver = join(dir, 'scripts/.bench-driver.mjs');
  copyFileSync(join(root, 'scripts/bench.mjs'), driver);
  try { run('node', [driver, '--no-build', '--sizes', sizes, '--dpr', dpr, '--out', file, ...channel], dir); }
  finally { rmSync(driver, { force: true }); }
  return JSON.parse(readFileSync(file, 'utf8'));
};

let borrowedPage = false;
try {
  console.error(`bench:compare — base ${base} (${baseSha}) vs this checkout (${headSha}${dirty ? ', with uncommitted changes' : ''}), ${runs} run(s) each`);
  run('git', ['worktree', 'add', '--detach', '--quiet', baseDir, base], root);
  linkNodeModules(baseDir);
  borrowedPage = ensureBenchPage(baseDir);
  // This checkout's driver runs in the base tree too, with its server helper (older refs may not have it).
  mkdirSync(join(baseDir, 'scripts/lib'), { recursive: true });
  copyFileSync(join(root, 'scripts/lib/preview.mjs'), join(baseDir, 'scripts/lib/preview.mjs'));
  console.error('building base…'); build(baseDir);
  console.error('building this checkout…'); build(root);

  const sides = { base: [], head: [] };
  for (let i = 1; i <= runs; i++) {
    console.error(`run ${i}/${runs}: base`); sides.base.push(bench(baseDir, join(results, `base-${i}.json`)));
    console.error(`run ${i}/${runs}: this checkout`); sides.head.push(bench(root, join(results, `head-${i}.json`)));
  }

  const median = (xs) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
  const pick = (side, n, get) => median(sides[side].map((r) => get(r.results.find((x) => x.n === n))));
  const metrics = [
    ['layer ready', 'ms', (r) => r?.layerReadyMs, false],
    ['arrival (transition)', 'fps', (r) => r?.transition?.fps, true],
    ['pan', 'fps', (r) => r?.pan?.fps, true],
    ['zoom', 'fps', (r) => r?.zoom?.fps, true],
  ];
  const first = sides.head[0];
  const lines = [
    `### Performance: ${base} (${baseSha}) → this branch (${headSha}${dirty ? ' + uncommitted' : ''})`,
    '',
    `${first.chromium ? `Chrome ${first.chromium}, ` : ''}headless, 1280×800, devicePixelRatio ${dpr}, ${runs} alternating run(s) per side, medians. Only this pair is comparable; absolute numbers depend on the machine.${borrowedPage ? ' The base had no benchmark page; it used this branch\'s.' : ''}`,
    '',
    '| ideas | metric | before | after | change |',
    '|---|---|---|---|---|',
  ];
  for (const n of sizes.split(',').map(Number)) {
    for (const [name, unit, get, higherIsBetter] of metrics) {
      const b = pick('base', n, get), h = pick('head', n, get);
      const pct = ((h - b) / b) * 100;
      const better = higherIsBetter ? pct : -pct;
      const flag = Math.abs(pct) < 5 ? '' : better > 0 ? ' (better)' : ' ⚠ worse';
      const fmt = (x) => (unit === 'ms' ? `${Math.round(x)} ms` : `${x.toFixed(1)} fps`);
      lines.push(`| ${n} | ${name} | ${fmt(b)} | ${fmt(h)} | ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%${flag} |`);
    }
  }
  lines.push('', 'Changes within ±5% are noise. Layer ready: lower is better; fps: higher is better (60 is the display\'s limit).');
  console.log('\n' + lines.join('\n'));
} finally {
  spawnSync('git', ['worktree', 'remove', '--force', baseDir], { cwd: root, stdio: 'ignore' });
  rmSync(work, { recursive: true, force: true });
}
