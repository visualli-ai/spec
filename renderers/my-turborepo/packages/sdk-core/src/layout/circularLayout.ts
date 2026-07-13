// ─── Circular Layout Algorithm ────────────────────────────────────────────────
//
// Positions nodes in a uniform circle with equal angular spacing.
// PATTERN : Uniform circular distribution (polar coordinates)
// SPACING : Equal angular intervals (2π/n)
// ORIGIN  : Configurable center (default 0, 0)
// RADIUS  : Configurable percentage of container (default 13.5%)

import type { FlatNode } from '../types/mindmap.js';

export interface CircularLayoutOptions {
  /** Radius as a fraction of the container's minimum dimension (0–1). Default: 0.135 */
  radiusPercentage?: number;
  /** Container width used to calculate absolute radius. Default: 2000 */
  containerWidth?: number;
  /** Container height used to calculate absolute radius. Default: 2000 */
  containerHeight?: number;
  /** World-space X of the circle centre. Default: 0 */
  centerX?: number;
  /** World-space Y of the circle centre. Default: 0 */
  centerY?: number;
}

/**
 * Apply circular layout to a set of nodes.
 * Mutates the `x` / `y` properties of each node and returns the same array.
 */
export function applyCircularLayout(
  nodes: FlatNode[],
  options: CircularLayoutOptions = {},
): FlatNode[] {
  const {
    radiusPercentage = 0.135,
    containerWidth = 2000,
    containerHeight = 2000,
    centerX = 0,
    centerY = 0,
  } = options;

  if (nodes.length === 0) return nodes;

  if (nodes.length === 1) {
    nodes[0].x = centerX;
    nodes[0].y = centerY;
    return nodes;
  }

  const radius = Math.min(containerWidth, containerHeight) * radiusPercentage;

  // n=2 → horizontal; n≥3 → start at 12 o'clock
  const startAngle = nodes.length === 2 ? 0 : -Math.PI / 2;
  const angleStep = (2 * Math.PI) / nodes.length;

  for (let i = 0; i < nodes.length; i++) {
    const angle = startAngle + i * angleStep;
    nodes[i].x = centerX + radius * Math.cos(angle);
    nodes[i].y = centerY + radius * Math.sin(angle);
  }

  return nodes;
}

/**
 * Calculate the minimum radius needed to prevent node boxes from overlapping.
 *
 * Uses the chord-length formula: `chord = 2r · sin(θ/2)`, solved for `r`.
 */
export function calculateMinimumRadius(
  nodeCount: number,
  nodeWidth = 200,
  nodePadding = 150,
): number {
  if (nodeCount <= 1) return 0;
  const angleStep = (2 * Math.PI) / nodeCount;
  const minChordLength = nodeWidth + nodePadding;
  return minChordLength / (2 * Math.sin(angleStep / 2));
}

/**
 * Calculate the optimal radius percentage for a given node count,
 * ensuring sufficient spacing for edge labels.
 *
 * @returns A value in [0.135, 0.45]
 */
export function calculateOptimalRadiusPercentage(
  nodeCount: number,
  containerWidth = 2000,
  containerHeight = 2000,
  nodeWidth = 200,
  nodePadding = 120,
): number {
  const minRadius = calculateMinimumRadius(nodeCount, nodeWidth, nodePadding);
  const minDimension = Math.min(containerWidth, containerHeight);
  return Math.min(0.45, Math.max(0.135, minRadius / minDimension));
}
