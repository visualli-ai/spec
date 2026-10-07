// ─── Canvas drawing ──────────────────────────────────────────────────────────
//
// Draws ideas and connectors onto a native 2D context using the
// design system's geometry and tokens. Konva owns the stage, layers, viewport
// and layer transitions; these functions only paint.
//
// Performance notes:
//  - Outlines are cached as Path2D per (shape, rx, ry): built once, reused every frame.
//  - Label line breaks are cached per (font epoch, font, width, text).
//  - No allocations on the per-idea hot path except the label array on a cache miss.

import {
  CANVAS_STYLE,
  IDEA,
  ideaDetail,
  TYPE_STYLES,
  blobPath,
  ideaStyle,
  labelGrowth,
  nodeRadii,
  ringsFor,
  shapeOfLevel,
  type ConnectorGeometry,
  type FlatNode,
} from '@visualli/core';
import type { Design } from './design';
import { fontsEpoch } from './runtime';
import type { Arrival, EdgeArrival } from './choreography';

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

const NO_DASH: number[] = [];
const NO_RINGS: ReadonlyArray<never> = [];
const dashCache = new Map<string, number[]>();
function dashOf(spec: string): number[] {
  if (!spec) return NO_DASH;
  let d = dashCache.get(spec);
  if (!d) { d = spec.split(/\s+/).map(Number); dashCache.set(spec, d); }
  return d;
}

// ── Label layout ──────────────────────────────────────────────────────────────

const lineCache = new Map<string, string[]>();
const MAX_CACHED_LAYOUTS = 8192;

/** Greedy word wrap at `maxWidth` (natural px), clamped to `maxLines` with an ellipsis (ideas pass Infinity: they are
 *  sized to hold their whole label). */
export function layoutLabel(c: CanvasRenderingContext2D, text: string, font: string, maxWidth: number, maxLines: number = Infinity): string[] {
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
  /** Hover/select progress (0 at rest, 1 raised) from the choreography; defaults to the boolean state when omitted. */
  lift?: number;
  ring?: number;
  /** Arrival look mid-reveal (bloom); null/omitted once arrived. */
  arrival?: Arrival | null;
}
export const IDLE: IdeaState = { hovered: false, pressed: false, selected: false, focused: false, dimmed: false };

export interface IdeaOptions {
  /** Drop shadows are skipped for big maps / while dragging. */
  shadows: boolean;
  /** Device pixels per world unit (canvas shadows are in device space). Computed once per frame by the caller; derived from the transform when omitted. */
  k?: number;
  /** Opacity of a dimmed idea (the design system's `.vi-node.is-dimmed` for the theme and layout); default the focus themes'. */
  dimOpacity?: number;
  /** The context's transform at the start of the frame. When given, ideas are placed with setTransform (no save/restore); the caller must restore it afterwards. */
  base?: DOMMatrix;
}

/** Fill + ring an idea is drawn with in `d`'s theme: its topic's, or its custom colour as given (the design system's colour rule). */
export const ideaColors = (d: Design, n: Pick<FlatNode, 'topic' | 'custom'>) => ideaStyle(d.theme, n);

/** An idea's label size in natural px: the design system's size for its kind × the comfort label scale. */
export const ideaLabelPx = (n: Pick<FlatNode, 'kind'>, d: Design): number => IDEA.labelSize[n.kind ?? 'node'] * d.labelScale;

/**
 * Paint one idea (rings, body, label) centred on node.x / node.y.
 *
 * With `opt.base` (the context's transform at the start of the frame) the idea is
 * positioned with a single setTransform and no save/restore: the caller restores
 * the base transform after the last idea. Without it, state is saved and restored.
 */
