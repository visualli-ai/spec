// Generated from visualli.ai design-system/components/src/container.ts — do not edit here.
/* Containers: the dashed hull around a group of ideas, and where its name goes.
   The name is a pill straddling the hull's boundary. Which point of the boundary depends on what's inside and around
   the container: the spot is chosen by scoring candidates along all four edges against the ideas, the connectors and
   the names already placed — deterministic, so every renderer (VisualMap, the spec SDK on a canvas, PDF export) puts
   it in the same place for the same file. Pure functions, no dependencies. World units (the map's coordinates). */

export type Pt = { x: number; y: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };
export type Hull = Box & { radius: number };
export type LabelSide = 'bottom' | 'top' | 'left' | 'right';
export type LabelPlacement = { x: number; y: number; side: LabelSide; score: number };

/** The hull reaches this far beyond its ideas' centers, and rounds its corners this much. */
export const HULL = { padX: 150, padY: 125, radius: 48 };
/** Penalties: an idea or another name under the pill is never fine; a connector through it is bad; order breaks ties. */
const WEIGHT = { idea: 1000, label: 1000, connector: 60, preference: 1 };

/** The hull around a group's idea centers. */
export function containerHull(centers: Pt[]): Hull | null {
  if (!centers.length) return null;
  const xs = centers.map((p) => p.x), ys = centers.map((p) => p.y);
  return { x0: Math.min(...xs) - HULL.padX, x1: Math.max(...xs) + HULL.padX, y0: Math.min(...ys) - HULL.padY, y1: Math.max(...ys) + HULL.padY, radius: HULL.radius };
}

/** Candidate spots for a w × h pill, in preference order: bottom center (the default look), top center, the thirds of
 *  bottom and top, then the sides. Spots keep the whole pill on the straight part of an edge, clear of the corners. */
export function labelCandidates(hull: Hull, w: number, h: number): { x: number; y: number; side: LabelSide }[] {
  const { x0, x1, y0, y1, radius } = hull;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const minX = x0 + radius + w / 2, maxX = x1 - radius - w / 2; // horizontal room on top / bottom
  const minY = y0 + radius + h / 2, maxY = y1 - radius - h / 2; // vertical room on the sides
  const along = (lo: number, hi: number, f: number) => (lo > hi ? (lo + hi) / 2 : lo + (hi - lo) * f);
  const out: { x: number; y: number; side: LabelSide }[] = [
    { x: cx, y: y1, side: 'bottom' }, { x: cx, y: y0, side: 'top' },
    { x: along(minX, maxX, 0.2), y: y1, side: 'bottom' }, { x: along(minX, maxX, 0.8), y: y1, side: 'bottom' },
    { x: along(minX, maxX, 0.2), y: y0, side: 'top' }, { x: along(minX, maxX, 0.8), y: y0, side: 'top' },
    { x: x1, y: cy, side: 'right' }, { x: x0, y: cy, side: 'left' },
    { x: x1, y: along(minY, maxY, 0.25), side: 'right' }, { x: x1, y: along(minY, maxY, 0.75), side: 'right' },
    { x: x0, y: along(minY, maxY, 0.25), side: 'left' }, { x: x0, y: along(minY, maxY, 0.75), side: 'left' },
  ];
  // The extremes of the top / bottom edges, for wide labels on narrow hulls.
  out.push({ x: along(minX, maxX, 0), y: y1, side: 'bottom' }, { x: along(minX, maxX, 1), y: y1, side: 'bottom' },
    { x: along(minX, maxX, 0), y: y0, side: 'top' }, { x: along(minX, maxX, 1), y: y0, side: 'top' });
  return out;
}

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Where a container's name goes. `ideas`: the boxes of every idea on the layer (outermost ring included);
 *  `connectors`: points sampled along every connector; `labels`: the pills already placed on this layer.
 *  `gap` keeps a little air between the pill and what it avoids. */
export function placeContainerLabel(hull: Hull, size: { w: number; h: number }, obstacles: { ideas: Box[]; connectors?: Pt[][]; labels?: Box[] }, gap = 10): LabelPlacement {
  const { w, h } = size;
  let best: LabelPlacement | null = null;
  labelCandidates(hull, w, h).forEach((c, i) => {
    const box = { x0: c.x - w / 2 - gap, x1: c.x + w / 2 + gap, y0: c.y - h / 2 - gap, y1: c.y + h / 2 + gap };
    const area = w * h;
    let score = i * WEIGHT.preference;
    for (const b of obstacles.ideas) score += (overlap(box, b) / area) * WEIGHT.idea;
    for (const b of obstacles.labels || []) score += (overlap(box, b) / area) * WEIGHT.label;
    for (const line of obstacles.connectors || []) if (line.some((p) => p.x > box.x0 && p.x < box.x1 && p.y > box.y0 && p.y < box.y1)) score += WEIGHT.connector;
    if (!best || score < best.score) best = { x: c.x, y: c.y, side: c.side, score };
  });
  return best!;
}

/** Points along a connector, for `connectors`: the same cubic edgePath draws (control points two-thirds of the way
 *  from each end to the bowed midpoint `mid`, which edgePath returns). */
export function connectorSamples(a: Pt, mid: Pt, b: Pt, n = 16): Pt[] {
  const c1 = { x: a.x + (mid.x - a.x) * 0.66, y: a.y + (mid.y - a.y) * 0.66 }, c2 = { x: b.x + (mid.x - b.x) * 0.66, y: b.y + (mid.y - b.y) * 0.66 };
  return Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n, u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y };
  });
}
