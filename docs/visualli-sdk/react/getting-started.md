# 🚀 Getting Started

`<VisualliRenderer />` is a React component that renders interactive, hierarchical mindmap visualizations from `.visualli` files.

## 📦 Installation

=== "npm"

    ```bash
    npm install @visualli/react konva react-konva
    ```

=== "yarn"

    ```bash
    yarn add @visualli/react konva react-konva
    ```

=== "pnpm"

    ```bash
    pnpm add @visualli/react konva react-konva
    ```

That's the only install command you need. `@visualli/core` (the parsing engine and document model) comes with it, at the same version. Your app provides the peer dependencies, one copy each, shared with the SDK:

- ⚛️ **`React` & `React DOM`** (≥ 18.3)
- 🖌️ **`konva`** (^9.3.6) and **`react-konva`** (^18.2.10) — the canvas the map is drawn on. One shared copy means Konva never warns about two instances.

## ⚡ Usage

Provide exactly **one** data source — `visualliFile` **or** `visualliString`:

- `visualliFile` — a `File` object (from `<input type="file">`) or a string path. The component fetches, reads, and parses it automatically.
- `visualliString` — raw JSONL content as a string. No preprocessing needed.

### From a file path

```tsx
import { VisualliRenderer } from '@visualli/react';

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

### From a string

```tsx
const data = `{"type":"meta","version":"1.0","title":"My Mind Map"}
{"type":"layer","id":"root","level":0,"nodes":[{"id":"1","position":{"x":0,"y":0},"data":{"label":"Central Idea","summary":"The main concept"}}]}`;

<VisualliRenderer visualliString={data} theme="auto" />
```

### From a file upload

```tsx
import { useState } from 'react';
import { VisualliRenderer } from '@visualli/react';

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

## ✨ Features

- 🚀 **Smooth Animations** — Spatial indexing keeps 10,000+ nodes smooth during operation
- 🌓 **Themes** — `light`, `dark`, or `auto` (follows system preference)
- ⚡ **Web Worker parsing** — Non-blocking parsing, on by default
- 🗺️ **Interactive navigation** — Pan, zoom, auto layer navigation, breadcrumbs
- 🔧 **Fully typed** — All TypeScript definitions included

## ⚠️ Error Handling

The renderer handles errors and shows built-in states so you don't have to:

| State | What the user sees |
|---|---|
| 📭 No data | "No .visualli file provided" with a hint to pass `visualliFile` or `visualliString` |
| ⏳ Loading | Animated indicator while fetching/parsing |
| ❌ Error | Clear message on parse failure, e.g. `"Failed to parse JSON at line 5: Unexpected token"` |

## 🌐 Browser Support

The oldest browsers that run the renderer with its **full experience** — every look, interaction, theme and comfort setting, with no feature missing or degraded:

| Browser | Version | Released |
|---|---|---|
| Chrome | 88 | Jan 2021 |
| Edge | 88 | Jan 2021 |
| Firefox | 85 | Jan 2021 |
| Safari | 16 | Sep 2022 |
| Safari on iOS | 16 | Sep 2022 |
| Opera | 75 | Mar 2021 |
| Samsung Internet | 15 | Aug 2021 |

What sets the floor: `:focus-visible` (keyboard focus and the zoomed-out level of detail; Chrome 86, Firefox 85, Safari 15.4), `:is()` / `:where()` (Chrome 88, Opera 75) and, on Safari, `overscroll-behavior` (the touch sheet keeps its scroll to itself; Safari 16). The JavaScript is ES2020, with the Canvas 2D API, `Path2D`, `ResizeObserver`, Pointer Events and the CSS Font Loading API. Web Workers and `prefers-color-scheme` are optional (used by `useWorker` and `theme="auto"`).

One refinement needs newer browsers: in **readable type** (`comfort.readableType`), idea labels on the canvas get the design system's extra 2% letter spacing only where canvas `letterSpacing` exists (Chrome 99, Firefox 115, Safari 18.4); older browsers draw those labels without it.

This list is `package.json` → `browserslist`; `npm run check:browsers` fails if the CSS the SDK injects or its JavaScript needs more, or if this table disagrees.

## ➡️ Next steps

- [Reference](props.md) — every prop `<VisualliRenderer />` accepts
- [Examples](examples.md) — themes, immersion, large documents, styling