export function drawIdea(c: CanvasRenderingContext2D, node: FlatNode, d: Design, zoom: number, st: IdeaState, opt: IdeaOptions): void {
  const { rx, ry } = nodeRadii(node);
  const { fill, ring } = ideaColors(d, node);
  const screenW = node.width * zoom;
  const base = opt.base;

  // Specks: one filled box, no transform changes.
  // Level of detail (geometry/detail.ts): a speck below DETAIL.speckBelow, body only below DETAIL.bodyOnlyBelow.
  const detail = ideaDetail(screenW, st.selected || st.focused || st.hovered);
  if (detail === 'speck') {
    const a = (st.dimmed ? opt.dimOpacity ?? CANVAS_STYLE.node.dimmedOpacityFocus : 1) * (st.arrival ? st.arrival.alpha : 1);
    if (a !== 1) c.globalAlpha = a;
    c.fillStyle = fill;
    c.fillRect(node.x - rx, node.y - ry, rx * 2, ry * 2);
    if (a !== 1) c.globalAlpha = 1;
    return;
  }

  const detailed = detail === 'full';
  const shape = shapeOfLevel(node.level);
  const rings = detailed ? ringsFor(node.branchCount) : NO_RINGS;
  const raised = st.hovered || st.pressed || st.selected;
  const lift = st.lift ?? (raised ? 1 : 0);
  const ringT = st.ring ?? (raised ? 1 : 0);
  const arr = st.arrival;
  const y = node.y + lift * CANVAS_STYLE.node.hoverLift + (arr ? arr.dy : 0);
  const x = node.x + (arr ? arr.dx : 0);
  let k = opt.k;
  if (k === undefined) { const m = c.getTransform(); k = Math.hypot(m.a, m.b); } // device px per world unit

  if (base) c.setTransform(base.a, base.b, base.c, base.d, base.e + base.a * x + base.c * y, base.f + base.b * x + base.d * y);
  else { c.save(); c.translate(x, y); }
  if (arr) c.scale(arr.scale, arr.scale);
  c.lineJoin = 'round';
  const baseAlpha = (st.dimmed ? opt.dimOpacity ?? CANVAS_STYLE.node.dimmedOpacityFocus : 1) * (arr ? arr.alpha : 1);
  c.globalAlpha = baseAlpha;

  // Rings, outermost first so the inner ones sit on top.
  if (rings.length) {
    const ringSpin = ringT * CANVAS_STYLE.node.hoverRingsRotate;
    const ringGrow = 1 + ringT * (CANVAS_STYLE.node.hoverRingsScale - 1);
    c.fillStyle = fill;
    c.strokeStyle = ring;
    let dashed = false;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]!;
      const angle = (r.rotate + ringSpin) * DEG;
      c.rotate(angle);
      c.globalAlpha = baseAlpha * r.opacity;
      const path = blobPath2D(shape, rx * r.scale * ringGrow, ry * r.scale * ringGrow);
      c.fill(path);
      c.lineWidth = r.width;
      if (r.dash) { c.setLineDash(dashOf(r.dash)); dashed = true; } else if (dashed) { c.setLineDash(NO_DASH); dashed = false; }
      c.stroke(path);
      c.rotate(-angle);
    }
    if (dashed) c.setLineDash(NO_DASH);
    c.globalAlpha = baseAlpha;
  }

  // Body.
  const body = blobPath2D(shape, rx, ry);
  c.fillStyle = fill;
  const shadow = detailed && opt.shadows ? d.nodeShadow : null;
  if (shadow) {
    c.shadowColor = shadow.color;
    c.shadowBlur = shadow.blur * k;
    c.shadowOffsetX = shadow.x * k;
    c.shadowOffsetY = shadow.y * k;
  }
  c.fill(body);
  if (shadow) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; }
  c.strokeStyle = st.focused ? d.tokens['focus']! : st.selected ? d.tokens['ink']! : ring;
  c.lineWidth = st.selected || st.focused ? CANVAS_STYLE.node.selectedStrokeWidth : d.metrics.nodeStroke;
  c.stroke(body);

  // Label.
  // Label: the whole label (the idea is sized for it, idea.ts), growing up to LABEL_GROWTH.idea when zoomed out.
  if (detailed && node.title) {
    const px = ideaLabelPx(node, d);
    const font = `${TYPE_STYLES['node-label'].weight} ${px}px ${d.fontHand}`;
    const lines = layoutLabel(c, node.title, font, node.width - IDEA.labelInset);
    const s = labelGrowth(zoom).idea;
    const lh = px * IDEA.labelLineHeight;
    c.scale(s, s);
    c.font = font;
    c.fillStyle = d.tokens['node-ink']!;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (d.comfort.readableType && 'letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = `${(px * 0.02).toFixed(2)}px`;
    const y0 = -((lines.length - 1) * lh) / 2;
    for (let i = 0; i < lines.length; i++) c.fillText(lines[i]!, 0, y0 + i * lh);
  }
  if (base) c.globalAlpha = 1; else c.restore();
}

// ── Connectors ────────────────────────────────────────────────────────────────

export interface PreparedConnector extends ConnectorGeometry {
  path: Path2D;
  arrowPath: Path2D;
  /** Length of the curve in world units (for drawing it from source to target). */
  len: number;
}

/** Length of the connector's cubic ("M x y C x y x y x y"), by sampling. */
function cubicLength(d: string): number {
  const v = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!v || v.length < 8) return 0;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = v as [number, number, number, number, number, number, number, number];
  let len = 0, px = x0, py = y0;
  for (let i = 1; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    len += Math.hypot(x - px, y - py); px = x; py = y;
  }
  return len;
}

export function prepareConnector(g: ConnectorGeometry): PreparedConnector {
  return { ...g, path: new Path2D(g.d), arrowPath: new Path2D(g.arrow), len: cubicLength(g.d) };
}

/** Connectors shorter than this on screen, and labels smaller than LABEL_MIN_SCREEN_PX, are invisible: skipped. */
const CONNECTOR_MIN_SCREEN_PX = 3;
const LABEL_MIN_SCREEN_PX = 6;

export function drawConnector(c: CanvasRenderingContext2D, g: PreparedConnector, d: Design, zoom: number, dashed: boolean, label: string | undefined, arrival?: EdgeArrival | null): void {
  if (Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) * zoom < CONNECTOR_MIN_SCREEN_PX) return;
  c.save();
  if (arrival) c.globalAlpha = arrival.alpha;
  c.strokeStyle = d.tokens['edge']!;
  c.lineWidth = d.metrics.edgeWidth;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (dashed) c.setLineDash([...CANVAS_STYLE.edge.dash]);
  else if (arrival && arrival.draw < 1) c.setLineDash([g.len * arrival.draw, g.len * 2]); // draws from source to target
  if (!(arrival && arrival.draw <= 0.001)) c.stroke(g.path);
  c.setLineDash([]);
  c.stroke(g.arrowPath);

  // The design system's connector label (`.vi-edge__label`), growing up to LABEL_GROWTH.connector when zoomed out (`--vi-inv`); the readable face is smaller and bolder.
  const labelPx = label ? d.edgeLabel.size * labelGrowth(zoom).connector : 0;
  if (label && labelPx * zoom >= LABEL_MIN_SCREEN_PX) {
    const px = labelPx;
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

