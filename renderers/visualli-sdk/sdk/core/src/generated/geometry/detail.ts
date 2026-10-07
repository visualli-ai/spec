// Generated from visualli.ai design-system/components/src/detail.ts — do not edit here.
/* Level of detail: what an idea draws at the size it's seen. Far-out views of large maps show ideas as specks; the
   rings, label and shadow of an idea a few pixels wide can't be seen, and drawing them makes large maps slow. Every
   renderer follows the same thresholds, so a map simplifies alike everywhere. Sizes are on-screen CSS pixels of the
   idea's width. No dependencies, so it can travel alone. */

export const DETAIL = {
  /** Below this on-screen width an idea draws only its body: no rings, label or shadow. */ bodyOnlyBelow: 24,
  /** Below this it may be drawn as a plain filled speck in its topic fill (no outline) — indistinguishable at this size. */ speckBelow: 12,
  /** Above this many ideas in view, idea shadows are skipped (the costliest effect to draw). */ shadowsMaxVisible: 150,
} as const;

export type IdeaDetail = 'full' | 'body' | 'speck';

/** What an idea of this on-screen width draws. A selected, focused or hovered idea always draws in full. */
export function ideaDetail(screenWidth: number, emphasised = false): IdeaDetail {
  if (emphasised || screenWidth >= DETAIL.bodyOnlyBelow) return 'full';
  return screenWidth < DETAIL.speckBelow ? 'speck' : 'body';
}

/** Whether idea shadows are drawn with this many ideas in view. */
export function shadowsShown(visibleIdeas: number): boolean { return visibleIdeas <= DETAIL.shadowsMaxVisible; }
