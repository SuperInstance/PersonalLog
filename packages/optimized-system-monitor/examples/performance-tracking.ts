/**
 * Performance Tracking Example
 *
 * Demonstrates performance tracking for operations
 */

import { getPerformanceTracker } from '../src/index';

async function performanceTracking() {
  const tracker = getPerformanceTracker();

  console.log('=== Performance Tracking Example ===\n');

  // Track a synchronous operation
  console.log('Tracking synchronous operation...');
  tracker.trackOperation('math-calculation', 'custom', () => {
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  });

  // Track an async operation
  console.log('Tracking async operation...');
  await tracker.trackOperationAsync('api-simulation', 'api', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: 'response' };
  });

  // Track multiple operations
  console.log('Tracking multiple operations...');
  for (let i = 0; i < 10; i++) {
    await tracker.trackOperationAsync('database-query', 'database', async () => {
      const delay = Math.random() * 50 + 10;
      await new Promise(resolve => setTimeout(resolve, delay));
      return { id: i };
    });
  }

  // Get statistics for a specific operation
  console.log('\n=== Database Query Statistics ===');
  const stats = tracker.getStats('database-query');
  if (stats) {
    console.log(`Count: ${stats.count}`);
    console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`Mean: ${stats.mean.toFixed(2)}ms`);
    console.log(`Median: ${stats.median.toFixed(2)}ms`);
    console.log(`P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`P99: ${stats.p99.toFixed(2)}ms`);
  }

  // Get category statistics
  console.log('\n=== API Category Statistics ===');
  const apiStats = tracker.getCategoryStats('api');
  if (apiStats) {
    console.log(`Total Operations: ${apiStats.totalOperations}`);
    console.log(`Average Duration: ${apiStats.avgDuration.toFixed(2)}ms`);
    console.log(`Success Rate: ${(apiStats.successRate * 100).toFixed(1)}%`);
  }

  // Get slowest operations
  console.log('\n=== Top 5 Slowest Operations ===');
  const slowest = tracker.getSlowestOperations(5);
  slowest.forEach((op, index) => {
    console.log(`${index + 1}. ${op.name}: ${op.duration.toFixed(2)}ms`);
  });

  // Get performance trend
  console.log('\n=== Performance Trend ===');
  const trend = tracker.getPerformanceTrend('database-query');
  if (trend) {
    console.log(`Operation: ${trend.operation}`);
    console.log(`Trend: ${trend.trend}`);
    console.log(`Change: ${trend.changePercent.toFixed(1)}%`);
  }

  // Generate report
  console.log('\n=== Performance Report ===');
  console.log(tracker.generateReport());

  // Get performance summary
  const summary = tracker.getPerformanceSummary();
  console.log('\n=== Performance Summary ===');
  console.log(`Total Operations: ${summary.totalOperations}`);
  console.log(`Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
  console.log(`Average Duration: ${summary.avgDuration.toFixed(2)}ms`);
}

// Run the example
performanceTracking().catch(console.error);
