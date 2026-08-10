// ─── ZoomControls ─────────────────────────────────────────────────────────────
//
// Floating zoom control matching the visualli.ai design:
//   • Side-by-side ZoomIn / ZoomOut buttons (65×32px)
//   • SVG icons (no external dependency)
//   • Inline styles (no Tailwind required in SDK)

import React, { useCallback, memo } from 'react';
import { ZOOM_MIN, ZOOM_MAX } from '@visualli-sdk/core';
import { useViewportStore } from '../stores/useViewportStore';

export interface ZoomControlsProps {
  isDark?: boolean;
}

// ── ZoomIn SVG (Lucide-compatible path) ───────────────────────────────────────
const ZoomInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

// ── ZoomOut SVG ───────────────────────────────────────────────────────────────
const ZoomOutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZOOM_STEP = 0.2;

const ZoomControls = memo(function ZoomControls({ isDark = false }: ZoomControlsProps) {
  const zoomLevel = useViewportStore(s => s.zoomLevel);
  const setZoom   = useViewportStore(s => s.setZoom);

  const handleZoomIn  = useCallback(() => setZoom(Math.min(ZOOM_MAX, zoomLevel * 1.2)), [zoomLevel, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(Math.max(ZOOM_MIN, zoomLevel / 1.2)), [zoomLevel, setZoom]);

  const surfaceBg = isDark ? 'var(--bg-surface, #1C1C1A)'   : 'var(--bg-surface, #FAF8F4)';
  const border    = isDark ? 'var(--border-color, #333330)'  : 'var(--border-color, #DDD9D0)';
  const primary   = isDark ? 'var(--text-primary, #F0EDE6)'  : 'var(--text-primary, #1A1A18)';
  const muted     = isDark ? 'var(--text-muted, #8E8C88)'    : 'var(--text-muted, #747270)';

  return (
    <div
      style={{
        position: 'relative',
        background: surfaceBg,
        border: `0.5px solid ${border}`,
        borderRadius: '8px',
        overflow: 'hidden',
        width: '65px',
        height: '32px',
        flexShrink: 0,
      }}
      role="group"
      aria-label="Zoom controls"
    >
      {/* Zoom In — left half */}
      <button
        onClick={handleZoomIn}
        disabled={zoomLevel >= ZOOM_MAX}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '32px', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', cursor: zoomLevel >= ZOOM_MAX ? 'not-allowed' : 'pointer',
          color: zoomLevel >= ZOOM_MAX ? muted : primary,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (zoomLevel < ZOOM_MAX) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        aria-label="Zoom in"
      >
        <ZoomInIcon />
      </button>

      {/* Divider */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '32px', width: '0.5px', background: border }} />

      {/* Zoom Out — right half */}
      <button
        onClick={handleZoomOut}
        disabled={zoomLevel <= ZOOM_MIN}
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '33px', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', background: 'transparent', cursor: zoomLevel <= ZOOM_MIN ? 'not-allowed' : 'pointer',
          color: zoomLevel <= ZOOM_MIN ? muted : primary,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (zoomLevel > ZOOM_MIN) (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        aria-label="Zoom out"
      >
        <ZoomOutIcon />
      </button>
    </div>
  );
});

export default ZoomControls;
