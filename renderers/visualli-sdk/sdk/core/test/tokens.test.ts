// The generated TypeScript tokens must equal the design system's CSS for all
// 8 themes, and theme / topic / comfort resolution must behave as documented.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  THEME_NAMES, TOKENS, TOPICS, METRICS, TYPE_STYLES, CANVAS_STYLE, DESIGN_SYSTEM_VERSION,
  resolveTheme, resolveComfort, metricsFor, topicForColor, topicStyle, isDarkTheme, token, labelScale,
} from '../src/index';

const repo = resolve(__dirname, '../../../../..');
const css = readFileSync(`${repo}/design-system/tokens/tokens.css`, 'utf8');
const manifest = JSON.parse(readFileSync(`${repo}/design-system/manifest.json`, 'utf8'));

/** Parse `[data-theme="x"] { --a: b; }` blocks into per-theme overrides. */
function parseCssThemes(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const m of css.matchAll(/(:root, )?\[data-theme="([a-z-]+)"\]\s*\{([^}]*)\}/g)) {
    out[m[2]!] = Object.fromEntries([...m[3]!.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((d) => [d[1]!, d[2]!.trim()]));
  }
  return out;
}

describe('generated tokens match tokens.css', () => {
  const themes = parseCssThemes();
  it('has all 8 themes', () => {
    expect([...THEME_NAMES]).toEqual(['light', 'dark', 'focus-light', 'focus-dark', 'colorsafe-light', 'colorsafe-dark', 'contrast-light', 'contrast-dark']);
  });
  it.each([...THEME_NAMES])('%s: every token equals the CSS value (merged over light)', (name) => {
    const expected = { ...themes.light, ...themes[name] };
    expect(TOKENS[name]).toEqual(expected);
  });
  it('version matches the manifest', () => expect(DESIGN_SYSTEM_VERSION).toBe(manifest.version));
  it('metrics are the numeric tokens', () => {
    expect(METRICS.nodeStroke).toBe(3);
    expect(METRICS.edgeGap).toBe(15);
    expect(METRICS.edgeWidth).toBe(2.5);
    expect(METRICS.zoomMax).toBe(5);
    expect(TYPE_STYLES['node-label'].size).toBe(22);
    expect(TYPE_STYLES['node-root'].size).toBe(30);
    expect(CANVAS_STYLE.node.labelMaxLines).toBe(3);
  });
});

describe('theme resolution', () => {
  it('passes concrete themes through', () => {
    for (const t of THEME_NAMES) expect(resolveTheme(t)).toBe(t);
  });
  it("keeps the old 'light' | 'dark' | 'auto' values working", () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('auto', { prefersDark: false })).toBe('light');
    expect(resolveTheme('auto', { prefersDark: true })).toBe('dark');
    expect(resolveTheme(undefined)).toBe('light');
  });
  it('families follow the reader scheme', () => {
    expect(resolveTheme('focus', { prefersDark: true })).toBe('focus-dark');
    expect(resolveTheme('colorsafe')).toBe('colorsafe-light');
    expect(resolveTheme('contrast', { prefersDark: true })).toBe('contrast-dark');
  });
  it('auto switches to high contrast under forced-colors', () => {
    expect(resolveTheme('auto', { forcedColors: true })).toBe('contrast-light');
    expect(resolveTheme('auto', { forcedColors: true, prefersDark: true })).toBe('contrast-dark');
    expect(resolveTheme('dark', { forcedColors: true })).toBe('dark'); // an explicit choice wins
  });
  it('unknown values fall back to light', () => expect(resolveTheme('nope' as never)).toBe('light'));
  it('isDarkTheme', () => {
    expect(THEME_NAMES.filter(isDarkTheme)).toEqual(['dark', 'focus-dark', 'colorsafe-dark', 'contrast-dark']);
  });
  it('token() throws on unknown keys', () => expect(() => token('light', 'nope')).toThrow());
});

describe('comfort', () => {
  it('reduced motion zeroes durations', () => {
    const m = metricsFor(resolveComfort({ reducedMotion: true }));
    expect(m.durationBase).toBe(0);
    expect(m.durationInstant).toBe(120);
    expect(metricsFor(resolveComfort({ reducedMotion: false })).durationBase).toBe(240);
  });
  it("'system' follows the OS preference", () => {
    expect(resolveComfort({ reducedMotion: 'system' }, { prefersReducedMotion: true }).reducedMotion).toBe(true);
    expect(resolveComfort(undefined, { prefersReducedMotion: true }).reducedMotion).toBe(true);
    expect(resolveComfort({ reducedMotion: false }, { prefersReducedMotion: true }).reducedMotion).toBe(false);
  });
  it('larger text scales labels', () => {
    expect(labelScale(resolveComfort({ largerText: true }))).toBe(1.15);
    expect(labelScale(resolveComfort({}))).toBe(1);
  });
});

describe('topics', () => {
  it('has the 8 design-system topics', () => expect(TOPICS.length).toBe(8));
  it('exact topic fills (any theme) map to their topic', () => {
    for (const theme of THEME_NAMES) for (const t of TOPICS) expect(topicForColor(TOKENS[theme][`topic-${t}`])).toBe(t);
  });
  it('document colours resolve to the nearest topic', () => {
    expect(topicForColor('#a6f5d8')).toBe('teal'); // mint
    expect(topicForColor('#fff699')).toBe('sun'); // yellow
    expect(topicForColor('#a1c4fc')).toBe('harbor'); // blue
    expect(topicForColor('#faada5')).toBe('berry'); // pink
    expect(topicForColor('#FFF')).toBeTruthy(); // short hex
  });
  it('missing / unparsable colours fall back to a stable pick from the seed', () => {
    expect(topicForColor(undefined, 'node-a')).toBe(topicForColor(undefined, 'node-a'));
    expect(topicForColor('not a colour', 7)).toBe(topicForColor('also bad', 7));
    expect(new Set(Array.from({ length: 64 }, (_, i) => topicForColor(undefined, `n${i}`))).size).toBeGreaterThan(3);
  });
  it('topic style uses the ring colour of the active theme', () => {
    expect(topicStyle('light', 'teal')).toEqual({ topic: 'teal', fill: TOKENS.light['topic-teal'], ring: TOKENS.light['topic-teal-ring'] });
    expect(topicStyle('dark', 'teal').ring).toBe(TOKENS.dark['topic-teal-ring']);
    expect(topicStyle('dark', 'teal').ring).not.toBe(topicStyle('light', 'teal').ring);
  });
});

import { parseVisualliFile, getSemanticAnchors } from '../src/index';

describe('semantic anchors', () => {
  const doc = [
    JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' }),
    JSON.stringify({ type: 'extension', id: 'semantic-anchors', data: [{ word: 'Evaporation', description: 'd', knowMoreUrl: null }, { bad: true }] }),
    JSON.stringify({ type: 'layer', id: 'l0', level: 0, nodes: [], connections: [], containers: [] }),
  ].join('\n');
  it('parses the extension and returns only well-formed terms', () => {
    const d = parseVisualliFile(doc);
    expect(d.extensions?.['semantic-anchors']).toHaveLength(2);
    expect(getSemanticAnchors(d)).toEqual([{ word: 'Evaporation', description: 'd', knowMoreUrl: null }]);
  });
  it('documents without extensions still parse', () => {
    const d = parseVisualliFile(doc.split('\n').filter((l) => !l.includes('extension')).join('\n'));
    expect(getSemanticAnchors(d)).toEqual([]);
  });
});
