// ─── Spatial Index ────────────────────────────────────────────────────────────
//
// RBush-backed R-tree for O(log n) viewport culling queries.
// Wraps the `rbush` library with a typed, domain-specific interface.

import RBush from 'rbush';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface SpatialItem extends BoundingBox {
  nodeId: string;
}

export interface ISpatialIndex {
  insert(nodeId: string, bounds: BoundingBox): void;
  remove(nodeId: string, bounds: BoundingBox): void;
  update(nodeId: string, oldBounds: BoundingBox, newBounds: BoundingBox): void;
  query(bounds: BoundingBox): string[];
  clear(): void;
  size(): number;
  bulkLoad(items: Array<{ nodeId: string; bounds: BoundingBox }>): void;
}

/**
 * RBush-based spatial index for efficient viewport culling.
 *
 * - Insert / remove / update: O(log n)
 * - Query:  O(log n + k)  where k = result count
 * - Bulk load: O(n log n) — use instead of repeated inserts for initial load
 */
export class RBushSpatialIndex implements ISpatialIndex {
  private tree: RBush<SpatialItem>;
  private cache: Map<string, BoundingBox>;

  constructor() {
    this.tree  = new RBush<SpatialItem>();
    this.cache = new Map();
  }

  insert(nodeId: string, bounds: BoundingBox): void {
    this.tree.insert({ ...bounds, nodeId });
    this.cache.set(nodeId, bounds);
  }

  remove(nodeId: string, bounds: BoundingBox): void {
    this.tree.remove({ ...bounds, nodeId }, (a, b) => a.nodeId === b.nodeId);
    this.cache.delete(nodeId);
  }

  update(nodeId: string, oldBounds: BoundingBox, newBounds: BoundingBox): void {
    this.remove(nodeId, oldBounds);
    this.insert(nodeId, newBounds);
  }

  query(bounds: BoundingBox): string[] {
    return this.tree.search(bounds).map(item => item.nodeId);
  }

  clear(): void {
    this.tree.clear();
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  bulkLoad(items: Array<{ nodeId: string; bounds: BoundingBox }>): void {
    const rbushItems = items.map(({ nodeId, bounds }) => ({ ...bounds, nodeId }));
    this.tree.load(rbushItems);
    for (const { nodeId, bounds } of items) this.cache.set(nodeId, bounds);
  }

  /** Return the cached bounding box for a node (undefined if not indexed). */
  getBounds(nodeId: string): BoundingBox | undefined {
    return this.cache.get(nodeId);
  }
}
