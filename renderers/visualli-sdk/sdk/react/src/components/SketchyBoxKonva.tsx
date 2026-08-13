// ─── SketchyBoxKonva ─────────────────────────────────────────────────────────
//
// Renders the hand-drawn tooltip box using an imperative Konva canvas.
// Two paths are scaled to fit the container:
//  - BACK_PATH : shadow stroke, offset 8px down
//  - FRONT_PATH: filled main box, offset 5.65px right
//
// Matches the visualli.ai SketchyBoxKonva component exactly.

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';

const BACK_PATH =
  'M0.653,0 L485.653,1 C485.653,1,484.782,152.773,' +
  '486.653,165 C413.653,171,14.653,178,5.653,168' +
  'C2.653,158,0.653,0,0.653,0';

const FRONT_PATH =
  'M485,167.524 L0,166.524' +
  'C0,166.524,1.870,8.751,0,0' +
  'C73,0,479,0,487,8' +
  'C490,18,485,167.524,485,167.524';

const BACK_W  = 486;
const BACK_H  = 178;
const FRONT_W = 490;
const FRONT_H = 168;

const BACK_OFFSET_Y  = 8;
const FRONT_OFFSET_X = 5.65;
const SHADOW_PAD     = 12;

export interface SketchyBoxKonvaProps {
  children: React.ReactNode;
  fill:      string;
  stroke:    string;
  backStroke: string;
  padding?: string;
}

const SketchyBoxKonva: React.FC<SketchyBoxKonvaProps> = ({
  children,
  fill,
  stroke,
  backStroke,
  padding = '1rem 1.25rem',
}) => {
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const konvaContainerRef = useRef<HTMLDivElement>(null);
  const stageRef        = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const konvaEl = konvaContainerRef.current;
    if (!wrapper || !konvaEl) return;

    function draw(W: number, H: number) {
      if (!konvaEl || W <= 0 || H <= 0) return;
      if (stageRef.current) { stageRef.current.destroy(); stageRef.current = null; }

      const stage = new Konva.Stage({ container: konvaEl, width: W, height: H });
      const layer = new Konva.Layer({ listening: false });
      const contentH = H - SHADOW_PAD;

      layer.add(new Konva.Path({
        x: 0, y: BACK_OFFSET_Y,
        data: BACK_PATH,
        scaleX: W / BACK_W,
        scaleY: contentH / BACK_H,
        fill: '#ffffff',
        stroke: backStroke,
        strokeWidth: 2,
        strokeScaleEnabled: false,
        listening: false,
      }));

      layer.add(new Konva.Path({
        x: FRONT_OFFSET_X, y: 0,
        data: FRONT_PATH,
        scaleX: (W - FRONT_OFFSET_X) / FRONT_W,
        scaleY: contentH / FRONT_H,
        fill,
        stroke,
        strokeWidth: 3,
        strokeScaleEnabled: false,
        listening: false,
      }));

      stage.add(layer);
      stageRef.current = stage;
    }

    draw(wrapper.offsetWidth, wrapper.offsetHeight);

    const ro = new ResizeObserver(entries => {
      const el = entries[0].target as HTMLElement;
      draw(el.offsetWidth, el.offsetHeight);
    });
    ro.observe(wrapper);

    return () => {
      ro.disconnect();
      stageRef.current?.destroy();
      stageRef.current = null;
    };
  }, [fill, stroke, backStroke]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', paddingBottom: `${SHADOW_PAD}px` }}>
      <div
        ref={konvaContainerRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
      />
      <div style={{ position: 'relative', padding, zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default SketchyBoxKonva;
