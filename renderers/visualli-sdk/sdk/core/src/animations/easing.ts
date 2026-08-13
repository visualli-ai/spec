// ─── Animation Easing Functions ───────────────────────────────────────────────
//
// Pure math easing functions for smooth, cinematic animations.
// No DOM / RAF dependencies – usable in any runtime.

export type EasingFunction = (t: number) => number;

/** Smooth cubic – slow start, fast middle, slow end. */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Smooth quartic – more dramatic than cubic. */
export const easeInOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

/** Fast start, slow end. */
export const easeOutCubic: EasingFunction = (t) => 1 - Math.pow(1 - t, 3);

/** Slow start, fast end. */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/** Gentle ease-out (quadratic). */
export const easeOutQuad: EasingFunction = (t) => 1 - (1 - t) * (1 - t);

/** Very smooth, organic sine easing. */
export const easeInOutSine: EasingFunction = (t) =>
  -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Create a CSS cubic-bezier easing function from four control-point values.
 *
 * Builds a 256-entry lookup table at call time (once) so subsequent evaluations
 * are a single table lookup + linear interpolation.
 */
export function createCubicBezier(
  x1: number, y1: number,
  x2: number, y2: number,
): EasingFunction {
  const N = 256;
  const lut = new Float64Array(N + 1);

  for (let i = 0; i <= N; i++) {
    const target = i / N;
    let lo = 0, hi = 1;
    for (let j = 0; j < 20; j++) {
      const mid = (lo + hi) / 2;
      const om  = 1 - mid;
      const x   = 3 * om * om * mid * x1 + 3 * om * mid * mid * x2 + mid * mid * mid;
      if (x < target) lo = mid; else hi = mid;
    }
    const u  = (lo + hi) / 2;
    const ou = 1 - u;
    lut[i] = 3 * ou * ou * u * y1 + 3 * ou * u * u * y2 + u * u * u;
  }

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const s = t * N;
    const i = s | 0;
    return lut[i] + (lut[i + 1] - lut[i]) * (s - i);
  };
}

/**
 * Zoom-transition easing — matches CSS cubic-bezier(0.2, 0.8, 0.2, 1).
 * Fast start with smooth, organic settle. Used for all layer transitions.
 * Pre-computed LUT: subsequent calls are a single table lookup + linear interpolation.
 */
export const easeZoomTransition: EasingFunction = createCubicBezier(0.2, 0.8, 0.2, 1);
