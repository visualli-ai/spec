// ─── Node & connector geometry ───────────────────────────────────────────────
//
// Thin layer over the design system's geometry (generated/geometry/blob.ts):
// it chooses the radii, shapes, rings and endpoints for a FlatNode and never
// re-implements outline or curve math. Pure functions, no DOM.

import { BLOB_SHAPES, RINGS, arrowPath, blobPath, blobRadius, edgePath, shapeForLevel } from '../generated/geometry/blob.js';
import { METRICS } from '../generated/designSystem.js';
import type { FlatNode } from '../types/mindmap.js';

// The design system's geometry is part of the public API (single source of truth).
export { BLOB_SHAPES, RINGS, arrowPath, blobPath, blobRadius, edgePath, shapeForLevel };
export { drawBlob } from '../generated/geometry/blob.js';

/** Minimum a node needs to be drawn / connected. */
export type NodeLike = Pick<FlatNode, 'x' | 'y' | 'width' | 'height' | 'level' | 'branchCount'>;

export const MAX_RINGS = RINGS.length;
const DEG = Math.PI / 180;

/** Outline radii of an idea: half its size (sized for its label by the design system's idea.ts). */
export function nodeRadii(n: Pick<FlatNode, 'width' | 'height'>): { rx: number; ry: number } {
  return { rx: n.width / 2, ry: n.height / 2 };
}

/** Rings an idea shows: one per layer beneath it, at most 3. */
export const ringCount = (branchCount: number | undefined): number => Math.max(0, Math.min(branchCount ?? 0, MAX_RINGS));

/** The design system's ring recipes an idea shows, innermost first (index 0 = scale 1.1). */
export const ringsFor = (branchCount: number | undefined): typeof RINGS => RINGS.slice(0, ringCount(branchCount));

const shapeCache = new Map<number, number>();
/** Outline shape for a layer level (memoised: shapeForLevel is O(level)). */
export function shapeOfLevel(level: number): number {
  let s = shapeCache.get(level);
  if (s === undefined) { s = shapeForLevel(level); shapeCache.set(level, s); }
  return s;
}

/** Largest distance from a blob's centre to any control point, in units of max(rx, ry). */
const BLOB_MAX_NORM = Math.max(...BLOB_SHAPES.flatMap((s) => s.map(([x, y]) => Math.hypot(x!, y!))));

/** Visual margin around an idea beyond its outline: stroke, hover lift and the node shadow. */
const VISUAL_MARGIN = METRICS.nodeStroke * 2 + 24;

/**
 * Conservative world-space bounds of everything drawn for an idea (rings and
 * stroke included). Ideas are drawn CENTRED on (x, y), so bounds are centred
 * too. A circle bound is used so ring rotation can never push ink outside it.
 */
export function nodeBounds(n: NodeLike): { minX: number; minY: number; maxX: number; maxY: number } {
  const { rx, ry } = nodeRadii(n);
  const rings = ringCount(n.branchCount);
  const scale = rings > 0 ? RINGS[rings - 1]!.scale : 1;
  const r = BLOB_MAX_NORM * Math.max(rx, ry) * scale + VISUAL_MARGIN;
  return { minX: n.x - r, minY: n.y - r, maxX: n.x + r, maxY: n.y + r };
}

/**
 * Distance from an idea's centre to the outline connectors must clear, in the
 * world direction `angle` (radians, y down). That is the outermost visible
 * ring (rotated like the ring is drawn), or the body when there are no rings.
 */
export function outlineRadius(n: NodeLike, angle: number): number {
  const { rx, ry } = nodeRadii(n);
  const shape = shapeOfLevel(n.level);
  const rings = ringCount(n.branchCount);
  if (rings === 0) return blobRadius(shape, rx, ry, angle);
  const ring = RINGS[rings - 1]!;
  // The ring is the same blob scaled and rotated about the centre, so look up
  // the radius in the ring's own frame.
  return blobRadius(shape, rx * ring.scale, ry * ring.scale, angle - ring.rotate * DEG);
}

export interface ConnectorGeometry {
  /** Start / end points: `edge-gap` outside the source / target outline. */
  a: { x: number; y: number };
  b: { x: number; y: number };
  /** Cubic path data (SVG syntax) and the arrowhead direction, from the design system's edgePath. */
  d: string;
  angle: number;
  /** Bow apex returned by edgePath, where the connector label sits. */
  mid: { x: number; y: number };
  /** Open arrowhead path data at b, from the design system's arrowPath. */
  arrow: string;
}

/** Endpoints and curve of a connector between two ideas. */
export function connectorGeometry(from: NodeLike, to: NodeLike, gap: number = METRICS.edgeGap): ConnectorGeometry {
  const theta = Math.atan2(to.y - from.y, to.x - from.x);
  const ra = outlineRadius(from, theta) + gap;
  const rb = outlineRadius(to, theta + Math.PI) + gap;
  const a = { x: from.x + Math.cos(theta) * ra, y: from.y + Math.sin(theta) * ra };
  const b = { x: to.x - Math.cos(theta) * rb, y: to.y - Math.sin(theta) * rb };
  const e = edgePath(a, b);
  return { a, b, d: e.d, angle: e.angle, mid: e.mid, arrow: arrowPath(b, e.angle) };
}
