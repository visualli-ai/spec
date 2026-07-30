// ─── useViewportNodes ─────────────────────────────────────────────────────────
//
// Returns the subset of nodes currently visible in the viewport.
// Signature: useViewportNodes(nodes, levelFilter?, skipCulling?)
//
// When skipCulling=true (e.g. during layer transitions) all nodes are returned
// so the full layer is rendered when opacity ramps in.

import { useMemo, useRef } from 'react';
import type { FlatNode } from '@visualli/core';
import { RBushSpatialIndex, getViewportVisibleNodes } from '@visualli/core';
import { useViewportStore } from '../stores/useViewportStore';

const SPATIAL_INDEX_THRESHOLD = 200;

export function useViewportNodes(
  nodes: FlatNode[],
  levelFilter?: number,
  skipCulling = false,
  /** When true, skip culling so dragged nodes are always visible and the
   *  spatial index (keyed on layout positions) is not consulted. */
  isDragging = false,
): FlatNode[] {
  const { centerX, centerY, zoomLevel, canvasWidth, canvasHeight } = useViewportStore();

  const indexRef     = useRef<RBushSpatialIndex | null>(null);
  const nodesHashRef = useRef<number>(0);
  const nodesHash    = nodes.length;

  if (nodesHash !== nodesHashRef.current) {
    nodesHashRef.current = nodesHash;
    indexRef.current = null; // rebuild below
  }

  return useMemo(() => {
    if (nodes.length === 0) return [];

    if (!indexRef.current && nodes.length >= SPATIAL_INDEX_THRESHOLD && !skipCulling && !isDragging) {
      indexRef.current = new RBushSpatialIndex();
      indexRef.current.bulkLoad(nodes.map(n => ({
        nodeId: n.id,
        bounds: { minX: n.x, minY: n.y, maxX: n.x + n.width, maxY: n.y + n.height },
      })));
    }

    return getViewportVisibleNodes({
      nodes,
      viewport: { centerX, centerY, zoomLevel, rotation: 0, visibleBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
      canvasWidth,
      canvasHeight,
      levelFilter,
      skipCulling,
      isDragging,
      spatialIndex: indexRef.current,
      spatialIndexThreshold: SPATIAL_INDEX_THRESHOLD,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, levelFilter, skipCulling, isDragging, centerX, centerY, zoomLevel, canvasWidth, canvasHeight]);
}
