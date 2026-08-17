import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisualliRenderer } from '@visualli/react';

const rootElement = document.getElementById('visualli-renderer-root');

if (rootElement) {
  const source = rootElement.getAttribute('data-source');
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <VisualliRenderer
        visualliFile={source || undefined}
        useWorker={true}
        theme="light"
        width="100%"
        height="500px"
      />
    </React.StrictMode>,
  );
}
