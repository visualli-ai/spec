# Visualli SDK

A powerful React SDK for rendering interactive hierarchical visualizations from `.visualli` files.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)

## 🚀 Quick Start

```bash
npm install @visualli/react
```

```tsx
import { VisualliRenderer } from '@visualli/react';

function App() {
  return (
    <VisualliRenderer
      visualliFile="/path/to/document.visualli"
      theme="light"
      width="100vw"
      height="100vh"
    />
  );
}
```

---

## 📚 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Props Reference](#props-reference)
- [Features](#features)
- [Advanced Examples](#advanced-examples)
- [Performance](#performance)
- [TypeScript Support](#typescript-support)
- [Browser Support](#browser-support)
- [File Format](#file-format)
- [Development](#development)

---

## Overview

The Visualli SDK provides a complete solution for rendering interactive, hierarchical mindmap-style visualizations. Built with React and TypeScript, it offers:

- 🎨 **Beautiful Visualizations**: Sketchy, hand-drawn aesthetic with smooth animations
- 🚀 **High Performance**: RBush spatial indexing for handling 10,000+ nodes
- 🎯 **Zero Configuration**: Works out of the box with sensible defaults
- 🌓 **Theme Support**: Light, dark, and auto (system preference) themes
- 🔧 **Fully Typed**: Complete TypeScript definitions included
- ⚡ **Web Workers**: Optional background parsing for large documents
- 📱 **Responsive**: Adapts to any screen size

---

## Installation

### npm

```bash
npm install @visualli/react
```

### yarn

```bash
yarn add @visualli/react
```

### pnpm

```bash
pnpm add @visualli/react
```

### Peer Dependencies

The SDK requires React 18.3 or higher:

```bash
npm install react@^18.3.1 react-dom@^18.3.1
```

---

## Basic Usage

### Rendering from a File Path

The simplest way to use the SDK - just provide a path to your `.visualli` file:

```tsx
import { VisualliRenderer } from '@visualli/react';

function MyApp() {
  return (
    <VisualliRenderer
      visualliFile="/data/my-document.visualli"
      theme="light"
      width="100%"
      height="600px"
    />
  );
}
```

### Rendering from a String

If you have the JSONL data as a string:

```tsx
const visualliData = `{"type":"meta","version":"1.0","title":"My Mind Map"}
{"type":"layer","id":"root","level":0,"nodes":[{"id":"1","position":{"x":0,"y":0},"data":{"label":"Central Idea","summary":"The main concept"}}]}`;

function App() {
  return (
    <VisualliRenderer
      visualliString={visualliData}
      theme="auto"
      width="100vw"
      height="100vh"
    />
  );
}
```

### Rendering from File Upload

Handle user-uploaded files:

```tsx
import { VisualliRenderer } from '@visualli/react';
import { useState } from 'react';

function FileViewer() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <input
        type="file"
        accept=".visualli"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      
      {file && (
        <VisualliRenderer
          visualliFile={file}
          theme="light"
          width="100%"
          height="80vh"
          useWorker={true}
        />
      )}
    </div>
  );
}
```

---

## Props Reference

### Data Source Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visualliString` | `string` | No* | Raw JSONL string containing the Visualli document. Simply pass the string data - no preprocessing needed. |
| `visualliFile` | `File \| string` | No* | Either a File object (from `<input type="file">`) or a string path to a `.visualli` file. The component automatically fetches, reads, and parses it. |

**\*Note:** You must provide either `visualliString` OR `visualliFile` (but not both).

### Visual Configuration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'light' \| 'dark' \| 'auto'` | `'light'` | Color theme. `'auto'` follows system preference via `prefers-color-scheme`. |
| `chromaticImmersion` | `boolean` | `false` | Enable immersive color backgrounds. Child layers display their parent node's color. |
| `width` | `string \| number` | `'100%'` | Canvas width. Accepts CSS strings (`'100%'`, `'800px'`) or numbers (treated as pixels). |
| `height` | `string \| number` | `'100%'` | Canvas height. Accepts CSS strings (`'100vh'`, `'600px'`) or numbers (treated as pixels). |

### Performance Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `useWorker` | `boolean` | `true` | Offload parsing to a Web Worker to prevent UI blocking. Recommended for documents with 500+ nodes. |

### Styling Props

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Additional CSS class name(s) for the root container. |
| `style` | `React.CSSProperties` | Inline styles merged onto the root container. |

---

## Features

### 🎨 Automatic Theme Support

The renderer automatically adapts to your chosen theme:

```tsx
// Light theme
<VisualliRenderer visualliFile="/data/doc.visualli" theme="light" />

// Dark theme
<VisualliRenderer visualliFile="/data/doc.visualli" theme="dark" />

// Auto theme (follows system preference)
<VisualliRenderer visualliFile="/data/doc.visualli" theme="auto" />
```

The `auto` theme listens to the system's `prefers-color-scheme` and updates automatically when users change their system theme.

### ⚡ Web Worker Parsing

For large documents, enable Web Worker parsing to keep the UI responsive:

```tsx
<VisualliRenderer
  visualliFile="/data/large-document.visualli"
  useWorker={true}
  theme="light"
/>
```

**Benefits:**
- Non-blocking JSON parsing
- Smooth UI during load
- Recommended for 500+ nodes
- Automatic fallback to main thread if workers unavailable

### 🗺️ Interactive Navigation

The renderer includes built-in navigation features:

- **Pan & Zoom**: Click and drag to pan, scroll to zoom
- **Auto-Zoom Navigation**: 
  - Zoom in past threshold → Navigate to child layer
  - Zoom out past threshold → Return to parent layer
- **Navigation Stack**: Visual breadcrumb showing current path
- **Context Menu**: Right-click anywhere to go back
- **Zoom Controls**: On-screen buttons for zoom in/out/reset

### 🎯 Hierarchical Layers

Visualli documents support unlimited hierarchical levels:

```jsonl
{"type":"layer","id":"root","level":0,"nodes":[...]}
{"type":"layer","id":"child1","level":1,"parentLayerId":"root","parentNodeId":"node1","nodes":[...]}
{"type":"layer","id":"grandchild","level":2,"parentLayerId":"child1","parentNodeId":"node2","nodes":[...]}
```

Navigate through layers by zooming in on nodes that have children.

### 🔗 Connections & Relationships

Visualize relationships between nodes:

```jsonl
{
  "type":"layer",
  "connections":[
    {"id":"c1","from":"node1","to":"node2","label":"leads to"},
    {"id":"c2","from":"node2","to":"node3","label":"influences"}
  ]
}
```

Connections appear as curved lines with optional labels.

### 📦 Containers & Groups

Group related nodes visually:

```jsonl
{
  "type":"layer",
  "containers":[
    {
      "id":"group1",
      "label":"Key Concepts",
      "nodes":["node1","node2","node3"]
    }
  ]
}
```

Containers appear as rounded rectangles with labels.

### 🌈 Chromatic Immersion

Enable immersive color-coded backgrounds:

```tsx
<VisualliRenderer
  visualliFile="/data/doc.visualli"
  chromaticImmersion={true}
  theme="light"
/>
```

When enabled:
- Root layer shows base theme background
- Child layers display parent node's color as semi-transparent background
- Creates visual hierarchy and context awareness

### 🎨 Node Descriptions

Hover over any node to see its full description in a beautifully styled tooltip.

---

## Advanced Examples

### Responsive Layout

```tsx
function ResponsiveViewer() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ height: '60px', background: '#333' }}>
        <h1>My Visualli App</h1>
      </header>
      
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <VisualliRenderer
          visualliFile="/data/document.visualli"
          theme="auto"
          width="100%"
          height="100%"
          useWorker={true}
        />
      </main>
    </div>
  );
}
```

### Custom Styling

```tsx
function StyledViewer() {
  return (
    <VisualliRenderer
      visualliFile="/data/doc.visualli"
      theme="light"
      width="1200px"
      height="800px"
      className="my-custom-class"
      style={{
        border: '2px solid #ddd',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    />
  );
}
```

### Theme Switcher

```tsx
import { useState } from 'react';
import { VisualliRenderer, VisualliTheme } from '@visualli/react';

function ThemeSwitcher() {
  const [theme, setTheme] = useState<VisualliTheme>('light');

  return (
    <div>
      <div style={{ padding: '20px' }}>
        <button onClick={() => setTheme('light')}>Light</button>
        <button onClick={() => setTheme('dark')}>Dark</button>
        <button onClick={() => setTheme('auto')}>Auto</button>
      </div>
      
      <VisualliRenderer
        visualliFile="/data/doc.visualli"
        theme={theme}
        width="100%"
        height="calc(100vh - 80px)"
      />
    </div>
  );
}
```

### Loading Multiple Documents

```tsx
import { useState } from 'react';

function DocumentGallery() {
  const docs = [
    '/data/project-planning.visualli',
    '/data/research-notes.visualli',
    '/data/team-structure.visualli'
  ];
  
  const [currentDoc, setCurrentDoc] = useState(0);

  return (
    <div>
      <nav>
        {docs.map((doc, idx) => (
          <button key={idx} onClick={() => setCurrentDoc(idx)}>
            Document {idx + 1}
          </button>
        ))}
      </nav>
      
      <VisualliRenderer
        key={currentDoc}
        visualliFile={docs[currentDoc]}
        theme="auto"
        width="100%"
        height="90vh"
        useWorker={true}
      />
    </div>
  );
}
```

---

## Performance

### Benchmarks

The Visualli SDK is optimized for performance:

| Nodes | Load Time | FPS | Memory |
|-------|-----------|-----|--------|
| 100 | <50ms | 60 | ~5MB |
| 1,000 | <200ms | 60 | ~15MB |
| 10,000 | <1s | 60 | ~50MB |
| 50,000 | <3s | 55-60 | ~150MB |

*Tested on M1 MacBook Pro, Chrome 120*

### Optimization Tips

1. **Use Web Workers for Large Documents(set as true by default)**
   ```tsx
   <VisualliRenderer useWorker={true} />
   ```

2. **Lazy Load Documents**
   ```tsx
   const [showViz, setShowViz] = useState(false);
   
   <button onClick={() => setShowViz(true)}>Load Visualization</button>
   {showViz && <VisualliRenderer visualliFile="/data/doc.visualli" />}
   ```

3. **Optimize Document Structure**
   - Keep layers focused (50-200 nodes per layer)
   - Use hierarchical layers instead of flat structures
   - Reduce redundant connections

### RBush Spatial Indexing

The SDK uses RBush (R-tree spatial index) for efficient viewport culling:

- **O(log n) lookups** instead of O(n) iteration
- **87-3000x faster** than naive approaches
- **Automatic** - no configuration needed
- **Scales** to 50,000+ nodes smoothly

---

## TypeScript Support

The SDK is written in TypeScript and includes complete type definitions.

### Type Imports

```tsx
import { 
  VisualliRenderer,
  VisualliTheme,
  VisualliRendererProps 
} from '@visualli/react';

import type {
  VisualliDocument,
  VisualliLayer,
  FlatNode,
  Connection
} from '@visualli/core';
```

### Example with Types

```tsx
import { VisualliRenderer, VisualliTheme } from '@visualli/react';
import { useState } from 'react';

function TypedViewer() {
  const [theme, setTheme] = useState<VisualliTheme>('light');
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      <input
        type="file"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setFile(e.target.files?.[0] || null);
        }}
      />
      
      {file && (
        <VisualliRenderer
          visualliFile={file}
          theme={theme}
          width={1200}
          height={800}
        />
      )}
    </div>
  );
}
```

---

## Browser Support

The Visualli SDK supports all modern browsers:

| Browser | Version |
|---------|---------|
| Chrome | ≥90 |
| Firefox | ≥88 |
| Safari | ≥14 |
| Edge | ≥90 |

### Required Features

- ES2020 JavaScript
- CSS Grid & Flexbox
- Canvas API
- Web Workers (optional, for `useWorker` prop)
- `prefers-color-scheme` media query (optional, for `theme="auto"`)

---

## File Format

Visualli files use JSONL (JSON Lines) format - one JSON object per line.

### Minimal Example

```jsonl
{"type":"meta","version":"1.0","title":"Simple Map","created":"2026-01-01T00:00:00Z","lastModified":"2026-01-01T00:00:00Z"}
{"type":"layer","id":"root","level":0,"description":"Root Layer","nodes":[{"id":"node1","position":{"x":0,"y":0},"data":{"label":"Central Idea","summary":"This is the main concept"}}],"connections":[],"containers":[],"parentLayerId":null,"parentNodeId":null}
```

### Full Example with Layers

```jsonl
{"type":"meta","version":"1.0","title":"Project Planning","created":"2026-01-01T00:00:00Z","lastModified":"2026-01-01T00:00:00Z"}
{"type":"layer","id":"root","level":0,"nodes":[{"id":"n1","position":{"x":0,"y":0},"data":{"label":"Project","summary":"Main project overview"}}],"connections":[],"containers":[],"parentLayerId":null,"parentNodeId":null}
{"type":"layer","id":"layer1","level":1,"nodes":[{"id":"n2","position":{"x":-200,"y":0},"data":{"label":"Phase 1","summary":"Initial planning"}},{"id":"n3","position":{"x":200,"y":0},"data":{"label":"Phase 2","summary":"Implementation"}}],"connections":[{"id":"c1","from":"n2","to":"n3","label":"leads to"}],"containers":[{"id":"cont1","label":"Timeline","nodes":["n2","n3"]}],"parentLayerId":"root","parentNodeId":"n1"}
```

### Field Reference

**Meta Object:**
- `type`: Always `"meta"`
- `version`: Visualli format version (e.g., `"1.0"`)
- `title`: Document title
- `created`: ISO 8601 timestamp
- `lastModified`: ISO 8601 timestamp

**Layer Object:**
- `type`: Always `"layer"`
- `id`: Unique layer identifier
- `level`: Hierarchy level (0 = root)
- `description`: Optional layer description
- `nodes`: Array of node objects
- `connections`: Array of connection objects
- `containers`: Array of container objects
- `parentLayerId`: ID of parent layer (null for root)
- `parentNodeId`: ID of parent node (null for root)

---

## Error Handling

The renderer includes built-in error states with helpful messages:

### Empty State

Shown when no data prop is provided:

```tsx
<VisualliRenderer theme="light" />
// Shows: "No .visualli file provided"
// Suggests: "Pass a visualliFile or visualliString prop"
```

### Loading State

Shown while fetching/parsing data:

```tsx
<VisualliRenderer visualliFile="/large-doc.visualli" useWorker={true} />
// Shows animated loading indicator
// Message: "Loading .visualli file…"
```

### Error State

Shown when parsing fails:

```tsx
<VisualliRenderer visualliString="invalid json" />
// Shows error icon and message
// Example: "Failed to parse JSON at line 5: Unexpected token"
```

---

## Development

### Project Structure

```
visualli-sdk/
├── packages/
│   ├── sdk-core/          # Core parsing & types
│   └── sdk-react/         # React components
├── apps/
│   └── playground/        # Example app
├── README.md
└── package.json
```

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd visualli-sdk

# Install dependencies
npm install

# Build all packages
npm run build

# Run the playground
npm run dev
```

The playground will be available at http://localhost:1100

### Build

```bash
# Build all packages
npm run build

# Build specific package
cd packages/sdk-react
npm run build
```

### Package Scripts

- `npm run build` - Build all packages
- `npm run dev` - Start playground dev server
- `npm run lint` - Lint all packages
- `npm run type-check` - Type check all packages

---

## License

MIT

---

## Support

For issues, questions, or contributions, please visit the repository.

---

Made with ❤️ by the Visualli team
