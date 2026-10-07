// ─── Containers ──────────────────────────────────────────────────────────────
//
// The design system's containers (geometry/container.ts, copied verbatim into
// @visualli/core): a dashed hull around the member ideas (HULL.padX / HULL.padY
// beyond their centres, more for large ideas: HULL_CLEAR) with HULL.radius corners, and the group's name as a pill straddling
// the hull's edge. Where the pill goes is the design system's placeContainerLabel:
// candidate spots along all four edges, scored against every idea on the layer
// (with its outermost ring), every connector curve and the names placed before
// it. The pill's look comes from .vi-map__group-label in css/spec.css
// (CANVAS_STYLE.group). Hull and pill are painted by the two container layers.

import {
  CANVAS_STYLE,
  RINGS,
  connectorGeometry,
  connectorSamples,
  containerHull,
  labelGrowth,
  nodeRadii,
  placeContainerLabel,
  ringsFor,
  type FlatNode,
  type Hull,
  type LabelBox,
  type LabelSide,
} from '@visualli/core';
import type { Design } from './design';

const PILL = CANVAS_STYLE.group;

export interface ContainerInput { id: string; label?: string; nodeIds: string[] }
export interface ConnectionInput { from: string; to: string }

export interface PlacedPill { text: string; x: number; y: number; side: LabelSide; w: number; h: number }
export interface PlacedContainer { id: string; hull: Hull; pill: PlacedPill | null }

/** The pill's font at `px`: the note face (the UI face in readable type, via Design.fontNote). */
export const pillFont = (d: Design, px: number): string => `${PILL.labelWeight} ${px}px ${d.fontNote}`;


let measureCtx: CanvasRenderingContext2D | null = null;
function measurer(): CanvasRenderingContext2D | null {
  if (!measureCtx && typeof document !== 'undefined') measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

/** The pill's box in world units for `text` (ellipsised past labelMaxWidth), with the text grown by `k`. */
export function measurePill(text: string, d: Design, k: number, c: CanvasRenderingContext2D | null = measurer()): PlacedPill {
  const px = PILL.labelSize * d.labelScale * k;
  const padX = PILL.labelPadding.x, border = PILL.labelBorderWidth;
  const room = PILL.labelMaxWidth - padX * 2 - border * 2;
  let shown = text, tw = text.length * px * 0.5;
  if (c) {
    c.font = pillFont(d, px);
    tw = c.measureText(text).width;
    if (tw > room) {
      // One-line ellipsis, like text-overflow: ellipsis.
      let lo = 0, hi = text.length;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (c.measureText(text.slice(0, mid).trimEnd() + '…').width <= room) lo = mid; else hi = mid - 1; }
      shown = text.slice(0, lo).trimEnd() + '…';
      tw = c.measureText(shown).width;
    }
  }
  return {
    text: shown, x: 0, y: 0, side: 'bottom',
    w: Math.min(PILL.labelMaxWidth, tw + padX * 2 + border * 2),
    h: px * PILL.labelLineHeight + PILL.labelPadding.top + PILL.labelPadding.bottom + border * 2,
  };
}

/** The box an idea occupies, its outermost ring included (what a container name must not cover). */
function ideaBox(n: FlatNode): LabelBox {
  const { rx, ry } = nodeRadii(n);
  const rings = ringsFor(n.branchCount);
  const s = rings.length ? RINGS[rings.length - 1]!.scale : 1;
  return { x0: n.x - rx * s, x1: n.x + rx * s, y0: n.y - ry * s, y1: n.y + ry * s };
}

/**
 * Hulls and name positions for a layer's containers, in file order (each name
 * avoids the ones placed before it). Placement uses the names' size at 100%
 * (k = 1), so they don't hop while zooming; they follow ideas that are dragged.
 */
export function layoutContainers(
  containers: ReadonlyArray<ContainerInput>,
  nodes: ReadonlyMap<string, FlatNode>,
  connections: ReadonlyArray<ConnectionInput>,
  d: Design,
): PlacedContainer[] {
  if (containers.length === 0) return [];
  const ideas: LabelBox[] = [];
  for (const n of nodes.values()) ideas.push(ideaBox(n));
  const lines = connections.flatMap((c) => {
    const a = nodes.get(c.from), b = nodes.get(c.to);
    if (!a || !b) return [];
    const g = connectorGeometry(a, b, d.metrics.edgeGap);
    return [connectorSamples(g.a, g.mid, g.b)];
  });
  const placed: LabelBox[] = [];
  const out: PlacedContainer[] = [];
  for (const c of containers) {
    const members = c.nodeIds.map((id) => nodes.get(id)).filter((n): n is FlatNode => !!n);
    const hull = containerHull(members.map((n) => ({ x: n.x, y: n.y, ...nodeRadii(n) })));
    if (!hull) continue;
    let pill: PlacedPill | null = null;
    if (c.label) {
      const size = measurePill(c.label, d, 1);
      const at = placeContainerLabel(hull, size, { ideas, connectors: lines, labels: placed });
      pill = { ...size, x: at.x, y: at.y, side: at.side };
      placed.push({ x0: at.x - size.w / 2, x1: at.x + size.w / 2, y0: at.y - size.h / 2, y1: at.y + size.h / 2 });
    }
    out.push({ id: c.id, hull, pill });
  }
  return out;
}

/** The dashed hull (beneath connectors and ideas). */
export function drawHull(c: CanvasRenderingContext2D, h: Hull, d: Design): void {
  c.save();
  c.strokeStyle = d.tokens['line-strong']!;
  c.lineWidth = PILL.strokeWidth;
  c.setLineDash([...PILL.dash]);
  c.beginPath();
  c.roundRect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0, h.radius);
  c.stroke();
  c.restore();
}

/** The name pill (above connectors and ideas), its text growing like idea labels when zoomed out (labelGrowth). */
export function drawPill(c: CanvasRenderingContext2D, p: PlacedPill, d: Design, zoom: number): void {
  const k = labelGrowth(zoom).idea;
  const size = k === 1 ? p : measurePill(p.text, d, k, c);
  const contrast = d.theme.startsWith('contrast');
  const bw = contrast ? PILL.contrastLabelBorderWidth : PILL.labelBorderWidth;
  c.save();
  c.beginPath();
  c.roundRect(p.x - size.w / 2 + bw / 2, p.y - size.h / 2 + bw / 2, size.w - bw, size.h - bw, (size.h - bw) / 2);
  c.fillStyle = d.tokens[PILL.labelFill]!;
  c.fill();
  c.lineWidth = bw;
  c.strokeStyle = d.tokens[contrast ? PILL.contrastLabelBorder : PILL.labelBorder]!;
  c.stroke();
  c.font = pillFont(d, PILL.labelSize * d.labelScale * k);
  c.fillStyle = d.tokens[PILL.labelInk]!;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  // Centre of the text box: the padding is uneven (top < bottom), so nudge by half the difference.
  c.fillText(size.text, p.x, p.y + (PILL.labelPadding.top - PILL.labelPadding.bottom) / 2);
  c.restore();
}
