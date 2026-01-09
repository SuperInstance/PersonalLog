/**
 * SmartCost Dashboard - Individual Components Example
 *
 * Examples showing how to use individual dashboard components
 */

'use client';

import React, { useState } from 'react';
import {
  CostOverviewCard,
  ProviderComparisonChart,
  CostTrendGraph,
  BudgetProgressBar,
  AlertList,
  ConfigurationPanel,
} from '../index';
import type { DashboardConfig, DashboardAlert } from '../types/dashboard';

// Mock data
const mockCostMetrics = {
  totalCost: 342.50,
  totalTokens: 12500000,
  totalRequests: 4500,
  cacheHitRate: 0.72,
  totalSavings: 156.80,
  savingsPercent: 31.4,
  avgCostPerRequest: 0.076,
  avgTokensPerRequest: 2778,
  costByProvider: {
    'openai': 210.30,
    'anthropic': 132.20,
  },
  costByModel: {
    'gpt-4': 180.50,
    'gpt-3.5-turbo': 29.80,
    'claude-3-opus': 110.20,
    'claude-3-sonnet': 22.00,
  },
  requestsByProvider: {
    'openai': 2800,
    'anthropic': 1700,
  },
  budgetUtilization: 0.685,
  periodStart: Date.now() - 30 * 24 * 60 * 60 * 1000,
  periodEnd: Date.now(),
};

const mockProviderUsage = [
  {
    provider: 'OpenAI',
    requestCount: 2800,
    totalCost: 210.30,
    avgCostPerRequest: 0.075,
    usagePercent: 61.4,
  },
  {
    provider: 'Anthropic',
    requestCount: 1700,
    totalCost: 132.20,
    avgCostPerRequest: 0.078,
    usagePercent: 38.6,
  },
];

const mockCostHistory = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    timestamp: date.getTime(),
    cost: Math.random() * 20 + 5,
    cumulativeCost: (Math.random() * 20 + 5) * (i + 1),
    savings: Math.random() * 5 + 1,
    budgetUtilization: ((i + 1) / 30) * 0.7,
  };
});

const mockAlerts: DashboardAlert[] = [
  {
    id: '1',
    type: 'budget_warning',
    severity: 'warning',
    title: 'Approaching Budget Limit',
    message: 'You have used 75% of your monthly budget.',
    timestamp: Date.now() - 3600000,
    acknowledged: false,
    actions: [
      {
        label: 'View Usage',
        handler: () => console.log('View usage'),
        type: 'primary',
      },
    ],
  },
  {
    id: '2',
    type: 'cache_hit',
    severity: 'info',
    title: 'Cache Performance Improved',
    message: 'Cache hit rate increased to 72% this week.',
    timestamp: Date.now() - 7200000,
    acknowledged: true,
  },
];

export function IndividualComponentsExample() {
  const [config, setConfig] = useState<DashboardConfig>({});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Individual Components Demo
        </h1>

        {/* Cost Overview */}
        <CostOverviewCard
          metrics={mockCostMetrics}
          budget={500}
          showSparkline={true}
          timeRange="30d"
        />

        {/* Budget Progress */}
        <BudgetProgressBar
          used={mockCostMetrics.totalCost}
          total={500}
          alertThreshold={80}
          showPercentage={true}
          showRemaining={true}
        />

        {/* Provider Comparison */}
        <ProviderComparisonChart
          providers={mockProviderUsage}
          chartType="bar"
          metric="cost"
        />

        {/* Cost Trends */}
        <CostTrendGraph
          history={mockCostHistory}
          budget={500}
          showBudgetLine={true}
          showPredictions={true}
          chartType="area"
        />

        {/* Alerts */}
        <AlertList
          alerts={mockAlerts}
          onAcknowledge={(id) => console.log('Acknowledged:', id)}
          onDismiss={(id) => console.log('Dismissed:', id)}
        />

        {/* Configuration Panel */}
        <ConfigurationPanel
          config={config}
          onChange={setConfig}
          onSave={() => console.log('Saved:', config)}
          onReset={() => console.log('Reset')}
        />
      </div>
    </div>
  );
}

// Custom layout example
export function CustomLayoutExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
      <div className="lg:col-span-2">
        <CostOverviewCard
          metrics={mockCostMetrics}
          budget={500}
        />
      </div>

      <div>
        <BudgetProgressBar
          used={mockCostMetrics.totalCost}
          total={500}
        />
      </div>

      <div>
        <AlertList
          alerts={mockAlerts}
          maxAlerts={5}
        />
      </div>

      <div className="lg:col-span-2">
        <ProviderComparisonChart
          providers={mockProviderUsage}
          chartType="donut"
        />
      </div>
    </div>
  );
}
