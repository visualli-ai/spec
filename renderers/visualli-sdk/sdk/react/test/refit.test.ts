// The view when the canvas changes size (src/utils/refit.ts): as the design system's VisualMap keeps it, the fit
// follows the canvas, the reader's zoom stays relative to the fit and their pan stays the same on screen.
import { describe, expect, it } from 'vitest';
import { calculateFitView, convertLayerToFlatNodes, parseVisualliFile } from '@visualli/core';
import { refitView } from '../src/utils/refit';

const meta = JSON.stringify({ type: 'meta', version: '0.1.1', title: 't', created: 'x', lastModified: 'x' });
// A layer of five ideas (an AI-generated map).
const doc = parseVisualliFile([meta, JSON.stringify({
  type: 'layer', id: 'l0', level: 0, layout: 'radial', connections: [], containers: [],
  nodes: [{ id: 'r', position: { x: 0, y: 0 }, data: { label: 'The Honeybee Colony', summary: '' } }],
}), JSON.stringify({
  type: 'layer', id: 'l1', level: 1, layout: 'radial', connections: [], containers: [], parentLayerId: 'l0', parentNodeId: 'r',
  nodes: [['Castes & Roles', 0, -320], ['Annual Cycle', 304, -99], ['Hive Structure', 188, 259], ['Communication', -188, 259], ['Foraging Economy', -304, -99]]
    .map(([label, x, y], i) => ({ id: `n${i}`, position: { x, y }, data: { label, summary: '' } })),
})].join('\n'));
const nodes = convertLayerToFlatNodes(doc.layers.get('l1')!, doc);
/** Every idea's outline lies inside a `w` × `h` canvas showing `view`. */
const allInside = (view: { centerX: number; centerY: number; zoomLevel: number }, w: number, h: number) =>
  nodes.every((n) => Math.abs(n.x - view.centerX) * view.zoomLevel + (n.width / 2) * view.zoomLevel <= w / 2
    && Math.abs(n.y - view.centerY) * view.zoomLevel + (n.height / 2) * view.zoomLevel <= h / 2);

describe('the view when the canvas changes size', () => {
  const desk = calculateFitView(nodes, 1136, 900), phone = calculateFitView(nodes, 375, 812);
  it('a fitted view stays fitted (desktop → phone)', () => {
    expect(allInside(desk, 375, 812)).toBe(false); // the desktop fit spills off a phone
    const got = refitView(desk, desk, phone);
    expect(got.zoomLevel).toBeCloseTo(phone.zoomLevel, 12);
    expect(got.centerX).toBeCloseTo(phone.centerX, 9);
    expect(got.centerY).toBeCloseTo(phone.centerY, 9);
    expect(allInside(got, 375, 812)).toBe(true);
  });
  it('a zoomed and panned view keeps its zoom relative to the fit and its pan on screen', () => {
    const view = { centerX: desk.centerX + 40, centerY: desk.centerY - 25, zoomLevel: desk.zoomLevel * 2 };
    const got = refitView(view, desk, phone);
    expect(got.zoomLevel / phone.zoomLevel).toBeCloseTo(2, 12);
    expect((phone.centerX - got.centerX) * got.zoomLevel).toBeCloseTo((desk.centerX - view.centerX) * view.zoomLevel, 9);
    expect((phone.centerY - got.centerY) * got.zoomLevel).toBeCloseTo((desk.centerY - view.centerY) * view.zoomLevel, 9);
  });
});
