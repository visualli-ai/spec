// ─── Visualli Context ─────────────────────────────────────────────────────────
//
// React Context for Visualli components (minimal implementation)

import React, { createContext, useContext } from 'react';

export interface VisualliContextValue {
  // Reserved for future use
}

const VisualliContext = createContext<VisualliContextValue | null>(null);

export interface VisualliProviderProps {
  children: React.ReactNode;
}

/**
 * Provider for Visualli context
 * 
 * @example
 * ```tsx
 * <VisualliProvider>
 *   <VisualliCanvas document={doc} />
 * </VisualliProvider>
 * ```
 */
export function VisualliProvider({
  children,
}: VisualliProviderProps) {
  const value: VisualliContextValue = {};

  return (
    <VisualliContext.Provider value={value}>
      {children}
    </VisualliContext.Provider>
  );
}

/**
 * Hook to access Visualli context
 * 
 * Returns default empty values if used outside of VisualliProvider
 */
export function useVisualli(): VisualliContextValue {
  const ctx = useContext(VisualliContext);
  if (!ctx) {
    return {};
  }
  return ctx;
}
