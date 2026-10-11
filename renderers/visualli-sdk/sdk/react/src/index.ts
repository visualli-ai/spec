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
export { useLayerChoreography }     from './hooks/useLayerChoreography';
export type { LayerChoreography, LayerChoreographyOptions } from './hooks/useLayerChoreography';
export { useViewportNodes }         from './hooks/useViewportNodes';
export type { UseKonvaRendererOptions, UseKonvaRendererReturn } from './hooks/useKonvaRenderer';

export type { AnimatorViewport } from './hooks/useLayerChoreography';

// Design system: themes, comfort, tokens, geometry (generated from design-system/ in @visualli/core)
export {
  THEME_NAMES, TOPICS, DESIGN_SYSTEM_VERSION, TOKENS, METRICS,
  resolveTheme, resolveComfort, ideaColor, ideaStyle, topicStyle, getTokens,
  BLOB_SHAPES, RINGS, blobPath, blobRadius, edgePath, arrowPath, shapeForLevel,
  IDEA, LABEL_GROWTH, ideaSize, labelGrowth,
} from '@visualli/core';
export type { ThemeName, ThemeInput, TopicName, Comfort } from '@visualli/core';
export { useDesign, useReaderEnv } from './design/useDesign';
export { makeDesign, resolveDesign, DEFAULT_DESIGN } from './design/design';
export type { Design, DesignProps } from './design/design';
export { ensureDesignSystemStyles, loadCanvasFonts } from './design/runtime';
export type { DesignSystemAssets } from './design/runtime';

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
export { default as KonvaContainerLabelLayer } from './components/KonvaContainerLabelLayer';
export { default as NavigationStack }     from './components/NavigationStack';
export { default as ZoomControls }        from './components/ZoomControls';
export { PeekCard, TermCard, DepthTrail, splitTerms, paintVars } from './components/Overlays';
export { A11yLayer } from './components/A11yLayer';
export type { NavStackEntry }             from './components/NavigationStack';
export type { PeekCardProps, TrailEntry, DepthTrailProps, IdeaPaint } from './components/Overlays';
export { ideaMeasure } from './design/measure';
export type { KonvaNodeProps }            from './components/KonvaNode';
export type { KonvaEdgeProps }            from './components/KonvaEdge';
export type { KonvaStageProps }           from './components/KonvaStage';
export type { ContainerGroup }            from './components/KonvaContainerLayer';
export { layoutContainers, measurePill, drawHull, drawPill } from './design/containers';
export type { PlacedContainer, PlacedPill } from './design/containers';

