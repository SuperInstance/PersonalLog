/**
 * Monitoring Dashboard Component
 *
 * Displays real-time performance and security metrics.
 */

'use client';

import { useEffect, useState } from 'react';
import { getPerformanceMonitor, getSecurityMonitor } from '@/lib/monitoring';

interface MonitoringData {
  performance: {
    webVitals: any;
    score: any;
    resourceSummary: any[];
    apiSummary: any[];
  };
  security: {
    metrics: any;
    score: any;
  };
}

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = () => {
    setRefreshing(true);
    try {
      const perfMonitor = getPerformanceMonitor();
      const secMonitor = getSecurityMonitor();

      setData({
        performance: {
          webVitals: perfMonitor.getWebVitalsSummary(),
          score: perfMonitor.getPerformanceScore(),
          resourceSummary: perfMonitor.getResourceTimingSummary(),
          apiSummary: perfMonitor.getAPIMetricsSummary(),
        },
        security: {
          metrics: secMonitor.getSecurityMetrics(),
          score: secMonitor.getSecurityScore(),
        },
      });
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number, rating: string) => {
    if (rating === 'excellent' || rating === 'secure') return 'text-green-600';
    if (rating === 'good' || rating === 'mostly-secure') return 'text-blue-600';
    if (rating === 'fair' || rating === 'at-risk') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Monitoring</h2>
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Score</h3>
          <div className={`text-5xl font-bold ${getScoreColor(data.performance.score.score, data.performance.score.rating)}`}>
            {data.performance.score.score}
          </div>
          <div className="text-sm text-gray-600 mt-2 capitalize">
            {data.performance.score.rating}
          </div>
          {data.performance.score.issues.length > 0 && (
            <ul className="mt-4 text-sm text-red-600">
              {data.performance.score.issues.map((issue: string, i: number) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Security Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Security Score</h3>
          <div className={`text-5xl font-bold ${getScoreColor(data.security.score.score, data.security.score.rating)}`}>
            {data.security.score.score}
          </div>
          <div className="text-sm text-gray-600 mt-2 capitalize">
            {data.security.score.rating}
          </div>
          {data.security.score.issues.length > 0 && (
            <ul className="mt-4 text-sm text-red-600">
              {data.security.score.issues.map((issue: string, i: number) => (
                <li key={i}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Web Vitals */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(data.performance.webVitals).map(([name, metric]: [string, any]) => {
            if (!metric) return null;
            return (
              <div key={name} className="text-center">
                <div className="text-sm font-medium uppercase">{name}</div>
                <div className="text-2xl font-bold mt-2">{metric.value.toFixed(0)}</div>
                <div className={`text-xs capitalize ${getScoreColor(0, metric.rating)}`}>
                  {metric.rating}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Security Events</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium">Total Events</div>
            <div className="text-2xl font-bold mt-2">{data.security.metrics.totalEvents}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">Critical</div>
            <div className="text-2xl font-bold mt-2 text-red-600">
              {data.security.metrics.eventsBySeverity.critical || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">High</div>
            <div className="text-2xl font-bold mt-2 text-orange-600">
              {data.security.metrics.eventsBySeverity.high || 0}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">Blocked Requests</div>
            <div className="text-2xl font-bold mt-2 text-yellow-600">
              {data.security.metrics.blockedRequests}
            </div>
          </div>
        </div>
      </div>

      {/* API Metrics */}
      {data.performance.apiSummary.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">API Performance</h3>
          <div className="space-y-2">
            {data.performance.apiSummary.map((api: any) => (
              <div key={api.endpoint} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="font-mono text-sm">{api.endpoint}</div>
                <div className="flex gap-4 text-sm">
                  <div>{api.count} calls</div>
                  <div>{api.avgDuration.toFixed(0)}ms avg</div>
                  <div className={api.failureRate > 0 ? 'text-red-600' : 'text-green-600'}>
                    {(api.failureRate * 100).toFixed(1)}% errors
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
