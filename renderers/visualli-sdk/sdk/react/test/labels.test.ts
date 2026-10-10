// Idea labels follow the design system's labelLayout (geometry/idea.ts): grown for the zoom first, then wrapped inside
// the idea's own outline (blob.ts blobProfile) — each line as wide as the blob is at that line's height — so no line
// crosses the outline at any zoom.

import { describe, expect, it } from 'vitest';
import { approximateMeasure, blobProfile, ideaSize, labelLayout, lineWidthsInShape, shapeOfLevel, type IdeaKind } from '@visualli/core';
import { makeDesign } from '../src/design/design';
import { ideaLabelLayout } from '../src/design/drawing';

const d = makeDesign('light', { readableType: false, largerText: false, reducedMotion: false });
const LABELS: [IdeaKind, string, number][] = [
  ['root', 'Understand anything visually', 0],
  ['node', 'Discover how you learn', 0],
  ['node', 'Shaped by people who learn visually', 0],
  ['node', 'Bring anything', 1],
  ['node', 'The canvas takes its color', 3],
  ['node', 'Internationalization', 2],
];
const ZOOMS = [2, 1, 0.9, 0.8, 0.77, 0.6, 0.3];

describe('idea labels: grow, then wrap inside the blob (labelLayout + blobProfile)', () => {
  for (const [kind, title, level] of LABELS) {
    const profile = blobProfile(shapeOfLevel(level));
    const size = ideaSize(kind, title, approximateMeasure, d.labelScale, profile);
    const node = { kind, title, level, width: size.width, height: size.height };
    it(`${kind} "${title}" matches the design system at every zoom and every line fits the blob`, () => {
      for (const zoom of ZOOMS) {
        const sdk = ideaLabelLayout(node, d, zoom);
        const ds = labelLayout(kind, title, size, zoom, approximateMeasure, d.labelScale, profile);
        expect(sdk.lines).toEqual(ds.lines);
        expect(sdk.px).toBeCloseTo(ds.px, 6);
        const widths = lineWidthsInShape(sdk.lines.length, sdk.lineHeight, profile(size.rx, size.ry));
        sdk.lines.forEach((line, i) => expect(approximateMeasure(line, sdk.px)).toBeLessThanOrEqual(widths[i]! + 0.5));
      }
    });
  }
  it('lines near the top and bottom of a blob are narrower than the middle', () => {
    const profile = blobProfile(shapeOfLevel(0));
    const [a, b, c] = lineWidthsInShape(3, 30, profile(130, 96));
    expect(b!).toBeGreaterThan(a!);
    expect(b!).toBeGreaterThan(c!);
  });
});
