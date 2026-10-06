// CI guard: the SDK must take every colour, font and blob coordinate from the
// design system (via the generated modules). Fails on literals found anywhere in
// sdk/**/src outside src/generated/.
//
//   node scripts/check-design-literals.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sdk = join(root, 'renderers/visualli-sdk/sdk');

const RULES = [
  { name: 'hex colour', re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'colour function literal', re: /\b(?:rgba?|hsla?)\(\s*\d/ },
  { name: 'font name', re: /\b(?:Kalam|Caveat|Atkinson|Nunito|Inter|Playpen|Story Script|Poppins|Roboto|Quicksand|Helvetica|Arial)\b/ },
  // normalised blob coordinates: two consecutive decimals like  -0.489, -0.625  or  { x: 1.12, y: 0.0 }
  { name: 'blob coordinate pair', re: /-?\d+\.\d{2,3}\s*,\s*-?\d+\.\d{2,3}/ },
  { name: 'blob coordinate object', re: /\bx:\s*-?\d+\.\d{2,3}\s*,\s*y:\s*-?\d+\.\d{2,3}/ },
];

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === 'node_modules' || f === 'dist' || f === 'generated') continue;
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(f)) yield p;
  }
}

/** Blank out comments and keep line numbers (comments may legitimately mention names). */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, (m, pre) => pre);
}

const problems = [];
for (const pkg of readdirSync(sdk)) {
  const src = join(sdk, pkg, 'src');
  try { statSync(src); } catch { continue; }
  for (const file of walk(src)) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const r of RULES) if (r.re.test(line)) problems.push(`${relative(root, file)}:${i + 1}  ${r.name}: ${line.trim().slice(0, 110)}`);
    });
  }
}

if (problems.length) {
  console.error(`Design literals found outside generated files (${problems.length}). Take values from the design system instead:\n\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('no colour, font or blob-coordinate literals outside generated files');
