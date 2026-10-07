// Culling regression: ideas are drawn CENTRED on (x, y); the old test treated
// (x, y) as a top-left corner, so ideas peeking in from the right/bottom edge
// popped in late.

import { describe, expect, it } from 'vitest';
import { getViewportVisibleNodes, nodeBounds, RBushSpatialIndex, type FlatNode } from '../src/index';

const node = (id: string, x: number, y: number, extra: Partial<FlatNode> = {}): FlatNode => ({
  id, parentId: null, x, y, level: 1, title: id, color: '', width: 200, height: 80, createdAt: new Date(0), updatedAt: new Date(0), ...extra,
});

const viewport = (centerX: number, centerY: number, zoomLevel = 1) => ({ centerX, centerY, zoomLevel, rotation: 0, visibleBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } });

describe('viewport culling uses centred bounds', () => {
  // 1000x800 canvas at zoom 1 centred on the origin: world [-500, 500] x [-400, 400]
  const opts = { canvasWidth: 1000, canvasHeight: 800, viewport: viewport(0, 0) };

  it('keeps an idea whose centre is just outside the right edge but whose outline is inside', () => {
    const n = node('edge-right', 560, 0); // blob spans ~[460, 660]
    expect(getViewportVisibleNodes({ ...opts, nodes: [n] })).toHaveLength(1);
  });
  it('keeps an idea peeking in from the bottom', () => {
    const n = node('edge-bottom', 0, 460);
    expect(getViewportVisibleNodes({ ...opts, nodes: [n] })).toHaveLength(1);
  });
  it('keeps an idea peeking in from the left/top', () => {
    expect(getViewportVisibleNodes({ ...opts, nodes: [node('l', -560, 0), node('t', 0, -460)] })).toHaveLength(2);
  });
  it('culls ideas that are really outside', () => {
    expect(getViewportVisibleNodes({ ...opts, nodes: [node('far', 2000, 0), node('far2', 0, -2000)] })).toHaveLength(0);
  });
  it('rings extend the bounds', () => {
    const plain = nodeBounds(node('a', 0, 0));
    const ringed = nodeBounds(node('b', 0, 0, { branchCount: 3 }));
    expect(ringed.maxX).toBeGreaterThan(plain.maxX);
    expect(ringed.minX).toBeLessThan(plain.minX);
  });
  it('the spatial-index path agrees with the linear path', () => {
    const nodes = Array.from({ length: 400 }, (_, i) => node(`n${i}`, (i % 20) * 380 - 3000, Math.floor(i / 20) * 300 - 3000, { branchCount: i % 4 }));
    const idx = new RBushSpatialIndex();
    idx.bulkLoad(nodes.map((n) => ({ nodeId: n.id, bounds: nodeBounds(n) })));
    const linear = getViewportVisibleNodes({ ...opts, nodes, spatialIndexThreshold: 10_000 }).map((n) => n.id).sort();
    const indexed = getViewportVisibleNodes({ ...opts, nodes, spatialIndex: idx, spatialIndexThreshold: 1 }).map((n) => n.id).sort();
    expect(indexed).toEqual(linear);
    expect(linear.length).toBeGreaterThan(0);
  });
});
