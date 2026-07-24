# Quick Start: Extension System

This guide gets you up and running with the new extension system in under 5 minutes.

## Installation

```bash
# Install both packages
npm install @mysdk/core @mysdk/react

# Peer dependencies (if not already installed)
npm install react react-dom konva react-konva zustand
```

## 1. Basic Usage (No Extensions)

Works exactly as before - fully backward compatible:

```tsx
import { VisualliCanvas } from '@mysdk/react';
import { parseVisualliFile } from '@mysdk/core';

function App() {
  const doc = parseVisualliFile(jsonlString);
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas document={doc} isDark />
    </div>
  );
}
```

## 2. With Provider (Enables Extensions)

Wrap your app with `VisualliProvider`:

```tsx
import { VisualliProvider, VisualliCanvas } from '@mysdk/react';

function App() {
  return (
    <VisualliProvider>
      <div style={{ width: '100vw', height: '100vh' }}>
        <VisualliCanvas document={doc} isDark />
      </div>
    </VisualliProvider>
  );
}
```

## 3. Add Stream Fetching

Replace static document with streaming:

```tsx
import { VisualliProvider, useVisualliStream, VisualliCanvas } from '@mysdk/react';

function MindMapViewer() {
  const { document, isLoading, error } = useVisualliStream('/api/mindmap');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!document) return null;

  return <VisualliCanvas document={document} isDark />;
}

function App() {
  return (
    <VisualliProvider>
      <MindMapViewer />
    </VisualliProvider>
  );
}
```

## 4. Add Custom Middleware

Transform data as it's parsed:

```tsx
import { VisualliProvider } from '@mysdk/react';
import type { ParserMiddleware } from '@mysdk/core';

const logMiddleware: ParserMiddleware = (data) => {
  console.log('Parsed:', data.type, data.id);
  return data;
};

const enhanceMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    return { ...data, enhanced: true };
  }
  return data;
};

function App() {
  return (
    <VisualliProvider middlewares={[logMiddleware, enhanceMiddleware]}>
      <MindMapViewer />
    </VisualliProvider>
  );
}
```

## 5. Add Extension Components

Render custom UI for extensions:

```tsx
import type { ExtensionComponentProps } from '@mysdk/react';

// Define extension component
function TooltipExtension({ extension }: ExtensionComponentProps) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      background: 'white',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      pointerEvents: 'auto' // Make it clickable
    }}>
      <h4>{extension.title}</h4>
      <p>{extension.description}</p>
    </div>
  );
}

// Register extensions by ID
const extensions = {
  'tooltip': TooltipExtension,
  // Add more extension types here
};

function App() {
  return (
    <VisualliProvider extensions={extensions}>
      <MindMapViewer />
    </VisualliProvider>
  );
}
```

## 6. Complete Example

Putting it all together:

```tsx
import React from 'react';
import {
  VisualliProvider,
  useVisualliStream,
  VisualliCanvas
} from '@mysdk/react';
import type {
  ParserMiddleware,
  ExtensionComponentProps
} from '@mysdk/react';

// ─── Middleware ────────────────────────────────────────────────────────────

const appMiddleware: ParserMiddleware = (data) => {
  // Log everything
  console.log('[Parser]', data.type, data.id || '');
  
  // Enhance extensions
  if (data.type === 'extension') {
    return {
      ...data,
      processedAt: new Date().toISOString()
    };
  }
  
  return data;
};

// ─── Extension Components ──────────────────────────────────────────────────

function InfoBanner({ extension }: ExtensionComponentProps) {
  const [visible, setVisible] = React.useState(true);
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      background: '#667eea',
      color: 'white',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      pointerEvents: 'auto'
    }}>
      <span>{extension.message || 'Welcome!'}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

function StatsOverlay({ document }: ExtensionComponentProps) {
  const layerCount = document.layers?.size || 0;
  const extensionCount = document.extensions?.size || 0;
  
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      pointerEvents: 'none'
    }}>
      Layers: {layerCount} | Extensions: {extensionCount}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

function MindMapViewer() {
  const apiUrl = '/api/mindmap/stream';
  const { document, isLoading, error, progress } = useVisualliStream(apiUrl);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '12px'
      }}>
        <div>Loading mind map...</div>
        <div style={{
          width: '200px',
          height: '4px',
          background: '#eee',
          borderRadius: '2px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#667eea',
            transition: 'width 0.3s'
          }} />
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>{progress}%</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Error</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!document) {
    return <div>No document</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas
        document={document}
        isDark
        onNodeClick={(node) => {
          console.log('Node clicked:', node.id);
        }}
      />
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────

export default function App() {
  const extensions = React.useMemo(() => ({
    'info-banner': InfoBanner,
    'stats': StatsOverlay,
  }), []);

  return (
    <VisualliProvider
      middlewares={[appMiddleware]}
      extensions={extensions}
    >
      <MindMapViewer />
    </VisualliProvider>
  );
}
```

## Extension Component Tips

### 1. Positioning

Extensions render in an overlay with `pointerEvents: none` by default. To make elements interactive, set `pointerEvents: 'auto'`:

```tsx
function MyExtension({ extension }: ExtensionComponentProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* This button will be clickable */}
      <button style={{ pointerEvents: 'auto' }}>
        Click me
      </button>
    </div>
  );
}
```

### 2. Accessing Document

Use the `document` prop to access full document data:

```tsx
function MyExtension({ extension, document }: ExtensionComponentProps) {
  const nodeCount = Array.from(document.layers?.values() || [])
    .reduce((sum, layer) => sum + (layer.nodes?.length || 0), 0);
  
  return <div>Total nodes: {nodeCount}</div>;
}
```

### 3. State Management

Extensions are normal React components and can use hooks:

```tsx
function MyExtension({ extension }: ExtensionComponentProps) {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    console.log('Extension mounted');
  }, []);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

## Middleware Tips

### 1. Filtering

Return `null` to skip a line:

```typescript
const filterMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'unwanted') {
    return null; // Skip this line
  }
  return data;
};
```

### 2. Transforming

Return a modified object:

```typescript
const transformMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    return {
      ...data,
      enhanced: true,
      timestamp: Date.now()
    };
  }
  return data;
};
```

### 3. Chaining

Middlewares execute in order:

```tsx
<VisualliProvider middlewares={[
  logMiddleware,      // 1. Runs first
  transformMiddleware, // 2. Runs second
  filterMiddleware     // 3. Runs last
]}>
```

## Next Steps

- Read `EXTENSION_GUIDE.md` for comprehensive documentation
- See `examples/extension-demo.tsx` for a complete working example
- Check `PART2_COMPLETE.md` for implementation details

## Troubleshooting

### Extensions not rendering?

1. Check extension IDs match between document and registry
2. Verify VisualliProvider wraps your components
3. Check browser console for errors

### Middleware not working?

1. Ensure you're using `useVisualliStream` (for stream-based loading)
2. Verify middleware is passed to VisualliProvider
3. Check middleware returns data (not undefined)

### Performance issues?

1. Memoize extension registries with `React.useMemo`
2. Use `React.memo` for expensive extension components
3. Keep middleware functions fast (they run on every line)

## Support

- GitHub Issues: [Report a bug](https://github.com/visualli-ai/spec/issues)
- Documentation: See package README files
- Examples: Check `examples/` directory
