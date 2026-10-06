// Container conformance: hulls and name placement must be exactly the design
// system's (geometry/container.ts), compared against the vendored design-system/
// copy so drift on either side fails here.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as DS from '../../../../../design-system/geometry/container';
import { HULL, containerHull, labelCandidates, placeContainerLabel, connectorSamples, connectorGeometry, edgePath } from '../src/index';

const repo = resolve(__dirname, '../../../../..');
const read = (p: string) => readFileSync(p, 'utf8');

describe('container.ts is the design system, verbatim', () => {
  it('is byte-identical', () => {
    expect(read(resolve(__dirname, '../src/generated/geometry/container.ts'))).toBe(read(`${repo}/design-system/geometry/container.ts`));
  });
  it('re-exports the same constants', () => { expect(HULL).toEqual(DS.HULL); });
});

const centers = [{ x: -435, y: -30 }, { x: -145, y: 30 }, { x: 145, y: -30 }];
const ideaBoxes = [[-435, -30], [-145, 30], [145, -30], [435, 30]].map(([x, y]) => ({ x0: x - 100, x1: x + 100, y0: y - 74, y1: y + 74 }));

describe('hull', () => {
  it('pads the member centres by 150 / 125 with radius 48', () => {
    expect(containerHull(centers)).toEqual({ x0: -585, x1: 295, y0: -155, y1: 155, radius: 48 });
    expect(containerHull(centers)).toEqual(DS.containerHull(centers));
    expect(containerHull([])).toBeNull();
  });
});

describe('name placement', () => {
  const hull = containerHull(centers)!;
  const size = { w: 220, h: 46 };
  it('prefers bottom centre when it is clear', () => {
    expect(placeContainerLabel(hull, size, { ideas: ideaBoxes })).toMatchObject({ x: -145, y: 155, side: 'bottom' });
  });
  it('moves off an edge a connector crosses', () => {
    const crossing = [connectorSamples({ x: -145, y: 110 }, { x: -140, y: 300 }, { x: -135, y: 500 })];
    expect(placeContainerLabel(hull, size, { ideas: ideaBoxes, connectors: crossing }).side).toBe('top');
  });
  it('avoids names placed before it', () => {
    const first = placeContainerLabel(hull, size, { ideas: ideaBoxes });
    const box = { x0: first.x - 110, x1: first.x + 110, y0: first.y - 23, y1: first.y + 23 };
    const second = placeContainerLabel(hull, size, { ideas: ideaBoxes, labels: [box] });
    expect([second.x, second.y]).not.toEqual([first.x, first.y]);
  });
  it('matches the design system for every candidate set and obstacle mix', () => {
    for (const w of [120, 220, 400]) for (const h of [40, 56]) {
      expect(labelCandidates(hull, w, h)).toEqual(DS.labelCandidates(hull, w, h));
      const conn = [connectorSamples({ x: -500, y: 0 }, { x: 0, y: 200 }, { x: 500, y: 0 })];
      expect(placeContainerLabel(hull, { w, h }, { ideas: ideaBoxes, connectors: conn })).toEqual(DS.placeContainerLabel(hull, { w, h }, { ideas: ideaBoxes, connectors: conn }));
    }
  });
  it('samples the same cubic the connector draws (its ends and its bowed midpoint at t = .5 sit on the curve)', () => {
    const a = { x: 0, y: 0 }, b = { x: 400, y: 0 }, e = edgePath(a, b);
    const pts = connectorSamples(a, e.mid, b, 16);
    expect(pts[0]).toEqual(a); expect(pts[16]!.x).toBeCloseTo(b.x, 6);
    // the connector geometry's sample points equal the design system's
    const g = connectorGeometry({ x: 0, y: 0, width: 200, level: 1 } as never, { x: 500, y: 100, width: 200, level: 1 } as never);
    expect(connectorSamples(g.a, g.mid, g.b)).toEqual(DS.connectorSamples(g.a, g.mid, g.b));
  });
});

describe('every design-system rule module is carried verbatim', () => {
  const { readdirSync } = require('node:fs') as typeof import('node:fs');
  const files = readdirSync(`${repo}/design-system/geometry`).filter((f: string) => f.endsWith('.ts'));
  it.each(files)('%s', (f) => {
    expect(read(resolve(__dirname, '../src/generated/geometry', f))).toBe(read(`${repo}/design-system/geometry/${f}`));
  });
});
