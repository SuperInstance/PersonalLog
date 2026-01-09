/**
 * SmartCost Dashboard - Budget Progress Bar Component
 *
 * Beautiful animated budget progress bar with color coding
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Wallet, TrendingUp } from 'lucide-react';
import type { BudgetProgressBarProps } from '../types/dashboard';

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  used,
  total,
  alertThreshold = 80,
  showPercentage = true,
  showRemaining = true,
  colorCode = true,
}) => {
  /**
   * Calculate utilization percentage
   */
  const utilization = useMemo(() => {
    return (used / total) * 100;
  }, [used, total]);

  /**
   * Calculate remaining
   */
  const remaining = useMemo(() => {
    return Math.max(0, total - used);
  }, [total, used]);

  /**
   * Determine status
   */
  const status = useMemo(() => {
    if (utilization >= 100) {
      return {
        level: 'exceeded' as const,
        color: 'from-red-500 to-red-600',
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-600 dark:text-red-400',
        icon: AlertTriangle,
      };
    }
    if (utilization >= 90) {
      return {
        level: 'critical' as const,
        color: 'from-red-500 to-orange-500',
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-600 dark:text-red-400',
        icon: AlertTriangle,
      };
    }
    if (utilization >= alertThreshold) {
      return {
        level: 'warning' as const,
        color: 'from-yellow-500 to-orange-500',
        bg: 'bg-yellow-50 dark:bg-yellow-950',
        text: 'text-yellow-600 dark:text-yellow-400',
        icon: AlertTriangle,
      };
    }
    if (utilization >= 50) {
      return {
        level: 'moderate' as const,
        color: 'from-blue-500 to-cyan-500',
        bg: 'bg-blue-50 dark:bg-blue-950',
        text: 'text-blue-600 dark:text-blue-400',
        icon: Wallet,
      };
    }
    return {
      level: 'healthy' as const,
      color: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-600 dark:text-green-400',
      icon: Wallet,
    };
  }, [utilization, alertThreshold]);

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
   * Calculate predicted usage (simple projection)
   */
  const predictedUtilization = useMemo(() => {
    // Placeholder: would use historical data for actual prediction
    return utilization * 1.2; // Assume 20% increase
  }, [utilization]);

  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${status.bg} rounded-lg`}>
            <StatusIcon className={`w-5 h-5 ${status.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Status
            </h3>
            <p className={`text-sm font-medium capitalize ${status.text}`}>
              {status.level}
            </p>
          </div>
        </div>

        {showPercentage && (
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {utilization.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              utilized
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(utilization, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${status.color}`}
          />
        </div>

        {/* Alert threshold marker */}
        {alertThreshold < 100 && (
          <div
            className="relative h-0"
            style={{ left: `${alertThreshold}%` }}
          >
            <div className="absolute top-0 w-0.5 h-4 bg-gray-400 dark:bg-gray-500" />
            <div className="absolute -top-6 -translate-x-1/2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
              Alert: {alertThreshold}%
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4">
        {/* Used */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Budget Used
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(used)}
          </p>
        </div>

        {/* Remaining */}
        {showRemaining && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Remaining
            </p>
            <p className={`text-lg font-semibold ${
              remaining > 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        )}
      </div>

      {/* Warning if over budget */}
      {utilization >= 100 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">
                Budget Exceeded
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                You have exceeded your budget by {formatCurrency(used - total)}. Consider upgrading your plan or optimizing usage.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warning if approaching budget */}
      {utilization >= alertThreshold && utilization < 100 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className={`mt-4 p-4 ${status.bg} border border-${status.level === 'warning' ? 'yellow' : 'red'}-200 dark:border-${status.level === 'warning' ? 'yellow' : 'red'}-800 rounded-lg`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 ${status.text} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`font-semibold ${status.text}`}>
                Approaching Budget Limit
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You have used {utilization.toFixed(1)}% of your budget. {formatCurrency(remaining)} remaining.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Prediction */}
      {utilization < 100 && predictedUtilization > utilization && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Projected Usage
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                    style={{ width: `${Math.min(predictedUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {predictedUtilization.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Based on current usage trends
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BudgetProgressBar;
