# @visualli-sdk/react

React canvas rendering for Visualli — powered by Konva. Drop-in component that displays a `VisualliDocument` as an interactive, zoomable, navigable mind-map.

## Features

- **GPU-accelerated canvas** via `react-konva` — handles thousands of nodes at 60 fps
- **Organic blob nodes** — 6 quadratic-bezier blob shapes that cycle by level
- **Layer navigation** — double-click any node to drill into its child layer, breadcrumb back
- **Animated transitions** — rAF-driven zoom-into-layer / zoom-out-to-parent with color crossfade
- **Zoom controls** — +/− buttons, %, fit-to-screen
- **Viewport culling** — RBush spatial index keeps only visible nodes on the canvas
- **Zustand stores** — fine-grained subscriptions for nodes, viewport, selection, render config
- **Light / dark theme** — single `isDark` prop
- **🆕 Extension system** — inject custom parser middlewares and UI components at runtime
- **🆕 Stream fetching** — `useVisualliStream` hook for backend JSONL streams
- **🆕 Context provider** — `VisualliProvider` for dependency injection

## Installation

```bash
npm install @visualli-sdk/react @visualli-sdk/core konva react-konva zustand
```

Peer dependencies: `react@^18`, `react-dom@^18`

## Quick Start

```tsx
import { VisualliCanvas } from '@visualli-sdk/react';

// Option A — pass a pre-parsed VisualliDocument
import { parseVisualliFile } from '@visualli-sdk/core';

const doc = parseVisualliFile(rawJsonlString);

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas document={doc} isDark={false} />
    </div>
  );
}

// Option B — pass the raw JSONL string directly
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas visualliString={rawJsonlString} isDark={true} />
    </div>
  );
}
```

## `VisualliCanvas` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `document` | `VisualliDocument` | — | Pre-parsed document |
| `visualliString` | `string` | — | Raw JSONL — parsed internally |
| `isDark` | `boolean` | `false` | Light / dark canvas theme |
| `onNodeClick` | `(node: FlatNode) => void` | — | Single-click callback |
| `onLayerChange` | `(id: string, layer: VisualliLayer) => void` | — | Fired after navigation |
| `className` | `string` | `''` | Extra CSS classes on the wrapper div |
| `style` | `React.CSSProperties` | — | Inline styles on the wrapper div |

> The component fills its parent container — set an explicit `width` / `height` on the wrapper.

## Architecture

```
VisualliCanvas
├── KonvaStage              react-konva <Stage>, position/scale from viewport store
│   ├── KonvaContainerLayer <Layer> — convex-hull outlines (non-interactive)
│   ├── KonvaEdgeLayer      <Layer> — bezier edges between visible nodes
│   └── KonvaNodeLayer      <Layer> — blob nodes, handles click/dblclick
├── NavigationStack         DOM overlay — breadcrumb trail, click to go back
└── ZoomControls            DOM overlay — +/−/% buttons, fit-to-screen
```

### Stores (Zustand)

Access any store directly for advanced use cases:

```ts
import { useViewportStore, useNodeStore, useSelectionStore } from '@visualli-sdk/react';

// Read viewport
const { centerX, centerY, zoomLevel } = useViewportStore();

// Programmatic zoom
useViewportStore.getState().setZoom(1.5);
useViewportStore.getState().setCenter(0, 0);

// Read selected node
const selectedId = useSelectionStore(s => s.selectedId);
```

### Hooks

```ts
import { useViewportNodes } from '@visualli-sdk/react';

// Get nodes currently visible in the viewport (culled)
const visible = useViewportNodes(allNodes, /* optional level filter */ 0);
```

### Navigation Stack

Layer navigation is fully internal but observable via the `onLayerChange` callback. The breadcrumb UI renders automatically — no props required.

Drill-in: **double-click** a node that has a child layer.  
Back: click any crumb in the breadcrumb bar, or use `onNavigateBack` exposed by `NavigationStack` directly.

## Extension System 🆕

The extension system allows you to inject custom parser middlewares and UI components at runtime without modifying the SDK.

### Basic Setup with Provider

```tsx
import { VisualliProvider, VisualliCanvas } from '@visualli-sdk/react';

function App() {
  return (
    <VisualliProvider>
      <VisualliCanvas document={document} />
    </VisualliProvider>
  );
}
```

