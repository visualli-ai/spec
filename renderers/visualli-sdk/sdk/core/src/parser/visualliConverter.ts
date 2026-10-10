// ─── .visualli → FlatNode Converter ──────────────────────────────────────────
//
// Transforms the layer-based .visualli format into the flat Map<id, FlatNode>
// structure consumed by the canvas renderer.

import type { VisualliDocument } from '../types/document.js';
import type { VisualliLayer } from '../types/layer.js';
import type { FlatNode, NodeMap } from '../types/mindmap.js';
import { countLayersBeneath } from './visualliParser.js';
import { ideaColor } from '../theme/index.js';
import { approximateMeasure, ideaKindOf, ideaSize, type IdeaMeasure } from '../rendering/ideaSize.js';
import { blobProfile, shapeOfLevel } from '../rendering/nodeGeometry.js';
import { applyCircularLayout, calculateOptimalRadiusPercentage } from '../layout/circularLayout.js';
import { applyLinearHorizontalLayout, applyLinearVerticalLayout } from '../layout/linearLayout.js';

// ── Overlap Resolution ────────────────────────────────────────────────────────

function doNodesOverlap(n1: FlatNode, n2: FlatNode, padding = 20): boolean {
  return !(
    n1.x + n1.width / 2 + padding < n2.x - n2.width / 2 - padding ||
    n1.x - n1.width / 2 - padding > n2.x + n2.width / 2 + padding ||
    n1.y + n1.height / 2 + padding < n2.y - n2.height / 2 - padding ||
    n1.y - n1.height / 2 - padding > n2.y + n2.height / 2 + padding
  );
}

/** Iteratively push overlapping nodes apart using symmetric force separation. */
export function resolveNodeOverlaps(nodes: FlatNode[], maxIterations = 10): void {
  const padding = 150;

  for (let iter = 0; iter < maxIterations; iter++) {
    let any = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        if (!doNodesOverlap(n1, n2, padding)) continue;

        any = true;
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
          n2.x += n2.width / 2 + padding;
          continue;
        }

        const minDist = (n1.width + n2.width) / 2 + padding;
        if (dist < minDist) {
          const push = (minDist - dist) / 2;
          n1.x -= (dx / dist) * push;
          n1.y -= (dy / dist) * push;
          n2.x += (dx / dist) * push;
          n2.y += (dy / dist) * push;
        }
      }
    }
    if (!any) break;
  }
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface ConvertOptions {
  /** Measures label text in the idea face (the renderer's font engine); ideas are sized with the design system's
   *  ideaSize. Defaults to an approximation (half an em per character) where no font engine exists. */
  measure?: IdeaMeasure;
  /** Label scale (comfort: larger text is 1.15); ideas grow to fit the larger label. */
  labelScale?: number;
}

/** Whether a layer's ideas carry their own positions: every idea has one, and (with more than one idea) they aren't
 *  all on the same spot (a placeholder). Then the file's positions are used as they are. */
function hasFilePositions(layer: VisualliLayer): boolean {
  const ps = layer.nodes.map((n) => n.position);
  if (!ps.length || !ps.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))) return false;
  return ps.length === 1 || ps.some((p) => p!.x !== ps[0]!.x || p!.y !== ps[0]!.y);
}

// ── Container-formation Layout ────────────────────────────────────────────────

interface Proxy { id: string; x: number; y: number; width: number; height: number }

function applyFormation(nodes: FlatNode[], formation: string): void {
  if (nodes.length === 0) return;
  if (nodes.length === 1) { nodes[0].x = 0; nodes[0].y = 0; return; }
  if (formation === 'linear-horizontal' || formation === 'linear') {
    applyLinearHorizontalLayout(nodes, { centerX: 0, centerY: 0 });
  } else if (formation === 'linear-vertical') {
    applyLinearVerticalLayout(nodes, { centerX: 0, centerY: 0 });
  } else {
    const r = Math.max(250, nodes.length * 70);
    const step = (2 * Math.PI) / nodes.length;
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = r * Math.cos(i * step);
      nodes[i].y = r * Math.sin(i * step);
    }
  }
}

