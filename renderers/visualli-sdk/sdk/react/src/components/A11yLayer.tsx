// ─── Accessible layer ─────────────────────────────────────────────────────────
//
// The canvas is a picture, so ideas are mirrored as a visually hidden DOM list:
// one button per visible idea (label, depth, "has more inside"), reachable with
// Tab and activated with Enter/Space exactly like a click. Focus is drawn on
// the canvas (the idea gets the spec's focus outline).
//
// Only ideas in view are mirrored (capped), so a 10k-idea map never creates a
// 10k-element DOM.

import React, { memo, useEffect, useMemo, useState } from 'react';
import { intersectsViewport, nodeBounds, type FlatNode } from '@visualli/core';
import { useViewportStore } from '../stores/useViewportStore';

const MAX_MIRRORED = 150;

export interface A11yLayerProps {
  nodes: FlatNode[];
  /** Accessible name of the list, e.g. the layer title. */
  label: string;
  hasChildLayer: (nodeId: string) => boolean;
  onActivate: (node: FlatNode) => void;
  onFocusNode: (nodeId: string | null) => void;
  /** Spoken when the layer changes. */
  announcement?: string;
}

export const A11yLayer = memo(function A11yLayer({ nodes, label, hasChildLayer, onActivate, onFocusNode, announcement }: A11yLayerProps) {
  const cx = useViewportStore((s) => s.centerX);
  const cy = useViewportStore((s) => s.centerY);
  const zoom = useViewportStore((s) => s.zoomLevel);
  const w = useViewportStore((s) => s.canvasWidth);
  const h = useViewportStore((s) => s.canvasHeight);

  // Debounce: wheel-zoom updates the store on every event.
  const [view, setView] = useState({ cx, cy, zoom, w, h });
  useEffect(() => {
    const t = setTimeout(() => setView({ cx, cy, zoom, w, h }), 120);
    return () => clearTimeout(t);
  }, [cx, cy, zoom, w, h]);

  const items = useMemo(() => {
    const halfW = view.w / 2 / view.zoom, halfH = view.h / 2 / view.zoom;
    const bounds = { minX: view.cx - halfW, maxX: view.cx + halfW, minY: view.cy - halfH, maxY: view.cy + halfH };
    const visible = nodes.filter((n) => intersectsViewport(n, bounds));
    // Keep the nearest ones when there are too many, then restore reading order (rows, then left to right).
    const picked = visible.length > MAX_MIRRORED
      ? visible.map((n) => ({ n, d: (n.x - view.cx) ** 2 + (n.y - view.cy) ** 2 })).sort((a, b) => a.d - b.d).slice(0, MAX_MIRRORED).map((e) => e.n)
      : visible;
    const row = (n: FlatNode) => Math.round(nodeBounds(n).minY / 150);
    return [...picked].sort((a, b) => row(a) - row(b) || a.x - b.x);
  }, [nodes, view]);

  return (
    <>
      <div className="vi-sr" role="list" aria-label={label}>
        {items.map((n) => (
          <div role="listitem" key={n.id}>
            <button
              type="button"
              data-node-id={n.id}
              aria-label={`${n.title}. Depth ${n.level + 1}.${hasChildLayer(n.id) ? ' Has more inside; press Enter to step inside.' : ''}`}
              onFocus={() => onFocusNode(n.id)}
              onBlur={() => onFocusNode(null)}
              onClick={() => onActivate(n)}
            />
          </div>
        ))}
      </div>
      <div className="vi-sr" role="status" aria-live="polite">{announcement}</div>
    </>
  );
});
