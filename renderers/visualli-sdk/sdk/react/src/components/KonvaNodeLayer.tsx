// ─── KonvaNodeLayer ───────────────────────────────────────────────────────────
//
// One Konva <Shape> paints every visible idea. Culling uses the stage's live
// transform at draw time (so panning, which moves the stage directly without
// React state, never shows blank areas) and the idea's centred visual bounds
// (RBush above 200 ideas). Hit testing stays outside Konva (stage-level RBush).

import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { KLayer as Layer, KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import { RBushSpatialIndex, TEXT_LABEL_HIDE_BELOW_ZOOM, intersectsViewport, nodeBounds, type FlatNode } from '@visualli/core';
import { useNodeStore } from '../stores/useNodeStore';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { useFontsEpoch } from '../design/runtime';
import { IDLE, drawIdea, type IdeaState } from '../design/drawing';

/** Above this many visible ideas the idea drop shadow is skipped (it is the costliest canvas effect). */
const SHADOW_MAX_VISIBLE = 150;
const SPATIAL_INDEX_THRESHOLD = 200;

export interface KonvaNodeLayerProps {
  nodes?: FlatNode[];
  isTransitioning?: boolean;
  isDragging?: boolean;
  hoveredNodeId?: string | null;
  pressedNodeId?: string | null;
  selectedNodeId?: string | null;
  /** Idea with keyboard focus (accessible layer). */
  focusedNodeId?: string | null;
  design?: Design;
}

/** World-space rectangle currently visible in the stage. */
export function stageViewRect(stage: Konva.Stage) {
  const s = stage.scaleX() || 1;
  return { minX: -stage.x() / s, minY: -stage.y() / s, maxX: (stage.width() - stage.x()) / s, maxY: (stage.height() - stage.y()) / s };
}

export default function KonvaNodeLayer({
  nodes: propNodes,
  isDragging = false,
  hoveredNodeId = null,
  pressedNodeId = null,
  selectedNodeId = null,
  focusedNodeId = null,
  design = DEFAULT_DESIGN,
}: KonvaNodeLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const fonts = useFontsEpoch();
  const storeNodes = useNodeStore((s) => s.nodes);
  const nodes: FlatNode[] = useMemo(() => propNodes ?? Array.from(storeNodes.values()), [propNodes, storeNodes]);

  // Spatial index over visual bounds. Rebuilt only when the node set changes; while dragging we draw everything.
  const index = useMemo(() => {
    if (nodes.length < SPATIAL_INDEX_THRESHOLD || isDragging) return null;
    const idx = new RBushSpatialIndex();
    idx.bulkLoad(nodes.map((n) => ({ nodeId: n.id, bounds: nodeBounds(n) })));
    return idx;
  }, [nodes, isDragging]);
  const byId = useMemo(() => (index ? new Map(nodes.map((n) => [n.id, n])) : null), [index, nodes]);

  const highlighted = hoveredNodeId ?? selectedNodeId;
  const dimOthers = design.theme.startsWith('focus') && highlighted !== null;

  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [nodes, index, design, fonts, hoveredNodeId, pressedNodeId, selectedNodeId, focusedNodeId, isDragging]);

  const sceneFunc = (ctx: { _context: CanvasRenderingContext2D }, shape: Konva.Shape) => {
    const stage = shape.getStage();
    if (!stage) return;
    const zoom = stage.scaleX() || 1;
    const view = stageViewRect(stage);
    let visible: FlatNode[];
    if (isDragging) visible = nodes;
    else if (index && byId) visible = index.query(view).map((id) => byId.get(id)!).filter(Boolean);
    else visible = nodes.filter((n) => intersectsViewport(n, view));

    const c = ctx._context;
    const m = c.getTransform();
    const opt = { shadows: !isDragging && visible.length <= SHADOW_MAX_VISIBLE, labels: zoom >= TEXT_LABEL_HIDE_BELOW_ZOOM, k: Math.hypot(m.a, m.b) };
    const st: IdeaState = { ...IDLE };
    for (let i = 0; i < visible.length; i++) {
      const n = visible[i]!;
      st.hovered = n.id === hoveredNodeId;
      st.pressed = n.id === pressedNodeId;
      st.selected = n.id === selectedNodeId;
      st.focused = n.id === focusedNodeId;
      st.dimmed = dimOthers && n.id !== highlighted;
      drawIdea(c, n, design, zoom, st, opt);
    }
  };

  return (
    <Layer ref={layerRef} name="nodes" listening={false}>
      <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />
    </Layer>
  );
}
