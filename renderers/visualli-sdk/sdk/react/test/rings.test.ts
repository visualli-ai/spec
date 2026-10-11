// Depth rings as drawn: each ring's halo (fill) at RINGS[i].opacity and its outline at RINGS[i].strokeOpacity (full
// strength), so the "there is more inside" cue reads at 3:1 — the design system's rule, not one alpha for both.
import { describe, expect, it, vi } from 'vitest';
import { RINGS, type FlatNode } from '@visualli/core';
import { makeDesign } from '../src/design/design';
import { drawIdea, IDLE } from '../src/design/drawing';

vi.stubGlobal('Path2D', class { constructor(public d?: string) {} });

/** A 2D context that records globalAlpha at every fill and stroke of a Path2D (rings and body). */
function recorder() {
  const calls: { op: 'fill' | 'stroke'; alpha: number }[] = [];
  const state: Record<string, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'fill' || k === 'stroke') return (p?: unknown) => { if (p) calls.push({ op: k, alpha: t.globalAlpha as number }); };
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'measureText') return (s: string) => ({ width: s.length * 10 });
      return () => {};
    },
    set(t, k: string, v) { t[k] = v; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const node = { id: 'a', parentId: null, x: 0, y: 0, level: 1, title: 'Bring anything', color: '', topic: 'teal', width: 240, height: 178, branchCount: 3, kind: 'node' } as unknown as FlatNode;

describe('depth rings', () => {
  it.each([false, true])('halo at opacity, outline at strokeOpacity (dimmed: %s)', (dimmed) => {
    const { ctx, calls } = recorder();
    const dimOpacity = 0.4, base = dimmed ? dimOpacity : 1;
    drawIdea(ctx, node, makeDesign('light', { readableType: false, largerText: false, reducedMotion: false }), 1, { ...IDLE, dimmed }, { shadows: false, dimOpacity });
    const rings = calls.slice(0, RINGS.length * 2); // outermost first: fill, stroke per ring; then the body
    const expected = [...RINGS].reverse().flatMap((r) => [{ op: 'fill', alpha: base * r.opacity }, { op: 'stroke', alpha: base * r.strokeOpacity }]);
    rings.forEach((c, i) => { expect(c.op).toBe(expected[i]!.op); expect(c.alpha).toBeCloseTo(expected[i]!.alpha, 10); });
    for (const r of RINGS) expect(r.strokeOpacity).toBe(1);
  });
});
