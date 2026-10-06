// ─── KonvaEdge ────────────────────────────────────────────────────────────────
//
// A single connector between two ideas: the design system's cubic curve, open
// arrowhead and label. Endpoints sit `edge-gap` outside the real outline of each
// idea (including its outermost ring). The canvas layers batch connectors
// (KonvaEdgeLayer); this component is for composing custom Konva scenes.

import React, { memo, useMemo } from 'react';
import { KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import { connectorGeometry, type FlatNode, type MindMapConnection } from '@visualli/core';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { drawConnector, prepareConnector } from '../design/drawing';

export interface KonvaEdgeProps {
  sourceNode: FlatNode;
  targetNode: FlatNode;
  connection?: MindMapConnection;
  /** @deprecated pass `design`. */
  isDark?: boolean;
  /** @deprecated connectors use the design system's edge colour; kept so existing callers compile. */
  colorOverride?: string;
  zoomLevel?: number;
  design?: Design;
}

const KonvaEdge = memo(function KonvaEdge({ sourceNode: from, targetNode: to, connection, zoomLevel = 1, design = DEFAULT_DESIGN }: KonvaEdgeProps) {
  const g = useMemo(
    () => prepareConnector(connectorGeometry(from, to, design.metrics.edgeGap)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [from.x, from.y, from.width, from.level, from.branchCount, to.x, to.y, to.width, to.level, to.branchCount, design.metrics.edgeGap],
  );
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: { _context: CanvasRenderingContext2D }, _shape: Konva.Shape) => {
        drawConnector(ctx._context, g, design, zoomLevel, connection?.style === 'dashed', connection?.label);
      }}
    />
  );
});

export default KonvaEdge;
