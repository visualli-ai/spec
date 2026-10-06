// Docs-site loader: mounts the renderer into #visualli-renderer-root.
//
// The embed uses the SDK's design system (tokens, fonts, geometry) and follows
// the reader's light/dark choice in the docs (Material for MkDocs sets
// data-md-color-scheme on <body>: "slate" = dark, "default" = light).

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { VisualliRenderer } from '@visualli/react';

// Resolved at load time: document.currentScript is only set while the script executes.
const scriptSrc = (document.currentScript as HTMLScriptElement | null)?.src;
// The docs build copies the design system's font files next to the loader bundle (docs/assets/fonts).
const fontBaseUrl = scriptSrc ? new URL('../assets/fonts', scriptSrc).href : undefined;

const readerTheme = () => (document.body.getAttribute('data-md-color-scheme') === 'slate' ? 'dark' : 'light');

function Embed({ source }: { source?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(readerTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readerTheme()));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
    return () => observer.disconnect();
  }, []);
  return (
    <VisualliRenderer
      visualliFile={source || undefined}
      useWorker={true}
      theme={theme}
      comfort={{ reducedMotion: 'system' }}
      fontBaseUrl={fontBaseUrl}
      width="100%"
      height="500px"
    />
  );
}

const rootElement = document.getElementById('visualli-renderer-root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Embed source={rootElement.getAttribute('data-source') ?? undefined} />
    </React.StrictMode>,
  );
}