function containerBBox(nodes: FlatNode[], padding: number): { width: number; height: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.width / 2);
    maxX = Math.max(maxX, n.x + n.width / 2);
    minY = Math.min(minY, n.y - n.height / 2);
    maxY = Math.max(maxY, n.y + n.height / 2);
  }
  return { width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 };
}

function proxyLinearH(proxies: Proxy[], gap = 180): void {
  const total = proxies.reduce((s, p) => s + p.width, 0) + gap * (proxies.length - 1);
  let x = -total / 2;
  for (const p of proxies) { p.x = x + p.width / 2; p.y = 0; x += p.width + gap; }
}

function proxyLinearV(proxies: Proxy[], gap = 180): void {
  const total = proxies.reduce((s, p) => s + p.height, 0) + gap * (proxies.length - 1);
  let y = -total / 2;
  for (const p of proxies) { p.x = 0; p.y = y + p.height / 2; y += p.height + gap; }
}

function proxyRadial(proxies: Proxy[], radius = 500): void {
  if (proxies.length === 1) { proxies[0].x = 0; proxies[0].y = 0; return; }
  // Start at top (12 o'clock) for n>=3, horizontal for n=2 (matches circular layout)
  const startAngle = proxies.length === 2 ? 0 : -Math.PI / 2;
  const step = (2 * Math.PI) / proxies.length;
  for (let i = 0; i < proxies.length; i++) {
    const angle = startAngle + i * step;
    proxies[i].x = radius * Math.cos(angle);
    proxies[i].y = radius * Math.sin(angle);
  }
}

// ── Layer Conversion ──────────────────────────────────────────────────────────

