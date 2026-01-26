/**
 * Auto-generated type definitions for Visualli.
 * Source: visualli.schema.json
 */

export interface Meta {
  type: 'meta';
  version: string;
  title: string;
  created?: string;
  lastModified?: string;
}

export interface Extension {
  type: 'extension';
  id: string;
  config?: Record<string, any>;
  data?: any[];
}

export interface Node {
  id: string;
  position: { x: number; y: number };
  data: { title: string; label?: string; color?: string; [key: string]: any };
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Container {
  id: string;
  label: string;
  nodes: string[];
}

export interface Layer {
  type: 'layer';
  id: string;
  level: number;
  parentLayerId?: string;
  parentNodeId?: string;
  description?: string;
  nodes: Node[];
  connections: Connection[];
  containers: Container[];
}

export type VisualliFragment = Meta | Extension | Layer;
