# @superinstance/auto-tuning-engine

> Adaptive auto-optimization system that monitors performance, detects optimization opportunities, and applies improvements automatically with rollback safety.

[![npm version](https://badge.fury.io/js/%40superinstance%2Fauto-tuning-engine.svg)](https://www.npmjs.com/package/@superinstance/auto-tuning-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

- **Automatic Performance Monitoring** - Continuously monitors response time, cache hit rate, memory usage, frame rate, and more
- **Smart Opportunity Detection** - Identifies optimization opportunities based on performance baselines and thresholds
- **Safe Optimization Application** - Applies changes with automatic rollback on issues
- **Multiple Tuning Algorithms** - Hill climbing, Bayesian optimization, multi-armed bandit, and genetic algorithms
- **Performance Profiling** - Built-in profiler for API calls, component renders, and cache operations
- **Intelligent Recommendations** - Generates prioritized optimization suggestions with confidence scores
- **Zero Dependencies** - Works completely standalone with no external dependencies
- **TypeScript Support** - Fully typed with comprehensive TypeScript definitions

## 🚀 Quick Start

### Installation

```bash
npm install @superinstance/auto-tuning-engine
```

### Basic Usage

```typescript
import { autoTuner } from '@superinstance/auto-tuning-engine';

// Monitor current performance
const metrics = await autoTuner.monitor();
console.log('Response Time:', metrics.responseTime);
console.log('Cache Hit Rate:', metrics.cacheHitRate);
console.log('Memory Usage:', metrics.memoryUsage);

// Detect optimization opportunities
const opportunities = await autoTuner.detectOpportunities();
console.log(`Found ${opportunities.length} optimization opportunities`);

// Apply optimization with automatic rollback
if (opportunities.length > 0) {
  const result = await autoTuner.apply(opportunities[0]);

  if (result.success) {
    console.log('Optimization applied successfully');

    // Measure effectiveness after 30 seconds
    setTimeout(async () => {
      const effectiveness = await autoTuner.measure(result.optimizationId);
      console.log('Improvement:', effectiveness?.improvement);
    }, 30000);
  }
}
```

## 📖 Core Concepts

### Auto-Tuner

The `AutoTuner` continuously monitors your application's performance and automatically detects optimization opportunities.

```typescript
import { autoTuner } from '@superinstance/auto-tuning-engine';

// Get all tunable configurations
const configs = autoTuner.getAllTunableConfigs();
console.log('Tunable configs:', configs);

// Update a specific configuration
autoTuner.updateConfig('cacheMaxSize', 2000);

// Get optimization history
const history = autoTuner.getHistory();
console.log('Applied optimizations:', history.length);

// Rollback an optimization
await autoTuner.rollback(optimizationId);
```

### Config Tuner

The `ConfigTuner` uses various optimization algorithms to find optimal values for tunable parameters.

```typescript
import { configTuner } from '@superinstance/auto-tuning-engine';

// Register a tunable parameter
configTuner.registerParameter({
  name: 'apiTimeout',
  original: 10000,
  current: 10000,
  min: 5000,
  max: 30000,
  optimize: 'minimize',
  targets: ['response-latency'],
});

// Auto-tune with Bayesian optimization
const result = await configTuner.autoTune('apiTimeout', {
  exploration: 'bayesian',
});
console.log('Optimized value:', result.optimized);
console.log('Improvement:', result.improvement);

// Multi-objective optimization
const results = await configTuner.multiObjectiveTune(
  ['cacheMaxSize', 'apiTimeout'],
  [
    { metric: 'response-latency', direction: 'minimize', weight: 0.6 },
    { metric: 'memory-usage', direction: 'minimize', weight: 0.4 },
  ]
);
```

### Profiler

The `Profiler` measures performance of specific operations and identifies bottlenecks.

```typescript
import { profiler } from '@superinstance/auto-tuning-engine';

// Profile an async operation
const { result, profile } = await profiler.measure(
  'api-fetch-users',
  async () => {
    return fetch('/api/users').then(r => r.json());
  }
);

console.log('Duration:', profile.duration);
console.log('Memory delta:', profile.memory);
console.log('Bottleneck:', profile.bottleneck);
console.log('Suggestion:', profile.suggestion);

// Get statistics
const stats = profiler.getStats('api-fetch-users');
console.log('Average:', stats.avg);
console.log('P95:', stats.p95);
console.log('P99:', stats.p99);
```

### Recommender

The `Recommender` generates intelligent optimization suggestions based on performance metrics.

```typescript
import { recommender } from '@superinstance/auto-tuning-engine';

// Get recommendations
const recommendations = await recommender.suggest({
  context: 'web-app',
  constraints: {
    maxMemoryMB: 100,
    maxLatencyMs: 1000,
    minFrameRate: 60,
  },
  currentMetrics: {
    'response-latency': 1200,
    'memory-usage': 150,
    'frame-rate': 55,
  },
});

// Apply a recommendation
if (recommendations.length > 0) {
  const rec = recommendations[0];
  console.log('Suggestion:', rec.action);
  console.log('Expected improvement:', rec.expectedImprovement);
  console.log('Confidence:', rec.confidence);

  await recommender.applyRecommendation(rec);
}
```

## 🔧 Advanced Usage

### Custom Tunable Configurations

```typescript
import { autoTuner } from '@superinstance/auto-tuning-engine';

// Add custom tunable configuration
const config = autoTuner.getTunableConfig('cacheMaxSize');
if (config) {
  console.log('Current cache size:', config.current);
  console.log('Range:', config.min, '-', config.max);
  console.log('Category:', config.category);
}
```

### Optimization Algorithms

```typescript
import { configTuner } from '@superinstance/auto-tuning-engine';

// Hill climbing - fast local optimization
const hillClimbingResult = await configTuner.autoTune('apiTimeout', {
  exploration: 'hill_climbing',
});

// Bayesian optimization - balances exploration/exploitation
const bayesianResult = await configTuner.autoTune('cacheMaxSize', {
  exploration: 'bayesian',
});

// Multi-armed bandit - best for discrete choices
const banditResult = await configTuner.autoTune('batchSize', {
  exploration: 'bandit',
});

// Genetic algorithm - best for complex multi-parameter optimization
const geneticResult = await configTuner.autoTune('memoryLimit', {
  exploration: 'genetic',
});
```

### Specialized Profilers

```typescript
import { apiProfiler, componentProfiler, cacheProfiler } from '@superinstance/auto-tuning-engine';

// Profile API responses
const { result, profile } = await apiProfiler.profileResponse(
  'users',
  () => fetch('/api/users').then(r => r.json())
);

const apiStats = apiProfiler.getResponseStats('users');
console.log('API P95 latency:', apiStats.p95);

// Profile component renders
const renderProfile = componentProfiler.profileRender('UserList', () => {
  // ... render component
});
console.log('Render time:', renderProfile.duration);

// Profile cache operations
cacheProfiler.recordHit('user:123');
cacheProfiler.recordMiss('user:456');
const cacheStats = cacheProfiler.getStats();
console.log('Cache hit rate:', cacheStats.hitRate);
```

## 📊 Performance Metrics

The auto-tuner monitors the following metrics:

- **Response Time** - API and operation latency (ms)
- **Cache Hit Rate** - Cache effectiveness (0-1)
- **Memory Usage** - Memory consumption (MB)
- **Bundle Size** - JavaScript bundle size (KB)
- **Render Performance** - Frame rate (fps)
- **CPU Usage** - CPU consumption (0-100)
- **Error Rate** - Error frequency (0-1)

## 🔍 Optimization Targets

The following targets can be optimized:

### Performance
- `initial-load-time` - Application initial load time
- `response-latency` - API response latency
- `memory-usage` - Memory consumption
- `frame-rate` - Rendering frame rate
- `jank` - Frame jank/stuttering

### Quality
- `error-rate` - Error frequency
- `feature-reliability` - Feature availability
- `user-engagement` - User engagement metrics
- `user-satisfaction` - User satisfaction scores

### Resources
- `cpu-usage` - CPU consumption
- `memory-footprint` - Memory footprint
- `battery-drain` - Battery consumption
- `storage-usage` - Storage usage

### Config
- `batch-size` - Request batching size
- `cache-size` - Cache size
- `concurrency` - Concurrent operations
- `timeouts` - Operation timeouts

## 🛡️ Safety Features

### Automatic Rollback

Optimizations are automatically rolled back if:

- Performance degrades significantly
- Error rate increases
- Memory usage exceeds limits
- Frame rate drops below threshold

```typescript
const result = await autoTuner.apply(optimization);

// Manual rollback if needed
if (!result.success || hasIssues()) {
  await autoTuner.rollback(result.optimizationId);
}
```

### Risk Assessment

Each optimization includes:

- **Risk Level** (0-100) - How risky the change is
- **Confidence Score** (0-1) - How confident we are it will help
- **Expected Improvement** - Estimated performance gain
- **Reasoning** - Explanation of why this optimization is suggested

```typescript
const opportunities = await autoTuner.detectOpportunities();

// Filter by risk level
const safeOpportunities = opportunities.filter(opt => opt.riskLevel < 30);

// Filter by confidence
const confidentOpportunities = opportunities.filter(opt => opt.confidence > 0.8);

// Sort by expected improvement
opportunities.sort((a, b) => b.expectedImprovement - a.expectedImprovement);
```

## 🎯 Use Cases

### Web Application Performance

```typescript
import { autoTuner } from '@superinstance/auto-tuning-engine';

// Monitor and optimize web app performance
async function optimizeWebApp() {
  const metrics = await autoTuner.monitor();

  // Optimize if frame rate is low
  if (metrics.renderPerformance < 55) {
    const opportunities = await autoTuner.detectOpportunities();
    const renderOpts = opportunities.filter(opt => opt.type === 'rendering');

    for (const opt of renderOpts) {
      if (opt.riskLevel < 20) {
        await autoTuner.apply(opt);
      }
    }
  }
}
```

### API Performance

```typescript
import { apiProfiler } from '@superinstance/auto-tuning-engine';

async function monitorAPI(endpoint: string) {
  const { result, profile } = await apiProfiler.profileResponse(
    endpoint,
    () => fetch(`/api/${endpoint}`).then(r => r.json())
  );

  if (profile.duration > 1000) {
    console.log('Slow API detected:', endpoint);
    console.log('Suggestion:', profile.suggestion);
  }
}
```

### Cache Optimization

```typescript
import { cacheProfiler, autoTuner } from '@superinstance/auto-tuning-engine';

function optimizeCache() {
  const stats = cacheProfiler.getStats();

  if (stats.hitRate < 0.7) {
    // Increase cache size
    autoTuner.updateConfig('cacheMaxSize', 2000);
    autoTuner.updateConfig('cacheTTL', 600000);
  }
}
```

## 📈 Examples

See the `/examples` directory for complete working examples:

- `basic-monitoring.ts` - Basic performance monitoring
- `auto-optimization.ts` - Automatic optimization with rollback
- `config-tuning.ts` - Configuration tuning with different algorithms
- `profiling.ts` - Performance profiling examples
- `recommendations.ts` - Intelligent recommendation system

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [SuperInstance](https://github.com/SuperInstance)

## 🔗 Links

- [GitHub Repository](https://github.com/SuperInstance/Auto-Tuning-Engine)
- [Issue Tracker](https://github.com/SuperInstance/Auto-Tuning-Engine/issues)
- [NPM Package](https://www.npmjs.com/package/@superinstance/auto-tuning-engine)

---

Made with ❤️ by [SuperInstance](https://github.com/SuperInstance)
