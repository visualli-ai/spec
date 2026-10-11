// Generated from visualli.ai design-system/components/src/idea.ts — do not edit here.
/* An idea's size and its label. An idea grows to show its whole label: it starts at its base width and widens in
   steps until the label fits in `labelLines` lines and every line fits the shape; at its widest it grows taller
   instead, so a label is never cut (a single word too long for the widest idea widens it further, up to twice). Labels wrap inside the idea's real outline (a ShapeProfile — blob.ts blobProfile
   for the drawn blob, an ellipse by default): each line may be as wide as the shape is at that line's height.
   Labels (and connector labels) grow a little when the map is zoomed out, so they stay readable. Every renderer sizes
   ideas with these rules, measuring text with its own font engine (`measure`). No dependencies, so it can travel alone. */

export type IdeaKind = 'root' | 'node' | 'mini';

/** How much labels grow when zoomed out (`scale` = the map's zoom): never smaller than their size, up to these caps.
 *  Idea labels and container names use `idea`; connector labels `connector`. Below 100% they grow; above, they don't. */
export const LABEL_GROWTH = { idea: 1.3, connector: 1.6, /** Label lines are wrapped at growth steps this size (layoutGrowth). */ layoutStep: 0.02 } as const;

export const IDEA = {
  /** Width an idea starts at… */ baseWidth: { root: 240, node: 200, mini: 120 },
  /** …and the widest it gets before it grows taller instead. */ maxWidth: { root: 400, node: 360, mini: 200 },
  /** Width grows in steps of this. */ step: 20,
  /** Height = width × aspect (at least `minRy` × 2), more if the label needs it. */ aspect: 0.74, minRy: 64,
  /** The label's box is the idea's width less this (22 each side). */ labelInset: 44,
  /** The idea widens until its label fits in this many lines. */ labelLines: 3,
  /** Label size (before the label scale and zoom growth), weight from the canvas type styles. */ labelSize: { root: 30, node: 22, mini: 15 },
  labelLineHeight: 1.15,
  /** The label may fill at most this share of the idea's height. */ labelFillHeight: 0.7,
} as const;

/** Greedy word wrap of `text` into lines no wider than `maxWidth` (a single word longer than that gets its own line). */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next) > maxWidth) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/** A line's width as the shape-aware wrap measures it: its words' widths plus the spaces between them, each word
 *  measured once. Words repeat across a map, so a renderer measures far fewer strings; kerning across a space (a
 *  fraction of a pixel) is ignored, well inside labelInset. */
function wordsMeasure(measure: (s: string) => number): (s: string) => number {
  const seen = new Map<string, number>(), space = measure(' ');
  const word = (w: string) => { let x = seen.get(w); if (x === undefined) { x = measure(w); seen.set(w, x); } return x; };
  return (line) => { const ws = line.split(' '); let x = (ws.length - 1) * space; for (const w of ws) x += word(w); return x; };
}

/** How wide a shape is at a height: for an idea of half-size rx × ry, `(y) => ` the distance a centered line at height
 *  y (from the center) can reach before it meets the outline. blob.ts `blobProfile(shape)` gives the drawn blob's. */
export type ShapeProfile = (rx: number, ry: number) => (y: number) => number;
/** The default profile, an ellipse — for renderers without blob geometry. */
export const ELLIPSE: ShapeProfile = (rx, ry) => (y) => rx * Math.sqrt(Math.max(0, 1 - (y / ry) * (y / ry)));

/** Greedy word wrap of `text` where line i may be at most `widthOf(i)` wide (a word wider than its line gets its own). */
function wrapVarying(text: string, widthOf: (i: number) => number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next) > widthOf(lines.length)) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

/** The widest each line of an n-line label may be, inside the shape: the label is centered vertically, lines are
 *  `lineHeight` tall, and line i may reach as far as the shape does at both its top and bottom edge, less labelInset. */
export function lineWidthsInShape(n: number, lineHeight: number, halfWidthAt: (y: number) => number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const top = (i - n / 2) * lineHeight, bottom = top + lineHeight;
    return Math.max(0, 2 * Math.min(halfWidthAt(top), halfWidthAt(bottom)) - IDEA.labelInset);
  });
}

/** Word wrap inside a shape: lines take the width the shape has at their height (lineWidthsInShape). The line count
 *  and the lines' heights depend on each other, so it settles in a few passes. */
export function wrapInShape(text: string, lineHeight: number, halfWidthAt: (y: number) => number, measure: (s: string) => number): string[] {
  let n = 1, lines = [text];
  for (let pass = 0; pass < 6; pass++) {
    const widths = lineWidthsInShape(n, lineHeight, halfWidthAt);
    lines = wrapVarying(text, (i) => widths[Math.min(i, n - 1)] ?? 0, measure);
    if (lines.length === n) break;
    n = lines.length;
  }
  return lines;
}

