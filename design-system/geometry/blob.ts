// Generated from visualli.ai design-system/components/src/blob.ts — do not edit here.
import { BLOB_SHAPES } from './blobShapes';
export { BLOB_SHAPES };

/** Shape for a layer level: level 0 is always shape 0; consecutive levels never repeat (same rule as the renderer). */
export function shapeForLevel(level: number): number {
  const n = BLOB_SHAPES.length;
  let cur = 0;
  for (let i = 1; i <= level; i++) {
    const r = Math.floor(Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453));
    cur = (cur + (r % (n - 1)) + 1) % n;
  }
  return cur;
}

/** SVG path of a node outline centered on (cx, cy): midpoint-quadratic smoothing through the authored points. */
export function blobPath(shape: number, rx: number, ry: number, cx = 0, cy = 0): string {
  const pts = BLOB_SHAPES[((shape % BLOB_SHAPES.length) + BLOB_SHAPES.length) % BLOB_SHAPES.length].map(([x, y]) => [cx + x * rx, cy + y * ry]);
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (n: number) => n.toFixed(2);
  const start = mid(pts[pts.length - 1], pts[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % pts.length]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return d + 'Z';
}

/** The path calls drawBlob makes: satisfied by a CanvasRenderingContext2D and by Konva's Context (sceneFunc / hitFunc). */
export type PathContext = { beginPath(): void; moveTo(x: number, y: number): void; quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void; closePath(): void };

/** Canvas twin of blobPath — call fill()/stroke() after (in Konva: ctx.fillStrokeShape(shape)). */
export function drawBlob(ctx: PathContext, shape: number, rx: number, ry: number, cx = 0, cy = 0) {
  const pts = BLOB_SHAPES[((shape % BLOB_SHAPES.length) + BLOB_SHAPES.length) % BLOB_SHAPES.length].map(([x, y]) => [cx + x * rx, cy + y * ry]);
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = mid(pts[pts.length - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(s[0], s[1]);
  pts.forEach((p, i) => { const m = mid(p, pts[(i + 1) % pts.length]); ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]); });
  ctx.closePath();
}

/** Distance from the center to the smoothed outline (blobPath) in direction `angle` (radians, SVG y-down).
 *  Connectors use it to start and end just outside the outline an idea actually has, not a stand-in ellipse. */
export function blobRadius(shape: number, rx: number, ry: number, angle: number): number {
  const pts = BLOB_SHAPES[((shape % BLOB_SHAPES.length) + BLOB_SHAPES.length) % BLOB_SHAPES.length].map(([x, y]) => [x * rx, y * ry]);
  const mid = (a: number[], b: number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // Sample the midpoint-quadratic curve into a polygon, then cast a ray from the center.
  const poly: number[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const p0 = mid(pts[(i - 1 + pts.length) % pts.length], pts[i]), c = pts[i], p1 = mid(pts[i], pts[(i + 1) % pts.length]);
    for (let k = 0; k < 8; k++) { const t = k / 8, u = 1 - t; poly.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]); }
  }
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length], ex = bx - ax, ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const r = (ax * ey - ay * ex) / den, q = (ax * dy - ay * dx) / den;
    if (r > 0 && q >= 0 && q <= 1) best = Math.max(best, r);
  }
  return best || Math.max(rx, ry);
}

/** Ring recipe: index 0 is the innermost ring. A node shows min(childLayers, 3) rings. */
export const RINGS = [
  { scale: 1.1, opacity: 0.5, rotate: -5, width: 2, dash: '' },
  { scale: 1.2, opacity: 0.4, rotate: -10, width: 1, dash: '' },
  { scale: 1.3, opacity: 0.3, rotate: -15, width: 3, dash: '6 4' },
];

/** Connector geometry: a cubic that bows perpendicular to the chord, flatter as distance grows. */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }, bow = 1) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  const arc = Math.min(45, 45 / (1 + Math.max(0, (d - 200) / 400))) * bow;
  const nx = -dy / d, ny = dx / d;
  const mx = (a.x + b.x) / 2 + nx * arc, my = (a.y + b.y) / 2 + ny * arc;
  const c1 = { x: a.x + (mx - a.x) * 0.66 + 0, y: a.y + (my - a.y) * 0.66 };
  const c2 = { x: b.x + (mx - b.x) * 0.66, y: b.y + (my - b.y) * 0.66 };
  const ang = Math.atan2(b.y - c2.y, b.x - c2.x);
  return { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, angle: ang, mid: { x: mx, y: my } };
}

/** Open V arrowhead at point p, pointing along angle. */
export function arrowPath(p: { x: number; y: number }, angle: number, len = 11) {
  const s = Math.PI / 5.5;
  const a1 = { x: p.x - len * Math.cos(angle - s), y: p.y - len * Math.sin(angle - s) };
  const a2 = { x: p.x - len * Math.cos(angle + s), y: p.y - len * Math.sin(angle + s) };
  return `M${a1.x.toFixed(1)} ${a1.y.toFixed(1)}L${p.x.toFixed(1)} ${p.y.toFixed(1)}L${a2.x.toFixed(1)} ${a2.y.toFixed(1)}`;
}
