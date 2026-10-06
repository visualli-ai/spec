// ─── Canvas drawing ──────────────────────────────────────────────────────────
//
// Draws ideas, connectors and group frames onto a native 2D context using the
// design system's geometry and tokens. Konva owns the stage, layers, viewport
// and layer transitions; these functions only paint.
//
// Performance notes:
//  - Outlines are cached as Path2D per (shape, rx, ry): built once, reused every frame.
//  - Label line breaks are cached per (font epoch, font, width, text).
//  - No allocations on the per-idea hot path except the label array on a cache miss.

import {
  CANVAS_STYLE,
  EDGE_LABEL_BASE_FONT_PX,
  RINGS,
  TYPE_STYLES,
  NODE_LABEL_PADDING_X,
  blobPath,
  computeEdgeLabelScale,
  computeNodeTextWorldScale,
  labelFontSize,
  nodeRadii,
  ringsFor,
  shapeOfLevel,
  topicForColor,
  topicStyle,
  type ConnectorGeometry,
  type FlatNode,
} from '@visualli/core';
import type { Design } from './design';
import { fontsEpoch } from './runtime';

const DEG = Math.PI / 180;

// ── Path2D cache ──────────────────────────────────────────────────────────────

const MAX_CACHED_PATHS = 4096;
const pathCache = new Map<string, Path2D>();

/** Outline of a blob centred on the origin, as a cached Path2D (SVG path data from the design system). */
export function blobPath2D(shape: number, rx: number, ry: number): Path2D {
  const key = `${shape}|${rx}|${ry}`;
  let p = pathCache.get(key);
  if (!p) {
    if (pathCache.size >= MAX_CACHED_PATHS) pathCache.delete(pathCache.keys().next().value as string);
    p = new Path2D(blobPath(shape, rx, ry));
    pathCache.set(key, p);
  }
  return p;
}

/** Test hook. */
export const _pathCacheSize = (): number => pathCache.size;

const dashCache = new Map<string, number[]>();
function dashOf(spec: string): number[] {
  if (!spec) return [];
  let d = dashCache.get(spec);
  if (!d) { d = spec.split(/\s+/).map(Number); dashCache.set(spec, d); }
  return d;
}

// ── Label layout ──────────────────────────────────────────────────────────────

const lineCache = new Map<string, string[]>();
const MAX_CACHED_LAYOUTS = 8192;

/** Greedy word wrap at `maxWidth` (natural px), clamped to `maxLines` with an ellipsis. */
export function layoutLabel(c: CanvasRenderingContext2D, text: string, font: string, maxWidth: number, maxLines: number): string[] {
  const key = `${fontsEpoch()}|${font}|${maxWidth}|${text}`;
  const hit = lineCache.get(key);
  if (hit) return hit;
  c.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const fit = (s: string) => c.measureText(s).width <= maxWidth;
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (fit(next)) { cur = next; continue; }
    if (cur) lines.push(cur);
    // A single word wider than the box is broken by characters.
    let rest = w;
    while (!fit(rest) && rest.length > 1) {
      let n = rest.length - 1;
      while (n > 1 && !fit(rest.slice(0, n))) n--;
      lines.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    cur = rest;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1]! + '…';
    while (last.length > 1 && !fit(last)) last = last.slice(0, -2) + '…';
    lines[maxLines - 1] = last;
  }
  if (lineCache.size >= MAX_CACHED_LAYOUTS) lineCache.clear();
  lineCache.set(key, lines);
  return lines;
}

// ── Ideas ─────────────────────────────────────────────────────────────────────

export interface IdeaState {
  hovered: boolean;
  pressed: boolean;
  selected: boolean;
  /** Keyboard focus (the accessible layer is focused on this idea). */
  focused: boolean;
  dimmed: boolean;
}
export const IDLE: IdeaState = { hovered: false, pressed: false, selected: false, focused: false, dimmed: false };

export interface IdeaOptions {
  /** Drop shadows are skipped for big maps / while dragging. */
  shadows: boolean;
  /** Labels are hidden when zoomed far out. */
  labels: boolean;
  /** Device pixels per world unit (canvas shadows are in device space). Computed once per frame by the caller; derived from the transform when omitted. */
  k?: number;
}

