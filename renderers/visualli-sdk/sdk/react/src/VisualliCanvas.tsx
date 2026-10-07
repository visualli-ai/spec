// ─── VisualliCanvas ───────────────────────────────────────────────────────────
//
// Main canvas component for rendering a VisualliDocument, drawn with the Visualli
// design system (tokens, fonts and geometry from design-system/):
//   • Konva canvas for ideas, rings and connectors; DOM overlays for the peek,
//     term cards, depth trail and controls (the design system's own CSS)
//   • Stage-level hit detection via RBush spatial index (no Konva hit-canvas)
//   • 8 themes + comfort settings (readable type, larger text, reduced motion)
//   • Step inside / back out by idea, peek, depth trail, Escape or Backspace — zoom and pinch never navigate
//   • Layer transitions with the design system's motion (CSS-transform driven, no canvas redraws while animating)
//   • A visually hidden DOM mirror of the visible ideas for screen readers / Tab
//
// NOT included (read-only viewer): editing, generation, chat, sources, export.

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import type { VisualliDocument, VisualliLayer, FlatNode, MindMapConnection, Comfort, ThemeInput } from '@visualli/core';
import {
  parseVisualliFile,
  getNodesForLayer,
  getSemanticAnchors,
  ideaColor,
  motionVars,
  nodeRadii,
  ringsFor,
  peekPosition,
  TRAIL,
  RBushSpatialIndex,
  GESTURE,
  pinchZoom,
  zoomAround,
  VIEW,
  PEEK,
  SHEET,
} from '@visualli/core';

import { useNodeStore }        from './stores/useNodeStore';
import { useViewportStore }    from './stores/useViewportStore';
import { useSelectionStore }   from './stores/stores';

import { useKonvaRenderer }          from './hooks/useKonvaRenderer';
import { useLayerChoreography }      from './hooks/useLayerChoreography';
import { RevealClock }              from './design/choreography';

import KonvaStage           from './components/KonvaStage';
import KonvaNodeLayer       from './components/KonvaNodeLayer';
import KonvaEdgeLayer       from './components/KonvaEdgeLayer';
import KonvaContainerLayer  from './components/KonvaContainerLayer';
import KonvaContainerLabelLayer from './components/KonvaContainerLabelLayer';
import NavigationStack, { type NavStackEntry } from './components/NavigationStack';
import { ZoomControls, PeekCard, PeekSheet } from './components/Overlays';
import { A11yLayer } from './components/A11yLayer';

import { getChildLayerForNode, calculateFitView, getConnectionsForLayer, getContainersForLayer } from './utils/layerNavigation';
import type { ContainerGroup } from './components/KonvaContainerLayer';
import type { AnimatorViewport } from './hooks/useLayerChoreography';
import { useDesign } from './design/useDesign';
import { ideaMeasure } from './design/measure';
import { paintVars, type IdeaPaint } from './components/Overlays';
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

/** Colour of the idea a layer opens from — the idea's own colour, including the sibling-order topic of an uncoloured
 *  idea (the design system's TRAIL); the root layer is the map itself, TRAIL.rootTopic. */
