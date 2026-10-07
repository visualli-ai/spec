// ─── Theme resolution ────────────────────────────────────────────────────────
//
// Everything visual comes from the generated design-system modules. This file
// only decides WHICH of the 8 themes applies and resolves document colours with
// the design system's colour rule. No colour literals live here.
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
import { TOPIC_ORDER, customColor, topicFor, topicFromName } from '../generated/geometry/color.js';

export { topicFromName, customColor };

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

/** An idea's colour by the design system's colour rule (geometry/color.ts, verbatim): a topic name → that topic; no
 *  colour → the topics in sibling order; any other colour → custom, drawn as given (customColor: the colour as the fill,
 *  the fill darkened by CUSTOM.ringShade as the ring). A custom colour doesn't follow themes. */
export interface IdeaColor { topic: TopicName | null; custom: { fill: string; ring: string | null } | null }

export function ideaColor(color: string | null | undefined, siblingIndex: number): IdeaColor {
  const topic = topicFor(color, siblingIndex);
  return topic ? { topic, custom: null } : { topic: null, custom: customColor(color!) };
}

/** Fill + ring an idea is drawn with in a theme: its topic's, or its custom colour (ring: the `edge` token when the
 *  colour has no darker shade, i.e. isn't a 6-digit hex). */
export function ideaStyle(theme: ThemeName, c: { topic?: TopicName | null; custom?: IdeaColor['custom'] }): { fill: string; ring: string } {
  if (c.custom) return { fill: c.custom.fill, ring: c.custom.ring ?? TOKENS[theme]['edge']! };
  return topicStyle(theme, c.topic ?? TOPIC_ORDER[0]);
}
