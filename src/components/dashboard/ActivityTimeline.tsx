'use client';

/**
 * Dashboard Activity Timeline Component
 *
 * Displays recent activity from intelligence systems in a timeline format.
 * Shows timestamps, icons, and color-coded events.
 */

import { LucideIcon, Clock } from 'lucide-react';

export interface ActivityItem {
  id: string;
  message: string;
  timestamp: Date;
  icon?: LucideIcon | React.ElementType;
  color?: 'blue' | 'purple' | 'amber' | 'green' | 'red' | 'gray';
}

export interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  title?: string;
}

export function ActivityTimeline({ activities, maxItems = 10, title }: ActivityTimelineProps) {
  const colorConfig = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
  };

  const sortedActivities = [...activities]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxItems);

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (sortedActivities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="text-center">
          <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {sortedActivities.map((activity, index) => {
          const Icon = activity.icon;
          const colorClass = activity.color
            ? colorConfig[activity.color]
            : colorConfig.gray;

          return (
            <div
              key={activity.id}
              className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {Icon ? (
                  <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                ) : (
                  <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0 mt-0.5`}>
                    <Clock className="w-4 h-4" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    {activity.message}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
