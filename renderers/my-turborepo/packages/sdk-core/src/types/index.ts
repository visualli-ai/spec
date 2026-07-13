// ─── Types Barrel Export ───────────────────────────────────────────────────────

export * from './mindmap.js';
export * from './meta.js';
export * from './layer.js';
export * from './extension.js';
export * from './document.js';
// Re-export schema types, excluding names already exported from mindmap.ts
export {
  type Meta,
  type Extension,
  type Node,
  type Container,
  type Layer,
  type VisualliFragment,
  type VisualliMeta,
  type VisualliExtension,
  type VisualliLayer,
  type LayerNode,
  type LayerConnection,
  type LayerContainer,
} from './schema.js';
