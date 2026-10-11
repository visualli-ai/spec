// ─── Keeping the view when the canvas resizes ────────────────────────────────
//
// SDK viewport plumbing, nothing new from the design system. Its VisualMap keeps the zoom relative to the fit and the
// pan in screen px, and recomputes the fit (interaction.ts fitView) from its live size, so a resize keeps the reader's
// view by construction. The SDK's viewport store holds an absolute zoom and centre instead; this converts them.

import type { FitResult } from '@visualli/core';

/**
 * The view after the canvas changes size, as the design system's VisualMap keeps it: the reader's zoom stays relative
 * to the fit and their pan stays the same on screen, so a fitted view stays fitted.
 */
export function refitView(
  view: { centerX: number; centerY: number; zoomLevel: number },
  oldFit: FitResult,
  newFit: FitResult,
): FitResult {
  const zoomLevel = newFit.zoomLevel * (view.zoomLevel / oldFit.zoomLevel);
  // The pan in screen px is (fit centre − view centre) × zoom; kept as it is at the new zoom.
  const k = view.zoomLevel / zoomLevel;
  return {
    centerX: newFit.centerX + (view.centerX - oldFit.centerX) * k,
    centerY: newFit.centerY + (view.centerY - oldFit.centerY) * k,
    zoomLevel,
  };
}
