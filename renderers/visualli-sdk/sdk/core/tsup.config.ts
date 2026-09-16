import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/layout/index.ts',
    'src/parser/index.ts',
    'src/constants/index.ts',
    'src/viewport/index.ts',
    'src/performance/index.ts',
    'src/animations/index.ts',
    'src/config/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});