// ─── useDesign ───────────────────────────────────────────────────────────────
//
// Resolves theme + comfort props against the reader's environment (colour
// scheme, forced colours, reduced motion) and keeps them live.

import { useMemo, useSyncExternalStore } from 'react';
import { resolveDesign, type Design, type DesignProps } from './design';

function useMedia(query: string): boolean {
  const subscribe = (cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
  const get = () => (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches);
  return useSyncExternalStore(subscribe, get, () => false);
}

/** The reader's current preferences. */
export function useReaderEnv() {
  return {
    prefersDark: useMedia('(prefers-color-scheme: dark)'),
    forcedColors: useMedia('(forced-colors: active)'),
    prefersReducedMotion: useMedia('(prefers-reduced-motion: reduce)'),
  };
}

export function useDesign(props: DesignProps): Design {
  const env = useReaderEnv();
  const { theme, isDark, respectForcedColors } = props;
  const { readableType, largerText, reducedMotion } = props.comfort ?? {};
  return useMemo(
    () => resolveDesign({ theme, isDark, respectForcedColors, comfort: { readableType, largerText, reducedMotion } }, env),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, isDark, respectForcedColors, readableType, largerText, reducedMotion, env.prefersDark, env.forcedColors, env.prefersReducedMotion],
  );
}
