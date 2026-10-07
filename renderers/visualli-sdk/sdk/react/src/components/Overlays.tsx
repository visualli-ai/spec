// ─── Overlay chrome (DOM) ─────────────────────────────────────────────────────
//
// Peek, term cards, depth trail and canvas controls are plain DOM styled by the
// design system's own CSS (.vi-fact, .vi-anchor-card, .vi-trail, .vi-ctrls,
// .vi-iconbtn …). No colours or fonts are set here: topic colours reach the CSS
// as the --topic-* custom properties of the active theme; a custom colour is used
// as given (the design system's colour rule).

import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SHEET, TERM, TRAIL, VIEW, blobPath, hoverOpensTerm, shapeOfLevel, type FlatNode, type SemanticAnchor } from '@visualli/core';
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
const ChevronLeftIcon = () => <Icon size={14}><polyline points="15 6 9 12 15 18" /></Icon>;
const ChevronIcon = () => <Icon size={14}><polyline points="9 6 15 12 9 18" /></Icon>;
const ExternalIcon = () => <Icon size={14}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Icon>;
const HomeIcon = () => <Icon size={TRAIL.homeIconSize}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>;
const CloseIcon = () => <Icon size={18}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></Icon>;

// ── Canvas controls ───────────────────────────────────────────────────────────

export interface ZoomControlsProps {
  /** Re-fit the current layer into view. */
  onFit?: () => void;
  /** Touch layout: larger targets (the design system's `md` icon buttons). */
  touch?: boolean;
  /** @deprecated theme comes from the surrounding data-theme; kept so existing callers compile. */
  isDark?: boolean;
}

export const ZoomControls = memo(function ZoomControls({ onFit, touch = false }: ZoomControlsProps) {
  const size = touch ? 'vi-iconbtn--md' : 'vi-iconbtn--sm';
  const zoom = useViewportStore((s) => s.zoomLevel);
  const setZoom = useViewportStore((s) => s.setZoom);
  // As the design system's canvas controls: zoom is shown relative to the layer's fit (fit = 100%), the store keeps
  // it within VIEW's limits, and Fit is disabled while the whole layer is already in view.
  const fitted = useViewportStore((s) => Math.abs(s.zoomLevel - s.fitScale) < 1e-6 && Math.abs(s.centerX - s.fitCenterX) < 0.5 && Math.abs(s.centerY - s.fitCenterY) < 0.5);
  const fit = useViewportStore((s) => s.fitScale);
  const zoomIn = useCallback(() => setZoom(zoom * VIEW.zoomStep), [zoom, setZoom]);
  const zoomOut = useCallback(() => setZoom(zoom / VIEW.zoomStep), [zoom, setZoom]);
  return (
    <div className="vi-ctrls" role="toolbar" aria-label="Canvas" data-help="zoom-controls">
      <button type="button" className={`vi-iconbtn ${size}`} aria-label="Zoom out" onClick={zoomOut}><MinusIcon /></button>
      <span className="vi-ctrls__pct" aria-live="polite">{Math.round((zoom / fit) * 100)}%</span>
      <button type="button" className={`vi-iconbtn ${size}`} aria-label="Zoom in" onClick={zoomIn}><PlusIcon /></button>
      {onFit && (<>
        <span className="vi-ctrls__div" aria-hidden="true" />
        <button type="button" className={`vi-iconbtn ${size}`} aria-label="Fit map to view" disabled={fitted} onClick={onFit}><FitIcon /></button>
      </>)}
    </div>
  );
});

// ── Depth trail ───────────────────────────────────────────────────────────────

/** An idea's colour: its topic, or a custom colour drawn as given (FlatNode.topic / FlatNode.custom). */
export type IdeaPaint = Pick<FlatNode, 'topic' | 'custom'>;

/** CSS fill + ring for an idea's colour, as the design system's topicColors: the active theme's topic properties, or
 *  the custom colour with its darker ring (the `edge` token when it has none). */
export function paintVars(p: IdeaPaint): { fill: string; ring: string } {
  if (p.custom) return { fill: p.custom.fill, ring: p.custom.ring ?? 'var(--edge)' };
  const t = p.topic ?? TRAIL.rootTopic;
  return { fill: `var(--topic-${t})`, ring: `var(--topic-${t}-ring)` };
}

/** A depth trail entry: the idea stepped into (its title and colour); the first is the map (home glyph, its title as the accessible name). */
export interface TrailEntry { layerId: string; label: string; level: number; paint: IdeaPaint }

