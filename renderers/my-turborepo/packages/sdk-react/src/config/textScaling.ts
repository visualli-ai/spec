// ─── Text Scaling Helpers ─────────────────────────────────────────────────────
//
// Determines the scale applied to node title text, keeping text legible and
// fitted inside the blob shape across the full zoom range.
//
// Matches the visualli.ai textScaling logic exactly.

import { NODE_HEIGHT } from '@mysdk/core';

export const NODE_TEXT_BASE_FONT_PX = 28;
export const DESCRIPTION_TEXT_BASE_FONT_PX = 12;
export const CONTAINER_LABEL_BASE_FONT_PX = 24;
export const EDGE_LABEL_BASE_FONT_PX = 18;
export const OVERLAY_FONT_UPPER_BOOST_PX = 8;

// Keep text away from blob edges
const NODE_TEXT_SAFE_BLOB_FILL_RATIO = 0.88;

/**
 * Computes world-space text scale for node title:
 * - inverse zoom for screen-space consistency
 * - clamped so text stays inside the node blob with safe padding
 *
 * Matches visualli.ai's computeNodeTextWorldScale(nodeWidth, zoomLevel).
 */
export function computeNodeTextWorldScale(nodeWidth: number, zoomLevel: number): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  const baseRadiusX = nodeWidth / 2;
  const baseRadiusY = Math.max((NODE_HEIGHT * 1.6) / 2, baseRadiusX * 0.74);
  const textNaturalWidth  = nodeWidth - 40;
  const textNaturalHeight = NODE_HEIGHT - 20;

  const maxScaleX = ((baseRadiusX * 2) * NODE_TEXT_SAFE_BLOB_FILL_RATIO) / Math.max(textNaturalWidth, 1);
  const maxScaleY = ((baseRadiusY * 2) * NODE_TEXT_SAFE_BLOB_FILL_RATIO) / Math.max(textNaturalHeight, 1);
  const fitScale  = Math.max(0.01, Math.min(maxScaleX, maxScaleY));

  return Math.min(1 / safeZoom, fitScale);
}

/** Screen-space scale (zoom-adjusted) for text overlays. */
export function computeNodeTextScreenScale(nodeWidth: number, zoomLevel: number): number {
  return computeNodeTextWorldScale(nodeWidth, zoomLevel) * zoomLevel;
}

/**
 * Screen-space overlay scale for description/semantic tooltips.
 * - lower bound: 1x
 * - upper bound: node-title-root + OVERLAY_FONT_UPPER_BOOST_PX
 */
export function computeOverlayScale(zoomLevel: number): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  const inverseScale = 1 / safeZoom;
  const maxScale = (NODE_TEXT_BASE_FONT_PX + OVERLAY_FONT_UPPER_BOOST_PX) / NODE_TEXT_BASE_FONT_PX;
  return Math.min(Math.max(inverseScale, 1), maxScale);
}

/** Scale for edge path labels in screen pixels. */
export function computeEdgeLabelScale(zoomLevel: number): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  return Math.min(Math.max(EDGE_LABEL_BASE_FONT_PX / safeZoom, 10), 32);
}
