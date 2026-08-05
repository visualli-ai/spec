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
import type { VisualliDocument, VisualliLayer, FlatNode } from '@visualli/core';
import { parseVisualliFile } from '@visualli/core';
import VisualliCanvas from './VisualliCanvas';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisualliTheme = 'dark' | 'light' | 'auto';

export interface VisualliRendererProps {
  /**
   * Raw JSONL string — the content of a .visualli file.
   * Mutually exclusive with `visualliFile` and `document`.
   */
  visualliString?: string;

  /**
   * A File object pointing to a .visualli file (e.g. from an <input type="file">).
   * The renderer reads it as text and parses it automatically.
   * Mutually exclusive with `visualliString` and `document`.
   */
  visualliFile?: File;

  /**
   * Pre-parsed VisualliDocument object.
   * Use when you have already parsed the file yourself (e.g. server-side or
   * via a Web Worker). Mutually exclusive with `visualliString` / `visualliFile`.
   */
  document?: VisualliDocument;

  /**
   * When true, parsing is offloaded to a Web Worker so the main thread never
   * blocks during JSON.parse. Recommended for large documents (>500 nodes).
   * Has no effect when `document` is supplied (already parsed).
   * @default false
   */
  useWorker?: boolean;

  /**
   * Colour theme.
   *  - 'dark'  → always dark background
   *  - 'light' → always light background
   *  - 'auto'  → follows the OS/browser prefers-color-scheme (default)
   */
  theme?: VisualliTheme;

  /**
   * Enable chromatic immersion background effect.
   * When true:
   *  - Root layer (level 0) shows base background color
   *  - Child layers show parent node's color as semi-transparent background
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

  /** Called when the user single-clicks a node. */
  onNodeClick?: (node: FlatNode) => void;

  /** Called after a layer navigation (drill-in or back). */
  onLayerChange?: (layerId: string, layer: VisualliLayer) => void;

  /** Additional CSS class on the root element. */
  className?: string;

  /** Additional inline styles merged onto the root element. */
  style?: React.CSSProperties;
}

// ── System dark-mode hook ─────────────────────────────────────────────────────

function useSystemDark(): boolean {
  const mq = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const [dark, setDark] = useState<boolean>(mq?.matches ?? false);

  useEffect(() => {
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mq]);

  return dark;
}

// ── Font Injection Hook ───────────────────────────────────────────────────────

