// Generated from visualli.ai design-system/components/src/motion.ts — do not edit here.
/* The canvas choreography — how a layer arrives, how you step inside and back out, how an idea answers hover.
   One source for every renderer: VisualMap drives its CSS animations from these values (as CSS variables and
   animation delays), and a canvas renderer (e.g. the spec SDK on Konva) can run the same timeline from its own loop.
   Times in ms, scales as factors, easings as cubic-bezier control points. No dependencies, so it can travel alone.
   The durations and easings equal the motion tokens (duration-*, ease-*, stagger-reveal); the build checks that. */

export type Bezier = readonly [number, number, number, number];

export const EASE = {
  /** ease-standard — UI and connector drawing. */ standard: [0.4, 0, 0.2, 1] as Bezier,
  /** ease-zoom — diving into and out of layers. */ zoom: [0.2, 0.8, 0.2, 1] as Bezier,
  /** ease-bloom — ideas arriving, with a little overshoot. */ bloom: [0.34, 1.4, 0.64, 1] as Bezier,
};

export const MOTION = {
  /** A layer arrives: ideas bloom one by one in sibling order, center first, then connectors draw. */
  reveal: {
    /** duration-reveal: each idea's bloom. */ duration: 420,
    /** stagger-reveal: delay between consecutive ideas. */ stagger: 70,
    /** An idea starts at this scale… */ fromScale: 0.55,
    /** …and this fraction of the way from its place toward the layer's center. */ fromCenter: 0.5,
    ease: EASE.bloom,
    /** Settle time after the last bloom before the map is idle (interactive again). */ tail: 200,
  },
  /** Connectors of an arriving layer: they start once the ideas are mostly in. */
  connector: {
    /** Lead time before the first connector, on top of the ideas' stagger. */ lead: 240,
    /** Delay between consecutive connectors. */ stagger: 60,
    /** A solid connector draws from source to target; a dashed one fades in instead. */ draw: 500,
    /** The connector group's fade (duration-base). */ fade: 240,
    ease: EASE.standard,
  },
  /** Step inside: the current layer zooms toward the idea and fades; the inner layer then arrives (reveal). */
  dive: {
    /** The old layer's zoom, toward the idea's position. */ scale: 3.2,
    /** duration-zoom. */ duration: 500,
    /** It fades out after this delay, over `fade`. */ fadeDelay: 150, fade: 160,
    /** The layers swap (and the reveal starts) this long after the dive starts. */ swapAfter: 320,
    ease: EASE.zoom,
  },
  /** Back out (depth trail): the current layer shrinks toward the center and fades; the outer layer arrives. */
  surface: {
    scale: 0.6, duration: 220, fade: 200,
    swapAfter: 220,
    ease: EASE.zoom,
  },
  /** The arriving layer as a whole settles from slightly small. */
  settle: { fromScale: 0.94, duration: 260, ease: EASE.standard },
  /** Hover (pointer) or select: the idea lifts; its rings turn and grow a touch — a nudge, not a wobble. */
  hover: {
    lift: 2, ringRotate: -2, ringScale: 1.015,
    /** duration-base, for both the lift (ease-bloom) and the rings (ease-standard). */ duration: 240,
    liftEase: EASE.bloom, ringEase: EASE.standard,
  },
  /** Reduced motion, or Gradual reveal off: everything appears together with a short fade; dives become cross-fades. */
  reduced: { fade: 120 },
} as const;

export type Point = { x: number; y: number };

/** Delay before idea `i` (sibling order) starts to bloom. */
export function revealDelay(i: number): number { return i * MOTION.reveal.stagger; }

/** Delay before connector `i` starts, in a layer of `nodeCount` ideas. */
export function connectorDelay(i: number, nodeCount: number): number {
  return MOTION.connector.lead + nodeCount * MOTION.reveal.stagger + i * MOTION.connector.stagger;
}

/** How long a layer's arrival takes, until the map is idle again. 0 with reduced motion. */
export function revealTotal(nodeCount: number, reduced = false): number {
  return reduced ? 0 : MOTION.reveal.duration + nodeCount * MOTION.reveal.stagger + MOTION.reveal.tail;
}

/** Where an idea starts its bloom, as an offset from its final position: part of the way toward the layer's center. */
export function bloomOffset(node: Point, center: Point): Point {
  const k = MOTION.reveal.fromCenter;
  return { x: (center.x - node.x) * k, y: (center.y - node.y) * k };
}

/** When the layers swap after Step inside ('in') or Back out ('out'). 0 with reduced motion (a cross-fade). */
export function swapDelay(dir: 'in' | 'out', reduced = false): number {
  return reduced ? 0 : dir === 'in' ? MOTION.dive.swapAfter : MOTION.surface.swapAfter;
}

/** CSS form of an easing. */
export function cssEase(e: Bezier): string { return `cubic-bezier(${e.join(', ')})`; }

/** Evaluate an easing at progress t (0–1), for renderers that animate in their own loop. */
export function ease(e: Bezier, t: number): number {
  const [x1, y1, x2, y2] = e;
  if (t <= 0) return 0; if (t >= 1) return 1;
  const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
  const by = (u: number) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  let lo = 0, hi = 1, u = t;
  for (let k = 0; k < 24; k++) { u = (lo + hi) / 2; if (bx(u) < t) lo = u; else hi = u; }
  return by(u);
}

/** The CSS variables VisualMap sets on its root, so its stylesheet animates with exactly these values. */
export function motionVars(): Record<string, string> {
  const m = MOTION;
  return {
    '--vi-bloom-from': String(m.reveal.fromScale),
    '--vi-line-draw': `${m.connector.draw}ms`,
    '--vi-dive-scale': String(m.dive.scale), '--vi-dive-fade': `${m.dive.fade}ms`, '--vi-dive-fade-delay': `${m.dive.fadeDelay}ms`,
    '--vi-surface-scale': String(m.surface.scale), '--vi-surface-dur': `${m.surface.duration}ms`, '--vi-surface-fade': `${m.surface.fade}ms`,
    '--vi-settle-from': String(m.settle.fromScale), '--vi-settle-dur': `${m.settle.duration}ms`,
    '--vi-reduced-fade': `${m.reduced.fade}ms`,
    '--vi-lift': `${m.hover.lift}px`, '--vi-ring-turn': `${m.hover.ringRotate}deg`, '--vi-ring-grow': String(m.hover.ringScale),
  };
}
