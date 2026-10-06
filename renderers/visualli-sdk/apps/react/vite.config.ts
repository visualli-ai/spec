import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Pre-bundle CJS packages so Vite converts them to browser-compatible ESM.
    // This prevents "Dynamic require of X is not supported" errors.
    include: [
      'konva',
      'react-konva',
      'zustand',
      'use-sync-external-store',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
    ],
  },
  server: {
    port: 1100,
  },
  build: {
    // bench.html is the benchmark page driven by scripts/bench.mjs.
    rollupOptions: { input: { main: 'index.html', bench: 'bench.html' } },
  },
});
