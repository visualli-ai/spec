import { createStore } from 'zustand/vanilla';
import type { NodeSelection, RenderConfig } from '../types/index.js';
import {
  DEFAULT_RENDER_CONFIG,
  getOptimalQualityLevel,
  getRenderConfigForQuality,
  isFeatureEnabled,
  FEATURE_FLAGS,
} from '../constants/renderConfig.js';

// ─── Selection Store ──────────────────────────────────────────────────────────

export interface ISelectionStore extends NodeSelection {
  select: (nodeId: string) => void;
  clear:  () => void;
  toggle: (nodeId: string) => void;
  isSelected: (nodeId: string) => boolean;
}

export const selectionStore = createStore<ISelectionStore>((set, get) => ({
  selectedId: null,
  select: (nodeId) => set({ selectedId: nodeId }),
  clear: () => set({ selectedId: null }),
  toggle: (nodeId) => set((s) => ({ selectedId: s.selectedId === nodeId ? null : nodeId })),
  isSelected: (nodeId) => get().selectedId === nodeId,
}));

// ─── Render Config Store ──────────────────────────────────────────────────────

export interface IRenderConfigStore extends RenderConfig {
  setQualityLevel:        (level: RenderConfig['qualityLevel']) => void;
  setRenderMode:          (mode: RenderConfig['renderMode']) => void;
  setCullingEnabled:      (enabled: boolean) => void;
  autoAdjustQuality:      (currentFPS: number) => void;
  autoAdjustQualityByMemory: (memoryMB: number) => void;
  resetToDefaults:        () => void;
  isFeatureEnabled:       (feature: keyof typeof FEATURE_FLAGS) => boolean;
}

export const renderConfigStore = createStore<IRenderConfigStore>((set, get) => ({
  ...DEFAULT_RENDER_CONFIG,

  setQualityLevel: (level) => set(getRenderConfigForQuality(level)),
  setRenderMode:   (mode)  => set({ renderMode: mode }),
  setCullingEnabled: (enabled) => set({ cullingEnabled: enabled }),

  autoAdjustQuality: (fps) =>
    set((s) => {
      const q = getOptimalQualityLevel(fps, s.qualityLevel);
      return q !== s.qualityLevel ? getRenderConfigForQuality(q) : s;
    }),

  autoAdjustQualityByMemory: (mb) =>
    set((s) => {
      const q = mb > 500 ? 'low' : mb > 400 && s.qualityLevel === 'high' ? 'medium' : s.qualityLevel;
      return q !== s.qualityLevel ? getRenderConfigForQuality(q as RenderConfig['qualityLevel']) : s;
    }),

  resetToDefaults: () => set({ ...DEFAULT_RENDER_CONFIG }),
  isFeatureEnabled: (feature) => isFeatureEnabled(feature, get()),
}));
