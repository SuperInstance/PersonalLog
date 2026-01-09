/**
 * Example 6: Monitoring and Metrics
 *
 * Demonstrates comprehensive monitoring capabilities:
 * - Real-time execution tracking
 * - Performance metrics and statistics
 * - Success rate monitoring
 * - Execution history queries
 * - Threshold-based alerting
 *
 * @module examples/monitoring-metrics
 */

import { ToolGuardian, SchemaType } from '../src/index.js';
import type { ExecutionResult } from '../src/types.js';

async function monitoringAndMetrics() {
  console.log('=== ToolGuardian: Monitoring and Metrics ===\n');

  // Define tools for monitoring
  const tools = {
    // Fast, reliable tool
    fastApi: {
      name: 'fastApi',
      description: 'Fast API call',
      fn: async ({ delay = 50 }) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return { message: 'Fast API completed', timestamp: Date.now() };
      },
      schema: {
        input: {
          delay: { type: SchemaType.NUMBER, default: 50 }
        }
      }
    },

    // Variable speed tool
    variableApi: {
      name: 'variableApi',
      description: 'API with variable response time',
      fn: async () => {
        const delay = Math.random() * 300 + 50; // 50-350ms
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delay, timestamp: Date.now() };
      },
      schema: {
        input: {}
      }
    },

    // Occasionally failing tool
    flakyApi: {
      name: 'flakyApi',
      description: 'API that fails 30% of the time',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (Math.random() < 0.3) {
          throw new Error('Flaky API failed');
        }
        return { success: true };
      },
      schema: {
        input: {}
      }
    },

    // Heavy computation
    heavyComputation: {
      name: 'heavyComputation',
      description: 'Performs heavy calculation',
      fn: async ({ iterations }) => {
        let result = 0;
        for (let i = 0; i < iterations; i++) {
          result += Math.sqrt(i);
        }
        return { result, iterations };
      },
      schema: {
        input: {
          iterations: { type: SchemaType.NUMBER, default: 10000 }
        }
      }
    }
  };

  // Create guardian with monitoring enabled
  const guardian = new ToolGuardian({
    tools,
    enableMonitoring: true,
    monitoringConfig: {
      alertThresholds: {
        slowExecution: 200, // Alert if execution takes > 200ms
        lowSuccessRate: 0.7, // Alert if success rate drops below 70%
        highFailureRate: 0.3 // Alert if failure rate exceeds 30%
      },
      retentionPeriod: 60000 // Keep history for 1 minute
    }
  });

  console.log('1. Real-time monitoring events:\n');

  // Subscribe to monitoring events
  guardian.on('execution:complete', (data) => {
    console.log(`  ✓ Complete: ${data.toolName} (${data.duration}ms)`);
  });

  guardian.on('execution:failed', (data) => {
    console.log(`  ✗ Failed: ${data.toolName} - ${data.error?.message}`);
  });

  guardian.on('execution:slow', (data) => {
    console.log(`  ⚠ Slow: ${data.toolName} took ${data.duration}ms (threshold: 200ms)`);
  });

  // Execute some tools to generate events
  console.log('  Executing tools...\n');
  await guardian.execute('fastApi', { delay: 50 });
  await guardian.execute('variableApi', {});
  await guardian.execute('variableApi', {});
  await guardian.execute('flakyApi', {});

  console.log('\n2. Current metrics:\n');

  const metrics = guardian.getMetrics();
  console.log(`  Total executions: ${metrics.totalExecutions}`);
  console.log(`  Successful: ${metrics.successfulExecutions}`);
  console.log(`  Failed: ${metrics.failedExecutions}`);
  console.log(`  Success rate: ${((metrics.successfulExecutions / metrics.totalExecutions) * 100).toFixed(1)}%`);
  console.log(`  Average time: ${metrics.averageExecutionTime.toFixed(2)}ms`);
  console.log(`  Slow executions: ${metrics.slowExecutions}`);
  console.log(`  Retried executions: ${metrics.retriedExecutions}\n`);

  console.log('3. Per-function metrics:\n');

  for (const [fn, count] of Object.entries(metrics.functionCallCounts)) {
    console.log(`  ${fn}:`);
    console.log(`    Calls: ${count}`);
    console.log(`    Success rate: ${guardian.getSuccessRate(fn).toFixed(1)}%`);
    console.log(`    Avg time: ${guardian.getAverageTime(fn).toFixed(2)}ms`);
  }

  console.log('\n4. Execution history:\n');

  const history = guardian.getHistory({ limit: 5 });
  console.log('  Recent executions (most recent first):');
  for (const entry of history) {
    const status = entry.result.status === 'success' ? '✓' : '✗';
    console.log(`    ${status} ${entry.toolName} - ${entry.duration}ms - ${new Date(entry.timestamp).toISOString().substring(11, 23)}`);
  }

  console.log('\n5. Filtered history by tool:\n');

  const flakyHistory = guardian.getHistory({ toolName: 'flakyApi' });
  console.log(`  flakyApi history: ${flakyHistory.length} executions`);
  for (const entry of flakyHistory) {
    const status = entry.result.status === 'success' ? '✓' : '✗';
    console.log(`    ${status} ${entry.duration}ms`);
  }

  console.log('\n6. Time-range queries:\n');

  const now = Date.now();
  const recentHistory = guardian.getHistory({
    startTime: now - 10000, // Last 10 seconds
    endTime: now
  });
  console.log(`  Executions in last 10 seconds: ${recentHistory.length}`);

  console.log('\n7. Performance percentiles:\n');

  const allTimes = guardian.getHistory().map(h => h.duration).sort((a, b) => a - b);
  if (allTimes.length > 0) {
    const p50 = allTimes[Math.floor(allTimes.length * 0.5)];
    const p90 = allTimes[Math.floor(allTimes.length * 0.9)];
    const p95 = allTimes[Math.floor(allTimes.length * 0.95)];
    const p99 = allTimes[Math.floor(allTimes.length * 0.99)];
    console.log(`  p50: ${p50}ms`);
    console.log(`  p90: ${p90}ms`);
    console.log(`  p95: ${p95}ms`);
    console.log(`  p99: ${p99}ms`);
  }

  console.log('\n8. Clearing history:\n');

  const countBefore = guardian.getHistory().length;
  guardian.clearHistory();
  const countAfter = guardian.getHistory().length;
  console.log(`  History before: ${countBefore} entries`);
  console.log(`  History after: ${countAfter} entries`);

  console.log('\n9. Custom monitoring with callbacks:\n');

  const customGuardian = new ToolGuardian({
    tools: {
      monitoredTask: {
        name: 'monitoredTask',
        description: 'Task with custom monitoring',
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { done: true };
        },
        schema: { input: {} }
      }
    },
    enableMonitoring: true
  });

  // Track executions with custom callback
  const executionTimes: number[] = [];

  customGuardian.on('execution:complete', (data) => {
    executionTimes.push(data.duration);
  });

  await customGuardian.execute('monitoredTask', {});
  await customGuardian.execute('monitoredTask', {});

  console.log(`  Custom tracked times: [${executionTimes.join(', ')}]ms`);

  console.log('\n10. Export metrics for external systems:\n');

  const metricsForExport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: metrics.totalExecutions,
      successful: metrics.successfulExecutions,
      failed: metrics.failedExecutions,
      avgTime: metrics.averageExecutionTime
    },
    byTool: Object.fromEntries(
      Object.keys(metrics.functionCallCounts).map(tool => [
        tool,
        {
          calls: metrics.functionCallCounts[tool],
          successRate: guardian.getSuccessRate(tool),
          avgTime: guardian.getAverageTime(tool)
        }
      ])
    )
  };

  console.log('  Exportable metrics:');
  console.log(JSON.stringify(metricsForExport, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  console.log('\n✓ Monitoring and metrics demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  monitoringAndMetrics().catch(console.error);
}

export { monitoringAndMetrics };
