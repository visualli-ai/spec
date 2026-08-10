// ─── KonvaStage ───────────────────────────────────────────────────────────────
//
// Thin wrapper around react-konva <Stage> that:
//  • Binds canvas position/scale from the viewport store
//  • Accepts optional event handlers (wheel, mouse, touch, context-menu)
//  • Calls stage.destroy() on unmount (memory hygiene)

import React, { useRef, useEffect, forwardRef } from 'react';
import { KStage as Stage } from '../konvaCompat';
import type Konva from 'konva';
import { useViewportStore } from '../stores/useViewportStore';

export interface KonvaStageProps {
  children: React.ReactNode;
  onWheel?:       (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onMouseDown?:   (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove?:   (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp?:     (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTouchStart?:  (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onTouchMove?:   (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onTouchEnd?:    (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onStageReady?:  (stage: Konva.Stage) => void;
}

const KonvaStage = forwardRef<Konva.Stage, KonvaStageProps>(function KonvaStage(
  {
    children,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onContextMenu,
    onTouchStart, onTouchMove, onTouchEnd,
    onStageReady,
  },
  ref,
) {
  const internalRef = useRef<Konva.Stage | null>(null);
  const { centerX, centerY, zoomLevel, canvasWidth, canvasHeight } = useViewportStore();

  useEffect(() => {
    if (internalRef.current) {
      if (typeof ref === 'function') ref(internalRef.current);
      else if (ref) (ref as React.MutableRefObject<Konva.Stage | null>).current = internalRef.current;
      onStageReady?.(internalRef.current);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { internalRef.current?.destroy(); };
  }, []);

  const w = canvasWidth  || 800;
  const h = canvasHeight || 600;
  const stageX = w / 2 - centerX * zoomLevel;
  const stageY = h / 2 - centerY * zoomLevel;

  return (
    <Stage
      ref={internalRef}
      width={w}
      height={h}
      x={stageX}
      y={stageY}
      scaleX={zoomLevel}
      scaleY={zoomLevel}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      draggable={false}
      pixelRatio={1}
    >
      {children}
    </Stage>
  );
});

export default KonvaStage;
