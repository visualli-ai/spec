import type { VisualliDocument, VisualliLayer, FlatNode, MindMapConnection } from '../types/index.js';
import { fitView, layerBounds, type FrameBox } from '../generated/geometry/interaction.js';
import { containerHull } from '../generated/geometry/container.js';

// ── Connection helpers ────────────────────────────────────────────────────────

/**
 * Returns all top-level connections that originate from the given layer.
 * A "top-level connection" links two nodes that both live in `layerId`.
 */
export function getConnectionsForLayer(
  doc: VisualliDocument,
  layerId: string,
): MindMapConnection[] {
  const layer = doc.layers.get(layerId);
  if (!layer) return [];
  // Convert schema LayerConnection to simplified mindmap MindMapConnection
  return layer.connections.map(c => ({
    from: c.from,
    to: c.to,
    level: layer.level,
    label: c.data?.label,
    style: c.data?.style === 'dashed' ? 'dashed' : 'solid',
  } satisfies MindMapConnection));
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
 * 
 */
export function getLayerForNavigation(
  doc: VisualliDocument,
  nodeId: string,
  currentLayerId: string,
): VisualliLayer | null {
  return getChildLayerForNode(doc, nodeId, currentLayerId);
}

// ── Fit to view ───────────────────────────────────────────────────────────────
//
// The design system's fit (geometry/interaction.ts → layerBounds / fitView): every
// idea at its real size with room around it, and every container hull with room for
// its name pill; never enlarging a layer beyond VIEW.fitMax.

export interface FitResult {
  centerX: number;
  centerY: number;
  zoomLevel: number;
}

/** The box a layer is framed by: its ideas (their real sizes) and the hulls of its `containers`. */
export function layerFrame(nodes: ReadonlyArray<FlatNode>, containers: ReadonlyArray<{ nodeIds: string[] }> = []): FrameBox {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hulls: FrameBox[] = [];
  for (const c of containers) {
    const hull = containerHull(c.nodeIds.flatMap((id) => { const n = byId.get(id); return n ? [{ x: n.x, y: n.y, rx: n.width / 2, ry: n.height / 2 }] : []; }));
    if (hull) hulls.push(hull);
  }
  return layerBounds(nodes.map((n) => ({ x: n.x, y: n.y, rx: n.width / 2, ry: n.height / 2 })), hulls);
}

/** The zoom that fits a layer's ideas (and container hulls) into a canvas of `canvasWidth` × `canvasHeight`. */
export function calculateFitZoom(nodes: FlatNode[], canvasWidth: number, canvasHeight: number, containers: ReadonlyArray<{ nodeIds: string[] }> = []): number {
  if (nodes.length === 0) return 1;
  return fitView(layerFrame(nodes, containers), canvasWidth, canvasHeight).scale;
}

/** The world point a fitted layer is centred on: the middle of its frame. */
export function calculateFitCenter(nodes: FlatNode[], containers: ReadonlyArray<{ nodeIds: string[] }> = []): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  const f = layerFrame(nodes, containers);
  return { x: (f.x0 + f.x1) / 2, y: (f.y0 + f.y1) / 2 };
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
 * Returns the container groups the given layer draws, normalising both the
 * nested-data format `{data:{label,formation}}` and the flat format `{label}`.
 */
export function getContainersForLayer(
  doc: VisualliDocument,
  layerId: string,
): ContainerGroupInfo[] {
  const layer = doc.layers.get(layerId);
  if (!layer) return [];
  
  // Defensive: ensure containers is an array
  const containers = layer.containers ?? [];
  if (!Array.isArray(containers)) return [];
  
  // A container whose style is 'none' groups ideas without a hull or a name (the design system draws nothing for it).
  return containers.filter(c => c.data?.style !== 'none').map(c => {
    // Schema Container has nested data.label structure
    const label = c.data?.label ?? c.id;
    return { id: c.id, label, nodeIds: c.nodes, level: layer.level };
  });
}

/** Fit to view: centre and zoom for a layer in one call (the design system's fitView). */
export function calculateFitView(
  nodes: FlatNode[],
  canvasWidth: number,
  canvasHeight: number,
  containers: ReadonlyArray<{ nodeIds: string[] }> = [],
): FitResult {
  if (nodes.length === 0) return { centerX: 0, centerY: 0, zoomLevel: 1 };
  const { scale, center } = fitView(layerFrame(nodes, containers), canvasWidth, canvasHeight);
  return { centerX: center.x, centerY: center.y, zoomLevel: scale };
}
