/**
 * Example 1: Basic Cost Tracking for AI API Optimization
 *
 * This example demonstrates how to track costs for your AI API calls
 * Keywords: ai cost tracking, llm cost monitoring, api cost optimization, openai costs, anthropic costs
 *
 * Use case: Monitor and track your AI API spending in real-time
 * Benefits: Prevent budget overruns, understand spending patterns, optimize costs
 */

import { CostTracker } from '../src/index.js';

// Initialize cost tracker with budget
const tracker = new CostTracker({
  monthlyBudget: 500, // $500 per month
  alertThreshold: 0.8, // Alert at 80% budget usage
  enableMonitoring: true,
});

// Example: Track an OpenAI API call
function trackOpenAIRequest() {
  // Before making API call
  const startTracking = tracker.trackRequestStart(
    'openai',
    'gpt-4',
    {
      input: 1000, // estimated input tokens
      output: 500, // estimated output tokens
    },
    30, // $30 per million input tokens
    60  // $60 per million output tokens
  );

  console.log('Estimated cost:', startTracking.estimatedCost);
  console.log('Budget OK:', startTracking.budgetOk);

  // Simulate API call (in real usage, this would be your actual API call)
  // const response = await openai.chat.completions.create(...);

  // After API call completes
  const actualCost = tracker.trackRequestComplete(
    startTracking.requestId,
    'openai',
    'gpt-4',
    {
      input: 1200, // actual input tokens
      output: 450, // actual output tokens
      total: 1650,
    },
    30,
    60,
    2340 // request duration in ms
  );

  console.log('Actual cost:', actualCost.totalCost);
  console.log('Total spent this month:', tracker.getCostMetrics().totalCost);
}

// Example: Check budget status
function checkBudgetStatus() {
  const budget = tracker.getBudgetState();
  const metrics = tracker.getCostMetrics();

  console.log('Budget Status:');
  console.log(`  Total: $${budget.total}`);
  console.log(`  Used: $${budget.used.toFixed(4)}`);
  console.log(`  Remaining: $${budget.remaining.toFixed(4)}`);
  console.log(`  Utilization: ${(budget.utilization * 100).toFixed(2)}%`);
  console.log(`  Requests: ${metrics.totalRequests}`);
  console.log(`  Average cost per request: $${metrics.avgCostPerRequest.toFixed(6)}`);
}

// Example: Listen for budget alerts
tracker.on('budgetAlert', (alert) => {
  console.log(`Budget Alert [${alert.level}]:`);
  console.log(`  Utilization: ${(alert.utilization * 100).toFixed(2)}%`);
  console.log(`  Recommended action: ${alert.recommendedAction}`);
});

// Run examples
console.log('=== Basic Cost Tracking Example ===\n');
trackOpenAIRequest();
console.log();
checkBudgetStatus();

// Export for use in other examples
export { tracker };
