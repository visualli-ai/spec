// ─── VisualliCanvas ───────────────────────────────────────────────────────────
//
// Main canvas component for rendering a VisualliDocument.
// Matches the visualli.ai enhanced canvas implementation:
//   • Stage-level hit detection via RBush spatial index (no Konva hit-canvas)
//   • Node description tooltip (sketchy-box style)
//   • Chromatic immersion background (color from current node)
//   • Auto-zoom navigation (zoom in → child layer, zoom out → parent layer)
//   • Professional layer transitions (zoom in / zoom out animations)
//   • Vertical left-side navigation stack
//   • Zoom controls (icon-based, top-right)
//   • Context menu (right-click to go back)
//
// NOT included (SDK-only, no generation UI):
//   • Sidebar, search, generation
//   • Semantic anchor tooltips (special word meanings)
//   • Branding logo
//   • Help overlay / view-source panel

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type Konva from 'konva';
import type { VisualliDocument, VisualliLayer, FlatNode, Connection } from '@visualli/core';
import {
  parseVisualliFile,
  getNodesForLayer,
  getThemeBackground,
  darkenHexColor,
  RBushSpatialIndex,
  NODE_HEIGHT,
  TEXT_LABEL_HIDE_BELOW_ZOOM,
  ZOOM_NAV_IN_THRESHOLD,
  ZOOM_NAV_OUT_THRESHOLD,
  ZOOM_MIN,
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
import ZoomControls         from './components/ZoomControls';
import SketchyBoxKonva      from './components/SketchyBoxKonva';

import { getChildLayerForNode, calculateFitView, getConnectionsForLayer, getContainersForLayer } from './utils/layerNavigation';
import type { ContainerGroup } from './components/KonvaContainerLayer';
import type { AnimatorViewport } from './animations/konvaLayerTransition';
import { DESCRIPTION_TEXT_BASE_FONT_PX } from './config/textScaling';
import { useVisualli } from './context/VisualliContext';

// Helper to convert hex color to rgba with transparency
function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return `rgba(240, 237, 230, ${alpha})`; // fallback
  }
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveDocument(props: VisualliCanvasProps): VisualliDocument | null {
  if (props.document) return props.document;
  if (props.visualliString) {
    try { return parseVisualliFile(props.visualliString); } catch { return null; }
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

function getRootLayerId(doc: VisualliDocument): string | null {
  for (const [id, layer] of doc.layers) {
    if (!layer.parentLayerId) return id;
  }
  return doc.layers.keys().next().value ?? null;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface VisualliCanvasProps {
  document?: VisualliDocument;
  visualliString?: string;
  isDark?: boolean;
  chromaticImmersion?: boolean;
  onNodeClick?: (node: FlatNode) => void;
  onLayerChange?: (layerId: string, layer: VisualliLayer) => void;
  
  // Extension points for private features (implement in consuming app)
  renderOverlay?: (params: { isDark: boolean; containerWidth: number; containerHeight: number }) => React.ReactNode;
  renderTooltipContent?: (params: { 
    summary: string; 
    nodeId: string; 
    nodeColor?: string;
    onAnchorHover?: (word: string, description: string, knowMoreUrl: string | null, event: React.MouseEvent<HTMLSpanElement>) => void;
    onAnchorLeave?: () => void;
  }) => React.ReactNode;
  navigationStackTop?: string;
  navigationStackLeft?: string;
  
  className?: string;
  style?: React.CSSProperties;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VisualliCanvas(props: VisualliCanvasProps) {
  const { isDark = false, chromaticImmersion = false, onNodeClick, onLayerChange, renderOverlay, renderTooltipContent, navigationStackTop = '16px', navigationStackLeft = '16px', className = '', style } = props;

  const doc = useMemo(() => resolveDocument(props), [props.document, props.visualliString]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setNavStack([{ layerId: rootId, layer: rootLayer, label: 'Home' }]);
    parentViewports.current = [];
  }, [doc]);

  // ── Active layer → FlatNodes ──────────────────────────────────────────────
  const { flatNodes, connections, containers } = useMemo(() => {
    if (!doc || !currentLayerId) return { flatNodes: [] as FlatNode[], connections: [] as Connection[], containers: [] as ContainerGroup[] };
    try {
      return {
        flatNodes: getNodesForLayer(doc, currentLayerId),
        connections: getConnectionsForLayer(doc, currentLayerId),
        containers: getContainersForLayer(doc, currentLayerId) as ContainerGroup[],
      };
    } catch { return { flatNodes: [] as FlatNode[], connections: [] as Connection[], containers: [] as ContainerGroup[] }; }
  }, [doc, currentLayerId]);

  // ── Stores ────────────────────────────────────────────────────────────────
  const setNodes  = useNodeStore(s => s.setNodes);
  const nodes     = useNodeStore(s => s.nodes);
  const updateNodePosition = useNodeStore(s => s.updateNodePosition);
  const setCenter = useViewportStore(s => s.setCenter);
  const setZoom   = useViewportStore(s => s.setZoom);
  const viewport  = useViewportStore(s => ({
    centerX: s.centerX, centerY: s.centerY, zoomLevel: s.zoomLevel,
    canvasWidth: s.canvasWidth, canvasHeight: s.canvasHeight,
  }));
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

  // ── Background color (with chromatic immersion support) ──────────────────
  const baseBgColor = isDark ? '#141412' : '#F0EDE6';
  
  // For chromatic immersion: get the parent node color for child layers
  const chromaticBgColor = useMemo(() => {
    if (!chromaticImmersion || !doc || !currentLayerId) return baseBgColor;
    
    const currentLayer = doc.layers.get(currentLayerId);
    if (!currentLayer) return baseBgColor;
    
    // Root layer always uses base background
    if (currentLayer.level === 0 || !currentLayer.parentNodeId) return baseBgColor;
    
    // For child layers, find the parent node's color
    const parentLayer = currentLayer.parentLayerId ? doc.layers.get(currentLayer.parentLayerId) : null;
    if (parentLayer) {
      const parentNode = parentLayer.nodes.find(n => n.id === currentLayer.parentNodeId);
      if (parentNode) {
        const nodeColor = parentNode.data.color || baseBgColor;
        // Add transparency to the parent node color for subtle effect
        return hexToRgba(nodeColor, 0.15);
      }
    }
    
    return baseBgColor;
  }, [chromaticImmersion, doc, currentLayerId, baseBgColor]);
  
  const bgColor = chromaticImmersion ? chromaticBgColor : baseBgColor;

  // ── Spatial index (for stage-level hit detection) ─────────────────────────
  const spatialIndexRef = useRef<RBushSpatialIndex | null>(null);
  useEffect(() => {
    if (flatNodes.length === 0) { spatialIndexRef.current?.clear(); return; }
    const idx = new RBushSpatialIndex();
    idx.bulkLoad(flatNodes.map(n => {
      const blobHalfH = Math.max((NODE_HEIGHT * 1.6) / 2, (n.width / 2) * 0.74);
      return {
        nodeId: n.id,
        bounds: {
          minX: n.x - n.width / 2, minY: n.y - blobHalfH,
          maxX: n.x + n.width / 2, maxY: n.y + blobHalfH,
        },
      };
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
          const oldHalfH = Math.max((NODE_HEIGHT * 1.6) / 2, (node.width / 2) * 0.74);
          spatialIndexRef.current.remove(nodeId, {
            minX: oldPos.x - node.width / 2, minY: oldPos.y - oldHalfH,
            maxX: oldPos.x + node.width / 2, maxY: oldPos.y + oldHalfH,
          });
        }
        const newHalfH = Math.max((NODE_HEIGHT * 1.6) / 2, (node.width / 2) * 0.74);
        spatialIndexRef.current.insert(nodeId, {
          minX: x - node.width / 2, minY: y - newHalfH,
          maxX: x + node.width / 2, maxY: y + newHalfH,
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
      setNavStack(prev => [...prev, { layerId: childLayerId, layer: childLayer, label: layerLabel(doc, childLayer, childLayerId) }]);
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
      node.color ?? getThemeBackground(isDark, 'secondary'),
      node.color ?? getThemeBackground(isDark, 'primary'),
    );
  }, [doc, currentLayerId, nodes, isDark, isAnimating, zoomIntoLayer]);

  const handleNavigateBack = useCallback((targetIndex: number) => {
    if (targetIndex >= navStack.length - 1) return;
    if (isTransitioningRef.current || isAnimating()) return;
    const savedVp = parentViewports.current[targetIndex];
    if (!savedVp) return;
    navBackTargetRef.current = targetIndex;
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    zoomOutToParent(savedVp, getThemeBackground(isDark, 'primary'), getThemeBackground(isDark, 'secondary'));
  }, [navStack.length, isDark, isAnimating, zoomOutToParent]);

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

  // ── Stage event handlers ──────────────────────────────────────────────────
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) { rendererHandleMouseDown(e); return; }
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
        stageMouseDownPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
        stageDragCommittedRef.current = false;
        setPressedNodeId(nodeId);
        setHoveredNode(null);
        return;
      }
    }
    setHoveredNode(null);
    isCanvasPanningRef.current = true;
    rendererHandleMouseDown(e);
  }, [hitTestNode, toWorldCoords, nodes, select, rendererHandleMouseDown]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) { rendererHandleMouseMove(e); return; }
    const pointer = stage.getPointerPosition();
    if (!pointer) { rendererHandleMouseMove(e); return; }
    const { worldX, worldY } = toWorldCoords(stage, pointer);

    if (stageActiveNodeIdRef.current && stageMouseDownPosRef.current) {
      const moved = Math.hypot(e.evt.clientX - stageMouseDownPosRef.current.x, e.evt.clientY - stageMouseDownPosRef.current.y);
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
          if (childLayer) {
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
    isCanvasPanningRef.current = false;
    rendererHandleMouseUp(e);
  }, [toWorldCoords, handleDragEnd, nodes, handleNavigate, onNodeClick, rendererHandleMouseUp]);

  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (navStack.length <= 1) { setCanvasContextMenu(null); return; }
    setCanvasContextMenu({ x: e.evt.clientX, y: e.evt.clientY });
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
    if (!containerRef.current || isDraggingRef.current || isCanvasPanningRef.current) {
      setHoveredNode(null);
      return;
    }
    const now = Date.now();
    if (now - lastHoverCheckRef.current < 50) return;
    lastHoverCheckRef.current = now;

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
        if (!tooltipHoverRef.current) setHoveredNode(null);
      }, 150);
    } else {
      if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; }
    }
  }, [nodes, viewport, spatialIndexRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTooltipTimerRef.current) clearTimeout(clearTooltipTimerRef.current);
      spatialIndexRef.current?.clear();
      if (dragMoveRafRef.current !== null) cancelAnimationFrame(dragMoveRafRef.current);
    };
  }, []);

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const handleZoomIn  = useCallback(() => setZoom(Math.min(viewport.zoomLevel * 1.2, 5)), [viewport.zoomLevel, setZoom]);
  const handleZoomOut = useCallback(() => {
    // Non-root: allow zoom to ZOOM_MIN so the wheel-driven ZOOM_NAV_OUT_THRESHOLD
    // transition can still trigger via scroll; button just navigates zoom value.
    // Root: also ZOOM_MIN (no parent layer to navigate to, allow full zoom-out).
    setZoom(Math.max(viewport.zoomLevel / 1.2, ZOOM_MIN));
  }, [viewport.zoomLevel, setZoom]);

  // ── Extension rendering ───────────────────────────────────────────────────
  const { extensions: extensionRegistry } = useVisualli();

  // Render extensions from document.extensions Map
  const extensionComponents = useMemo(() => {
    if (!doc || !doc.extensions) return null;
    
    const components: React.ReactNode[] = [];
    
    doc.extensions.forEach((extension, id) => {
      const ExtComponent = extensionRegistry[id];
      if (ExtComponent) {
        components.push(
          <ExtComponent
            key={id}
            extension={extension}
            document={doc}
          />
        );
      }
    });
    
    return components.length > 0 ? components : null;
  }, [doc, extensionRegistry]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!doc) {
    return (
      <div className={className} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bgColor, ...style }}>
        <span style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', fontSize: 14 }}>No document</span>
      </div>
    );
  }

  const hasBackOption = navStack.length > 1;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        userSelect: 'none', 
        background: bgColor, 
        width: '100%', 
        height: '100%', 
        ...style 
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => setHoveredNode(null)}
    >
      {/* Konva canvas — opacity driven imperatively during transitions */}
      <div ref={canvasWrapperRef} style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
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
          <KonvaContainerLayer nodes={flatNodes} containers={containers} isDark={isDark} />
          <KonvaEdgeLayer 
            nodes={flatNodes} 
            connections={connections} 
            isDark={isDark} 
            isDragging={isDraggingState} 
          />
          <KonvaNodeLayer
            isTransitioning={isTransitioning}
            isDragging={isDraggingState}
            hoveredNodeId={pointerNodeId}
            pressedNodeId={pressedNodeId}
          />
        </KonvaStage>
      </div>

      {/* Context menu (right-click to go back) */}
      {canvasContextMenu && hasBackOption && (
        <div
          role="menu"
          aria-label="Canvas options"
          style={{
            position: 'fixed',
            zIndex: 60,
            pointerEvents: 'auto',
            left: `${Math.min(canvasContextMenu.x, Math.max(8, (canvasSizeRef.current.width  || 800)  - 152))}px`,
            top: `${Math.min(canvasContextMenu.y, Math.max(8, (canvasSizeRef.current.height || 600) - 72))}px`,
          }}
          onContextMenu={e => e.preventDefault()}
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            type="button"
            style={{
              padding: '6px 16px',
              borderRadius: '10px',
              border: `1px solid ${isDark ? '#333330' : '#DDD9D0'}`,
              background: isDark ? '#1C1C1A' : '#FAF8F4',
              color: isDark ? '#F0EDE6' : '#1A1A18',
              cursor: 'pointer',
              fontSize: 13,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            onClick={() => { setCanvasContextMenu(null); handleNavigateBack(navStack.length - 2); }}
          >
            Back
          </button>
        </div>
      )}

      {/* Navigation stack (left, matches reference) */}
      <NavigationStack stack={navStack} onNavigateBack={handleNavigateBack} isDark={isDark} top={navigationStackTop} left={navigationStackLeft} />

      {/* Zoom controls (top-right) */}
      <div data-help="zoom-controls" style={{ position: 'absolute', top: '24px', right: '16px', zIndex: 50, pointerEvents: 'auto' }}>
        <ZoomControls isDark={isDark} />
      </div>

      {/* Custom overlay from consuming app (for private features like help button, chromatic bg, etc.) */}
      {renderOverlay?.({ isDark, containerWidth: canvasSizeRef.current.width || 0, containerHeight: canvasSizeRef.current.height || 0 })}

      {/* Node description tooltip (sketchy-box, above node) - rendered before extensions so extensions appear on top */}
      {hoveredNode && hoveredNodePosition && viewport.zoomLevel < 3 && viewport.zoomLevel >= TEXT_LABEL_HIDE_BELOW_ZOOM && (() => {
        const nodeData = nodes.get(hoveredNode.nodeId);
        const borderColor = nodeData?.color ? darkenHexColor(nodeData.color, 0.13) : '#5BA8D4';
        const VP_PAD = 8;
        const HALF_W = 160;
        const APPROX_H = 90;
        const containerW = canvasSizeRef.current.width || 800;
        const safeLeft = Math.max(HALF_W + VP_PAD, Math.min(hoveredNodePosition.screenX, containerW - HALF_W - VP_PAD));
        const rawTop   = hoveredNodePosition.screenY - 60 * hoveredNodePosition.zoom;
        const safeTop  = Math.max(VP_PAD + APPROX_H, rawTop);
        return (
          <div
            style={{
              position: 'fixed',
              zIndex: 50,
              left: safeLeft,
              top: safeTop,
              transform: 'translate(-50%, -100%)',
              transformOrigin: 'bottom center',
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => { tooltipHoverRef.current = true; if (clearTooltipTimerRef.current) { clearTimeout(clearTooltipTimerRef.current); clearTooltipTimerRef.current = null; } }}
            onMouseLeave={() => { tooltipHoverRef.current = false; setHoveredNode(null); }}
          >
            <div style={{ maxWidth: '20rem', minWidth: '12rem', maxHeight: '15rem', overflowY: 'auto' }}>
              <SketchyBoxKonva fill="#ffffff" stroke={borderColor} backStroke={borderColor} padding="1rem 1.25rem">
                <p style={{
                  fontFamily: "'Playpen Sans', cursive",
                  fontSize: `${DESCRIPTION_TEXT_BASE_FONT_PX}px`,
                  fontWeight: 300,
                  color: '#000000',
                  textAlign: 'center',
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {renderTooltipContent ? renderTooltipContent({ 
                    summary: hoveredNode.summary, 
                    nodeId: hoveredNode.nodeId,
                    nodeColor: nodeData?.color,
                    onAnchorHover: (word, description, knowMoreUrl, event) => {
                      // Dispatch event for semantic anchor hover
                      const rect = event.currentTarget.getBoundingClientRect();
                      const wordCenterX = rect.left + rect.width / 2;
                      const wordBottomY = rect.bottom;
                      window.dispatchEvent(new CustomEvent('semanticAnchorHover', {
                        detail: { 
                          anchor: { word, description, knowMoreUrl },
                          screenX: wordCenterX,
                          screenY: wordBottomY,
                          zoom: viewport.zoomLevel,
                          nodeColor: nodeData?.color
                        }
                      }));
                    },
                    onAnchorLeave: () => {
                      // Dispatch event to clear semantic anchor
                      window.dispatchEvent(new CustomEvent('semanticAnchorHover', {
                        detail: { anchor: null }
                      }));
                    }
                  }) : hoveredNode.summary}
                </p>
              </SketchyBoxKonva>
            </div>
          </div>
        );
      })()}

      {/* Extension components as overlays - rendered after description tooltip so extensions appear on top */}
      {extensionComponents && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 60 }}>
          {extensionComponents}
        </div>
      )}
    </div>
  );
}
