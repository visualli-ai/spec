import type { VisualliDocument, VisualliLayer, FlatNode, Connection } from '../types/index.js';
import { ZOOM_MAX, ZOOM_NAV_OUT_THRESHOLD } from '../constants/performanceConstants.js';

// ── Connection helpers ────────────────────────────────────────────────────────

/**
 * Returns all top-level connections that originate from the given layer.
 * A "top-level connection" links two nodes that both live in `layerId`.
 */
export function getConnectionsForLayer(
  doc: VisualliDocument,
  layerId: string,
): Connection[] {
  const layer = doc.layers.get(layerId);
  if (!layer) return [];
  // LayerConnection has from/to as well (mapped from the source schema)
  return (layer.connections ?? []).map(c => ({
    from: (c as unknown as { from?: string; sourceId?: string }).from
      ?? (c as unknown as { sourceId?: string }).sourceId
      ?? '',
    to: (c as unknown as { to?: string; targetId?: string }).to
      ?? (c as unknown as { targetId?: string }).targetId
      ?? '',
    level: layer.level,
    label: (c as unknown as { label?: string }).label,
  } satisfies Connection));
}

/**
 * Given a node in the current layer, returns the child layer (if any) that the
 * node "owns" — i.e. the node is the entry-point into that child layer.
 */
export function getChildLayerForNode(
  doc: VisualliDocument,
  nodeId: string,
  currentLayerId: string,
): VisualliLayer | null {
  // Walk all layers looking for one whose `parentNodeId` matches
  for (const [, layer] of doc.layers) {
    if (layer.parentLayerId === currentLayerId && layer.parentNodeId === nodeId) {
      return layer;
    }
  }
  return null;
}

/**
 * Returns the layer to navigate INTO when double-clicking `nodeId` in `currentLayerId`.
 * Returns null when the node has no child layer.
 */
export function getLayerForNavigation(
  doc: VisualliDocument,
  nodeId: string,
  currentLayerId: string,
): VisualliLayer | null {
  return getChildLayerForNode(doc, nodeId, currentLayerId);
}

// ── Viewport fitting math ─────────────────────────────────────────────────────

export interface FitResult {
  centerX: number;
  centerY: number;
  zoomLevel: number;
}

/**
 * Calculates the zoom level needed to fit all `nodes` inside a canvas of
 * `(canvasWidth, canvasHeight)`.
 *
 * @param paddingFraction - Fractional padding on each side (0.15 = 15%).
 *   Pixel-padding variant still available when a value >=1 is passed.
 */
export function calculateFitZoom(
  nodes: FlatNode[],
  canvasWidth: number,
  canvasHeight: number,
  padding = 0.15,
): number {
  if (nodes.length === 0) return 1;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    // Use the actual node boundaries (center +/- half-width/height)
    minX = Math.min(minX, n.x - n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  }

  const rawW = maxX - minX;
  const rawH = maxY - minY;

  // Minimum spread — single isolated node should appear comfortably
  // Matches visualli.ai's spread logic for single nodes
  const spreadW = nodes.length === 1 ? Math.max(rawW, 600) : rawW;
  const spreadH = nodes.length === 1 ? Math.max(rawH, 400) : rawH;

  const zoomX = (canvasWidth * (1 - padding)) / spreadW;
  const zoomY = (canvasHeight * (1 - padding)) / spreadH;

  const z = Math.min(zoomX, zoomY);

  // Scale back 20% so nodes aren't edge-to-edge, clamp to at least
  // ZOOM_NAV_OUT_THRESHOLD so arriving at the layer never immediately
  // re-triggers the zoom-out transition.
  return Math.max(z * 0.80, ZOOM_NAV_OUT_THRESHOLD);
}

/**
 * Calculates the world-space center point that puts all `nodes` in the middle
 * of the viewport. Matches the visualli.ai `calculateFitCenter` approach:
 * uses bounding-box midpoint rather than centroid so the layout is always
 * geometrically centred.
 */
export function calculateFitCenter(nodes: FlatNode[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

// ── Container helpers ────────────────────────────────────────────────────────

// Inline the container shape here to avoid a circular import with KonvaContainerLayer.
export interface ContainerGroupInfo {
  id: string;
  label?: string;
  nodeIds: string[];
  level: number;
}

/**
 * Returns the container groups for the given layer, normalising both the
 * nested-data format `{data:{label,formation}}` and the flat format `{label}`.
 */
export function getContainersForLayer(
  doc: VisualliDocument,
  layerId: string,
): ContainerGroupInfo[] {
  const layer = doc.layers.get(layerId);
  if (!layer) return [];
  return (layer.containers ?? []).map(c => {
    const raw = c as unknown as Record<string, unknown>;
    const label =
      (raw['label'] as string | undefined) ??
      ((raw['data'] as Record<string, unknown> | undefined)?.['label'] as string | undefined);
    return { id: c.id, label, nodeIds: (c.nodes ?? []) as string[], level: layer.level };
  });
}

/** Convenience: returns both center and zoom for a single `fitView` call. */
export function calculateFitView(
  nodes: FlatNode[],
  canvasWidth: number,
  canvasHeight: number,
): FitResult {
  const center = calculateFitCenter(nodes);
  const zoom   = calculateFitZoom(nodes, canvasWidth, canvasHeight);
  return { centerX: center.x, centerY: center.y, zoomLevel: zoom };
}

