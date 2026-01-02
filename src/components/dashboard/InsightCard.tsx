'use client';

/**
 * Dashboard Insight Card Component
 *
 * Displays actionable insights from intelligence systems.
 * Shows bullet points with icons and color-coding per system.
 */

import { LucideIcon } from 'lucide-react';

export type InsightColor = 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'gray';

export interface InsightCardProps {
  icon: LucideIcon | React.ElementType;
  title: string;
  insights: string[];
  color: InsightColor;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function InsightCard({ icon: Icon, title, insights, color, action }: InsightCardProps) {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-900 dark:text-blue-100',
      subtext: 'text-blue-700 dark:text-blue-300',
      button: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-900 dark:text-purple-100',
      subtext: 'text-purple-700 dark:text-purple-300',
      button: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-900 dark:text-amber-100',
      subtext: 'text-amber-700 dark:text-amber-300',
      button: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      text: 'text-green-900 dark:text-green-100',
      subtext: 'text-green-700 dark:text-green-300',
      button: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      text: 'text-red-900 dark:text-red-100',
      subtext: 'text-red-700 dark:text-red-300',
      button: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      iconBg: 'bg-gray-100 dark:bg-gray-900/30',
      iconColor: 'text-gray-600 dark:text-gray-400',
      text: 'text-gray-900 dark:text-gray-100',
      subtext: 'text-gray-700 dark:text-gray-300',
      button: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900/30 hover:bg-gray-200 dark:hover:bg-gray-900/50',
    },
  };

  const config = colorConfig[color];

  return (
    <div className={`${config.bg} rounded-xl border ${config.border} overflow-hidden`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${config.iconBg}`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <h3 className={`font-semibold ${config.text}`}>{title}</h3>
        </div>

        {/* Insights */}
        <ul className="space-y-2">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className={`${config.iconColor} mt-1.5 flex-shrink-0`}>•</span>
              <span className={`text-sm ${config.subtext}`}>{insight}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-4 w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${config.button}`}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
