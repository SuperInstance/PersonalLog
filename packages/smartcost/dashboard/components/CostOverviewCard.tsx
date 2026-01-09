/**
 * SmartCost Dashboard - Cost Overview Card Component
 *
 * Displays current cost metrics with sparkline visualization
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
} from 'lucide-react';
import type { CostOverviewCardProps } from '../types/dashboard';

export const CostOverviewCard: React.FC<CostOverviewCardProps> = ({
  metrics,
  budget,
  currency = 'USD',
  showSparkline = true,
  timeRange = '30d',
}) => {
  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /**
   * Format number with suffixes
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(0);
  };

  /**
   * Calculate budget utilization percentage
   */
  const budgetUtilization = useMemo(() => {
    return (metrics.totalCost / budget) * 100;
  }, [metrics.totalCost, budget]);

  /**
   * Determine budget status
   */
  const budgetStatus = useMemo(() => {
    if (budgetUtilization >= 90) return { level: 'critical', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' };
    if (budgetUtilization >= 75) return { level: 'warning', color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950' };
    return { level: 'healthy', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' };
  }, [budgetUtilization]);

  /**
   * Calculate trend (placeholder - would use historical data)
   */
  const trend = useMemo(() => {
    // In real implementation, compare with previous period
    return {
      value: 12.5,
      direction: 'down' as 'up' | 'down',
    };
  }, []);

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
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Total Cost
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {timeRange === '1h' ? 'Last hour' :
               timeRange === '24h' ? 'Last 24 hours' :
               timeRange === '7d' ? 'Last 7 days' :
               timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </p>
          </div>
        </div>

        {/* Trend indicator */}
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
            trend.direction === 'up' ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'
          }`}>
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
            <span className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {Math.abs(trend.value)}%
            </span>
          </div>
        )}
      </div>

      {/* Main metric */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(metrics.totalCost)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            of {formatCurrency(budget)}
          </span>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Budget Utilization
          </span>
          <span className={`text-sm font-semibold ${budgetStatus.color}`}>
            {budgetUtilization.toFixed(1)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              budgetUtilization >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
              budgetUtilization >= 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
              'bg-gradient-to-r from-green-500 to-green-600'
            }`}
          />
        </div>

        {budgetUtilization > 100 && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium">
            Over budget by {formatCurrency(metrics.totalCost - budget)}
          </p>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Requests */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Requests
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatNumber(metrics.totalRequests)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Avg {formatCurrency(metrics.avgCostPerRequest)} per request
            </p>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Tokens
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatNumber(metrics.totalTokens)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Avg {formatNumber(metrics.avgTokensPerRequest)} per request
            </p>
          </div>
        </div>

        {/* Cache Hit Rate */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Cache Hit Rate
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {(metrics.cacheHitRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatNumber(metrics.totalRequests * metrics.cacheHitRate)} hits
            </p>
          </div>
        </div>

        {/* Savings */}
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Total Savings
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCurrency(metrics.totalSavings)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {metrics.savingsPercent.toFixed(1)}% reduction
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CostOverviewCard;
