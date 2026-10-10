// ─── VisualliRenderer ────────────────────────────────────────────────────────
//
// The single public-facing component for rendering a .visualli document.
//
//   <VisualliRenderer visualliString={str} theme="dark" width="100%" height="600px" />
//   <VisualliRenderer visualliFile={file}  theme="auto" width={800}   height={600} />
//   <VisualliRenderer document={doc}       theme="auto" width={800}   height={600} />
//
// Handles:
//  • theme: 'dark' | 'light' | 'auto'  — auto follows prefers-color-scheme
//  • width / height as first-class props (CSS string or pixel number)
//  • Empty state  — no data prop provided
//  • Loading state — while parsing a .visualli file/string
//  • Error state  — parse failure with message
//  • useWorker    — offload parsing to a Web Worker (default: false)
//  • Delegates all canvas/navigation/zoom logic to VisualliCanvas

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { VisualliDocument, Comfort, ThemeInput, TopicName } from '@visualli/core';
import { blobPath, parseVisualliFile, shapeForLevel, IMMERSION } from '@visualli/core';
import VisualliCanvas from './VisualliCanvas';
import { useDesign } from './design/useDesign';
import { ensureDesignSystemStyles, type DesignSystemAssets } from './design/runtime';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Any of the 8 design-system themes ('light', 'dark', 'focus-light', 'focus-dark', 'colorsafe-light',
 * 'colorsafe-dark', 'contrast-light', 'contrast-dark'), a family ('focus' | 'colorsafe' | 'contrast'),
 * or 'auto' (follow the reader's colour scheme). 'light' | 'dark' | 'auto' are the pre-0.2 values and keep working.
 */
export type VisualliTheme = ThemeInput;

export interface VisualliRendererProps {
  /**
   * Raw JSONL string — the content of a .visualli file.
   * Simply pass the string data directly, no preprocessing needed.
   * Example: visualliString="{\"type\":\"meta\"...}\n{\"type\":\"layer\"...}"
   */
  visualliString?: string;

  /**
   * A .visualli file — can be:
   *  - File object (e.g. from <input type="file">)
   *  - String path to file (e.g. '/data/myfile.visualli' or './src/data/data.visualli')
   * The renderer automatically fetches, reads, and parses it.
   * No user code required for conversion or processing.
   */
  visualliFile?: File | string;

  /**
   * When true, parsing is offloaded to a Web Worker so the main thread never
   * blocks during JSON.parse. Recommended for large documents (>500 nodes).
   * Has no effect when `document` is supplied (already parsed).
   * @default true
   */
  useWorker?: boolean;

  /**
   * Colour theme (see VisualliTheme).
   *  - 'auto' follows prefers-color-scheme (and switches to high contrast under forced-colors)
   * @default 'light'
   */
  theme?: VisualliTheme;

  /** Comfort settings: readable type, larger text, reduced motion ('system' follows the OS). */
  comfort?: Comfort;

  /** Switch to the high-contrast theme under forced-colors. @default true */
  respectForcedColors?: boolean;

  /**
   * Interaction layout: 'auto' follows the reader's input (touch -> bottom-sheet peek and larger
   * controls, pointer -> floating peek on hover); force one with 'touch' or 'pointer'.
   * @default 'auto'
   */
  layout?: 'auto' | 'touch' | 'pointer';

  /** Where the zoom / fit controls sit: the design system's 'bottom-right' (default) or the pre-0.2 'top-right'. */
  /**
   * The map is the page (an app such as Visualli's web app): it takes every touch gesture, so the browser never
   * zooms or scrolls the page — the design system's `.vi-map.is-app` (`touch-action: none`). Leave it off when the
   * map is embedded in a scrolling page: one finger then still scrolls the page, two fingers pinch the map.
   */
  app?: boolean;
  /** Where the zoom / fit controls sit: 'top-right' (default, the design system's placement) or 'bottom-right'. */
  controlsPosition?: 'top-right' | 'bottom-right';

  /**
   * Enable chromatic immersion background effect.
   * When true:
   *  - Root layer (level 0) shows the plain canvas
   *  - Child layers are tinted with the parent idea's topic colour
   * @default false
   */
  chromaticImmersion?: boolean;

  /**
   * Width of the renderer. Accepts any CSS length string ('100%', '800px', '100vw')
   * or a plain number treated as pixels.
   * @default '100%'
   */
  width?: string | number;

  /**
   * Height of the renderer. Accepts any CSS length string ('100%', '600px', '100vh')
   * or a plain number treated as pixels.
   * @default '100%'
   */
  height?: string | number;

  /** Directory URL the bundled Caveat font is served from (defaults to the copy in the npm package, via jsDelivr). */
  fontBaseUrl?: DesignSystemAssets['fontBaseUrl'];

  /** Set false when you load Kalam and Atkinson Hyperlegible yourself. */
  loadWebFonts?: DesignSystemAssets['loadWebFonts'];

  /** Additional CSS class on the root element. */
  className?: string;

  /** Additional inline styles merged onto the root element. */
  style?: React.CSSProperties;
}

// ── Empty / Loading / Error states ───────────────────────────────────────────
// A still note in the middle of the map: an idea's blob in a topic colour, a title and a line of text — the design
// system's shapes, tokens and type styles only, and no motion of its own (the product's own state screens live in
// Visualli's apps).

const stateBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 'var(--space-3)', padding: 'var(--space-7)', boxSizing: 'border-box', textAlign: 'center', color: 'var(--ink-muted)', background: 'var(--canvas)' };

