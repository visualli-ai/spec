// ─── Viewport Utilities ───────────────────────────────────────────────────────
//
// Pure functions for viewport bounds calculation, coordinate transforms,
// pan/zoom operations, and node visibility queries.

import type { ViewportState } from '../types/mindmap.js';
import {
  VIEWPORT_MARGIN,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  ZOOM_MIN,
  ZOOM_MAX,
} from '../constants/performanceConstants.js';

// ── Viewport Bounds ───────────────────────────────────────────────────────────

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calculate the visible world-space bounding box including a margin buffer.
 */
export function calculateViewportBounds(
  viewport: ViewportState,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): WorldBounds {
  const worldW = canvasWidth  / viewport.zoomLevel;
  const worldH = canvasHeight / viewport.zoomLevel;
  const mx = worldW * VIEWPORT_MARGIN;
  const my = worldH * VIEWPORT_MARGIN;
  return {
    minX: viewport.centerX - worldW / 2 - mx,
    minY: viewport.centerY - worldH / 2 - my,
    maxX: viewport.centerX + worldW / 2 + mx,
    maxY: viewport.centerY + worldH / 2 + my,
  };
}

/**
 * Return a new ViewportState with `visibleBounds` recalculated.
 */
export function recalculateViewportBounds(
  viewport: ViewportState,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): ViewportState {
  return {
    ...viewport,
    visibleBounds: calculateViewportBounds(viewport, canvasWidth, canvasHeight),
  };
}

// ── Coordinate Transforms ─────────────────────────────────────────────────────

/**
 * Convert world-space coordinates to screen-space pixel coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: ViewportState,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): { x: number; y: number } {
  return {
    x: (worldX - viewport.centerX) * viewport.zoomLevel + canvasWidth  / 2,
    y: (worldY - viewport.centerY) * viewport.zoomLevel + canvasHeight / 2,
  };
}

/**
 * Convert screen-space pixel coordinates to world-space coordinates.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): { x: number; y: number } {
  return {
    x: (screenX - canvasWidth  / 2) / viewport.zoomLevel + viewport.centerX,
    y: (screenY - canvasHeight / 2) / viewport.zoomLevel + viewport.centerY,
  };
}

// ── Pan / Zoom ────────────────────────────────────────────────────────────────

/** Clamp zoom to [ZOOM_MIN, ZOOM_MAX]. */
export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/**
 * Pan the viewport by a screen-space delta (positive = right/down).
 */
export function panViewport(
  deltaX: number,
  deltaY: number,
  viewport: ViewportState,
): ViewportState {
  return {
    ...viewport,
    centerX: viewport.centerX - deltaX / viewport.zoomLevel,
    centerY: viewport.centerY - deltaY / viewport.zoomLevel,
  };
}

/** Teleport the viewport centre to the given world coordinates. */
export function setViewportCenter(
  x: number,
  y: number,
  viewport: ViewportState,
): ViewportState {
  return { ...viewport, centerX: x, centerY: y };
}

/**
 * Zoom the viewport by a multiplicative delta, optionally around a pivot point.
 *
 * @param delta   - Multiplier delta, e.g. 0.1 for +10% zoom
 * @param pivotX  - Optional screen-space X pivot
 * @param pivotY  - Optional screen-space Y pivot
 */
export function zoomViewport(
  delta: number,
  viewport: ViewportState,
  pivotX?: number,
  pivotY?: number,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): ViewportState {
  const newZoom = clampZoom(viewport.zoomLevel * (1 + delta));

  let cx = viewport.centerX;
  let cy = viewport.centerY;

  if (pivotX !== undefined && pivotY !== undefined) {
    const worldPivot = screenToWorld(pivotX, pivotY, viewport, canvasWidth, canvasHeight);
    cx = worldPivot.x - (pivotX - canvasWidth  / 2) / newZoom;
    cy = worldPivot.y - (pivotY - canvasHeight / 2) / newZoom;
  }

  return { ...viewport, centerX: cx, centerY: cy, zoomLevel: newZoom };
}

/**
 * Create a viewport centred on a node (world coordinates) at the given zoom level.
 */
export function focusOnNode(
  nodeX: number,
  nodeY: number,
  zoom: number,
): ViewportState {
  const clamped = clampZoom(zoom);
  return {
    centerX:  nodeX,
    centerY:  nodeY,
    zoomLevel: clamped,
    rotation: 0,
    visibleBounds: calculateViewportBounds(
      { centerX: nodeX, centerY: nodeY, zoomLevel: clamped, rotation: 0, visibleBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } },
    ),
  };
}

// ── Visibility ────────────────────────────────────────────────────────────────

/**
 * Test whether a world-space AABB intersects the viewport's visible bounds.
 */
export function isNodeInViewport(
  nodeX: number,
  nodeY: number,
  nodeWidth: number,
  nodeHeight: number,
  viewport: ViewportState,
  canvasWidth  = DEFAULT_CANVAS_WIDTH,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
): boolean {
  const bounds = calculateViewportBounds(viewport, canvasWidth, canvasHeight);
  const hw = nodeWidth  / 2;
  const hh = nodeHeight / 2;
  return !(
    nodeX + hw < bounds.minX ||
    nodeX - hw > bounds.maxX ||
    nodeY + hh < bounds.minY ||
    nodeY - hh > bounds.maxY
  );
}
