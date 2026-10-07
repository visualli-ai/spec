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
import { HoverTweens, type RevealClock, type Arrival } from '../design/choreography';
import { useFrames } from './useFrames';

/** Above this many visible ideas the idea drop shadow is skipped (it is the costliest canvas effect).
 *  Pending upstream: an SDK performance adaptation, not yet a design-system rule. */
const SHADOW_MAX_VISIBLE = 150;
const SPATIAL_INDEX_THRESHOLD = 200;
/** Hover lifts are tweened for layers up to this many ideas; denser layers snap (every tween frame repaints the whole layer, and in a dense layer the pointer changes idea constantly). */
const HOVER_TWEEN_MAX_NODES = 150;

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
  /** The layer's arrival timeline (bloom). Omit for no arrival animation. */
  clock?: RevealClock;
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
  clock,
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

  // Hover / press / select: the design system's lift and ring turn, tweened rather than snapped.
  const tweens = useRef(new HoverTweens()).current;
  const frames = useFrames(layerRef, () => clock?.active() || tweens.active());
  useLayoutEffect(() => {
    const raised = new Set<string>();
    if (hoveredNodeId) raised.add(hoveredNodeId);
    if (pressedNodeId) raised.add(pressedNodeId);
    if (selectedNodeId) raised.add(selectedNodeId);
    if (tweens.set(raised, design.comfort.reducedMotion || nodes.length > HOVER_TWEEN_MAX_NODES)) frames.run();
  }, [hoveredNodeId, pressedNodeId, selectedNodeId, design.comfort.reducedMotion, nodes.length > HOVER_TWEEN_MAX_NODES, tweens, frames]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => clock?.subscribe(() => frames.run()), [clock, frames]);

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
    const opt = { shadows: !isDragging && visible.length <= SHADOW_MAX_VISIBLE, labels: zoom >= TEXT_LABEL_HIDE_BELOW_ZOOM, k: Math.hypot(m.a, m.b), base: m };
    const st: IdeaState = { ...IDLE };
    const now = performance.now();
    const arrival: Arrival = { alpha: 1, scale: 1, dx: 0, dy: 0 };
    const arriving = clock?.active(now) ?? false;
    for (let i = 0; i < visible.length; i++) {
      const n = visible[i]!;
      st.hovered = n.id === hoveredNodeId;
      st.pressed = n.id === pressedNodeId;
      st.selected = n.id === selectedNodeId;
      st.focused = n.id === focusedNodeId;
      st.dimmed = dimOthers && n.id !== highlighted;
      if (tweens.has(n.id)) { const p = tweens.progress(n.id, now); st.lift = p.lift; st.ring = p.ring; } else { st.lift = undefined; st.ring = undefined; }
      st.arrival = arriving && clock!.node(n.id, n.x, n.y, now, arrival) ? arrival : null;
      drawIdea(c, n, design, zoom, st, opt);
    }
    c.setTransform(m);
    c.globalAlpha = 1;
  };

  return (
    <Layer ref={layerRef} name="nodes" listening={false}>
      <Shape sceneFunc={sceneFunc} listening={false} perfectDrawEnabled={false} />
    </Layer>
  );
}
