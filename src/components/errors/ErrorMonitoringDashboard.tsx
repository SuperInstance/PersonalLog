/**
 * Error Monitoring Dashboard
 *
 * Provides a comprehensive view of errors in the system.
 * View recent errors, filter by category/severity, and see trends over time.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  getLogEntries,
  exportLogsAsJSON,
  exportLogsAsCSV,
  clearLogs,
  getLogCount,
  type LogEntry,
  type LogLevel,
} from '@/lib/errors';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  recentTrend: number[];
}

interface FilterState {
  level?: LogLevel;
  search: string;
  timeRange: '1h' | '24h' | '7d' | '30d' | 'all';
}

// ============================================================================
// COMPONENTS
// ============================================================================

export function ErrorMonitoringDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    level: undefined,
    search: '',
    timeRange: '24h',
  });
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      const since = getTimestampForTimeRange(filter.timeRange);
      const allLogs = await getLogEntries({
        level: filter.level,
        since,
        limit: 1000,
      });

      setLogs(allLogs);
      applyFilters(allLogs, filter);
      calculateStats(allLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (entries: LogEntry[], currentFilter: FilterState) => {
    let filtered = entries;

    // Apply search filter
    if (currentFilter.search) {
      const searchLower = currentFilter.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.category?.toLowerCase().includes(searchLower) ||
        log.context?.component?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
  };

  const calculateStats = (entries: LogEntry[]) => {
    const byLevel: Record<LogLevel, number> = {
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
    };

    const byCategory: Record<string, number> = {};

    entries.forEach(log => {
      byLevel[log.level]++;

      if (log.category) {
        byCategory[log.category] = (byCategory[log.category] || 0) + 1;
      }
    });

    // Calculate recent trend (errors per hour for last 24 hours)
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentLogs = entries.filter(log => log.timestamp > oneDayAgo);

    const hourlyBuckets = new Array(24).fill(0);
    recentLogs.forEach(log => {
      const hourAgo = Math.floor((now - log.timestamp) / (60 * 60 * 1000));
      if (hourAgo < 24) {
        hourlyBuckets[23 - hourAgo]++;
      }
    });

    setStats({
      total: entries.length,
      byLevel,
      byCategory,
      recentTrend: hourlyBuckets,
    });
  };

  const getTimestampForTimeRange = (range: FilterState['timeRange']): number | undefined => {
    const now = Date.now();

    switch (range) {
      case '1h':
        return now - 60 * 60 * 1000;
      case '24h':
        return now - 24 * 60 * 60 * 1000;
      case '7d':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now - 30 * 24 * 60 * 60 * 1000;
      case 'all':
        return undefined;
    }
  };

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = format === 'json' ? await exportLogsAsJSON() : await exportLogsAsCSV();
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-logs-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Are you sure you want to clear all error logs? This cannot be undone.')) {
      try {
        await clearLogs();
        await loadLogs();
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    }
  };

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Error Monitoring Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Monitor and debug system errors in real-time
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>

            <button
              onClick={() => loadLogs()}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Refresh
            </button>

            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Export JSON
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Export CSV
            </button>

            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Errors"
              value={stats.total}
              icon="📊"
              color="blue"
            />
            <StatCard
              title="Errors"
              value={stats.byLevel.error}
              icon="🔴"
              color="red"
            />
            <StatCard
              title="Warnings"
              value={stats.byLevel.warn}
              icon="⚠️"
              color="yellow"
            />
            <StatCard
              title="Info"
              value={stats.byLevel.info}
              icon="ℹ️"
              color="gray"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search logs..."
                value={filter.search}
                onChange={e => handleFilterChange({ search: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Level Filter */}
            <select
              value={filter.level || 'all'}
              onChange={e => handleFilterChange({ level: e.target.value === 'all' ? undefined : e.target.value as LogLevel })}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={filter.timeRange}
              onChange={e => handleFilterChange({ timeRange: e.target.value as FilterState['timeRange'] })}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Error Trend Chart */}
        {stats && stats.recentTrend.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Error Trend (Last 24 Hours)
            </h2>
            <div className="h-48 flex items-end gap-1">
              {stats.recentTrend.map((count, i) => {
                const maxCount = Math.max(...stats.recentTrend, 1);
                const height = (count / maxCount) * 100;
                const hoursAgo = 23 - i;

                return (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 transition-colors rounded-t relative group"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {count} errors ({hoursAgo}h ago)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          </div>
        )}

        {/* Log Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    Component
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      Loading...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      No logs found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <LevelBadge level={log.level} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100 max-w-md truncate">
                        {log.message}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {log.category || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {log.context?.component || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'red' | 'yellow' | 'gray';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    gray: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: LogLevel }) {
  const styles = {
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    warn: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    debug: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

interface LogDetailModalProps {
  log: LogEntry;
  onClose: () => void;
}

function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-auto border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Log Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Level and Timestamp */}
          <div className="flex items-center gap-3">
            <LevelBadge level={log.level} />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {new Date(log.timestamp).toISOString()}
            </span>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Message
            </h3>
            <p className="text-slate-900 dark:text-slate-100">{log.message}</p>
          </div>

          {/* Category */}
          {log.category && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Category
              </h3>
              <p className="text-slate-900 dark:text-slate-100">{log.category}</p>
            </div>
          )}

          {/* Context */}
          {log.context && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Context
              </h3>
              <pre className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-xs text-slate-700 dark:text-slate-300 overflow-auto">
                {JSON.stringify(log.context, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Details */}
          {log.error && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Error Details
              </h3>
              <pre className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-xs text-slate-700 dark:text-slate-300 overflow-auto">
                {JSON.stringify(log.error, null, 2)}
              </pre>
            </div>
          )}

          {/* Stack Trace */}
          {log.stack && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Stack Trace
              </h3>
              <pre className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-xs text-slate-700 dark:text-slate-300 overflow-auto">
                {log.stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
