// ─── Layout constants ────────────────────────────────────────────────────────
//
// Non-visual layout metrics (world units). Everything visual (colours, fonts,
// radii, spacing, motion) comes from the design system: see ../theme.

export const LAYOUT_SPACING = {
  nodeSpacing:      200,
  levelSpacing:     150,
  containerPadding: 20,
  gridSize:         50,
} as const;
