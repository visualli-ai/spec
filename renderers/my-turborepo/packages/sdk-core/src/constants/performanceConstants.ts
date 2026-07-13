// ─── Performance & Rendering Constants ───────────────────────────────────────

// ── FPS ───────────────────────────────────────────────────────────────────────

export const FPS_TARGET                 = 60;
export const FPS_WARNING_THRESHOLD      = 45;
export const FPS_CRITICAL_THRESHOLD     = 30;
export const TARGET_FRAME_TIME          = 1000 / FPS_TARGET; // ~16.67 ms
export const MAX_FRAME_TIME             = 18;                 // p95 threshold

/** Legacy frame-rate targets kept for backward compatibility. */
export const FPS_TARGETS = {
  PAN_MIN:           30,
  ZOOM_TARGET:       60,
  WARNING_THRESHOLD: 20,
} as const;

// ── Timing Thresholds (ms) ────────────────────────────────────────────────────

export const TIMING_THRESHOLDS = {
  VIEWPORT_QUERY_MAX:    5,
  SPATIAL_UPDATE_MAX:    10,
  DRAG_RESPONSE_MAX:     16,
  LOAD_5K_TARGET:        2000,
  LOAD_10K_TARGET:       3000,
  VIEWPORT_DEBOUNCE:     100,
  SPATIAL_INDEX_BUILD:   50,
} as const;

// ── Memory Limits (MB) ────────────────────────────────────────────────────────

export const MEMORY_TARGET_MB   = 500;
export const MEMORY_WARNING_MB  = 600;
export const MEMORY_CRITICAL_MB = 800;

export const MEMORY_LIMITS = {
  MAX_10K_NODES:       500,
  MAX_GROWTH_PERCENT:  20,
  WARNING_THRESHOLD:   400,
} as const;

// ── Viewport Culling ──────────────────────────────────────────────────────────

export const VIEWPORT_MARGIN          = 0.1;
export const MAX_VISIBLE_NODES        = 800;
export const CULLING_QUERY_TIME_BUDGET = 5;

// ── Spatial Index ─────────────────────────────────────────────────────────────

export const RBUSH_MAX_ENTRIES        = 16;
export const SPATIAL_INDEX_BUILD_BUDGET = 50;

// ── Node Dimensions ───────────────────────────────────────────────────────────

export const NODE_MIN_WIDTH    = 200;
export const NODE_HEIGHT       = 80;
export const NODE_PADDING      = 40;
export const CHAR_WIDTH        = 8;
export const TITLE_MAX_LENGTH  = 150;

// ── Visual Styling ────────────────────────────────────────────────────────────

export const CORNER_RADIUS         = 8;
export const BORDER_WIDTH_NORMAL   = 2;
export const BORDER_WIDTH_SELECTED = 3;

export const COLOR_SELECTED      = '#1B2D4F';
export const COLOR_BORDER_LIGHT  = '#4A3728';
export const COLOR_BORDER_DARK   = '#FAF6F1';
export const COLOR_DEFAULT_NODE  = '#FAF6F1';

// ── Zoom Constraints ──────────────────────────────────────────────────────────

export const ZOOM_MIN              = 0.05;
export const ZOOM_MAX              = 5.0;
export const ZOOM_DEFAULT          = 1.0;
export const ZOOM_STEP             = 0.1;
export const ZOOM_WHEEL_SENSITIVITY = 0.001;

export const ZOOM_NAV_IN_THRESHOLD  = 2.7;
export const ZOOM_NAV_OUT_THRESHOLD = 0.4;
export const TEXT_LABEL_HIDE_BELOW_ZOOM = 0.3;

// ── Quality Level Presets ─────────────────────────────────────────────────────

export const QUALITY_HIGH = {
  shadows:      true,
  bezierCurves: true,
  animations:   true,
  textQuality:  'high'   as const,
  antialiasing: true,
};

export const QUALITY_MEDIUM = {
  shadows:      false,
  bezierCurves: true,
  animations:   true,
  textQuality:  'medium' as const,
  antialiasing: true,
};

export const QUALITY_LOW = {
  shadows:      false,
  bezierCurves: false,
  animations:   false,
  textQuality:  'low'    as const,
  antialiasing: false,
};

// ── Performance Monitoring ────────────────────────────────────────────────────

export const FPS_SAMPLE_WINDOW          = 60;
export const FPS_UPDATE_INTERVAL        = 1000;
export const MEMORY_CHECK_INTERVAL      = 5000;
export const PERFORMANCE_TOAST_COOLDOWN = 10000;

// ── Auto-Adjustment ───────────────────────────────────────────────────────────

export const FPS_DOWNGRADE_THRESHOLD    = 45;
export const FPS_UPGRADE_THRESHOLD      = 58;
export const FPS_STABILIZATION_FRAMES   = 180;

// ── Canvas Dimensions ─────────────────────────────────────────────────────────

export const DEFAULT_CANVAS_WIDTH  = 1920;
export const DEFAULT_CANVAS_HEIGHT = 1080;

// ── Interaction ───────────────────────────────────────────────────────────────

export const CLICK_THRESHOLD      = 5;
export const DOUBLE_CLICK_DELAY   = 300;
export const DRAG_START_DISTANCE  = 10;

// ── Data Validation ───────────────────────────────────────────────────────────

export const MAX_NODES                    = 20000;
export const CIRCULAR_REFERENCE_MAX_DEPTH = 1000;

// ── Debounce / Throttle ───────────────────────────────────────────────────────

export const RESIZE_DEBOUNCE  = 300;
export const SCROLL_THROTTLE  = 16;
export const SEARCH_DEBOUNCE  = 500;

/** Node count thresholds that gate optimisation strategies. */
export const NODE_COUNT_THRESHOLDS = {
  SPATIAL_INDEX_MIN:    100,
  VIEWPORT_CULLING_MIN: 500,
  CANVAS_RENDERING_MIN: 2000,
  DOM_RENDERING_MAX:    5000,
} as const;

/** Viewport buffer configuration. */
export const VIEWPORT_CONFIG = {
  BUFFER_PERCENT:   0.2,
  MIN_VISIBLE_NODES: 10,
} as const;
