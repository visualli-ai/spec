// ─── Linear Layout Algorithms ─────────────────────────────────────────────────
//
// Positions nodes in a straight line without overlap, with enough gap between
// node edges for edge-label text to render cleanly.
//
//   linear-horizontal  → left-to-right along X-axis
//   linear-vertical    → top-to-bottom along Y-axis

import type { FlatNode } from '../types/mindmap.js';

export interface LinearLayoutOptions {
  /** Logical node width (px). Default: 200 */
  nodeWidth?: number;
  /** Logical node height (px). Default: 80 */
  nodeHeight?: number;
  /** Gap between node edges for horizontal layout (px). Default: 180 */
  hGap?: number;
  /** Gap between node edges for vertical layout (px). Default: 220 */
  vGap?: number;
  /** World X of the layout midpoint. Default: 0 */
  centerX?: number;
  /** World Y of the layout midpoint. Default: 0 */
  centerY?: number;
}

/**
 * Arrange nodes in a horizontal row (shared Y, varying X).
 * Row is centred on (`centerX`, `centerY`).
 */
export function applyLinearHorizontalLayout(
  nodes: FlatNode[],
  options: LinearLayoutOptions = {},
): FlatNode[] {
  const { nodeWidth = 200, hGap = 180, centerX = 0, centerY = 0 } = options;

  if (nodes.length === 0) return nodes;

  if (nodes.length === 1) {
    nodes[0].x = centerX;
    nodes[0].y = centerY;
    return nodes;
  }

  const spacing = nodeWidth + hGap;
  const totalWidth = (nodes.length - 1) * spacing;
  const startX = centerX - totalWidth / 2;

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = startX + i * spacing;
    nodes[i].y = centerY;
  }

  return nodes;
}

/**
 * Arrange nodes in a vertical column (shared X, varying Y).
 * Column is centred on (`centerX`, `centerY`).
 */
export function applyLinearVerticalLayout(
  nodes: FlatNode[],
  options: LinearLayoutOptions = {},
): FlatNode[] {
  const { nodeHeight = 80, vGap = 220, centerX = 0, centerY = 0 } = options;

  if (nodes.length === 0) return nodes;

  if (nodes.length === 1) {
    nodes[0].x = centerX;
    nodes[0].y = centerY;
    return nodes;
  }

  const spacing = nodeHeight + vGap;
  const totalHeight = (nodes.length - 1) * spacing;
  const startY = centerY - totalHeight / 2;

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = centerX;
    nodes[i].y = startY + i * spacing;
  }

  return nodes;
}