function layerPaint(doc: VisualliDocument, layer: VisualliLayer): IdeaPaint {
  const parentLayer = layer.parentLayerId ? doc.layers.get(layer.parentLayerId) : null;
  const index = parentLayer ? parentLayer.nodes.findIndex(n => n.id === layer.parentNodeId) : -1;
  if (!parentLayer || index < 0) return { topic: TRAIL.rootTopic };
  const { topic, custom } = ideaColor(parentLayer.nodes[index]!.data.color, index);
  return topic ? { topic } : { custom: custom! };
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
  /**
   * How a layer arrives. 'gradual' (default): ideas bloom in one by one, then connectors draw
   * (design-system motion). 'instant': everything fades in together, as with reduced motion.
   */
  reveal?: 'gradual' | 'instant';
  /** Switch to the high-contrast theme under forced-colors. Default true. */
  respectForcedColors?: boolean;
  /**
   * Interaction layout. 'auto' (default) follows the reader's input: touch devices get the design
   * system's bottom-sheet peek and larger controls, pointer devices the floating peek on hover.
   * Force one with 'touch' or 'pointer'.
   */
  layout?: 'auto' | 'touch' | 'pointer';
  /**
   * The map is the page (an app such as Visualli's web app): it takes every touch gesture, so the browser never
   * zooms or scrolls the page — the design system's `.vi-map.is-app` (`touch-action: none`). Leave it off when the
   * map is embedded in a scrolling page: one finger then still scrolls the page, two fingers pinch the map.
   */
  app?: boolean;
  /**
   * Where the zoom / fit controls sit. Default 'top-right', the design system's placement (`.vi-map__ctrls`,
   * opposite the depth trail). 'bottom-right' moves them to the bottom corner for hosts that need the top edge;
   * there they rise above the touch peek sheet while it's open.
   */
  controlsPosition?: 'top-right' | 'bottom-right';
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
  // The host's hover callback, read through a ref so the stage's pointer handlers stay stable when it changes.
  const onNodeHoverRef = useRef(onNodeHover);
  onNodeHoverRef.current = onNodeHover;

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
  /** The idea being stepped into: the depth trail entry takes its colour and label from it, so they always match the idea that was clicked. */
  const stepTargetRef                     = useRef<{ paint: IdeaPaint; label: string } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    if (!doc) return;
    const rootId = getRootLayerId(doc);
    if (!rootId) return;
    const rootLayer = doc.layers.get(rootId)!;
    setCurrentLayerId(rootId);
    // The trail starts with the map's title (the design system's DepthTrail).
    setNavStack([{ layerId: rootId, layer: rootLayer, label: doc.meta?.title || 'Home', paint: { topic: TRAIL.rootTopic } }]);
    parentViewports.current = [];
  }, [doc]);

  // ── Active layer → FlatNodes ──────────────────────────────────────────────
  // Ideas are sized for their labels (the design system's idea.ts) with the real label face, so sizes are taken once
  // the fonts are in, and again when the face or the label scale changes (readable type, larger text).
  const sizing = useMemo(() => ({ measure: ideaMeasure(design), labelScale: design.labelScale }), [design.fontHand, design.labelScale, design.comfort.readableType, fontsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  const { flatNodes, connections, containers } = useMemo(() => {
    if (!doc || !currentLayerId) return { flatNodes: [] as FlatNode[], connections: [] as MindMapConnection[], containers: [] as ContainerGroup[] };
    try {
      return {
        flatNodes: getNodesForLayer(doc, currentLayerId, sizing),
        connections: getConnectionsForLayer(doc, currentLayerId),
        containers: getContainersForLayer(doc, currentLayerId) as ContainerGroup[],
      };
    } catch { return { flatNodes: [] as FlatNode[], connections: [] as MindMapConnection[], containers: [] as ContainerGroup[] }; }
    }, [doc, currentLayerId, sizing]);
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

  // ── Choreography: a layer's arrival (ideas bloom, connectors draw) ────────
  const clock = useMemo(() => new RevealClock(), []);
  const instantReveal = design.comfort.reducedMotion || props.reveal === 'instant';
  useEffect(() => {
    if (!fontsReady || flatNodes.length === 0) return;
    clock.start(flatNodes, connections.length, instantReveal);
    // Lift the step-inside veil two frames from now, once the new layer's first frame has been painted.
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(arrive); });
    let r2 = 0;
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [flatNodes, fontsReady]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => clock.subscribe((running) => {
    const el = containerRef.current;
    if (el) el.dataset.viReveal = running ? 'running' : 'idle';
  }), [clock]);
  useEffect(() => () => clock.stop(), [clock]);

  // ── Canvas refs ───────────────────────────────────────────────────────────
  const containerRef     = useRef<HTMLDivElement | null>(null);
  const stageRef         = useRef<Konva.Stage | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // canvasSizeRef is kept in sync with the measured container size (not window).
  // Initialise to 0 — it will be updated synchronously before the first frame.
  const canvasSizeRef         = useRef({ width: 0, height: 0 });

  // ── Node drag refs (RAF-throttled, matches visualli.ai) ───────────────────
  const dragMoveRafRef      = useRef<number | null>(null);
  const dragMoveLatestRef   = useRef<{ nodeId: string; x: number; y: number } | null>(null);
  const dragStartPosRef     = useRef<Map<string, { x: number; y: number }>>(new Map());

  // ── Chromatic immersion: the colour of the idea stepped into tints the canvas at `immersion-alpha` ──
  const immersionFill = useMemo<string | null>(() => {
    if (!chromaticImmersion || !doc || !currentLayerId) return null;
    const layer = doc.layers.get(currentLayerId);
    if (!layer || layer.level === 0 || !layer.parentNodeId) return null;
    return paintVars(layerPaint(doc, layer)).fill;
  }, [chromaticImmersion, doc, currentLayerId]);

  // ── Spatial index (for stage-level hit detection) ─────────────────────────
  const spatialIndexRef = useRef<RBushSpatialIndex | null>(null);
  useEffect(() => {
    if (flatNodes.length === 0) { spatialIndexRef.current?.clear(); return; }
    const idx = new RBushSpatialIndex();
    idx.bulkLoad(flatNodes.map(n => {
      const { rx, ry } = nodeRadii(n);
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
    cancelPan:       rendererCancelPan,
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
          const { rx, ry } = nodeRadii(node);
          spatialIndexRef.current.remove(nodeId, {
            minX: oldPos.x - rx, minY: oldPos.y - ry,
            maxX: oldPos.x + rx, maxY: oldPos.y + ry,
          });
        }
        const { rx, ry } = nodeRadii(node);
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
    // Every layer, the root included, fits the same way (the design system's fit; never beyond VIEW.fitMax).
    const { centerX, centerY, zoomLevel } = calculateFitView(flatNodes, cw, ch, containers);
    // Zoom limits (VIEW) apply relative to the fit, as in the design system's map.
    useViewportStore.getState().setFit(zoomLevel, centerX, centerY);
    setCenter(centerX, centerY);
    setZoom(zoomLevel);
  }, [flatNodes, containers, setCenter, setZoom]);

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

  const { stepInside: diveInto, backOut, arrive, isTransitioning: isAnimating } = useLayerChoreography({
    stageRef,
    canvasWrapperRef,
    reducedMotion: design.comfort.reducedMotion || props.reveal === 'instant',
    onSwapLayer: (childLayerId) => {
      const childLayer = doc?.layers.get(childLayerId);
      if (!childLayer || !doc) return;
      setCurrentLayerId(childLayerId);
      const target = stepTargetRef.current;
      stepTargetRef.current = null;
      setNavStack(prev => [...prev, {
        layerId: childLayerId,
        layer: childLayer,
        label: target?.label || layerLabel(doc, childLayer, childLayerId),
        paint: target?.paint ?? layerPaint(doc, childLayer),
      }]);
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
      requestAnimationFrame(() => { fitToScreenRef.current(); });
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
    const childNodes = (() => { try { return getNodesForLayer(doc, childLayerId, sizing); } catch { return []; } })();
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
    const fitVp = calculateFitView(flatNodes, cw, ch, containers);
    parentViewports.current.push({ centerX: fitVp.centerX, centerY: fitVp.centerY, zoomLevel: fitVp.zoomLevel });

    stepTargetRef.current = { paint: { topic: node.topic, custom: node.custom }, label: node.title };
    setIsTransitioning(true);
    isTransitioningRef.current = true;

    diveInto(node, childLayerId, childNodes);
  }, [doc, currentLayerId, nodes, isAnimating, diveInto, sizing, flatNodes, containers]);

  const handleNavigateBack = useCallback((targetIndex: number) => {
    if (targetIndex >= navStack.length - 1) return;
    if (isTransitioningRef.current || isAnimating()) return;
    const savedVp = parentViewports.current[targetIndex];
    if (!savedVp) return;
    navBackTargetRef.current = targetIndex;
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    backOut(savedVp);
  }, [navStack.length, isAnimating, backOut]);

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
  /** Collapsed sheet height: the design system's SHEET — a share of the map, at most SHEET.maxHeight. */
  const sheetHeight = Math.min(SHEET.maxHeight, Math.round((viewport.canvasHeight || canvasSizeRef.current.height || 600) * SHEET.heightRatio));

  /** Open the bottom sheet for an idea, scrolling the map so the idea stays visible above it. */
  const openSheet = (node: FlatNode) => {
    setPinnedId(node.id);
    setSheetExpanded(false);
    setHoveredNode(null);
    const vp = useViewportStore.getState();
    const ch = canvasSizeRef.current.height || vp.canvasHeight;
    const sh = Math.min(SHEET.maxHeight, Math.round(ch * SHEET.heightRatio));
    const screenY = (node.y - vp.centerY) * vp.zoomLevel + ch / 2;
    const reach = nodeRadii(node).ry * vp.zoomLevel;
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
  }, [hitTestNode, toWorldCoords, nodes, select, rendererHandleMouseDown, props.layout]);

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
        onNodeHoverRef.current?.(hovered);
      }
      // Cursors as the design system's: an idea is a button (pointer); the canvas keeps the default.
      stage.container().style.cursor = hovered ? 'pointer' : '';
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
          if (touchModeRef.current && childLayer && pinnedIdRef.current === nodeId) {
            // Touch: tapping the idea whose sheet is open steps inside (same as the sheet's Step inside).
            setPinnedId(null);
            handleNavigate(nodeId);
          } else if (touchModeRef.current && (node.description || childLayer)) {
            // Touch: the first tap opens the sheet; nothing flashes or navigates by itself.
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

  // ── Pinch to zoom (the design system's GESTURE, geometry/interaction.ts) ─────
  // Two touch pointers zoom the contents around the point between them (pinchZoom / zoomAround, within VIEW's
  // limits) and pan as they move together. Only the Konva world moves — the trail, controls, peek and sheet are
  // DOM and never scale. A pinch never navigates, and never ends as a tap, a pan or an idea drag.
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ d0: number; m0: { x: number; y: number }; z0: number; c0: { x: number; y: number } } | null>(null);
  const pinchEndedAtRef = useRef(-Infinity);
  const [pinching, setPinching] = useState(false);
  const localOf = (e: React.PointerEvent) => { const r = containerRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onPinchDown = (e: React.PointerEvent) => {
    if (!GESTURE.pinchZoom || !GESTURE.pointers.includes(e.pointerType)) return;
    touchPointsRef.current.set(e.pointerId, localOf(e));
    if (touchPointsRef.current.size !== 2 || isTransitioningRef.current || isAnimating()) return;
    const [a, b] = [...touchPointsRef.current.values()];
    const vp = useViewportStore.getState();
    pinchRef.current = { d0: Math.hypot(a.x - b.x, a.y - b.y), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z0: vp.zoomLevel, c0: { x: vp.centerX, y: vp.centerY } };
    // The first finger's press becomes part of the pinch: no tap, pan or drag comes of it.
    rendererCancelPan();
    isCanvasPanningRef.current = false;
    emptyTapRef.current = null;
    stageActiveNodeIdRef.current = null;
    stageDragCommittedRef.current = false;
    isDraggingRef.current = false;
    setPressedNodeId(null);
    setPinching(true);
  };
  const onPinchMove = (e: React.PointerEvent) => {
    if (!touchPointsRef.current.has(e.pointerId)) return;
    touchPointsRef.current.set(e.pointerId, localOf(e));
    const p = pinchRef.current;
    if (!p || touchPointsRef.current.size < 2) return;
    const [a, b] = [...touchPointsRef.current.values()];
    const fit = useViewportStore.getState().fitScale;
    const z = pinchZoom(p.z0 / fit, p.d0, Math.hypot(a.x - b.x, a.y - b.y)) * fit; // VIEW's limits relative to the fit
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const cw = canvasSizeRef.current.width || containerRef.current?.clientWidth || 800;
    const ch = canvasSizeRef.current.height || containerRef.current?.clientHeight || 600;
    // screen = (world − centre) × zoom + size / 2, i.e. translation t = size / 2 − centre × zoom
    const t = zoomAround({ x: cw / 2 - p.c0.x * p.z0, y: ch / 2 - p.c0.y * p.z0 }, p.z0, z, p.m0, GESTURE.twoFingerPan ? m : p.m0);
    setZoom(z);
    setCenter((cw / 2 - t.x) / z, (ch / 2 - t.y) / z);
  };
  const onPinchUp = (e: React.PointerEvent) => {
    if (!touchPointsRef.current.delete(e.pointerId)) return;
    if (pinchRef.current && touchPointsRef.current.size < 2) {
      pinchRef.current = null;
      pinchEndedAtRef.current = performance.now();
      setPinching(false);
    }
  };
  /** True while two fingers pinch, and for a moment after: the lifting fingers are not a tap. */
  const inPinch = () => pinchRef.current !== null || touchPointsRef.current.size > 1 || performance.now() - pinchEndedAtRef.current < 300;

  // Touch passthrough (one finger); a pinch owns the touches while it lasts.
  const handleStageTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (inPinch() || e.evt.touches.length > 1) return;
    handleStageMouseDown(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }, [handleStageMouseDown]);
  const handleStageTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (inPinch() || e.evt.touches.length > 1) return;
    handleStageMouseMove(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }, [handleStageMouseMove]);
  const handleStageTouchEnd = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (inPinch()) { isCanvasPanningRef.current = false; return; }
    handleStageMouseUp(e as unknown as Konva.KonvaEventObject<MouseEvent>);
  }, [handleStageMouseUp]);

  // Wheel / trackpad: zoom within VIEW's limits. It never navigates — stepping inside and backing out are
  // the design system's explicit actions (the idea, its peek, the depth trail, Escape / Backspace).
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => { rendererHandleWheel(e); }, [rendererHandleWheel]);

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
      }, PEEK.hoverClose); // the design system's peek grace (geometry/interaction.ts)
    } else {
      if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; }
    }
  }, [nodes, viewport, spatialIndexRef]);

  // Listen for external requests to keep tooltip open (e.g., from extensions)
  useEffect(() => {
    const handleKeepTooltipOpen = (event: CustomEvent) => {
      keepTooltipOpenRef.current = event.detail.keep;
    };
    
    // A custom event: its listener takes a CustomEvent, so it is cast to the DOM's EventListener.
    window.addEventListener('keepNodeTooltipOpen', handleKeepTooltipOpen as EventListener);
    
    return () => {
      window.removeEventListener('keepNodeTooltipOpen', handleKeepTooltipOpen as EventListener);
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
    if (touchModeRef.current && childLayer && pinnedIdRef.current === node.id) { setPinnedId(null); handleNavigate(node.id); }
    else if (touchModeRef.current && (node.description || childLayer)) openSheet(node);
    else if (childLayer) handleNavigate(node.id);
    onNodeClick?.(node);
  }, [doc, currentLayerId, handleNavigate, onNodeClick]);

  const stepInside = useCallback((nodeId: string) => { setHoveredNode(null); handleNavigate(nodeId); }, [handleNavigate]);

  // The peek can unmount while the pointer is on it (Step inside, layer change): no mouseleave
  // fires then, so clear the "pointer is on the peek" flag whenever it closes.
  useEffect(() => { if (!hoveredNode) tooltipHoverRef.current = false; }, [hoveredNode]);

  // Keyboard, as the design system's canvas language: Escape or Backspace steps back out (Escape first closes a
  // pinned peek); ⌘ / Ctrl + + / − / 0 zoom in, zoom out and fit (by VIEW.zoomStep, within VIEW's limits).
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return;
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && !e.altKey) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(viewport.zoomLevel * VIEW.zoomStep); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); setZoom(viewport.zoomLevel / VIEW.zoomStep); }
      else if (e.key === '0') { e.preventDefault(); fitToScreen(); }
      return;
    }
    if (e.altKey || e.shiftKey) return;
    if (e.key === 'Escape' && pinnedIdRef.current) { e.preventDefault(); setPinnedId(null); }
    else if ((e.key === 'Escape' || e.key === 'Backspace') && navStack.length > 1) { e.preventDefault(); handleNavigateBack(navStack.length - 2); }
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
      className={`vi-map${touchMode ? ' is-touch' : ''}${compact ? ' is-compact' : ''}${medium ? ' is-medium' : ''}${pinching ? ' is-pinching' : ''}${props.app ? ' is-app' : ''} ${className}`}
      {...design.attrs}
      data-reveal={instantReveal ? 'instant' : undefined}
      role="group"
      aria-label={`${doc.meta?.title ?? 'Map'}${currentLayerTitle ? `, ${currentLayerTitle}` : ''}`}
      onKeyDown={handleKeyDown}
      // Focusable by pointer so Esc / + / - / 0 work after clicking the map (Tab order is the mirrored ideas).
      tabIndex={-1}
      onPointerDownCapture={(e) => { onPinchDown(e); if (!(e.target as HTMLElement).closest('button, a, input')) containerRef.current?.focus({ preventScroll: true }); }}
      onPointerMoveCapture={onPinchMove}
      onPointerUpCapture={onPinchUp}
      onPointerCancelCapture={onPinchUp}
      style={{ position: 'relative', overflow: 'hidden', userSelect: 'none', width: '100%', height: '100%', outline: 'none', ...(motionVars() as React.CSSProperties), ...style }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => {
        // Only close the peek on mouse leave if not keeping it open
        if (!tooltipHoverRef.current && !keepTooltipOpenRef.current) {
          setHoveredNode(null);
        }
      }}
    >
      {/* Chromatic immersion tint */}
      <div className="vi-map__immersion" style={{ background: immersionFill ?? 'transparent' }} aria-hidden="true" />

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
            <KonvaContainerLayer nodes={flatNodes} containers={containers} connections={connections} design={design} />
            <KonvaEdgeLayer nodes={flatNodes} connections={connections} design={design} isDragging={isDraggingState} clock={clock} />
            <KonvaNodeLayer
              design={design}
              clock={clock}
              isTransitioning={isTransitioning}
              isDragging={isDraggingState}
              hoveredNodeId={pointerNodeId}
              pressedNodeId={pressedNodeId}
              selectedNodeId={selectedNodeId}
              focusedNodeId={focusedNodeId}
              touch={touchMode}
              peekedNodeId={touchMode ? pinnedId : null}
            />
            {/* Container names above connectors and ideas, so nothing runs over them. */}
            <KonvaContainerLabelLayer containers={containers} connections={connections} design={design} />
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

      {/* Canvas controls: the design system's placement (top-right); 'bottom-right' only on request */}
      <div
        className="vi-map__ctrls"
        style={props.controlsPosition === 'bottom-right'
          ? { top: 'auto', bottom: pinnedNode && touchMode ? `calc(var(--space-4) + ${sheetHeight}px)` : 'var(--space-4)' }
          : undefined}
      >
        <ZoomControls onFit={fitToScreen} touch={touchMode} />
      </div>

      {/* Custom overlay from the consuming app */}
      {renderOverlay?.({ isDark, theme: design.theme, containerWidth: canvasSizeRef.current.width || 0, containerHeight: canvasSizeRef.current.height || 0 })}

      {/* Touch: the peek is the design system's bottom sheet, pinned until dismissed */}
      {touchMode && pinnedNode && (
        <PeekSheet
          node={pinnedNode}
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
      {!touchMode && hoveredNode && hoveredNodePosition && peekNode && (() => {
        // Beside the idea — right of it if it fits, else left — level with it (the design system's peekPosition).
        const rings = ringsFor(peekNode.branchCount);
        const half = nodeRadii(peekNode).rx * (rings.length ? rings[rings.length - 1]!.scale : 1) * hoveredNodePosition.zoom;
        const at = peekPosition({ x: hoveredNodePosition.screenX, y: hoveredNodePosition.screenY, half }, { w: canvasSizeRef.current.width || 800, h: canvasSizeRef.current.height || 600 });
        return (
          <div
            className="vi-map__fact"
            style={{ left: at.left, top: at.top, pointerEvents: 'auto', zIndex: 'var(--z-card)' as unknown as number }}
            onMouseEnter={() => { tooltipHoverRef.current = true; if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; } }}
            onMouseLeave={() => {
              tooltipHoverRef.current = false;
              // Delay clearing to allow external extensions to request keeping the peek open
              if (clearTooltipTimerRef.current) clearTimeout(clearTooltipTimerRef.current);
              clearTooltipTimerRef.current = setTimeout(() => {
                if (!keepTooltipOpenRef.current) setHoveredNode(null);
              }, PEEK.hoverClose);
            }}
          >
            <PeekCard
              node={peekNode}
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
