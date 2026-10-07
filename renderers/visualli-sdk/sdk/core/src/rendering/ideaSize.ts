// ─── Idea size and label growth ──────────────────────────────────────────────
//
// The design system's idea.ts (copied verbatim into generated/geometry): an idea
// grows to show its whole label, and labels grow a little when zoomed out. The
// SDK only supplies the text measurement (its font engine) and picks the kind.

import { IDEA, LABEL_GROWTH, ideaSize, labelGrowth, wrapLines, type IdeaKind } from '../generated/geometry/idea.js';
import type { VisualliLayer } from '../types/layer.js';

export { IDEA, LABEL_GROWTH, ideaSize, labelGrowth, wrapLines };
export type { IdeaKind };

/** Width in px of `text` in the idea label's face at `px` (the label's weight; readable type adds its tracking). */
export type IdeaMeasure = (text: string, px: number) => number;

/** Measurement without a font engine (server, tests): half an em per character. Renderers pass the real face. */
export const approximateMeasure: IdeaMeasure = (text, px) => text.length * px * 0.5;

/** The size kind of the `index`-th idea of a layer: the centre of the root radial layer is the root, the rest ideas. */
export const ideaKindOf = (layer: Pick<VisualliLayer, 'level' | 'layout'>, index: number): IdeaKind =>
  layer.level === 0 && (layer.layout ?? 'radial') === 'radial' && index === 0 ? 'root' : 'node';
