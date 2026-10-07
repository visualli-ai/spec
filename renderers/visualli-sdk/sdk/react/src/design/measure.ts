// ─── Label measurement ────────────────────────────────────────────────────────
//
// The text measurement the design system's ideaSize (geometry/idea.ts) needs:
// the idea label's width in its own face and weight — Kalam, or the UI face with
// its .02em tracking in readable type — on a 2D canvas, the same engine that draws it.

import { TYPE_STYLES, approximateMeasure, type IdeaMeasure } from '@visualli/core';
import type { Design } from './design';
import { fontsEpoch } from './runtime';

let ctx: CanvasRenderingContext2D | null | undefined;
const cache = new Map<string, number>();
const MAX_CACHED = 8192;

/** Width of a label in `d`'s idea face (cached per face, size, text and font load). */
export function ideaMeasure(d: Pick<Design, 'fontHand' | 'comfort'>): IdeaMeasure {
  if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  const c = ctx;
  if (!c) return approximateMeasure;
  const weight = TYPE_STYLES['node-label'].weight;
  const tracking = d.comfort.readableType ? 0.02 : 0;
  return (text, px) => {
    const font = `${weight} ${px}px ${d.fontHand}`;
    const key = `${fontsEpoch()}|${font}|${text}`;
    let w = cache.get(key);
    if (w === undefined) {
      c.font = font;
      w = c.measureText(text).width + text.length * px * tracking;
      if (cache.size >= MAX_CACHED) cache.clear();
      cache.set(key, w);
    }
    return w;
  };
}
