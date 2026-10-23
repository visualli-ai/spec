// Keeping the reader's place when the document changes (src/utils/keepPlace.ts).
import { describe, expect, it } from 'vitest';
import { parseVisualliFile } from '@visualli/core';
import { keepPlace } from '../src/utils/keepPlace';
import type { NavStackEntry } from '../src/components/NavigationStack';

const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
const layer = (id: string, level: number, n: number, parent?: object) => JSON.stringify({
  type: 'layer', id, level, layout: 'radial', connections: [], containers: [], ...parent,
  nodes: Array.from({ length: n }, (_, i) => ({ id: `${id}-n${i}`, position: { x: i * 100, y: 0 }, data: { label: `Idea ${i}`, summary: '' } })),
});
const child = { parentLayerId: 'l0', parentNodeId: 'l0-n0' };
const build = (childNodes: number | null) =>
  parseVisualliFile([meta, layer('l0', 0, 1), ...(childNodes === null ? [] : [layer('l1', 1, childNodes, child)])].join('\n'));

/** The trail after the reader stepped from the root into l1, with labels and paints as the canvas sets them. */
const trailIn = (doc: ReturnType<typeof build>): NavStackEntry[] => [
  { layerId: 'l0', layer: doc.layers.get('l0')!, label: 'Home', paint: { topic: 'root' } as never },
  { layerId: 'l1', layer: doc.layers.get('l1')!, label: 'Castes', paint: { topic: 'teal' } as never },
];

describe('keeping the reader\'s place when the document changes', () => {
  it('keeps the child layer and the trail when nodes are added to that layer', () => {
    const before = build(3), after = build(6);
    const stack = trailIn(before);
    const kept = keepPlace(stack, after.layers)!;
    expect(kept.map((e) => e.layerId)).toEqual(['l0', 'l1']);
    expect(kept[1].layer).toBe(after.layers.get('l1')); // the NEW layer object
    expect(kept[1].layer.nodes).toHaveLength(6);
    expect(kept.map((e) => e.label)).toEqual(['Home', 'Castes']); // label and paint kept
    expect(kept.map((e) => e.paint)).toEqual(stack.map((e) => e.paint));
  });
  it('resets to the root when a layer in the trail no longer exists', () => {
    const before = build(3), after = build(null);
    expect(keepPlace(trailIn(before), after.layers)).toBeNull();
  });
  it('starts at the root on the first load (an empty trail)', () => {
    expect(keepPlace([], build(3).layers)).toBeNull();
  });
});
