// ─── Core .visualli Document ───────────────────────────────────────────────────

import type { VisualliMeta } from './meta.js';
import type { VisualliLayer } from './layer.js';

/** Parsed .visualli document structure. */
export interface VisualliDocument {
  meta: VisualliMeta;
  /** Keyed by layer ID */
  layers: Map<string, VisualliLayer>;
  /** Quick lookup by level */
  layersByLevel: Map<number, VisualliLayer[]>;
  /** The level-0 layer */
  rootLayer: VisualliLayer | null;
}
