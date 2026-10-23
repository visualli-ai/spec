// ─── Keeping the reader's place when the document changes ────────────────────
//
// SDK navigation plumbing, nothing new from the design system. When a host reloads the same map with new content, the
// reader stays on the layer they were on, with their trail, as long as every layer in the trail still exists.
// Depends only on the NavStackEntry shape and a layers map (doc.layers).

import type { VisualliLayer } from '@visualli/core';
import type { NavStackEntry } from '../components/NavigationStack';

/**
 * The trail for a new document: the same layer ids, each with the NEW layer object and its existing label and paint.
 * Returns null (reset to the root) for an empty trail or when any layer in it is missing from the new document.
 */
export function keepPlace(
  stack: NavStackEntry[],
  layers: ReadonlyMap<string, VisualliLayer>,
): NavStackEntry[] | null {
  if (stack.length === 0 || !stack.every((e) => layers.has(e.layerId))) return null;
  return stack.map((e) => ({ ...e, layer: layers.get(e.layerId)! }));
}
