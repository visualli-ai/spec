// ─── KonvaContainer ──────────────────────────────────────────────────────────
//
// Renders a smooth dashed hull around a group of nodes with an inverse-scaled
// pill label — matches the visualli.ai KonvaContainer exactly.
//
//   • 48-point ellipse sampling per node (not bounding box corners)
//   • Graham-scan convex hull → 6-pass Chaikin smoothing
//   • Dashed stroke "#747270", no fill
//   • Pill label: parchment bg (#ddd9d0), Playpen Sans 800, inverse-zoom-scaled
//   • Label anchored to the hull edge (bottom for horizontal, top for vertical)

import React, { memo, useMemo } from 'react';
import {
  KGroup as Group,
  KLine as Line,
  KRect as Rect,
  KText as Text,
} from '../konvaCompat';
import type { FlatNode } from '@visualli-sdk/core';
import { NODE_HEIGHT, TEXT_LABEL_HIDE_BELOW_ZOOM } from '@visualli-sdk/core';
import { useViewportStore }           from '../stores/useViewportStore';
import {
  CONTAINER_LABEL_BASE_FONT_PX,
  computeNodeTextScreenScale,
} from '../config/textScaling';

// ── Constants (mirrors visualli.ai) ──────────────────────────────────────────

const CONTAINER_PADDING   = 50;
const CONTAINER_DASH      = [10, 5] as const;
const LABEL_BG            = '#ddd9d0';
const LABEL_BORDER_RADIUS = 20;
const LABEL_FONT_SIZE     = CONTAINER_LABEL_BASE_FONT_PX;
const LABEL_FONT_WEIGHT   = '800';
const LABEL_FONT_FAMILY   = "'Playpen Sans', Quicksand, sans-serif";
const LABEL_PAD_H         = 20;
const LABEL_PAD_V         = 10;
const LABEL_LINE_HEIGHT   = 1.2;
// Max normalized blob extents — Shape 5 reaches ±1.275 X, ±1.234 Y
const MAX_BLOB_EXTENT_X   = 1.275;
const MAX_BLOB_EXTENT_Y   = 1.234;

// ── Text measurement ──────────────────────────────────────────────────────────

let _labelCtx: CanvasRenderingContext2D | null = null;
function measureLabelBoxWidth(text: string, fontSize: number): number {
  if (!_labelCtx) {
    const c = document.createElement('canvas');
    _labelCtx = c.getContext('2d');
  }
  if (!_labelCtx) return Math.ceil(text.length * fontSize * 0.65 + 2 * LABEL_PAD_H);
  _labelCtx.font = `${LABEL_FONT_WEIGHT} ${fontSize}px ${LABEL_FONT_FAMILY}`;
  return Math.ceil(_labelCtx.measureText(text).width + 2 * LABEL_PAD_H);
}

// ── Convex hull (Graham scan) ─────────────────────────────────────────────────

type Pt = { x: number; y: number };

function isLeftTurn(p1: Pt, p2: Pt, p3: Pt): boolean {
  return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x) > 0;
}

function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points;
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[start].y ||
       (points[i].y === points[start].y && points[i].x < points[start].x)) start = i;
  }
  const sorted = [...points];
  const sp = sorted.splice(start, 1)[0];
  sorted.sort((a, b) => {
    const da = Math.atan2(a.y - sp.y, a.x - sp.x);
    const db = Math.atan2(b.y - sp.y, b.x - sp.x);
    if (da !== db) return da - db;
    return Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y);
  });
  const hull: Pt[] = [sp, sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    while (hull.length > 1 && !isLeftTurn(hull[hull.length - 2], hull[hull.length - 1], sorted[i])) hull.pop();
    hull.push(sorted[i]);
  }
  return hull;
}

// ── Chaikin smoothing (6 passes, returns flat [x,y,…] array) ─────────────────

function chaikinSmooth(pts: Pt[], passes = 6): number[] {
  let cur = pts;
  for (let iter = 0; iter < passes; iter++) {
    const next: Pt[] = [];
    const n = cur.length;
    for (let i = 0; i < n; i++) {
      const a = cur[i], b = cur[(i + 1) % n];
      next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
    }
    cur = next;
  }
  return cur.flatMap(p => [p.x, p.y]);
}

// ── Hull edge Y at a given X (for label anchor) ───────────────────────────────

function hullEdgeYAtX(points: number[], targetX: number, isBottom: boolean): number {
  const n = points.length;
  let result = isBottom ? -Infinity : Infinity;
  for (let i = 0; i < n; i += 2) {
    const x1 = points[i],     y1 = points[i + 1];
    const x2 = points[(i + 2) % n], y2 = points[(i + 3) % n];
    if ((x1 < targetX && x2 >= targetX) || (x2 < targetX && x1 >= targetX)) {
      const t = (targetX - x1) / (x2 - x1);
      const y = y1 + t * (y2 - y1);
      if (isBottom) result = Math.max(result, y); else result = Math.min(result, y);
    }
  }
  if (!isFinite(result)) {
    for (let i = 1; i < n; i += 2) {
      if (isBottom) result = Math.max(result, points[i]); else result = Math.min(result, points[i]);
    }
  }
  return result;
}

