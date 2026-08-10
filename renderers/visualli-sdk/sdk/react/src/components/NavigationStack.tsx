// ─── NavigationStack ─────────────────────────────────────────────────────────
//
// Vertical navigation stack rendered as a fixed left-side overlay.
// Matches the visualli.ai VisualliNavigationStack design:
//   • Organic hand-drawn circle SVGs per level
//   • Vertical connector lines between levels
//   • Active level highlighted, previous levels clickable to navigate back
//   • Font: Nunito

import React, { memo, useState } from 'react';
import type { VisualliLayer } from '@visualli-sdk/core';

export interface NavStackEntry {
  layerId: string;
  layer: VisualliLayer;
  label: string;
}

export interface NavigationStackProps {
  stack: NavStackEntry[];
  onNavigateBack: (index: number) => void;
  isDark?: boolean;
  top?: string;
  left?: string;
}

// Pastel fills cycled across levels
const PASTEL_FILLS = [
  '#b6eea7', '#d5bcfe', '#a1c4fc', '#a6f5d8',
  '#ffc9de', '#c4e8ff', '#f0c4ff', '#ffe0a3',
];

// Organic circle SVG paths (small / active variants matching visualli.ai)
const ORGANIC_PATHS_SMALL = [
  'M13.72,6.31 C15.12,6.29 17.96,8.57 17.99,10.60 C18.07,14.62 16.72,17.90 11.12,18.00 C7.26,18.07 4.07,14.86 4.00,10.85 C3.93,6.83 9.44,2.02 13.69,4.85',
  'M13.88,6.41 C15.28,6.43 18.04,8.82 18.00,10.85 C17.93,14.86 16.48,18.10 10.88,18.00 C7.02,17.93 3.94,14.62 4.01,10.60 C4.08,6.59 9.76,1.97 13.91,4.95',
];
const ORGANIC_PATH_ACTIVE =
  'M16.55,9.22 C17.95,9.15 20.87,11.33 20.97,13.36 C21.19,17.37 19.96,20.70 14.37,20.99 C10.51,21.19 7.20,18.10 7.00,14.09 C6.78,10.08 12.13,5.08 16.48,7.77';

const CIRCLE_SIZE = 14;

function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const OrganicCircle = memo(function OrganicCircle({
  size, fill, stroke, strokeWidth, variant, isActive,
}: {
  size: number; fill: string; stroke: string; strokeWidth: number; variant: number; isActive?: boolean;
}) {
  const path = isActive ? ORGANIC_PATH_ACTIVE : ORGANIC_PATHS_SMALL[variant % ORGANIC_PATHS_SMALL.length];
  const vb   = isActive ? '4 3 20 20' : '2 1 18 18';
  const vbSz = isActive ? 20 : 18;
  const sw   = strokeWidth * vbSz / size;
  return (
    <svg width={size} height={size} viewBox={vb} fill="none" style={{ display: 'block' }}>
      <path d={path} fill={fill} fillOpacity={1} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
});

const NavigationStack = memo(function NavigationStack({
  stack,
  onNavigateBack,
  isDark = false,
  top = '16px',
  left = '16px',
}: NavigationStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Always render at least the root entry so the user knows where they are.
  if (stack.length === 0) return null;

  const visitedStroke  = isDark ? '#908e8c' : '#747270';
  const visitedText    = isDark ? '#908e8c' : '#747270';
  const activeStroke   = isDark ? '#e8e6e4' : '#1a1a18';
  const activeText     = isDark ? '#e8e6e4' : '#1a1a18';
  const connectorColor = isDark ? '#908e8c' : '#747270';
  const connectorMarginLeft = 10.5; // padding(4) + circleHalf(7) - connectorHalf(0.5)
  const currentIndex = stack.length - 1;

  return (
    <div
      data-help="navigation-stack"
      style={{
        position: 'absolute',
        top,
        left,
        zIndex: 30,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
        {stack.flatMap((entry, index) => {
          const isCurrent   = index === currentIndex;
          const isClickable = index < currentIndex;
          const isHovered   = hoveredIndex === index;
          const pastelFill  = PASTEL_FILLS[index % PASTEL_FILLS.length];
          const rowBg = isCurrent
            ? hexToRgba(pastelFill, 0.6)
            : isHovered && isClickable
            ? hexToRgba(pastelFill, 0.3)
            : 'transparent';

          const items: React.ReactNode[] = [];

          if (index > 0) {
            items.push(
              <div
                key={`conn-${index}`}
                style={{
                  width: '1px',
                  height: '20px',
                  marginLeft: `${connectorMarginLeft}px`,
                  marginTop: '-6px',
                  marginBottom: '-6px',
                  background: connectorColor,
                  alignSelf: 'flex-start',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1,
                }}
              />,
            );
          }

          items.push(
            <div
              key={`${entry.layerId}-${index}`}
              style={{
                position: 'relative',
                zIndex: 2,
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '22px',
                padding: '4px',
                borderRadius: '8px',
                cursor: isClickable ? 'pointer' : 'default',
                background: rowBg,
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={e => { e.stopPropagation(); if (isClickable) onNavigateBack(index); }}
            >
              <div style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 4 }}>
                {isCurrent ? (
                  <OrganicCircle size={CIRCLE_SIZE} fill={pastelFill} stroke={activeStroke} strokeWidth={1.5} variant={index} isActive />
                ) : (
                  <OrganicCircle size={CIRCLE_SIZE} fill={pastelFill} stroke={visitedStroke} strokeWidth={1} variant={index} />
                )}
              </div>
              <span
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: isCurrent || (isHovered && isClickable) ? '11px' : '9px',
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? activeText : visitedText,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, font-size 0.15s',
                }}
              >
                {entry.label}
              </span>
            </div>,
          );

          return items;
        })}
      </div>
    </div>
  );
});

export default NavigationStack;
