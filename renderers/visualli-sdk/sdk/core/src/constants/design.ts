// ─── Design System Constants ──────────────────────────────────────────────────
//
// Single source of truth for all color tokens, typography, spacing, and
// visual design constants used across the SDK and consuming apps.
//
// ## Color Priority
//   1. Data file values (node.color, layer.backgroundColor)
//   2. Fall back to these constants

// ── Visualli Design System v2 ─────────────────────────────────────────────────

export const DS_COLORS = {
  light: {
    bgApp:          '#F0EDE6',
    bgSurface:      '#FAF8F4',
    bgInput:        '#FFFFFF',
    border:         '#DDD9D0',
    borderDivider:  '#E8E4DC',
    primary:        '#1B2D4F',
    primaryHover:   '#243B68',
    textPrimary:    '#1A1A18',
    textSecondary:  '#6B6860',
    textMuted:      '#747270',
    textOnPrimary:  '#FAF8F4',
    hoverItem:      'rgba(27,45,79,0.07)',
    focusRing:      'rgba(27,45,79,0.40)',
    btnMuted:       '#8E8C88',
  },
  dark: {
    bgApp:          '#141412',
    bgSurface:      '#1C1C1A',
    bgInput:        '#262622',
    border:         '#333330',
    borderDivider:  '#2A2A28',
    primary:        '#BB532D',
    primaryHover:   '#CC6440',
    textPrimary:    '#F0EDE6',
    textSecondary:  '#B0ABA3',
    textMuted:      '#8E8C88',
    textOnPrimary:  '#FAF8F4',
    hoverItem:      'rgba(198,94,56,0.12)',
    focusRing:      'rgba(198,94,56,0.50)',
    btnMuted:       '#4A4845',
  },
} as const;

export const DS_TYPOGRAPHY = {
  fontDisplay: "'Nunito', sans-serif",
  fontBody:    "'Nunito Sans', sans-serif",
  logo:     { size: '20px', weight: 800, letterSpacing: '0.04em' },
  heading:  { size: '16px', weight: 700, letterSpacing: '-0.2px' },
  cta:      { size: '11px', weight: 800, letterSpacing: '0.12em', transform: 'uppercase' as const },
  body:     { size: '13px', weight: 400 },
  input:    { size: '13px', weight: 300, style: 'italic' as const },
  search:   { size: '12px', weight: 400 },
  username: { size: '13px', weight: 600 },
  avatar:   { size: '11px', weight: 700 },
  footer:   { size: '12px', weight: 400 },
  empty:    { size: '11px', weight: 300, style: 'italic' as const },
} as const;

export const DS_RADII = {
  sidebar: 16,
  input:   8,
  cta:     7,
  item:    6,
  swatch:  10,
} as const;

// ── Brand Colors ──────────────────────────────────────────────────────────────

export const BRAND_COLORS = {
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  secondary: {
    50:  '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  accent: {
    purple: '#8B5CF6',
    cyan:   '#06B6D4',
    sky:    '#0EA5E9',
    lime:   '#84CC16',
    amber:  '#F59E0B',
    red:    '#EF4444',
  },
} as const;

// ── Level Colors ──────────────────────────────────────────────────────────────

export const LEVEL_COLORS = {
  level0: BRAND_COLORS.primary[500],
  level1: BRAND_COLORS.primary[400],
  level2: BRAND_COLORS.primary[300],
  level3: BRAND_COLORS.primary[200],
  level4: BRAND_COLORS.primary[300],
  level5: BRAND_COLORS.primary[400],
  level6: BRAND_COLORS.primary[500],
  level7: BRAND_COLORS.primary[600],
  level8: BRAND_COLORS.primary[700],
} as const;

export const LEVEL_COLOR_ARRAY = [
  LEVEL_COLORS.level0,
  LEVEL_COLORS.level1,
  LEVEL_COLORS.level2,
  LEVEL_COLORS.level3,
  LEVEL_COLORS.level4,
  LEVEL_COLORS.level5,
  LEVEL_COLORS.level6,
  LEVEL_COLORS.level7,
  LEVEL_COLORS.level8,
] as const;

