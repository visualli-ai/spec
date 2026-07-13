// ─── useKonvaRenderer ─────────────────────────────────────────────────────────
//
// Manages Konva rendering lifecycle: resize, pan, zoom, and FPS monitoring.
// Returns Konva-level event handlers to be wired onto KonvaStage.
//
// Design matches visualli.ai's useKonvaRenderer:
//   - handleWheel / handleMouseDown / handleMouseMove / handleMouseUp are
//     Konva.KonvaEventObject handlers (not DOM-level)
//   - Pan is applied directly to the stage during drag for 60 fps, flushed to
//     Zustand store on mouseUp (no per-frame state updates)
//   - Zoom targets the cursor position (same math as visualli.ai)

import { useEffect, useCallback, useRef, useState } from 'react';
import type Konva from 'konva';
import { ZOOM_MIN, ZOOM_MAX } from '@mysdk/core';
import { useViewportStore } from '../stores/useViewportStore';
import { useRenderConfigStore } from '../stores/stores';

export interface UseKonvaRendererOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageRef?:    React.RefObject<Konva.Stage | null>;
  enabled?:     boolean;
}

export interface UseKonvaRendererReturn {
  handleWheel:    (e: Konva.KonvaEventObject<WheelEvent>) => void;
  handleMouseDown:(e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseMove:(e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseUp:  (e: Konva.KonvaEventObject<MouseEvent>) => void;
  canvasWidth:    number;
  canvasHeight:   number;
}

export function useKonvaRenderer({
  containerRef,
  stageRef,
  enabled = true,
}: UseKonvaRendererOptions): UseKonvaRendererReturn {
  const pan              = useViewportStore(s => s.pan);
  const zoom             = useViewportStore(s => s.zoom);
  const setZoom          = useViewportStore(s => s.setZoom);
  const setCenter        = useViewportStore(s => s.setCenter);
  const updateCanvasSize = useViewportStore(s => s.updateCanvasSize);
  const autoAdjust       = useRenderConfigStore(s => s.autoAdjustQuality);

  const [canvasWidth,  setCanvasWidth]  = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const cachedSizeRef = useRef({ width: 0, height: 0 });

  const isPanningRef       = useRef(false);
  const lastPanPointRef    = useRef({ x: 0, y: 0 });
  const panAccumRef        = useRef({ x: 0, y: 0 });

  // ── FPS monitor ──────────────────────────────────────────────────────────────
  const fpsRef   = useRef({ frames: 0, last: performance.now() });
  const fpsRafId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const tick = (now: number): void => {
      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 2000) {
        const fps = (fpsRef.current.frames / ((now - fpsRef.current.last) / 1000)) | 0;
        autoAdjust(fps);
        fpsRef.current = { frames: 0, last: now };
      }
      fpsRafId.current = requestAnimationFrame(tick);
    };
    fpsRafId.current = requestAnimationFrame(tick);
    return () => { if (fpsRafId.current !== null) cancelAnimationFrame(fpsRafId.current); };
  }, [enabled, autoAdjust]);

  // ── Resize ────────────────────────────────────────────────────────────────────
  // Observes the container element (not window) so the canvas always fills
  // its parent, regardless of how the renderer is sized by the consuming app.
  useEffect(() => {
    if (!enabled) return;

    let rafId: number | null = null;

    const measure = () => {
      const el = containerRef.current;
      const w = el ? Math.round(el.getBoundingClientRect().width)  : 800;
      const h = el ? Math.round(el.getBoundingClientRect().height) : 600;
      return { w, h };
    };

    const updateSize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const { w, h } = measure();
        if (w > 0 && h > 0 &&
            (cachedSizeRef.current.width !== w || cachedSizeRef.current.height !== h)) {
          cachedSizeRef.current = { width: w, height: h };
          setCanvasWidth(w);
          setCanvasHeight(h);
          updateCanvasSize(w, h);
        }
      });
    };

    // Initial measurement
    updateSize();

    // ResizeObserver tracks the container itself (handles % / flex / grid sizing)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(updateSize);
      ro.observe(containerRef.current);
    } else {
      // Fallback: window resize only
      window.addEventListener('resize', updateSize);
    }

    return () => {
      ro ? ro.disconnect() : window.removeEventListener('resize', updateSize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enabled, containerRef, updateCanvasSize]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>): void => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const delta = -e.evt.deltaY / 1000;
    zoom(delta, pointer.x, pointer.y);
  }, [zoom]);

  // ── Mouse pan ─────────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty && e.evt.button === 0) {
      e.evt.preventDefault();
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      panAccumRef.current = { x: 0, y: 0 };
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (!isPanningRef.current) {
      // Update cursor on empty canvas
      const isOverEmpty = e.target === e.target.getStage();
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = isOverEmpty ? 'grab' : 'default';
      return;
    }
    e.evt.preventDefault();
    const deltaX = e.evt.clientX - lastPanPointRef.current.x;
    const deltaY = e.evt.clientY - lastPanPointRef.current.y;

    // Apply pan directly to stage (no Zustand overhead per-frame)
    const stage = e.target.getStage();
    if (stage) {
      stage.x(stage.x() + deltaX);
      stage.y(stage.y() + deltaY);
      stage.batchDraw();
    }

    panAccumRef.current.x += deltaX;
    panAccumRef.current.y += deltaY;
    lastPanPointRef.current = { x: e.evt.clientX, y: e.evt.clientY };
  }, []); // No Zustand dep — pan flushed on mouseUp

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>): void => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      const { x, y } = panAccumRef.current;
      if (x !== 0 || y !== 0) {
        pan(x, y);
        panAccumRef.current = { x: 0, y: 0 };
      }
      const stage = e.target.getStage();
      if (stage) stage.container().style.cursor = 'grab';
    }
  }, [pan]);

  return { handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, canvasWidth, canvasHeight };
}
