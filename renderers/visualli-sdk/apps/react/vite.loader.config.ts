import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-loader',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/loader.tsx'),
      name: 'VisualliLoader',
      formats: ['iife'],
      fileName: () => 'visualli-loader.bundle.js'
    },
    rollupOptions: {
      // Bundle everything (React, ReactDOM, etc.) into the IIFE
      external: [], 
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
