// ─── Overlay chrome (DOM) ─────────────────────────────────────────────────────
//
// Peek, term cards, depth trail and canvas controls are plain DOM styled by the
// design system's own CSS (.vi-fact, .vi-anchor-card, .vi-trail, .vi-ctrls,
// .vi-iconbtn …). No colours or fonts are set here: topic colours reach the CSS
// as the --topic-* custom properties of the active theme.

import React, { memo, useCallback, useMemo, useState } from 'react';
import { ZOOM_MAX, ZOOM_MIN, blobPath, shapeOfLevel, type FlatNode, type SemanticAnchor, type TopicName } from '@visualli/core';
import { useViewportStore } from '../stores/useViewportStore';

// ── Icons (stroke = currentColor) ─────────────────────────────────────────────

const Icon = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
  <svg className="vi-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const MinusIcon = () => <Icon><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
const PlusIcon = () => <Icon><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Icon>;
const FitIcon = () => <Icon><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>;
const ChevronIcon = () => <Icon size={14}><polyline points="9 6 15 12 9 18" /></Icon>;
const ExternalIcon = () => <Icon size={14}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Icon>;
const CloseIcon = () => <Icon size={18}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Icon>;

// ── Canvas controls ───────────────────────────────────────────────────────────

export interface ZoomControlsProps {
  /** Re-fit the current layer into view. */
  onFit?: () => void;
  /** @deprecated theme comes from the surrounding data-theme; kept so existing callers compile. */
  isDark?: boolean;
}

export const ZoomControls = memo(function ZoomControls({ onFit }: ZoomControlsProps) {
  const zoom = useViewportStore((s) => s.zoomLevel);
  const setZoom = useViewportStore((s) => s.setZoom);
  const zoomIn = useCallback(() => setZoom(Math.min(ZOOM_MAX, zoom * 1.2)), [zoom, setZoom]);
  const zoomOut = useCallback(() => setZoom(Math.max(ZOOM_MIN, zoom / 1.2)), [zoom, setZoom]);
  return (
    <div className="vi-ctrls" role="group" aria-label="Zoom controls" data-help="zoom-controls">
      <button type="button" className="vi-iconbtn vi-iconbtn--sm" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={zoomOut}><MinusIcon /></button>
      <span className="vi-ctrls__pct" aria-live="polite">{Math.round(zoom * 100)}%</span>
      <button type="button" className="vi-iconbtn vi-iconbtn--sm" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={zoomIn}><PlusIcon /></button>
      {onFit && (<>
        <span className="vi-ctrls__div" aria-hidden="true" />
        <button type="button" className="vi-iconbtn vi-iconbtn--sm" aria-label="Fit to screen" onClick={onFit}><FitIcon /></button>
      </>)}
    </div>
  );
});

// ── Depth trail ───────────────────────────────────────────────────────────────

export interface TrailEntry { layerId: string; label: string; level: number; topic: TopicName }

const TrailDot = ({ level, topic }: { level: number; topic: TopicName }) => (
  <svg className="vi-icon" width="16" height="16" viewBox="-9 -9 18 18" aria-hidden="true">
    <path d={blobPath(shapeOfLevel(level), 6.5, 6.5)} style={{ fill: `var(--topic-${topic})`, stroke: `var(--topic-${topic}-ring)`, strokeWidth: 1.5 }} />
  </svg>
);

export interface DepthTrailProps { stack: TrailEntry[]; onNavigateBack: (index: number) => void }

