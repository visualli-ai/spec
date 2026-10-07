// ─── Design object ───────────────────────────────────────────────────────────
//
// Everything the canvas needs for one theme + comfort combination, resolved
// once from the design-system tokens (no colour or font literals here).

import {
  CANVAS_STYLE,
  TYPE_STYLES,
  isContrastTheme,
  isDarkTheme,
  labelScale,
  metricsFor,
  resolveComfort,
  resolveTheme,
  type Comfort,
  type Metrics,
  type ResolvedComfort,
  type ThemeInput,
  type ThemeName,
  TOKENS,
} from '@visualli/core';

export interface NodeShadow { x: number; y: number; blur: number; color: string }

export interface Design {
  theme: ThemeName;
  comfort: ResolvedComfort;
  tokens: Readonly<Record<string, string>>;
  metrics: Metrics;
  isDark: boolean;
  /** CSS font stacks, already switched to the readable face when that comfort setting is on. */
  fontHand: string;
  fontNote: string;
  fontUi: string;
  /** Multiplier for label sizes (`--vi-label-scale`). */
  labelScale: number;
  /** Idea drop shadow for this theme; null when the theme turns it off (high contrast). */
  nodeShadow: NodeShadow | null;
  /** Attributes the spec CSS keys off; put them on the renderer's root element. */
  attrs: Record<string, string>;
  /** Canvas weight/size for connector labels (the readable face is smaller and bolder). */
  edgeLabel: { weight: number; size: number };
}

/** Parse a CSS shadow like `0 6px 14px rgba(…)` as written in the design-system CSS. */
function parseShadow(css: string): NodeShadow | null {
  const m = /^(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(.+)$/.exec(css.trim());
  return m ? { x: +m[1]!, y: +m[2]!, blur: +m[3]!, color: m[4]!.trim() } : null;
}

const cache = new Map<string, Design>();

export function makeDesign(theme: ThemeName, comfortIn: ResolvedComfort): Design {
  const key = `${theme}|${+comfortIn.readableType}${+comfortIn.largerText}${+comfortIn.reducedMotion}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const tokens = TOKENS[theme];
  const ui = tokens['font-ui']!;
  const d: Design = {
    theme,
    comfort: comfortIn,
    tokens,
    metrics: metricsFor(comfortIn),
    isDark: isDarkTheme(theme),
    fontHand: comfortIn.readableType ? ui : tokens['font-hand']!,
    fontNote: comfortIn.readableType ? ui : tokens['font-note']!,
    fontUi: ui,
    labelScale: labelScale(comfortIn),
    nodeShadow: isContrastTheme(theme) ? null : parseShadow(isDarkTheme(theme) ? CANVAS_STYLE.node.shadowDark : CANVAS_STYLE.node.shadowLight),
    attrs: {
      'data-theme': theme,
      ...(comfortIn.readableType ? { 'data-type': 'readable' } : {}),
      ...(comfortIn.largerText ? { 'data-scale': 'lg' } : {}),
      ...(comfortIn.reducedMotion ? { 'data-motion': 'reduced' } : {}),
    },
    edgeLabel: comfortIn.readableType ? { weight: CANVAS_STYLE.edge.readableLabelWeight, size: CANVAS_STYLE.edge.readableLabelSize } : { weight: CANVAS_STYLE.edge.labelWeight, size: CANVAS_STYLE.edge.labelSize },
  };
  cache.set(key, d);
  return d;
}

/** Canvas font shorthand for an idea label at its natural (unscaled) size. */
export function ideaFont(d: Design, px: number): string {
  const weight = TYPE_STYLES['node-label'].weight;
  return `${weight} ${px}px ${d.fontHand}`;
}

export const DEFAULT_DESIGN: Design = makeDesign('light', { readableType: false, largerText: false, reducedMotion: false });

export interface DesignProps {
  /**
   * One of the 8 design-system themes ('light', 'dark', 'focus-light', 'focus-dark',
   * 'colorsafe-light', 'colorsafe-dark', 'contrast-light', 'contrast-dark'), a family
   * ('focus' | 'colorsafe' | 'contrast') or 'auto' (follow the reader's colour scheme).
   */
  theme?: ThemeInput;
  /** @deprecated use `theme`. Kept for one release: true -> 'dark', false -> 'light'. */
  isDark?: boolean;
  /** Readable type, larger text, reduced motion. */
  comfort?: Comfort;
  /** Switch to the matching high-contrast theme under forced-colors (Windows high contrast etc.). Default true. */
  respectForcedColors?: boolean;
}

/** Resolve props + reader environment (colour scheme, forced colours, reduced motion) to a Design. */
export function resolveDesign(props: DesignProps, env: { prefersDark: boolean; forcedColors: boolean; prefersReducedMotion: boolean }): Design {
  const input: ThemeInput | undefined = props.theme ?? (props.isDark === undefined ? undefined : props.isDark ? 'dark' : 'light');
  let theme = resolveTheme(input, { prefersDark: env.prefersDark, forcedColors: env.forcedColors });
  // Forced colours override the reader's palette: honour that with the high-contrast theme of the same scheme.
  if (env.forcedColors && props.respectForcedColors !== false && !isContrastTheme(theme)) {
    theme = (isDarkTheme(theme) ? 'contrast-dark' : 'contrast-light') as ThemeName;
  }
  return makeDesign(theme, resolveComfort(props.comfort, { prefersReducedMotion: env.prefersReducedMotion }));
}
