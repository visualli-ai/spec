// ─── Layout Utilities ─────────────────────────────────────────────────────────
//
// Collision detection and force-based positioning for MindMapNode trees.

import type { MindMapNode } from '../types/mindmap.js';

export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned bounding box for a node, expanded by a fixed padding. */
export function getNodeBounds(node: MindMapNode): CollisionBox {
  const baseWidth = Math.max(120, node.title.length * 8 + 40);
  const baseHeight = Math.max(40, 32 + 16);
  const padding = 20;
  return {
    x: node.x - baseWidth / 2 - padding,
    y: node.y - baseHeight / 2 - padding,
    width: baseWidth + padding * 2,
    height: baseHeight + padding * 2,
  };
}

export function checkCollision(box1: CollisionBox, box2: CollisionBox): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Iteratively resolve bounding-box collisions within each level.
 * Nodes are pushed apart symmetrically until no overlaps remain
 * or `maxIterations` is reached.
 */
export function resolveCollisions(nodes: MindMapNode[], maxIterations = 10): MindMapNode[] {
  const result = [...nodes];

  for (let iter = 0; iter < maxIterations; iter++) {
    let hasCollisions = false;

    const byLevel = result.reduce<Record<number, MindMapNode[]>>((acc, n) => {
      (acc[n.level] ??= []).push(n);
      return acc;
    }, {});

    for (const levelNodes of Object.values(byLevel)) {
      for (let i = 0; i < levelNodes.length; i++) {
        for (let j = i + 1; j < levelNodes.length; j++) {
          const n1 = levelNodes[i];
          const n2 = levelNodes[j];
          if (!checkCollision(getNodeBounds(n1), getNodeBounds(n2))) continue;

          hasCollisions = true;
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 1) {
            n2.x += 100;
          } else {
            const b1 = getNodeBounds(n1);
            const b2 = getNodeBounds(n2);
            const minSep = (b1.width + b2.width) / 2;
            const overlap = minSep - dist + 20;
            if (overlap > 0) {
              const move = overlap / 2;
              n1.x -= (dx / dist) * move;
              n1.y -= (dy / dist) * move;
              n2.x += (dx / dist) * move;
              n2.y += (dy / dist) * move;
            }
          }
        }
      }
    }

    if (!hasCollisions) break;
  }

  return result;
}

/**
 * Apply a lightweight repulsive force between same-level nodes that are
 * closer than 300 px, then resolve remaining collisions.
 */
export function optimizeLayout(nodes: MindMapNode[]): MindMapNode[] {
  const result = [...nodes];
  const iterations = 5;
  const repulsion = 1000;
  const damp = 0.8;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    result.forEach(n => forces.set(n.id, { x: 0, y: 0 }));

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const n1 = result[i];
        const n2 = result[j];
        if (n1.level !== n2.level) continue;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 0 || dist >= 300) continue;

        const force = repulsion / (dist * dist);
        const f1 = forces.get(n1.id)!;
        const f2 = forces.get(n2.id)!;
        f1.x -= (dx / dist) * force;
        f1.y -= (dy / dist) * force;
        f2.x += (dx / dist) * force;
        f2.y += (dy / dist) * force;
      }
    }

    result.forEach(n => {
      const f = forces.get(n.id)!;
      n.x += f.x * damp;
      n.y += f.y * damp;
    });
  }

  return resolveCollisions(result);
}
