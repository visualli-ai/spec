// ─── KonvaContainer ───────────────────────────────────────────────────────────
//
// A dashed frame around a group of ideas with its label, in the design system's
// group style. The canvas layer batches frames (KonvaContainerLayer); this
// component is for composing custom Konva scenes.

import React, { memo, useMemo } from 'react';
import { KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode } from '@visualli/core';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { drawGroup, groupRect } from '../design/drawing';

export interface KonvaContainerProps {
  /** All nodes in this container group (already resolved from nodeMap). */
  nodes: FlatNode[];
  /** Label text shown on the frame. */
  label?: string;
  /** @deprecated unused: the frame uses the design system's group style. */
  color?: string;
  /** @deprecated pass `design`. */
  isDark?: boolean;
  zoomLevel?: number;
  design?: Design;
}

const KonvaContainer = memo(function KonvaContainer({ nodes, label = '', zoomLevel = 1, design = DEFAULT_DESIGN }: KonvaContainerProps) {
  const rect = useMemo(() => groupRect(nodes, design.metrics.space7), [nodes, design.metrics.space7]);
  if (!rect) return null;
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: { _context: CanvasRenderingContext2D }, _shape: Konva.Shape) => drawGroup(ctx._context, rect, label || undefined, design, zoomLevel)}
    />
  );
});

export default KonvaContainer;
