// The layer a host asks for (layerPath), as the design system's VisualMap reads it (src/utils/layerPath.ts).
import { describe, expect, it } from 'vitest';
import { parseVisualliFile } from '@visualli/core';
import { resolveLayerPath } from '../src/utils/layerPath';

const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
const layer = (id: string, level: number, parent?: object) => JSON.stringify({
  type: 'layer', id, level, layout: 'radial', connections: [], containers: [], ...parent,
  nodes: [0, 1].map((i) => ({ id: `${id}-n${i}`, position: { x: i * 100, y: 0 }, data: { label: `Idea ${i}`, summary: '' } })),
});
// l0 (root) → l1 (from l0-n0) → l2 (from l1-n1); l1b also opens from l0-n1.
const doc = parseVisualliFile([
  meta,
  layer('l0', 0),
  layer('l1', 1, { parentLayerId: 'l0', parentNodeId: 'l0-n0' }),
  layer('l2', 2, { parentLayerId: 'l1', parentNodeId: 'l1-n1' }),
  layer('l1b', 1, { parentLayerId: 'l0', parentNodeId: 'l0-n1' }),
].join('\n'));

describe('the layer path a host asks for', () => {
  it('keeps a full path from the root', () => {
    expect(resolveLayerPath(doc.layers, 'l0', ['l0', 'l1', 'l2'])).toEqual(['l0', 'l1', 'l2']);
  });
  it('adds the root when it is left out', () => {
    expect(resolveLayerPath(doc.layers, 'l0', ['l1', 'l2'])).toEqual(['l0', 'l1', 'l2']);
  });
  it('is the root alone for an empty path', () => {
    expect(resolveLayerPath(doc.layers, 'l0', [])).toEqual(['l0']);
  });
  it('stops at a layer that no longer exists', () => {
    expect(resolveLayerPath(doc.layers, 'l0', ['l1', 'gone', 'l2'])).toEqual(['l0', 'l1']);
  });
  it('stops at a layer that does not open from the one before it', () => {
    expect(resolveLayerPath(doc.layers, 'l0', ['l1b', 'l2'])).toEqual(['l0', 'l1b']);
    expect(resolveLayerPath(doc.layers, 'l0', ['l2'])).toEqual(['l0']);
  });
});
