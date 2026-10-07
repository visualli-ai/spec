// ─── KonvaNode ────────────────────────────────────────────────────────────────
//
// A single idea as one Konva shape (rings + body + label), drawn with the design
// system's geometry and tokens. The canvas layers batch all ideas into one shape
// (KonvaNodeLayer); this component is for composing custom Konva scenes.

import React from 'react';
import { KShape as Shape } from '../konvaCompat';
import { type FlatNode } from '@visualli/core';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { IDLE, drawIdea } from '../design/drawing';

export interface KonvaNodeProps {
  node: FlatNode;
  zoomLevel: number;
  /** True when the pointer is currently over this node (stage-level hit test). */
  isExternallyHovered?: boolean;
  /** True while this node is being pressed/dragged. */
  isExternallyPressed?: boolean;
  isSelected?: boolean;
  /** True while any node is being dragged — disables the drop shadow. */
  isDragging?: boolean;
  design?: Design;
}

const KonvaNode = React.memo(function KonvaNode({
  node, zoomLevel, isExternallyHovered = false, isExternallyPressed = false, isSelected = false, isDragging = false, design = DEFAULT_DESIGN,
}: KonvaNodeProps) {
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx: { _context: CanvasRenderingContext2D }) => {
        drawIdea(ctx._context, node, design, zoomLevel, { ...IDLE, hovered: isExternallyHovered, pressed: isExternallyPressed, selected: isSelected }, {
          shadows: !isDragging,
        });
      }}
    />
  );
});

export default KonvaNode;