### With Custom Middleware

```tsx
import { VisualliProvider } from '@visualli-sdk/react';
import type { ParserMiddleware } from '@visualli-sdk/core';

const myMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    return { ...data, enhanced: true };
  }
  return data;
};

<VisualliProvider middlewares={[myMiddleware]}>
  <App />
</VisualliProvider>
```

### With Extension Components

```tsx
import type { ExtensionComponentProps } from '@visualli-sdk/react';

function MyExtension({ extension, document }: ExtensionComponentProps) {
  return (
    <div style={{ position: 'absolute', top: 20, right: 20 }}>
      <p>{extension.data?.message}</p>
    </div>
  );
}

const extensions = {
  'my-ext-id': MyExtension,
};

<VisualliProvider extensions={extensions}>
  <VisualliCanvas document={document} />
</VisualliProvider>
```

### Stream Fetching

```tsx
import { useVisualliStream, VisualliCanvas } from '@visualli-sdk/react';

function MindMapViewer({ apiUrl }: { apiUrl: string }) {
  const { document, isLoading, error, progress } = useVisualliStream(apiUrl);

  if (isLoading) return <div>Loading... {progress}%</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!document) return null;

  return <VisualliCanvas document={document} />;
}
```

### Complete Example

```tsx
import {
  VisualliProvider,
  useVisualliStream,
  VisualliCanvas
} from '@visualli-sdk/react';
import type {
  ParserMiddleware,
  ExtensionComponentProps
} from '@visualli-sdk/react';

// Middleware
const middleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    return { ...data, processed: true };
  }
  return data;
};

// Extension Component
function TooltipExtension({ extension }: ExtensionComponentProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      background: 'white',
      padding: '12px',
      borderRadius: '8px',
      pointerEvents: 'auto'
    }}>
      {extension.data?.message}
    </div>
  );
}

// App
function App() {
  const { document, isLoading } = useVisualliStream('/api/mindmap');

  return (
    <VisualliProvider
      middlewares={[middleware]}
      extensions={{ 'tooltip': TooltipExtension }}
    >
      {isLoading ? <Loading /> : <VisualliCanvas document={document} />}
    </VisualliProvider>
  );
}
```

📚 **See `EXTENSION_GUIDE.md` for comprehensive documentation and examples.**

## Exports

### Component

```ts
import { VisualliCanvas } from '@visualli-sdk/react';
```

### Context & Provider 🆕

```ts
import { VisualliProvider, useVisualli } from '@visualli-sdk/react';
import type {
  VisualliProviderProps,
  VisualliContextValue,
  ExtensionComponentProps,
  ExtensionRegistry
} from '@visualli-sdk/react';
```

### Stores

```ts
import { useNodeStore, useViewportStore, useSelectionStore, useRenderConfigStore } from '@visualli-sdk/react';
```

### Hooks

```ts
import { useKonvaRenderer, useKonvaLayerTransition, useViewportNodes } from '@visualli-sdk/react';

// 🆕 Stream fetching hook
import { useVisualliStream } from '@visualli-sdk/react';
import type { UseVisualliStreamReturn } from '@visualli-sdk/react';
```

### Sub-components (composition)

```ts
import {
  KonvaStage, KonvaNode, KonvaEdge,
  KonvaNodeLayer, KonvaEdgeLayer,
  KonvaContainerLayer,
  NavigationStack, ZoomControls,
} from '@visualli-sdk/react';
```

### Utilities

```ts
import {
  getChildLayerForNode, getConnectionsForLayer,
  calculateFitView, calculateFitZoom, calculateFitCenter,
} from '@visualli-sdk/react';
```

### Config helpers

```ts
import {
  getBlobTypeForLayer, buildBlobPathData, ALL_BLOB_SHAPES,
  computeNodeTextWorldScale, computeNodeTextScreenScale,
} from '@visualli-sdk/react';
```

## TypeScript

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "target": "ES2020"
  }
}
```

## Requirements

- Node.js ≥ 22
- React 18
- `@visualli-sdk/core` must be built (`npm run build` in `sdk-core/`) before typechecking

## Typecheck

```bash
# Build core first
cd ../sdk-core && npm run build

# Typecheck react package
cd ../sdk-react && npx tsc --noEmit
```
