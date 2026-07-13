// ─── MindMapConfig Utilities ──────────────────────────────────────────────────
//
// Helpers for creating and generating MindMapConfig objects (pure data, no UI).

import type { MindMapNode, MindMapConfig, TopLevelConnection } from '../types/mindmap.js';
import { LEVEL_COLORS, LAYOUT_SPACING, getColorForLevel } from '../constants/design.js';

export function createMindMapConfig(
  nodes: MindMapNode[],
  topLevelConnections: TopLevelConnection[],
  title = 'Untitled Mindmap',
): MindMapConfig {
  const now = new Date().toISOString();
  return {
    metadata: {
      title,
      description: `Interactive mindmap with ${nodes.length} nodes`,
      version: '1.0.0',
      created: now,
      lastModified: now,
    },
    nodes,
    topLevelConnections,
    settings: {
      defaultColors: {
        level0: LEVEL_COLORS.level0,
        level1: LEVEL_COLORS.level1,
        level2: LEVEL_COLORS.level2,
        level3: LEVEL_COLORS.level3,
      },
      layout: {
        nodeSpacing: LAYOUT_SPACING.nodeSpacing,
        levelSpacing: LAYOUT_SPACING.levelSpacing,
      },
    },
  };
}

// ── Sample Data Generator ─────────────────────────────────────────────────────

function generateId(prefix: string, level: number, index: number): string {
  return `${prefix}-l${level}-${index}`;
}

function generateLevelNodes(
  parentId: string | null,
  level: number,
  maxLevels: number,
  xOffset = 0,
  yOffset = 0,
): MindMapNode[] {
  if (level >= maxLevels) return [];

  const count = 5;
  const levelSpacing = 200;
  const nodeSpacing = 300;
  const nodes: MindMapNode[] = [];

  for (let i = 0; i < count; i++) {
    const nodeId = parentId
      ? generateId(`${parentId}-${i}`, level, i)
      : generateId('root', level, i);

    const x = xOffset + (i - (count - 1) / 2) * nodeSpacing;
    const y = yOffset + level * levelSpacing;

    const node: MindMapNode = {
      id: nodeId,
      title: `Level ${level} Node ${i + 1}`,
      level,
      position: { x, y },
      color: getColorForLevel(level),
      relationshipLabel: level > 0 ? 'child' : undefined,
      parent: parentId ?? undefined,
    };

    const children = generateLevelNodes(nodeId, level + 1, maxLevels, x, y + levelSpacing);
    if (children.length > 0) node.children = children;

    nodes.push(node);
  }

  return nodes;
}

/**
 * Generate a sample MindMapConfig with `maxLevels` of hierarchy.
 * Useful for testing and demos.
 */
export function generateSampleConfig(maxLevels = 9): MindMapConfig {
  const nodes = generateLevelNodes(null, 0, maxLevels, 0, 0);

  const topLevelConnections: TopLevelConnection[] = nodes.slice(0, -1).map((n, i) => ({
    from: n.id,
    to: nodes[i + 1].id,
    label: 'related to',
  }));

  return {
    metadata: {
      id: `mindmap-${Date.now()}`,
      title: 'Sample Mind Map',
      description: 'A sample mind map',
      version: '1.0.0',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
    nodes,
    topLevelConnections,
    settings: {
      defaultColors: {
        level0: LEVEL_COLORS.level0,
        level1: LEVEL_COLORS.level1,
        level2: LEVEL_COLORS.level2,
        level3: LEVEL_COLORS.level3,
        level4: LEVEL_COLORS.level4,
        level5: LEVEL_COLORS.level5,
        level6: LEVEL_COLORS.level6,
        level7: LEVEL_COLORS.level7,
        level8: LEVEL_COLORS.level8,
      },
      layout: {
        nodeSpacing: LAYOUT_SPACING.nodeSpacing,
        levelSpacing: LAYOUT_SPACING.levelSpacing,
      },
    },
  };
}
