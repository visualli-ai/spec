// The peek is a Markdown renderer: a description that holds Markdown (bullets, bold, ...) renders as such, on the
// card and on the touch sheet, while plain text renders as it always did and term anchors keep working inside it.
// Rendered to static HTML in node (no browser): the public components are the seam, nothing is mocked.

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FlatNode, SemanticAnchor } from '@visualli/core';
import { PeekMarkdown } from '../src/components/PeekMarkdown';
import { PeekCard, PeekSheet } from '../src/components/Overlays';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const qubits: SemanticAnchor = { word: 'Qubits', description: 'Quantum bits.' };
const node = (description: string) => ({ id: 'n1', title: 'Quantum', description, topic: 'blue' }) as unknown as FlatNode;

describe('PeekMarkdown', () => {
  it('renders bullets and bold as a list with bold text', () => {
    const out = html(<PeekMarkdown text={'- **Physics-based** departure\n- **Qubits** as superpositions'} />);
    expect(out).toBe('<ul><li><strong>Physics-based</strong> departure</li><li><strong>Qubits</strong> as superpositions</li></ul>');
  });

  it('renders one line of plain text as it always did: just the text', () => {
    expect(html(<PeekMarkdown text="A plain sentence, no Markdown." />)).toBe('A plain sentence, no Markdown.');
  });

  it('hands every text node to renderText, not the markers', () => {
    const runs: string[] = [];
    html(<PeekMarkdown text={'- **Qubits** as superpositions'} renderText={(run) => { runs.push(run); return run; }} />);
    expect(runs).toEqual(['Qubits', ' as superpositions']);
  });

  it('renders what renderText returns in place of the text', () => {
    const out = html(<PeekMarkdown text="**a** b" renderText={(run) => <mark>{run}</mark>} />);
    expect(out).toBe('<strong><mark>a</mark></strong><mark> b</mark>');
  });

  it('never runs or loads what untrusted text carries', () => {
    const out = html(<PeekMarkdown text={'<script>alert(1)</script> <img src=x onerror=alert(1)>\n\n[go](javascript:alert(1)) ![pixel](http://t.example/p.png)'} />);
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;'); // shown as text, not parsed
    expect(out).toContain('&lt;img');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('t.example');
  });

  it('opens a link in a new tab without handing the page to it', () => {
    const out = html(<PeekMarkdown text="[docs](https://example.com/docs)" />);
    expect(out).toContain('href="https://example.com/docs"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('does not throw on malformed Markdown or empty text', () => {
    for (const text of ['**unclosed bold', '- \n-\n- **', '*', '[x](', '```', '', '   ']) {
      expect(() => html(<PeekMarkdown text={text} />)).not.toThrow();
    }
  });
});

describe('the peek card and sheet', () => {
  const bullets = '- **Qubits** as superpositions\n- Measurement collapses the state';

  it('card: bullets render with no literal markers, and an anchor works inside bold text', () => {
    const out = html(<PeekCard node={node(bullets)} anchors={[qubits]} />);
    expect(out).toContain('<ul><li><strong>');
    expect(out).not.toContain('**');
    expect(out).toMatch(/<strong><span class="vi-anchor"[^>]*>.*Qubits.*<\/span><\/strong>/);
  });

  it('sheet: bullets render and an anchor is a term button inside the bullet', () => {
    const out = html(<PeekSheet node={node(bullets)} anchors={[qubits]} onClose={() => {}} expanded={false} onToggleExpanded={() => {}} height={300} />);
    expect(out).toContain('<ul><li><strong>');
    expect(out).toContain('class="vi-term"');
    expect(out).not.toContain('**');
  });

  it('a plain-text description still shows its anchors as before', () => {
    const out = html(<PeekCard node={node('Qubits are fragile.')} anchors={[qubits]} />);
    expect(out).toContain('class="vi-anchor"');
    expect(out).not.toContain('<ul>');
  });

  it('a host that passes renderContent still replaces the body', () => {
    const out = html(<PeekCard node={node(bullets)} anchors={[]} renderContent={() => <b>host</b>} />);
    expect(out).toContain('<b>host</b>');
    expect(out).not.toContain('<ul>');
  });
});
