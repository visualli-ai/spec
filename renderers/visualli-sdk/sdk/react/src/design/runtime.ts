// ─── Design-system runtime ───────────────────────────────────────────────────
//
// Injects the design system's CSS (tokens + spec components) once per page,
// loads its fonts, and tracks devicePixelRatio for the canvas.
//
// Dependencies: ../generated/specCss.ts (generated from design-system/).

import { useSyncExternalStore } from 'react';
import { TOKENS, TYPE_STYLES } from '@visualli/core';
import {
  SPEC_BUNDLED_FONTS,
  SPEC_COMPONENT_CSS,
  SPEC_DESIGN_SYSTEM_VERSION,
  SPEC_FONTS_URL,
  SPEC_TOKENS_CSS,
} from '../generated/specCss';

const STYLE_ID = 'visualli-design-system';
const FONTS_ID = 'visualli-design-system-fonts';
const CAVEAT_ID = 'visualli-design-system-caveat';
// Injected by tsup (`define`) from package.json so it can never drift from the published version.
declare const __SDK_VERSION__: string;
const SDK_VERSION = typeof __SDK_VERSION__ === 'string' ? __SDK_VERSION__ : 'latest';

export interface DesignSystemAssets {
  /**
   * Where the bundled Caveat font file is served from (URL of the directory that
   * contains `Caveat-Variable.ttf`). Defaults to the copy shipped inside the npm
   * package, via jsDelivr.
   */
  fontBaseUrl?: string;
  /** Set false to skip the Google Fonts stylesheet (Kalam + Atkinson Hyperlegible), e.g. when self-hosting them. */
  loadWebFonts?: boolean;
}

let webFontsSheet: Promise<void> = Promise.resolve();

/**
 * Inject the spec CSS and font declarations once. Safe to call repeatedly and on the server (no-op).
 * The returned promise settles when the web-font stylesheet has loaded (its @font-face rules must exist
 * before document.fonts.load() can fetch anything).
 */
export function ensureDesignSystemStyles(assets: DesignSystemAssets = {}): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-design-system', SPEC_DESIGN_SYSTEM_VERSION);
    // Component CSS goes first so token rules (same specificity) win ties, exactly like index.css load order.
    style.textContent = `${SPEC_TOKENS_CSS}\n${SPEC_COMPONENT_CSS}`;
    document.head.appendChild(style);
  }

  if (assets.loadWebFonts !== false && SPEC_FONTS_URL && !document.getElementById(FONTS_ID)) {
    const link = document.createElement('link');
    link.id = FONTS_ID;
    link.rel = 'stylesheet';
    link.href = SPEC_FONTS_URL;
    webFontsSheet = new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    });
    document.head.appendChild(link);
  }

  if (!document.getElementById(CAVEAT_ID)) {
    const base = (assets.fontBaseUrl ?? `https://cdn.jsdelivr.net/npm/@visualli/react@${SDK_VERSION}/fonts`).replace(/\/$/, '');
    const style = document.createElement('style');
    style.id = CAVEAT_ID;
    style.textContent = SPEC_BUNDLED_FONTS
      .map((f) => `@font-face { font-family: "${f.family}"; src: url("${base}/${f.file}"); font-weight: ${f.weight}; font-display: swap; }`)
      .join('\n');
    document.head.appendChild(style);
  }
  return webFontsSheet;
}

// ── Fonts ─────────────────────────────────────────────────────────────────────

/** First family of a font stack token, e.g. `font-hand` -> its handwriting face. */
const firstFamily = (stack: string): string => stack.split(',')[0]!.trim();

/**
 * Faces the canvas draws with, derived from the design-system tokens and type styles.
 * Loading them up front means the first frame already uses the right fonts.
 */
const CANVAS_FONT_FACES = (['node-label', 'edge-label', 'body'] as const).map((style) => {
  const t = TYPE_STYLES[style];
  return `${t.weight} ${t.size}px ${firstFamily(TOKENS.light[t.family]!)}`;
});

let fontsEpochValue = 0;
const fontListeners = new Set<() => void>();

/** Bumps whenever web fonts finish loading; text measurement caches are keyed on it. */
export const fontsEpoch = (): number => fontsEpochValue;

/** React hook: re-renders when fonts finish loading (so canvases redraw with the real faces). */
export function useFontsEpoch(): number {
  return useSyncExternalStore(onFontsChange, fontsEpoch, () => 0);
}
export const onFontsChange = (cb: () => void): (() => void) => { fontListeners.add(cb); return () => fontListeners.delete(cb); };

/**
 * Resolves once the canvas fonts are usable (or after `timeoutMs`, so an
 * offline reader still gets a map in the fallback faces).
 */
export function loadCanvasFonts(sheet: Promise<void> = Promise.resolve(), timeoutMs = 3000): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve();
  const fonts = document.fonts;
  const loads = sheet.then(() => Promise.all(CANVAS_FONT_FACES.map((f) => fonts.load(f).catch(() => [])))).then(() => fonts.ready).then(() => undefined);
  const timeout = new Promise<void>((r) => setTimeout(r, timeoutMs));
  return Promise.race([loads, timeout]).then(() => { fontsEpochValue++; fontListeners.forEach((cb) => cb()); });
}

if (typeof document !== 'undefined' && 'fonts' in document) {
  // Late-arriving faces (slow network) invalidate cached text layouts and trigger a redraw.
  document.fonts.addEventListener?.('loadingdone', () => { fontsEpochValue++; fontListeners.forEach((cb) => cb()); });
}

// ── Pixel ratio ───────────────────────────────────────────────────────────────

/** Device pixel ratio the canvas renders at (capped: >3 only costs memory). */
export const currentPixelRatio = (): number =>
  typeof window === 'undefined' ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);

/** Calls `cb` whenever devicePixelRatio changes (browser zoom, moving the window between displays). */
export function watchPixelRatio(cb: (ratio: number) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  let mql: MediaQueryList;
  let stopped = false;
  const arm = () => {
    mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mql.addEventListener('change', onChange, { once: true });
  };
  const onChange = () => { if (stopped) return; cb(currentPixelRatio()); arm(); };
  arm();
  return () => { stopped = true; mql.removeEventListener('change', onChange); };
}
