# Getting Started

`<VisualliRenderer />` is a React component that renders interactive, hierarchical mindmap visualizations from `.visualli` files.

## Installation

=== "npm"

    ```bash
    npm install @visualli-sdk/react
    ```

=== "yarn"

    ```bash
    yarn add @visualli-sdk/react
    ```

=== "pnpm"

    ```bash
    pnpm add @visualli-sdk/react
    ```

The SDK requires React 18.3 or higher as a peer dependency:

```bash
npm install react@^18.3.1 react-dom@^18.3.1
```

## Basic Usage

```tsx
import { VisualliRenderer } from '@visualli-sdk/react';

function App() {
  return (
    <VisualliRenderer
      visualliFile="/data/document.visualli"
      theme="light"
      width="100%"
      height="600px"
    />
  );
}
```

You must provide exactly one data source — `visualliFile` **or** `visualliString`:

- `visualliFile` — a `File` object (from `<input type="file">`) or a string path. The component fetches, reads, and parses it automatically.
- `visualliString` — raw JSONL content as a string. No preprocessing needed.

### From a string

```tsx
const data = `{"type":"meta","version":"1.0","title":"My Mind Map"}
{"type":"layer","id":"root","level":0,"nodes":[{"id":"1","position":{"x":0,"y":0},"data":{"label":"Central Idea","summary":"The main concept"}}]}`;

<VisualliRenderer visualliString={data} theme="auto" />
```

### From a file upload

```tsx
import { useState } from 'react';
import { VisualliRenderer } from '@visualli-sdk/react';

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
        />
      )}
    </div>
  );
}
```

## Features

- 🎨 **Beautiful visualizations** — sketchy, hand-drawn aesthetic with smooth animations
- 🚀 **High performance** — RBush spatial indexing, smooth with 10,000+ nodes
- 🌓 **Themes** — `light`, `dark`, or `auto` (follows system `prefers-color-scheme`)
- ⚡ **Web Worker parsing** — off-main-thread parsing, on by default
- 🗺️ **Interactive navigation** — pan, zoom, auto layer navigation, breadcrumbs
- 🔧 **Fully typed** — complete TypeScript definitions included

## Error Handling

The renderer shows built-in states so you don't have to:

- **No data** — "No .visualli file provided", with a hint to pass `visualliFile` or `visualliString`
- **Loading** — animated indicator while fetching/parsing
- **Error** — clear message on parse failure, e.g. `"Failed to parse JSON at line 5: Unexpected token"`

## Browser Support

| Browser | Version |
|---|---|
| Chrome | ≥ 90 |
| Firefox | ≥ 88 |
| Safari | ≥ 14 |
| Edge | ≥ 90 |

Requires ES2020, Canvas API, and CSS Grid/Flexbox. Web Workers and `prefers-color-scheme` are optional (used by `useWorker` and `theme="auto"`).
