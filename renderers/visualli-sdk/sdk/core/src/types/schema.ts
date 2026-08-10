// ─── Schema-aligned Types (JSON-schema surface) ────────────────────────────────
//
// These types are imported from the auto-generated bindings package.
// The bindings are generated from visualli.schema.json via GitHub workflow.
// DO NOT manually define schema types here - they come from @visualli/bindings.

import type { VisualliMeta } from './meta.js';
import type { VisualliLayer, LayerNode, LayerConnection, LayerContainer } from './layer.js';

// ─── Import Generated Schema Types ────────────────────────────────────────────
// These are auto-generated from visualli.schema.json
import type {
  Meta,
  Node,
  Connection,
  Container,
  Layer,
  Extension,
  VisualliSpec011,
} from '@visualli/bindings';

// ─── Re-exports ────────────────────────────────────────────────────────────────
// Export the generated types from bindings
export type { Meta, Node, Connection, Container, Layer, Extension, VisualliSpec011 };

// Union type for JSONL fragments
export type VisualliFragment = Meta | Layer;

// Re-export domain types for convenience
export type {
  VisualliMeta,
  VisualliLayer,
  LayerNode,
  LayerConnection,
  LayerContainer,
};
