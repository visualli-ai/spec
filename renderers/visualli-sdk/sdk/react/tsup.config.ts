import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Use konva's browser entry (not index-node.js which requires the 'canvas' package)
  platform: 'browser',
  banner: {
    js: "'use client';", // Directive for Next.js consumers
  },
  // react/react-dom stay external — bundling them causes duplicate React instance
  // errors ("Invalid hook call"). All consumers already have React installed.
  // zustand, konva, react-konva are in `dependencies` so they auto-install and
  // are resolved as proper ESM imports by the consumer's bundler (Vite/webpack).
  // Bundling react-konva alongside external react causes __require2('react') shims
  // which crash in the browser — so we let the consumer bundler handle them.
  external: ['react', 'react-dom'],
  // Lock NODE_ENV at build time so esbuild statically resolves all CJS
  // conditional branches inside zustand/use-sync-external-store.
  // Without this, esbuild emits a __require2 = createRequire(import.meta.url)
  // shim which is Node.js-only and crashes in browsers.
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});