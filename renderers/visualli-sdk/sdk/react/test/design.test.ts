// Design resolution, comfort attributes and term splitting (pure logic, no DOM).

import { describe, expect, it } from 'vitest';
import { resolveDesign, makeDesign } from '../src/design/design';
import { splitTerms } from '../src/components/Overlays';
import { TOKENS, THEME_NAMES } from '@visualli/core';

const env = { prefersDark: false, forcedColors: false, prefersReducedMotion: false };

describe('resolveDesign', () => {
  it('defaults to light and exposes the spec CSS attributes', () => {
    const d = resolveDesign({}, env);
    expect(d.theme).toBe('light');
    expect(d.attrs).toEqual({ 'data-theme': 'light' });
    expect(d.tokens).toBe(TOKENS.light);
  });
  it('accepts the old isDark prop for one release', () => {
    expect(resolveDesign({ isDark: true }, env).theme).toBe('dark');
    expect(resolveDesign({ isDark: false }, env).theme).toBe('light');
    expect(resolveDesign({ theme: 'focus-dark', isDark: false }, env).theme).toBe('focus-dark'); // theme wins
  });
  it('resolves every theme and marks dark ones', () => {
    for (const t of THEME_NAMES) {
      const d = resolveDesign({ theme: t }, env);
      expect(d.theme).toBe(t);
      expect(d.isDark).toBe(t.endsWith('dark'));
    }
  });
  it("'auto' follows the reader", () => {
    expect(resolveDesign({ theme: 'auto' }, { ...env, prefersDark: true }).theme).toBe('dark');
    expect(resolveDesign({ theme: 'contrast' }, { ...env, prefersDark: true }).theme).toBe('contrast-dark');
  });
  it('switches to high contrast under forced-colors (keeping light/dark), unless opted out', () => {
    const forced = { ...env, forcedColors: true };
    expect(resolveDesign({ theme: 'light' }, forced).theme).toBe('contrast-light');
    expect(resolveDesign({ theme: 'dark' }, forced).theme).toBe('contrast-dark');
    expect(resolveDesign({ theme: 'focus-dark' }, forced).theme).toBe('contrast-dark');
    expect(resolveDesign({ theme: 'contrast-light' }, forced).theme).toBe('contrast-light');
    expect(resolveDesign({ theme: 'light', respectForcedColors: false }, forced).theme).toBe('light');
  });
  it('comfort settings become data attributes and change fonts / metrics', () => {
    const d = resolveDesign({ comfort: { readableType: true, largerText: true, reducedMotion: true } }, env);
    expect(d.attrs).toEqual({ 'data-theme': 'light', 'data-type': 'readable', 'data-scale': 'lg', 'data-motion': 'reduced' });
    expect(d.fontHand).toBe(d.fontUi);
    expect(d.fontNote).toBe(d.fontUi);
    expect(d.labelScale).toBe(1.15);
    expect(d.metrics.durationBase).toBe(0);
    expect(d.edgeLabel.size).toBeLessThan(resolveDesign({}, env).edgeLabel.size);
  });
  it('reduced motion follows the OS when unset', () => {
    expect(resolveDesign({}, { ...env, prefersReducedMotion: true }).attrs['data-motion']).toBe('reduced');
    expect(resolveDesign({ comfort: { reducedMotion: false } }, { ...env, prefersReducedMotion: true }).attrs['data-motion']).toBeUndefined();
  });
  it('contrast themes drop the idea shadow; others use the spec shadow', () => {
    expect(makeDesign('contrast-light', { readableType: false, largerText: false, reducedMotion: false }).nodeShadow).toBeNull();
    const light = resolveDesign({ theme: 'light' }, env).nodeShadow!;
    const dark = resolveDesign({ theme: 'dark' }, env).nodeShadow!;
    expect(light.blur).toBe(14);
    expect(light.y).toBe(6);
    expect(dark.blur).toBe(22);
    expect(dark.y).toBe(0);
  });
  it('is memoised per theme + comfort', () => {
    expect(resolveDesign({ theme: 'dark' }, env)).toBe(resolveDesign({ theme: 'dark' }, env));
  });
});

describe('splitTerms', () => {
  const anchors = [
    { word: 'evaporation', description: 'a' },
    { word: 'water vapour', description: 'b' },
    { word: 'rain', description: 'c' },
  ];
  it('splits on whole words, case-insensitively, keeping the written case', () => {
    const parts = splitTerms('Evaporation turns water vapour into rain.', anchors);
    expect(parts.map((p) => (typeof p === 'string' ? p : `[${p.word}]`)).join('')).toBe('[Evaporation] turns [water vapour] into [rain].');
  });
  it('does not match inside longer words', () => {
    expect(splitTerms('Training and brain', anchors)).toEqual(['Training and brain']);
  });
  it('returns the text untouched without anchors', () => {
    expect(splitTerms('plain', [])).toEqual(['plain']);
  });
  it('escapes regex characters in terms', () => {
    const parts = splitTerms('The C++ language', [{ word: 'C++', description: 'x' }]);
    expect(parts).toHaveLength(3);
    expect((parts[1] as { word: string }).word).toBe('C++');
  });
});
