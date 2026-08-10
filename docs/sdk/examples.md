# Examples

Practical recipes for `<VisualliRenderer />`. For prop details see the [Props Reference](props.md).

## Themes

```tsx
// Light
<VisualliRenderer visualliFile="/data/doc.visualli" theme="light" />

// Dark
<VisualliRenderer visualliFile="/data/doc.visualli" theme="dark" />

// Auto — follows system preference, updates live
<VisualliRenderer visualliFile="/data/doc.visualli" theme="auto" />
```

### Theme switcher

```tsx
import { useState } from 'react';
import { VisualliRenderer, VisualliTheme } from '@visualli-sdk/react';

function ThemeSwitcher() {
  const [theme, setTheme] = useState<VisualliTheme>('light');

  return (
    <div>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('auto')}>Auto</button>

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

## Chromatic immersion

Color-codes child layers with their parent node's color for visual hierarchy:

```tsx
<VisualliRenderer
  visualliFile="/data/doc.visualli"
  chromaticImmersion={true}
  theme="light"
/>
```

## Large documents

Web Worker parsing (default) keeps the UI responsive. Combine with lazy mounting for best results:

```tsx
function LazyViewer() {
  const [show, setShow] = useState(false);

  return show ? (
    <VisualliRenderer
      visualliFile="/data/large-doc.visualli"
      useWorker={true}
      theme="light"
    />
  ) : (
    <button onClick={() => setShow(true)}>Load Visualization</button>
  );
}
```

## Custom styling

```tsx
<VisualliRenderer
  visualliFile="/data/doc.visualli"
  width={1200}
  height={800}
  className="my-viewer"
  style={{ border: '2px solid #ddd', borderRadius: 12 }}
/>
```

## Performance notes

The renderer uses RBush spatial indexing for viewport culling, giving O(log n) lookups and smooth 60 fps rendering up to 10,000+ nodes. Tips:

- Keep layers focused (50–200 nodes per layer); prefer hierarchy over flat structures.
- Leave `useWorker` enabled for documents with 500+ nodes.
- Lazy-mount the component when the visualization isn't immediately visible.
