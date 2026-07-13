import type { FlatNode, ViewportState } from '../types/index.js';
import { RBushSpatialIndex } from '../spatial/spatialIndex.js';
import { calculateViewportBounds } from '../viewport/viewportUtils.js';

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
    return filtered.filter(n =>
      n.x + n.width  >= bounds.minX &&
      n.x            <= bounds.maxX &&
      n.y + n.height >= bounds.minY &&
      n.y            <= bounds.maxY,
    );
  }

  if (spatialIndex) {
    const nodeIds = spatialIndex.query({
      minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY,
    });
    const idSet = new Set(nodeIds);
    return filtered.filter(n => idSet.has(n.id));
  }

  // Fallback to simple filter if no index provided but threshold exceeded
  return filtered.filter(n =>
    n.x + n.width  >= bounds.minX &&
    n.x            <= bounds.maxX &&
    n.y + n.height >= bounds.minY &&
    n.y            <= bounds.maxY,
  );
}
