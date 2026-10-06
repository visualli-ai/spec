// Container layout on the canvas: hulls from the design system, names placed
// clear of ideas and connectors, and the pill's look read from css/spec.css.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CANVAS_STYLE, HULL, type FlatNode } from '@visualli/core';
import { makeDesign } from '../src/design/design';
import { layoutContainers, measurePill, pillTextScale } from '../src/design/containers';

const d = makeDesign('light', { readableType: false, largerText: false, reducedMotion: false });
const node = (id: string, x: number, y: number): FlatNode => ({ id, x, y, width: 200, level: 1, branchCount: 0 } as unknown as FlatNode);
const nodes = new Map([node('half', -212, -165), node('ebb', 212, -165), node('penalty', 212, 165), node('fluency', -212, 165)].map((n) => [n.id, n] as const));

describe('container layout', () => {
  it('hull = design system padding and radius around the member centres', () => {
    const [c] = layoutContainers([{ id: 'g', label: 'What Ebbinghaus found', nodeIds: ['half', 'ebb'] }], nodes, [], d);
    expect(c!.hull).toEqual({ x0: -212 - HULL.padX, x1: 212 + HULL.padX, y0: -165 - HULL.padY, y1: -165 + HULL.padY, radius: HULL.radius });
  });
  it('name sits bottom-centre when clear, and moves to the top when a connector crosses the bottom', () => {
    const clear = layoutContainers([{ id: 'g', label: 'What Ebbinghaus found', nodeIds: ['half', 'ebb'] }], nodes, [], d)[0]!.pill!;
    expect([clear.x, clear.y, clear.side]).toEqual([0, -40, 'bottom']);
    const crossed = layoutContainers([{ id: 'g', label: 'What Ebbinghaus found', nodeIds: ['half', 'ebb'] }], nodes, [{ from: 'half', to: 'penalty' }], d)[0]!.pill!;
    expect([crossed.x, crossed.y, crossed.side]).toEqual([0, -290, 'top']);
  });
  it('two containers never share a spot', () => {
    const [a, b] = layoutContainers([
      { id: 'g1', label: 'Top row', nodeIds: ['half', 'ebb'] },
      { id: 'g2', label: 'Left column', nodeIds: ['half', 'fluency'] },
    ], nodes, [], d);
    const box = (p: { x: number; y: number; w: number; h: number }) => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 });
    const A = box(a!.pill!), B = box(b!.pill!);
    expect(A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0).toBe(true);
  });
  it('a container without a name draws only its hull', () => {
    expect(layoutContainers([{ id: 'g', nodeIds: ['half'] }], nodes, [], d)[0]!.pill).toBeNull();
  });
});

describe('pill style comes from css/spec.css', () => {
  const css = readFileSync(resolve(__dirname, '../../../../../design-system/css/spec.css'), 'utf8');
  it('size, box and colour tokens', () => {
    expect(css).toMatch(new RegExp(`font-size: calc\\(${CANVAS_STYLE.group.labelSize}px`));
    expect(CANVAS_STYLE.group).toMatchObject({ labelSize: 26, labelWeight: 700, labelFill: 'topic-stone', labelBorder: 'topic-stone-ring', labelInk: 'node-ink', labelMaxWidth: 420, contrastLabelBorder: 'line-strong' });
    expect(d.tokens[CANVAS_STYLE.group.labelFill]).toBe(d.tokens['topic-stone']);
  });
  it('text grows like idea labels when zoomed out (1 → 1.3), never shrinks', () => {
    expect(pillTextScale(1)).toBe(1); expect(pillTextScale(2)).toBe(1); expect(pillTextScale(0.5)).toBe(1.3);
    expect(measurePill('A', d, 1.3, null).h).toBeGreaterThan(measurePill('A', d, 1, null).h);
  });
});
