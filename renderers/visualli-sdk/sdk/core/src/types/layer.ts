// ─── Visualli Layer Types ──────────────────────────────────────────────────────

export interface LayerNodePosition {
  x: number;
  y: number;
}

export interface LayerNodeData {
  /** Required display label */
  label: string;
  /** Required short description */
  summary: string;
  color?: string;
}

export interface LayerNode {
  id: string;
  position: LayerNodePosition;
  data: LayerNodeData;
}

export interface LayerConnectionData {
  label: string;
  style?: 'dashed' | 'solid';
}

export interface LayerConnection {
  id: string;
  /** Source Node ID */
  from: string;
  /** Target Node ID */
  to: string;
  data: LayerConnectionData;
}

export interface LayerContainerData {
  label: string;
  formation?: 'radial' | 'linear-horizontal' | 'linear-vertical';
  style?: 'dashed' | 'none';
}

export interface LayerContainer {
  id: string;
  /** List of Node IDs contained in this group */
  nodes: string[];
  data: LayerContainerData;
}

export interface VisualliLayer {
  type: 'layer';
  /** UUID of the layer */
  id: string;
  /** Hierarchy level (0 = root) */
  level: number;
  /** UUID of the parent layer */
  parentLayerId?: string;
  /** UUID of the specific node in parent layer */
  parentNodeId?: string;
  description?: string;
  /** Layout algorithm for this layer's nodes */
  layout?: 'radial' | 'linear-horizontal' | 'linear-vertical';
  nodes: LayerNode[];
  connections: LayerConnection[];
  containers: LayerContainer[];
}

/** Intermediate format for rendering – converts VisualliLayer to flat nodes. */
export interface VisualliRenderNode {
  id: string;
  x: number;
  y: number;
  title: string;
  summary: string;
  level: number;
  layerId: string;
  layerLevel: number;
  color: string;
  width: number;
  height: number;
  branchCount: number;
}

export interface VisualliRenderConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'dashed' | 'solid';
}
