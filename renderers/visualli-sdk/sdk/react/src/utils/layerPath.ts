// ─── A layer path a host asks for (layerPath) ────────────────────────────────
//
// The ids of the layers from the map's root to the one shown, as the design system's VisualMap takes them: the root may
// be left out, and the path stops at the first id that isn't a child layer of the one before it (a stale link or a
// changed map lands on the deepest layer that still exists).

import type { VisualliLayer } from '@visualli/core';

/** The valid path for `ids`: always starts at the root, each next layer opens from an idea of the one before. */
export function resolveLayerPath(layers: Map<string, VisualliLayer>, rootId: string, ids: readonly string[]): string[] {
  const want = ids[0] === rootId ? ids.slice(1) : ids;
  const out = [rootId];
  for (const id of want) {
    const parentId = out[out.length - 1]!, parent = layers.get(parentId), layer = layers.get(id);
    if (!parent || !layer || layer.parentLayerId !== parentId) break;
    if (!parent.nodes.some((n) => n.id === layer.parentNodeId)) break;
    out.push(id);
  }
  return out;
}
