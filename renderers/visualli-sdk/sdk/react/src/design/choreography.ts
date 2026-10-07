// ─── Choreography ────────────────────────────────────────────────────────────
//
// Runs the design system's motion timeline (core's MOTION / revealDelay /
// connectorDelay / bloomOffset / easeBezier, copied verbatim from
// design-system/geometry/motion.ts) on the canvas: the same arrival, hover and
// reduced-motion behaviour VisualMap gets from its CSS animations.
//
// No React and no Konva in here; the layers ask "what does idea / connector i
// look like right now?" while they paint, and redraw each frame while a
// timeline is running.

import { MOTION, easeBezier, revealDelay, connectorDelay, revealTotal, bloomOffset, type FlatNode } from '@visualli/core';

/**
 * Layers with more ideas than this arrive on a compressed stagger: the design
 * system staggers one idea per `reveal.stagger`, which is right for a layer of a
 * dozen ideas and would take minutes for a layer of thousands. Ideas past the
 * cap share slots, so a layer never takes longer to arrive than this many ideas would.
 * Pending upstream: this is an SDK performance adaptation, not yet a design-system rule; it belongs
 * in the design system's geometry/motion.ts (a large-layer rule) so every renderer behaves alike.
 */
export const REVEAL_STAGGER_CAP = 30;

/**
 * Layers with more ideas than this fade in together instead of blooming: every frame of the
 * bloom repaints the whole layer, which is fine for the dozen ideas the design system's
 * choreography is written for and too heavy for a layer of hundreds.
 * Pending upstream: this is an SDK performance adaptation, not yet a design-system rule; it belongs
 * in the design system's geometry/motion.ts (a large-layer rule) so every renderer behaves alike.
 */
export const REVEAL_MAX_NODES = 150;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** How an idea looks mid-arrival (multiplies its resting look). */
export interface Arrival { alpha: number; scale: number; dx: number; dy: number }
/** How a connector looks mid-arrival: `draw` is the fraction of the line drawn, `alpha` its group's fade. */
export interface EdgeArrival { alpha: number; draw: number }