/** The trail dot: the level's blob shape in the idea's colour (the design system's TRAIL). */
const TrailDot = ({ level, paint, current }: { level: number; paint: IdeaPaint; current: boolean }) => {
  const { fill, ring } = paintVars(paint);
  return (
    <svg width={TRAIL.dotBox} height={TRAIL.dotBox} viewBox={`${-TRAIL.dotBox / 2} ${-TRAIL.dotBox / 2} ${TRAIL.dotBox} ${TRAIL.dotBox}`} aria-hidden="true">
      <path d={blobPath(shapeOfLevel(level), TRAIL.dotRadius, TRAIL.dotRadius)} fill={fill} stroke={ring} strokeWidth={current ? TRAIL.currentStroke : TRAIL.stroke} />
    </svg>
  );
};

export interface DepthTrailProps { stack: TrailEntry[]; onNavigateBack: (index: number) => void }

export const DepthTrail = memo(function DepthTrail({ stack, onNavigateBack }: DepthTrailProps) {
  if (stack.length === 0) return null;
  const current = stack.length - 1;
  // The map's own entry: the home glyph only, its title as the accessible name and tooltip (the design system's TRAIL.rootLabel).
  const iconOnly = TRAIL.rootLabel === 'icon';
  return (
    <nav className="vi-trail" aria-label="Depth trail" data-help="navigation-stack">
      <ol>
        {stack.map((e, i) => (
          <li key={`${e.layerId}-${i}`} className={i === current ? 'is-current' : undefined}>
            <button type="button" disabled={i === current} aria-current={i === current ? 'location' : undefined} onClick={() => onNavigateBack(i)}
              {...(i === 0 && iconOnly ? { 'aria-label': e.label, title: e.label } : {})}>
              <TrailDot level={e.level} paint={e.paint} current={i === current} />
              <span>{i === 0 ? (iconOnly ? <HomeIcon /> : <><HomeIcon /> {e.label}</>) : e.label}</span>
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

export const TermCard = ({ anchor, inSheet = false }: { anchor: SemanticAnchor; inSheet?: boolean }) => (
  <span className={`vi-anchor-card${inSheet ? ' is-in-sheet' : ''}`} role="note">
    <span className="vi-anchor-card__eyebrow">Term</span>
    <span className="vi-anchor-card__word" style={{ display: 'block' }}>{anchor.word}</span>
    <p className="vi-anchor-card__desc">{anchor.description}</p>
    {anchor.knowMoreUrl && (
      <span className="vi-anchor-card__acts">
        <a className="vi-fact__link" href={anchor.knowMoreUrl} target="_blank" rel="noopener noreferrer">{TERM.learnMoreLabel} <ExternalIcon /></a>
      </span>
    )}
  </span>
);

// ── Term (semantic anchor) in a peek ─────────────────────────────────────────

/**
 * An underlined term and its definition card, behaving as the design system's
 * `SemanticAnchor` (rules from geometry/interaction.ts → TERM): a mouse opens
 * it after TERM.hoverOpen and it closes TERM.hoverClose after the pointer leaves
 * the term and its card; a click, Enter or Space pins it (pressing again closes);
 * Escape closes it (without stepping out of the layer) and returns focus to the
 * term; a press outside closes it; opening by click / keyboard moves focus into
 * the card; the card stays TERM.viewportMargin inside the viewport.
 */
export function TermAnchor({ anchor }: { anchor: SemanticAnchor }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrap = useRef<HTMLSpanElement>(null), btn = useRef<HTMLButtonElement>(null), card = useRef<HTMLSpanElement>(null);
  const show = (pin: boolean) => { clearTimeout(timer.current); if (pin) pinned.current = true; setOpen(true); };
  const hide = () => { clearTimeout(timer.current); pinned.current = false; setOpen(false); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => { // keep the card inside the viewport
    if (!open || !card.current) { setShift(0); return; }
    const r = card.current.getBoundingClientRect(), vw = document.documentElement.clientWidth, m = TERM.viewportMargin;
    setShift(r.right > vw - m ? vw - m - r.right : r.left < m ? m - r.left : 0);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); hide(); btn.current?.focus(); } };
    const onPress = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) hide(); };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPress, true);
    return () => { document.removeEventListener('keydown', onKey, true); document.removeEventListener('pointerdown', onPress, true); };
  }, [open]);
  return (
    <span
      ref={wrap}
      className={`vi-anchor${open ? ' is-open' : ''}`}
      data-semantic-tooltip="true"
      onPointerEnter={(e) => { if (!hoverOpensTerm(e.pointerType)) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(true), TERM.hoverOpen); }}
      onPointerLeave={(e) => { if (!hoverOpensTerm(e.pointerType) || pinned.current) return; clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), TERM.hoverClose); }}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node | null)) hide(); }}
    >
      <button
        ref={btn}
        type="button"
        className="vi-term"
        aria-expanded={open}
        onClick={() => {
          if (open && pinned.current) { hide(); return; }
          show(true);
          setTimeout(() => card.current?.querySelector<HTMLElement>('a, button')?.focus(), 0);
        }}
      >
        {anchor.word}
      </button>
      {open && <span ref={card} className="vi-anchor__pop" style={shift ? { transform: `translateX(${shift}px)` } : undefined}><TermCard anchor={anchor} /></span>}
    </span>
  );
}

