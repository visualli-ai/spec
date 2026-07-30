// ─── Konva Layer Transition Animator ─────────────────────────────────────────
//
// rAF-driven animation engine for layer navigation:
//   animateZoomIntoLayer   — camera-dive into child layer
//   animateZoomOutToParent — pull back to parent layer
//   animateCrossFade       — simple cross-fade between two viewports
//
// No React dependencies — can be instantiated once and reused.

import { easeInOutSine, easeOutCubic, easeZoomTransition } from '@visualli/core';
import { ANIMATION_PHASES } from '@visualli/core';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnimatorViewport {
  centerX: number;
  centerY: number;
  zoomLevel: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransitionCallbacks {
  onUpdate: (state: { viewport: AnimatorViewport; opacity: number; backgroundColor: string }) => void;
  onComplete: () => void;
  onPhaseChange?: (phase: string) => void;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }

function parseColor(color: string): RGB {
  if (color.startsWith('#')) {
    const h = color.slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : { r: 255, g: 255, b: 255 };
}

function interpolateRgb(a: RGB, b: RGB, t: number): string {
  const e = easeInOutSine(t);
  return `rgb(${(a.r + (b.r - a.r) * e + 0.5) | 0},${(a.g + (b.g - a.g) * e + 0.5) | 0},${(a.b + (b.b - a.b) * e + 0.5) | 0})`;
}

// (easeZoomTransition is imported from @visualli/core — createCubicBezier(0.2, 0.8, 0.2, 1))

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

// ── Animator class ────────────────────────────────────────────────────────────

export class KonvaLayerTransitionAnimator {
  private rafId: number | null = null;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private _active = false;

  get active(): boolean { return this._active; }

  cancel(): void {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this._active = false;
  }

  // ── Zoom into child layer ──────────────────────────────────────────────────

  animateZoomIntoLayer(
    current: AnimatorViewport,
    targetNode: NodeBounds,
    childCenter: { x: number; y: number },
    fromColor: string,
    toColor: string,
    cb: TransitionCallbacks,
    targetZoom = 1.0,
    canvasWidth = 800,
    canvasHeight = 600,
  ): void {
    if (this._active) return;
    this._active = true;

    // Timing constants pulled from ANIMATION_PHASES (single source of truth)
    const ZOOM_DURATION     = ANIMATION_PHASES.ZOOM_IN.ZOOM_TO_TARGET;   // 500 ms
    const FADE_OUT_DELAY    = ANIMATION_PHASES.ZOOM_IN.FADE_OUT_START;   // 120 ms
    const FADE_OUT_DURATION = ANIMATION_PHASES.ZOOM_IN.FADE_OUT;         // 280 ms — completes at 400 ms
    const SWAP_AT_MS        = ANIMATION_PHASES.ZOOM_IN.CONTENT_SWAP;     // 310 ms
    const FADE_IN_DURATION  = ANIMATION_PHASES.ZOOM_IN.FADE_IN;          // 200 ms
    const SETTLE_FACTOR     = 0.94;

    const z0 = current.zoomLevel;
    const dx = targetNode.x - current.centerX;
    const dy = targetNode.y - current.centerY;
    const vmin = Math.min(canvasWidth, canvasHeight);
    const fillZoom = Math.max(4.0, (vmin * 1.5) / Math.max(targetNode.width, 100));

    const fromRgb = parseColor(fromColor);
    const toRgb   = parseColor(toColor);
    const state   = { viewport: { centerX: 0, centerY: 0, zoomLevel: 0 }, opacity: 1, backgroundColor: fromColor };

    const start = performance.now();
    let swapped = false;
    let fadeInStart = 0;

    cb.onPhaseChange?.('zoom');

    const tick = (now: number): void => {
      if (!this._active) return;
      const elapsed = now - start;

      if (!swapped) {
        if (elapsed >= SWAP_AT_MS) {
          swapped = true;
          fadeInStart = now;
          state.viewport = { centerX: childCenter.x, centerY: childCenter.y, zoomLevel: targetZoom * SETTLE_FACTOR };
          state.opacity = 0;
          state.backgroundColor = toColor;
          cb.onUpdate(state);
          cb.onPhaseChange?.('swap');
          this.rafId = requestAnimationFrame(tick);
          return;
        }
        const rawT  = Math.min(elapsed / ZOOM_DURATION, 1);
        const zoomT = easeZoomTransition(rawT);
        const zl    = lerp(z0, fillZoom, zoomT);
        state.viewport = {
          centerX:   targetNode.x - dx * z0 * (1 - zoomT) / zl,
          centerY:   targetNode.y - dy * z0 * (1 - zoomT) / zl,
          zoomLevel: zl,
        };
        state.opacity = elapsed > FADE_OUT_DELAY
          ? Math.max(0, 1 - easeOutCubic(Math.min((elapsed - FADE_OUT_DELAY) / FADE_OUT_DURATION, 1)))
          : 1;
        state.backgroundColor = interpolateRgb(fromRgb, toRgb, rawT);
        cb.onUpdate(state);
      } else {
        const fi   = now - fadeInStart;
        const ft   = Math.min(fi / FADE_IN_DURATION, 1);
        const eased = easeOutCubic(ft);
        state.viewport = { centerX: childCenter.x, centerY: childCenter.y, zoomLevel: lerp(targetZoom * SETTLE_FACTOR, targetZoom, eased) };
        state.opacity = eased;
        state.backgroundColor = toColor;
        cb.onUpdate(state);
        if (ft >= 1) { cb.onPhaseChange?.('fade-in'); this.rafId = null; this._complete(cb.onComplete); return; }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  // ── Zoom out to parent layer ───────────────────────────────────────────────

  animateZoomOutToParent(
    current: AnimatorViewport,
    parent: AnimatorViewport,
    fromColor: string,
    toColor: string,
    cb: TransitionCallbacks,
  ): void {
    if (this._active) return;
    this._active = true;

    const FADE_OUT = ANIMATION_PHASES.ZOOM_OUT.FADE_OUT;
    const FADE_IN  = ANIMATION_PHASES.ZOOM_OUT.FADE_IN;
    const OPACITY_SETTLE = 66;

    const fromRgb = parseColor(fromColor);
    const toRgb   = parseColor(toColor);
    const state   = { viewport: { centerX: 0, centerY: 0, zoomLevel: 0 }, opacity: 1, backgroundColor: fromColor };

    const start = performance.now();
    let swapped = false;
    let fadeInStart = 0;

    cb.onPhaseChange?.('fade-out');

    const tick = (now: number): void => {
      if (!this._active) return;
      const elapsed = now - start;

      if (!swapped) {
        if (elapsed >= FADE_OUT) {
          swapped = true; fadeInStart = now;
          state.viewport = { centerX: parent.centerX, centerY: parent.centerY, zoomLevel: parent.zoomLevel * 5 };
          state.opacity = 0;
          state.backgroundColor = toColor;
          cb.onUpdate(state); cb.onPhaseChange?.('zoom-back');
          this.rafId = requestAnimationFrame(tick); return;
        }
        const rawT = Math.min(elapsed / FADE_OUT, 1);
        const t    = easeOutCubic(rawT);
        state.viewport = { centerX: current.centerX, centerY: current.centerY, zoomLevel: lerp(current.zoomLevel, current.zoomLevel * 0.6, t) };
        state.opacity = 1 - t;
        state.backgroundColor = interpolateRgb(fromRgb, toRgb, rawT);
        cb.onUpdate(state);
      } else {
        const fi   = now - fadeInStart;
        const rawT = Math.min(fi / FADE_IN, 1);
        const t    = easeZoomTransition(rawT);
        state.viewport = { centerX: parent.centerX, centerY: parent.centerY, zoomLevel: lerp(parent.zoomLevel * 5, parent.zoomLevel, t) };
        state.opacity = fi < OPACITY_SETTLE ? 0 : easeZoomTransition(Math.min((fi - OPACITY_SETTLE) / (FADE_IN - OPACITY_SETTLE), 1));
        state.backgroundColor = toColor;
        cb.onUpdate(state);
        if (rawT >= 1) { cb.onPhaseChange?.('fade-in'); this.rafId = null; this._complete(cb.onComplete); return; }
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private _complete(onComplete: () => void): void {
    this.timers.forEach(clearTimeout); this.timers = [];
    this._active = false;
    onComplete();
  }
}

export const konvaLayerTransitionAnimator = new KonvaLayerTransitionAnimator();
