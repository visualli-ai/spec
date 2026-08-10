# @visualli-sdk/core

Framework-agnostic core logic, types, and algorithms for Visualli. Zero React / DOM dependencies.

## Features

| Module | What it provides |
|--------|------------------|
| **Types** | Full TypeScript interfaces for `VisualliDocument`, `VisualliLayer`, `FlatNode`, `ViewportState`, `RenderConfig`, `Connection`, and more |
| **Parser** | Parse `.visualli` JSONL files, convert layers to flat nodes, resolve spatial overlaps |
| **Layout** | Circular and linear layout algorithms with automatic radius/spacing calculation |
| **Viewport** | Pure pan/zoom/bounds math — world↔screen coordinate transforms, fit-to-screen |
| **Spatial index** | RBush-backed O(log n) spatial index for viewport culling of large node graphs |
| **Animations** | Easing functions (cubic, quartic, sine, bezier LUT) and timing phase constants |
| **Performance** | rAF-based FPS monitor, memory monitor, profiler |
| **Constants** | Design tokens (colors, spacing, typography), zoom limits, FPS targets, render config |

## Installation

```bash
npm install @visualli/core
```

> **Only dependency:** [`rbush`](https://github.com/mourner/rbush) — no React, no Zod, no network code.

## Quick Start

### Parse a document

```ts
import { parseVisualliFile, getNodesForLayer } from '@visualli-sdk/core';

// Parse from a raw JSONL string
const doc = parseVisualliFile(rawJsonlString);

// Get the root layer
const rootLayerId = [...doc.layers.keys()][0];
const nodes = getNodesForLayer(doc, rootLayerId); // FlatNode[]
```

### Apply layouts

```ts
import { applyCircularLayout, applyLinearHorizontalLayout } from '@visualli-sdk/core';

applyCircularLayout(nodes);             // mutates x/y in-place
applyLinearHorizontalLayout(nodes);    // horizontal tree layout
```

### Viewport math

```ts
import {
  zoomViewport, panViewport, setViewportCenter,
  calculateViewportBounds, worldToScreen, screenToWorld,
} from '@visualli-sdk/core';

const next     = zoomViewport(delta, viewport, pivotX, pivotY, canvasW, canvasH);
const bounds   = calculateViewportBounds(viewport, canvasW, canvasH);
const screenPt = worldToScreen(worldX, worldY, viewport, canvasW, canvasH);
```

### Spatial culling

```ts
import { RBushSpatialIndex } from '@visualli-sdk/core';

const index = new RBushSpatialIndex();
index.bulkLoad(nodes.map(n => ({
  nodeId: n.id,
  bounds: { minX: n.x, minY: n.y, maxX: n.x + n.width, maxY: n.y + n.height },
})));

// Query visible nodes
const visible = index.query(viewportBounds); // string[] — node IDs
```

### Easing

```ts
import { easeInOutCubic, easeOutCubic, createCubicBezier } from '@visualli-sdk/core';

const t = easeInOutCubic(progress); // 0..1 → 0..1
const custom = createCubicBezier(0.4, 0, 0.2, 1); // CSS timing function
```

### Colors & design tokens

```ts
import {
  getColorForLevel, getThemeBackground,
  LEVEL_COLOR_ARRAY, DS_COLORS, BRAND_COLORS,
} from '@visualli-sdk/core';

const nodeColor = getColorForLevel(2);         // '#...' for level 2
const bg        = getThemeBackground(isDark);  // canvas background
```

## Module Reference

### `types/`

| Export | Description |
|--------|-------------|
| `VisualliDocument` | Top-level document (layers Map, extensions Map) |
| `VisualliLayer` | A single layer: level, nodes, connections, containers |
| `FlatNode` | Renderable node (position, size, title, color, level, parentId) |
| `NodeMap` | `Map<string, FlatNode>` |
| `ViewportState` | `centerX/Y`, `zoomLevel`, `rotation`, `visibleBounds` |
| `RenderConfig` | Quality level, FPS target, culling flag, render mode |
| `Connection` | Edge: `from`, `to`, `level`, optional `label` |

### `parser/`

| Export | Description |
|--------|-------------|
| `parseVisualliFile(str)` | Parse JSONL → `VisualliDocument` |
| `loadVisualliFileFromFile(file)` | Parse a browser `File` object |
| `getNodesForLayer(doc, layerId)` | `FlatNode[]` for one layer |
| `convertVisualliToFlatNodes(doc)` | All layers → `NodeMap` |
| `getChildLayers(doc, layerId)` | Direct child layers |

### `layout/`

| Export | Description |
|--------|-------------|
| `applyCircularLayout(nodes)` | Radial arrangement |
| `applyLinearHorizontalLayout(nodes)` | Left-to-right tree |
| `applyLinearVerticalLayout(nodes)` | Top-to-bottom tree |
| `resolveCollisions(nodes)` | Push apart overlapping nodes |

### `viewport/`

| Export | Description |
|--------|-------------|
| `calculateViewportBounds(vp, w, h)` | Visible world rect |
| `zoomViewport(delta, vp, px, py, w, h)` | Zoom to cursor |
| `panViewport(dx, dy, vp)` | Translate camera |
| `setViewportCenter(x, y, vp)` | Teleport center |
| `clampZoom(level)` | Clamp to `[ZOOM_MIN, ZOOM_MAX]` |
| `worldToScreen(x, y, vp, w, h)` | World → screen px |
| `screenToWorld(x, y, vp, w, h)` | Screen px → world |

### `constants/`

| Export | Description |
|--------|-------------|
| `ZOOM_MIN` / `ZOOM_MAX` | `0.3` / `5.0` |
| `ZOOM_NAV_IN_THRESHOLD` | `2.7` — zoom level that triggers drill-in |
| `ZOOM_NAV_OUT_THRESHOLD` | `0.4` — zoom level that triggers back navigation |
| `LEVEL_COLOR_ARRAY` | 10-color palette indexed by node level |
| `DEFAULT_RENDER_CONFIG` | Baseline quality settings |
| `ANIMATION_PHASES` | Duration constants for layer transitions |

## TypeScript

The package ships `.d.ts` declarations alongside source maps. `moduleResolution: "bundler"` is recommended (compatible with Vite / esbuild).

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "target": "ES2020"
  }
}
```

## Build

```bash
npm run build      # tsc → dist/
npm run typecheck  # tsc --noEmit (0 errors expected)
```


## Structure

```
src/
├── types/           TypeScript interfaces, enums, Zod schemas
│   ├── mindmap.ts   MindMapNode, FlatNode, NodeMap, ViewportState, RenderConfig …
│   ├── meta.ts      VisualliMeta
│   ├── layer.ts     VisualliLayer, LayerNode, LayerConnection, LayerContainer …
│   ├── extension.ts VisualliExtension
│   ├── document.ts  VisualliDocument
│   ├── schema.ts    JSON-schema-aligned types + re-exports
│   ├── processing.ts ConnectionState, ProcessingState, type guards
│   └── sse.ts       SSEEvent discriminated union + Zod validation + helpers
│
├── layout/          Pure layout algorithms (no side-effects)
│   ├── circularLayout.ts  applyCircularLayout, calculateOptimalRadiusPercentage
│   ├── linearLayout.ts    applyLinearHorizontalLayout, applyLinearVerticalLayout
│   └── layoutUtils.ts     getNodeBounds, resolveCollisions, optimizeLayout
│
├── parser/          File parsing and data conversion
│   ├── visualliParser.ts    parseVisualliFile, loadVisualliFile, getChildLayers …
│   ├── visualliConverter.ts convertVisualliToFlatNodes, resolveNodeOverlaps …
│   ├── mindmapUtils.ts      flattenNodes, getVisibleNodes, calculateDistance …
│   └── configUtils.ts       createMindMapConfig, generateSampleConfig
│
├── services/        Network utilities (fetch, SSE, logging)
│   ├── api.ts       initApi, apiRequest, ApiError, mindmapApi, correlationId helpers
│   ├── logger.ts    Logger class (buffered remote + console)
│   └── sseClient.ts createSSEClient (fetch ReadableStream, reconnection)
│
├── constants/       Design tokens, performance thresholds, render config
│   ├── performanceConstants.ts  FPS targets, zoom limits, node dimensions …
│   ├── design.ts                DS_COLORS, LEVEL_COLORS, BRAND_COLORS, helpers …
│   └── renderConfig.ts          DEFAULT_RENDER_CONFIG, FEATURE_FLAGS, helpers …
│
├── viewport/        Coordinate math and pan/zoom operations
│   └── viewportUtils.ts  calculateViewportBounds, worldToScreen, zoomViewport …
│
├── performance/     FPS / memory monitoring (browser APIs, no React)
│   └── performanceMonitor.ts  FPSMonitor, MemoryMonitor, PerformanceProfiler
│
├── animations/      Easing functions and timing constants
│   ├── easing.ts    easeInOutCubic, createCubicBezier …
│   └── constants.ts ANIMATION_DURATION, ANIMATION_PHASES, COOLDOWN …
│
└── spatial/         RBush spatial index for O(log n) viewport culling
    └── spatialIndex.ts  RBushSpatialIndex, ISpatialIndex, BoundingBox
