import { describe, it, expect } from 'vitest';
import { MOTION, revealDelay, connectorDelay, revealTotal, bloomOffset, type FlatNode } from '@visualli/core';
import { RevealClock, HoverTweens, REVEAL_STAGGER_CAP, REVEAL_MAX_NODES, type Arrival, type EdgeArrival } from '../src/design/choreography';

const nodes = (n: number): FlatNode[] => Array.from({ length: n }, (_, i) => ({ id: `n${i}`, x: i === 0 ? 0 : 100 * i, y: i === 0 ? 0 : 50, width: 120, level: 1, title: `n${i}` } as unknown as FlatNode));
const arr = (): Arrival => ({ alpha: 1, scale: 1, dx: 0, dy: 0 });
const edge = (): EdgeArrival => ({ alpha: 1, draw: 1 });

describe('RevealClock (design-system motion.ts)', () => {
  it('ideas bloom in sibling order, staggered by reveal.stagger', () => {
    const c = new RevealClock(); const ns = nodes(4); c.start(ns, 3, false, 1000);
    const a = arr();
    expect(c.node('n0', 0, 0, 1000, a)).toBe(true); expect(a.alpha).toBe(0); expect(a.scale).toBeCloseTo(MOTION.reveal.fromScale);
    // idea 2 has not started until 2 * stagger
    c.node('n2', 200, 50, 1000 + revealDelay(2) - 1, a); expect(a.alpha).toBe(0);
    c.node('n2', 200, 50, 1000 + revealDelay(2) + MOTION.reveal.duration / 2, a); expect(a.alpha).toBeGreaterThan(0);
    // arrived: nothing to apply
    expect(c.node('n0', 0, 0, 1000 + MOTION.reveal.duration + 1, a)).toBe(false);
  });
  it('ideas start part-way toward the layer centre', () => {
    const c = new RevealClock(); const ns = nodes(3); c.start(ns, 0, false, 0);
    const a = arr(); c.node('n2', 200, 50, 0, a);
    const centre = { x: (0 + 200) / 2, y: 25 };
    const off = bloomOffset({ x: 200, y: 50 }, centre);
    expect(a.dx).toBeCloseTo(off.x); expect(a.dy).toBeCloseTo(off.y);
  });
  it('connectors start after the ideas and draw from source to target', () => {
    const c = new RevealClock(); c.start(nodes(4), 2, false, 0);
    const e = edge();
    c.edge(0, false, connectorDelay(0, 4) - 1, e); expect(e.alpha).toBe(0); expect(e.draw).toBe(0);
    c.edge(0, false, connectorDelay(0, 4) + MOTION.connector.draw / 2, e); expect(e.draw).toBeGreaterThan(0); expect(e.draw).toBeLessThan(1);
    c.edge(0, true, connectorDelay(0, 4) + MOTION.connector.draw / 2, e); expect(e.draw).toBe(1); // dashed fade instead
  });
  it('is active for the design system\'s revealTotal and no longer than its last connector', () => {
    const c = new RevealClock(); c.start(nodes(4), 1, false, 0);
    expect(c.active(revealTotal(4) - 1)).toBe(true);
    expect(c.active(Math.max(revealTotal(4), connectorDelay(0, 4) + MOTION.connector.draw) + 1)).toBe(false);
    c.stop();
  });
  it('compresses the stagger on large layers', () => {
    const c = new RevealClock(); c.start(nodes(REVEAL_MAX_NODES), 0, false, 0);
    expect(c.active(revealTotal(REVEAL_STAGGER_CAP) + 1)).toBe(false);
    const a = arr(); expect(c.node(`n${REVEAL_MAX_NODES - 1}`, 0, 0, revealDelay(REVEAL_STAGGER_CAP - 1) + MOTION.reveal.duration + 1, a)).toBe(false);
    c.stop();
  });
  it('layers beyond REVEAL_MAX_NODES fade in together instead of blooming', () => {
    const c = new RevealClock(); c.start(nodes(REVEAL_MAX_NODES + 1), 50, false, 0);
    const a = arr(); c.node('n7', 700, 50, MOTION.reduced.fade / 2, a);
    expect(a.alpha).toBeCloseTo(0.5); expect(a.scale).toBe(1);
    expect(c.active(MOTION.reduced.fade + 60)).toBe(false);
    c.stop();
  });
  it('compresses connectors too', () => {
    const c = new RevealClock(); c.start(nodes(100), 500, false, 0);
    expect(c.active(connectorDelay(REVEAL_STAGGER_CAP - 1, REVEAL_STAGGER_CAP) + MOTION.connector.draw + 1)).toBe(false);
    c.stop();
  });
  it('reduced motion: everything fades in together over reduced.fade, no bloom, no line drawing', () => {
    const c = new RevealClock(); c.start(nodes(5), 2, true, 0);
    const a = arr(), e = edge();
    c.node('n4', 400, 50, MOTION.reduced.fade / 2, a); expect(a.alpha).toBeCloseTo(0.5); expect(a.scale).toBe(1); expect(a.dx).toBe(0);
    c.edge(1, false, MOTION.reduced.fade / 2, e); expect(e.draw).toBe(1);
    expect(c.active(MOTION.reduced.fade + 60)).toBe(false);
    c.stop();
  });
});

describe('HoverTweens', () => {
  it('lifts over hover.duration and settles at 1; reversing continues from the current value', () => {
    const h = new HoverTweens();
    expect(h.set(new Set(['a']), false, 0)).toBe(true);
    expect(h.progress('a', 0).lift).toBe(0);
    expect(h.progress('a', MOTION.hover.duration / 2).ring).toBeGreaterThan(0);
    expect(h.progress('a', MOTION.hover.duration + 1).lift).toBe(1);
    h.set(new Set(['a']), false, 0); // unchanged
    h.set(new Set(), false, 1000);
    const mid = h.progress('a', 1000 + MOTION.hover.duration / 2).ring;
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(1);
    expect(h.progress('a', 1000 + MOTION.hover.duration + 1).lift).toBe(0);
  });
  it('snaps with reduced motion', () => {
    const h = new HoverTweens(); h.set(new Set(['a']), true, 0);
    expect(h.progress('a', 1).lift).toBe(1);
  });
});