// ── Peek ─────────────────────────────────────────────────────────────────────

export interface PeekCardProps {
  node: FlatNode;
  anchors: ReadonlyArray<SemanticAnchor>;
  /** Present when the idea has a layer inside it. */
  onStepInside?: () => void;
  onClose?: () => void;
  /** Replaces the plain summary text (extension point kept from earlier versions). */
  renderContent?: (summary: string) => React.ReactNode;
}

export const PeekCard = memo(function PeekCard({ node, anchors, onStepInside, onClose, renderContent }: PeekCardProps) {
  const parts = useMemo(() => splitTerms(node.description ?? '', anchors), [node.description, anchors]);
  const { fill, ring } = paintVars(node);
  const style = { ['--vi-fact-fill' as string]: fill, ['--vi-fact-ring' as string]: ring } as React.CSSProperties;
  return (
    <div className="vi-fact vi-peek" style={style} role="dialog" aria-label={node.title} data-node-tooltip="true">
      <div className="vi-fact__head">
        <div className="vi-fact__title">{node.title}</div>
        {onClose && <button type="button" className="vi-iconbtn vi-iconbtn--sm vi-fact__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>}
      </div>
      <div className="vi-fact__body">
        {renderContent ? renderContent(node.description ?? '') : parts.map((p, i) =>
          typeof p === 'string' ? <React.Fragment key={i}>{p}</React.Fragment> : (
            <TermAnchor key={i} anchor={p} />
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

// ── Peek as a bottom sheet (touch) ────────────────────────────────────────────

export interface PeekSheetProps extends Omit<PeekCardProps, 'onClose'> {
  onClose: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Collapsed height in px (`--vi-sheet-h`). */
  height: number;
}

// Swipe thresholds on the sheet's grip: the design system's SHEET (geometry/interaction.ts).

/**
 * The peek on touch devices: the design system's bottom sheet (`.vi-fact--sheet`).
 * Stays open until dismissed (close button, swipe down, tap on empty canvas, Esc).
 * A tapped term opens its definition inside the sheet, with a Back button.
 */
export const PeekSheet = memo(function PeekSheet({ node, anchors, onStepInside, onClose, renderContent, expanded, onToggleExpanded, height }: PeekSheetProps) {
  const [term, setTerm] = useState<SemanticAnchor | null>(null);
  const parts = useMemo(() => splitTerms(node.description ?? '', anchors), [node.description, anchors]);
  const startY = useRef<number | null>(null);
  const swiped = useRef(false);
  const { fill, ring } = paintVars(node);
  const style = {
    ['--vi-fact-fill' as string]: fill,
    ['--vi-fact-ring' as string]: ring,
    ['--vi-sheet-h' as string]: `${height}px`,
    zIndex: 'var(--z-card)',
  } as React.CSSProperties;

  return (
    <div className={`vi-fact vi-fact--sheet vi-peek${expanded ? ' is-expanded' : ''}`} style={style} role="dialog" aria-label={node.title} data-node-tooltip="true">
      <div
        className="vi-fact__grip"
        onPointerDown={(e) => { startY.current = e.clientY; swiped.current = false; }}
        onPointerUp={(e) => {
          if (startY.current === null) return;
          const dy = e.clientY - startY.current;
          startY.current = null;
          if (dy < -SHEET.expandDrag) { swiped.current = true; if (!expanded) onToggleExpanded(); }
          else if (dy > SHEET.dismissDrag) { swiped.current = true; if (expanded) onToggleExpanded(); else onClose(); }
        }}
      >
        <button type="button" className="vi-fact__handle" aria-label={expanded ? 'Collapse' : 'Expand'} aria-expanded={expanded} onClick={() => { if (!swiped.current) onToggleExpanded(); swiped.current = false; }} />
      </div>
      {term ? (
        <>
          <button type="button" className="vi-fact__back" onClick={() => setTerm(null)}><ChevronLeftIcon /> Back</button>
          <TermCard anchor={term} inSheet />
        </>
      ) : (
        <>
          <div className="vi-fact__head">
            <div className="vi-fact__title">{node.title}</div>
            <button type="button" className="vi-iconbtn vi-iconbtn--md vi-fact__close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
          </div>
          <div className="vi-fact__body">
            {renderContent ? renderContent(node.description ?? '') : parts.map((p, i) =>
              typeof p === 'string' ? <React.Fragment key={i}>{p}</React.Fragment> : (
                <span key={i} className="vi-anchor" data-semantic-tooltip="true">
                  <button type="button" className="vi-term" onClick={() => setTerm(p)}>{p.word}</button>
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
        </>
      )}
    </div>
  );
});
