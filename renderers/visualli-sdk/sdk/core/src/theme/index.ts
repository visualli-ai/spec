// ─── Theme resolution ────────────────────────────────────────────────────────
//
// Everything visual comes from the generated design-system modules. This file
// only decides WHICH of the 8 themes applies and how document colours map to
// the design system's topic palette. No colour literals live here.
//
// Dependencies: ../generated/designSystem.ts (generated from design-system/).

import {
  CANVAS_STYLE,
  DESIGN_SYSTEM_VERSION,
  METRICS,
  METRICS_REDUCED_MOTION,
  THEME_NAMES,
  TOKENS,
  TOPICS,
  TYPE_STYLES,
  type ThemeName,
  type TopicName,
} from '../generated/designSystem.js';
import { topicFor, topicFromName } from '../generated/geometry/color.js';

export { topicFromName };

export { CANVAS_STYLE, DESIGN_SYSTEM_VERSION, METRICS, METRICS_REDUCED_MOTION, THEME_NAMES, TOKENS, TOPICS, TYPE_STYLES };
export type { ThemeName, TopicName };

// ── Theme selection ───────────────────────────────────────────────────────────

/** Theme families: each resolves to its light or dark member. */
export type ThemeFamily = 'standard' | 'focus' | 'colorsafe' | 'contrast';

/**
 * Anything a consumer may pass as `theme`:
 *  - one of the 8 design-system themes ('light', 'dark', 'focus-light', ...)
 *  - a family name ('focus' | 'colorsafe' | 'contrast') -> light/dark per the reader's scheme
 *  - 'auto' -> light/dark per prefers-color-scheme (contrast under forced-colors)
 *
 * 'light' | 'dark' | 'auto' are the pre-0.2 values, kept as aliases for one release.
 */
export type ThemeInput = ThemeName | 'auto' | 'focus' | 'colorsafe' | 'contrast';

export interface ThemeEnv {
  /** prefers-color-scheme: dark */
  prefersDark?: boolean;
  /** forced-colors: active (Windows high contrast etc.) */
  forcedColors?: boolean;
}

const FAMILIES: ReadonlySet<string> = new Set(['focus', 'colorsafe', 'contrast']);

export function isThemeName(v: unknown): v is ThemeName {
  return typeof v === 'string' && (THEME_NAMES as readonly string[]).includes(v);
}

/** Resolve any accepted `theme` value to one concrete design-system theme. */
export function resolveTheme(input: ThemeInput | undefined, env: ThemeEnv = {}): ThemeName {
  const scheme = env.prefersDark ? 'dark' : 'light';
  if (input === undefined || input === 'auto') return env.forcedColors ? (`contrast-${scheme}` as ThemeName) : scheme;
  if (FAMILIES.has(input)) return `${input}-${scheme}` as ThemeName;
  return isThemeName(input) ? input : 'light';
}

export const isDarkTheme = (name: ThemeName): boolean => name.endsWith('dark');
export const isContrastTheme = (name: ThemeName): boolean => name.startsWith('contrast');
export const isFocusTheme = (name: ThemeName): boolean => name.startsWith('focus');

/** All tokens of a theme (already merged over the light defaults). */
export const getTokens = (name: ThemeName): Readonly<Record<string, string>> => TOKENS[name];

/** One token of a theme. Throws on an unknown key so typos fail loudly in tests. */
export function token(name: ThemeName, key: string): string {
  const v = TOKENS[name][key];
  if (v === undefined) throw new Error(`Unknown design-system token "${key}"`);
  return v;
}

// ── Comfort settings ──────────────────────────────────────────────────────────

export interface Comfort {
  /** Atkinson Hyperlegible for map labels instead of the handwritten faces (`data-type="readable"`). */
  readableType?: boolean;
  /** Larger UI and label text (`data-scale="lg"`). */
  largerText?: boolean;
  /** Skip transitions and reveal animations (`data-motion="reduced"`). 'system' follows prefers-reduced-motion. */
  reducedMotion?: boolean | 'system';
}

