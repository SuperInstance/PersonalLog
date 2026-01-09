import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'shaders/index': 'src/shaders/index.ts',
    'workers/index': 'src/workers/index.ts'
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'es2020',
  external: ['@webgpu/types']
});
