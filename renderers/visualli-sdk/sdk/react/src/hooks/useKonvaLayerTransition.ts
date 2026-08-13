// ─── useKonvaLayerTransition ──────────────────────────────────────────────────
//
// Manages layer navigation animations (zoom into child layer, zoom back to
// parent). Uses the same callback-driven pattern as the visualli.ai reference:
//   - onViewportChange: imperatively updates the Konva stage each rAF frame
//   - onOpacityChange: writes directly to canvasWrapperRef DOM (no React state)
//   - onBackgroundColorChange: writes directly to bgRef DOM
//   - onPhaseChange('swap'|'zoom-back'): triggers React layer content swap
//   - onComplete: syncs final viewport to Zustand and ends transition

import { useCallback, useRef, useEffect } from 'react';
import type Konva from 'konva';
import type { VisualliDocument, FlatNode } from '@visualli/core';
import { useViewportStore } from '../stores/useViewportStore';
import { konvaLayerTransitionAnimator } from '../animations/konvaLayerTransition';
import type { AnimatorViewport } from '../animations/konvaLayerTransition';
import { calculateFitView } from '../utils/layerNavigation';

export interface LayerTransitionOptions {
  /** Ref to the Konva Stage for imperative position/scale updates each frame. */
  stageRef:          React.RefObject<Konva.Stage | null>;
  /** Ref to the wrapping div whose CSS `opacity` is driven during transitions. */
  canvasWrapperRef:  React.RefObject<HTMLDivElement | null>;
  /** Ref to the background color div. */
  bgRef?:            React.RefObject<HTMLDivElement | null>;
  /** Called at the content-swap point — use to switch the displayed layer. */
  onSwapLayer:       (newLayerId: string) => void;
  /** Called when a zoom-out swap happens — use to update the nav stack. */
  onSwapBack:        () => void;
  /** Called after the transition fully completes. */
  onComplete:        () => void;
  /**
   * GPU CSS-transform mode: called each rAF frame instead of applyViewport.
   * When provided, the caller is responsible for moving the canvas content.
   */
  onViewportFrame?:     (vp: AnimatorViewport) => void;
  /**
   * Called once when the animation reaches its final viewport.
   * When provided, replaces the default applyViewport call at completion.
   */
  onViewportFinal?:     (vp: AnimatorViewport) => void;
  /**
   * Called at phase-change points ('swap', 'zoom-back') in addition to the
   * internal content-swap logic. Use to reset CSS transforms before Konva redraws.
   */
  onPhaseChange?:       (phase: string) => void;
  /**
   * Called with 'start' before the animator fires its first frame and with
   * 'end' after onComplete. Use to set up / tear down GPU hints (willChange, etc.).
   */
  onTransitionLifecycle?: (phase: 'start' | 'end') => void;
}

export interface LayerTransitionHandlers {
  zoomIntoLayer: (
    doc:         VisualliDocument,
    targetNode:  FlatNode,
    childLayerId: string,
    childNodes:  FlatNode[],
    fromColor:   string,
    toColor:     string,
  ) => void;
  zoomOutToParent: (
    parentViewport: AnimatorViewport,
    fromColor:      string,
    toColor:        string,
  ) => void;
  isTransitioning: () => boolean;
}

