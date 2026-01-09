/**
 * Example 4: Budget Management for AI API Spending
 *
 * This example demonstrates comprehensive budget management features
 * Keywords: ai budget management, api cost control, spending limits, budget alerts, cost monitoring
 *
 * Use case: Set and enforce budgets for AI API usage
 * Benefits: Prevent surprise bills, control spending, optimize resource allocation
 */

import { CostTracker } from '../src/core/cost-tracker.js';
import type { SmartCostConfig, BudgetConfig } from '../src/types/index.js';

// Example 1: Monthly budget configuration
function setupMonthlyBudget() {
  const config: SmartCostConfig = {
    monthlyBudget: 500, // $500 per month
    alertThreshold: 0.8, // Alert at 80%
    budget: {
      monthlyLimit: 500,
      alertThreshold: 0.8,
      resetStrategy: 'monthly', // Reset on 1st of each month
    },
  };

  const tracker = new CostTracker(config);
  const budget = tracker.getBudgetState();

  console.log('Monthly Budget Setup:');
  console.log(`  Budget: $${budget.total}`);
  console.log(`  Alert threshold: ${(budget.alertThreshold * 100).toFixed(0)}%`);
  console.log(`  Period: ${new Date(budget.periodStart).toLocaleDateString()} - ${new Date(budget.periodEnd).toLocaleDateString()}`);

  return tracker;
}

// Example 2: Weekly budget for teams
function setupWeeklyBudget() {
  const config: SmartCostConfig = {
    monthlyBudget: 100, // $100 per week
    budget: {
      monthlyLimit: 100,
      alertThreshold: 0.7,
      resetStrategy: 'weekly',
      resetDay: 0, // Sunday
    },
  };

  const tracker = new CostTracker(config);
  const budget = tracker.getBudgetState();

  console.log('\nWeekly Budget Setup:');
  console.log(`  Budget: $${budget.total} per week`);
  console.log(`  Alert threshold: ${(budget.alertThreshold * 100).toFixed(0)}%`);
  console.log(`  Resets: Every Sunday`);

  return tracker;
}

// Example 3: Daily budget for development/testing
function setupDailyBudget() {
  const config: SmartCostConfig = {
    monthlyBudget: 10, // $10 per day for testing
    budget: {
      monthlyLimit: 10,
      alertThreshold: 0.5, // Alert at 50%
      resetStrategy: 'daily',
    },
  };

  const tracker = new CostTracker(config);

  console.log('\nDaily Budget Setup:');
  console.log(`  Budget: $${tracker.getBudgetState().total} per day`);
  console.log(`  Alert threshold: 50%`);

  return tracker;
}

// Example 4: Budget alerts and notifications
function setupBudgetAlerts(tracker: CostTracker) {
  // Warning level alert (80%)
  tracker.on('budgetAlert', (alert) => {
    if (alert.level === 'warning') {
      console.log(`\n⚠️  BUDGET WARNING`);
      console.log(`   Utilization: ${(alert.utilization * 100).toFixed(1)}%`);
      console.log(`   Remaining: $${alert.remaining.toFixed(2)}`);
      console.log(`   Action: ${alert.recommendedAction}`);
    }
  });

  // Critical level alert (90%)
  tracker.on('budgetAlert', (alert) => {
    if (alert.level === 'critical') {
      console.log(`\n🚨 BUDGET CRITICAL`);
      console.log(`   Utilization: ${(alert.utilization * 100).toFixed(1)}%`);
      console.log(`   Remaining: $${alert.remaining.toFixed(2)}`);
      console.log(`   Action: ${alert.recommendedAction}`);
    }
  });

  // Exceeded alert (100%)
  tracker.on('budgetAlert', (alert) => {
    if (alert.level === 'exceeded') {
      console.log(`\n❌ BUDGET EXCEEDED`);
      console.log(`   Utilization: ${(alert.utilization * 100).toFixed(1)}%`);
      console.log(`   Action: ${alert.recommendedAction}`);
    }
  });
}