// ── Hull calculation ──────────────────────────────────────────────────────────

function calculateHull(
  containerNodes: FlatNode[],
): { points: number[]; anchorX: number; anchorEdgeY: number } | null {
  if (containerNodes.length === 0) return null;

  const NUM_SAMPLES = 48;
  const samples: Pt[] = [];
  for (const node of containerNodes) {
    const baseRX = node.width / 2;
    const baseRY = Math.max((NODE_HEIGHT * 1.6) / 2, baseRX * 0.74);
    const halfW = baseRX * MAX_BLOB_EXTENT_X + CONTAINER_PADDING;
    const halfH = baseRY * MAX_BLOB_EXTENT_Y + CONTAINER_PADDING;
    for (let j = 0; j < NUM_SAMPLES; j++) {
      const angle = (j / NUM_SAMPLES) * Math.PI * 2;
      samples.push({ x: node.x + halfW * Math.cos(angle), y: node.y + halfH * Math.sin(angle) });
    }
  }

  const hull    = convexHull(samples);
  const points  = chaikinSmooth(hull, 6);

  const xs = containerNodes.map(n => n.x);
  const ys = containerNodes.map(n => n.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const useTopEdge = spanY > spanX * 2.0;

  let hullMinX = Infinity, hullMaxX = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    if (points[i] < hullMinX) hullMinX = points[i];
    if (points[i] > hullMaxX) hullMaxX = points[i];
  }
  const anchorX     = (hullMinX + hullMaxX) / 2;
  const anchorEdgeY = hullEdgeYAtX(points, anchorX, !useTopEdge);

  return { points, anchorX, anchorEdgeY };
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface KonvaContainerProps {
  /** All nodes in this container group (already resolved from nodeMap). */
  nodes: FlatNode[];
  /** Label text shown on the pill badge. */
  label?: string;
  /** Unused – kept for API compat; stroke is always #747270. */
  color?: string;
  isDark?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

const KonvaContainer = memo(function KonvaContainer({
  nodes,
  label = '',
}: KonvaContainerProps) {
  const zoomLevel = useViewportStore(s => s.zoomLevel);

  const hullData = useMemo(() => calculateHull(nodes), [nodes]);

  if (!hullData) return null;

  // Inverse-scaled label metrics
  const refNode      = nodes[0];
  const screenScale  = refNode ? computeNodeTextScreenScale(refNode.width, zoomLevel) : 1;
  const labelFontSize   = LABEL_FONT_SIZE * screenScale;
  const labelBoxHeight  = Math.ceil(labelFontSize * LABEL_LINE_HEIGHT + 2 * LABEL_PAD_V);
  const boxWidth        = label ? measureLabelBoxWidth(label, labelFontSize) : 0;
  const boxX            = hullData.anchorX - boxWidth / 2;
  const boxY            = hullData.anchorEdgeY - labelBoxHeight / 2;

  return (
    <Group listening={false}>
      {/* Dashed hull outline */}
      <Line
        points={hullData.points}
        stroke="#747270"
        strokeWidth={1}
        dash={CONTAINER_DASH}
        closed={true}
        tension={0}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Inverse-scaled pill label */}
      {label.length > 0 && (
        <Group
          x={boxX + boxWidth / 2}
          y={boxY + labelBoxHeight / 2}
          offsetX={boxWidth / 2}
          offsetY={labelBoxHeight / 2}
          scaleX={1 / zoomLevel}
          scaleY={1 / zoomLevel}
          visible={zoomLevel >= TEXT_LABEL_HIDE_BELOW_ZOOM}
          listening={false}
        >
          <Rect
            width={boxWidth}
            height={labelBoxHeight}
            fill={LABEL_BG}
            cornerRadius={LABEL_BORDER_RADIUS}
            shadowEnabled={false}
            perfectDrawEnabled={false}
          />
          <Text
            x={LABEL_PAD_H}
            y={LABEL_PAD_V}
            width={boxWidth - 2 * LABEL_PAD_H}
            height={labelBoxHeight - 2 * LABEL_PAD_V}
            text={label}
            fontSize={labelFontSize}
            fontFamily={LABEL_FONT_FAMILY}
            fontStyle={LABEL_FONT_WEIGHT}
            fill="rgba(0,0,0,1)"
            align="center"
            verticalAlign="middle"
            lineHeight={LABEL_LINE_HEIGHT}
            perfectDrawEnabled={false}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
});

export default KonvaContainer;
