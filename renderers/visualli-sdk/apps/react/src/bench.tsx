// ─── Benchmark page ──────────────────────────────────────────────────────────
//
// Renders a synthetic .visualli document (1 root node -> a child layer with N
// nodes, some with nested layers so rings are drawn, some with connectors) and
// exposes a tiny API on window.__bench for scripts/bench.mjs:
//   __bench.ready            promise, resolves when the root layer is drawn
//   __bench.hubScreen()      screen position of the root node (to click it)
//   __bench.layerReady       promise factory, resolves on the next layer change
//   __bench.start()/stop()   requestAnimationFrame frame-time recorder
//
// Only the public @visualli/react API is used, so the same page benchmarks any
// version of the SDK (baseline vs. changed).

import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisualliCanvas, useViewportStore, useNodeStore } from '@visualli/react';
import { parseVisualliFile } from '@visualli/core';
import exampleString from '../../../../../examples/example.visualli?raw';
import exampleUrl from '../../../../../examples/example.visualli?url';

const params = new URLSearchParams(location.search);
const N = Number(params.get('n') ?? 500);
const THEME = params.get('theme') ?? 'light';
// ?doc=example renders docs/assets/example.visualli (used by scripts/screenshots.mjs).
const CONTROLS = (params.get('controls') ?? undefined) as 'top-right' | 'bottom-right' | undefined;
const USE_EXAMPLE = params.get('doc') === 'example';
// ?doc=file: the example loaded from its URL (visualliFile), as an embed does — the canvas renders before the file arrives.
const FROM_FILE = params.get('doc') === 'file';
// ?doc=noparent: a root with two differently coloured ideas, each with a child layer (the trail dot must match the clicked idea).
const NO_PARENT = params.get('doc') === 'noparent';
const COMFORT_FLAGS = (params.get('comfort') ?? '').split(',').filter(Boolean);
// ?comfort=readable,large,reduced
const COMFORT = { readableType: COMFORT_FLAGS.includes('readable'), largerText: COMFORT_FLAGS.includes('large'), reducedMotion: COMFORT_FLAGS.includes('reduced') };
const REVEAL = (params.get('reveal') ?? undefined) as 'gradual' | 'instant' | undefined;

// ── Synthetic document ───────────────────────────────────────────────────────

const WORDS = ['Evaporation', 'Rain', 'Glacier', 'Aquifer', 'Delta', 'Monsoon', 'Tide', 'Runoff', 'Fog', 'Spring'];
const COLORS = ['#a6f5d8', '#b7e7f3', '#fff699', '#a1c4fc', '#faada5', '#e0c8fe', '#ffcf9d'];
const uid = (p: string, i: number) => `${p}-${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`;

function buildNoParentDoc(): string {
  const l = (o: object) => JSON.stringify(o);
  const a = uid('node', 1), b = uid('node', 2);
  return [
    l({ type: 'meta', version: '0.1.1', title: 'noparent', created: 'x', lastModified: 'x' }),
    l({ type: 'layer', id: uid('layer', 0), level: 0, layout: 'linear-horizontal', connections: [], containers: [], nodes: [
      { id: a, position: { x: 0, y: 0 }, data: { label: 'Alpha', summary: 'first', color: '#faada5' } },
      { id: b, position: { x: 0, y: 0 }, data: { label: 'Beta', summary: 'second', color: '#a1c4fc' } }] }),
    l({ type: 'layer', id: uid('layer', 1), level: 1, layout: 'radial', parentLayerId: uid('layer', 0), parentNodeId: a, connections: [], containers: [], nodes: [{ id: uid('node', 11), position: { x: 0, y: 0 }, data: { label: 'Alpha child', summary: '', color: '#fff699' } }] }),
    l({ type: 'layer', id: uid('layer', 2), level: 1, layout: 'radial', parentLayerId: uid('layer', 0), parentNodeId: b, connections: [], containers: [], nodes: [{ id: uid('node', 12), position: { x: 0, y: 0 }, data: { label: 'Beta child', summary: '', color: '#a6f5d8' } }] }),
  ].join('\n');
}

