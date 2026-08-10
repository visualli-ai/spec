// ─── Mindmap Tree Utilities ───────────────────────────────────────────────────

import type { MindMapNode, TopLevelConnection } from '../types/mindmap.js';

/** Flatten a nested MindMapNode tree into a depth-first array. */
export function flattenNodes(nodes: MindMapNode[]): MindMapNode[] {
  const result: MindMapNode[] = [];
  const traverse = (list: MindMapNode[]) => {
    for (const n of list) {
      result.push(n);
      if (n.children) traverse(n.children);
    }
  };
  traverse(nodes);
  return result;
}

/**
 * Return nodes visible at the given zoom level.
 *
 * At lower zoom values only top-level nodes are shown; each 5% zoom increment
 * reveals one additional hierarchy level.
 */
export function getVisibleNodes(
  nodes: MindMapNode[],
  zoom: number,
  focusedNode?: string,
): MindMapNode[] {
  const flat = flattenNodes(nodes);

  if (focusedNode) {
    const focused = flat.find(n => n.id === focusedNode);
    if (focused) {
      return focused.children ? [focused, ...focused.children] : [focused];
    }
  }

  // Map zoom to max visible level (level 0 at ≤70%, +1 level per 5% increment)
  if (zoom <= 0.70) return flat.filter(n => n.level === 0);
  const maxLevel = Math.floor((zoom - 0.70) / 0.05);
  return flat.filter(n => n.level <= maxLevel);
}

/** Build parent→child connection pairs from the node tree. */
export function getNodeConnections(
  nodes: MindMapNode[],
): Array<{ from: MindMapNode; to: MindMapNode; label?: string }> {
  const flat = flattenNodes(nodes);
  const result: Array<{ from: MindMapNode; to: MindMapNode; label?: string }> = [];
  for (const n of flat) {
    if (!n.parent) continue;
    const parent = flat.find(p => p.id === n.parent);
    if (parent) result.push({ from: parent, to: n, label: n.relationshipLabel });
  }
  return result;
}

/** Resolve top-level cross-connections to node pairs. */
export function getTopLevelConnections(
  nodes: MindMapNode[],
  topLevelConnections: TopLevelConnection[],
): Array<{ from: MindMapNode; to: MindMapNode; label: string }> {
  const flat = flattenNodes(nodes);
  const result: Array<{ from: MindMapNode; to: MindMapNode; label: string }> = [];
  for (const conn of topLevelConnections) {
    const from = flat.find(n => n.id === conn.from);
    const to   = flat.find(n => n.id === conn.to);
    if (from && to) result.push({ from, to, label: conn.label ?? '' });
  }
  return result;
}

/** Euclidean distance between two world-space points. */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
