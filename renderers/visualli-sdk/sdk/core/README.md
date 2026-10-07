# @visualli/core

Framework-agnostic core logic, types, and algorithms for Visualli. Zero React / DOM dependencies.

## Features

| Module | What it provides |
|--------|------------------|
| **Types** | Full TypeScript interfaces for `VisualliDocument`, `VisualliLayer`, `FlatNode`, `ViewportState`, `RenderConfig`, `Connection`, and more |
| **Parser** | Parse `.visualli` JSONL files and convert layers to flat nodes: each idea sized for its label and coloured by the design system's rules, placed where the file puts it |
| **Layout** | Circular and linear layouts for files whose ideas carry no positions |
| **Design system** | The Visualli design system's rules, copied verbatim from `design-system/` (tokens, blob geometry, motion, idea size, colours, containers, fit, peek, trail, level of detail) |
| **Viewport** | Pure pan/zoom/bounds math — world↔screen coordinate transforms, fit to view |
| **Spatial index** | RBush-backed O(log n) spatial index for viewport culling of large node graphs |
| **Performance** | rAF-based FPS monitor, memory monitor, profiler |
| **Constants** | Zoom limits, FPS targets, render config |

## Installation

```bash
npm install @visualli/core
```

> **Only dependency:** [`rbush`](https://github.com/mourner/rbush) — no React, no Zod, no network code.

## Quick Start

### Parse a document

```ts
import { parseVisualliFile, getNodesForLayer } from '@visualli/core';

// Parse from a raw JSONL string
const doc = parseVisualliFile(rawJsonlString);

// Get the root layer
const rootLayerId = [...doc.layers.keys()][0];
const nodes = getNodesForLayer(doc, rootLayerId); // FlatNode[]

// Ideas are sized for their labels (the design system's idea.ts). Renderers pass their own text measurement in the
// label face; without one, an approximation is used.
const sized = getNodesForLayer(doc, rootLayerId, { measure: (text, px) => ctx.measureText(text).width, labelScale: 1 });
```

### Apply layouts

```ts
import { applyCircularLayout, applyLinearHorizontalLayout } from '@visualli/core';

applyCircularLayout(nodes);             // mutates x/y in-place
applyLinearHorizontalLayout(nodes);    // horizontal tree layout
```

### Viewport math

```ts
import {
  zoomViewport, panViewport, setViewportCenter,
  calculateViewportBounds, worldToScreen, screenToWorld,
} from '@visualli/core';

const next     = zoomViewport(delta, viewport, pivotX, pivotY, canvasW, canvasH);
const bounds   = calculateViewportBounds(viewport, canvasW, canvasH);
const screenPt = worldToScreen(worldX, worldY, viewport, canvasW, canvasH);
```

### Spatial culling

```ts
import { RBushSpatialIndex } from '@visualli/core';

const index = new RBushSpatialIndex();
index.bulkLoad(nodes.map(n => ({
  nodeId: n.id,
  bounds: { minX: n.x, minY: n.y, maxX: n.x + n.width, maxY: n.y + n.height },
})));

// Query visible nodes
const visible = index.query(viewportBounds); // string[] — node IDs
```

### Colours

```ts
import { ideaColor, ideaStyle } from '@visualli/core';

ideaColor('teal', 0);      // { topic: 'teal', custom: null } — a topic name
ideaColor(undefined, 2);   // { topic: 'iris', custom: null } — no colour: topics in sibling order
ideaColor('#b7e7f3', 0);   // { topic: null, custom: { fill: '#b7e7f3', ring: '#8fb4be' } } — drawn as given
ideaStyle('dark', node);   // { fill, ring } in a theme
```

## Module Reference

### `types/`

| Export | Description |
|--------|-------------|
| `VisualliDocument` | Top-level document (layers Map, extensions Map) |
| `VisualliLayer` | A single layer: level, nodes, connections, containers |
| `FlatNode` | Renderable idea: position, size for its label (`width` / `height`, `kind`), title, colour (`topic` or `custom`), level, parentId |
| `NodeMap` | `Map<string, FlatNode>` |
| `ViewportState` | `centerX/Y`, `zoomLevel`, `rotation`, `visibleBounds` |
| `RenderConfig` | Quality level, FPS target, culling flag, render mode |
| `Connection` | Edge: `from`, `to`, `level`, optional `label` |

### `parser/`

| Export | Description |
|--------|-------------|
| `parseVisualliFile(str)` | Parse JSONL → `VisualliDocument` |
| `loadVisualliFileFromFile(file)` | Parse a browser `File` object |
| `getNodesForLayer(doc, layerId, opts?)` | `FlatNode[]` for one layer (`opts`: `measure`, `labelScale` for sizing ideas) |
| `convertVisualliToFlatNodes(doc, opts?)` | All layers → `NodeMap` |
| `getChildLayers(doc, layerId)` | Direct child layers |

### `layout/`

| Export | Description |
|--------|-------------|
| `applyCircularLayout(nodes)` | Radial arrangement (used when the file gives no positions) |
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
| `clampZoom(level, fit?)` | Clamp to `[ZOOM_MIN, ZOOM_MAX]` × the layer's fit scale (the design system's limits are relative to the fit) |
| `worldToScreen(x, y, vp, w, h)` | World → screen px |
| `screenToWorld(x, y, vp, w, h)` | Screen px → world |

### `constants/`

| Export | Description |
|--------|-------------|
| `ZOOM_MIN` / `ZOOM_MAX` | `0.3` / `5.0` — the design system's `VIEW`, relative to the layer's fit |
| `DEFAULT_RENDER_CONFIG` | Baseline quality settings |

Motion, idea size, colours, fit, peek placement and the depth trail are the design system's rules, exported verbatim
(`MOTION`, `layerReveal`, `IDEA`, `ideaSize`, `labelGrowth`, `ideaColor`, `layerBounds`, `fitView`, `peekPosition`, `TRAIL` …).

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
├── generated/       The Visualli design system, generated from design-system/ (never edited by hand)
│   ├── designSystem.ts  TOKENS, METRICS, TYPE_STYLES, CANVAS_STYLE (from css/spec.css)
│   └── geometry/        blob, motion, idea, color, container, interaction, detail — copied verbatim
│
├── types/           TypeScript interfaces (FlatNode, VisualliDocument, VisualliLayer, ViewportState …)
├── parser/          parseVisualliFile; convertLayerToFlatNodes / getNodesForLayer (sizes, colours, positions)
├── layout/          Circular and linear layouts, for layers whose ideas carry no positions
├── rendering/       nodeGeometry (radii, rings, connector endpoints), ideaSize (idea.ts + measurement), culling
├── theme/           Theme and comfort resolution; ideaColor / ideaStyle (the design system's colour rule)
├── utils/           Layer navigation and fit to view (layerBounds / fitView)
├── viewport/        Coordinate math and pan / zoom (limits relative to the layer's fit)
├── constants/       Zoom limits, performance thresholds, render config
├── performance/     FPS / memory monitoring (browser APIs, no React)
└── spatial/         RBush spatial index for O(log n) viewport culling
```

## Design Principles

- **No React** — no hooks, no JSX, no Context
- **No DOM manipulation** — pure data transforms; text measurement is passed in by the renderer
- **No design decisions of its own** — every visual rule comes from the Visualli design system (`design-system/`)
- **Tree-shakeable** — import from sub-paths to avoid bundling unused modules
