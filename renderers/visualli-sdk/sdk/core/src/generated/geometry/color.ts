// Generated from visualli.ai design-system/components/src/color.ts — do not edit here.
/* Which topic an idea is drawn in. A `.visualli` file's `data.color` may name one of the eight topics or be any
   other color, or be missing. Every renderer resolves it with this rule, so a file looks the same everywhere:
     a topic name ('teal', 'Harbor ')  → that topic (case and surrounding spaces don't matter);
     no color                          → the topics in order, by the idea's position among its siblings (so siblings differ);
     anything else (e.g. '#b7e7f3')    → null: not a topic — drawn as given (customColor): the color as the fill, and
                                         the fill darkened (CUSTOM.ringShade) as the ring; a custom color doesn't follow themes.
   No dependencies, so it can travel alone. */

/** The eight topics, in the order missing colors cycle through. */
export const TOPIC_ORDER = ['teal', 'harbor', 'iris', 'berry', 'coral', 'amber', 'sun', 'stone'] as const;
export type TopicName = (typeof TOPIC_ORDER)[number];

/** The topic a color names, or null. */
export function topicFromName(color: string | null | undefined): TopicName | null {
  if (!color) return null;
  const c = color.trim().toLowerCase();
  return (TOPIC_ORDER as readonly string[]).includes(c) ? (c as TopicName) : null;
}

/** The topic for an idea: its named topic; with no color, the next topic in sibling order; null for any other color. */
export function topicFor(color: string | null | undefined, siblingIndex: number): TopicName | null {
  if (!color || !color.trim()) return TOPIC_ORDER[((siblingIndex % TOPIC_ORDER.length) + TOPIC_ORDER.length) % TOPIC_ORDER.length];
  return topicFromName(color);
}

/** A custom (non-topic) color: drawn as given, with a darker ring. */
export const CUSTOM = { /** The ring is the fill with each RGB channel multiplied by this. */ ringShade: 0.78 } as const;

/** Fill and ring for a custom color. `ring` is null when the color isn't a 6-digit hex (use the `edge` token then). */
export function customColor(color: string): { fill: string; ring: string | null } {
  const m = /^#?([0-9a-f]{6})$/i.exec((color || '').trim());
  if (!m) return { fill: color, ring: null };
  const n = parseInt(m[1], 16), f = CUSTOM.ringShade;
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return { fill: color.trim(), ring: '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1) };
}
