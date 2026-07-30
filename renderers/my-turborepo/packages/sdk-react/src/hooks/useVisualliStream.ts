// ─── useVisualliStream Hook ───────────────────────────────────────────────────
//
// Hook to fetch and parse JSONL stream from backend with middleware support

import { useState, useEffect, useRef } from 'react';
import { VisualliParser, JSONLStreamReader } from '@visualli/core';
import type { VisualliDocument } from '@visualli/core';
import { useVisualli } from '../context/VisualliContext';

export interface UseVisualliStreamReturn {
  document: VisualliDocument | null;
  isLoading: boolean;
  error: Error | null;
  progress: number; // 0-100
}

/**
 * Hook to fetch and parse JSONL stream from backend
 * 
 * Automatically applies registered middlewares from VisualliProvider
 * 
 * @param url - URL to fetch JSONL stream from (null to skip fetching)
 * @returns Stream state with document, loading, error, and progress
 * 
 * @example
 * ```tsx
 * const { document, isLoading, error, progress } = useVisualliStream(apiUrl);
 * 
 * if (isLoading) return <div>Loading... {progress}%</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (!document) return null;
 * 
 * return <VisualliCanvas document={document} />;
 * ```
 */
export function useVisualliStream(
  url: string | null
): UseVisualliStreamReturn {
  const { middlewares } = useVisualli();
  const [document, setDocument] = useState<VisualliDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      setDocument(null);
      setIsLoading(false);
      setError(null);
      setProgress(0);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchStream = async () => {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      try {
        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const parser = new VisualliParser();
        middlewares.forEach(mw => parser.use(mw));

        const lines: any[] = [];
        const reader = new JSONLStreamReader(parser, (parsedLine) => {
          if (parsedLine) {
            lines.push(parsedLine);
            setProgress(Math.min(90, lines.length * 2)); // Fake progress
          }
        });

        if (!response.body) throw new Error('No response body');
        
        await reader.consumeStream(response.body);

        // Build document from accumulated lines
        const reconstructed = lines.map(l => JSON.stringify(l)).join('\n');
        const doc = parser.parseDocument(reconstructed);
        
        setDocument(doc);
        setProgress(100);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [url, middlewares]);

  return { document, isLoading, error, progress };
}