function StateNote({ topic, title, children, role }: { topic: TopicName; title: string; children?: React.ReactNode; role?: 'status' | 'alert' }) {
  return (
    <div className="vi-map" style={stateBox} role={role} aria-live={role === 'status' ? 'polite' : undefined}>
      <svg width="64" height="52" viewBox="-32 -26 64 52" aria-hidden="true">
        <path d={blobPath(shapeForLevel(0), 26, 20)} fill={`var(--topic-${topic})`} stroke={`var(--topic-${topic}-ring)`} strokeWidth="2" />
      </svg>
      <p className="vi-text-label" style={{ margin: 0, color: 'var(--ink)' }}>{title}</p>
      {children && <div className="vi-text-body-sm" style={{ margin: 0, maxWidth: 480, overflowWrap: 'anywhere' }}>{children}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <StateNote topic="stone" title="Nothing to show yet">
      Pass a <code style={{ fontFamily: 'var(--font-mono)' }}>visualliFile</code> or <code style={{ fontFamily: 'var(--font-mono)' }}>visualliString</code>.
    </StateNote>
  );
}

function LoadingState() {
  return <StateNote topic="teal" title="Opening the map…" role="status" />;
}

function ErrorState({ message }: { message: string }) {
  return (
    <StateNote topic="berry" title="This map couldn't be opened" role="alert">
      <code style={{ fontFamily: 'var(--font-mono)' }}>{message}</code>
    </StateNote>
  );
}

// ── Inline worker script ──────────────────────────────────────────────────────
// Self-contained JSONL parser that mirrors parseVisualliFile.
// Runs in a Web Worker when useWorker=true; no external imports needed.

const WORKER_SCRIPT = `
self.onmessage = function(e) {
  var content = e.data;
  try {
    var lines = content.trim().split('\\n');
    var doc = {
      meta: null,
      layers: new Map(),
      layersByLevel: new Map(),
      rootLayer: null,
      extensions: {},
    };
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var obj;
      try { obj = JSON.parse(line); }
      catch(err) { throw new Error('Failed to parse JSON at line ' + (i+1) + ': ' + err); }
      if (!obj.type) throw new Error("Missing 'type' field at line " + (i+1));
      if (obj.type === 'meta') {
        doc.meta = obj;
      } else if (obj.type === 'layer') {
        doc.layers.set(obj.id, obj);
        if (!doc.layersByLevel.has(obj.level)) doc.layersByLevel.set(obj.level, []);
        doc.layersByLevel.get(obj.level).push(obj);
        if (obj.level === 0) doc.rootLayer = obj;
      } else if (obj.type === 'extension' && typeof obj.id === 'string') {
        doc.extensions[obj.id] = Array.isArray(obj.data) ? obj.data : [];
      }
    }
    if (!doc.meta)      throw new Error('Missing required meta section');
    if (!doc.rootLayer) throw new Error('Missing root layer (level 0)');
    self.postMessage({ ok: true, doc: doc });
  } catch(err) {
    self.postMessage({ ok: false, message: err.message || String(err) });
  }
};
`;

// Lazy-create worker URL once (module-level singleton).
let _workerUrl: string | null = null;
function getWorkerUrl(): string {
  if (!_workerUrl) {
    _workerUrl = URL.createObjectURL(new Blob([WORKER_SCRIPT], { type: 'text/javascript' }));
  }
  return _workerUrl;
}

// ── Parse hook ────────────────────────────────────────────────────────────────

type ParseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; doc: VisualliDocument }
  | { status: 'error'; message: string };

/**
 * Resolves a raw string + optional File into a ParseState.
 * When useWorker=true the JSON.parse work runs in a Web Worker so the main
 * thread is never blocked, even for very large documents.
 */
