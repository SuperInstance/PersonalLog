'use client';

/**
 * Dashboard Status Card Component
 *
 * Displays system status with metrics, trends, and action buttons.
 * Used across the intelligence dashboard to show analytics, experiments,
 * optimization, and personalization system status.
 */

import { CheckCircle, AlertCircle, XCircle, Circle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export type SystemStatus = 'healthy' | 'warning' | 'error' | 'disabled';

export interface StatusCardProps {
  title: string;
  icon: React.ElementType;
  status: SystemStatus;
  primaryMetric: {
    value: string | number;
    label: string;
    trend?: number; // Positive = up, negative = down
  };
  secondaryMetric: {
    value: string | number;
    label: string;
  };
  href: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StatusCard({
  title,
  icon: Icon,
  status,
  primaryMetric,
  secondaryMetric,
  href,
  action,
}: StatusCardProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
      label: 'Healthy',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      label: 'Warning',
    },
    error: {
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      label: 'Error',
    },
    disabled: {
      icon: Circle,
      color: 'text-gray-400 dark:text-gray-600',
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      label: 'Disabled',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Link
      href={href}
      className={`group bg-white dark:bg-slate-900 rounded-xl border-2 transition-all hover:shadow-lg ${config.border}`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bg}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
        </div>

        {/* Primary Metric */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {primaryMetric.value}
            </span>
            {primaryMetric.trend !== undefined && (
              <span
                className={`text-sm font-medium ${
                  primaryMetric.trend >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {primaryMetric.trend >= 0 ? '↑' : '↓'}
                {Math.abs(primaryMetric.trend)}%
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {primaryMetric.label}
          </p>
        </div>

        {/* Secondary Metric */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {secondaryMetric.value}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {secondaryMetric.label}
              </p>
            </div>
            {action && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  action.onClick();
                }}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
