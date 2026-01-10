import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: process.env.NODE_ENV === 'development' ? true : false,
  target: 'es2022',
  splitting: false,
  minify: process.env.NODE_ENV === 'production',
  treeshake: true,
  // Optimize bundle size by removing unused exports
  external: [],
});
