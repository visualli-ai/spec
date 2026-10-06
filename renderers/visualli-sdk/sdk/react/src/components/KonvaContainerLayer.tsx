// ─── KonvaContainerLayer ─────────────────────────────────────────────────────
//
// Container hulls (the design system's dashed hull, geometry/container.ts),
// beneath connectors and ideas (non-interactive). Their names are painted above
// the ideas by KonvaContainerLabelLayer from the same layout. Member positions
// come from the live node store so hulls follow dragged ideas.

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { KLayer as Layer, KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { useFontsEpoch } from '../design/runtime';
import { drawHull, layoutContainers, type ConnectionInput, type PlacedContainer } from '../design/containers';

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
  /** The layer's connections: container names are placed clear of them. */
  connections?: ConnectionInput[];
  /** @deprecated pass `design`. */
  isDark?: boolean;
  design?: Design;
}

/** Hulls and name positions for the current layer, from the live node store (shared by both container layers). */
export function useContainerLayout(containers: ContainerGroup[], connections: ConnectionInput[] = [], design: Design = DEFAULT_DESIGN): PlacedContainer[] {
  const fonts = useFontsEpoch();
  const storeNodes = useNodeStore((s) => s.nodes);
  return useMemo(
    () => layoutContainers(containers, storeNodes, connections, design),
    // fonts: the names are measured, so measure again once the web fonts are in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containers, connections, storeNodes, design, fonts],
  );
}

export default function KonvaContainerLayer({ containers, connections = [], design = DEFAULT_DESIGN }: KonvaContainerLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const placed = useContainerLayout(containers, connections, design);

  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [placed, design]);

  if (containers.length === 0) return null;

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx: { _context: CanvasRenderingContext2D }) => { for (const p of placed) drawHull(ctx._context, p.hull, design); }}
      />
    </Layer>
  );
}
