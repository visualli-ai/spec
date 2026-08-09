// ─── Animation Constants ──────────────────────────────────────────────────────

// ── Timing (ms) ───────────────────────────────────────────────────────────────

export const ANIMATION_DURATION = {
  ZOOM_IN_LAYER:    500,
  ZOOM_OUT_LAYER:   500,
  ZOOM_GESTURE:     500,
  FADE_OUT:         200,
  FADE_IN:          250,
  COLOR_TRANSITION: 500,
  CURSOR_CHANGE:    150,
  LOADING_FADE:     200,
} as const;

export const ANIMATION_PHASES = {
  ZOOM_IN: {
    ZOOM_TO_TARGET:  500,
    FADE_OUT_START:  120,
    FADE_OUT:        280,
    CONTENT_SWAP:    310,
    FADE_IN:         200,
    TOTAL:           510,
  },
  ZOOM_OUT: {
    FADE_OUT:  200,
    ZOOM_BACK: 50,
    FADE_IN:   250,
    TOTAL:     500,
  },
} as const;

// ── Zoom Thresholds ───────────────────────────────────────────────────────────

export const ZOOM_THRESHOLDS = {
  ENTER_LAYER:      5.0,
  EXIT_LAYER:       0.5,
  GESTURE_TRIGGER:  0.8,
} as const;

// ── Cooldowns (ms) ────────────────────────────────────────────────────────────

export const COOLDOWN = {
  NAVIGATION:    1000,
  ZOOM_GESTURE:  800,
  DOUBLE_CLICK:  200,
} as const;

// ── Opacity ───────────────────────────────────────────────────────────────────

export const OPACITY = {
  VISIBLE:       1.0,
  HIDDEN:        0.0,
  TRANSITIONING: 0.3,
} as const;

// ── Target Zoom Levels ────────────────────────────────────────────────────────

export const TARGET_ZOOM = {
  NORMAL:     1.0,
  FOCUSED:    0.8,
  FILL_NODE:  3.0,
  DETAIL:     2.0,
} as const;

// ── Viewport Framing ──────────────────────────────────────────────────────────

export const VIEWPORT_FRAMING = {
  NODE_FILL_RATIO:  0.7,
  EXIT_NODE_SIZE:   0.4,
  PADDING_RATIO:    0.1,
} as const;
