# Changelog

## 0.2.0 — Visualli design system rendering

`@visualli/core` and `@visualli/react` 0.2.0 render a `.visualli` map exactly like the Visualli design system.
**Conforms to design system 0.1.0** (`design-system/manifest.json`; the version is exported as `DESIGN_SYSTEM_VERSION`).

### Added
- All 8 design-system themes (`light`, `dark`, `focus-*`, `colorsafe-*`, `contrast-*`) via the `theme` prop; family names (`focus`, `colorsafe`, `contrast`) and `'auto'` follow the reader. Forced-colors switches to the high-contrast theme (`respectForcedColors`).
- Comfort settings: `comfort={{ readableType, largerText, reducedMotion }}` (`reducedMotion: 'system'` follows the OS).
- Ideas are drawn with their topic's fill and ring colour, 3px stroke and the design system's rings (1.1 / 1.2 / 1.3); connectors use the design system's cubic curve, open arrowhead and `edge-gap`, with endpoints outside the real outline.
- Kalam (ideas), Caveat (connector labels) and Atkinson Hyperlegible Next (UI); the first draw waits for `document.fonts`.
- Peek, term definitions (the `semantic-anchors` extension), depth trail and canvas controls as DOM styled with the design system's CSS.
- Accessible DOM mirror of the visible ideas (Tab, Enter / Space), `Esc` to step out, `+` / `-` / `0` to zoom and fit.
- `@visualli/core`: `theme`, `rendering/nodeGeometry` and the design system's geometry (`blobPath`, `blobRadius`, `RINGS`, `edgePath`, `arrowPath`, `shapeForLevel`), `getSemanticAnchors`, `FlatNode.topic`, `MindMapConnection.style`.
- `design-system/LICENSE` and `NOTICE.md` ship inside both packages; `@visualli/react` also ships `fonts/Caveat-Variable.ttf`.
- `npm run bench` / `scripts/bench.mjs`, `scripts/screenshots.mjs`, `scripts/smoke.mjs`; CI checks that generated files are current and that no colour, font or blob literal exists outside `src/generated/`.

### Changed
- Colours, fonts, radii, motion and geometry are generated from `design-system/` at build time (`scripts/gen-design-system.mjs`); a token-only design-system change re-renders after `npm run build` with no code edits.
- Culling uses the idea's centred visual bounds (ideas were culled as if `x, y` were a top-left corner); the node layer culls from the live stage transform, so panning never shows blank areas.
- Ideas, connectors and group frames are painted by one Konva shape per layer with cached `Path2D` outlines.
- The canvas follows `devicePixelRatio` (including changes while running). The old `pixelRatio={1}` prop had no effect on Konva's stage and is removed.
- Document colours map to the nearest of the design system's eight topics.
- Group frames use the design system's dashed frame with the label on its top-left corner.

### Deprecated
- `isDark` (use `theme`); `'light' | 'dark' | 'auto'` remain valid `theme` values for this release.

### Removed
- `SketchyBoxKonva`; `DS_COLORS`, `DS_TYPOGRAPHY`, `DS_RADII`, `BRAND_COLORS`, `LEVEL_COLORS`, `SEMANTIC_COLORS`, `THEME_COLORS`, `CANVAS_COLORS`, `FONTS`, `FONT_SIZES`, `SPACING`, `getThemeBackground/Text/Border`, `darkenHexColor`, `getColorForLevel`, `COLOR_*` and `BORDER_WIDTH_*` / `CORNER_RADIUS` constants; `ALL_BLOB_SHAPES`, `ACTIVE_BLOB_TYPES`, `BLOB_LAYER_CONFIG`, `NODE_LAYER_CONFIG`, `BLOB_TEXT_OFFSETS`, `getBlobTypeForLayer`, `drawBlobPath`, `buildBlobPathData` (use the design system's `blobPath`, `RINGS`, `shapeForLevel`).
- Story Script, Playpen Sans, Nunito and Inter are no longer loaded by the SDK.

## 0.1.7
- `onNodeHover` on `VisualliCanvas`, exports for shapes and their functions.
