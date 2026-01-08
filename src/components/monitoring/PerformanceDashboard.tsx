/**
 * Performance Dashboard Component
 *
 * Displays comprehensive performance metrics including:
 * - Operation timing charts
 * - Slow operations list
 * - Performance trends
 * - Category breakdown
 * - Success/failure rates
 * - Percentile displays
 */

'use client';

import { useEffect, useState } from 'react';
import { getPerformanceTracker, OperationCategory } from '@/lib/monitoring/performance-tracker';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red';
}

function MetricCard({ title, value, subtitle, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-80">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-70">{subtitle}</div>}
    </div>
  );
}

interface OperationStats {
  name: string;
  count: number;
  avgDuration: number;
  successRate: number;
}

export function PerformanceDashboard() {
  const tracker = getPerformanceTracker();
  const [summary, setSummary] = useState<ReturnType<typeof tracker.getPerformanceSummary> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<OperationCategory | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);

  const refreshData = () => {
    setRefreshing(true);
    try {
      setSummary(tracker.getPerformanceSummary());
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!summary) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const filteredOperations = selectedCategory === 'all'
    ? summary.categoryBreakdown
    : summary.categoryBreakdown.filter((cat: { category: OperationCategory; count: number; avgDuration: number }) => cat.category === selectedCategory);

  const getOperationStats = (operationName: string): OperationStats | null => {
    const stats = tracker.getStats(operationName);
    if (!stats) return null;

    return {
      name: stats.name,
      count: stats.count,
      avgDuration: stats.mean,
      successRate: stats.successRate,
    };
  };

  const selectedStats = selectedOperation ? getOperationStats(selectedOperation) : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              tracker.clearHistory();
              refreshData();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear History
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Operations"
          value={summary.totalOperations.toLocaleString()}
        />
        <MetricCard
          title="Success Rate"
          value={`${(summary.successRate * 100).toFixed(1)}%`}
          color={summary.successRate > 0.95 ? 'green' : summary.successRate > 0.85 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Avg Duration"
          value={`${summary.avgDuration.toFixed(2)}ms`}
          subtitle="Across all operations"
        />
        <MetricCard
          title="Active Alerts"
          value={summary.recentAlerts.length}
          color={summary.recentAlerts.length > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded ${
            selectedCategory === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Categories
        </button>
        {['api', 'database', 'render', 'page_load', 'agent_spawn', 'plugin_operation', 'cache', 'network'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat as OperationCategory)}
            className={`px-4 py-2 rounded capitalize ${
              selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="space-y-3">
          {filteredOperations.map((cat: { category: OperationCategory; count: number; avgDuration: number }) => {
            const maxDuration = Math.max(...filteredOperations.map((c: { category: OperationCategory; count: number; avgDuration: number }) => c.avgDuration));
            const barWidth = (cat.avgDuration / maxDuration) * 100;

            return (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">{cat.category.replace('_', ' ')}</span>
                  <span className="text-gray-600">
                    {cat.count.toLocaleString()} ops · {cat.avgDuration.toFixed(2)}ms avg
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slowest Operations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 Slowest Operations</h3>
        <div className="space-y-2">
          {summary.slowestOperations.map((op: { name: string; avgDuration: number; count: number }, index: number) => (
            <div
              key={op.name}
              className={`p-3 rounded border cursor-pointer transition-colors ${
                selectedOperation === op.name ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedOperation(op.name)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <span className="font-mono text-sm">{op.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{op.avgDuration.toFixed(2)}ms</div>
                  <div className="text-xs text-gray-500">{op.count} executions</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operation Detail Modal */}
      {selectedStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{selectedStats.name}</h3>
              <button
                onClick={() => setSelectedOperation(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <MetricCard
                title="Count"
                value={selectedStats.count.toLocaleString()}
              />
              <MetricCard
                title="Avg Duration"
                value={`${selectedStats.avgDuration.toFixed(2)}ms`}
              />
              <MetricCard
                title="Success Rate"
                value={`${(selectedStats.successRate * 100).toFixed(1)}%`}
                color={selectedStats.successRate > 0.95 ? 'green' : selectedStats.successRate > 0.85 ? 'yellow' : 'red'}
              />
              <MetricCard
                title="Category"
                value={selectedOperation || 'N/A'}
              />
            </div>

            {(() => {
              const stats = tracker.getStats(selectedOperation!);
              if (!stats) return null;

              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Duration Percentiles</h4>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p50</div>
                        <div className="font-bold">{stats.p50.toFixed(2)}ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p75</div>
                        <div className="font-bold">{stats.p75.toFixed(2)}ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p90</div>
                        <div className="font-bold">{stats.p90.toFixed(2)}ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p95</div>
                        <div className="font-bold">{stats.p95.toFixed(2)}ms</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">p99</div>
                        <div className="font-bold">{stats.p99.toFixed(2)}ms</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Duration Range</h4>
                    <div className="flex justify-between text-sm p-3 bg-gray-50 rounded">
                      <span>Min: {stats.min.toFixed(2)}ms</span>
                      <span>Max: {stats.max.toFixed(2)}ms</span>
                      <span>Std Dev: {stats.standardDeviation.toFixed(2)}ms</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Success/Failure</h4>
                    <div className="flex justify-between text-sm p-3 bg-gray-50 rounded">
                      <span className="text-green-600">Success: {stats.successCount.toLocaleString()}</span>
                      <span className="text-red-600">Failure: {stats.failureCount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Performance Trend</h4>
                    {(() => {
                      const trend = tracker.getPerformanceTrend(selectedOperation!);
                      if (!trend) {
                        return <div className="text-sm text-gray-500">Not enough data</div>;
                      }

                      const trendColor = trend.trend === 'improving' ? 'green' : trend.trend === 'degrading' ? 'red' : 'gray';

                      return (
                        <div className="text-sm p-3 bg-gray-50 rounded">
                          <span className={`font-bold text-${trendColor}-600 capitalize`}>{trend.trend}</span>
                          <span className="text-gray-600 ml-2">
                            ({trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%)
                          </span>
                          <span className="text-gray-500 ml-2">
                            based on last {trend.values.length} operations
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* High Failure Rate Operations */}
      {summary.highestFailureRate.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Operations with High Failure Rate</h3>
          <div className="space-y-2">
            {summary.highestFailureRate.map((op: { name: string; failureRate: number; count: number }, index: number) => (
              <div
                key={op.name}
                className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-400">#{index + 1}</span>
                  <span className="font-mono text-sm">{op.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">
                    {(op.failureRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">{op.count} executions</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {summary.recentAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-2">
            {summary.recentAlerts.map((alert: { id: string; severity: string; message: string; operation: string; timestamp: number }) => (
              <div
                key={alert.id}
                className={`p-3 rounded border-l-4 ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Operation: {alert.operation} · {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Report */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Report</h3>
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
          {tracker.generateReport()}
        </pre>
      </div>
    </div>
  );
}
