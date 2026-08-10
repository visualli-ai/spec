// ─── KonvaNode ────────────────────────────────────────────────────────────────
//
// Renders a single FlatNode as a single organic blob shape with Konva.
// Matches the visualli.ai rendering:
//   - Centered blob at node (x, y) with radiusX / radiusY scaling
//   - Single blob shape (no background depth layers)
//   - HSL-based border darkening
//   - 'Story Script' cursive font, text clipped to blob silhouette
//   - External hover / pressed state (no Konva hit-canvas dependency)
//   - All shapes are listening=false; hit detection uses spatial index

import React, { useMemo } from 'react';
import { KGroup as Group, KShape as Shape, KText as Text } from '../konvaCompat';
import type { FlatNode } from '@visualli-sdk/core';
import { CANVAS_COLORS, NODE_HEIGHT, TEXT_LABEL_HIDE_BELOW_ZOOM, darkenHexColor } from '@visualli-sdk/core';
import { getBlobTypeForLayer, BLOB_TEXT_OFFSETS, BLOB_LAYER_CONFIG, NODE_LAYER_CONFIG, drawBlobPath, computeNodeTextWorldScale } from '../config';

// ── Component ─────────────────────────────────────────────────────────────────

export interface KonvaNodeProps {
  node: FlatNode;
  zoomLevel: number;
  /** True when the pointer is currently over this node (stage-level hit test). */
  isExternallyHovered?: boolean;
  /** True while this node is being pressed/dragged. */
  isExternallyPressed?: boolean;
  /** True while any node is being dragged — disables expensive shadows. */
  isDragging?: boolean;
}

const KonvaNode = React.memo(function KonvaNode({
  node,
  zoomLevel,
  isExternallyHovered = false,
  isExternallyPressed = false,
  isDragging = false,
}: KonvaNodeProps) {
  // Border: monochromatic HSL-darkened version of the fill color
  const borderColor = useMemo(() => darkenHexColor(node.color, 0.13), [node.color]);

  // Number of background layers (capped at 3), driven by branchCount
  const layerCount = useMemo(() => {
    const count = node.branchCount ?? 0;
    return Math.min(count, 3);
  }, [node.branchCount]);

  // Base blob radii (same math as visualli.ai KonvaNode)
  const baseRadiusX = node.width / 2;
  const baseRadiusY = Math.max((NODE_HEIGHT * 1.6) / 2, baseRadiusX * 0.74);

  // Larger, consistent font size for better readability
  // Text will wrap to multiple lines if needed
  const calculateFontSize = useMemo(() => {
    // Use a larger base font size for better visibility
    return 30;
  }, [node.title]);

  // Text scale and layout
  const textNaturalWidth  = node.width - 40;
  // Increase text height to allow 2-3 lines of wrapped text
  const textNaturalHeight = NODE_HEIGHT * 1.2;
  const maxScale = computeNodeTextWorldScale(node.width, zoomLevel);

  // Blob type and text offset
  const blobType    = getBlobTypeForLayer(node.level);
  const textOffsetX = (BLOB_TEXT_OFFSETS[blobType] ?? 0) * baseRadiusX;

  // Interaction state (purely driven from stage-level delegation)
  const effectiveHover = isExternallyHovered;
  const isPressed      = isExternallyPressed;

  // Blob fill/stroke:
  //   default → fill=node.color,  stroke=borderColor
  //   hover   → fill=borderColor, stroke=borderColor
  //   pressed → fill=borderColor, stroke=node.color
  const topFill   = effectiveHover || isPressed ? borderColor : node.color;
  const topStroke = isPressed ? node.color : borderColor;

  // Build the background layers config (outermost first for correct z-order)
  const backgroundLayers = useMemo(() => {
    if (layerCount === 0) return [];
    const startIdx = BLOB_LAYER_CONFIG.length - layerCount;
    const layers = [];
    for (let i = startIdx; i < BLOB_LAYER_CONFIG.length; i++) {
      const config = BLOB_LAYER_CONFIG[i];
      layers.push({
        ...config,
        radiusX: baseRadiusX * config.scaleUp,
        radiusY: baseRadiusY * config.scaleUp,
      });
    }
    return layers;
  }, [layerCount, baseRadiusX, baseRadiusY]);

  return (
    <Group x={node.x} y={node.y} listening={false}>
      {/* Background blob layers (outermost rendered first, behind the node) */}
      {backgroundLayers.map((layer, idx) => (
        <Shape
          key={`blob-layer-${idx}`}
          rotation={layer.rotation}
          opacity={layer.opacity}
          sceneFunc={(ctx: any, shape: any) => {
            drawBlobPath(ctx, layer.radiusX, layer.radiusY, blobType);
            ctx.fillStrokeShape(shape);
          }}
          fill={node.color}
          stroke={borderColor}
          strokeWidth={layer.strokeWidth}
          dash={layer.dash ? [...layer.dash] : undefined}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}

      {/* Node (top layer) - main interactive blob */}
      <Shape
        rotation={NODE_LAYER_CONFIG.rotation}
        opacity={NODE_LAYER_CONFIG.opacity}
        sceneFunc={(ctx: any, shape: any) => {
          drawBlobPath(ctx, baseRadiusX, baseRadiusY, blobType);
          ctx.fillStrokeShape(shape);
        }}
        hitFunc={(ctx: any, shape: any) => {
          drawBlobPath(ctx, baseRadiusX, baseRadiusY, blobType);
          ctx.fillStrokeShape(shape);
        }}
        fill={topFill}
        stroke={topStroke}
        strokeWidth={NODE_LAYER_CONFIG.strokeWidth}
        shadowEnabled={!isDragging}
        shadowColor="rgba(255,255,255,1)"
        shadowBlur={effectiveHover || isPressed ? 40 : 15}
        shadowOpacity={effectiveHover || isPressed ? 0.4 : 0.15}
        shadowOffsetX={0}
        shadowOffsetY={0}
        perfectDrawEnabled={false}
      />

      {/* Node Title — inverse-scaled so it stays legible at a constant screen size.
           Clipped to the blob silhouette via clipFunc so the growing text never visually
           bleeds outside the first layer boundary at low zoom levels. */}
      <Group
        clipFunc={(ctx: any) => {
          drawBlobPath(ctx, baseRadiusX, baseRadiusY, blobType);
        }}
        visible={zoomLevel >= TEXT_LABEL_HIDE_BELOW_ZOOM}
        listening={false}
      >
        <Text
          x={textOffsetX}
          y={0}
          offsetX={textNaturalWidth / 2}
          offsetY={textNaturalHeight / 2}
          width={textNaturalWidth}
          height={textNaturalHeight}
          scaleX={maxScale}
          scaleY={maxScale}
          text={node.title}
          fontSize={calculateFontSize}
          fontFamily="'Story Script', cursive"
          fontStyle="normal"
          fill={CANVAS_COLORS.node.titleColor}
          align="center"
          verticalAlign="middle"
          wrap="word"
          ellipsis={false}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>
    </Group>
  );
});

export default KonvaNode;