// Example 5: Track spending and make decisions
async function makeRequestWithBudgetCheck(tracker: CostTracker) {
  const budget = tracker.getBudgetState();

  console.log('\nChecking budget before request...');
  console.log(`  Current usage: ${(budget.utilization * 100).toFixed(2)}%`);
  console.log(`  Remaining: $${budget.remaining.toFixed(4)}`);

  // Estimate request cost
  const estimatedCost = 0.001; // $0.001

  const startResult = tracker.trackRequestStart(
    'openai',
    'gpt-4',
    { input: 1000, output: 500 },
    30,
    60
  );

  if (!startResult.budgetOk) {
    console.log('\n❌ Request blocked: Budget limit reached');
    return;
  }

  console.log(`✅ Budget OK - Proceeding with request`);
  console.log(`   Estimated cost: $${startResult.estimatedCost.toFixed(6)}`);

  // Complete request
  tracker.trackRequestComplete(
    startResult.requestId,
    'openai',
    'gpt-4',
    { input: 1000, output: 500, total: 1500 },
    30,
    60,
    1500
  );

  console.log(`   Request completed`);
  console.log(`   New remaining: $${tracker.getBudgetState().remaining.toFixed(4)}`);
}

// Example 6: Budget projection
function projectBudgetUsage(tracker: CostTracker) {
  const metrics = tracker.getCostMetrics();
  const budget = tracker.getBudgetState();

  // Calculate average daily spend
  const daysInPeriod = (budget.periodEnd - budget.periodStart) / (1000 * 60 * 60 * 24);
  const daysElapsed = (Date.now() - budget.periodStart) / (1000 * 60 * 60 * 24);
  const avgDailySpend = metrics.totalCost / daysElapsed;

  // Project to end of period
  const daysRemaining = daysInPeriod - daysElapsed;
  const projectedSpend = metrics.totalCost + (avgDailySpend * daysRemaining);

  console.log('\n=== Budget Projection ===');
  console.log(`Period: ${daysInPeriod.toFixed(1)} days`);
  console.log(`Days elapsed: ${daysElapsed.toFixed(1)}`);
  console.log(`Days remaining: ${daysRemaining.toFixed(1)}`);
  console.log(`Current spend: $${metrics.totalCost.toFixed(2)}`);
  console.log(`Average daily: $${avgDailySpend.toFixed(2)}`);
  console.log(`Projected total: $${projectedSpend.toFixed(2)}`);

  if (projectedSpend > budget.total) {
    console.log(`⚠️  WARNING: Projected to exceed budget by $${(projectedSpend - budget.total).toFixed(2)}`);
  } else {
    console.log(`✅ On track to stay within budget`);
  }
}

// Example 7: Cost breakdown by provider/model
function showCostBreakdown(tracker: CostTracker) {
  const providerCosts = tracker.getProviderCosts();
  const modelCosts = tracker.getModelCosts();

  console.log('\n=== Cost Breakdown ===');

  console.log('\nBy Provider:');
  Object.entries(providerCosts).forEach(([provider, cost]) => {
    console.log(`  ${provider}: $${cost.toFixed(4)}`);
  });

  console.log('\nBy Model:');
  Object.entries(modelCosts).forEach(([model, cost]) => {
    console.log(`  ${model}: $${cost.toFixed(4)}`);
  });
}

// Example 8: Budget reset handling
function handleBudgetReset(tracker: CostTracker) {
  tracker.on('trackingReset', () => {
    console.log('\n🔄 Budget period reset - starting fresh period');
    const budget = tracker.getBudgetState();
    console.log(`  New period: ${new Date(budget.periodStart).toLocaleDateString()}`);
    console.log(`  Budget reset to: $${budget.total}`);
  });
}

// Comprehensive example: Full budget management workflow
async function budgetManagementWorkflow() {
  console.log('=== Budget Management Workflow ===\n');

  // Setup
  const tracker = setupMonthlyBudget();
  setupBudgetAlerts(tracker);
  handleBudgetReset(tracker);

  // Simulate usage
  console.log('\n--- Simulating API usage ---');

  for (let i = 0; i < 10; i++) {
    await makeRequestWithBudgetCheck(tracker);

    // Simulate some progress
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Show reports
  const metrics = tracker.getCostMetrics();
  const budget = tracker.getBudgetState();

  console.log('\n=== Current Status ===');
  console.log(`Total requests: ${metrics.totalRequests}`);
  console.log(`Total cost: $${metrics.totalCost.toFixed(4)}`);
  console.log(`Budget used: ${(budget.utilization * 100).toFixed(2)}%`);
  console.log(`Budget remaining: $${budget.remaining.toFixed(2)}`);

  showCostBreakdown(tracker);
  projectBudgetUsage(tracker);
}

// Run examples
console.log('Budget Management Examples\n');

budgetManagementWorkflow().catch(console.error);
