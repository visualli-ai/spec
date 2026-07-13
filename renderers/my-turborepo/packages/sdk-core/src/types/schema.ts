// ─── Schema-aligned Types (JSON-schema surface) ────────────────────────────────
//
// These mirror the .visualli JSON schema exactly and are the preferred types
// for serialisation / deserialisation boundaries.

import type { VisualliMeta } from './meta.js';
import type { VisualliExtension } from './extension.js';
import type { VisualliLayer, LayerNode, LayerConnection, LayerContainer } from './layer.js';

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
  config?: Record<string, unknown>;
  data?: unknown[];
}

export interface Node {
  id: string;
  position: { x: number; y: number };
  data: { title: string; label?: string; color?: string; [key: string]: unknown };
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

// Re-export domain types for convenience
export type {
  VisualliMeta,
  VisualliExtension,
  VisualliLayer,
  LayerNode,
  LayerConnection,
  LayerContainer,
};
