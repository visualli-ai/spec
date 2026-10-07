// Generated from visualli.ai design-system/components/src/interaction.ts — do not edit here.
/* How the canvas answers the pointer and the keyboard — the timing and rules behind the peek (an idea's summary)
   and terms (semantic anchors: an underlined word and its definition card). The look and the pop-in animation live
   in the CSS (.vi-fact, .vi-anchor, .vi-anchor-card); these are the behaviours, as data, so every renderer (VisualMap,
   the spec SDK on a canvas) opens and closes them alike. Times in ms. No dependencies, so it can travel alone. */

/** Terms (semantic anchors) in a peek's text. */
export const TERM = {
  /** Hovering the term this long opens its definition card… */ hoverOpen: 250,
  /** …which closes this long after the pointer leaves both the term and the card (moving between them keeps it open). */ hoverClose: 300,
  /** Only a mouse opens on hover; touch and pen open on tap. */ hoverPointers: ['mouse'] as readonly string[],
  /** A click, tap, Enter or Space pins the card open (hovering away doesn't close it); pressing again unpins and closes. */ clickPins: true,
  /** Escape closes the card and returns focus to the term; a press anywhere outside the term and its card closes it. */ escapeCloses: true, pressOutsideCloses: true,
  /** Opening by click or keyboard moves focus to the card's first link or button. */ focusCardOnOpen: true,
  /** The card is kept this far inside the viewport's left and right edges. */ viewportMargin: 8,
  /** The card's link to a source about the term. */ learnMoreLabel: 'Learn more',
} as const;

/** The peek: an idea's summary card on hover (pointer) or tap (touch). */
export const PEEK = {
  /** Hovering an idea opens its peek at once; it stays this long after the pointer leaves the idea (and while the
   *  pointer is over the peek itself), so the pointer can travel from the idea onto the card. */ hoverClose: 180,
} as const;

/** The touch peek: a bottom sheet with a grip. */
export const SHEET = {
  /** Dragging the grip down this far closes the sheet (or collapses it when expanded); up this far expands it. */ dismissDrag: 80, expandDrag: 40,
  /** Its height: this share of the map, at most `maxHeight` px; the map pans the chosen idea into the space above it. */ heightRatio: 0.42, maxHeight: 300,
} as const;

/** Zoom, pan and fit. */
export const VIEW = {
  /** Each zoom step multiplies or divides the zoom by this. */ zoomStep: 1.2,
  /** Zoom limits (the zoom-min / zoom-max tokens; the build checks they agree). */ zoomMin: 0.3, zoomMax: 5,
  /** Fit to view never enlarges a layer beyond this. */ fitMax: 1.1,
} as const;

/** Touch gestures on the map (any touch input — phones, tablets and touchscreen laptops alike; it follows the pointer
 *  in use, not the device, so a mouse or trackpad on the same laptop isn't affected). */
export const GESTURE = {
  /** Two fingers pinch to zoom the map's contents — ideas, connectors, containers and their labels — around the
   *  point between the fingers, within VIEW's limits. Controls, the depth trail, the peek, chat and the page never scale. */ pinchZoom: true,
  /** Moving both fingers pans the contents. */ twoFingerPan: true,
  /** The pointers that pinch (PointerEvent.pointerType). */ pointers: ['touch'] as readonly string[],
  /** Where the map is the page (an app: AppShell, the mobile app), it takes every touch gesture (touch-action: none),
   *  so the browser never zooms the page. Embedded on a scrolling page (website, docs), one finger still scrolls the
   *  page (touch-action: pan-x pan-y); two fingers that land together pinch the map. */ appTouchAction: 'none', embeddedTouchAction: 'pan-x pan-y',
  /** Zoom never navigates: stepping inside and backing out stay explicit (tap an idea / Step inside, the depth trail,
   *  Escape or Backspace). */ zoomNavigates: false,
} as const;

/** The zoom after a pinch: the zoom at the start, scaled by how far the fingers spread, within VIEW's limits. */
export function pinchZoom(startZoom: number, startDistance: number, distance: number): number {
  const z = startZoom * (distance / Math.max(startDistance, 1));
  return Math.min(VIEW.zoomMax, Math.max(VIEW.zoomMin, z));
}

/** Keeps the map point that was under `from` under `to` when the scale changes from `s0` to `s1`: the new
 *  translation, given the old one (screen = world × s + t). Used to zoom around the fingers. */
export function zoomAround(t0: { x: number; y: number }, s0: number, s1: number, from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const wx = (from.x - t0.x) / s0, wy = (from.y - t0.y) / s0;
  return { x: to.x - wx * s1, y: to.y - wy * s1 };
}

/** How an input answers: a mouse hovers (peeks and terms open on hover); touch and pen tap. Null for unknown pointers. */
export function pointerModeFor(pointerType: string): 'hover' | 'touch' | null {
  return pointerType === 'mouse' ? 'hover' : pointerType === 'touch' || pointerType === 'pen' ? 'touch' : null;
}

/** Whether a pointer of this type opens a term on hover (PointerEvent.pointerType). */
export function hoverOpensTerm(pointerType: string): boolean {
  return TERM.hoverPointers.includes(pointerType);
}