function useFontInjection() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const links = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap',
      'https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@300;400;600;800&family=Story+Script:wght@400&display=swap'
    ];

    links.forEach((href, i) => {
      const id = `visualli-font-${i}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = i < 2 ? 'preconnect' : 'stylesheet';
        link.href = href;
        if (i === 1) link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }
    });
  }, []);
}

// ── Empty / Loading / Error states ───────────────────────────────────────────

// ── UI State Components ───────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  const bg = isDark ? '#131311' : '#F5F3EF';
  const fg = isDark ? 'rgba(240,237,230,0.35)' : 'rgba(26,26,24,0.35)';
  const bd = isDark ? '#2A2A28' : '#DDD9D0';
  const code = { fontFamily: 'monospace', fontSize: 12, padding: '1px 4px', borderRadius: 4, background: isDark ? '#222220' : '#E8E4DC', border: `1px solid ${bd}` };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 16, background: bg, color: fg, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke={fg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="6" width="28" height="36" rx="3" />
        <line x1="16" y1="16" x2="32" y2="16" />
        <line x1="16" y1="22" x2="32" y2="22" />
        <line x1="16" y1="28" x2="26" y2="28" />
      </svg>
      <div style={{ textAlign: 'center', lineHeight: 1.7 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: isDark ? 'rgba(240,237,230,0.7)' : 'rgba(26,26,24,0.7)' }}>
          No .visualli file provided
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 13 }}>
          Pass a <code style={code}>visualliFile</code>, <code style={code}>visualliString</code>, or <code style={code}>document</code> prop.
        </p>
      </div>
    </div>
  );
}

function LoadingState({ isDark }: { isDark: boolean }) {
  const bg  = isDark ? '#131311' : '#F5F3EF';
  const fg  = isDark ? 'rgba(240,237,230,0.5)' : 'rgba(26,26,24,0.5)';
  const dot = isDark ? 'rgba(240,237,230,0.6)' : 'rgba(26,26,24,0.45)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 16, background: bg, color: fg, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: dot, animation: `vr-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes vr-pulse{0%,80%,100%{opacity:.2;transform:scale(.9)}40%{opacity:1;transform:scale(1.1)}}`}</style>
      <p style={{ margin: 0, fontSize: 14 }}>Loading .visualli file…</p>
    </div>
  );
}

function ErrorState({ message, isDark }: { message: string; isDark: boolean }) {
  const bg   = isDark ? '#131311' : '#F5F3EF';
  const bd   = isDark ? '#3a1f1f' : '#F0CECE';
  const card = isDark ? '#1e1212' : '#FFF5F5';
  const head = isDark ? '#F87171' : '#DC2626';
  const body = isDark ? 'rgba(248,113,113,0.8)' : 'rgba(180,40,40,0.8)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: '24px', background: bg, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 480, width: '100%', padding: '20px 24px', borderRadius: 12, border: `1px solid ${bd}`, background: card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={head} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: head }}>Failed to parse .visualli file</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: body, lineHeight: 1.6, wordBreak: 'break-word', fontFamily: 'monospace' }}>{message}</p>
      </div>
    </div>
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

function useFileText(file: File | undefined): { text: string | undefined; error: string | undefined; loading: boolean } {
  const [text,    setText]    = useState<string | undefined>(undefined);
  const [error,   setError]   = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) { setText(undefined); setError(undefined); setLoading(false); return; }
    setLoading(true); setText(undefined); setError(undefined);
    let cancelled = false;
    file.text().then(t => {
      if (!cancelled) { setText(t); setLoading(false); }
    }).catch((err: unknown) => {
      if (!cancelled) { setError(err instanceof Error ? err.message : String(err)); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [file]);

  return { text, error, loading };
}

// ── VisualliRenderer ──────────────────────────────────────────────────────────

export default function VisualliRenderer({
  visualliString,
  visualliFile,
  document: docProp,
  theme = 'auto',
  width = '100%',
  height = '100%',
  useWorker = false,
  chromaticImmersion = false,
  onNodeClick,
  onLayerChange,
  className,
  style,
}: VisualliRendererProps) {
  useFontInjection();
  const systemDark = useSystemDark();
  const isDark = theme === 'dark' ? true : theme === 'light' ? false : systemDark;

  const cssWidth  = typeof width  === 'number' ? `${width}px`  : width;
  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  // Read File → text (no-op if not provided)
  const { text: fileText, error: fileReadError, loading: fileReading } = useFileText(visualliFile);

  // The raw JSONL string to parse: file takes priority over string prop
  const rawContent = docProp ? undefined : (fileText ?? visualliString);

  const parseState = useAsyncParse(rawContent, useWorker);

  const resolvedDoc: VisualliDocument | null = useMemo(() => {
    if (docProp) return docProp;
    if (parseState.status === 'ready') return parseState.doc;
    return null;
  }, [docProp, parseState]);

  const wrapperStyle: React.CSSProperties = { width: cssWidth, height: cssHeight, overflow: 'hidden', ...style };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!visualliString && !visualliFile && !docProp) {
    return <div className={className} style={wrapperStyle}><EmptyState isDark={isDark} /></div>;
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!docProp && (fileReading || parseState.status === 'loading')) {
    return <div className={className} style={wrapperStyle}><LoadingState isDark={isDark} /></div>;
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!docProp && (fileReadError || parseState.status === 'error')) {
    const msg = fileReadError ?? (parseState.status === 'error' ? parseState.message : 'Unknown error');
    return <div className={className} style={wrapperStyle}><ErrorState message={msg} isDark={isDark} /></div>;
  }

  // ── Canvas ──────────────────────────────────────────────────────────────────
  return (
    <div className={className} style={wrapperStyle}>
      <VisualliCanvas
        document={resolvedDoc ?? undefined}
        isDark={isDark}
        chromaticImmersion={chromaticImmersion}
        onNodeClick={onNodeClick}
        onLayerChange={onLayerChange}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
