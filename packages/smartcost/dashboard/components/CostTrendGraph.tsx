/**
 * SmartCost Dashboard - Cost Trend Graph Component
 *
 * Displays cost trends over time with optional budget line and predictions
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import type { CostTrendGraphProps, CostHistoryPoint } from '../types/dashboard';

export const CostTrendGraph: React.FC<CostTrendGraphProps> = ({
  history,
  timeRange = '30d',
  showBudgetLine = true,
  budget,
  showPredictions = false,
  chartType = 'line',
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
   * Format date
   */
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  /**
   * Prepare chart data
   */
  const chartData = useMemo(() => {
    return history.map((point) => ({
      timestamp: point.timestamp,
      date: formatDate(point.timestamp),
      cost: point.cost,
      cumulativeCost: point.cumulativeCost,
      savings: point.savings,
      budgetUtilization: point.budgetUtilization * 100,
    }));
  }, [history]);

  /**
   * Calculate predicted data (simple linear regression)
   */
  const predictedData = useMemo(() => {
    if (!showPredictions || history.length < 2) return [];

    const lastPoint = history[history.length - 1];
    const firstPoint = history[0];
    const timeSpan = lastPoint.timestamp - firstPoint.timestamp;
    const costSlope = (lastPoint.cumulativeCost - firstPoint.cumulativeCost) / timeSpan;

    // Predict next 7 days
    const predictions = [];
    const predictionDays = 7;
    const msPerDay = 24 * 60 * 60 * 1000;

    for (let i = 1; i <= predictionDays; i++) {
      const futureTimestamp = lastPoint.timestamp + (i * msPerDay);
      const predictedCost = lastPoint.cumulativeCost + (costSlope * i * msPerDay);

      predictions.push({
        timestamp: futureTimestamp,
        date: formatDate(futureTimestamp),
        cost: 0,
        cumulativeCost: predictedCost,
        savings: 0,
        budgetUtilization: budget ? (predictedCost / budget) * 100 : 0,
        isPrediction: true,
      });
    }

    return predictions;
  }, [showPredictions, history, budget]);

  /**
   * Combined data with predictions
   */
  const combinedData = useMemo(() => {
    return showPredictions ? [...chartData, ...predictedData] : chartData;
  }, [chartData, predictedData, showPredictions]);

  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <p className="font-semibold text-gray-900 dark:text-white">
              {data.isPrediction ? `Predicted ${data.date}` : data.date}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Period Cost: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.cost)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Cumulative: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.cumulativeCost)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Savings: <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(data.savings)}</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Budget Used: <span className={`font-medium ${
                data.budgetUtilization >= 90 ? 'text-red-600 dark:text-red-400' :
                data.budgetUtilization >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>{data.budgetUtilization.toFixed(1)}%</span>
            </p>
            {data.isPrediction && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Prediction based on current trend
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  /**
   * Calculate if over budget
   */
  const isOverBudget = useMemo(() => {
    if (!budget) return false;
    const lastPoint = history[history.length - 1];
    return lastPoint.cumulativeCost > budget;
  }, [budget, history]);

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
          <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cost Trends
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {timeRange === '1h' ? 'Last hour' :
               timeRange === '24h' ? 'Last 24 hours' :
               timeRange === '7d' ? 'Last 7 days' :
               timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </p>
          </div>
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              Over Budget
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-80">
        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                className="text-xs"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                className="text-xs"
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Budget line */}
              {showBudgetLine && budget && (
                <ReferenceLine
                  y={budget}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: `Budget: ${formatCurrency(budget)}`,
                    position: 'topRight',
                    fill: '#ef4444',
                    fontSize: 12,
                  }}
                />
              )}

              {/* Cumulative cost line */}
              <Line
                type="monotone"
                dataKey="cumulativeCost"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Cumulative Cost"
                connectNulls={false}
              />

              {/* Predicted cost line (dashed) */}
              {showPredictions && predictedData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="cumulativeCost"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Predicted Cost"
                  data={combinedData.filter(d => d.isPrediction)}
                />
              )}

              {/* Savings line */}
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                name="Savings"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'area' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                className="text-xs"
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                className="text-xs"
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Budget line */}
              {showBudgetLine && budget && (
                <ReferenceLine
                  y={budget}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: `Budget: ${formatCurrency(budget)}`,
                    position: 'topRight',
                    fill: '#ef4444',
                    fontSize: 12,
                  }}
                />
              )}

              {/* Cumulative cost area */}
              <Area
                type="monotone"
                dataKey="cumulativeCost"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#costGradient)"
                name="Cumulative Cost"
              />

              {/* Savings area */}
              <Area
                type="monotone"
                dataKey="savings"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#savingsGradient)"
                name="Savings"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Cost
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(history[history.length - 1]?.cumulativeCost || 0)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Savings
            </span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(history[history.length - 1]?.savings || 0)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Budget Utilization
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            (history[history.length - 1]?.budgetUtilization || 0) >= 90 ? 'text-red-600 dark:text-red-400' :
            (history[history.length - 1]?.budgetUtilization || 0) >= 75 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-green-600 dark:text-green-400'
          }`}>
            {((history[history.length - 1]?.budgetUtilization || 0) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default CostTrendGraph;