```

## Installation

```bash
npm install @visualli-sdk/core
```

> **Dependencies:** `zod` (schema validation) · `rbush` (spatial index)

## Quick Start

```ts
// Parse a .visualli document
import { parseVisualliFile, convertVisualliToFlatNodes } from '@visualli-sdk/core/parser';

const doc      = parseVisualliFile(rawJsonlString);
const nodeMap  = convertVisualliToFlatNodes(doc);

// Apply a circular layout
import { applyCircularLayout } from '@visualli-sdk/core/layout';
const nodes = [...nodeMap.values()];
applyCircularLayout(nodes);

// Viewport math
import { zoomViewport } from '@visualli-sdk/core/viewport';
const next = zoomViewport(0.1, currentViewport, pivotX, pivotY);

// API client
import { initApi, mindmapApi } from '@visualli-sdk/core/services';
initApi({ baseUrl: 'https://api.example.com/api' });
const list = await mindmapApi.getAllMindmaps();
```

## Design Principles

- **No React** — no hooks, no JSX, no Context
- **No DOM manipulation** — pure data transforms; browser APIs (`fetch`, `FileReader`) are used only at IO boundaries
- **No Vite env vars** — configure at runtime via `initApi()`
- **Tree-shakeable** — import from sub-paths to avoid bundling unused modules
