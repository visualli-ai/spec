// ─── VisualliCanvas ───────────────────────────────────────────────────────────
//
// Main canvas component for rendering a VisualliDocument, drawn with the Visualli
// design system (tokens, fonts and geometry from design-system/):
//   • Konva canvas for ideas, rings and connectors; DOM overlays for the peek,
//     term cards, depth trail and controls (the design system's own CSS)
//   • Stage-level hit detection via RBush spatial index (no Konva hit-canvas)
//   • 8 themes + comfort settings (readable type, larger text, reduced motion)
//   • Auto-zoom navigation (zoom in → child layer, zoom out → parent layer)
//   • Layer transitions (CSS-transform driven, no canvas redraws while animating)
//   • A visually hidden DOM mirror of the visible ideas for screen readers / Tab
//
// NOT included (read-only viewer): editing, generation, chat, sources, export.

import React, { useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import type Konva from 'konva';
import type { VisualliDocument, VisualliLayer, FlatNode, MindMapConnection, Comfort, ThemeInput, TopicName } from '@visualli/core';
import {
  parseVisualliFile,
  getNodesForLayer,
  getSemanticAnchors,
  topicForColor,
  topicStyle,
  nodeRadii,
  RBushSpatialIndex,
  TEXT_LABEL_HIDE_BELOW_ZOOM,
  ZOOM_NAV_IN_THRESHOLD,
  ZOOM_NAV_OUT_THRESHOLD,
  ZOOM_MIN,
  ZOOM_MAX,
} from '@visualli/core';

import { useNodeStore }        from './stores/useNodeStore';
import { useViewportStore }    from './stores/useViewportStore';
import { useSelectionStore }   from './stores/stores';

import { useKonvaRenderer }          from './hooks/useKonvaRenderer';
import { useKonvaLayerTransition }   from './hooks/useKonvaLayerTransition';

import KonvaStage           from './components/KonvaStage';
import KonvaNodeLayer       from './components/KonvaNodeLayer';
import KonvaEdgeLayer       from './components/KonvaEdgeLayer';
import KonvaContainerLayer  from './components/KonvaContainerLayer';
import NavigationStack, { type NavStackEntry } from './components/NavigationStack';
import { ZoomControls, PeekCard, PeekSheet } from './components/Overlays';
import { A11yLayer } from './components/A11yLayer';

import { getChildLayerForNode, calculateFitView, getConnectionsForLayer, getContainersForLayer } from './utils/layerNavigation';
import type { ContainerGroup } from './components/KonvaContainerLayer';
import type { AnimatorViewport } from './animations/konvaLayerTransition';
import { useVisualli } from './context/VisualliContext';
import { useDesign } from './design/useDesign';
import { topicOf } from './design/drawing';
import { ensureDesignSystemStyles, loadCanvasFonts, type DesignSystemAssets } from './design/runtime';

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveDocument(props: VisualliCanvasProps, fileText?: string): VisualliDocument | null {
  if (props.preParsedVisualli) return props.preParsedVisualli;
  const rawContent = fileText ?? props.visualliString;
  if (rawContent) {
    try { return parseVisualliFile(rawContent); } catch { return null; }
  }
  return null;
}

function layerLabel(doc: VisualliDocument, layer: VisualliLayer, layerId: string): string {
  if (layer.parentNodeId) {
    // Find the parent node in the parent layer to get its title
    const parentLayer = layer.parentLayerId ? doc.layers.get(layer.parentLayerId) : null;
    if (parentLayer) {
      const parentNode = parentLayer.nodes.find(n => n.id === layer.parentNodeId);
      if (parentNode) {
        return Array.isArray(parentNode.data.label)
          ? (parentNode.data.label as string[]).join(' ')
          : (parentNode.data.label || 'Untitled');
      }
    }
  }
  return layer.description ?? layerId;
}

/** Topic of the idea a layer opens from (the first idea for the root layer). */
function layerTopic(doc: VisualliDocument, layer: VisualliLayer, layerId: string): TopicName {
  const parentLayer = layer.parentLayerId ? doc.layers.get(layer.parentLayerId) : null;
  const parentNode = parentLayer?.nodes.find(n => n.id === layer.parentNodeId) ?? layer.nodes[0];
  return topicForColor(parentNode?.data.color, parentNode?.id ?? layerId);
}

function getRootLayerId(doc: VisualliDocument): string | null {
  for (const [id, layer] of doc.layers) {
    if (!layer.parentLayerId) return id;
  }
  return doc.layers.keys().next().value ?? null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface VisualliCanvasProps {
  preParsedVisualli?: VisualliDocument;
  /**
   * Raw JSONL string — just pass the string data directly.
   * No preprocessing needed by user.
   */
  visualliString?: string;
  /**
   * A .visualli file — can be:
   *  - File object (from file input)
   *  - String path to file (e.g. '/data/file.visualli')
   * Component handles all fetching and parsing automatically.
   */
  visualliFile?: File | string;
  /**
   * Theme: one of the 8 design-system themes ('light', 'dark', 'focus-light', …), a family
   * ('focus' | 'colorsafe' | 'contrast') or 'auto' (follow the reader). Default 'light'.
   */
  theme?: ThemeInput;
  /** @deprecated use `theme`. true -> 'dark', false -> 'light'. Kept for one release. */
  isDark?: boolean;
  /** Comfort settings: readable type, larger text, reduced motion. */
  comfort?: Comfort;
  /** Switch to the high-contrast theme under forced-colors. Default true. */
  respectForcedColors?: boolean;
  /**
   * Interaction layout. 'auto' (default) follows the reader's input: touch devices get the design
   * system's bottom-sheet peek and larger controls, pointer devices the floating peek on hover.
   * Force one with 'touch' or 'pointer'.
   */
  layout?: 'auto' | 'touch' | 'pointer';
  /** Where the bundled Caveat font is served from (directory URL). Defaults to the copy in the npm package, via jsDelivr. */
  fontBaseUrl?: DesignSystemAssets['fontBaseUrl'];
  /** Set false when you load Kalam and Atkinson Hyperlegible yourself. */
  loadWebFonts?: DesignSystemAssets['loadWebFonts'];
  chromaticImmersion?: boolean;
  onNodeClick?: (node: FlatNode) => void;
  onLayerChange?: (layerId: string, layer: VisualliLayer) => void;
  onNodeHover?: (nodeId: string | null) => void;
  
  // Extension points for private features (implement in consuming app)
  renderOverlay?: (params: { isDark: boolean; theme: string; containerWidth: number; containerHeight: number }) => React.ReactNode;
  renderNodeContent?: (params: { 
    summary: string; 
    nodeId: string; 
    nodeColor?: string;
    zoom: number;
  }) => React.ReactNode;
  navigationStackTop?: string;
  navigationStackLeft?: string;
  
  className?: string;
  style?: React.CSSProperties;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VisualliCanvas(props: VisualliCanvasProps) {
  const { chromaticImmersion = false, onNodeClick, onLayerChange, onNodeHover, renderOverlay, renderNodeContent, navigationStackTop, navigationStackLeft, className = '', style } = props;

  // Design system: resolve theme + comfort, inject its CSS once, and hold the first draw until its fonts are loaded.
  const design = useDesign({ theme: props.theme ?? (props.isDark === undefined ? 'light' : undefined), isDark: props.isDark, comfort: props.comfort, respectForcedColors: props.respectForcedColors });
  const isDark = design.isDark;
  const [fontSheet] = useState(() => ensureDesignSystemStyles({ fontBaseUrl: props.fontBaseUrl, loadWebFonts: props.loadWebFonts }));
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => { let live = true; loadCanvasFonts(fontSheet).then(() => { if (live) setFontsReady(true); }); return () => { live = false; }; }, [fontSheet]);

  // Read file if provided (handles both File objects and string paths)
  const [fileText, setFileText] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!props.visualliFile) { setFileText(undefined); return; }
    let cancelled = false;
    
    // Handle string path - fetch the file
    if (typeof props.visualliFile === 'string') {
      fetch(props.visualliFile)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
          return response.text();
        })
        .then(t => {
          if (!cancelled) setFileText(t);
        })
        .catch(() => {
          if (!cancelled) setFileText(undefined);
        });
    }
    // Handle File object - read as text
    else {
      props.visualliFile.text().then(t => {
        if (!cancelled) setFileText(t);
      }).catch(() => {
        if (!cancelled) setFileText(undefined);
      });
    }
    
    return () => { cancelled = true; };
  }, [props.visualliFile]);

  const doc = useMemo(() => resolveDocument(props, fileText), [props.preParsedVisualli, props.visualliString, props.visualliFile, fileText]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────────────────
  const [navStack, setNavStack]           = useState<NavStackEntry[]>([]);
  const [currentLayerId, setCurrentLayerId] = useState<string | null>(null);
  const parentViewports                   = useRef<AnimatorViewport[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    if (!doc) return;
    const rootId = getRootLayerId(doc);
    if (!rootId) return;
    const rootLayer = doc.layers.get(rootId)!;
    setCurrentLayerId(rootId);
    setNavStack([{ layerId: rootId, layer: rootLayer, label: 'Home', topic: layerTopic(doc, rootLayer, rootId) }]);
    parentViewports.current = [];
  }, [doc]);

  // ── Active layer → FlatNodes ──────────────────────────────────────────────
  const { flatNodes, connections, containers } = useMemo(() => {
    if (!doc || !currentLayerId) return { flatNodes: [] as FlatNode[], connections: [] as MindMapConnection[], containers: [] as ContainerGroup[] };
    try {
      return {
        flatNodes: getNodesForLayer(doc, currentLayerId),
        connections: getConnectionsForLayer(doc, currentLayerId),
        containers: getContainersForLayer(doc, currentLayerId) as ContainerGroup[],
      };
    } catch { return { flatNodes: [] as FlatNode[], connections: [] as MindMapConnection[], containers: [] as ContainerGroup[] }; }
    }, [doc, currentLayerId]);
    const viewport  = useViewportStore(s => ({
      centerX: s.centerX, centerY: s.centerY, zoomLevel: s.zoomLevel,
      canvasWidth: s.canvasWidth, canvasHeight: s.canvasHeight,
    }));
    const setCenter = useViewportStore(s => s.setCenter);
    const setZoom = useViewportStore(s => s.setZoom);

    const nodes = useNodeStore(s => s.nodes);
    const setNodes = useNodeStore(s => s.setNodes);
    const updateNodePosition = useNodeStore(s => s.updateNodePosition);

    const clearSel  = useSelectionStore(s => s.clear);
    const select    = useSelectionStore(s => s.select);

  // Sync nodes → store
  useEffect(() => {
    const map = new Map(flatNodes.map(n => [n.id, n]));
    setNodes(map);
    clearSel();
  }, [flatNodes, setNodes, clearSel]);

  // ── Canvas refs ───────────────────────────────────────────────────────────
  const containerRef     = useRef<HTMLDivElement | null>(null);
  const stageRef         = useRef<Konva.Stage | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // ── GPU CSS-transform transition refs (matches visualli.ai) ───────────────
  // During animations we express viewport deltas as CSS transforms on Konva's
  // container div — zero canvas redraws, handled entirely by the GPU compositor.
  const baselineTransformRef  = useRef<{ x: number; y: number; scaleX: number; scaleY: number } | null>(null);
  const konvaContentDivRef    = useRef<HTMLDivElement | null>(null);
  const lastAnimViewportRef   = useRef<{ centerX: number; centerY: number; zoomLevel: number } | null>(null);
  const zoomOutTargetRef      = useRef<{ centerX: number; centerY: number; zoomLevel: number } | null>(null);
  // canvasSizeRef is kept in sync with the measured container size (not window).
  // Initialise to 0 — it will be updated synchronously before the first frame.
  const canvasSizeRef         = useRef({ width: 0, height: 0 });

  // ── Node drag refs (RAF-throttled, matches visualli.ai) ───────────────────
  const dragMoveRafRef      = useRef<number | null>(null);
  const dragMoveLatestRef   = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const dragStartPosRef     = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ── Chromatic immersion: the parent idea's topic tints the canvas at `immersion-alpha` ──
  const immersionTopic = useMemo<TopicName | null>(() => {
    if (!chromaticImmersion || !doc || !currentLayerId) return null;
    const layer = doc.layers.get(currentLayerId);
    if (!layer || layer.level === 0 || !layer.parentNodeId) return null;
    return layerTopic(doc, layer, currentLayerId);
  }, [chromaticImmersion, doc, currentLayerId]);

  // ── Spatial index (for stage-level hit detection) ─────────────────────────
  const spatialIndexRef = useRef<RBushSpatialIndex | null>(null);
  useEffect(() => {
    if (flatNodes.length === 0) { spatialIndexRef.current?.clear(); return; }
    const idx = new RBushSpatialIndex();
    idx.bulkLoad(flatNodes.map(n => {
      const { rx, ry } = nodeRadii(n.width);
      return { nodeId: n.id, bounds: { minX: n.x - rx, minY: n.y - ry, maxX: n.x + rx, maxY: n.y + ry } };
    }));
    spatialIndexRef.current = idx;
    return () => { spatialIndexRef.current?.clear(); };
  }, [flatNodes]);

  // ── Konva renderer (resize + FPS) ─────────────────────────────────────────
  const {
    handleWheel: rendererHandleWheel,
    handleMouseDown: rendererHandleMouseDown,
    handleMouseMove: rendererHandleMouseMove,
    handleMouseUp:   rendererHandleMouseUp,
    canvasWidth,
    canvasHeight,
  } = useKonvaRenderer({ containerRef, stageRef });

  // Keep canvasSizeRef in sync with the measured container size.
  // The fallback to containerRef.getBoundingClientRect covers the period before
  // the first ResizeObserver callback fires.
  const _cw = canvasWidth  || containerRef.current?.getBoundingClientRect().width  || 800;
  const _ch = canvasHeight || containerRef.current?.getBoundingClientRect().height || 600;
  canvasSizeRef.current = { width: _cw, height: _ch };

  // ── Individual node drag (RAF-throttled, matches visualli.ai) ────────────
  const handleDragStart = useCallback((nodeId: string) => {
    isDraggingRef.current = true;
    setIsDraggingState(true);
    setHoveredNode(null);
    const node = nodes.get(nodeId);
    if (node) dragStartPosRef.current.set(nodeId, { x: node.x, y: node.y });
  }, [nodes]);

  const handleDragMove = useCallback((nodeId: string, x: number, y: number) => {
    dragMoveLatestRef.current = { nodeId, x, y };
    if (dragMoveRafRef.current !== null) return;
    dragMoveRafRef.current = requestAnimationFrame(() => {
      dragMoveRafRef.current = null;
      const latest = dragMoveLatestRef.current;
      if (latest) { dragMoveLatestRef.current = null; updateNodePosition(latest.nodeId, latest.x, latest.y); }
    });
  }, [updateNodePosition]);

  const handleDragEnd = useCallback((nodeId: string, x: number, y: number) => {
    if (dragMoveRafRef.current !== null) { cancelAnimationFrame(dragMoveRafRef.current); dragMoveRafRef.current = null; }
    dragMoveLatestRef.current = null;
    isDraggingRef.current = false;
    setIsDraggingState(false);
    updateNodePosition(nodeId, x, y);
    // Update spatial index entry
    if (spatialIndexRef.current) {
      const node = nodes.get(nodeId);
      if (node) {
        const oldPos = dragStartPosRef.current.get(nodeId);
        if (oldPos) {
          const { rx, ry } = nodeRadii(node.width);
          spatialIndexRef.current.remove(nodeId, {
            minX: oldPos.x - rx, minY: oldPos.y - ry,
            maxX: oldPos.x + rx, maxY: oldPos.y + ry,
          });
        }
        const { rx, ry } = nodeRadii(node.width);
        spatialIndexRef.current.insert(nodeId, {
          minX: x - rx, minY: y - ry,
          maxX: x + rx, maxY: y + ry,
        });
      }
    }
    dragStartPosRef.current.delete(nodeId);
  }, [updateNodePosition, nodes]);
  // Keep a ref to the latest fitToScreen so async callbacks (onComplete) always
  // call the most current version without re-creating the animation pipeline.
  const fitToScreenRef = useRef<() => void>(() => {});

  const fitToScreen = useCallback(() => {
    if (flatNodes.length === 0) return;
    if (isTransitioningRef.current) return; // animation is controlling viewport
    // Use the container's measured size (not window) so the fit is always
    // relative to the renderer's actual bounding box.
    const cw = canvasSizeRef.current.width  || containerRef.current?.getBoundingClientRect().width  || 800;
    const ch = canvasSizeRef.current.height || containerRef.current?.getBoundingClientRect().height || 600;
    const { centerX, centerY } = calculateFitView(flatNodes, cw, ch);
    // Root layer: always use 1.0 zoom to match visualli.ai reference behaviour.
    // calculateFitZoom for a single node or dense layout on a 1920-default canvas
    // produces zoom > 2 which triggers the auto-zoom-in threshold immediately.
    const isRootLayer = navStack.length <= 1;
    // Root layer: use 1.0 zoom to match visualli.ai reference behaviour.
    // Child layers use the bounding-box fit zoom (already clamped to [0.4, 5]).
    const zoomLevel = isRootLayer ? 1.0 : calculateFitView(flatNodes, cw, ch).zoomLevel;
    setCenter(centerX, centerY);
    setZoom(zoomLevel);
  }, [flatNodes, navStack.length, setCenter, setZoom]);

  // Keep ref in sync after every render so async callbacks always use latest closure
  fitToScreenRef.current = fitToScreen;

  useEffect(() => { fitToScreen(); }, [currentLayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fit when the canvas is properly measured for the first time (the RAF in
  // useKonvaRenderer updates canvasWidth from 0 → container width asynchronously).
  const didFitAfterMeasureRef = useRef(false);
  useEffect(() => {
    if (!canvasWidth || didFitAfterMeasureRef.current) return;
    didFitAfterMeasureRef.current = true;
    fitToScreen();
  }, [canvasWidth, fitToScreen]);

  // ── Layer transitions ─────────────────────────────────────────────────────

  // Stores the target nav-back index so onSwapBack can read it
  const navBackTargetRef = useRef<number>(-1);

  const { zoomIntoLayer, zoomOutToParent, isTransitioning: isAnimating } = useKonvaLayerTransition({
    stageRef,
    canvasWrapperRef,
    onSwapLayer: (childLayerId) => {
      const childLayer = doc?.layers.get(childLayerId);
      if (!childLayer || !doc) return;
      setCurrentLayerId(childLayerId);
      setNavStack(prev => [...prev, { layerId: childLayerId, layer: childLayer, label: layerLabel(doc, childLayer, childLayerId), topic: layerTopic(doc, childLayer, childLayerId) }]);
      onLayerChange?.(childLayerId, childLayer);
    },
    onSwapBack: () => {
      const targetIndex = navBackTargetRef.current;
      setNavStack(prev => {
        const newStack = prev.slice(0, targetIndex + 1);
        parentViewports.current = parentViewports.current.slice(0, targetIndex);
        const newLayerId = newStack[newStack.length - 1].layerId;
        setCurrentLayerId(newLayerId);
        onLayerChange?.(newLayerId, newStack[newStack.length - 1].layer);
        return newStack;
      });
    },
    onComplete: () => {
      setIsTransitioning(false);
      isTransitioningRef.current = false;
      // After every layer switch, snap to the fit view so zoom is always clean.
      // rAF ensures React has committed new node data before we compute the fit.
      requestAnimationFrame(() => { fitToScreenRef.current(); });
    },
    // GPU CSS-transform callbacks (matching visualli.ai exactly):
    onViewportFrame: (vp) => {
      lastAnimViewportRef.current = vp;
      const baseline = baselineTransformRef.current;
      const contentDiv = konvaContentDivRef.current;
      const { width, height } = canvasSizeRef.current;
      if (baseline && contentDiv) {
        const targetX = width / 2 - vp.centerX * vp.zoomLevel;
        const targetY = height / 2 - vp.centerY * vp.zoomLevel;
        const ratio = vp.zoomLevel / baseline.scaleX;
        const tx = targetX - baseline.x * ratio;
        const ty = targetY - baseline.y * ratio;
        contentDiv.style.transform = `translate(${tx}px, ${ty}px) scale(${ratio})`;
      } else {
        const stage = stageRef.current;
        if (stage) {
          stage.x(width / 2 - vp.centerX * vp.zoomLevel);
          stage.y(height / 2 - vp.centerY * vp.zoomLevel);
          stage.scaleX(vp.zoomLevel); stage.scaleY(vp.zoomLevel);
          stage.batchDraw();
        }
      }
    },
    onViewportFinal: (vp) => {
      if (konvaContentDivRef.current) konvaContentDivRef.current.style.transform = '';
      const stage = stageRef.current;
      if (stage) {
        const { width, height } = canvasSizeRef.current;
        stage.x(width / 2 - vp.centerX * vp.zoomLevel);
        stage.y(height / 2 - vp.centerY * vp.zoomLevel);
        stage.scaleX(vp.zoomLevel); stage.scaleY(vp.zoomLevel);
        stage.getLayers().forEach(l => l.drawScene());
      }
      setCenter(vp.centerX, vp.centerY);
      setZoom(vp.zoomLevel);
    },
    onPhaseChange: (phase) => {
      const stage = stageRef.current;
      const contentDiv = konvaContentDivRef.current;
      if (stage && contentDiv && (phase === 'swap' || phase === 'zoom-back')) {
        contentDiv.style.transform = '';
        const vp = phase === 'zoom-back' ? zoomOutTargetRef.current : lastAnimViewportRef.current;
        if (vp) {
          const { width, height } = canvasSizeRef.current;
          const nx = width / 2 - vp.centerX * vp.zoomLevel;
          const ny = height / 2 - vp.centerY * vp.zoomLevel;
          stage.x(nx); stage.y(ny);
          stage.scaleX(vp.zoomLevel); stage.scaleY(vp.zoomLevel);
          stage.getLayers().forEach(l => l.drawScene());
          baselineTransformRef.current = { x: nx, y: ny, scaleX: vp.zoomLevel, scaleY: vp.zoomLevel };
        }
      }
    },
    onTransitionLifecycle: (phase) => {
      const stage = stageRef.current;
      if (phase === 'start') {
        if (canvasWrapperRef.current) canvasWrapperRef.current.style.willChange = 'opacity, transform';
        if (stage) {
          baselineTransformRef.current = { x: stage.x(), y: stage.y(), scaleX: stage.scaleX(), scaleY: stage.scaleY() };
          const container = stage.container();
          const cd = container?.querySelector('.konvajs-content') as HTMLDivElement | null;
          if (cd) {
            konvaContentDivRef.current = cd;
            cd.style.transformOrigin = '0 0';
            cd.style.willChange = 'transform';
          }
          stage.getLayers().forEach(l => { l.listening(false); });
        }
      } else {
        if (canvasWrapperRef.current) canvasWrapperRef.current.style.willChange = 'auto';
        if (konvaContentDivRef.current) { konvaContentDivRef.current.style.willChange = 'auto'; konvaContentDivRef.current = null; }
        baselineTransformRef.current = null;
        zoomOutTargetRef.current = null;
        if (stage) {
          stage.getLayers().forEach(l => { l.listening(true); });
          stage.batchDraw();
        }
      }
    },
  });

  const handleNavigate = useCallback((nodeId: string) => {
    if (!doc || !currentLayerId) {
      return;
    }
    if (isTransitioningRef.current || isAnimating()) {
      return;
    }

    const childLayer = getChildLayerForNode(doc, nodeId, currentLayerId);
    if (!childLayer) {
      return;
    }
    const childLayerId = [...doc.layers.entries()].find(([, l]) => l === childLayer)?.[0];
    if (!childLayerId) {
      return;
    }
    const childNodes = (() => { try { return getNodesForLayer(doc, childLayerId); } catch { return []; } })();
    if (childNodes.length === 0) {
      return;
    }

    const node = nodes.get(nodeId);
    if (!node) return;

    // Save the FIT viewport for this layer (not the current scroll position).
    // This ensures navigating back always returns to a clean, properly-zoomed view
    // rather than the arbitrary zoom that happened to trigger the navigation.
    const cw = canvasSizeRef.current.width  || 800;
    const ch = canvasSizeRef.current.height || 600;
    const fitVp = calculateFitView(flatNodes, cw, ch);
    const isRootNow = navStack.length <= 1;
    parentViewports.current.push({ centerX: fitVp.centerX, centerY: fitVp.centerY, zoomLevel: isRootNow ? 0.85 : fitVp.zoomLevel });

    setIsTransitioning(true);
    isTransitioningRef.current = true;

    zoomIntoLayer(
      doc, node, childLayerId, childNodes,
      topicStyle(design.theme, topicOf(node)).fill,
      design.tokens['canvas']!,
    );
  }, [doc, currentLayerId, nodes, design, isAnimating, zoomIntoLayer]);

  const handleNavigateBack = useCallback((targetIndex: number) => {
    if (targetIndex >= navStack.length - 1) return;
    if (isTransitioningRef.current || isAnimating()) return;
    const savedVp = parentViewports.current[targetIndex];
    if (!savedVp) return;
    navBackTargetRef.current = targetIndex;
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    zoomOutToParent(savedVp, design.tokens['canvas']!, design.tokens['canvas']!);
  }, [navStack.length, design, isAnimating, zoomOutToParent]);

  // ── Auto-zoom navigation (Google Maps style) ──────────────────────────────
  const baseZoomRef           = useRef(1.0);
  const lastZoomTransitionRef = useRef(0);
  const ZOOM_COOLDOWN         = 1000;

  useEffect(() => { baseZoomRef.current = 1.0; }, [currentLayerId]);

  useEffect(() => {
    if (isTransitioningRef.current || isAnimating()) return;
    const now = Date.now();
    if (now - lastZoomTransitionRef.current < ZOOM_COOLDOWN) return;
    const relative = viewport.zoomLevel / baseZoomRef.current;

    if (relative >= ZOOM_NAV_IN_THRESHOLD) {
      // Zoom in threshold — drill into closest node
      let closest: FlatNode | null = null;
      let minDist = Infinity;
      for (const node of nodes.values()) {
        const dx = node.x - viewport.centerX;
        const dy = node.y - viewport.centerY;
        const d  = dx * dx + dy * dy;
        if (d < minDist) { minDist = d; closest = node; }
      }
      if (closest) {
        const childLayer = doc ? getChildLayerForNode(doc, closest.id, currentLayerId ?? '') : null;
        if (childLayer) {
          lastZoomTransitionRef.current = now;
          handleNavigate(closest.id);
          baseZoomRef.current = 1.0;
        }
      }
    } else if (relative < ZOOM_NAV_OUT_THRESHOLD && navStack.length > 1) {
      // Zoom out threshold — go back to parent
      lastZoomTransitionRef.current = now;
      handleNavigateBack(navStack.length - 2);
      baseZoomRef.current = 1.0;
    }
  }, [viewport.zoomLevel, viewport.centerX, viewport.centerY, nodes, doc, currentLayerId, navStack, isAnimating, handleNavigate, handleNavigateBack]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stage-level hit detection ─────────────────────────────────────────────
  const toWorldCoords = useCallback((stage: Konva.Stage, pointer: { x: number; y: number }) => {
    const sp = stage.position();
    const sc = stage.scaleX();
    return { worldX: (pointer.x - sp.x) / sc, worldY: (pointer.y - sp.y) / sc };
  }, []);

  const hitTestNode = useCallback((worldX: number, worldY: number): string | null => {
    if (!spatialIndexRef.current) return null;
    const hits = spatialIndexRef.current.query({ minX: worldX, minY: worldY, maxX: worldX, maxY: worldY });
    if (!hits.length) return null;
    let targetId: string | null = null, minDist = Infinity;
    for (const nodeId of hits) {
      const node = nodes.get(nodeId);
      if (!node) continue;
      const d = (worldX - node.x) ** 2 + (worldY - node.y) ** 2;
      if (d < minDist) { minDist = d; targetId = nodeId; }
    }
    return targetId;
  }, [nodes]);

  // Stage pointer interaction state
  const stageActiveNodeIdRef     = useRef<string | null>(null);
  const stageDragNodeOffsetRef   = useRef({ x: 0, y: 0 });
  const stageMouseDownPosRef     = useRef<{ x: number; y: number } | null>(null);
  const stageDragCommittedRef    = useRef(false);
  const stageLastPointerCheckRef = useRef<number>(0);
  const pointerNodeIdRef         = useRef<string | null>(null);
  const isCanvasPanningRef       = useRef(false);
  const isDraggingRef            = useRef(false);

  const [pointerNodeId, setPointerNodeId]   = useState<string | null>(null);
  const [pressedNodeId, setPressedNodeId]   = useState<string | null>(null);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // ── Node hover tooltip ────────────────────────────────────────────────────
  const [hoveredNode, setHoveredNode] = useState<{
    nodeId: string; summary: string; screenX: number; screenY: number;
  } | null>(null);

  const tooltipHoverRef = useRef(false);
  const keepTooltipOpenRef = useRef(false); // External request to keep tooltip open (e.g., from extensions)
  const clearTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hoveredNodePosition = useMemo(() => {
    if (!hoveredNode) return null;
    const node = nodes.get(hoveredNode.nodeId);
    if (!node) return null;
    const cw = viewport.canvasWidth || canvasSizeRef.current.width;
    const ch = viewport.canvasHeight || canvasSizeRef.current.height;
    return {
      screenX: (node.x - viewport.centerX) * viewport.zoomLevel + cw / 2,
      screenY: (node.y - viewport.centerY) * viewport.zoomLevel + ch / 2,
      zoom: viewport.zoomLevel,
    };
  }, [hoveredNode, nodes, viewport]);

  // ── Context menu ──────────────────────────────────────────────────────────
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasContextMenu) return;
    const close = () => setCanvasContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKey); };
  }, [canvasContextMenu]);

  const selectedNodeId = useSelectionStore(st => st.selectedId);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const anchors = useMemo(() => (doc ? getSemanticAnchors(doc) : []), [doc]);

  // ── Touch mode + pinned peek (bottom sheet) ───────────────────────────────
  // Touch browsers also fire compatibility mouse events after a tap; those are ignored so
  // they can neither reopen nor close the sheet.
  const [autoTouch, setAutoTouch] = useState<boolean>(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches);
  const touchMode = props.layout === 'touch' ? true : props.layout === 'pointer' ? false : autoTouch;
  const touchModeRef = useRef(touchMode);
  touchModeRef.current = touchMode;
  const lastTouchAtRef = useRef(0);
  const emptyTapRef = useRef<{ x: number; y: number } | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const isEmulatedMouse = (evt: Event) => evt.type.startsWith('mouse') && performance.now() - lastTouchAtRef.current < 700;
  /** Client coordinates of a mouse or touch event. */
  const clientOf = (evt: MouseEvent | TouchEvent) => {
    const t = ('touches' in evt && (evt.touches[0] ?? evt.changedTouches[0])) || (evt as MouseEvent);
    return { x: t.clientX, y: t.clientY };
  };
  const pinnedIdRef = useRef<string | null>(null);
  pinnedIdRef.current = pinnedId;
  /** Collapsed sheet height: the design system's 300px, but never more than half the map. */
  const sheetHeight = Math.min(300, Math.round((viewport.canvasHeight || canvasSizeRef.current.height || 600) * 0.5));

  /** Open the bottom sheet for an idea, scrolling the map so the idea stays visible above it. */
  const openSheet = (node: FlatNode) => {
    setPinnedId(node.id);
    setSheetExpanded(false);
    setHoveredNode(null);
    const vp = useViewportStore.getState();
    const ch = canvasSizeRef.current.height || vp.canvasHeight;
    const sh = Math.min(300, Math.round(ch * 0.5));
    const screenY = (node.y - vp.centerY) * vp.zoomLevel + ch / 2;
    const reach = nodeRadii(node.width).ry * vp.zoomLevel;
    if (screenY + reach > ch - sh - 12 || screenY - reach < 0) vp.setCenter(vp.centerX, node.y + sh / (2 * vp.zoomLevel));
  };
  // Close the sheet when the layer changes.
  useEffect(() => { setPinnedId(null); }, [currentLayerId]);

  // ── Stage event handlers ──────────────────────────────────────────────────
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isEmulatedMouse(e.evt)) return;
    const isTouch = e.evt.type.startsWith('touch');
    if (isTouch) lastTouchAtRef.current = performance.now();
    if (props.layout === undefined || props.layout === 'auto') setAutoTouch(isTouch);
    // Touch events carry no `button`: a touch is always a primary press.
    if (!isTouch && e.evt.button !== 0) { rendererHandleMouseDown(e); return; }
    const stage = e.target.getStage();
    if (!stage) { rendererHandleMouseDown(e); return; }
    const pointer = stage.getPointerPosition();
    if (!pointer) { rendererHandleMouseDown(e); return; }
    const { worldX, worldY } = toWorldCoords(stage, pointer);
    const nodeId = hitTestNode(worldX, worldY);
    if (nodeId) {
      const node = nodes.get(nodeId);
      if (node) {
        select(nodeId);
        stageActiveNodeIdRef.current = nodeId;
        stageDragNodeOffsetRef.current = { x: worldX - node.x, y: worldY - node.y };
        stageMouseDownPosRef.current = clientOf(e.evt);
        stageDragCommittedRef.current = false;
        setPressedNodeId(nodeId);
        setHoveredNode(null);
        return;
      }
    }
    setHoveredNode(null);
    emptyTapRef.current = clientOf(e.evt);
    isCanvasPanningRef.current = true;
    rendererHandleMouseDown(e);
  }, [hitTestNode, toWorldCoords, nodes, select, rendererHandleMouseDown]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isEmulatedMouse(e.evt)) return;
    const stage = e.target.getStage();
    if (!stage) { rendererHandleMouseMove(e); return; }
    const pointer = stage.getPointerPosition();
    if (!pointer) { rendererHandleMouseMove(e); return; }
    const { worldX, worldY } = toWorldCoords(stage, pointer);

    if (stageActiveNodeIdRef.current && stageMouseDownPosRef.current) {
      const cur = clientOf(e.evt);
      const moved = Math.hypot(cur.x - stageMouseDownPosRef.current.x, cur.y - stageMouseDownPosRef.current.y);
      if (!stageDragCommittedRef.current && moved >= 5) {
        stageDragCommittedRef.current = true;
        isDraggingRef.current = true;
        setIsDraggingState(true);
        pointerNodeIdRef.current = null;
        setPointerNodeId(null);
        handleDragStart(stageActiveNodeIdRef.current);
      }
      if (stageDragCommittedRef.current) {
        const offset = stageDragNodeOffsetRef.current;
        handleDragMove(stageActiveNodeIdRef.current, worldX - offset.x, worldY - offset.y);
        stage.container().style.cursor = 'grabbing';
        return;
      }
      return;
    }

    // During canvas pan — just apply the pan, skip hover detection to avoid re-renders
    if (isCanvasPanningRef.current) {
      rendererHandleMouseMove(e);
      return;
    }

    // Throttled hover detection (only when not panning or dragging)
    const now = performance.now();
    if (now - stageLastPointerCheckRef.current >= 50) {
      stageLastPointerCheckRef.current = now;
      const hovered = hitTestNode(worldX, worldY);
      if (hovered !== pointerNodeIdRef.current) {
        pointerNodeIdRef.current = hovered;
        setPointerNodeId(hovered);
        onNodeHover?.(hovered);
      }
      if (hovered) {
        stage.container().style.cursor = 'pointer';
      } else {
        stage.container().style.cursor = 'grab';
      }
    }

    rendererHandleMouseMove(e);
  }, [toWorldCoords, hitTestNode, handleDragStart, handleDragMove, rendererHandleMouseMove]);

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isEmulatedMouse(e.evt)) return;
    setPressedNodeId(null);
    if (stageActiveNodeIdRef.current) {
      const nodeId = stageActiveNodeIdRef.current;
      if (stageDragCommittedRef.current) {
        // End drag — flush final world position
        const stage = e.target.getStage();
        if (stage) {
          const pointer = stage.getPointerPosition();
          if (pointer) {
            const { worldX, worldY } = toWorldCoords(stage, pointer);
            const offset = stageDragNodeOffsetRef.current;
            handleDragEnd(nodeId, worldX - offset.x, worldY - offset.y);
          }
        }
      } else {
        // Click — check if node has child layer (regardless of branchCount)
        const node = nodes.get(nodeId);
        if (node) {
          const childLayer = doc ? getChildLayerForNode(doc, nodeId, currentLayerId ?? '') : null;
          if (touchModeRef.current && (node.description || childLayer)) {
            // Touch: a tap opens the sheet (Step inside lives there); nothing flashes or navigates by itself.
            openSheet(node);
          } else if (childLayer) {
            handleNavigate(nodeId);
          }
          onNodeClick?.(node);
        }
      }
      isDraggingRef.current = false;
      setIsDraggingState(false);
      stageActiveNodeIdRef.current = null;
      stageMouseDownPosRef.current = null;
      stageDragCommittedRef.current = false;
      return;
    }
    // A tap (not a pan) on empty canvas dismisses the sheet.
    const tap = emptyTapRef.current;
    emptyTapRef.current = null;
    if (tap && pinnedIdRef.current) {
      const end = clientOf(e.evt);
      if (!Number.isFinite(end.x) || Math.hypot(end.x - tap.x, end.y - tap.y) < 6) setPinnedId(null);
    }
    isCanvasPanningRef.current = false;
    rendererHandleMouseUp(e);
  }, [toWorldCoords, handleDragEnd, nodes, handleNavigate, onNodeClick, rendererHandleMouseUp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (navStack.length <= 1) { setCanvasContextMenu(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = rect ? e.evt.clientX - rect.left : e.evt.clientX;
    const localY = rect ? e.evt.clientY - rect.top : e.evt.clientY;
    setCanvasContextMenu({ x: localX, y: localY });
  }, [navStack.length]);

  // Touch passthrough
  const handleStageTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) =>
    handleStageMouseDown(e as unknown as Konva.KonvaEventObject<MouseEvent>), [handleStageMouseDown]);
  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) =>
    handleStageMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent>), [handleStageMouseMove]);
  const handleStageTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) =>
    handleStageMouseUp(e as unknown as Konva.KonvaEventObject<MouseEvent>), [handleStageMouseUp]);

  // Wheel with auto-nav guard on non-root layers
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    const isZoomOut = e.evt.deltaY > 0;
    if (!isZoomOut) { rendererHandleWheel(e); return; }

    const liveZoom = useViewportStore.getState().zoomLevel;
    const projected = Math.max(ZOOM_MIN, liveZoom * (1 - e.evt.deltaY / 1000));

    // Root layer: no parent to navigate to — let the user zoom freely down to ZOOM_MIN
    // (do NOT clamp at ZOOM_NAV_OUT_THRESHOLD; content may require lower zoom to fit)

    if (navStack.length > 1 && projected <= ZOOM_NAV_OUT_THRESHOLD && !isTransitioningRef.current && !isAnimating()) {
      e.evt.preventDefault();
      const now = Date.now();
      if (now - lastZoomTransitionRef.current >= ZOOM_COOLDOWN) {
        lastZoomTransitionRef.current = now;
        handleNavigateBack(navStack.length - 2);
        baseZoomRef.current = 1.0;
      }
      return;
    }
    rendererHandleWheel(e);
  }, [rendererHandleWheel, navStack, setZoom, isAnimating, handleNavigateBack]);

  // Canvas mouse move for description tooltip
  const lastHoverCheckRef = useRef(0);
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (touchModeRef.current || isEmulatedMouse(e.nativeEvent)) return; // no hover peek on touch
    if (!containerRef.current || isDraggingRef.current || isCanvasPanningRef.current) {
      setHoveredNode(null);
      return;
    }
    const now = Date.now();
    if (now - lastHoverCheckRef.current < 50) return;
    lastHoverCheckRef.current = now;

    // Check if mouse is over a tooltip - if so, don't change hovered node
    const target = e.target as HTMLElement;
    const isOverTooltip = target.closest('[data-node-tooltip="true"]') || target.closest('[data-semantic-tooltip="true"]');
    
    // If tooltip is open and we're hovering it or keeping it open, don't detect new nodes
    if (tooltipHoverRef.current || keepTooltipOpenRef.current || isOverTooltip) {
      return;
    }

    const cw = viewport.canvasWidth  || canvasSizeRef.current.width;
    const ch = viewport.canvasHeight || canvasSizeRef.current.height;
    // e.clientX is viewport-relative; subtract the container's left/top offset
    // so world-coordinate conversion is correct when the renderer isn't full-screen.
    const rect = containerRef.current?.getBoundingClientRect();
    const localX = rect ? e.clientX - rect.left : e.clientX;
    const localY = rect ? e.clientY - rect.top  : e.clientY;
    const worldX = (localX - cw / 2) / viewport.zoomLevel + viewport.centerX;
    const worldY = (localY - ch / 2) / viewport.zoomLevel + viewport.centerY;

    // Use RBush spatial index for O(log n) hit detection
    let found = false;
    if (spatialIndexRef.current) {
      const hits = spatialIndexRef.current.query({ minX: worldX, minY: worldY, maxX: worldX, maxY: worldY });
      for (const nodeId of hits) {
        const node = nodes.get(nodeId);
        if (node?.description) {
          setHoveredNode({ nodeId: node.id, summary: node.description, screenX: e.clientX, screenY: e.clientY });
          found = true;
          break;
        }
      }
    }
    if (!found) {
      if (clearTooltipTimerRef.current) clearTimeout(clearTooltipTimerRef.current);
      clearTooltipTimerRef.current = setTimeout(() => {
        if (!tooltipHoverRef.current && !keepTooltipOpenRef.current) setHoveredNode(null);
      }, 150);
    } else {
      if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; }
    }
  }, [nodes, viewport, spatialIndexRef]);

  // Listen for external requests to keep tooltip open (e.g., from extensions)
  useEffect(() => {
    const handleKeepTooltipOpen = (event: CustomEvent) => {
      keepTooltipOpenRef.current = event.detail.keep;
    };
    
    // @ts-ignore - custom event
    window.addEventListener('keepNodeTooltipOpen', handleKeepTooltipOpen);
    
    return () => {
      // @ts-ignore - custom event
      window.removeEventListener('keepNodeTooltipOpen', handleKeepTooltipOpen);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTooltipTimerRef.current) clearTimeout(clearTooltipTimerRef.current);
      spatialIndexRef.current?.clear();
      if (dragMoveRafRef.current !== null) cancelAnimationFrame(dragMoveRafRef.current);
    };
  }, []);

  // ── Activate an idea (click, or Enter/Space on its accessible button) ───────
  const activateNode = useCallback((node: FlatNode) => {
    const childLayer = doc ? getChildLayerForNode(doc, node.id, currentLayerId ?? '') : null;
    if (touchModeRef.current && (node.description || childLayer)) openSheet(node);
    else if (childLayer) handleNavigate(node.id);
    onNodeClick?.(node);
  }, [doc, currentLayerId, handleNavigate, onNodeClick]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepInside = useCallback((nodeId: string) => { setHoveredNode(null); handleNavigate(nodeId); }, [handleNavigate]);

  // The peek can unmount while the pointer is on it (Step inside, layer change): no mouseleave
  // fires then, so clear the "pointer is on the peek" flag whenever it closes.
  useEffect(() => { if (!hoveredNode) tooltipHoverRef.current = false; }, [hoveredNode]);

  // Keyboard: Esc steps back out, + / - zoom, 0 fits.
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape' && pinnedIdRef.current) { e.preventDefault(); setPinnedId(null); }
    else if (e.key === 'Escape' && navStack.length > 1) { e.preventDefault(); handleNavigateBack(navStack.length - 2); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(Math.min(viewport.zoomLevel * 1.2, ZOOM_MAX)); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(Math.max(viewport.zoomLevel / 1.2, ZOOM_MIN)); }
    else if (e.key === '0') { e.preventDefault(); fitToScreen(); }
  }, [navStack.length, handleNavigateBack, setZoom, viewport.zoomLevel, fitToScreen]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!doc) {
    return (
      <div className={`vi-map ${className}`} {...design.attrs} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
        <span className="body-sm" style={{ color: 'var(--ink-muted)' }}>No document</span>
      </div>
    );
  }

  const hasBackOption = navStack.length > 1;
  const currentLayerTitle = navStack[navStack.length - 1]?.label ?? '';
  const peekNode = hoveredNode ? nodes.get(hoveredNode.nodeId) : undefined;
  const pinnedNode = pinnedId ? nodes.get(pinnedId) : undefined;
  const pinnedHasChild = !!(pinnedNode && getChildLayerForNode(doc, pinnedNode.id, currentLayerId ?? ''));
  const compact = (viewport.canvasWidth || canvasSizeRef.current.width || 1024) < 560;
  const medium = !compact && (viewport.canvasWidth || canvasSizeRef.current.width || 1024) < 900;
  const peekHasChild = !!(peekNode && doc && getChildLayerForNode(doc, peekNode.id, currentLayerId ?? ''));

  return (
    <div
      ref={containerRef}
      className={`vi-map${touchMode ? ' is-touch' : ''}${compact ? ' is-compact' : ''}${medium ? ' is-medium' : ''} ${className}`}
      {...design.attrs}
      role="group"
      aria-label={`${doc.meta?.title ?? 'Map'}${currentLayerTitle ? `, ${currentLayerTitle}` : ''}`}
      onKeyDown={handleKeyDown}
      // Focusable by pointer so Esc / + / - / 0 work after clicking the map (Tab order is the mirrored ideas).
      tabIndex={-1}
      onPointerDownCapture={(e) => { if (!(e.target as HTMLElement).closest('button, a, input')) containerRef.current?.focus({ preventScroll: true }); }}
      style={{ position: 'relative', overflow: 'hidden', userSelect: 'none', width: '100%', height: '100%', outline: 'none', ...style }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => {
        // Only close the peek on mouse leave if not keeping it open
        if (!tooltipHoverRef.current && !keepTooltipOpenRef.current) {
          setHoveredNode(null);
        }
      }}
    >
      {/* Chromatic immersion tint */}
      <div className="vi-map__immersion" style={{ background: immersionTopic ? `var(--topic-${immersionTopic})` : 'transparent' }} aria-hidden="true" />

      {/* Konva canvas — opacity driven imperatively during transitions. Held back until the fonts are ready. */}
      <div ref={canvasWrapperRef} style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
        {fontsReady && (
          <KonvaStage
            ref={stageRef}
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onContextMenu={handleStageContextMenu}
            onTouchStart={handleStageTouchStart}
            onTouchMove={handleStageTouchMove}
            onTouchEnd={handleStageTouchEnd}
          >
            <KonvaContainerLayer nodes={flatNodes} containers={containers} design={design} />
            <KonvaEdgeLayer nodes={flatNodes} connections={connections} design={design} isDragging={isDraggingState} />
            <KonvaNodeLayer
              design={design}
              isTransitioning={isTransitioning}
              isDragging={isDraggingState}
              hoveredNodeId={pointerNodeId}
              pressedNodeId={pressedNodeId}
              selectedNodeId={selectedNodeId}
              focusedNodeId={focusedNodeId}
            />
          </KonvaStage>
        )}
      </div>

      {/* Screen-reader / keyboard mirror of the visible ideas */}
      <A11yLayer
        nodes={flatNodes}
        label={`Ideas in ${currentLayerTitle || 'this map'}`}
        hasChildLayer={(id) => !!getChildLayerForNode(doc, id, currentLayerId ?? '')}
        onActivate={activateNode}
        onFocusNode={setFocusedNodeId}
        announcement={hasBackOption ? `Now inside ${currentLayerTitle}` : undefined}
      />

      {/* Context menu (right-click to go back) */}
      {canvasContextMenu && hasBackOption && (
        <div
          role="menu"
          aria-label="Canvas options"
          style={{
            position: 'absolute',
            zIndex: 'var(--z-menu)' as unknown as number,
            pointerEvents: 'auto',
            left: `${Math.min(canvasContextMenu.x, Math.max(8, (canvasSizeRef.current.width  || 800)  - 152))}px`,
            top: `${Math.min(canvasContextMenu.y, Math.max(8, (canvasSizeRef.current.height || 600) - 72))}px`,
          }}
          onContextMenu={e => e.preventDefault()}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="vi-iconbtn vi-iconbtn--surface"
            style={{ width: 'auto', padding: '6px var(--space-4)', boxShadow: 'var(--shadow-pop)' }}
            onClick={() => { setCanvasContextMenu(null); handleNavigateBack(navStack.length - 2); }}
          >
            Back
          </button>
        </div>
      )}

      {/* Depth trail (top-left) */}
      <NavigationStack stack={navStack} onNavigateBack={handleNavigateBack} top={navigationStackTop} left={navigationStackLeft} />

      {/* Canvas controls (bottom-right) */}
      <div className="vi-map__ctrls" style={pinnedNode && touchMode ? { bottom: `calc(var(--space-4) + ${sheetHeight}px)` } : undefined}>
        <ZoomControls onFit={fitToScreen} touch={touchMode} />
      </div>

      {/* Custom overlay from the consuming app */}
      {renderOverlay?.({ isDark, theme: design.theme, containerWidth: canvasSizeRef.current.width || 0, containerHeight: canvasSizeRef.current.height || 0 })}

      {/* Touch: the peek is the design system's bottom sheet, pinned until dismissed */}
      {touchMode && pinnedNode && (
        <PeekSheet
          node={pinnedNode}
          topic={topicOf(pinnedNode)}
          anchors={anchors}
          height={sheetHeight}
          expanded={sheetExpanded}
          onToggleExpanded={() => setSheetExpanded((v) => !v)}
          onClose={() => setPinnedId(null)}
          onStepInside={pinnedHasChild ? () => { setPinnedId(null); handleNavigate(pinnedNode.id); } : undefined}
          renderContent={renderNodeContent ? (summary) => renderNodeContent({ summary, nodeId: pinnedNode.id, nodeColor: pinnedNode.color, zoom: viewport.zoomLevel }) : undefined}
        />
      )}

      {/* Pointer: the peek floats over the hovered idea — the design system's card */}
      {!touchMode && hoveredNode && hoveredNodePosition && peekNode && viewport.zoomLevel < 3 && viewport.zoomLevel >= TEXT_LABEL_HIDE_BELOW_ZOOM && (() => {
        const VP_PAD = 8;
        const HALF_W = 160;
        const APPROX_H = 90;
        const containerW = canvasSizeRef.current.width || 800;
        const safeLeft = Math.max(HALF_W + VP_PAD, Math.min(hoveredNodePosition.screenX, containerW - HALF_W - VP_PAD));
        const rawTop   = hoveredNodePosition.screenY - 60 * hoveredNodePosition.zoom;
        const safeTop  = Math.max(VP_PAD + APPROX_H, rawTop);
        return (
          <div
            className="vi-map__fact"
            style={{ left: safeLeft, top: safeTop, transform: 'translate(-50%, -100%)', pointerEvents: 'auto', zIndex: 'var(--z-card)' as unknown as number }}
            onMouseEnter={() => { tooltipHoverRef.current = true; if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; } }}
            onMouseLeave={() => {
              tooltipHoverRef.current = false;
              // Delay clearing to allow external extensions to request keeping the peek open
              if (clearTooltipTimerRef.current) clearTimeout(clearTooltipTimerRef.current);
              clearTooltipTimerRef.current = setTimeout(() => {
                if (!keepTooltipOpenRef.current) setHoveredNode(null);
              }, 100);
            }}
          >
            <PeekCard
              node={peekNode}
              topic={topicOf(peekNode)}
              anchors={anchors}
              onStepInside={peekHasChild ? () => stepInside(peekNode.id) : undefined}
              renderContent={renderNodeContent ? (summary) => renderNodeContent({ summary, nodeId: peekNode.id, nodeColor: peekNode.color, zoom: viewport.zoomLevel }) : undefined}
            />
          </div>
        );
      })()}
    </div>
  );
}
