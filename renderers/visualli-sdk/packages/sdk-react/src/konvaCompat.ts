// ─── konvaCompat ──────────────────────────────────────────────────────────────
//
// react-konva@18.x defines KonvaNodeComponent with return type
// `ReactNode | Promise<ReactNode>`.  @types/react v19 tightened the JSX checker
// so that signature no longer satisfies `(props: any) => ReactNode`, causing
// TS2786 errors everywhere a Konva primitive is used as JSX.
//
// The fix: re-export every Konva primitive cast to React.ComponentType<any>.
// This is purely a type-level shim — no runtime behaviour changes.

import {
  Stage, Layer, Group, Shape, Path, Rect, Text, Arrow, Line, Circle, TextPath,
} from 'react-konva';
import type React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = React.ComponentType<any>;

export const KStage    = Stage    as unknown as C;
export const KLayer    = Layer    as unknown as C;
export const KGroup    = Group    as unknown as C;
export const KShape    = Shape    as unknown as C;
export const KPath     = Path     as unknown as C;
export const KRect     = Rect     as unknown as C;
export const KText     = Text     as unknown as C;
export const KArrow    = Arrow    as unknown as C;
export const KLine     = Line     as unknown as C;
export const KCircle   = Circle   as unknown as C;
export const KTextPath = TextPath as unknown as C;
