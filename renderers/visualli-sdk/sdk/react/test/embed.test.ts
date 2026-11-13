// Embedding safety: everything the SDK injects into a host page applies to the map only (.vi-*), so the page around
// it keeps its own variables and styles — the design system's tokens.embed.css + css/spec.css, as generated.

import { describe, expect, it } from 'vitest';
import { SPEC_COMPONENT_CSS, SPEC_TOKENS_CSS } from '../src/generated/specCss';
import { GESTURE, IMMERSION } from '@visualli/core';
import { isSafeUrl } from '../src/components/Overlays';

/** Every selector in a stylesheet (rule preludes, including those inside @media), skipping @keyframes steps. */
function selectors(css: string): string[] {
  const out: string[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '');
  for (const m of text.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    const prelude = m[1]!.trim();
    if (!prelude || prelude.startsWith('@')) continue;
    out.push(...prelude.replace(/^@[^{]*\{/, '').split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean));
  }
  return out;
}
const scoped = (sel: string) => /\.vi-|\[class[\^*]?="\s?vi-/.test(sel);

describe('injected styles stay inside the map', () => {
  it('tokens: no rule sets variables on :root or a bare [data-theme]', () => {
    const outside = selectors(SPEC_TOKENS_CSS).filter((s) => !scoped(s));
    expect(outside).toEqual([]);
    expect(SPEC_TOKENS_CSS).toContain('.vi-map[data-theme="dark"]'); // the map's own theme
    expect(SPEC_TOKENS_CSS).toContain(':where([data-theme="dark"]) .vi-map'); // or an ancestor's
  });
  it('component CSS: every selector targets .vi-* elements', () => {
    expect(selectors(SPEC_COMPONENT_CSS).filter((s) => !scoped(s))).toEqual([]);
  });
});

describe('spec defaults the renderer follows', () => {
  it('chromatic immersion is on by default (design system IMMERSION)', () => {
    expect(IMMERSION.defaultOn).toBe(true);
  });
  it('gesture thresholds come from the design system', () => {
    expect(GESTURE.panSlop).toBeGreaterThan(0);
    expect(GESTURE.ideaDragSlop.hover).toBeLessThan(GESTURE.ideaDragSlop.touch);
  });
});

describe('security: URL protocol validation for semantic anchors', () => {
  it('allows safe http and https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('http://example.com/page?query=1#hash')).toBe(true);
    expect(isSafeUrl('https://spec.visualli.ai')).toBe(true);
  });

  it('rejects dangerous protocols (javascript:, data:, vbscript:, etc.)', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('javascript:/*--></title></style></textarea>*/<svg/onload=alert(1)>')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox("XSS")')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects empty, null, and undefined values', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });
});
