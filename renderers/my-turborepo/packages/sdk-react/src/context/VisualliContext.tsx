// ─── Visualli Context ─────────────────────────────────────────────────────────
//
// React Context for runtime injection of parser middlewares and extension components

import React, { createContext, useContext, useMemo } from 'react';
import type { ParserMiddleware } from '@visualli/core';

/**
 * Props passed to extension components
 */
export interface ExtensionComponentProps {
  extension: any; // The extension object from document.extensions
  document: any;  // Full document for cross-referencing
}

/**
 * Registry of extension renderers keyed by extension.id
 */
export type ExtensionRegistry = Record<
  string,
  React.ComponentType<ExtensionComponentProps>
>;

export interface VisualliContextValue {
  middlewares: ParserMiddleware[];
  extensions: ExtensionRegistry;
}

const VisualliContext = createContext<VisualliContextValue | null>(null);

export interface VisualliProviderProps {
  children: React.ReactNode;
  middlewares?: ParserMiddleware[];
  extensions?: ExtensionRegistry;
}

/**
 * Provider for runtime injection of middlewares and extension components
 * 
 * @example
 * ```tsx
 * <VisualliProvider
 *   middlewares={[myMiddleware]}
 *   extensions={{ 'my-ext': MyExtensionComponent }}
 * >
 *   <VisualliCanvas document={doc} />
 * </VisualliProvider>
 * ```
 */
export function VisualliProvider({
  children,
  middlewares = [],
  extensions = {},
}: VisualliProviderProps) {
  const value = useMemo(
    () => ({ middlewares, extensions }),
    [middlewares, extensions]
  );

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
    // Return defaults if no provider
    return { middlewares: [], extensions: {} };
  }
  return ctx;
}