export interface ResolvedComfort { readableType: boolean; largerText: boolean; reducedMotion: boolean }

export function resolveComfort(c: Comfort | undefined, env: { prefersReducedMotion?: boolean } = {}): ResolvedComfort {
  const rm = c?.reducedMotion;
  return {
    readableType: !!c?.readableType,
    largerText: !!c?.largerText,
    reducedMotion: rm === undefined || rm === 'system' ? !!env.prefersReducedMotion : rm,
  };
}

/** Numeric design-system tokens (px / ms stripped). */
export type Metrics = { readonly [K in keyof typeof METRICS]: number };

/** Numeric tokens with the reduced-motion overrides applied when requested. */
export function metricsFor(comfort: ResolvedComfort): Metrics {
  return comfort.reducedMotion ? { ...METRICS, ...METRICS_REDUCED_MOTION } : METRICS;
}

/** Multiplier the spec applies to label sizes under `data-scale="lg"` (`--vi-label-scale`). */
export const labelScale = (c: ResolvedComfort): number => (c.largerText ? 1.15 : 1);

// ── Topic palette ─────────────────────────────────────────────────────────────

export interface TopicStyle { topic: TopicName; fill: string; ring: string }

/** Fill + ring colour of a topic in a theme. */
export function topicStyle(theme: ThemeName, topic: TopicName): TopicStyle {
  const t = TOKENS[theme];
  return { topic, fill: t[`topic-${topic}`]!, ring: t[`topic-${topic}-ring`]! };
}

function parseColor(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** sRGB -> CIE Lab (D65), for perceptual nearest-topic matching. */
function toLab([r, g, b]: [number, number, number]): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

let labCache: Array<{ topic: TopicName; lab: [number, number, number] }> | null = null;
let exactCache: Map<string, TopicName> | null = null;

function palettes() {
  if (!labCache || !exactCache) {
    labCache = []; exactCache = new Map();
    for (const topic of TOPICS) {
      const lightFill = parseColor(TOKENS.light[`topic-${topic}`]!);
      if (lightFill) labCache.push({ topic, lab: toLab(lightFill) });
      for (const theme of THEME_NAMES) exactCache.set(TOKENS[theme][`topic-${topic}`]!.toLowerCase(), topic);
    }
  }
  return { lab: labCache, exact: exactCache };
}

function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Map a document colour to the design system's topic palette. Names and missing
 * colours follow the design system's colour rule (`geometry/color.ts` → `topicFor`,
 * copied verbatim into src/generated/geometry):
 *  - a topic name ('teal', 'Harbor') → that topic;
 *  - no colour → the topics in order by the idea's position among its siblings
 *    (`siblingIndex`), so siblings differ; without an index, a stable pick from `seed`;
 *  - any other colour → the perceptually nearest topic fill (exact topic fills in
 *    any theme match exactly) — a .visualli file's free-form hex colours only get
 *    themed fills this way. Unparsable colours fall back to a stable pick from `seed`.
 */
export function topicForColor(color: string | undefined, seed: string | number = 0, siblingIndex?: number): TopicName {
  // Names, and missing colours in sibling order: the design system's own rule (geometry/color.ts, verbatim).
  const named = topicFromName(color);
  if (named) return named;
  if ((!color || !color.trim()) && siblingIndex !== undefined) return topicFor(color, siblingIndex)!;
  const { lab, exact } = palettes();
  if (color) {
    const hit = exact.get(color.trim().toLowerCase());
    if (hit) return hit;
    const rgb = parseColor(color);
    if (rgb) {
      const [L, a, b] = toLab(rgb);
      let best = lab[0]!, bestD = Infinity;
      for (const c of lab) {
        const d = (c.lab[0] - L) ** 2 + (c.lab[1] - a) ** 2 + (c.lab[2] - b) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      return best.topic;
    }
  }
  return TOPICS[hashSeed(seed) % TOPICS.length]!;
}
