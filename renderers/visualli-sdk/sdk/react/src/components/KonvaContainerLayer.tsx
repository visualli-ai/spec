// ─── KonvaContainerLayer ─────────────────────────────────────────────────────
//
// Dashed frames around groups of ideas, beneath connectors and ideas
// (non-interactive). Member positions come from the live node store so frames
// follow dragged ideas.

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { KLayer as Layer, KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { useFontsEpoch } from '../design/runtime';
import { drawGroup, groupRect } from '../design/drawing';

export interface ContainerGroup {
  id: string;
  label?: string;
  nodeIds: string[];
  level: number;
}

export interface KonvaContainerLayerProps {
  /** Layout-snapshot nodes (kept for API compatibility). */
  nodes: FlatNode[];
  containers: ContainerGroup[];
  /** @deprecated pass `design`. */
  isDark?: boolean;
  design?: Design;
}

export default function KonvaContainerLayer({ containers, design = DEFAULT_DESIGN }: KonvaContainerLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const fonts = useFontsEpoch();
  const storeNodes = useNodeStore((s) => s.nodes);

  const groups = useMemo(() => containers.flatMap((c) => {
    const members = c.nodeIds.map((id) => storeNodes.get(id)).filter((n): n is FlatNode => !!n);
    const rect = groupRect(members, design.metrics.space7);
    return rect ? [{ id: c.id, label: c.label, rect }] : [];
  }), [containers, storeNodes, design.metrics.space7]);

  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [groups, design, fonts]);

  if (containers.length === 0) return null;

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx: { _context: CanvasRenderingContext2D }, shape: Konva.Shape) => {
          const zoom = shape.getStage()?.scaleX() || 1;
          for (const g of groups) drawGroup(ctx._context, g.rect, g.label, design, zoom);
        }}
      />
    </Layer>
  );
}
