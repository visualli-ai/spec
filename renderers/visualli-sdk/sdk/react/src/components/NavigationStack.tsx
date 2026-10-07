// ─── NavigationStack ──────────────────────────────────────────────────────────
//
// The depth trail. Kept as a named component for existing callers; it renders
// the design system's trail (DepthTrail) from layer entries.

import React, { memo, useMemo } from 'react';
import type { VisualliLayer } from '@visualli/core';
import { DepthTrail, type IdeaPaint } from './Overlays';

export interface NavStackEntry {
  layerId: string;
  layer: VisualliLayer;
  label: string;
  /** Colour of the idea this layer opens from (the design system's TRAIL: the clicked idea's own colour); the first
   *  entry, the map's title, is TRAIL.rootTopic. */
  paint?: IdeaPaint;
}

export interface NavigationStackProps {
  stack: NavStackEntry[];
  onNavigateBack: (index: number) => void;
  /** @deprecated theme comes from the surrounding data-theme. */
  isDark?: boolean;
  /** Override the trail's default offset from the top-left corner. */
  top?: string;
  left?: string;
}

const NavigationStack = memo(function NavigationStack({ stack, onNavigateBack, top, left }: NavigationStackProps) {
  const entries = useMemo(
    () => stack.map((e) => ({ layerId: e.layerId, label: e.label, level: e.layer.level, paint: e.paint ?? {} })),
    [stack],
  );
  return (
    <div className="vi-map__trail" style={top || left ? { top, left } : undefined}>
      <DepthTrail stack={entries} onNavigateBack={onNavigateBack} />
    </div>
  );
});

export default NavigationStack;
