/**
 * Automatic Instrumentation Example
 *
 * Demonstrates automatic instrumentation features
 */

import {
  initializeInstrumentation,
  measure,
  trackFunction,
  trackAsyncFunction,
  monitorLongTasks,
  monitorResourceLoading,
  getPerformanceTracker
} from '../src/index';

async function automaticInstrumentation() {
  console.log('=== Automatic Instrumentation Example ===\n');

  // Initialize automatic instrumentation
  console.log('Initializing automatic instrumentation...');
  initializeInstrumentation({
    fetch: true,
    longTasks: true,
    resourceLoading: true
  });

  // Measure a code block
  console.log('\n1. Measuring code block...');
  const result = measure('expensive-calculation', 'custom', () => {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  });
  console.log(`Result: ${result}`);

  // Measure an async code block
  console.log('\n2. Measuring async code block...');
  const asyncOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'completed';
  };
  await measureAsync('async-operation', 'api', asyncOperation);

  // Wrap a function
  console.log('\n3. Wrapping function with tracking...');
  const fetchDataFn = (url: string) => {
    console.log(`Fetching data from ${url}...`);
    return { data: 'sample data' };
  };
  const fetchData = trackFunction('fetch-data', 'network', fetchDataFn);

  const data = fetchData('https://api.example.com');
  console.log(`Data: ${data.data}`);

  // Wrap an async function
  console.log('\n4. Wrapping async function with tracking...');
  const asyncFetchFn = async (url: string) => {
    console.log(`Async fetching from ${url}...`);
    await new Promise(resolve => setTimeout(resolve, 50));
    return { response: 'sample response' };
  };
  const asyncFetch = trackAsyncFunction('async-fetch', 'api', asyncFetchFn);

  const response = await asyncFetch('https://api.example.com');
  console.log(`Response: ${response.response}`);

  // Monitor long tasks
  console.log('\n5. Setting up long task monitoring...');
  const stopLongTaskMonitoring = monitorLongTasks((task) => {
    console.log(`Long task detected: ${task.duration.toFixed(0)}ms`);
  });

  // Simulate a long task
  console.log('Simulating a long task...');
  const start = performance.now();
  while (performance.now() - start < 100) {
    // Blocking operation
  }

  // Monitor resource loading
  console.log('\n6. Setting up resource loading monitoring...');
  const stopResourceMonitoring = monitorResourceLoading((resource) => {
    console.log(`Resource loaded: ${resource.name} (${resource.duration.toFixed(0)}ms)`);
  });

  // Wait a bit to collect some metrics
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get performance summary
  console.log('\n=== Performance Summary ===');
  const tracker = getPerformanceTracker();
  const summary = tracker.getPerformanceSummary();
  console.log(`Total Operations: ${summary.totalOperations}`);
  console.log(`Success Rate: ${(summary.successRate * 100).toFixed(1)}%`);
  console.log(`Average Duration: ${summary.avgDuration.toFixed(2)}ms`);

  // Show category breakdown
  console.log('\n=== Category Breakdown ===');
  summary.categoryBreakdown.forEach(cat => {
    console.log(`${cat.category}: ${cat.count} operations, ${cat.avgDuration.toFixed(2)}ms avg`);
  });

  // Clean up monitoring
  stopLongTaskMonitoring();
  stopResourceMonitoring();

  console.log('\nExample completed!');
}

// Run the example
automaticInstrumentation().catch(console.error);
