import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/market/MarketEngine.ts', 'src/agent/Agent.ts', 'src/AgentSwarm.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  target: 'es2022',
  esbuildOptions(options) {
    options.platform = 'node';
    options.mainFields = ['module', 'main'];
  }
});
