// ─── KonvaEdge ────────────────────────────────────────────────────────────────
//
// Renders a connection arrow between two FlatNodes.
// Matches the visualli.ai KonvaEdge exactly:
//   - Cubic bezier multi-point polyline (20 segments) through ellipse boundaries
//   - Adaptive arc height (smaller for long connections)
//   - Open V arrowhead at target
//   - TextPath label following the curve (above the line)
//   - Always black stroke for maximum visibility

import React, { useMemo, memo } from 'react';
import { KGroup as Group, KLine as Line, KTextPath as TextPath } from '../konvaCompat';
import type { FlatNode, MindMapConnection } from '@visualli-sdk/core';
import { NODE_HEIGHT } from '@visualli-sdk/core';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the outermost visible blob scale for a node.
// Mirrors BLOB_LAYER_CONFIG in KonvaNode: scaleUps are [1.30, 1.20, 1.10] (outermost→inner).
const getOutermostScaleUp = (branchCount: number | undefined): number => {
  const layerCount = Math.min(branchCount ?? 0, 3);
  if (layerCount === 0) return 1.0;
  const scaleUps = [1.30, 1.20, 1.10] as const;
  return scaleUps[scaleUps.length - layerCount];
};

function getEllipseIntersection(
  cx: number, cy: number, rx: number, ry: number, angle: number,
): { x: number; y: number } {
  return {
    x: cx + rx * Math.cos(angle),
    y: cy + ry * Math.sin(angle),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface KonvaEdgeProps {
  sourceNode: FlatNode;
  targetNode: FlatNode;
  connection?: MindMapConnection;
  isDark?: boolean;
  colorOverride?: string;
  zoomLevel?: number;
}

const EDGE_SPACING = 25; // Increased spacing to ensure arrow head stays out of organic shapes
const STROKE_COLOR = '#000000';
const STROKE_WIDTH = 2.5;

const KonvaEdge = memo(function KonvaEdge({
  sourceNode: from,
  targetNode: to,
  connection,
  zoomLevel = 1.0,
}: KonvaEdgeProps) {
  const label = (connection as { label?: string } | undefined)?.label;

  // ── Build multi-point bezier curve ─────────────────────────────────────────
  const points = useMemo(() => {
    const fromBaseX  = from.width / 2;
    const fromBaseY  = Math.max((NODE_HEIGHT * 1.6) / 2, fromBaseX * 0.74);
    const fromScale  = getOutermostScaleUp(from.branchCount);
    const fromRadiusX = fromBaseX * fromScale;
    const fromRadiusY = fromBaseY * fromScale;

    const toBaseX  = to.width / 2;
    const toBaseY  = Math.max((NODE_HEIGHT * 1.6) / 2, toBaseX * 0.74);
    const toScale  = getOutermostScaleUp(to.branchCount);
    const toRadiusX = toBaseX * toScale;
    const toRadiusY = toBaseY * toScale;

    const angle    = Math.atan2(to.y - from.y, to.x - from.x);
    const fromEdge = getEllipseIntersection(from.x, from.y, fromRadiusX, fromRadiusY, angle);
    const toEdge   = getEllipseIntersection(to.x, to.y, toRadiusX, toRadiusY, angle + Math.PI);

    // Apply spacing from edges (increased to 25 to avoid leaking into organic shapes)
    const fromX = fromEdge.x + EDGE_SPACING * Math.cos(angle);
    const fromY = fromEdge.y + EDGE_SPACING * Math.sin(angle);
    const toX   = toEdge.x   - EDGE_SPACING * Math.cos(angle);
    const toY   = toEdge.y   - EDGE_SPACING * Math.sin(angle);

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    const distance  = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const arcHeight = Math.min(45, 45 / (1 + Math.max(0, (distance - 200) / 400)));

    const perpX = -(toY - fromY) / distance;
    const perpY =  (toX - fromX) / distance;

    const offsetMidX = midX + perpX * arcHeight;
    const offsetMidY = midY + perpY * arcHeight;

    const ctrl1X = fromX + (offsetMidX - fromX) * 0.66;
    const ctrl1Y = fromY + (offsetMidY - fromY) * 0.66;
    const ctrl2X = toX   + (offsetMidX - toX)   * 0.66;
    const ctrl2Y = toY   + (offsetMidY - toY)   * 0.66;

    const NUM_SEGMENTS = 20;
    const pts: number[] = [];
    for (let i = 0; i <= NUM_SEGMENTS; i++) {
      const t = i / NUM_SEGMENTS;
      const mt = 1 - t;
      const mt2 = mt * mt; const mt3 = mt2 * mt;
      const t2  = t  * t;  const t3  = t2  * t;
      pts.push(
        mt3 * fromX + 3 * mt2 * t * ctrl1X + 3 * mt * t2 * ctrl2X + t3 * toX,
        mt3 * fromY + 3 * mt2 * t * ctrl1Y + 3 * mt * t2 * ctrl2Y + t3 * toY,
      );
    }
    return pts;
  }, [from.x, from.y, from.width, from.branchCount, to.x, to.y, to.width, to.branchCount]);

  // ── Arrowhead ─────────────────────────────────────────────────────────────
  const arrowHeadPoints = useMemo(() => {
    const len   = points.length;
    const tipX  = points[len - 2];
    const tipY  = points[len - 1];
    const prevX = points[len - 4];
    const prevY = points[len - 3];
    const angle     = Math.atan2(tipY - prevY, tipX - prevX);
    const armLength = 11;
    const armAngle  = Math.PI / 5.5; // ~33°
    return [
      tipX - armLength * Math.cos(angle - armAngle),
      tipY - armLength * Math.sin(angle - armAngle),
      tipX, tipY,
      tipX - armLength * Math.cos(angle + armAngle),
      tipY - armLength * Math.sin(angle + armAngle),
    ];
  }, [points]);

  // ── TextPath data (optional label) ────────────────────────────────────────
  const { pathData, fontSize } = useMemo(() => {
    if (!label) return { pathData: null, fontSize: 12 };

    const fromBaseX  = from.width / 2;
    const fromBaseY  = Math.max((NODE_HEIGHT * 1.6) / 2, fromBaseX * 0.74);
    const fromScale  = getOutermostScaleUp(from.branchCount);
    const fromRadiusX = fromBaseX * fromScale;
    const fromRadiusY = fromBaseY * fromScale;

    const toBaseX  = to.width / 2;
    const toBaseY  = Math.max((NODE_HEIGHT * 1.6) / 2, toBaseX * 0.74);
    const toScale  = getOutermostScaleUp(to.branchCount);
    const toRadiusX = toBaseX * toScale;
    const toRadiusY = toBaseY * toScale;

    const angle    = Math.atan2(to.y - from.y, to.x - from.x);
    const fromEdge = getEllipseIntersection(from.x, from.y, fromRadiusX, fromRadiusY, angle);
    const toEdge   = getEllipseIntersection(to.x, to.y, toRadiusX, toRadiusY, angle + Math.PI);

    const fromX = fromEdge.x + EDGE_SPACING * Math.cos(angle);
    const fromY = fromEdge.y + EDGE_SPACING * Math.sin(angle);
    const toX   = toEdge.x   - EDGE_SPACING * Math.cos(angle);
    const toY   = toEdge.y   - EDGE_SPACING * Math.sin(angle);

    const midX     = (fromX + toX) / 2;
    const midY     = (fromY + toY) / 2;
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const arcHeight = Math.min(45, 45 / (1 + Math.max(0, (distance - 200) / 400)));

    const perpX = -(toY - fromY) / distance;
    const perpY =  (toX - fromX) / distance;

    const offsetMidX = midX + perpX * arcHeight;
    const offsetMidY = midY + perpY * arcHeight;

    const ctrl1X = fromX + (offsetMidX - fromX) * 0.66;
    const ctrl1Y = fromY + (offsetMidY - fromY) * 0.66;
    const ctrl2X = toX   + (offsetMidX - toX)   * 0.66;
    const ctrl2Y = toY   + (offsetMidY - toY)   * 0.66;

    const TEXT_OFFSET = 15;
    const fxo = fromX + perpX * TEXT_OFFSET; const fyo = fromY + perpY * TEXT_OFFSET;
    const txo = toX   + perpX * TEXT_OFFSET; const tyo = toY   + perpY * TEXT_OFFSET;
    const c1xo = ctrl1X + perpX * TEXT_OFFSET; const c1yo = ctrl1Y + perpY * TEXT_OFFSET;
    const c2xo = ctrl2X + perpX * TEXT_OFFSET; const c2yo = ctrl2Y + perpY * TEXT_OFFSET;

    // Variable font size: scales with zoom level to remain visible when zoomed out
    // and also scales with node width.
    const baseFontSize = 14;
    const zoomFactor = Math.max(1, 1 / zoomLevel); // Increase font size as we zoom out
    const scaledFontSize = Math.max(12, Math.min(24, baseFontSize * (from.width / 180) * zoomFactor));

    let d = '';
    if (fromX > toX) {
      d = `M ${txo},${tyo} C ${c2xo},${c2yo} ${c1xo},${c1yo} ${fxo},${fyo}`;
    } else {
      d = `M ${fxo},${fyo} C ${c1xo},${c1yo} ${c2xo},${c2yo} ${txo},${tyo}`;
    }
    return { pathData: d, fontSize: scaledFontSize };
  }, [from.x, from.y, from.width, from.branchCount, to.x, to.y, to.width, to.branchCount, label, zoomLevel]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Group>
      <Line
        points={points}
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH}
        tension={0}
        opacity={0.9}
        lineCap="round"
        lineJoin="round"
        listening={false}
        perfectDrawEnabled={false}
      />
      <Line
        points={arrowHeadPoints}
        stroke={STROKE_COLOR}
        strokeWidth={STROKE_WIDTH}
        lineCap="round"
        lineJoin="round"
        opacity={0.9}
        listening={false}
        perfectDrawEnabled={false}
      />
      {label && pathData && (
        <>
          {/* Background text for contrast */}
          <TextPath
            data={pathData}
            text={label}
            fontSize={fontSize}
            fontFamily="'Playpen Sans', cursive"
            fontStyle="normal"
            fill="#ffffff"
            align="center"
            letterSpacing={0.5}
            listening={false}
            opacity={0.9}
          />
          {/* Foreground label text */}
          <TextPath
            data={pathData}
            text={label}
            fontSize={fontSize}
            fontFamily="'Playpen Sans', cursive"
            fontStyle="normal"
            fill="#6b6860"
            align="center"
            letterSpacing={0.5}
            listening={false}
            opacity={0.9}
          />
        </>
      )}
    </Group>
  );
});

export default KonvaEdge;
