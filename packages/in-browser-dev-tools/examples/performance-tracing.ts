/**
 * Example: Performance Tracing
 *
 * Demonstrates performance tracing and measurement capabilities.
 */

import { tracer, trace, traceSync, TraceCategory } from '@superinstance/in-browser-dev-tools';

// Simulate async operation
async function fetchUserData(userId: string): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: 'John Doe', email: 'john@example.com' });
    }, 100);
  });
}

// Simulate expensive computation
function sortLargeArray(arr: number[]): number[] {
  return arr.slice().sort((a, b) => a - b);
}

// Manual span tracing
async function demonstrateManualTracing() {
  console.log('=== Manual Span Tracing Demo ===\n');

  const spanId = tracer.startSpan('manual-operation', 'api');
  console.log(`Started span: ${spanId}`);

  try {
    // Do some work
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create child span
    const childSpanId = tracer.startSpan('child-operation', 'computation', spanId);
    await new Promise(resolve => setTimeout(resolve, 30));
    tracer.endSpan(childSpanId);

    tracer.endSpan(spanId);
  } catch (error) {
    tracer.endSpan(spanId, error instanceof Error ? error.message : String(error));
  }

  console.log('Spans completed');
}

// Automatic async tracing
async function demonstrateAsyncTracing() {
  console.log('\n=== Async Tracing Demo ===\n');

  const result = await trace(
    'fetch-user-and-posts',
    'api',
    async () => {
      const user = await fetchUserData('123');
      const posts = await Promise.all([
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
        { id: 3, title: 'Post 3' },
      ]);

      return { user, posts };
    },
    { userId: '123' }
  );

  console.log('Fetched data:', result);
}

// Sync tracing
function demonstrateSyncTracing() {
  console.log('\n=== Sync Tracing Demo ===\n');

  const largeArray = Array.from({ length: 10000 }, () => Math.random() * 1000);

  const sorted = traceSync(
    'sort-large-array',
    'computation',
    () => sortLargeArray(largeArray),
    { arraySize: largeArray.length }
  );

  console.log(`Sorted ${sorted.length} items`);
}

// Performance metrics
function demonstrateMetrics() {
  console.log('\n=== Performance Metrics Demo ===\n');

  const metrics = tracer.calculateMetrics();

  console.log('Total spans:', metrics.totalSpans);
  console.log('Completed spans:', metrics.completedSpans);
  console.log('Pending spans:', metrics.pendingSpans);
  console.log('Errored spans:', metrics.erroredSpans);
  console.log('Average duration:', `${metrics.avgDuration.toFixed(2)}ms`);
  console.log('Min duration:', `${metrics.minDuration.toFixed(2)}ms`);
  console.log('Max duration:', `${metrics.maxDuration.toFixed(2)}ms`);
  console.log('Total duration:', `${metrics.totalDuration.toFixed(2)}ms`);
  console.log('By category:', metrics.byCategory);
  console.log('By status:', metrics.byStatus);
}

// Slowest operations
function demonstrateSlowestOperations() {
  console.log('\n=== Slowest Operations Demo ===\n');

  const slowest = tracer.getSlowestSpans(5);

  console.log('Top 5 slowest operations:');
  slowest.forEach((span, index) => {
    console.log(
      `${index + 1}. ${span.name}: ${span.duration?.toFixed(2)}ms (${span.category})`
    );
  });
}

// Performance snapshots
function demonstrateSnapshots() {
  console.log('\n=== Performance Snapshots Demo ===\n');

  // Take multiple snapshots
  for (let i = 0; i < 5; i++) {
    const snapshot = tracer.takeSnapshot({
      iteration: i,
      customMetric: Math.random() * 100
    });

    if (snapshot) {
      console.log(`Snapshot ${i + 1}:`);
      console.log(`  Memory used: ${snapshot.memoryUsedMB.toFixed(2)}MB`);
      console.log(`  JS heap size: ${snapshot.jsHeapSizeMB.toFixed(2)}MB`);
    }

    // Simulate some work
    const arr = Array.from({ length: 100000 }, () => Math.random());
    arr.sort((a, b) => a - b);
  }

  // Get memory trend
  const trend = tracer.getMemoryTrend();
  console.log('\nMemory trend:');
  trend.forEach((point, index) => {
    console.log(`  ${index + 1}. ${point.usedMB.toFixed(2)}MB`);
  });
}

// Span tree
function demonstrateSpanTree() {
  console.log('\n=== Span Tree Demo ===\n');

  const tree = tracer.getSpanTree();

  function printTree(spans: any[], indent = 0) {
    spans.forEach((span) => {
      console.log(
        `${'  '.repeat(indent)}${span.name}: ${span.duration?.toFixed(2)}ms (${span.category})`
      );
      if (span.children.length > 0) {
        printTree(span.children, indent + 1);
      }
    });
  }

  printTree(tree);
}

// Category filtering
function demonstrateCategoryFiltering() {
  console.log('\n=== Category Filtering Demo ===\n');

  const apiSpans = tracer.getSpansByCategory('api');
  const computationSpans = tracer.getSpansByCategory('computation');

  console.log(`API spans: ${apiSpans.length}`);
  console.log(`Computation spans: ${computationSpans.length}`);

  console.log('\nAPI spans:');
  apiSpans.forEach((span) => {
    console.log(`  ${span.name}: ${span.duration?.toFixed(2)}ms`);
  });
}

// Export traces
function demonstrateExport() {
  console.log('\n=== Export Traces Demo ===\n');

  const exported = tracer.exportTraces();
  console.log(`Exported ${exported.length} characters of trace data`);

  // In real usage, you might save this to a file or send to a service
  // fs.writeFileSync('traces.json', exported);
}

// Run all demonstrations
async function main() {
  demonstrateManualTracing();
  await demonstrateAsyncTracing();
  demonstrateSyncTracing();
  demonstrateMetrics();
  demonstrateSlowestOperations();
  demonstrateSnapshots();
  demonstrateSpanTree();
  demonstrateCategoryFiltering();
  demonstrateExport();

  console.log('\n=== Demo Complete ===');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateManualTracing,
  demonstrateAsyncTracing,
  demonstrateSyncTracing,
  demonstrateMetrics,
  demonstrateSlowestOperations,
  demonstrateSnapshots,
  demonstrateSpanTree,
  demonstrateCategoryFiltering,
  demonstrateExport,
};