function buildDoc(n: number): string {
  const lines: string[] = [];
  lines.push(JSON.stringify({ type: 'meta', version: '0.1.1', title: `bench-${n}`, created: '2026-01-01', lastModified: '2026-01-01' }));
  const rootLayer = uid('layer', 0), childLayer = uid('layer', 1), hub = uid('node', 0);
  lines.push(JSON.stringify({ type: 'layer', id: rootLayer, level: 0, layout: 'radial', parentLayerId: null, parentNodeId: null, connections: [], containers: [],
    nodes: [{ id: hub, position: { x: 0, y: 0 }, data: { label: 'Hub', summary: 'Benchmark root', color: COLORS[0] } }] }));

  const nodes = [], connections = [], extra: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = uid('node', i + 1);
    nodes.push({ id, position: { x: 0, y: 0 }, data: { label: `${WORDS[i % WORDS.length]} ${i}`, summary: 'Synthetic node', color: COLORS[i % COLORS.length] } });
    if (i > 0 && i % 5 === 0) {
      connections.push({ id: uid('conn', i), from: uid('node', i), to: id, data: { label: i % 10 === 0 ? 'flows to' : undefined, style: 'solid' } });
    }
    // Every 10th node gets a chain of nested layers (1..3 deep) so rings are drawn.
    if (i % 10 === 0) {
      const depth = (i / 10) % 3 + 1;
      let parentLayer = childLayer, parentNode = id;
      for (let d = 0; d < depth; d++) {
        const lid = uid('layer', 100000 + i * 4 + d), nid = uid('node', 5000000 + i * 4 + d);
        extra.push(JSON.stringify({ type: 'layer', id: lid, level: 2 + d, layout: 'radial', parentLayerId: parentLayer, parentNodeId: parentNode, connections: [], containers: [],
          nodes: [{ id: nid, position: { x: 0, y: 0 }, data: { label: 'Nested', summary: '', color: COLORS[d] } }] }));
        parentLayer = lid; parentNode = nid;
      }
    }
  }
  lines.push(JSON.stringify({ type: 'layer', id: childLayer, level: 1, layout: 'radial', parentLayerId: rootLayer, parentNodeId: hub, connections, containers: [], nodes }));
  return lines.concat(extra).join('\n');
}

// ── Frame recorder ───────────────────────────────────────────────────────────

let rec: { stamps: number[]; raf: number } | null = null;
function start() {
  const r = { stamps: [] as number[], raf: 0 };
  const tick = (t: number) => { r.stamps.push(t); r.raf = requestAnimationFrame(tick); };
  r.raf = requestAnimationFrame(tick);
  rec = r;
}
function stop() {
  if (!rec) return null;
  cancelAnimationFrame(rec.raf);
  const s = rec.stamps; rec = null;
  if (s.length < 3) return { frames: s.length, fps: 0, p95: 0, max: 0 };
  const dts = s.slice(1).map((t, i) => t - s[i]!).sort((a, b) => a - b);
  const total = s[s.length - 1]! - s[0]!;
  return { frames: s.length - 1, fps: ((s.length - 1) / total) * 1000, p95: dts[Math.floor(dts.length * 0.95)]!, max: dts[dts.length - 1]! };
}

// ── Mount ────────────────────────────────────────────────────────────────────

const layerResolvers: Array<(v: number) => void> = [];
let resolveReady: () => void = () => {};
const ready = new Promise<void>(r => { resolveReady = r; });

const t0 = performance.now();
const doc = parseVisualliFile(USE_EXAMPLE ? exampleString : NO_PARENT ? buildNoParentDoc() : buildDoc(N));
const buildMs = performance.now() - t0;

(window as unknown as { __bench: unknown }).__bench = {
  n: N, buildMs, ready,
  start, stop,
  hubScreen() {
    const s = useViewportStore.getState();
    const p = s.worldToScreen(0, 0);
    const el = document.querySelector('canvas')!.getBoundingClientRect();
    return { x: el.left + p.x, y: el.top + p.y };
  },
  /** Screen position of the idea with this title in the current layer (for hover / click tests). */
  nodeScreen(title: string) {
    for (const n of useNodeStore.getState().nodes.values()) {
      if (n.title !== title) continue;
      const p = useViewportStore.getState().worldToScreen(n.x, n.y);
      const el = document.querySelector('canvas')!.getBoundingClientRect();
      return { x: el.left + p.x, y: el.top + p.y };
    }
    return null;
  },
  canvasRect() { const r = document.querySelector('canvas')!.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
  nextLayerChange() { return new Promise<number>(r => layerResolvers.push(r)); },
  now: () => performance.now(),
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <VisualliCanvas
    {...(FROM_FILE ? { visualliFile: exampleUrl } : { preParsedVisualli: doc })}
    fontBaseUrl="/fonts"
    controlsPosition={CONTROLS}
    app
    // `theme` is the new prop; older SDK builds only know `isDark`.
    {...({ theme: THEME, comfort: COMFORT, reveal: REVEAL, isDark: THEME.endsWith('dark') || THEME === 'dark' } as Partial<React.ComponentProps<typeof VisualliCanvas>>)}
    style={{ width: '100vw', height: '100vh' }}
    onLayerChange={() => { const t = performance.now(); layerResolvers.splice(0).forEach(r => r(t)); }}
  />,
);
requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolveReady, 500)));