export const PARENT_FALLBACK_COLORS = [
  '#12C7D3', '#325E8C', '#8A70A6', '#F54A57', '#FF6C4D',
  '#F28C16', '#FFD347', '#7F7F7F', '#8D8D8D',
] as const;

export const SEMANTIC_COLORS = {
  success: BRAND_COLORS.secondary[500],
  error:   BRAND_COLORS.accent.red,
  warning: BRAND_COLORS.accent.amber,
  info:    BRAND_COLORS.primary[500],
} as const;

// ── Theme Colors ──────────────────────────────────────────────────────────────

export const THEME_COLORS = {
  light: {
    background: { primary: '#FAF8F4', secondary: '#F0EDE6', tertiary: '#FFFFFF' },
    text:       { primary: '#1A1A18', secondary: '#6B6860', tertiary: '#747270' },
    border:     { primary: '#DDD9D0', secondary: '#E8E4DC' },
  },
  dark: {
    background: { primary: '#1C1C1A', secondary: '#141412', tertiary: '#262622' },
    text:       { primary: '#F0EDE6', secondary: '#B0ABA3', tertiary: '#8E8C88' },
    border:     { primary: '#333330', secondary: '#2A2A28' },
  },
} as const;

// ── Canvas Node Colors ────────────────────────────────────────────────────────

export const CANVAS_COLORS = {
  node: {
    border:          '#FFFFFF',
    titleColor:      '#1e1b4b',
    badgeBackground: '#FFC107',
    badgeStroke:     '#fcd34d',
  },
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const;

export const LAYOUT_SPACING = {
  nodeSpacing:      200,
  levelSpacing:     150,
  containerPadding: 20,
  gridSize:         50,
} as const;

// ── Typography ────────────────────────────────────────────────────────────────

export const FONTS = {
  primary:   "'Inter', sans-serif",
  secondary: "'Poppins', sans-serif",
  mono:      "'Roboto Mono', monospace",
} as const;

export const FONT_SIZES = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get a level color, cycling back to level 0 for levels > 8. */
export function getColorForLevel(level: number): string {
  return LEVEL_COLOR_ARRAY[level % LEVEL_COLOR_ARRAY.length];
}

/**
 * Darken a hex color by reducing HSL lightness.
 * Returns a monochromatic darker version — used for border/stroke colors.
 * Falls back to the original string if parsing fails.
 */
export function darkenHexColor(hex: string, amount: number = 0.22): string {
  if (!hex || !hex.startsWith('#')) return hex;
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const cmax = Math.max(rn, gn, bn), cmin = Math.min(rn, gn, bn);
  const d = cmax - cmin;
  const l = (cmax + cmin) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    const seg = cmax === rn ? (gn - bn) / d : cmax === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h = ((seg * 60) + 360) % 360;
  }
  const newL = Math.max(0, l - amount);
  const c2 = (1 - Math.abs(2 * newL - 1)) * s;
  const x2 = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = newL - c2 / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if      (h < 60)  { r1 = c2; g1 = x2; b1 = 0; }
  else if (h < 120) { r1 = x2; g1 = c2; b1 = 0; }
  else if (h < 180) { r1 = 0;  g1 = c2; b1 = x2; }
  else if (h < 240) { r1 = 0;  g1 = x2; b1 = c2; }
  else if (h < 300) { r1 = x2; g1 = 0;  b1 = c2; }
  else              { r1 = c2; g1 = 0;  b1 = x2; }
  const toHex = (v: number) => Math.round((v + m2) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

export function getThemeBackground(
  isDark: boolean,
  variant: 'primary' | 'secondary' | 'tertiary' = 'primary',
): string {
  return isDark ? THEME_COLORS.dark.background[variant] : THEME_COLORS.light.background[variant];
}

export function getThemeText(
  isDark: boolean,
  variant: 'primary' | 'secondary' | 'tertiary' = 'primary',
): string {
  return isDark ? THEME_COLORS.dark.text[variant] : THEME_COLORS.light.text[variant];
}

export function getThemeBorder(
  isDark: boolean,
  variant: 'primary' | 'secondary' = 'primary',
): string {
  return isDark ? THEME_COLORS.dark.border[variant] : THEME_COLORS.light.border[variant];
}
