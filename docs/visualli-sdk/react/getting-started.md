# 🚀 Getting Started

`<VisualliRenderer />` is a React component that renders interactive, hierarchical mindmap visualizations from `.visualli` files.

## 📦 Installation

=== "npm"

    ```bash
    npm install @visualli/react
    ```

=== "yarn"

    ```bash
    yarn add @visualli/react
    ```

=== "pnpm"

    ```bash
    pnpm add @visualli/react
    ```

That's the only install command you need. It automatically pulls in the major dependencies:

- 🧱 **`@visualli/core`** — the parsing engine and document model
- ⚛️ **`React` & `React DOM`** (≥ 18.3) — peer dependencies for your app

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

- 🎨 **Beautiful visualizations** — sketchy, hand-drawn aesthetic with smooth animations
- 🚀 **High performance** — spatial indexing keeps 10,000+ nodes smooth
- 🌓 **Themes** — `light`, `dark`, or `auto` (follows system preference)
- ⚡ **Web Worker parsing** — non-blocking parsing, on by default
- 🗺️ **Interactive navigation** — pan, zoom, auto layer navigation, breadcrumbs
- 🔧 **Fully typed** — complete TypeScript definitions included

## ⚠️ Error Handling

The renderer shows built-in states so you don't have to:

| State | What the user sees |
|---|---|
| 📭 No data | "No .visualli file provided" with a hint to pass `visualliFile` or `visualliString` |
| ⏳ Loading | Animated indicator while fetching/parsing |
| ❌ Error | Clear message on parse failure, e.g. `"Failed to parse JSON at line 5: Unexpected token"` |

## 🌐 Browser Support

| Browser | Version |
|---|---|
| Chrome | ≥ 90 |
| Firefox | ≥ 88 |
| Safari | ≥ 14 |
| Edge | ≥ 90 |

Requires ES2020, Canvas API, and CSS Grid/Flexbox. Web Workers and `prefers-color-scheme` are optional (used by `useWorker` and `theme="auto"`).

## ➡️ Next steps

- [Reference](props.md) — every prop `<VisualliRenderer />` accepts
- [Examples](examples.md) — themes, immersion, large documents, styling
