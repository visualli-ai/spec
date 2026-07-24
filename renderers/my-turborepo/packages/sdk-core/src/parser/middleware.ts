// ─── Middleware Types ──────────────────────────────────────────────────────────
//
// Defines the middleware system for transforming parsed JSONL data

/**
 * Raw node data from a single JSONL line before any transformation
 */
export type RawNodeData = Record<string, unknown>;

/**
 * Middleware function that can transform raw JSONL data
 * - Return the transformed node to continue the pipeline
 * - Return null to skip/filter this node
 * - Can mutate the input or return a new object
 */
export type ParserMiddleware = (rawData: RawNodeData) => RawNodeData | null;

/**
 * Middleware context with document state (for advanced use cases)
 */
export interface ParserContext {
  extensions: Map<string, unknown>;
  layers: Map<string, unknown>;
  meta: unknown | null;
}
