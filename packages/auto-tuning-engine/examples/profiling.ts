/**
 * Performance Profiling Example
 *
 * Demonstrates performance profiling with different profilers
 */

import {
  profiler,
  apiProfiler,
  componentProfiler,
  cacheProfiler,
} from '../src';

async function main() {
  console.log('=== Performance Profiling ===\n');

  // 1. Basic profiler usage
  console.log('1. Basic profiling:');
  const { result: data, profile } = await profiler.measure(
    'data-processing',
    async () => {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      return { data: 'processed' };
    }
  );

  console.log(`   Operation: ${profile.operation}`);
  console.log(`   Duration: ${profile.duration.toFixed(2)}ms`);
  console.log(`   Memory delta: ${profile.memory?.toFixed(2)}MB`);
  console.log(`   Score: ${profile.score}/100`);
  console.log(`   Bottleneck: ${profile.bottleneck || 'none'}`);
  console.log(`   Suggestion: ${profile.suggestion || 'none'}`);

  // 2. Get statistics
  console.log('\n2. Performance statistics:');
  const stats = profiler.getStats('data-processing');
  if (stats) {
    console.log(`   Average: ${stats.avg.toFixed(2)}ms`);
    console.log(`   Min: ${stats.min.toFixed(2)}ms`);
    console.log(`   Max: ${stats.max.toFixed(2)}ms`);
    console.log(`   P50: ${stats.p50.toFixed(2)}ms`);
    console.log(`   P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`   P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`   Count: ${stats.count}`);
  }

  // 3. Manual profiling
  console.log('\n3. Manual profiling:');
  const endProfile = profiler.start('manual-operation');

  // Do some work
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }

  const manualProfile = endProfile();
  console.log(`   Manual operation duration: ${manualProfile.duration.toFixed(2)}ms`);

  // 4. API profiling
  console.log('\n4. API profiling:');
  const apiResult = await apiProfiler.profileResponse('users', async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 250));
    return { users: [{ id: 1, name: 'Alice' }] };
  });

  console.log(`   API endpoint: ${apiResult.profile.operation}`);
  console.log(`   Duration: ${apiResult.profile.duration.toFixed(2)}ms`);

  const apiStats = apiProfiler.getResponseStats('users');
  if (apiStats) {
    console.log(`   API P95: ${apiStats.p95.toFixed(2)}ms`);
  }

  // 5. Component profiling
  console.log('\n5. Component profiling:');
  const renderProfile = componentProfiler.profileRender('UserList', () => {
    // Simulate component render
    const start = performance.now();
    while (performance.now() - start < 16) {
      // Simulate render work (16ms = 60fps)
    }
  });

  console.log(`   Component: ${renderProfile.operation}`);
  console.log(`   Render time: ${renderProfile.duration.toFixed(2)}ms`);
  console.log(`   Score: ${renderProfile.score}/100`);

  const renderStats = componentProfiler.getRenderStats('UserList');
  if (renderStats) {
    console.log(`   Average render time: ${renderStats.avg.toFixed(2)}ms`);
  }

  // 6. Cache profiling
  console.log('\n6. Cache profiling:');
  cacheProfiler.recordHit('user:123');
  cacheProfiler.recordHit('user:123');
  cacheProfiler.recordMiss('user:456');
  cacheProfiler.recordHit('user:789');
  cacheProfiler.recordMiss('user:abc');

  const cacheStats = cacheProfiler.getStats();
  console.log(`   Hits: ${cacheStats.hits}`);
  console.log(`   Misses: ${cacheStats.misses}`);
  console.log(`   Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

  // 7. All profiled operations
  console.log('\n7. All profiled operations:');
  const operations = profiler.getOperations();
  console.log(`   Total operations: ${operations.length}`);
  for (const op of operations) {
    const opStats = profiler.getStats(op);
    if (opStats) {
      console.log(`   - ${op}: ${opStats.avg.toFixed(2)}ms avg (${opStats.count} samples)`);
    }
  }
}

main().catch(console.error);
