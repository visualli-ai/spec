// Going back a layer by gesture (VI-040): the double-tap rule (src/utils/backGesture.ts, the design system's BACK).
import { describe, expect, it } from 'vitest';
import { BACK } from '@visualli/core';
import { isDoubleTap } from '../src/utils/backGesture';

const first = { t: 1000, x: 100, y: 100, closed: false };

describe('a double-tap on the empty canvas', () => {
  it('is two taps close in time and place', () => {
    expect(isDoubleTap(first, { t: 1000 + BACK.doubleTapMs - 1, x: 110, y: 105 })).toBe(true);
  });
  it('is not a first tap on its own', () => {
    expect(isDoubleTap(null, { t: 1000, x: 100, y: 100 })).toBe(false);
  });
  it('is not two taps too far apart in time', () => {
    expect(isDoubleTap(first, { t: 1000 + BACK.doubleTapMs, x: 100, y: 100 })).toBe(false);
  });
  it('is not two taps too far apart on screen', () => {
    expect(isDoubleTap(first, { t: 1100, x: 100 + BACK.doubleTapPx, y: 100 })).toBe(false);
  });
  it('does not start with a tap that closed a peek', () => {
    expect(isDoubleTap({ ...first, closed: true }, { t: 1100, x: 100, y: 100 })).toBe(false);
  });
});
