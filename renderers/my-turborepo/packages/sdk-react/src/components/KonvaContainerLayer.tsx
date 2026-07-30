// ─── KonvaContainerLayer ─────────────────────────────────────────────────────
//
// Renders container outlines beneath nodes (non-interactive).
//
// Node positions are read from useNodeStore (live), matching the visualli.ai
// reference — containers follow dragged nodes in real-time every RAF frame.

import React, { useRef, useLayoutEffect } from 'react';
import { KLayer as Layer } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import KonvaContainer from './KonvaContainer';

export interface ContainerGroup {
  id: string;
  label?: string;
  nodeIds: string[];
  level: number;
}

export interface KonvaContainerLayerProps {
  /** Layout-snapshot nodes — used only as a seed for initial IDs. */
  nodes: FlatNode[];
  containers: ContainerGroup[];
  isDark?: boolean;
}

export default function KonvaContainerLayer({ nodes, containers, isDark = false }: KonvaContainerLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);

  // Subscribe to live store — updated every RAF frame during drag.
  // This is the same pattern used by KonvaEdgeLayer so containers and edges
  // both track dragged nodes in real-time.
  const storeNodes = useNodeStore(s => s.nodes);

  // batchDraw deps include storeNodes so the layer redraws whenever any node
  // position changes (including mid-drag RAF updates).
  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [containers, isDark, storeNodes]);

  if (containers.length === 0) return null;

  return (
    <Layer ref={layerRef} listening={false}>
      {containers.map(c => {
        // Read positions from live store — not from the layout snapshot
        const groupNodes = c.nodeIds
          .map(id => storeNodes.get(id))
          .filter((n): n is FlatNode => !!n);
        if (groupNodes.length === 0) return null;

        return (
          <KonvaContainer
            key={c.id}
            nodes={groupNodes}
            label={c.label}
            isDark={isDark}
          />
        );
      })}
    </Layer>
  );
}
