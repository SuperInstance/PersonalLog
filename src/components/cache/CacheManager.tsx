/**
 * Cache Manager Component
 *
 * Provides UI for viewing and managing cache.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCacheStats, useCacheManager } from '@/lib/cache/use-cache';
import { getCacheMetrics, formatMetricsForDisplay } from '@/lib/cache/cache-metrics';

export function CacheManager() {
  const { stats, isLoading: statsLoading, refreshStats } = useCacheStats();
  const { clearCache, invalidateByTag, runMaintenance, isClearing } = useCacheManager();
  const [metrics, setMetrics] = useState(getCacheMetrics(3600000)); // 1 hour window
  const [activeTab, setActiveTab] = useState<'overview' | 'advanced'>('overview');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const formattedMetrics = formatMetricsForDisplay(metrics);

  const handleRefresh = () => {
    refreshStats();
    setMetrics(getCacheMetrics(3600000));
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cache?')) {
      await clearCache();
      handleRefresh();
    }
  };

  const handleInvalidateTag = async (tag: string) => {
    await invalidateByTag(tag);
    handleRefresh();
  };

  return (
    <div className="cache-manager">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Cache Manager</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={statsLoading}
          >
            Refresh
          </button>
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            disabled={isClearing}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 ${
            activeTab === 'advanced'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-600'
          }`}
        >
          Advanced
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {formattedMetrics.summary.map((item) => (
              <div key={item.label} className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">{item.label}</div>
                <div className="text-2xl font-bold">{item.value}</div>
                {item.trend && (
                  <div
                    className={`text-sm mt-2 ${
                      item.trend === 'up' ? 'text-green-500' : item.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    {item.trend === 'up' && '↑'}
                    {item.trend === 'down' && '↓'}
                    {item.trend === 'neutral' && '→'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cache Size */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Cache Storage</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Size:</span>
                <span className="font-mono">{(stats.totalSize / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Entries:</span>
                <span className="font-mono">{stats.entryCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Oldest Entry:</span>
                <span className="font-mono">
                  {stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Newest Entry:</span>
                <span className="font-mono">
                  {stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Size bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((stats.totalSize / (50 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {((stats.totalSize / (50 * 1024 * 1024)) * 100).toFixed(1)}% of 50 MB limit
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {formattedMetrics.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2 text-yellow-800">Recommendations</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                {formattedMetrics.recommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          {/* Performance by Tag */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Performance by Tag</h3>
            <div className="space-y-3">
              {Object.entries(formattedMetrics.breakdown).map(([tag, data]) => (
                <div key={tag} className="flex items-center justify-between">
                  <span className="font-mono text-sm">{tag}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono w-16 text-right">{data.value}</span>
                    <button
                      onClick={() => handleInvalidateTag(tag)}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Invalidate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Maintenance</h3>
            <div className="space-y-2">
              <button
                onClick={runMaintenance}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Run Auto-Maintenance
              </button>
              <button
                onClick={handleRefresh}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Refresh Statistics
              </button>
            </div>
          </div>

          {/* Raw Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Raw Metrics</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
