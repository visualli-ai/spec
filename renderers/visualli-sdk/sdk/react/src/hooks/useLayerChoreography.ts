// ─── useLayerChoreography ─────────────────────────────────────────────────────
//
// Step inside / back out, as the design system's motion.ts describes them:
//
//   step inside  the current layer zooms toward the idea (scale 3.2, ease-zoom, 500ms)
//                and fades (160ms after 150ms); the layers swap at 320ms.
//   back out     the current layer shrinks toward the centre (scale .6, 220ms) and
//                fades (200ms); the layers swap at 220ms.
//   arrive       the new layer's ideas bloom in and its connectors draw (RevealClock),
//                while the layer as a whole settles from scale .94 (260ms).
//   reduced      motion reduced (or instant reveal): no zoom, the layers swap at once and
//                the new one fades in (120ms).
//
// The zoom/fade/settle run on the canvas wrapper as compositor animations (Web
// Animations API), so the Konva canvas is not redrawn while they play.
// All numbers and easings come from core's MOTION (design-system/geometry/motion.ts).

import { useCallback, useEffect, useRef } from 'react';
import type Konva from 'konva';
import { MOTION, cssEase, swapDelay, type FlatNode } from '@visualli/core';
import { useViewportStore } from '../stores/useViewportStore';
/** A viewport to return to: centre and zoom. */
export interface AnimatorViewport { centerX: number; centerY: number; zoomLevel: number }
import { calculateFitView } from '../utils/layerNavigation';

export interface LayerChoreographyOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
  /** The element around the Konva stage; the zoom, fade and settle play on it. */
  canvasWrapperRef: React.RefObject<HTMLDivElement | null>;
  reducedMotion: boolean;
  /** Switch the displayed layer to a child layer (the layers swap here). */
  onSwapLayer: (childLayerId: string) => void;
  /** Switch back to the parent layer (the layers swap here). */
  onSwapBack: () => void;
  /** Called once the new layer has settled. */
  onComplete: () => void;
  /** 'start' before anything moves, 'end' after the new layer has settled (pause hit-testing, GPU hints). */
  onLifecycle?: (phase: 'start' | 'end') => void;
}

export interface LayerChoreography {
  /** Step inside `targetNode` into the child layer. */
  stepInside: (targetNode: FlatNode, childLayerId: string, childNodes: ReadonlyArray<FlatNode>) => void;
  /** Back out to a layer whose fit viewport is `parent`. */
  backOut: (parent: AnimatorViewport) => void;
  /** The new layer is committed and drawing at its first frame: lift the veil and settle. Call after the swap's React commit. */
  arrive: () => void;
  isTransitioning: () => boolean;
}