function useAsyncParse(
  content: string | undefined,
  useWorker: boolean,
): ParseState {
  const [state, setState] = useState<ParseState>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!content) { setState({ status: 'idle' }); return; }

    setState({ status: 'loading' });
    let cancelled = false;

    if (useWorker && typeof Worker !== 'undefined') {
      // Terminate any previous worker
      workerRef.current?.terminate();
      const w = new Worker(getWorkerUrl());
      workerRef.current = w;

      w.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        if (e.data.ok) {
          setState({ status: 'ready', doc: e.data.doc as VisualliDocument });
        } else {
          setState({ status: 'error', message: e.data.message });
        }
      };
      w.onerror = (e: ErrorEvent) => {
        if (!cancelled) setState({ status: 'error', message: e.message });
      };
      w.postMessage(content);

      return () => {
        cancelled = true;
        w.terminate();
        workerRef.current = null;
      };
    }

    // Main-thread path: defer via microtask so React paints the loading state first
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const doc = parseVisualliFile(content);
        if (!cancelled) setState({ status: 'ready', doc });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    });
    return () => { cancelled = true; };
  }, [content, useWorker]);

  // Terminate worker on unmount
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  return state;
}

// ── File → string hook ────────────────────────────────────────────────────────

function useFileText(file: File | string | undefined): { text: string | undefined; error: string | undefined; loading: boolean } {
  const [text,    setText]    = useState<string | undefined>(undefined);
  const [error,   setError]   = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) { setText(undefined); setError(undefined); setLoading(false); return; }
    setLoading(true); setText(undefined); setError(undefined);
    let cancelled = false;

    // Handle string path - fetch the file
    if (typeof file === 'string') {
      fetch(file)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
          return response.text();
        })
        .then(t => {
          if (!cancelled) { setText(t); setLoading(false); }
        })
        .catch((err: unknown) => {
          if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setLoading(false); }
        });
    }
    // Handle File object - read as text
    else {
      file.text().then(t => {
        if (!cancelled) { setText(t); setLoading(false); }
      }).catch((err: unknown) => {
        if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setLoading(false); }
      });
    }
    
    return () => { cancelled = true; };
  }, [file]);

  return { text, error, loading };
}

// ── VisualliRenderer ──────────────────────────────────────────────────────────

export default function VisualliRenderer({
  visualliString,
  visualliFile,
  theme = 'light',
  comfort,
  respectForcedColors,
  layout,
  controlsPosition,
  app,
  width = '100%',
  height = '100%',
  useWorker = true,
  chromaticImmersion = IMMERSION.defaultOn,
  fontBaseUrl,
  loadWebFonts,
  className,
  style,
}: VisualliRendererProps) {
  // Resolve once here so the empty / loading / error states carry the same theme attributes as the map.
  const design = useDesign({ theme, comfort, respectForcedColors });
  useState(() => { ensureDesignSystemStyles({ fontBaseUrl, loadWebFonts }); return true; });

  const cssWidth  = typeof width  === 'number' ? `${width}px`  : width;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  // Read File → text (no-op if not provided)
  const { text: fileText, error: fileReadError, loading: fileReading } = useFileText(visualliFile);

  // The raw JSONL string to parse: file takes priority over string prop
  const rawContent = fileText ?? visualliString;

  const parseState = useAsyncParse(rawContent, useWorker);

  const resolvedDoc: VisualliDocument | null = useMemo(() => {
    if (parseState.status === 'ready') return parseState.doc;
    return null;
  }, [parseState]);

  const wrapperStyle: React.CSSProperties = { width: cssWidth, height: cssHeight, overflow: 'hidden', ...style };
  const attrs = design.attrs;

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!visualliString && !visualliFile) {
    return <div className={className} {...attrs} style={wrapperStyle}><EmptyState /></div>;
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (fileReading || parseState.status === 'loading') {
    return <div className={className} {...attrs} style={wrapperStyle}><LoadingState /></div>;
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (fileReadError || parseState.status === 'error') {
    const msg = fileReadError ?? (parseState.status === 'error' ? parseState.message : 'Unknown error');
    return <div className={className} {...attrs} style={wrapperStyle}><ErrorState message={msg} /></div>;
  }

  // ── Canvas ──────────────────────────────────────────────────────────────────
  return (
    <div className={className} style={wrapperStyle}>
      <VisualliCanvas
        preParsedVisualli={resolvedDoc ?? undefined}
        theme={theme}
        comfort={comfort}
        respectForcedColors={respectForcedColors}
        layout={layout}
        controlsPosition={controlsPosition}
        app={app}
        fontBaseUrl={fontBaseUrl}
        loadWebFonts={loadWebFonts}
        chromaticImmersion={chromaticImmersion}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
