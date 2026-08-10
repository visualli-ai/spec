// ─── Viewport Store ───────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { ViewportState } from '@visualli-sdk/core';
import {
  panViewport,
  zoomViewport,
  setViewportCenter,
  recalculateViewportBounds,
  clampZoom,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  worldToScreen,
  screenToWorld,
  ZOOM_DEFAULT,
} from '@visualli-sdk/core';

export interface IViewportStore extends ViewportState {
  canvasWidth:  number;
  canvasHeight: number;

  pan:              (deltaX: number, deltaY: number) => void;
  zoom:             (delta: number, pivotX?: number, pivotY?: number) => void;
  setCenter:        (x: number, y: number) => void;
  setZoom:          (level: number) => void;
  updateCanvasSize: (width: number, height: number) => void;

  getVisibleBounds: () => ViewportState['visibleBounds'];
  worldToScreen:    (x: number, y: number) => { x: number; y: number };
  screenToWorld:    (x: number, y: number) => { x: number; y: number };
}

function makeInitial(w: number, h: number): ViewportState {
  const vp: ViewportState = {
    centerX: 0, centerY: 0,
    zoomLevel: ZOOM_DEFAULT,
    rotation: 0,
    visibleBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  };
  return recalculateViewportBounds(vp, w, h);
}

const getVP = (s: IViewportStore): ViewportState => ({
  centerX: s.centerX, centerY: s.centerY,
  zoomLevel: s.zoomLevel, rotation: s.rotation,
  visibleBounds: s.visibleBounds,
});

export const useViewportStore = create<IViewportStore>((set, get) => {
  const init = makeInitial(DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT);
  return {
    ...init,
    canvasWidth:  DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,

    pan: (dx, dy) => set((s) => {
      const updated = recalculateViewportBounds(panViewport(dx, dy, getVP(s)), s.canvasWidth, s.canvasHeight);
      return { centerX: updated.centerX, centerY: updated.centerY, visibleBounds: updated.visibleBounds };
    }),

    zoom: (delta, pivotX, pivotY) => set((s) => {
      const updated = recalculateViewportBounds(
        zoomViewport(delta, getVP(s), pivotX, pivotY, s.canvasWidth, s.canvasHeight),
        s.canvasWidth, s.canvasHeight,
      );
      return { centerX: updated.centerX, centerY: updated.centerY, zoomLevel: updated.zoomLevel, visibleBounds: updated.visibleBounds };
    }),

    setCenter: (x, y) => set((s) => {
      const updated = recalculateViewportBounds(setViewportCenter(x, y, getVP(s)), s.canvasWidth, s.canvasHeight);
      return { centerX: updated.centerX, centerY: updated.centerY, visibleBounds: updated.visibleBounds };
    }),

    setZoom: (level) => set((s) => {
      const clamped = clampZoom(level);
      const updated = recalculateViewportBounds({ ...getVP(s), zoomLevel: clamped }, s.canvasWidth, s.canvasHeight);
      return { zoomLevel: updated.zoomLevel, visibleBounds: updated.visibleBounds };
    }),

    updateCanvasSize: (w, h) => set((s) => {
      const updated = recalculateViewportBounds(getVP(s), w, h);
      return { canvasWidth: w, canvasHeight: h, visibleBounds: updated.visibleBounds };
    }),

    getVisibleBounds: () => get().visibleBounds,
    worldToScreen: (x, y) => {
      const s = get();
      return worldToScreen(x, y, getVP(s), s.canvasWidth, s.canvasHeight);
    },
    screenToWorld: (x, y) => {
      const s = get();
      return screenToWorld(x, y, getVP(s), s.canvasWidth, s.canvasHeight);
    },
  };
});
