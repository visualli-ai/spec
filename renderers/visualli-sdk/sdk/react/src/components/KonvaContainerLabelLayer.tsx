// ─── KonvaContainerLabelLayer ────────────────────────────────────────────────
//
// Container names: pills straddling their hull's edge, at the spot the design
// system's placeContainerLabel picks (clear of ideas, connectors and other
// names). Painted above connectors and ideas so nothing runs over a name
// (non-interactive). Shares its layout with KonvaContainerLayer.

import React, { useRef, useLayoutEffect } from 'react';
import { KLayer as Layer, KShape as Shape } from '../konvaCompat';
import type Konva from 'konva';
import { DEFAULT_DESIGN, type Design } from '../design/design';
import { drawPill, type ConnectionInput } from '../design/containers';
import { useContainerLayout, type ContainerGroup } from './KonvaContainerLayer';

export interface KonvaContainerLabelLayerProps {
  containers: ContainerGroup[];
  connections?: ConnectionInput[];
  design?: Design;
}

export default function KonvaContainerLabelLayer({ containers, connections = [], design = DEFAULT_DESIGN }: KonvaContainerLabelLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const placed = useContainerLayout(containers, connections, design);

  useLayoutEffect(() => { layerRef.current?.batchDraw(); }, [placed, design]);

  if (!placed.some((p) => p.pill)) return null;

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx: { _context: CanvasRenderingContext2D }, shape: Konva.Shape) => {
          const zoom = shape.getStage()?.scaleX() || 1;
          for (const p of placed) if (p.pill) drawPill(ctx._context, p.pill, design, zoom);
        }}
      />
    </Layer>
  );
}