export function useKonvaLayerTransition(opts: LayerTransitionOptions): LayerTransitionHandlers {
  const {
    stageRef, canvasWrapperRef, bgRef,
    onSwapLayer, onSwapBack, onComplete,
    onViewportFrame, onViewportFinal, onPhaseChange: onPhaseChangeExt,
    onTransitionLifecycle,
  } = opts;
  const setZoom   = useViewportStore(s => s.setZoom);
  const setCenter = useViewportStore(s => s.setCenter);
  const getState  = useViewportStore.getState;

  const swappedRef = useRef(false);
  const canvasSizeRef = useRef({ width: 800, height: 600 });

  // Keep canvas size ref fresh from viewport store (updated by ResizeObserver in useKonvaRenderer)
  useEffect(() => {
    const update = () => {
      const vp = useViewportStore.getState();
      canvasSizeRef.current = { width: vp.canvasWidth || 800, height: vp.canvasHeight || 600 };
    };
    update();
    // Subscribe to viewport store changes instead of window resize
    const unsubscribe = useViewportStore.subscribe(update);
    return unsubscribe;
  }, []);

  // Apply viewport to Konva stage imperatively (no React re-render per frame)
  const applyViewport = useCallback((vp: AnimatorViewport) => {
    const stage = stageRef.current;
    if (!stage) return;
    const { width, height } = canvasSizeRef.current;
    stage.x(width / 2 - vp.centerX * vp.zoomLevel);
    stage.y(height / 2 - vp.centerY * vp.zoomLevel);
    stage.scaleX(vp.zoomLevel);
    stage.scaleY(vp.zoomLevel);
    stage.getLayers().forEach(l => l.drawScene());
    // Sync to Zustand so viewport store reflects reality
    setCenter(vp.centerX, vp.centerY);
    setZoom(vp.zoomLevel);
  }, [stageRef, setCenter, setZoom]);

  const applyOpacity = useCallback((opacity: number) => {
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.opacity = String(opacity);
    }
  }, [canvasWrapperRef]);

  const applyBgColor = useCallback((color: string) => {
    if (bgRef?.current) {
      bgRef.current.style.backgroundColor = color;
    }
  }, [bgRef]);

  const zoomIntoLayer = useCallback((
    _doc:        VisualliDocument,
    targetNode:  FlatNode,
    childLayerId: string,
    childNodes:  FlatNode[],
    fromColor:   string,
    toColor:     string,
  ): void => {
    if (konvaLayerTransitionAnimator.active) return;

    const vp    = getState();
    const stage = stageRef.current;
    const w     = stage?.width()  ?? 800;
    const h     = stage?.height() ?? 600;
    const fit   = calculateFitView(childNodes, w, h);

    swappedRef.current = false;

    onTransitionLifecycle?.('start');
    konvaLayerTransitionAnimator.animateZoomIntoLayer(
      { centerX: vp.centerX, centerY: vp.centerY, zoomLevel: vp.zoomLevel },
      { x: targetNode.x, y: targetNode.y, width: targetNode.width, height: targetNode.height },
      { x: fit.centerX, y: fit.centerY },
      fromColor,
      toColor,
      {
        onUpdate: ({ viewport, opacity, backgroundColor }) => {
          if (onViewportFrame) { onViewportFrame(viewport); } else { applyViewport(viewport); }
          applyOpacity(opacity);
          applyBgColor(backgroundColor);
        },
        onComplete: () => {
          const finalVp = { centerX: fit.centerX, centerY: fit.centerY, zoomLevel: fit.zoomLevel };
          if (onViewportFinal) { onViewportFinal(finalVp); } else { applyViewport(finalVp); }
          applyOpacity(1);
          onComplete();
          onTransitionLifecycle?.('end');
        },
        onPhaseChange: (phase) => {
          onPhaseChangeExt?.(phase);
          if (phase === 'swap' && !swappedRef.current) {
            swappedRef.current = true;
            onSwapLayer(childLayerId);
          }
        },
      },
      fit.zoomLevel,
      w,
      h,
    );
  }, [stageRef, getState, applyViewport, applyOpacity, applyBgColor, onSwapLayer, onComplete, onViewportFrame, onViewportFinal, onPhaseChangeExt, onTransitionLifecycle]);

  const zoomOutToParent = useCallback((
    parentViewport: AnimatorViewport,
    fromColor:      string,
    toColor:        string,
  ): void => {
    if (konvaLayerTransitionAnimator.active) return;

    const vp = getState();
    swappedRef.current = false;

    onTransitionLifecycle?.('start');
    konvaLayerTransitionAnimator.animateZoomOutToParent(
      { centerX: vp.centerX, centerY: vp.centerY, zoomLevel: vp.zoomLevel },
      parentViewport,
      fromColor,
      toColor,
      {
        onUpdate: ({ viewport, opacity, backgroundColor }) => {
          if (onViewportFrame) { onViewportFrame(viewport); } else { applyViewport(viewport); }
          applyOpacity(opacity);
          applyBgColor(backgroundColor);
        },
        onComplete: () => {
          if (onViewportFinal) { onViewportFinal(parentViewport); } else { applyViewport(parentViewport); }
          applyOpacity(1);
          onComplete();
          onTransitionLifecycle?.('end');
        },
        onPhaseChange: (phase) => {
          onPhaseChangeExt?.(phase);
          if (phase === 'zoom-back' && !swappedRef.current) {
            swappedRef.current = true;
            onSwapBack();
          }
        },
      },
    );
  }, [getState, applyViewport, applyOpacity, applyBgColor, onSwapBack, onComplete, onViewportFrame, onViewportFinal, onPhaseChangeExt, onTransitionLifecycle]);

  const isTransitioning = useCallback(() => konvaLayerTransitionAnimator.active, []);

  // Cancel on unmount
  useEffect(() => () => { konvaLayerTransitionAnimator.cancel(); }, []);

  return { zoomIntoLayer, zoomOutToParent, isTransitioning };
}