/**
 * Level of detail, by on-screen width of the idea. Far-out views of huge maps
 * show ideas as specks: below LOD_TINY_PX a filled box is drawn, below
 * LOD_DETAIL_PX only the body (no rings, shadow or label). Both are invisible
 * differences at those sizes and keep 10k-idea maps interactive.
 */
export const LOD_TINY_PX = 6;
export const LOD_DETAIL_PX = 24;

/** The topic an idea is drawn with. */
export const topicOf = (n: Pick<FlatNode, 'topic' | 'color' | 'id'>) => n.topic ?? topicForColor(n.color, n.id);

/** Paint one idea (rings, body, label) centred on node.x / node.y. */
export function drawIdea(c: CanvasRenderingContext2D, node: FlatNode, d: Design, zoom: number, st: IdeaState, opt: IdeaOptions): void {
  const { rx, ry } = nodeRadii(node.width);
  const { fill, ring } = topicStyle(d.theme, topicOf(node));
  const screenW = node.width * zoom;

  // Specks: one filled box, no save/restore.
  if (screenW < LOD_TINY_PX && !st.selected && !st.focused && !st.hovered) {
    if (st.dimmed) c.globalAlpha = CANVAS_STYLE.node.dimmedOpacityFocus;
    c.fillStyle = fill;
    c.fillRect(node.x - rx, node.y - ry, rx * 2, ry * 2);
    if (st.dimmed) c.globalAlpha = 1;
    return;
  }

  const detailed = screenW >= LOD_DETAIL_PX || st.selected || st.focused || st.hovered;
  const shape = shapeOfLevel(node.level);
  const rings = detailed ? ringsFor(node.branchCount) : ringsFor(0);
  const raised = st.hovered || st.pressed || st.selected;
  let k = opt.k;
  if (k === undefined) { const m = c.getTransform(); k = Math.hypot(m.a, m.b); } // device px per world unit

  c.save();
  if (st.dimmed) c.globalAlpha = CANVAS_STYLE.node.dimmedOpacityFocus;
  c.translate(node.x, node.y + (raised ? CANVAS_STYLE.node.hoverLift : 0));
  c.lineJoin = 'round';

  // Rings, outermost first so the inner ones sit on top.
  const baseAlpha = c.globalAlpha;
  const ringSpin = raised ? CANVAS_STYLE.node.hoverRingsRotate : 0;
  const ringGrow = raised ? CANVAS_STYLE.node.hoverRingsScale : 1;
  c.fillStyle = fill;
  c.strokeStyle = ring;
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]!;
    c.save();
    c.rotate((r.rotate + ringSpin) * DEG);
    c.globalAlpha = baseAlpha * r.opacity;
    const path = blobPath2D(shape, rx * r.scale * ringGrow, ry * r.scale * ringGrow);
    c.fill(path);
    c.lineWidth = r.width;
    c.setLineDash(dashOf(r.dash));
    c.stroke(path);
    c.restore();
  }
  c.setLineDash([]);

  // Body.
  const body = blobPath2D(shape, rx, ry);
  if (detailed && opt.shadows && d.nodeShadow) {
    c.shadowColor = d.nodeShadow.color;
    c.shadowBlur = d.nodeShadow.blur * k;
    c.shadowOffsetX = d.nodeShadow.x * k;
    c.shadowOffsetY = d.nodeShadow.y * k;
  }
  c.fill(body);
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetX = 0;
  c.shadowOffsetY = 0;
  c.strokeStyle = st.focused ? d.tokens['focus']! : st.selected ? d.tokens['ink']! : ring;
  c.lineWidth = st.selected || st.focused ? CANVAS_STYLE.node.selectedStrokeWidth : d.metrics.nodeStroke;
  c.stroke(body);

  // Label.
  if (detailed && opt.labels && node.title) {
    const px = labelFontSize(node.level) * d.labelScale;
    const font = `${TYPE_STYLES['node-label'].weight} ${px}px ${d.fontHand}`;
    const lines = layoutLabel(c, node.title, font, node.width - NODE_LABEL_PADDING_X, CANVAS_STYLE.node.labelMaxLines);
    const s = computeNodeTextWorldScale(node.width, zoom, px);
    const lh = px * CANVAS_STYLE.node.labelLineHeight;
    c.scale(s, s);
    c.font = font;
    c.fillStyle = d.tokens['node-ink']!;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (d.comfort.readableType && 'letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${(px * 0.02).toFixed(2)}px`;
    const y0 = -((lines.length - 1) * lh) / 2;
    for (let i = 0; i < lines.length; i++) c.fillText(lines[i]!, 0, y0 + i * lh);
  }
  c.restore();
}

