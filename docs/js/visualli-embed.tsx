import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisualliRenderer } from '@visualli/react';

function VisualliEmbed() {
  const container = document.getElementById('visualli-renderer-root');
  if (!container) return null;

  const source = container.getAttribute('data-source') || undefined;
  
  return (
    <div 
      style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #eee', 
        borderRadius: '8px', 
        overflow: 'visible',
        backgroundColor: '#fff',
        margin: '2em 0',
        position: 'relative',
        // This transform creates a containing block for position:fixed elements
        // The SDK calculates tooltip coordinates relative to the canvas,
        // so we need fixed positioning to be relative to this container
        transform: 'translate(0, 0)'
      }}
    >
      <VisualliRenderer 
        visualliFile={source} 
        theme="light" 
        width="100%" 
        height="100%" 
      />
    </div>
  );
}

const rootElement = document.getElementById('visualli-renderer-root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<VisualliEmbed />);
}