/** The timeline of one layer's arrival. Shared by the idea layer and the connector layer. */
export class RevealClock {
  private t0 = -Infinity;
  private end = 0;
  private count = 0;
  private slots = 0;
  private edges = 0;
  private edgeSlots = 0;
  private reduced = false;
  private center = { x: 0, y: 0 };
  private order = new Map<string, number>();
  private listeners = new Set<(running: boolean) => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Begin a layer's arrival. `reduced` (reduced motion or instant reveal): everything fades in together. */
  start(nodes: ReadonlyArray<FlatNode>, edgeCount: number, reduced: boolean, now = performance.now()): void {
    this.order.clear();
    nodes.forEach((n, i) => this.order.set(n.id, i));
    this.count = nodes.length;
    this.slots = Math.min(this.count, REVEAL_STAGGER_CAP);
    this.edges = edgeCount;
    this.edgeSlots = Math.min(edgeCount, REVEAL_STAGGER_CAP);
    this.reduced = reduced || nodes.length > REVEAL_MAX_NODES;
    reduced = this.reduced;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); }
    this.center = nodes.length ? { x: (minX + maxX) / 2, y: (minY + maxY) / 2 } : { x: 0, y: 0 };
    this.t0 = now;
    this.end = reduced
      ? MOTION.reduced.fade
      : Math.max(
          revealTotal(this.slots),
          this.edgeSlots ? connectorDelay(this.edgeSlots - 1, this.slots) + MOTION.connector.draw : 0,
        );
    this.emit(true);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; this.emit(false); }, this.end + 50);
  }

  /** Jump to the finished state (e.g. on unmount). */
  stop(): void {
    this.t0 = -Infinity;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.emit(false);
  }

  /** True while the layer is still arriving. */
  active(now = performance.now()): boolean { return now - this.t0 < this.end; }

  /** Called with true when an arrival starts and false when it has finished. Returns the unsubscribe function. */
  subscribe(fn: (running: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(running: boolean) { this.listeners.forEach((fn) => fn(running)); }

  private slot(i: number): number {
    return this.count > this.slots ? Math.floor((i * this.slots) / this.count) : i;
  }

  /** Fills `out` with idea `id`'s arrival look. Returns false when it has arrived (nothing to apply). */
  node(id: string, x: number, y: number, now: number, out: Arrival): boolean {
    const el = now - this.t0;
    if (el >= this.end) return false;
    const i = this.order.get(id);
    if (i === undefined) return false;
    if (this.reduced) {
      out.alpha = clamp01(el / MOTION.reduced.fade); out.scale = 1; out.dx = 0; out.dy = 0;
      return true;
    }
    const r = MOTION.reveal;
    const t = el - revealDelay(this.slot(i));
    if (t >= r.duration) return false;
    const e = t <= 0 ? 0 : easeBezier(r.ease, t / r.duration); // `backwards` fill: waiting ideas sit at the first keyframe
    const from = bloomOffset({ x, y }, this.center);
    out.alpha = clamp01(e);
    out.scale = r.fromScale + (1 - r.fromScale) * e;
    out.dx = from.x * (1 - e);
    out.dy = from.y * (1 - e);
    return true;
  }

  /** Fills `out` with connector `i`'s arrival look. Returns false when it has arrived. */
  edge(i: number, dashed: boolean, now: number, out: EdgeArrival): boolean {
    const el = now - this.t0;
    if (el >= this.end) return false;
    if (this.reduced) { out.alpha = clamp01(el / MOTION.reduced.fade); out.draw = 1; return true; }
    const c = MOTION.connector;
    const t = el - connectorDelay(this.edges > this.edgeSlots ? Math.floor((i * this.edgeSlots) / this.edges) : i, this.slots);
    if (t >= c.draw && t >= c.fade) return false;
    const group = t <= 0 ? 0 : easeBezier(c.ease, clamp01(t / c.fade));
    const line = t <= 0 ? 0 : easeBezier(c.ease, clamp01(t / c.draw));
    // A solid connector draws from source to target; a dashed one fades in instead.
    out.alpha = dashed ? group * line : group;
    out.draw = dashed ? 1 : line;
    return true;
  }
}

// ── Hover ─────────────────────────────────────────────────────────────────────

interface HoverTween { fromLift: number; fromRing: number; to: number; t0: number }

/**
 * Hover / select / press: an idea lifts (ease-bloom, so it settles with a little
 * overshoot) while its rings turn and grow (ease-standard), both over
 * `MOTION.hover.duration`. Tracks each raised idea's progress so reversing
 * mid-way continues from where it was.
 */
export class HoverTweens {
  private tweens = new Map<string, HoverTween>();
  private raised = new Set<string>();

  /** Set which ideas are raised now. Returns true when anything started moving. */
  set(next: ReadonlySet<string>, reduced: boolean, now = performance.now()): boolean {
    let changed = false;
    const ids = new Set<string>([...this.raised, ...next]);
    for (const id of ids) {
      const was = this.raised.has(id), is = next.has(id);
      if (was === is) continue;
      const cur = this.progress(id, now);
      this.tweens.set(id, { fromLift: cur.lift, fromRing: cur.ring, to: is ? 1 : 0, t0: reduced ? -Infinity : now });
      changed = true;
    }
    this.raised = new Set(next);
    return changed;
  }

  private cache = { lift: 0, ring: 0 };
  /** Lift (bloom ease) and ring (standard ease) progress of an idea, 0 at rest and 1 fully raised. */
  progress(id: string, now: number): { lift: number; ring: number } {
    const tw = this.tweens.get(id);
    const out = this.cache;
    if (!tw) { out.lift = out.ring = this.raised.has(id) ? 1 : 0; return out; }
    const u = clamp01((now - tw.t0) / MOTION.hover.duration);
    out.lift = tw.fromLift + (tw.to - tw.fromLift) * easeBezier(MOTION.hover.liftEase, u);
    out.ring = tw.fromRing + (tw.to - tw.fromRing) * easeBezier(MOTION.hover.ringEase, u);
    if (u >= 1) { this.tweens.delete(id); out.lift = out.ring = tw.to; }
    return out;
  }

  /** True while any idea is still moving. */
  active(now = performance.now()): boolean {
    for (const tw of this.tweens.values()) if (now - tw.t0 < MOTION.hover.duration) return true;
    return false;
  }

  has(id: string): boolean { return this.tweens.has(id) || this.raised.has(id); }
}
