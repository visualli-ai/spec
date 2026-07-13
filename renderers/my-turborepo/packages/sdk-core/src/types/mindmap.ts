// ─── Mindmap Core Types ────────────────────────────────────────────────────────

export interface MindMapNode {
  id: string;
  title: string;
  level: number;
  position: { x: number; y: number };
  children?: MindMapNode[];
  parent?: string;
  color?: string;
  relationshipLabel?: string;
}

/** Flat structure for performance-optimised storage (10K+ nodes). */
export interface FlatNode {
  // Identity
  id: string;
  parentId: string | null;
  /** IDs of child nodes for quick tree traversal */
  childrenIds?: string[];

  // Position (world coordinates)
  x: number;
  y: number;
  /** Alternative position format for compatibility */
  position?: { x: number; y: number };
  /** Depth in tree hierarchy */
  level: number;

  // Content
  title: string;
  description?: string;
  /** Label describing relationship to parent */
  relationshipLabel?: string;

  // Visual
  color: string;
  width: number;
  height: number;

  // Expansion state (for hierarchical reveal)
  /** Whether this node's children are visible */
  isExpanded?: boolean;

  // Metadata
  branchCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Map-based node storage for O(1) lookups. */
export type NodeMap = Map<string, FlatNode>;

/** Spatial bounds for RBush indexing. */
export interface SpatialBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  nodeId: string;
}

/** Viewport state for camera position and zoom. */
export interface ViewportState {
  centerX: number;
  centerY: number;
  zoomLevel: number;
  rotation: number;
  visibleBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/** Single-selection node state. */
export interface NodeSelection {
  selectedId: string | null;
}

/** Render configuration flags. */
export interface RenderConfig {
  renderMode: 'canvas' | 'simplified';
  qualityLevel: 'high' | 'medium' | 'low';
  cullingEnabled: boolean;
  fpsTarget: number;
  memoryLimit: number;
}

export interface MindMapData {
  nodes: MindMapNode[];
  connections: Connection[];
}

export interface Connection {
  from: string;
  to: string;
  level: number;
  label?: string;
}

export interface TopLevelConnection {
  from: string;
  to: string;
  label: string;
}

/** Complete mindmap configuration schema. */
export interface MindMapConfig {
  metadata: {
    id?: string;
    title: string;
    description?: string;
    version: string;
    created: string;
    lastModified: string;
  };
  nodes: MindMapNode[];
  topLevelConnections: TopLevelConnection[];
  settings?: {
    defaultColors?: {
      level0: string;
      level1: string;
      level2: string;
      level3: string;
      [key: `level${number}`]: string;
    };
    layout?: {
      nodeSpacing: number;
      levelSpacing: number;
    };
  };
}