export function useLayerChoreography(o: LayerChoreographyOptions): LayerChoreography {
  const { stageRef, canvasWrapperRef } = o;
  const opts = useRef(o);
  opts.current = o;

  const busy = useRef(false);
  const waiting = useRef(false); // swapped, waiting for the new layer's commit
  const anims = useRef<Animation[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = useRef<number[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    after.current.forEach(cancelAnimationFrame); after.current = [];
    anims.current.forEach((a) => a.cancel()); anims.current = [];
  }, []);

  const applyViewport = useCallback((vp: AnimatorViewport) => {
    const stage = stageRef.current;
    if (stage) {
      stage.x(stage.width() / 2 - vp.centerX * vp.zoomLevel);
      stage.y(stage.height() / 2 - vp.centerY * vp.zoomLevel);
      stage.scaleX(vp.zoomLevel); stage.scaleY(vp.zoomLevel);
      stage.getLayers().forEach((l) => l.drawScene());
    }
    const s = useViewportStore.getState();
    s.setCenter(vp.centerX, vp.centerY);
    s.setZoom(vp.zoomLevel);
  }, [stageRef]);

  const lifecycle = useCallback((phase: 'start' | 'end') => {
    const stage = stageRef.current;
    stage?.getLayers().forEach((l) => { l.listening(phase === 'end'); });
    if (phase === 'end') stage?.batchDraw();
    opts.current.onLifecycle?.(phase);
  }, [stageRef]);

  const leave = useCallback((wrap: HTMLElement | null, dir: 'in' | 'out', origin: string, vp: AnimatorViewport, swap: () => void) => {
    busy.current = true;
    waiting.current = false;
    lifecycle('start');
    const reduced = opts.current.reducedMotion;
    if (wrap && !reduced && typeof wrap.animate === 'function') {
      const m = MOTION;
      wrap.style.transformOrigin = origin;
      wrap.style.willChange = 'transform, opacity';
      if (dir === 'in') {
        anims.current.push(
          wrap.animate([{ transform: 'scale(1)' }, { transform: `scale(${m.dive.scale})` }], { duration: m.dive.duration, easing: cssEase(m.dive.ease), fill: 'forwards' }),
          wrap.animate([{ opacity: 1 }, { opacity: 0 }], { delay: m.dive.fadeDelay, duration: m.dive.fade, easing: 'ease', fill: 'both' }),
        );
      } else {
        anims.current.push(
          wrap.animate([{ transform: 'scale(1)' }, { transform: `scale(${m.surface.scale})` }], { duration: m.surface.duration, easing: cssEase(m.surface.ease), fill: 'forwards' }),
          wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: m.surface.fade, easing: 'ease', fill: 'both' }),
        );
      }
    }
    timers.current.push(setTimeout(() => {
      waiting.current = true;
      swap();
      applyViewport(vp);
      // Safety net: if the host never reports the commit, arrive anyway.
      timers.current.push(setTimeout(() => arriveRef.current(), 500));
    }, swapDelay(dir, reduced)));
  }, [applyViewport, lifecycle]);

  const arriveRef = useRef<() => void>(() => {});
  const arrive = useCallback(() => {
    if (!waiting.current) return;
    waiting.current = false;
    const wrap = canvasWrapperRef.current;
    const reduced = opts.current.reducedMotion;
    // Drop the zoomed-and-faded veil (the new layer is drawing its first frame, ideas not yet bloomed) and settle.
    anims.current.forEach((a) => a.cancel()); anims.current = [];
    let settle = reduced ? MOTION.reduced.fade : MOTION.settle.duration;
    if (wrap && !reduced && typeof wrap.animate === 'function') {
      const a = wrap.animate([{ transform: `scale(${MOTION.settle.fromScale})` }, { transform: 'none' }], { duration: MOTION.settle.duration, easing: cssEase(MOTION.settle.ease) });
      anims.current.push(a);
      settle = MOTION.settle.duration;
    }
    timers.current.push(setTimeout(() => {
      anims.current.forEach((a) => a.cancel()); anims.current = [];
      if (wrap) { wrap.style.willChange = 'auto'; wrap.style.transformOrigin = ''; }
      busy.current = false;
      opts.current.onComplete();
      lifecycle('end');
    }, settle));
  }, [canvasWrapperRef, lifecycle]);
  arriveRef.current = arrive;

  const stepInside = useCallback((targetNode: FlatNode, childLayerId: string, childNodes: ReadonlyArray<FlatNode>) => {
    if (busy.current) return;
    const stage = stageRef.current;
    const zoom = stage?.scaleX() ?? 1;
    const origin = stage ? `${targetNode.x * zoom + stage.x()}px ${targetNode.y * zoom + stage.y()}px` : '50% 50%';
    const fit = calculateFitView(childNodes as FlatNode[], stage?.width() ?? 800, stage?.height() ?? 600);
    leave(canvasWrapperRef.current, 'in', origin, { centerX: fit.centerX, centerY: fit.centerY, zoomLevel: fit.zoomLevel }, () => opts.current.onSwapLayer(childLayerId));
  }, [stageRef, canvasWrapperRef, leave]);

  const backOut = useCallback((parent: AnimatorViewport) => {
    if (busy.current) return;
    leave(canvasWrapperRef.current, 'out', '50% 50%', parent, () => opts.current.onSwapBack());
  }, [canvasWrapperRef, leave]);

  const isTransitioning = useCallback(() => busy.current, []);
  useEffect(() => () => { clear(); busy.current = false; }, [clear]);
  return { stepInside, backOut, arrive, isTransitioning };
}
