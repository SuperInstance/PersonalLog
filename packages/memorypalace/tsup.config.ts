import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/storage/index.ts', 'src/retrieval/index.ts', 'src/sharing/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2022',
  splitting: false,
});
