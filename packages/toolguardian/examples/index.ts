/**
 * ToolGuardian Examples
 *
 * A collection of examples demonstrating all features of ToolGuardian.
 *
 * @module examples
 */

export { basicExecution } from './01-basic-execution.js';
export { retryWithFallback } from './02-retry-fallback.js';
export { prerequisitesAndChaining } from './03-prerequisites-chaining.js';
export { parallelExecution } from './04-parallel-execution.js';
export { sandboxAndTimeout } from './05-sandbox-timeout.js';
export { monitoringAndMetrics } from './06-monitoring-metrics.js';
export { intentParsing } from './07-intent-parsing.js';
export { hooksAndLifecycle } from './08-hooks-lifecycle.js';
export { advancedScenarios } from './09-advanced-scenarios.js';
export { realWorldIntegration } from './10-real-world-integration.js';

/**
 * Run all examples in sequence
 */
export async function runAllExamples() {
  const examples = [
    { name: 'Basic Execution', fn: basicExecution },
    { name: 'Retry with Fallback', fn: retryWithFallback },
    { name: 'Prerequisites and Chaining', fn: prerequisitesAndChaining },
    { name: 'Parallel Execution', fn: parallelExecution },
    { name: 'Sandbox and Timeout', fn: sandboxAndTimeout },
    { name: 'Monitoring and Metrics', fn: monitoringAndMetrics },
    { name: 'Intent Parsing', fn: intentParsing },
    { name: 'Hooks and Lifecycle', fn: hooksAndLifecycle },
    { name: 'Advanced Scenarios', fn: advancedScenarios },
    { name: 'Real World Integration', fn: realWorldIntegration }
  ];

  for (const example of examples) {
    try {
      await example.fn();
    } catch (error) {
      console.error(`Failed to run ${example.name}:`, error);
    }
  }
}