/** Whether `lines` fit the shape: each line no wider than lineWidthsInShape allows (a single word that can't fit counts). */
function fitsShape(lines: string[], lineHeight: number, halfWidthAt: (y: number) => number, measure: (s: string) => number): boolean {
  const widths = lineWidthsInShape(lines.length, lineHeight, halfWidthAt);
  return lines.every((l, i) => measure(l) <= (widths[i] ?? 0) + 0.5);
}

/** An idea's size for its label: width, half-width / half-height for the blob, and the label's lines. The label is
 *  measured at its largest drawn size — its type size × `labelScale` (Comfort: larger text) × LABEL_GROWTH.idea (zoomed
 *  out) — so it fits at every zoom and the idea never changes size while zooming. `measure(text, px)` returns the
 *  text's width in px in the label's face at `px`. */
export function ideaSize(kind: IdeaKind, label: string, measure: (text: string, px: number) => number, labelScale = 1, profile: ShapeProfile = ELLIPSE) {
  const px = IDEA.labelSize[kind] * labelScale * LABEL_GROWTH.idea, lh = px * IDEA.labelLineHeight;
  const m = wordsMeasure((t: string) => measure(t, px));
  // For a width: the base height, the label wrapped in the shape, then taller if the label needs the height.
  const at = (width: number, minRy = 0) => {
    const rx = width / 2;
    let ry = Math.max(IDEA.minRy, rx * IDEA.aspect, minRy);
    let lines = wrapInShape(label, lh, profile(rx, ry), m);
    const needRy = (lines.length * lh) / 2 / IDEA.labelFillHeight;
    if (needRy > ry) { ry = needRy; lines = wrapInShape(label, lh, profile(rx, ry), m); }
    return { rx, ry, lines, fits: lines.length <= IDEA.labelLines && fitsShape(lines, lh, profile(rx, ry), m) };
  };
  const base: number = IDEA.baseWidth[kind], max: number = IDEA.maxWidth[kind];
  let width = base, r = at(width);
  while (!r.fits && width < max) { width = Math.min(max, width + IDEA.step); r = at(width); }
  // A single word too wide for the widest idea (a word is never broken): only then, wider than max, up to twice it.
  const wordTooWide = () => label.split(/\s+/).some((w) => m(w) > (lineWidthsInShape(1, lh, profile(r.rx, r.ry))[0] ?? 0));
  while (!r.fits && width < max * 2 && wordTooWide()) { width += IDEA.step; r = at(width); }
  // At its widest: taller, until every line fits the shape (bounded, so a pathological label still ends).
  for (let k = 0; k < 40 && !fitsShape(r.lines, lh, profile(r.rx, r.ry), m); k++) r = at(width, r.ry + IDEA.step / 2);
  return { width, height: r.ry * 2, rx: r.rx, ry: r.ry, lines: r.lines };
}

/** How an idea's label is drawn at a zoom: its type size × `labelScale` × labelGrowth(zoom).idea, wrapped inside the
 *  idea's shape (wrapInShape with the same profile ideaSize used). Grow first, then wrap: a grown label takes more,
 *  shorter lines and never crosses the outline (the idea itself never resizes with zoom; ideaSize made it big enough
 *  for the largest growth). `px` and `lineHeight` are in map units — draw them inside the map's transform, centered,
 *  one line after another. */
export function labelLayout(kind: IdeaKind, label: string, size: { rx: number; ry: number }, zoom: number, measure: (text: string, px: number) => number, labelScale = 1, profile: ShapeProfile = ELLIPSE) {
  const base = IDEA.labelSize[kind] * labelScale;
  const px = base * labelGrowth(zoom).idea, lineHeight = px * IDEA.labelLineHeight;
  // Lines are wrapped at layoutGrowth (the growth rounded up to a step), so they hold across a zoom range and can be
  // cached; the label is drawn at `px`, never larger than they were wrapped for, so every line still fits.
  const lpx = base * layoutGrowth(zoom), lh = lpx * IDEA.labelLineHeight;
  return { px, lineHeight, lines: wrapInShape(label, lh, profile(size.rx, size.ry), wordsMeasure((t) => measure(t, lpx))) };
}

/** The growth a label's lines are wrapped at: labelGrowth(zoom).idea rounded up to the next LABEL_GROWTH.layoutStep
 *  (never above LABEL_GROWTH.idea). Renderers key cached layouts by it. */
export function layoutGrowth(zoom: number): number {
  const g = labelGrowth(zoom).idea, step = LABEL_GROWTH.layoutStep;
  return Math.min(LABEL_GROWTH.idea, Math.ceil(g / step - 1e-9) * step);
}

export function labelGrowth(scale: number): { idea: number; connector: number } {
  const inv = 1 / Math.max(scale, 0.0001);
  return { idea: Math.max(1, Math.min(inv, LABEL_GROWTH.idea)), connector: Math.max(1, Math.min(inv, LABEL_GROWTH.connector)) };
}
