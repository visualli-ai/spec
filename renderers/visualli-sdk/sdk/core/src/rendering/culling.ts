import type { FlatNode, ViewportState } from '../types/index.js';
import { RBushSpatialIndex } from '../spatial/spatialIndex.js';
import { calculateViewportBounds } from '../viewport/viewportUtils.js';
import { nodeBounds } from './nodeGeometry.js';

export interface CullingOptions {
  nodes: FlatNode[];
  viewport: ViewportState;
  canvasWidth: number;
  canvasHeight: number;
  levelFilter?: number;
  skipCulling?: boolean;
  isDragging?: boolean;
  spatialIndex?: RBushSpatialIndex | null;
  spatialIndexThreshold?: number;
}

const DEFAULT_SPATIAL_INDEX_THRESHOLD = 200;

/**
 * True when anything drawn for the node touches the viewport. Nodes are drawn
 * CENTRED on (x, y) with rings and stroke around them, so the test uses the
 * node's real visual bounds (not a top-left rectangle).
 */
export function intersectsViewport(
  n: FlatNode,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  const b = nodeBounds(n);
  return b.maxX >= bounds.minX && b.minX <= bounds.maxX && b.maxY >= bounds.minY && b.minY <= bounds.maxY;
}

/**
 * Returns the subset of nodes currently visible in the viewport.
 * Framework-agnostic logic for culling and spatial indexing.
 */
export function getViewportVisibleNodes(options: CullingOptions): FlatNode[] {
  const {
    nodes,
    viewport,
    canvasWidth,
    canvasHeight,
    levelFilter,
    skipCulling = false,
    isDragging = false,
    spatialIndex,
    spatialIndexThreshold = DEFAULT_SPATIAL_INDEX_THRESHOLD,
  } = options;

  const filtered = levelFilter !== undefined
    ? nodes.filter(n => n.level === levelFilter)
    : nodes;

  if (filtered.length === 0) return [];

  // During transitions or drags show all nodes to avoid partial layer appearance
  if (skipCulling || isDragging) return filtered;

  const bounds = calculateViewportBounds(viewport, canvasWidth, canvasHeight);

  if (filtered.length < spatialIndexThreshold) {
    return filtered.filter(n => intersectsViewport(n, bounds));
  }

  if (spatialIndex) {
    const nodeIds = spatialIndex.query({
      minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY,
    });
    const idSet = new Set(nodeIds);
    return filtered.filter(n => idSet.has(n.id));
  }

  // Fallback to simple filter if no index provided but threshold exceeded
  return filtered.filter(n => intersectsViewport(n, bounds));
}