function makeFlatNode(
  node: VisualliLayer['nodes'][number],
  layer: VisualliLayer,
  doc: VisualliDocument,
  /** Position among the layer's ideas (file order): missing colours cycle the topics by it, and the first idea of the root radial layer is the root. */
  siblingIndex: number,
  opts: ConvertOptions,
): FlatNode {
  const label = Array.isArray(node.data.label) ? (node.data.label as string[]).join(' ') : (node.data.label || 'Untitled');
  const branchCount = countLayersBeneath(doc, node.id);
  const kind = ideaKindOf(layer, siblingIndex);
  // Sized so the label wraps inside the idea's own blob (the design system's blobProfile).
  const size = ideaSize(kind, label, opts.measure ?? approximateMeasure, opts.labelScale ?? 1, blobProfile(shapeOfLevel(layer.level)));
  const { topic, custom } = ideaColor(node.data.color, siblingIndex);
  return {
    id: node.id,
    parentId: layer.parentNodeId ?? null,
    x: node.position?.x ?? 0,
    y: node.position?.y ?? 0,
    level: layer.level,
    title: label,
    description: node.data.summary || '',
    color: node.data.color ?? '',
    ...(topic ? { topic } : {}),
    ...(custom ? { custom } : {}),
    kind,
    width: size.width,
    height: size.height,
    isExpanded: branchCount > 0,
    branchCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function layoutLayerWithContainers(layer: VisualliLayer, flatNodes: FlatNode[]): void {
  const PADDING = 80;
  const byId = new Map(flatNodes.map((n: FlatNode) => [n.id, n]));
  const containerNodeIds = new Set<string>();
  const containerGroups = new Map<string, FlatNode[]>();

  for (const container of layer.containers) {
    const group = container.nodes.map((id: string) => byId.get(id)).filter((n: FlatNode | undefined): n is FlatNode => !!n);
    if (!group.length) continue;
    container.nodes.forEach((id: string) => containerNodeIds.add(id));
    const formation = ((container.data as unknown as Record<string, unknown> | undefined)?.['formation'] as string | undefined) ?? 'radial';
    applyFormation(group, formation);
    containerGroups.set(container.id, group);
  }

  const proxies: Proxy[] = [];
  for (const n of flatNodes) {
    if (!containerNodeIds.has(n.id)) proxies.push({ id: n.id, x: 0, y: 0, width: n.width, height: n.height });
  }
  for (const container of layer.containers) {
    const group = containerGroups.get(container.id);
    if (!group?.length) continue;
    const bbox = containerBBox(group, PADDING);
    proxies.push({ id: `__c__${container.id}`, x: 0, y: 0, width: bbox.width, height: bbox.height });
  }

  const layout = layer.layout || 'radial';
  if (layout === 'linear-horizontal') proxyLinearH(proxies, 180);
  else if (layout === 'linear-vertical') proxyLinearV(proxies, 180);
  else proxyRadial(proxies, 500);

  for (const proxy of proxies) {
    if (proxy.id.startsWith('__c__')) {
      const group = containerGroups.get(proxy.id.slice(5));
      group?.forEach(n => { n.x += proxy.x; n.y += proxy.y; });
    } else {
      const fn = byId.get(proxy.id);
      if (fn) { fn.x = proxy.x; fn.y = proxy.y; }
    }
  }
}

function layoutLayer(layer: VisualliLayer, flatNodes: FlatNode[]): void {
  const layout = layer.layout || 'radial';
  if (layout === 'linear-horizontal') {
    applyLinearHorizontalLayout(flatNodes, { centerX: 0, centerY: 0 });
  } else if (layout === 'linear-vertical') {
    applyLinearVerticalLayout(flatNodes, { centerX: 0, centerY: 0 });
  } else {
    const pct = calculateOptimalRadiusPercentage(flatNodes.length, 2000, 2000, 200, 30);
    applyCircularLayout(flatNodes, {
      radiusPercentage: pct,
      containerWidth: 2000,
      containerHeight: 2000,
      centerX: 0,
      centerY: 0,
    });
  }
}

/**
 * Convert a single layer to an array of FlatNode objects, each sized for its label
 * (the design system's idea.ts) and coloured by its colour rule (color.ts).
 * Positions: the file's own when its ideas carry them; otherwise the SDK lays the
 * layer out by `layer.layout` (default radial) and container formations.
 */
export function convertLayerToFlatNodes(
  layer: VisualliLayer,
  doc: VisualliDocument,
  opts: ConvertOptions = {},
): FlatNode[] {
  const flatNodes = layer.nodes.map((node, i) => makeFlatNode(node, layer, doc, i, opts));
  if (flatNodes.length === 0 || hasFilePositions(layer)) return flatNodes;
  for (const n of flatNodes) { n.x = 0; n.y = 0; }
  if ((layer.containers ?? []).length > 0) layoutLayerWithContainers(layer, flatNodes);
  else layoutLayer(layer, flatNodes);
  resolveNodeOverlaps(flatNodes);
  return flatNodes;
}

/**
 * Convert an entire .visualli document to a flat NodeMap.
 * All layers are converted and a children-index is built for O(1) tree traversal.
 */
export function convertVisualliToFlatNodes(doc: VisualliDocument, opts: ConvertOptions = {}): NodeMap {
  const map: NodeMap = new Map();

  for (const layer of doc.layers.values()) {
    for (const node of convertLayerToFlatNodes(layer, doc, opts)) {
      map.set(node.id, node);
    }
  }

  // Build children index
  for (const node of map.values()) {
    node.childrenIds = [];
    for (const candidate of map.values()) {
      if (candidate.parentId === node.id) node.childrenIds.push(candidate.id);
    }
  }

  return map;
}

/**
 * Get flat nodes for a specific layer only.
 *
 * @param doc - Parsed .visualli document
 * @param layerId - Layer ID to extract
 * @param opts - Text measurement and label scale for sizing ideas
 * @returns FlatNode array, or empty array if layer not found
 */
export function getNodesForLayer(doc: VisualliDocument, layerId: string, opts: ConvertOptions = {}): FlatNode[] {
  const layer = doc.layers.get(layerId);
  return layer ? convertLayerToFlatNodes(layer, doc, opts) : [];
}
