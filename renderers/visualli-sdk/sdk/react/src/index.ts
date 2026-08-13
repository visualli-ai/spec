// ─── @visualli/react ─────────────────────────────────────────────────────────

// ── Primary component (recommended for public use) ────────────────────────────────────────
export { default as VisualliRenderer } from './VisualliRenderer';
export type { VisualliRendererProps, VisualliTheme } from './VisualliRenderer';

// ── Canvas component (for advanced integrations) ───────────────────────────────────────────
export { default as VisualliCanvas } from './VisualliCanvas';
export type { VisualliCanvasProps } from './VisualliCanvas';

// ── Context and Provider ──────────────────────────────────────────────────────
export { VisualliProvider, useVisualli } from './context/VisualliContext';
export type { 
  VisualliProviderProps, 
  VisualliContextValue
} from './context/VisualliContext';

// Stores
export { useNodeStore }           from './stores/useNodeStore';
export { useViewportStore }       from './stores/useViewportStore';
export { useSelectionStore, useRenderConfigStore } from './stores/stores';
export type { INodeStore }        from './stores/useNodeStore';
export type { IViewportStore }    from './stores/useViewportStore';

// Hooks
export { useKonvaRenderer }         from './hooks/useKonvaRenderer';
export { useKonvaLayerTransition }  from './hooks/useKonvaLayerTransition';
export { useViewportNodes }         from './hooks/useViewportNodes';
export type { UseKonvaRendererOptions, UseKonvaRendererReturn } from './hooks/useKonvaRenderer';
export type { LayerTransitionHandlers } from './hooks/useKonvaLayerTransition';

// Animations
export { KonvaLayerTransitionAnimator, konvaLayerTransitionAnimator } from './animations/konvaLayerTransition';
export type { AnimatorViewport, TransitionCallbacks } from './animations/konvaLayerTransition';

// Config helpers
export {
  ALL_BLOB_SHAPES,
  ACTIVE_BLOB_TYPES,
  BLOB_LAYER_CONFIG,
  NODE_LAYER_CONFIG,
  getBlobTypeForLayer,
  BLOB_TEXT_OFFSETS,
  drawBlobPath,
  buildBlobPathData,
  NODE_TEXT_BASE_FONT_PX,
  DESCRIPTION_TEXT_BASE_FONT_PX,
  computeNodeTextWorldScale,
  computeNodeTextScreenScale,
  computeOverlayScale,
  computeEdgeLabelScale,
} from './config';

// Utils
export {
  getConnectionsForLayer,
  getChildLayerForNode,
  getLayerForNavigation,
  calculateFitZoom,
  calculateFitCenter,
  calculateFitView,
} from './utils/layerNavigation';
export type { FitResult } from './utils/layerNavigation';

// Sub-components (for advanced usage / composition)
export { default as KonvaStage }          from './components/KonvaStage';
export { default as KonvaNode }           from './components/KonvaNode';
export { default as KonvaEdge }           from './components/KonvaEdge';
export { default as KonvaNodeLayer }      from './components/KonvaNodeLayer';
export { default as KonvaEdgeLayer }      from './components/KonvaEdgeLayer';
export { default as KonvaContainer }      from './components/KonvaContainer';
export { default as KonvaContainerLayer } from './components/KonvaContainerLayer';
export { default as NavigationStack }     from './components/NavigationStack';
export { default as ZoomControls }        from './components/ZoomControls';
export { default as SketchyBoxKonva }     from './components/SketchyBoxKonva';
export type { NavStackEntry }             from './components/NavigationStack';
export type { KonvaNodeProps }            from './components/KonvaNode';
export type { KonvaEdgeProps }            from './components/KonvaEdge';
export type { KonvaStageProps }           from './components/KonvaStage';
export type { ContainerGroup }            from './components/KonvaContainerLayer';

