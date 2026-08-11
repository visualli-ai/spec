// ─── Visualli Layer Types ──────────────────────────────────────────────────────
//
// These types extend the auto-generated schema types from bindings.
// They provide stricter runtime guarantees (required arrays) and SDK-specific fields.

import type { Layer, Node, Connection, Container } from './schema.js';

/** Alias to schema Node type for SDK consistency */
export type LayerNode = Node;

/** Alias to schema Connection type for SDK consistency */
export type LayerConnection = Connection;

/** Alias to schema Container type for SDK consistency */
export type LayerContainer = Container;

/**
 * SDK's stricter version of schema Layer.
 * - Makes nodes/connections/containers required (always arrays, even if empty)
 * - Adds SDK-specific `description` field
 * - Explicitly types key fields to avoid 'unknown' from schema's index signature
 */
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
  /** SDK-specific description field (not in schema) */
  description?: string;
  /** Spatial arrangement (inherits from schema) */
  layout?: 'radial' | 'linear-horizontal' | 'linear-vertical';
  /** Required array of nodes (schema has optional) */
  nodes: LayerNode[];
  /** Required array of connections (schema has optional) */
  connections: LayerConnection[];
  /** Required array of containers (schema has optional) */
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
