# 🧪 Examples

Practical recipes for `<VisualliRenderer />`. For prop details see the [Props Reference](props.md).

## 🌓 Themes

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
import { VisualliRenderer } from '@visualli/react';

function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');

  return (
    <div>
      <button onClick={() => setTheme('light')}>☀️ Light</button>
      <button onClick={() => setTheme('dark')}>🌙 Dark</button>
      <button onClick={() => setTheme('auto')}>🖥️ Auto</button>

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

## 🌈 Chromatic immersion

Color-codes child layers with their parent node's color for visual hierarchy:

```tsx
<VisualliRenderer
  visualliFile="/data/doc.visualli"
  chromaticImmersion={true}
  theme="light"
/>
```

## 📄 Large documents

Worker-based parsing (on by default) keeps the UI responsive. Lazy-mount the component for the best experience:

```tsx
function LazyViewer() {
  const [show, setShow] = useState(false);

  return show ? (
    <VisualliRenderer visualliFile="/data/large-doc.visualli" />
  ) : (
    <button onClick={() => setShow(true)}>Load Visualization</button>
  );
}
```

## 💅 Custom styling

```tsx
<VisualliRenderer
  visualliFile="/data/doc.visualli"
  width={1200}
  height={800}
  className="my-viewer"
  style={{ border: '2px solid #ddd', borderRadius: 12 }}
/>
```

## 🔁 Switching documents

Use a `key` to fully reset the renderer when swapping documents:

```tsx
function DocumentGallery() {
  const docs = ['/data/planning.visualli', '/data/research.visualli'];
  const [current, setCurrent] = useState(0);

  return (
    <div>
      {docs.map((doc, i) => (
        <button key={i} onClick={() => setCurrent(i)}>Doc {i + 1}</button>
      ))}

      <VisualliRenderer
        key={current}
        visualliFile={docs[current]}
        theme="auto"
        height="90vh"
      />
    </div>
  );
}
```
