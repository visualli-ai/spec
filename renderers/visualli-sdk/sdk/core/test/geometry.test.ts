// Geometry conformance: the SDK must produce exactly what the design system's
// own functions produce, for every shape, size, ring count and angle. The
// design-system functions are imported from the vendored design-system/ folder
// (not from the SDK's generated copy) so drift on either side fails here.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as DS from '../../../../../design-system/geometry/blob';
import { BLOB_SHAPES as DS_SHAPES } from '../../../../../design-system/geometry/blobShapes';
import {
  BLOB_SHAPES, RINGS, blobPath, blobRadius, edgePath, arrowPath, shapeForLevel,
  connectorGeometry, nodeRadii, outlineRadius, ringsFor, shapeOfLevel, IDEA, ideaSize, approximateMeasure,
} from '../src/index';
import * as DS_IDEA from '../../../../../design-system/geometry/idea';

const repo = resolve(__dirname, '../../../../..');
const gen = resolve(__dirname, '../src/generated');
const read = (p: string) => readFileSync(p, 'utf8');

/** An idea `w` wide, its height as the design system sizes a short label (idea.ts: width × aspect). */
const H = (w: number) => w * IDEA.aspect;
const ANGLES = Array.from({ length: 72 }, (_, i) => (i * Math.PI * 2) / 72 - Math.PI);
const WIDTHS = [200, 248, 311, 480];

describe('generated geometry is the design system, verbatim', () => {
  it('blob.ts and blobShapes.ts are byte-identical', () => {
    expect(read(`${gen}/geometry/blob.ts`)).toBe(read(`${repo}/design-system/geometry/blob.ts`));
    expect(read(`${gen}/geometry/blobShapes.ts`)).toBe(read(`${repo}/design-system/geometry/blobShapes.ts`));
  });
  it('re-exports the same data', () => {
    expect(BLOB_SHAPES).toEqual(DS_SHAPES);
    expect(RINGS).toEqual(DS.RINGS);
  });
});

describe('outlines', () => {
  it.each(DS_SHAPES.map((_, i) => i))('shape %i: outline path matches for every size', (shape) => {
    for (const w of WIDTHS) {
      const { rx, ry } = nodeRadii({ width: w, height: H(w) });
      expect(blobPath(shape, rx, ry)).toBe(DS.blobPath(shape, rx, ry));
    }
  });
  it('level -> shape follows the design system rule: one shape for every idea (SHAPE.idea)', () => {
    for (let level = 0; level < 40; level++) {
      expect(shapeOfLevel(level)).toBe(DS.shapeForLevel(level));
      expect(shapeForLevel(level)).toBe(DS.shapeForLevel(level));
      expect(shapeOfLevel(level)).toBe(DS.SHAPE.idea);
    }
  });
  it('idea radii are half the idea size', () => {
    expect(nodeRadii({ width: 200, height: 148 })).toEqual({ rx: 100, ry: 74 });
  });
  it('ideas are sized exactly like the design system (idea.ts)', () => {
    const labels = ['Sleep', 'The forgetting curve', 'Seeing the same idea as both a picture and a sentence makes it stick twice', 'Pneumonoultramicroscopicsilicovolcanoconiosis explained in a very long title indeed, with more words than any idea should carry'];
    for (const kind of ['root', 'node', 'mini'] as const) for (const l of labels) for (const k of [1, 1.15])
      expect(ideaSize(kind, l, approximateMeasure, k)).toEqual(DS_IDEA.ideaSize(kind, l, approximateMeasure, k));
  });
});

describe('rings', () => {
  it.each([0, 1, 2, 3, 4, 9])('branchCount %i shows min(count, 3) rings, innermost first', (bc) => {
    const rings = ringsFor(bc);
    expect(rings).toEqual(DS.RINGS.slice(0, Math.min(bc, 3)));
    rings.forEach((r, i) => {
      expect(r.scale).toBe(DS.RINGS[i]!.scale);
      expect(r.rotate).toBe(DS.RINGS[i]!.rotate);
      expect(r.opacity).toBe(DS.RINGS[i]!.opacity);
      expect(r.width).toBe(DS.RINGS[i]!.width);
      expect(r.dash).toBe(DS.RINGS[i]!.dash);
    });
  });
});

describe('connectors', () => {
  // Expected endpoints are built from the design system's own functions: the
  // outline of the outermost visible ring (or the body), plus edge-gap.
  const expectedRadius = (level: number, width: number, bc: number, angle: number) => {
    const { rx, ry } = nodeRadii({ width, height: H(width) });
    const shape = DS.shapeForLevel(level);
    const rings = Math.min(bc, 3);
    if (rings === 0) return DS.blobRadius(shape, rx, ry, angle);
    const ring = DS.RINGS[rings - 1]!;
    return DS.blobRadius(shape, rx * ring.scale, ry * ring.scale, angle - (ring.rotate * Math.PI) / 180);
  };

  it('outline radius matches blobRadius for every shape, size, ring count and angle', () => {
    for (let level = 0; level < 6; level++)
      for (const width of WIDTHS)
        for (const bc of [0, 1, 2, 3])
          for (const a of ANGLES)
            expect(outlineRadius({ x: 0, y: 0, width, height: H(width), level, branchCount: bc }, a)).toBe(expectedRadius(level, width, bc, a));
  });

  it('endpoints sit edge-gap outside the real outline; curve and arrow come from edgePath/arrowPath', () => {
    let checked = 0;
    for (let level = 0; level < 6; level++)
      for (const bc of [0, 2, 3])
        for (const a of ANGLES) {
          const from = { x: 120, y: -40, width: 248, height: H(248), level, branchCount: bc };
          const to = { x: from.x + Math.cos(a) * 700, y: from.y + Math.sin(a) * 700, width: 311, height: H(311), level: (level + 1) % 6, branchCount: 3 - bc };
          const c = connectorGeometry(from, to);
          const theta = Math.atan2(to.y - from.y, to.x - from.x);
          const ra = expectedRadius(from.level, from.width, from.branchCount, theta) + DS_EDGE_GAP;
          const rb = expectedRadius(to.level, to.width, to.branchCount, theta + Math.PI) + DS_EDGE_GAP;
          const ea = { x: from.x + Math.cos(theta) * ra, y: from.y + Math.sin(theta) * ra };
          const eb = { x: to.x - Math.cos(theta) * rb, y: to.y - Math.sin(theta) * rb };
          expect(c.a).toEqual(ea);
          expect(c.b).toEqual(eb);
          const e = DS.edgePath(ea, eb);
          expect(c.d).toBe(e.d);
          expect(c.angle).toBe(e.angle);
          expect(c.mid).toEqual(e.mid);
          expect(c.arrow).toBe(DS.arrowPath(eb, e.angle));
          checked++;
        }
    expect(checked).toBe(6 * 3 * ANGLES.length);
  });

  it('re-exported helpers are the design system functions', () => {
    expect(edgePath({ x: 0, y: 0 }, { x: 300, y: 80 })).toEqual(DS.edgePath({ x: 0, y: 0 }, { x: 300, y: 80 }));
    expect(arrowPath({ x: 5, y: 5 }, 1.2)).toBe(DS.arrowPath({ x: 5, y: 5 }, 1.2));
    expect(blobRadius(2, 100, 74, 0.4)).toBe(DS.blobRadius(2, 100, 74, 0.4));
  });
});

// edge-gap token, read from the design system's tokens.css (independent of the SDK's generated copy)
const DS_EDGE_GAP = parseFloat(/--edge-gap:\s*([\d.]+)px/.exec(read(`${repo}/design-system/tokens/tokens.css`))![1]!);
