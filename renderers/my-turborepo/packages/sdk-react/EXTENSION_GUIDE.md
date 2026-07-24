# Extension System Guide

This guide demonstrates how to use the extensible architecture in `@mysdk/react` to inject custom parser middlewares and extension components at runtime.

## Overview

The extension system consists of three main parts:

1. **VisualliProvider** - React Context provider for dependency injection
2. **useVisualliStream** - Hook for fetching and parsing JSONL streams
3. **Extension Components** - Custom React components for rendering extensions

## Quick Start

### 1. Basic Setup with Provider

```tsx
import { VisualliProvider, VisualliCanvas } from '@mysdk/react';

function App() {
  const document = /* your parsed document */;

  return (
    <VisualliProvider>
      <VisualliCanvas document={document} />
    </VisualliProvider>
  );
}
```

### 2. With Parser Middleware

```tsx
import { VisualliProvider, VisualliCanvas } from '@mysdk/react';
import type { ParserMiddleware } from '@mysdk/core';

const myMiddleware: ParserMiddleware = (data) => {
  // Transform or filter JSONL data
  if (data.type === 'extension') {
    return {
      ...data,
      processedAt: new Date().toISOString()
    };
  }
  return data;
};

function App() {
  return (
    <VisualliProvider middlewares={[myMiddleware]}>
      <VisualliCanvas document={document} />
    </VisualliProvider>
  );
}
```

### 3. With Extension Components

```tsx
import { VisualliProvider, VisualliCanvas } from '@mysdk/react';
import type { ExtensionComponentProps } from '@mysdk/react';

// Custom extension component
function MyExtension({ extension, document }: ExtensionComponentProps) {
  return (
    <div style={{ 
      position: 'absolute', 
      top: 20, 
      left: 20,
      pointerEvents: 'auto' 
    }}>
      <p>Extension: {extension.id}</p>
      <p>Data: {JSON.stringify(extension.data)}</p>
    </div>
  );
}

function App() {
  const extensions = {
    'my-extension-id': MyExtension,
  };

  return (
    <VisualliProvider extensions={extensions}>
      <VisualliCanvas document={document} />
    </VisualliProvider>
  );
}
```

### 4. With Stream Fetching

```tsx
import { VisualliProvider, useVisualliStream, VisualliCanvas } from '@mysdk/react';

function MindMapViewer({ apiUrl }: { apiUrl: string }) {
  const { document, isLoading, error, progress } = useVisualliStream(apiUrl);

  if (isLoading) {
    return <div>Loading... {progress}%</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!document) {
    return <div>No document loaded</div>;
  }

  return <VisualliCanvas document={document} isDark />;
}

function App() {
  return (
    <VisualliProvider>
      <MindMapViewer apiUrl="/api/mindmap/stream" />
    </VisualliProvider>
  );
}
```

## Complete Example

Here's a complete example combining all features:

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

// ─── Custom Middleware ─────────────────────────────────────────────────────

const extensionMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    // Add custom metadata
    return {
      ...data,
      enhanced: true,
      timestamp: new Date().toISOString()
    };
  }
  return data;
};

// ─── Custom Extension Components ───────────────────────────────────────────

function TooltipExtension({ extension, document }: ExtensionComponentProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
        maxWidth: '300px'
      }}
    >
      <button
        onClick={() => setVisible(false)}
        style={{ float: 'right', cursor: 'pointer' }}
      >
        ×
      </button>
      <h4 style={{ margin: '0 0 8px 0' }}>{extension.title || 'Extension'}</h4>
      <p style={{ margin: 0, fontSize: '14px' }}>
        {extension.description || 'No description'}
      </p>
    </div>
  );
}

function OverlayExtension({ extension, document }: ExtensionComponentProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        pointerEvents: 'none'
      }}
    >
      Layers: {document.layers?.size || 0} | 
      Extensions: {document.extensions?.size || 0}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

