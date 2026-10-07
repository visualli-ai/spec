// A layer's ideas: sized for their labels (the design system's idea.ts), placed
// where the file puts them (else by the SDK's layouts), and framed by the design
// system's fit to view (interaction.ts layerBounds / fitView).

import { describe, expect, it } from 'vitest';
import * as DS_IDEA from '../../../../../design-system/geometry/idea';
import * as DS_VIEW from '../../../../../design-system/geometry/interaction';
import * as DS_HULL from '../../../../../design-system/geometry/container';
import { approximateMeasure, calculateFitView, convertLayerToFlatNodes, labelGrowth, parseVisualliFile } from '../src/index';

const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
const docOf = (nodes: Array<{ id: string; label: string; x?: number; y?: number }>, extra: Record<string, unknown> = {}) =>
  parseVisualliFile([meta, JSON.stringify({
    type: 'layer', id: 'l0', level: 0, layout: 'radial', connections: [], containers: [], ...extra,
    nodes: nodes.map((n) => ({ id: n.id, position: { x: n.x ?? 0, y: n.y ?? 0 }, data: { label: n.label, summary: '' } })),
  })].join('\n'));

describe('idea size', () => {
  it('each idea is sized for its label; the centre of the root radial layer is the root', () => {
    const doc = docOf([{ id: 'r', label: 'How memory sticks', x: 0, y: 0 }, { id: 'a', label: 'Seeing the same idea as both a picture and a sentence makes it stick twice', x: 300, y: 0 }]);
    const [r, a] = convertLayerToFlatNodes(doc.rootLayer!, doc);
    expect(r!.kind).toBe('root');
    expect(a!.kind).toBe('node');
    for (const n of [r!, a!]) {
      const want = DS_IDEA.ideaSize(n.kind!, n.title, approximateMeasure, 1);
      expect([n.width, n.height]).toEqual([want.width, want.height]);
    }
    expect(a!.width).toBeGreaterThan(DS_IDEA.IDEA.baseWidth.node); // a long label widens its idea
  });
  it('a larger label scale grows the idea', () => {
    const doc = docOf([{ id: 'a', label: 'The forgetting curve and the spacing effect' }]);
    const small = convertLayerToFlatNodes(doc.rootLayer!, doc, { labelScale: 1 })[0]!;
    const big = convertLayerToFlatNodes(doc.rootLayer!, doc, { labelScale: 1.15 })[0]!;
    expect(big.width * big.height).toBeGreaterThan(small.width * small.height);
  });
  it('labels grow when zoomed out exactly like the design system', () => {
    for (const z of [0.1, 0.3, 0.5, 0.77, 1, 2, 5]) expect(labelGrowth(z)).toEqual(DS_IDEA.labelGrowth(z));
  });
});

describe('positions', () => {
  it("the file's positions are used as they are", () => {
    const doc = docOf([{ id: 'a', label: 'A', x: 0, y: 0 }, { id: 'b', label: 'B', x: 250, y: 0 }, { id: 'c', label: 'C', x: -202, y: 146 }]);
    expect(convertLayerToFlatNodes(doc.rootLayer!, doc).map((n) => [n.x, n.y])).toEqual([[0, 0], [250, 0], [-202, 146]]);
  });
  it('ideas all on one spot (a placeholder) are laid out by the SDK', () => {
    const doc = docOf([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]);
    const nodes = convertLayerToFlatNodes(doc.rootLayer!, doc);
    expect(new Set(nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)).size).toBe(3);
  });
});

describe('fit to view', () => {
  it('frames ideas and container hulls exactly like the design system', () => {
    const doc = docOf([{ id: 'a', label: 'Encoding', x: 0, y: -265 }, { id: 'b', label: 'The forgetting curve', x: 294, y: -133 }, { id: 'c', label: 'Spaced repetition', x: 294, y: 133 }]);
    const nodes = convertLayerToFlatNodes(doc.rootLayer!, doc);
    const half = (n: typeof nodes[number]) => ({ x: n.x, y: n.y, rx: n.width / 2, ry: n.height / 2 });
    const hull = DS_HULL.containerHull([half(nodes[1]!), half(nodes[2]!)])!;
    const want = DS_VIEW.fitView(DS_VIEW.layerBounds(nodes.map(half), [hull]), 1200, 800);
    const got = calculateFitView(nodes, 1200, 800, [{ nodeIds: ['b', 'c'] }]);
    expect(got).toEqual({ centerX: want.center.x, centerY: want.center.y, zoomLevel: want.scale });
  });
  it('never enlarges a layer beyond VIEW.fitMax', () => {
    const doc = docOf([{ id: 'a', label: 'One' }]);
    expect(calculateFitView(convertLayerToFlatNodes(doc.rootLayer!, doc), 4000, 4000).zoomLevel).toBe(DS_VIEW.VIEW.fitMax);
  });
});
