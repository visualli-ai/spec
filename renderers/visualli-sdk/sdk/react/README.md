# @visualli/react

React canvas rendering for Visualli — powered by Konva. A high-performance component suite that displays `.visualli` documents as interactive, zoomable, and navigable mind-maps.

## Features

- **High-Performance Canvas** — GPU-accelerated rendering via `react-konva` capable of handling thousands of nodes at 60fps
- **Organic Visuals** — Dynamic blob-based node shapes that cycle by hierarchy level
- **Layer Navigation** — Drill down into child layers and navigate back via breadcrumb UI
- **Smooth Transitions** — Animated zoom effects with color crossfading during layer changes
- **Chromatic Immersion** — Optional background effects that adapt to the current layer's context
- **Viewport Culling** — Spatial indexing ensures only visible elements are rendered
- **Worker-based Parsing** — Parse large documents off the main thread to prevent UI blocking
- **Design-system theming** — 8 themes (standard, focus, color-safe, high-contrast; light and dark), comfort settings (readable type, larger text, reduced motion), forced-colors aware
- **State Management** — Fine-grained control via Zustand stores for viewport, nodes, and selection

## Installation

```bash
npm install @visualli/react @visualli/core konva react-konva zustand
```

**Peer dependencies:** `react@^18`, `react-dom@^18`

## Quick Start

Use `VisualliRenderer` for the simplest integration — it handles loading, parsing, error states, and responsive sizing automatically.

```tsx
import { VisualliRenderer } from '@visualli/react';

export default function App() {
  return (
    <VisualliRenderer 
      visualliFile="/data/mindmap.visualli" 
      theme="auto"
      width="100%"
      height="100vh"
    />
  );
}
```

### Alternative: Pass Raw JSONL String

```tsx
<VisualliRenderer 
  visualliString={rawJsonlString}
  theme="dark"
  chromaticImmersion={true}
/>
```

### Alternative: Load from File Input

```tsx
function FileUploader() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <input 
        type="file" 
        accept=".visualli"
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      {file && <VisualliRenderer visualliFile={file} theme="light" />}
    </>
  );
}
```

## API Reference

### `VisualliRenderer` (Recommended)

The primary component for rendering `.visualli` documents. Manages the full document lifecycle including loading, parsing (with optional Web Worker), error handling, and responsive layout.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visualliFile` | `File \| string` | — | A `.visualli` file as a File object or URL path |
| `visualliString` | `string` | — | Raw JSONL content as a string |
| `theme` | `ThemeName \| 'auto' \| 'focus' \| 'colorsafe' \| 'contrast'` | `'light'` | One of the 8 design-system themes (`light`, `dark`, `focus-light`, `focus-dark`, `colorsafe-light`, `colorsafe-dark`, `contrast-light`, `contrast-dark`), a family, or `'auto'` (follows the reader). `'light'` / `'dark'` / `'auto'` still work |
| `reveal` | `'gradual' \| 'instant'` | `'gradual'` | How a layer arrives: ideas bloom in one by one then connectors draw (design-system motion), or everything fades in together |
| `comfort` | `{ readableType?, largerText?, reducedMotion? }` | — | Reader comfort settings |
| `respectForcedColors` | `boolean` | `true` | Use the high-contrast theme under forced-colors |
| `fontBaseUrl` | `string` | jsDelivr copy | Where `Caveat-Variable.ttf` is served from |
| `loadWebFonts` | `boolean` | `true` | Load Kalam + Atkinson Hyperlegible from Google Fonts |
| `layout` | `'auto' \| 'touch' \| 'pointer'` | `'auto'` | Touch -> bottom-sheet peek + larger controls; pointer -> floating peek on hover |
| `chromaticImmersion` | `boolean` | `false` | Enable background color effects based on layer context |
| `useWorker` | `boolean` | `true` | Parse documents in a Web Worker (recommended for large files) |
| `width` | `string \| number` | `'100%'` | Width as CSS value or pixel number |
| `height` | `string \| number` | `'100%'` | Height as CSS value or pixel number |
| `className` | `string` | — | Additional CSS classes |
| `style` | `React.CSSProperties` | — | Inline styles |

> **Note:** Provide either `visualliFile` or `visualliString`, not both.

### `VisualliCanvas` (Advanced)

The low-level canvas component used internally by `VisualliRenderer`. Use this if you need direct control over the rendering pipeline or already have a parsed `VisualliDocument`.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `preParsedVisualli` | `VisualliDocument` | Pre-parsed document from `@visualli/core` |
| `visualliString` | `string` | Raw JSONL string (parsed on mount) |
| `theme` | `ThemeInput` | Same values as `VisualliRenderer` |
| `isDark` | `boolean` | **Deprecated** — use `theme` (`true` → `'dark'`). Kept for one release |
| `comfort` | `Comfort` | Readable type, larger text, reduced motion |
| `chromaticImmersion` | `boolean` | Enable chromatic background |
| `onNodeClick` | `(node: FlatNode) => void` | Callback fired on node click |
| `onLayerChange` | `(id: string, layer: VisualliLayer) => void` | Callback fired on layer navigation |

#### Example

```tsx
import { VisualliCanvas } from '@visualli/react';
import { parseVisualliFile } from '@visualli/core';

const document = parseVisualliFile(jsonlString);

<VisualliCanvas 
  preParsedVisualli={document}
  theme="dark"
  onNodeClick={(node) => console.log('Clicked:', node.data.label)}
/>
```

## Customization & Extensions

The SDK is designed to be extensible. While the core renderer provides a complete visualization experience, you can extend it with custom UI overlays, data processing pipelines, or application-specific behaviors without modifying the core library. This allows developers to build specialized features on top of the base canvas while maintaining upgrade compatibility.

## State Management

The renderer uses Zustand stores for reactive state management. You can access these stores for advanced use cases like programmatic navigation or custom UI controls.

```tsx
import { useViewportStore, useNodeStore, useSelectionStore } from '@visualli/react';

function CustomControls() {
  const { zoomLevel, setZoom, setCenter } = useViewportStore();
  const selectedNode = useSelectionStore(s => s.selectedId);

  return (
    <div>
      <button onClick={() => setZoom(zoomLevel * 1.2)}>Zoom In</button>
      <button onClick={() => setCenter(0, 0)}>Reset View</button>
      <p>Selected: {selectedNode}</p>
    </div>
  );
}
```

## Advanced Hooks

The SDK exports low-level hooks for building custom rendering pipelines:

- **`useKonvaRenderer`** — Access the Konva stage and rendering loop
- **`useViewportNodes`** — Get nodes currently visible in the viewport (post-culling)
- **`useLayerChoreography`** — Step inside / back out with the design system's motion
- **`useVisualli`** — Access the Visualli context (when wrapped in `VisualliProvider`)

## Requirements

- Node.js ≥ 22
- React 18
- TypeScript 5+ (recommended)

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "target": "ES2020"
  }
}
```