function MindMapApp() {
  const apiUrl = '/api/visualli/stream';
  
  const { document, isLoading, error, progress } = useVisualliStream(apiUrl);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div>Loading mind map...</div>
        <div style={{ 
          width: '200px', 
          height: '4px', 
          background: '#eee',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${progress}%`, 
            height: '100%', 
            background: '#4CAF50',
            transition: 'width 0.3s'
          }} />
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>{progress}%</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        color: 'red',
        background: '#fee'
      }}>
        <h3>Error loading document</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!document) {
    return <div>No document available</div>;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas 
        document={document} 
        isDark
        onNodeClick={(node) => {
          console.log('Node clicked:', node);
        }}
        onLayerChange={(layerId, layer) => {
          console.log('Layer changed:', layerId, layer);
        }}
      />
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────

export default function App() {
  // Define extension registry
  const extensions = {
    'tooltip': TooltipExtension,
    'overlay': OverlayExtension,
  };

  return (
    <VisualliProvider
      middlewares={[extensionMiddleware]}
      extensions={extensions}
    >
      <MindMapApp />
    </VisualliProvider>
  );
}
```

## Extension Component Guidelines

### 1. Positioning

Extension components are rendered in an overlay with `pointer-events: none`. To make interactive elements clickable, set `pointerEvents: 'auto'` on specific elements:

```tsx
function InteractiveExtension({ extension }: ExtensionComponentProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* This button will be clickable */}
      <button 
        style={{ 
          position: 'absolute', 
          top: 20, 
          right: 20,
          pointerEvents: 'auto' 
        }}
        onClick={() => console.log('Clicked!')}
      >
        Click me
      </button>
    </div>
  );
}
```

### 2. Accessing Document Data

Extension components receive the full document for cross-referencing:

```tsx
function LayerCountExtension({ extension, document }: ExtensionComponentProps) {
  const layerCount = document.layers?.size || 0;
  const nodeCount = Array.from(document.layers?.values() || [])
    .reduce((sum, layer) => sum + (layer.nodes?.length || 0), 0);

  return (
    <div style={{ position: 'absolute', top: 10, left: 10 }}>
      <p>Layers: {layerCount}</p>
      <p>Nodes: {nodeCount}</p>
    </div>
  );
}
```

### 3. State Management

Extensions can use React hooks normally:

```tsx
function StatefulExtension({ extension }: ExtensionComponentProps) {
  const [count, setCount] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    console.log('Extension mounted');
    return () => console.log('Extension unmounted');
  }, []);

  if (!visible) return null;

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, pointerEvents: 'auto' }}>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <button onClick={() => setVisible(false)}>Hide</button>
    </div>
  );
}
```

## Middleware Guidelines

### 1. Filtering Data

Return `null` to skip a line:

```typescript
const filterMiddleware: ParserMiddleware = (data) => {
  // Skip specific types
  if (data.type === 'unwanted') {
    return null;
  }
  return data;
};
```

### 2. Transforming Data

Return a modified object:

```typescript
const transformMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    return {
      ...data,
      enhanced: true,
      processedBy: 'myApp'
    };
  }
  return data;
};
```

### 3. Chaining Middlewares

Middlewares execute in order:

```typescript
const middleware1: ParserMiddleware = (data) => {
  console.log('First middleware:', data.type);
  return data;
};

const middleware2: ParserMiddleware = (data) => {
  console.log('Second middleware:', data.type);
  return { ...data, processed: true };
};

<VisualliProvider middlewares={[middleware1, middleware2]}>
  {/* ... */}
</VisualliProvider>
```

## API Reference

### VisualliProvider

```typescript
interface VisualliProviderProps {
  children: React.ReactNode;
  middlewares?: ParserMiddleware[];
  extensions?: ExtensionRegistry;
}
```

### useVisualli

```typescript
function useVisualli(): VisualliContextValue {
  middlewares: ParserMiddleware[];
  extensions: ExtensionRegistry;
}
```

### useVisualliStream

```typescript
function useVisualliStream(
  url: string | null
): UseVisualliStreamReturn {
  document: VisualliDocument | null;
  isLoading: boolean;
  error: Error | null;
  progress: number; // 0-100
}
```

### ExtensionComponentProps

```typescript
interface ExtensionComponentProps {
  extension: any; // The extension object from document.extensions
  document: any;  // Full document for cross-referencing
}
```

## Backward Compatibility

The extension system is fully backward compatible. Existing code continues to work without any changes:

```tsx
// ✅ Still works without provider
<VisualliCanvas document={document} />

// ✅ Still works with provider but no extensions
<VisualliProvider>
  <VisualliCanvas document={document} />
</VisualliProvider>
```

## Performance Considerations

1. **Memoize extension registries** to avoid unnecessary re-renders:
   ```tsx
   const extensions = React.useMemo(() => ({
     'ext1': Component1,
     'ext2': Component2,
   }), []);
   ```

2. **Use React.memo** for expensive extension components:
   ```tsx
   const MyExtension = React.memo(({ extension, document }: ExtensionComponentProps) => {
     // Expensive rendering logic
     return <div>...</div>;
   });
   ```

3. **Optimize middleware functions** as they run on every line:
   ```typescript
   // ✅ Good: Fast checks
   const middleware: ParserMiddleware = (data) => {
     if (data.type !== 'extension') return data;
     return processExtension(data);
   };

   // ❌ Bad: Expensive operation on every line
   const badMiddleware: ParserMiddleware = (data) => {
     const result = expensiveTransform(data); // Runs on every line!
     return result;
   };
   ```

## Migration Guide

### From Direct Parser Usage

**Before:**
```tsx
import { parseVisualliFile } from '@mysdk/core';

const doc = parseVisualliFile(jsonlString);
```

**After:**
```tsx
import { useVisualliStream } from '@mysdk/react';

const { document } = useVisualliStream(apiUrl);
```

### From Custom Canvas

**Before:**
```tsx
<MyCustomCanvas data={data} />
```

**After:**
```tsx
<VisualliProvider extensions={myExtensions}>
  <VisualliCanvas document={document} />
</VisualliProvider>
```

## Troubleshooting

### Extensions not rendering

1. Check that extension IDs match between document and registry
2. Verify the extension component is exported correctly
3. Check browser console for errors

### Middleware not executing

1. Ensure VisualliProvider wraps your components
2. Verify middleware is passed to the provider
3. Check that useVisualliStream is used (for stream-based loading)

### Performance issues

1. Memoize extension registries
2. Use React.memo for expensive components
3. Optimize middleware functions
4. Profile with React DevTools

## Next Steps

- See `PART2_COMPLETE.md` for implementation details
- Check `examples/` for more examples
- Read SDK core documentation for parser details
