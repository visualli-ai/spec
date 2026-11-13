// ─── Going back a layer by gesture (VI-040) ──────────────────────────────────
//
// The design system's BACK (geometry/interaction.ts): two taps on the empty canvas, close in time and place, are a
// double-tap and go back a layer. A double-tap whose first tap closed a peek doesn't also go back - people tap twice
// in a hurry to dismiss.

import { BACK } from '@visualli/core';

/** A tap on the empty canvas, remembered until the next one. */
export interface TapMark {
  /** When it ended (ms, any monotonic clock). */ t: number;
  /** Where it ended (client px). */ x: number; y: number;
  /** It closed a peek (the touch sheet) - it can't start a double-tap. */ closed: boolean;
}

/** Whether a tap on the empty canvas, after `prev`, makes a double-tap. */
export function isDoubleTap(prev: TapMark | null, tap: { t: number; x: number; y: number }): boolean {
  return !!prev && !prev.closed && tap.t - prev.t < BACK.doubleTapMs && Math.hypot(tap.x - prev.x, tap.y - prev.y) < BACK.doubleTapPx;
}
