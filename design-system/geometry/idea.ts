// Generated from visualli.ai design-system/components/src/idea.ts — do not edit here.
/* An idea's size and its label. An idea grows to show its whole label: it starts at its base width and widens in
   steps until the label fits in `labelLines` lines; at its widest it grows taller instead, so a label is never cut.
   Labels (and connector labels) grow a little when the map is zoomed out, so they stay readable. Every renderer sizes
   ideas with these rules, measuring text with its own font engine (`measure`). No dependencies, so it can travel alone. */

export type IdeaKind = 'root' | 'node' | 'mini';

/** How much labels grow when zoomed out (`scale` = the map's zoom): never smaller than their size, up to these caps.
 *  Idea labels and container names use `idea`; connector labels `connector`. Below 100% they grow; above, they don't. */
export const LABEL_GROWTH = { idea: 1.3, connector: 1.6 } as const;

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

/** An idea's size for its label: width, half-width / half-height for the blob, and the label's lines. The label is
 *  measured at its largest drawn size — its type size × `labelScale` (Comfort: larger text) × LABEL_GROWTH.idea (zoomed
 *  out) — so it fits at every zoom and the idea never changes size while zooming. `measure(text, px)` returns the
 *  text's width in px in the label's face at `px`. */
export function ideaSize(kind: IdeaKind, label: string, measure: (text: string, px: number) => number, labelScale = 1) {
  const px = IDEA.labelSize[kind] * labelScale * LABEL_GROWTH.idea;
  const fit = (w: number) => wrapLines(label, w - IDEA.labelInset, (t) => measure(t, px));
  const base = IDEA.baseWidth[kind], max = IDEA.maxWidth[kind];
  let width = base, lines = fit(width);
  while (lines.length > IDEA.labelLines && width < max) { width = Math.min(max, width + IDEA.step); lines = fit(width); }
  const rx = width / 2;
  const ry = Math.max(IDEA.minRy, rx * IDEA.aspect, (lines.length * px * IDEA.labelLineHeight) / 2 / IDEA.labelFillHeight);
  return { width, height: ry * 2, rx, ry, lines };
}

export function labelGrowth(scale: number): { idea: number; connector: number } {
  const inv = 1 / Math.max(scale, 0.0001);
  return { idea: Math.max(1, Math.min(inv, LABEL_GROWTH.idea)), connector: Math.max(1, Math.min(inv, LABEL_GROWTH.connector)) };
}
