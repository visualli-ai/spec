// ─── Types Barrel Export ───────────────────────────────────────────────────────

export * from './mindmap.js';
export * from './meta.js';
export * from './layer.js';
export * from './document.js';
// Re-export schema types for external use
export {
  type Meta,
  type Node,
  type Container,
  type Layer,
  type Connection,
  type Extension,
  type VisualliSpec011,
  type VisualliFragment,
} from './schema.js';
