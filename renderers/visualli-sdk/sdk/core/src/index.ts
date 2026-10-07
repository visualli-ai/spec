// ─── @visualli/core — Main Barrel Export ────────────────────────────────────
//
// Import from sub-paths for tree-shaking (e.g. `@visualli/core/layout`),
// or use the main barrel for convenience.

export * from './types/index.js';
export * from './layout/index.js';
export * from './parser/index.js';
export * from './constants/index.js';
export * from './viewport/index.js';
export * from './performance/index.js';
export * from './spatial/index.js';
export * from './stores/index.js';
export * from './utils/navigation.js';
export * from './rendering/culling.js';
export * from './config/index.js';
export * from './theme/index.js';

// The design system's choreography (layer reveal, step inside, back out, hover, reduced motion), verbatim.
export { MOTION, EASE, revealDelay, connectorDelay, revealTotal, bloomOffset, swapDelay, cssEase, ease as easeBezier, motionVars, revealSlot, layerBlooms, layerReveal } from './generated/geometry/motion.js';
export type { Bezier } from './generated/geometry/motion.js';
// Containers: the dashed hull around a group's ideas and where its name goes (a pill on the hull, placed clear of
// ideas, connectors and other names), verbatim from the design system's geometry/container.ts.
export { HULL, HULL_CLEAR, containerHull, labelCandidates, placeContainerLabel, connectorSamples } from './generated/geometry/container.js';
export type { Hull, Box as LabelBox, LabelPlacement, LabelSide, Pt } from './generated/geometry/container.js';
// How terms, the peek, the touch sheet, zoom, fit and the depth trail behave, and which colour an idea gets: the design
// system's geometry/interaction.ts and geometry/color.ts, verbatim. (Idea size and label growth, geometry/idea.ts, come
// through rendering/ideaSize.)
export { TERM, PEEK, SHEET, VIEW, GESTURE, FRAME, PEEK_PLACEMENT, TRAIL, pointerModeFor, hoverOpensTerm, pinchZoom, zoomAround, layerBounds, fitView, peekPosition } from './generated/geometry/interaction.js';
export type { FrameBox } from './generated/geometry/interaction.js';
// Level of detail: what an idea draws at the size it's seen, and when shadows are skipped (geometry/detail.ts, verbatim).
export { DETAIL, ideaDetail, shadowsShown } from './generated/geometry/detail.js';
export type { IdeaDetail } from './generated/geometry/detail.js';
export { TOPIC_ORDER, CUSTOM, topicFor } from './generated/geometry/color.js';
