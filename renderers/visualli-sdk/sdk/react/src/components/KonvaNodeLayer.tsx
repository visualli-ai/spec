// ─── KonvaNodeLayer ───────────────────────────────────────────────────────────
//
// Konva <Layer> that renders all visible FlatNodes.
// Uses viewport culling and passes external hover/pressed state to each node.

import React, { useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { KLayer as Layer } from '../konvaCompat';
import type Konva from 'konva';
import type { FlatNode } from '@visualli-sdk/core';
import { useViewportStore } from '../stores/useViewportStore';
import { useNodeStore } from '../stores/useNodeStore';
import { useViewportNodes } from '../hooks/useViewportNodes';
import KonvaNode from './KonvaNode';

export interface KonvaNodeLayerProps {
  nodes?: FlatNode[];
  isTransitioning?: boolean;
  isDragging?: boolean;
  hoveredNodeId?: string | null;
  pressedNodeId?: string | null;
}

export default function KonvaNodeLayer({
  nodes: propNodes,
  isTransitioning = false,
  isDragging = false,
  hoveredNodeId = null,
  pressedNodeId = null,
}: KonvaNodeLayerProps) {
  const layerRef  = useRef<Konva.Layer | null>(null);
  const zoomLevel = useViewportStore(s => s.zoomLevel);
  const storeNodes = useNodeStore(s => s.nodes);
  const allNodes: FlatNode[] = useMemo(
    () => propNodes ?? Array.from(storeNodes.values()),
    [propNodes, storeNodes],
  );
  const visibleNodes = useViewportNodes(allNodes, undefined, isTransitioning, isDragging);

  // Redraw synchronously before paint whenever visible content changes.
  // Tied to data deps so it does not fire on every parent re-render.
  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [visibleNodes, hoveredNodeId, pressedNodeId, isDragging, zoomLevel]);

  // Redraw when transition state toggles (opacity wrapper controls visibility,
  // but the canvas still needs to be current when it fades back in).
  useEffect(() => { layerRef.current?.batchDraw(); }, [isTransitioning]);

  return (
    <Layer ref={layerRef} name="nodes">
      {visibleNodes.map(n => (
        <KonvaNode
          key={n.id}
          node={n}
          zoomLevel={zoomLevel}
          isExternallyHovered={hoveredNodeId === n.id}
          isExternallyPressed={pressedNodeId === n.id}
          isDragging={isDragging}
        />
      ))}
    </Layer>
  );
}
