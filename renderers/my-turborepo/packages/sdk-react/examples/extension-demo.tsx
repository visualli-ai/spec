/**
 * Extension System Demo
 * 
 * This example demonstrates the complete extension system in @mysdk/react
 * including provider, middlewares, extension components, and streaming.
 */

import React from 'react';
import { 
  VisualliProvider, 
  useVisualliStream, 
  VisualliCanvas 
} from '../src/index';
import type { 
  ParserMiddleware, 
  ExtensionComponentProps 
} from '../src/index';

// ─── Custom Middleware ─────────────────────────────────────────────────────

/**
 * Middleware to enhance extension data
 */
const extensionEnhancerMiddleware: ParserMiddleware = (data) => {
  if (data.type === 'extension') {
    console.log('[Middleware] Processing extension:', data.id);
    return {
      ...data,
      processedAt: new Date().toISOString(),
      enhanced: true
    };
  }
  return data;
};

/**
 * Middleware to filter unwanted data
 */
const filterMiddleware: ParserMiddleware = (data) => {
  // Example: skip extensions marked as draft
  if (data.type === 'extension' && data.draft === true) {
    console.log('[Middleware] Filtering draft extension:', data.id);
    return null;
  }
  return data;
};

/**
 * Middleware for logging
 */
const loggingMiddleware: ParserMiddleware = (data) => {
  console.log('[Middleware] Parsed line:', data.type, data.id || '');
  return data;
};

// ─── Extension Components ──────────────────────────────────────────────────

/**
 * Simple tooltip extension that appears in the top-right corner
 */
function TooltipExtension({ extension, document }: ExtensionComponentProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  const ext = extension as any;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        maxWidth: '300px',
        pointerEvents: 'auto', // Make interactive
        zIndex: 100
      }}
    >
      <button
        onClick={() => setVisible(false)}
        style={{
          float: 'right',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0 4px'
        }}
      >
        ×
      </button>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
        {ext.title || 'Extension Info'}
      </h3>
      <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
        {ext.description || 'No description available'}
      </p>
      {ext.enhanced && (
        <p style={{ margin: 0, fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
          Processed by middleware at {ext.processedAt?.substring(11, 19)}
        </p>
      )}
    </div>
  );
}

/**
 * Stats overlay that shows document information
 */
function StatsOverlay({ extension, document }: ExtensionComponentProps) {
  const layerCount = document.layers?.size || 0;
  const extensionCount = document.extensions?.size || 0;
  
  // Count total nodes across all layers
  const nodeCount = React.useMemo(() => {
    let count = 0;
    if (document.layers) {
      for (const layer of document.layers.values()) {
        count += layer.nodes?.length || 0;
      }
    }
    return count;
  }, [document]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'monospace',
        pointerEvents: 'none'
      }}
    >
      <div>📊 Document Stats</div>
      <div style={{ marginTop: '8px', opacity: 0.9 }}>
        Layers: {layerCount} | Nodes: {nodeCount} | Extensions: {extensionCount}
      </div>
    </div>
  );
}

/**
 * Interactive banner extension
 */
function BannerExtension({ extension }: ExtensionComponentProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const ext = extension as any;

  if (dismissed) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        zIndex: 100
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 500 }}>
        {ext.message || '🎉 Welcome to the enhanced mind map viewer!'}
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px'
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

// ─── Main Viewer Component ─────────────────────────────────────────────────

interface ViewerProps {
  url: string | null;
  enableLogging?: boolean;
}

function MindMapViewer({ url, enableLogging }: ViewerProps) {
  const { document, isLoading, error, progress } = useVisualliStream(url);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          background: '#f5f5f5'
        }}
      >
        <div style={{ fontSize: '18px', fontWeight: 500 }}>
          Loading mind map...
        </div>
        
        {/* Progress bar */}
        <div
          style={{
            width: '300px',
            height: '6px',
            background: '#e0e0e0',
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        
        <div style={{ fontSize: '14px', color: '#666' }}>
          {progress}% complete
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          background: '#fff5f5'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#c53030' }}>
          Error Loading Document
        </div>
        <div style={{ fontSize: '14px', color: '#666', textAlign: 'center', maxWidth: '500px' }}>
          {error.message}
        </div>
      </div>
    );
  }

  // No document
  if (!document) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: '16px',
          color: '#999'
        }}
      >
        No document loaded
      </div>
    );
  }

  // Render canvas
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VisualliCanvas
        document={document}
        isDark
        onNodeClick={(node) => {
          if (enableLogging) {
            console.log('Node clicked:', node.id, node.label);
          }
        }}
        onLayerChange={(layerId, layer) => {
          if (enableLogging) {
            console.log('Layer changed:', layerId, 'Level:', layer.level);
          }
        }}
      />
    </div>
  );
}

// ─── App Root ──────────────────────────────────────────────────────────────

export default function ExtensionDemo() {
  // Configuration
  const apiUrl = '/api/mindmap/stream'; // Your backend endpoint
  const enableLogging = true;

  // Define extension registry
  const extensionRegistry = React.useMemo(() => ({
    'tooltip': TooltipExtension,
    'stats': StatsOverlay,
    'banner': BannerExtension,
  }), []);

  // Define middlewares
  const middlewares = React.useMemo(() => {
    const mws: ParserMiddleware[] = [
      extensionEnhancerMiddleware,
      filterMiddleware,
    ];
    
    if (enableLogging) {
      mws.push(loggingMiddleware);
    }
    
    return mws;
  }, [enableLogging]);

  return (
    <VisualliProvider
      middlewares={middlewares}
      extensions={extensionRegistry}
    >
      <MindMapViewer url={apiUrl} enableLogging={enableLogging} />
    </VisualliProvider>
  );
}

// ─── Alternative: Static Document Example ─────────────────────────────────

/**
 * Example using a pre-parsed document instead of streaming
 */
export function StaticDocumentDemo() {
  // Simulated document (in real app, this would come from your data source)
  const mockDocument = {
    meta: { version: '1.0.0', schema: 'visualli' },
    extensions: new Map([
      ['tooltip', { 
        id: 'tooltip',
        type: 'extension',
        title: 'Welcome!',
        description: 'This is a custom extension component.',
        enhanced: true,
        processedAt: new Date().toISOString()
      }],
      ['stats', { 
        id: 'stats',
        type: 'extension'
      }]
    ]),
    layers: new Map([
      ['root', {
        id: 'root',
        level: 0,
        nodes: [
          { id: 'n1', x: 0, y: 0, data: { label: 'Root Node' }, width: 200 }
        ]
      }]
    ]),
    layersByLevel: new Map([[0, []]]),
    rootLayer: { id: 'root', level: 0, nodes: [] }
  } as any;

  const extensions = React.useMemo(() => ({
    'tooltip': TooltipExtension,
    'stats': StatsOverlay,
  }), []);

  return (
    <VisualliProvider extensions={extensions}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <VisualliCanvas document={mockDocument} isDark={false} />
      </div>
    </VisualliProvider>
  );
}
