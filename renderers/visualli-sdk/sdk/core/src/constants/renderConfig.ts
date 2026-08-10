// ─── Render Configuration ─────────────────────────────────────────────────────

import type { RenderConfig } from '../types/mindmap.js';
import {
  FPS_TARGET,
  MEMORY_TARGET_MB,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_LOW,
  NODE_COUNT_THRESHOLDS,
} from './performanceConstants.js';

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  renderMode:    'canvas',
  qualityLevel:  'high',
  cullingEnabled: false,
  fpsTarget:     FPS_TARGET,
  memoryLimit:   MEMORY_TARGET_MB,
};

export const SIMPLIFIED_RENDER_CONFIG: RenderConfig = {
  renderMode:    'simplified',
  qualityLevel:  'low',
  cullingEnabled: true,
  fpsTarget:     30,
  memoryLimit:   400,
};

// ── Quality Map ───────────────────────────────────────────────────────────────

export const QUALITY_SETTINGS = {
  high:   QUALITY_HIGH,
  medium: QUALITY_MEDIUM,
  low:    QUALITY_LOW,
} as const;

// ── Feature Flags ─────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  viewportCulling:        true,
  spatialIndexing:        true,
  shadows:                true,
  bezierCurves:           true,
  animations:             true,
  branchBadges:           true,
  autoQualityAdjustment:  true,
  performanceMonitoring:  true,
  performanceToasts:      true,
  debugOverlay:           false,
  showFPS:                false,
  showMemory:             false,
  showVisibleCount:       false,
} as const;

// ── Render Modes ──────────────────────────────────────────────────────────────

export type RenderMode     = RenderConfig['renderMode'];
export type QualityLevel   = RenderConfig['qualityLevel'];

export const RENDER_MODES = {
  canvas: {
    name:        'Canvas',
    description: 'Full Konva canvas rendering with all features',
    features:    { culling: true, shadows: true, bezierCurves: true, animations: true },
  },
  simplified: {
    name:        'Simplified',
    description: 'Reduced feature set for low-end devices',
    features:    { culling: true, shadows: false, bezierCurves: false, animations: false },
  },
} as const;

export const QUALITY_LEVELS = {
  high:   { name: 'High',   description: 'All visual features enabled',              targetFPS: 60, features: QUALITY_HIGH   },
  medium: { name: 'Medium', description: 'Shadows disabled, other features enabled', targetFPS: 60, features: QUALITY_MEDIUM },
  low:    { name: 'Low',    description: 'Minimal visual features, max performance', targetFPS: 30, features: QUALITY_LOW    },
} as const;

// ── Auto-Adjustment Helpers ───────────────────────────────────────────────────

export function getOptimalQualityLevel(
  currentFPS: number,
  currentQuality: QualityLevel,
): QualityLevel {
  if (currentFPS < 45 && currentQuality === 'high')   return 'medium';
  if (currentFPS < 30 && currentQuality === 'medium') return 'low';
  if (currentFPS > 58 && currentQuality === 'low')    return 'medium';
  if (currentFPS > 58 && currentQuality === 'medium') return 'high';
  return currentQuality;
}

export function getRenderConfigForQuality(quality: QualityLevel): Partial<RenderConfig> {
  return { qualityLevel: quality, fpsTarget: QUALITY_LEVELS[quality].targetFPS };
}

export function isFeatureEnabled(
  featureName: keyof typeof FEATURE_FLAGS,
  config: RenderConfig,
): boolean {
  if (!FEATURE_FLAGS[featureName]) return false;

  const qs = QUALITY_SETTINGS[config.qualityLevel];
  switch (featureName) {
    case 'shadows':      return qs.shadows;
    case 'bezierCurves': return qs.bezierCurves;
    case 'animations':   return qs.animations;
    default:             return FEATURE_FLAGS[featureName] as boolean;
  }
}

// ── Device Detection ──────────────────────────────────────────────────────────

/**
 * Recommend a render config based on detected device memory (browser only).
 * Falls back to SIMPLIFIED_RENDER_CONFIG when the Performance Memory API is
 * unavailable or memory is constrained.
 */
export function getRecommendedRenderConfig(): RenderConfig {
  if (typeof performance === 'undefined' || !(performance as unknown as Record<string, unknown>)['memory']) {
    return SIMPLIFIED_RENDER_CONFIG;
  }

  const memory = (performance as unknown as Record<string, unknown>)['memory'] as Record<string, number>;
  if (memory?.['jsHeapSizeLimit'] && memory['jsHeapSizeLimit'] < 512 * 1024 * 1024) {
    return SIMPLIFIED_RENDER_CONFIG;
  }

  return DEFAULT_RENDER_CONFIG;
}

/** Re-export so consumers need only one import. */
export { NODE_COUNT_THRESHOLDS };
