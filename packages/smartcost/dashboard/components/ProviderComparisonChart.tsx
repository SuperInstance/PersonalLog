/**
 * SmartCost Dashboard - Provider Comparison Chart Component
 *
 * Visualizes provider usage and costs with beautiful charts
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  Server,
  DollarSign,
  Activity,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { ProviderComparisonChartProps } from '../types/dashboard';

// Chart colors
const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // green
  '#f97316', // orange
  '#6366f1', // indigo
];

export const ProviderComparisonChart: React.FC<ProviderComparisonChartProps> = ({
  providers,
  chartType = 'bar',
  metric = 'cost',
  timeRange = '30d',
}) => {
  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /**
   * Format number with suffixes
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  /**
   * Prepare chart data
   */
  const chartData = useMemo(() => {
    return providers.map((provider, index) => ({
      name: provider.provider,
      cost: provider.totalCost,
      requests: provider.requestCount,
      avgCost: provider.avgCostPerRequest,
      usage: provider.usagePercent,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [providers]);

  /**
   * Get metric label
   */
  const getMetricLabel = (): string => {
    switch (metric) {
      case 'cost':
        return 'Cost (USD)';
      case 'requests':
        return 'Requests';
      case 'latency':
        return 'Avg Latency (ms)';
      default:
        return 'Value';
    }
  };

  /**
   * Get metric value formatter
   */
  const formatMetricValue = (value: number): string => {
    switch (metric) {
      case 'cost':
        return formatCurrency(value);
      case 'requests':
        return formatNumber(value);
      case 'latency':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toString();
    }
  };

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">
            {data.name}
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Cost: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.cost)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Requests: <span className="font-medium text-gray-900 dark:text-white">{formatNumber(data.requests)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Avg Cost: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.avgCost)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Usage: <span className="font-medium text-gray-900 dark:text-white">{data.usage.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Provider Comparison
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {timeRange === '1h' ? 'Last hour' :
               timeRange === '24h' ? 'Last 24 hours' :
               timeRange === '7d' ? 'Last 7 days' :
               timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                className="text-xs"
              />
              <YAxis
                stroke="#6b7280"
                className="text-xs"
                tickFormatter={(value) => {
                  if (metric === 'cost') return `$${value}`;
                  return formatNumber(value);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey={metric}
                name={getMetricLabel()}
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey={metric}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === 'donut' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                innerRadius={60}
                fill="#8884d8"
                dataKey={metric}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Provider stats grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider, index) => (
          <motion.div
            key={provider.provider}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {provider.provider}
              </h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Cost
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(provider.totalCost)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Requests
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatNumber(provider.requestCount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Avg Cost
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(provider.avgCostPerRequest)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Usage
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {provider.usagePercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProviderComparisonChart;