export const DepthTrail = memo(function DepthTrail({ stack, onNavigateBack }: DepthTrailProps) {
  if (stack.length === 0) return null;
  const current = stack.length - 1;
  return (
    <nav className="vi-trail" aria-label="Depth trail" data-help="navigation-stack">
      <ol>
        {stack.map((e, i) => (
          <li key={`${e.layerId}-${i}`} className={i === current ? 'is-current' : undefined}>
            <button type="button" disabled={i === current} aria-current={i === current ? 'location' : undefined} onClick={() => onNavigateBack(i)}>
              <span><TrailDot level={e.level} topic={e.topic} />{e.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
});

// ── Terms (semantic anchors) ──────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Split `text` into plain runs and runs that match an anchor word (longest word wins, whole words only). */
export function splitTerms(text: string, anchors: ReadonlyArray<SemanticAnchor>): Array<string | SemanticAnchor> {
  const words = anchors.filter((a) => a.word).sort((a, b) => b.word.length - a.word.length);
  if (!words.length) return [text];
  const re = new RegExp(`(${words.map((a) => escapeRe(a.word)).join('|')})`, 'giu');
  const byWord = new Map(words.map((a) => [a.word.toLowerCase(), a]));
  const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);
  const out: Array<string | SemanticAnchor> = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index!, end = start + m[0].length;
    // Whole words only (no lookbehind: it is not available in older Safari).
    if (isWordChar(text[start - 1]) || isWordChar(text[end])) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push({ ...byWord.get(m[0].toLowerCase())!, word: m[0] });
    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const TermCard = ({ anchor }: { anchor: SemanticAnchor }) => (
  <span className="vi-anchor-card" role="note">
    <span className="vi-anchor-card__eyebrow">Term</span>
    <span className="vi-anchor-card__word" style={{ display: 'block' }}>{anchor.word}</span>
    <p className="vi-anchor-card__desc">{anchor.description}</p>
    {anchor.knowMoreUrl && (
      <span className="vi-anchor-card__acts">
        <a className="vi-fact__link" href={anchor.knowMoreUrl} target="_blank" rel="noopener noreferrer">Know more <ExternalIcon /></a>
      </span>
    )}
  </span>
);

// ── Peek ─────────────────────────────────────────────────────────────────────

export interface PeekCardProps {
  node: FlatNode;
  topic: TopicName;
  anchors: ReadonlyArray<SemanticAnchor>;
  /** Present when the idea has a layer inside it. */
  onStepInside?: () => void;
  onClose?: () => void;
  /** Replaces the plain summary text (extension point kept from earlier versions). */
  renderContent?: (summary: string) => React.ReactNode;
}

export const PeekCard = memo(function PeekCard({ node, topic, anchors, onStepInside, onClose, renderContent }: PeekCardProps) {
  const [openWord, setOpenWord] = useState<string | null>(null);
  const parts = useMemo(() => splitTerms(node.description ?? '', anchors), [node.description, anchors]);
  const style = { ['--vi-fact-fill' as string]: `var(--topic-${topic})`, ['--vi-fact-ring' as string]: `var(--topic-${topic}-ring)` } as React.CSSProperties;
  return (
    <div className="vi-fact vi-peek" style={style} role="dialog" aria-label={node.title} data-node-tooltip="true">
      <div className="vi-fact__head">
        <div className="vi-fact__title">{node.title}</div>
        {onClose && <button type="button" className="vi-iconbtn vi-iconbtn--sm vi-fact__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>}
      </div>
      <div className="vi-fact__body">
        {renderContent ? renderContent(node.description ?? '') : parts.map((p, i) =>
          typeof p === 'string' ? <React.Fragment key={i}>{p}</React.Fragment> : (
            <span key={i} className={`vi-anchor${openWord === `${i}` ? ' is-open' : ''}`} data-semantic-tooltip="true">
              <button type="button" className="vi-term" aria-expanded={openWord === `${i}`} onClick={() => setOpenWord(openWord === `${i}` ? null : `${i}`)}>{p.word}</button>
              {openWord === `${i}` && <span className="vi-anchor__pop"><TermCard anchor={p} /></span>}
            </span>
          ))}
      </div>
      {onStepInside && (
        <div className="vi-fact__foot">
          <span />
          <div className="vi-fact__acts">
            <button type="button" className="vi-fact__step" onClick={onStepInside}>Step inside <ChevronIcon /></button>
          </div>
        </div>
      )}
    </div>
  );
});
