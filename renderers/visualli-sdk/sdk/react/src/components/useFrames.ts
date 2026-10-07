// ─── useFrames ───────────────────────────────────────────────────────────────
//
// Redraws a Konva layer every animation frame for as long as `busy()` says an
// animation is running. Nothing runs while the map is at rest. `run()` draws at
// once (sharing the frame with any draw already queued, so a state change plus an
// animation start still paints once) and keeps drawing each frame while busy.

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type Konva from 'konva';

export function useFrames(layerRef: RefObject<Konva.Layer | null>, busy: () => boolean): { run: () => void } {
  const raf = useRef<number | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); raf.current = null; }, []);
  return useMemo(() => {
    const tick = () => {
      raf.current = null;
      if (!busyRef.current()) return;
      layerRef.current?.batchDraw();
      raf.current = requestAnimationFrame(tick);
    };
    return {
      run: () => {
        layerRef.current?.batchDraw();
        if (raf.current === null) raf.current = requestAnimationFrame(tick);
      },
    };
  }, [layerRef]);
}
