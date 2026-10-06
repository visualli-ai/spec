// Generated from visualli.ai design-system/components/src/color.ts — do not edit here.
/* Which topic an idea is drawn in. A `.visualli` file's `data.color` may name one of the eight topics or be any
   other color, or be missing. Every renderer resolves it with this rule, so a file looks the same everywhere:
     a topic name ('teal', 'Harbor ')  → that topic (case and surrounding spaces don't matter);
     no color                          → the topics in order, by the idea's position among its siblings (so siblings differ);
     anything else (e.g. '#b7e7f3')    → null: not a topic — the renderer decides (VisualMap draws it as given).
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
