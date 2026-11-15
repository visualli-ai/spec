// ─── PeekMarkdown ─────────────────────────────────────────────────────────────
//
// The peek body is a Markdown renderer: whatever Markdown a description holds (bullets, bold, ...) renders as
// such, on every surface that draws the SDK's peek. One line of plain text renders as plain text, as it always did.
//
// The text comes from files and models, so it is untrusted: raw HTML is shown as text (never parsed), images are
// dropped (nothing loads from a description), a `javascript:` link loses its href (markdown-to-jsx), and links open
// in a new tab without handing the page over. Output is React elements, never innerHTML.
//
// `renderText` is called for each text node (not the markers around it), so a host can decorate text, which is how
// the peek puts semantic-anchor terms inside bullets and bold text.
//
// Dependencies: markdown-to-jsx. No colours or type here: the design system's CSS styles the elements.

import React from 'react';
import Markdown, { RuleType } from 'markdown-to-jsx/react';

export interface PeekMarkdownProps {
  /** The description, as Markdown (or plain text). */
  text: string;
  /** Called for each text node; what it returns is drawn in place of the text. */
  renderText?: (run: string) => React.ReactNode;
}

export function PeekMarkdown({ text, renderText }: PeekMarkdownProps) {
  return (
    <Markdown
      options={{
        disableParsingRawHTML: true,
        // No wrapper element: one line of plain text stays just the text, inside the peek body.
        wrapper: React.Fragment,
        overrides: { a: { props: { target: '_blank', rel: 'noopener noreferrer nofollow' } } },
        renderRule(next, node) {
          if (node.type === RuleType.image) return null;
          if (node.type === RuleType.text && renderText) return renderText(node.text);
          return next();
        },
      }}
    >
      {text}
    </Markdown>
  );
}
