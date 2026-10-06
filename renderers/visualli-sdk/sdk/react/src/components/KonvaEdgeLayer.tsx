// ─── KonvaEdgeLayer ───────────────────────────────────────────────────────────
//
// One Konva <Shape> paints every visible connector. Geometry (endpoints, cubic
// curve, arrowhead) comes from the design system via connectorGeometry and is
// cached per connector until one of its two ideas moves or resizes.

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { KLayer as Layer, KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import { connectorGeometry, type FlatNode, type MindMapConnection } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { useFontsEpoch } from '../design/runtime';
import { drawConnector, prepareConnector, type PreparedConnector } from '../design/drawing';
import { stageViewRect } from './KonvaNodeLayer';

export interface KonvaEdgeLayerProps {
  nodes: FlatNode[];
  connections: MindMapConnection[];
  currentLevel?: number;
  /** @deprecated pass `design`; kept so existing callers still compile. */
  isDark?: boolean;
  /** Pass true while an idea is being dragged (connectors are always drawn then). */
  isDragging?: boolean;
  design?: Design;
}

const key = (n: FlatNode) => `${n.x},${n.y},${n.width},${n.level},${n.branchCount ?? 0}`;
const MARGIN = 80; // bow + arrowhead + label slack around the endpoints' box

export default function KonvaEdgeLayer({ connections, isDragging = false, design = DEFAULT_DESIGN }: KonvaEdgeLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const fonts = useFontsEpoch();
  // Live positions: connectors follow dragged ideas.
  const storeNodes = useNodeStore((s) => s.nodes);
  const cache = useRef(new Map<string, { k: string; g: PreparedConnector }>());

  const edges = useMemo(() => {
    const out: Array<{ g: PreparedConnector; dashed: boolean; label?: string }> = [];
    const seen = new Set<string>();
    connections.forEach((conn, i) => {
      const src = storeNodes.get(conn.from);
      const tgt = storeNodes.get(conn.to);
      if (!src || !tgt) return;
      const id = `${conn.from}>${conn.to}#${i}`;
      seen.add(id);
      const k = `${key(src)}|${key(tgt)}`;
      let hit = cache.current.get(id);
      if (!hit || hit.k !== k) {
        hit = { k, g: prepareConnector(connectorGeometry(src, tgt, design.metrics.edgeGap)) };
        cache.current.set(id, hit);
      }
      out.push({ g: hit.g, dashed: conn.style === 'dashed', label: conn.label });
    });
    for (const id of cache.current.keys()) if (!seen.has(id)) cache.current.delete(id);
    return out;
  }, [connections, storeNodes, design.metrics.edgeGap]);

  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [edges, design, fonts, isDragging]);

  const sceneFunc = (ctx: { _context: CanvasRenderingContext2D }, shape: Konva.Shape) => {
    const stage = shape.getStage();
    if (!stage) return;
    const zoom = stage.scaleX() || 1;
    const v = stageViewRect(stage);
    const c = ctx._context;
    for (const e of edges) {
      const { a, b, mid } = e.g;
      const minX = Math.min(a.x, b.x, mid.x) - MARGIN, maxX = Math.max(a.x, b.x, mid.x) + MARGIN;
      const minY = Math.min(a.y, b.y, mid.y) - MARGIN, maxY = Math.max(a.y, b.y, mid.y) + MARGIN;
      if (maxX < v.minX || minX > v.maxX || maxY < v.minY || minY > v.maxY) continue;
      drawConnector(c, e.g, design, zoom, e.dashed, e.label);
    }
  };

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />
    </Layer>
  );
}
