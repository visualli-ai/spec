// ─── Text scaling ────────────────────────────────────────────────────────────
//
// Single copy (the core/react duplicates are gone). Font sizes come from the
// design system's type styles; only the zoom behaviour is SDK logic.

import { CANVAS_STYLE, TYPE_STYLES } from '../generated/designSystem.js';
import { nodeRadii } from './nodeGeometry.js';

/** Root idea label size (`.node-root`). */
export const NODE_TEXT_BASE_FONT_PX: number = TYPE_STYLES['node-root'].size;
/** Other ideas' label size (`.node-label`). */
export const NODE_LABEL_FONT_PX: number = TYPE_STYLES['node-label'].size;
export const DESCRIPTION_TEXT_BASE_FONT_PX: number = TYPE_STYLES['body-sm'].size;
export const CONTAINER_LABEL_BASE_FONT_PX: number = CANVAS_STYLE.group.labelSize;
export const EDGE_LABEL_BASE_FONT_PX: number = CANVAS_STYLE.edge.labelSize;
export const OVERLAY_FONT_UPPER_BOOST_PX = 8;

/** Horizontal room kept free inside the outline for the label. */
export const NODE_LABEL_PADDING_X = 40;
// Keep text away from blob edges
const NODE_TEXT_SAFE_BLOB_FILL_RATIO = 0.88;

/** Label font size for an idea at `level` (root uses the larger style). */
export const labelFontSize = (level: number): number => (level === 0 ? NODE_TEXT_BASE_FONT_PX : NODE_LABEL_FONT_PX);

/**
 * World-space scale of an idea's label (`--vi-ninv`): inverse zoom so the text
 * keeps a constant screen size once zoomed in, capped so a full label (max
 * lines) always fits inside the outline with a safe margin.
 */
export function computeNodeTextWorldScale(nodeWidth: number, zoomLevel: number, fontPx: number = NODE_LABEL_FONT_PX): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  const { rx, ry } = nodeRadii(nodeWidth);
  const textW = Math.max(nodeWidth - NODE_LABEL_PADDING_X, 1);
  const textH = CANVAS_STYLE.node.labelMaxLines * CANVAS_STYLE.node.labelLineHeight * fontPx;
  const fit = Math.max(0.01, Math.min((rx * 2 * NODE_TEXT_SAFE_BLOB_FILL_RATIO) / textW, (ry * 2 * NODE_TEXT_SAFE_BLOB_FILL_RATIO) / textH));
  return Math.min(1 / safeZoom, fit);
}

/** Screen-space scale (zoom-adjusted) for text overlays. */
export function computeNodeTextScreenScale(nodeWidth: number, zoomLevel: number): number {
  return computeNodeTextWorldScale(nodeWidth, zoomLevel) * zoomLevel;
}

/** Screen-space overlay scale for description/semantic tooltips (1x .. root label + boost). */
export function computeOverlayScale(zoomLevel: number): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  const maxScale = (NODE_TEXT_BASE_FONT_PX + OVERLAY_FONT_UPPER_BOOST_PX) / NODE_TEXT_BASE_FONT_PX;
  return Math.min(Math.max(1 / safeZoom, 1), maxScale);
}

/** Scale for edge path labels in screen pixels. */
export function computeEdgeLabelScale(zoomLevel: number): number {
  const safeZoom = Math.max(zoomLevel, 0.0001);
  return Math.min(Math.max(EDGE_LABEL_BASE_FONT_PX / safeZoom, 10), 32);
}