// ── Connectors ────────────────────────────────────────────────────────────────

export interface PreparedConnector extends ConnectorGeometry {
  path: Path2D;
  arrowPath: Path2D;
}

export function prepareConnector(g: ConnectorGeometry): PreparedConnector {
  return { ...g, path: new Path2D(g.d), arrowPath: new Path2D(g.arrow) };
}

export function drawConnector(c: CanvasRenderingContext2D, g: PreparedConnector, d: Design, zoom: number, dashed: boolean, label: string | undefined): void {
  c.save();
  c.strokeStyle = d.tokens['edge']!;
  c.lineWidth = d.metrics.edgeWidth;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (dashed) c.setLineDash([...CANVAS_STYLE.edge.dash]);
  c.stroke(g.path);
  c.setLineDash([]);
  c.stroke(g.arrowPath);

  if (label) {
    // Constant on-screen size, like the spec's `--vi-inv`; the readable face is smaller and bolder.
    const px = computeEdgeLabelScale(zoom) * (d.edgeLabel.size / EDGE_LABEL_BASE_FONT_PX);
    c.font = `${d.edgeLabel.weight} ${px}px ${d.fontNote}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // paint-order: stroke — a halo in the canvas colour keeps the label legible over the line.
    c.lineWidth = CANVAS_STYLE.edge.labelHaloWidth;
    c.strokeStyle = d.tokens['canvas']!;
    c.strokeText(label, g.mid.x, g.mid.y);
    c.fillStyle = d.tokens['edge-label']!;
    c.fillText(label, g.mid.x, g.mid.y);
  }
  c.restore();
}

// ── Group frames ──────────────────────────────────────────────────────────────

export interface GroupRect { x: number; y: number; w: number; h: number }

/** Frame around a group of ideas: the outermost ring of each member plus padding. */
export function groupRect(nodes: ReadonlyArray<FlatNode>, padding: number): GroupRect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const { rx, ry } = nodeRadii(n.width);
    const rs = ringsFor(n.branchCount);
    const s = rs.length ? RINGS[rs.length - 1]!.scale : 1;
    minX = Math.min(minX, n.x - rx * s); maxX = Math.max(maxX, n.x + rx * s);
    minY = Math.min(minY, n.y - ry * s); maxY = Math.max(maxY, n.y + ry * s);
  }
  return { x: minX - padding, y: minY - padding, w: maxX - minX + padding * 2, h: maxY - minY + padding * 2 };
}

export function drawGroup(c: CanvasRenderingContext2D, r: GroupRect, label: string | undefined, d: Design, zoom: number): void {
  c.save();
  c.strokeStyle = d.tokens['line-strong']!;
  c.lineWidth = CANVAS_STYLE.group.strokeWidth;
  c.setLineDash([...CANVAS_STYLE.group.dash]);
  c.beginPath();
  c.roundRect(r.x, r.y, r.w, r.h, d.metrics.radiusMd);
  c.stroke();
  c.setLineDash([]);
  if (label) {
    // Constant on-screen size, anchored to the frame's top-left corner.
    const inv = Math.min(1 / Math.max(zoom, 0.0001), 3);
    const px = CANVAS_STYLE.group.labelSize * inv;
    c.font = `${CANVAS_STYLE.group.labelWeight} ${px}px ${d.fontNote}`;
    c.fillStyle = d.tokens['ink-muted']!;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(label, r.x + d.metrics.space4 * inv, r.y + d.metrics.space4 * inv + px * 0.8);
  }
  c.restore();
}
