// ─── KonvaEdgeLayer ───────────────────────────────────────────────────────────
//
// Renders all edges for visible nodes.  An edge is only drawn when BOTH its
// source and target node are currently in the visible set.
//
// NOTE: Node positions are read from useNodeStore (live) so edges always follow
// dragged nodes.  The `nodes` prop is used only for initial viewport culling.

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { KLayer as Layer } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode, Connection } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import { useViewportStore } from '../stores/useViewportStore';
import { useViewportNodes } from '../hooks/useViewportNodes';
import KonvaEdge from './KonvaEdge';

export interface KonvaEdgeLayerProps {
  nodes: FlatNode[];
  connections: Connection[];
  currentLevel?: number;
  isDark?: boolean;
  /** Pass true while a node is being dragged to skip viewport culling. */
  isDragging?: boolean;
}

export default function KonvaEdgeLayer({
  nodes,
  connections,
  currentLevel,
  isDark = false,
  isDragging = false,
}: KonvaEdgeLayerProps) {
  const layerRef   = useRef<Konva.Layer | null>(null);
  const zoomLevel  = useViewportStore(s => s.zoomLevel);
  // Live node positions from the store — updated every RAF during drag
  const storeNodes = useNodeStore(s => s.nodes);
  // Viewport culling still uses the layout snapshot for performance;
  // during drag, culling is skipped so newly-moved nodes are always visible.
  const visibleNodes = useViewportNodes(nodes, currentLevel, false, isDragging);

  // Set of visible node IDs for O(1) culling
  const visibleSet = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);

  // Redraw before paint whenever visible edges change.
  // storeNodes must be included: edge endpoints read live positions from the store,
  // so when a node is dragged, the edge must redraw even though visibleSet is unchanged.
  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [connections, isDark, isDragging, visibleSet, storeNodes]);

  return (
    <Layer ref={layerRef} listening={false}>
      {connections.map((conn, idx) => {
        // Use live store positions so edges move with dragged nodes
        const src = storeNodes.get(conn.from);
        const tgt = storeNodes.get(conn.to);
        if (!src || !tgt) return null;
        if (!isDragging && !visibleSet.has(src.id) && !visibleSet.has(tgt.id)) return null;

        return (
          <KonvaEdge
            key={`${conn.from}-${conn.to}-${idx}`}
            sourceNode={src}
            targetNode={tgt}
            connection={conn}
            isDark={isDark}
            zoomLevel={zoomLevel}
          />
        );
      })}
    </Layer>
  );
}
