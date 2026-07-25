// ─── .visualli → FlatNode Converter ──────────────────────────────────────────
//
// Transforms the layer-based .visualli format into the flat Map<id, FlatNode>
// structure consumed by the canvas renderer.

import type { VisualliDocument } from '../types/document.js';
import type { VisualliLayer } from '../types/layer.js';
import type { FlatNode, NodeMap } from '../types/mindmap.js';
import { countLayersBeneath } from './visualliParser.js';
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

// ── Color Helpers ─────────────────────────────────────────────────────────────

const COLOR_PALETTE = [
  '#12C7D3', '#325E8C', '#8A70A6', '#F54A57', '#FF6C4D',
  '#F28C16', '#FFD347', '#12C7D3', '#7F7F7F', '#8D8D8D', '#12C7D3',
];

/**
 * Get a deterministic random color from palette based on node ID
 */
function getRandomColorForNode(nodeId: string): string {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use absolute value and modulo to get palette index
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
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
  nodeId: string,
  label: string,
  summary: string,
  layer: VisualliLayer,
  color: string,
  branchCount: number,
  x = 0,
  y = 0,
): FlatNode {
  return {
    id: nodeId,
    parentId: layer.parentNodeId ?? null,
    x,
    y,
    level: layer.level,
    title: label,
    description: summary,
    color,
    width: 200,
    height: 80,
    isExpanded: branchCount > 0,
    branchCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function convertLayerWithContainers(
  layer: VisualliLayer,
  doc: VisualliDocument,
): FlatNode[] {
  const PADDING = 80;
  const flatNodes: FlatNode[] = [];

  for (const node of layer.nodes) {
    const label = Array.isArray(node.data.label)
      ? (node.data.label as string[]).join(' ')
      : (node.data.label || 'Untitled');
    const branchCount = countLayersBeneath(doc, node.id);
    flatNodes.push(
      makeFlatNode(
        node.id, label, node.data.summary || '', layer,
        node.data.color || getRandomColorForNode(node.id), branchCount,
      ),
    );
  }

  const byId = new Map(flatNodes.map(n => [n.id, n]));
  const containerNodeIds = new Set<string>();
  const containerGroups = new Map<string, FlatNode[]>();

  for (const container of layer.containers) {
    const group = container.nodes.map(id => byId.get(id)).filter((n): n is FlatNode => !!n);
    if (!group.length) continue;
    container.nodes.forEach(id => containerNodeIds.add(id));
    const formation = ((container.data as unknown as Record<string, unknown> | undefined)?.['formation'] as string | undefined) ?? 'radial';
    applyFormation(group, formation);
    containerGroups.set(container.id, group);
  }

  const proxies: Proxy[] = [];
  for (const node of layer.nodes) {
    if (!containerNodeIds.has(node.id)) {
      proxies.push({ id: node.id, x: 0, y: 0, width: 200, height: 80 });
    }
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

  resolveNodeOverlaps(flatNodes);

  return flatNodes;
}

/**
 * Convert a single layer to an array of FlatNode objects.
 * Layout algorithm is determined by `layer.layout` (default: radial).
 */
export function convertLayerToFlatNodes(
  layer: VisualliLayer,
  doc: VisualliDocument,
): FlatNode[] {
  if ((layer.containers ?? []).length > 0) {
    return convertLayerWithContainers(layer, doc);
  }

  const flatNodes: FlatNode[] = [];

  for (const node of layer.nodes) {
    const label = Array.isArray(node.data.label)
      ? (node.data.label as string[]).join(' ')
      : (node.data.label || 'Untitled');
    const branchCount = countLayersBeneath(doc, node.id);
    flatNodes.push(
      makeFlatNode(
        node.id, label, node.data.summary || '', layer,
        node.data.color || getRandomColorForNode(node.id), branchCount,
        0, 0,
      ),
    );
  }

  if (flatNodes.length > 0) {
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

  resolveNodeOverlaps(flatNodes);

  return flatNodes;
}

/**
 * Convert an entire .visualli document to a flat NodeMap.
 * All layers are converted and a children-index is built for O(1) tree traversal.
 */
export function convertVisualliToFlatNodes(doc: VisualliDocument): NodeMap {
  const map: NodeMap = new Map();

  for (const layer of doc.layers.values()) {
    for (const node of convertLayerToFlatNodes(layer, doc)) {
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
 * @returns FlatNode array, or empty array if layer not found
 */
export function getNodesForLayer(doc: VisualliDocument, layerId: string): FlatNode[] {
  const layer = doc.layers.get(layerId);
  return layer ? convertLayerToFlatNodes(layer, doc) : [];
}
