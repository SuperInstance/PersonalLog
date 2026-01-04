'use client';

/**
 * Storage Overview Component
 *
 * Displays storage usage breakdown with donut chart and detailed list.
 * Shows recommendations and trend information.
 */

import React, { useState, useEffect } from 'react';
import { HardDrive, TrendingUp, AlertCircle } from 'lucide-react';
import { StorageOverview as StorageOverviewType, formatBytes } from '@/lib/data';
import { calculateStorageOverview } from '@/lib/data/storage-utils';
import { StorageChart } from './StorageChart';

interface Props {
  onRefresh?: () => void;
}

export function StorageOverview({ onRefresh }: Props) {
  const [storage, setStorage] = useState<StorageOverviewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await calculateStorageOverview();
      setStorage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, []);

  const handleRefresh = () => {
    loadStorage();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Failed to load storage information</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!storage) {
    return null;
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getUsageBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
    if (percentage >= 75) return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700';
    return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className={`rounded-xl border-2 p-6 ${getUsageBg(storage.usagePercentage)}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
              <HardDrive className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Storage Usage
              </h3>
              <div className={`text-3xl font-bold mt-1 ${getUsageColor(storage.usagePercentage)}`}>
                {storage.usagePercentage.toFixed(1)}%
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {formatBytes(storage.totalUsed)} of {formatBytes(storage.totalAvailable + storage.totalUsed)}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Chart and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Storage Breakdown
          </h3>
          <div className="flex justify-center">
            <StorageChart breakdown={storage.breakdown} size={200} />
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Details
          </h3>
          <div className="space-y-3">
            {Object.entries(storage.breakdown)
              .filter(([, item]) => item.sizeBytes > 0)
              .map(([key, item]) => (
                <StorageItemRow key={key} item={item} />
              ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {storage.recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {storage.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StorageItemRowProps {
  item: {
    name: string;
    size: string;
    sizeBytes: number;
    percentage: number;
  };
}

function StorageItemRow({ item }: StorageItemRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {item.name}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {item.size}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
            style={{ width: `${item.percentage}%` }}
          />
        </div>
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 w-12 text-right">
          {item.percentage}%
        </div>
      </div>
    </div>
  );
}
