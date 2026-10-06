# Changelog

## 0.2.0 — Visualli design system rendering

`@visualli/core` and `@visualli/react` 0.2.0 render a `.visualli` map exactly like the Visualli design system.
**Conforms to design system 0.1.1** (`design-system/manifest.json`; the version is exported as `DESIGN_SYSTEM_VERSION`).

### Added
- All 8 design-system themes (`light`, `dark`, `focus-*`, `colorsafe-*`, `contrast-*`) via the `theme` prop; family names (`focus`, `colorsafe`, `contrast`) and `'auto'` follow the reader. Forced-colors switches to the high-contrast theme (`respectForcedColors`).
- Comfort settings: `comfort={{ readableType, largerText, reducedMotion }}` (`reducedMotion: 'system'` follows the OS).
- Ideas are drawn with their topic's fill and ring colour, 3px stroke and the design system's rings (1.1 / 1.2 / 1.3); connectors use the design system's cubic curve, open arrowhead and `edge-gap`, with endpoints outside the real outline.
- Kalam (ideas), Caveat (connector labels) and Atkinson Hyperlegible Next (UI); the first draw waits for `document.fonts`.
- `controlsPosition` (`'top-right'` default, SDK placement as before 0.2; `'bottom-right'` = the design system's `.vi-map__ctrls` placement).
- Peek, term definitions (the `semantic-anchors` extension), depth trail and canvas controls as DOM styled with the design system's CSS.
- Accessible DOM mirror of the visible ideas (Tab, Enter / Space), `Esc` to step out, `+` / `-` / `0` to zoom and fit.
- `@visualli/core`: `theme`, `rendering/nodeGeometry` and the design system's geometry (`blobPath`, `blobRadius`, `RINGS`, `edgePath`, `arrowPath`, `shapeForLevel`), `getSemanticAnchors`, `FlatNode.topic`, `MindMapConnection.style`.
- `design-system/LICENSE` and `NOTICE.md` ship inside both packages; `@visualli/react` also ships `fonts/Caveat-Variable.ttf`.
- `npm run bench` / `scripts/bench.mjs`, `scripts/screenshots.mjs`, `scripts/smoke.mjs`; CI checks that generated files are current and that no colour, font or blob literal exists outside `src/generated/`.

- Choreography from the design system's `geometry/motion.ts` (copied verbatim into `@visualli/core`: `MOTION`, `EASE`, `revealDelay`, `connectorDelay`, `revealTotal`, `bloomOffset`, `swapDelay`, `cssEase`, `easeBezier`, `motionVars`), run on the canvas:
  - a layer arrives with ideas blooming in one by one in sibling order (scale from .55, starting half-way toward the layer's centre, ease-bloom), then connectors drawing from source to target (dashed ones fade in), while the layer settles from scale .94;
  - Step inside zooms the current layer toward the idea (scale 3.2, ease-zoom 500 ms) and fades it; Back out shrinks it toward the centre (scale .6, 220 ms); the layers swap at the design system's swap times (320 / 220 ms);
  - ideas lift (ease-bloom) and their rings turn and grow (ease-standard) over `duration-base` on hover, press and select, instead of snapping;
  - reduced motion: no zoom, the layers swap at once and the new one fades in together (120 ms). New `reveal="instant"` prop gives the same arrival without turning motion off. The map root carries `data-reveal` and `data-vi-reveal="running" | "idle"`.
  - For performance, layers of more than 30 ideas compress the stagger (ideas and connectors share slots), and layers of more than 150 ideas fade in together; hover lifts snap on layers of more than 150 ideas.
- `@visualli/core`: the design system's `geometry/container.ts`, copied verbatim (`HULL`, `containerHull`, `labelCandidates`, `placeContainerLabel`, `connectorSamples`; types `Hull`, `LabelBox`, `LabelPlacement`, `LabelSide`), with conformance tests against `design-system/`. `@visualli/react`: `KonvaContainerLabelLayer` (container names above ideas), `layoutContainers`, `measurePill`, `drawHull`, `drawPill`; `KonvaContainerLayer` takes the layer's `connections` so names avoid them. The generator reads the pill's size, box, colours and contrast border from `.vi-map__group-label` in `css/spec.css` (the label size now comes from its `font-size`, 26px, not the 22px `font` shorthand it overrides).
- `scripts/smoke-motion.mjs` (`npm run smoke:motion`) checks the choreography in a real browser against the numbers in `design-system/geometry/motion.ts`.

### Fixed
- Touch: tapping an idea no longer shows the peek for a moment and closes it. Touch events were treated as non-primary presses (they carry no `button`), so a tap only reached the idea through the browser's compatibility mouse events, which also cleared the peek. Touch is now handled directly, compatibility mouse events after a tap are ignored, and the peek is pinned until dismissed.

### Added (responsive)
- Touch layout (`layout="auto" | "touch" | "pointer"`): the peek is the design system's bottom sheet (`.vi-fact--sheet`) with grip (tap or swipe to expand / collapse / close), close button, Step inside and an in-sheet term definition with Back. It stays open until dismissed (close, swipe down, tap on empty canvas, Esc, layer change) and the map scrolls so the tapped idea stays above it. Tapping the idea whose sheet is open steps inside (like the sheet's Step inside button).
- Container-width classes on the map root: `is-touch`, `is-compact` (< 560px), `is-medium` (< 900px). Compact collapses the depth trail to first / previous / current and caps label width; touch uses larger controls and lifts them above the sheet. Pointer devices keep the floating peek on hover. The layout follows input and size live (resize, rotate, switching between touch and mouse).

### Changed
- Colours, fonts, radii, motion and geometry are generated from `design-system/` at build time (`scripts/gen-design-system.mjs`); a token-only design-system change re-renders after `npm run build` with no code edits.
- Culling uses the idea's centred visual bounds (ideas were culled as if `x, y` were a top-left corner); the node layer culls from the live stage transform, so panning never shows blank areas.
- Ideas, connectors and container hulls are painted by one Konva shape per layer with cached `Path2D` outlines.
- The canvas follows `devicePixelRatio` (including changes while running). The old `pixelRatio={1}` prop had no effect on Konva's stage and is removed.
- Idea colours follow the design system's colour rule (`geometry/color.ts` → `topicFor`): a topic name (`teal`, `Harbor`, any case) draws that topic (names were not recognised and fell back to a pseudo-random topic); an idea with no colour takes the topics in order by its position among its siblings, so siblings differ (was a pick hashed from the node id); any other colour maps to the nearest of the eight topics. New `topicFromName`; `topicForColor(color, seed, siblingIndex?)`. Until the design system's `color.ts` is synced into `design-system/`, the rule is mirrored in `theme/index.ts`; `test/color.test.ts` compares it with `color.ts` as soon as it arrives.
- Containers follow the design system's `geometry/container.ts` (design system 0.1.1): the dashed hull is a fixed 150 / 125 beyond the member ideas' centres with radius-48 corners (was padding around the ideas' outlines with `radius-md`), and the group's name is a pill straddling the hull's edge — `topic-stone` fill, `topic-stone-ring` border (the contrast themes: `line-strong`, 2px), `node-ink` text in the note face at 26px × label scale, growing up to 1.3× when zoomed out like idea labels, one line with an ellipsis past 420px (was muted text at the frame's top-left corner). Its spot comes from `placeContainerLabel`: bottom centre when clear, else the candidate along the four edges that best avoids every idea (with its rings), every connector curve and the names placed before it. Names are painted on a layer above connectors and ideas, so nothing runs over them; placement uses the size at 100% so names don't hop while zooming, and follows dragged ideas.

### Deprecated
- `isDark` (use `theme`); `'light' | 'dark' | 'auto'` remain valid `theme` values for this release.

### Deprecated (animation)
- `useKonvaLayerTransition`, `KonvaLayerTransitionAnimator` / `konvaLayerTransitionAnimator`: no longer used by `VisualliCanvas` (its transitions now follow the design system's choreography); kept exported for one release.

### Removed
- `SketchyBoxKonva`; `DS_COLORS`, `DS_TYPOGRAPHY`, `DS_RADII`, `BRAND_COLORS`, `LEVEL_COLORS`, `SEMANTIC_COLORS`, `THEME_COLORS`, `CANVAS_COLORS`, `FONTS`, `FONT_SIZES`, `SPACING`, `getThemeBackground/Text/Border`, `darkenHexColor`, `getColorForLevel`, `COLOR_*` and `BORDER_WIDTH_*` / `CORNER_RADIUS` constants; `ALL_BLOB_SHAPES`, `ACTIVE_BLOB_TYPES`, `BLOB_LAYER_CONFIG`, `NODE_LAYER_CONFIG`, `BLOB_TEXT_OFFSETS`, `getBlobTypeForLayer`, `drawBlobPath`, `buildBlobPathData` (use the design system's `blobPath`, `RINGS`, `shapeForLevel`).
- Story Script, Playpen Sans, Nunito and Inter are no longer loaded by the SDK.

## 0.1.7
- `onNodeHover` on `VisualliCanvas`, exports for shapes and their functions.
