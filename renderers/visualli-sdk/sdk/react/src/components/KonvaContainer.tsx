// ─── KonvaContainer ───────────────────────────────────────────────────────────
//
// One container — the design system's dashed hull around a group of ideas, with
// its name as a pill on the hull's edge — for composing custom Konva scenes.
// It only knows its own members, so the name avoids them (not other ideas or
// connectors); the canvas uses KonvaContainerLayer + KonvaContainerLabelLayer,
// which place names against the whole layer.

import React, { memo, useMemo } from 'react';
import { KShape as Shape } from '../konvaCompat';
import type { FlatNode } from '@visualli/core';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { drawHull, drawPill, layoutContainers } from '../design/containers';

export interface KonvaContainerProps {
  /** All nodes in this container group (already resolved from nodeMap). */
  nodes: FlatNode[];
  /** The group's name, drawn as a pill on the hull. */
  label?: string;
  /** @deprecated unused: the hull and name use the design system's container style. */
  color?: string;
  /** @deprecated pass `design`. */
  isDark?: boolean;
  zoomLevel?: number;
  design?: Design;
}

const KonvaContainer = memo(function KonvaContainer({ nodes, label = '', zoomLevel = 1, design = DEFAULT_DESIGN }: KonvaContainerProps) {
  const placed = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n] as const));
    return layoutContainers([{ id: 'c', label: label || undefined, nodeIds: nodes.map((n) => n.id) }], map, [], design)[0] ?? null;
  }, [nodes, label, design]);
  if (!placed) return null;
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: { _context: CanvasRenderingContext2D }) => {
        drawHull(ctx._context, placed.hull, design);
        if (placed.pill) drawPill(ctx._context, placed.pill, design, zoomLevel);
      }}
    />
  );
});

export default KonvaContainer;
