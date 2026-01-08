/**
 * Real-time Health Dashboard
 *
 * Displays comprehensive system health metrics with real-time updates,
 * interactive charts, and alert management.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getHealthMonitor } from '@/lib/monitoring';
import type { SystemHealthStatus, HealthAlert, HealthMetric, HealthHistoryPoint } from '@/lib/monitoring';
import { HealthStatus, AlertSeverity, TrendDirection } from '@/lib/monitoring/metrics';
import { Activity, Cpu, HardDrive, Wifi, Plug, Bot, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HealthDashboardProps {
  /** Update interval in milliseconds (default: 2000) */
  updateInterval?: number;
  /** Whether to auto-start monitoring */
  autoStart?: boolean;
}

export function HealthDashboard({ updateInterval = 2000, autoStart = true }: HealthDashboardProps) {
  const [data, setData] = useState<SystemHealthStatus | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [history, setHistory] = useState<HealthHistoryPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Start monitoring
  useEffect(() => {
    const monitor = getHealthMonitor();

    if (autoStart && !monitor.isActive()) {
      monitor.start().then(() => {
        setIsMonitoring(true);
      });
    } else {
      setIsMonitoring(monitor.isActive());
    }

    return () => {
      // Don't stop on unmount - let it continue
    };
  }, [autoStart]);

  // Update data periodically
  const updateData = useCallback(() => {
    const monitor = getHealthMonitor();
    if (!monitor.isActive()) {
      setIsMonitoring(false);
      return;
    }

    try {
      const status = monitor.getSystemHealthStatus();
      const activeAlerts = monitor.getActiveAlerts();
      const healthHistory = monitor.getHealthHistory();

      setData(status);
      setAlerts(activeAlerts);
      setHistory(healthHistory);
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to load health data:', error);
    }
  }, []);

  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, updateInterval);
    return () => clearInterval(interval);
  }, [updateData, updateInterval]);

  // Handle alert actions
  const acknowledgeAlert = (alertId: string) => {
    const monitor = getHealthMonitor();
    monitor.acknowledgeAlert(alertId);
    updateData();
  };

  const dismissAlert = (alertId: string) => {
    const monitor = getHealthMonitor();
    monitor.dismissAlert(alertId);
    updateData();
  };

  // Render helpers
  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'text-green-600 bg-green-50 border-green-200';
      case HealthStatus.WARNING:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case HealthStatus.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case HealthStatus.WARNING:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case HealthStatus.CRITICAL:
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case TrendDirection.IMPROVING:
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case TrendDirection.DEGRADING:
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'border-red-500 bg-red-50';
      case AlertSeverity.WARNING:
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  const formatValue = (metric: HealthMetric): string => {
    if (metric.unit === '%') return `${metric.value.toFixed(1)}%`;
    if (metric.unit === 'ms') return `${metric.value.toFixed(0)}ms`;
    if (metric.unit === 'MB') return `${metric.value.toFixed(1)} MB`;
    if (metric.unit === 'fps') return `${metric.value.toFixed(0)} fps`;
    if (metric.unit === 'count') return metric.value.toFixed(0);
    if (metric.unit === 'score') return metric.value.toFixed(0);
    if (metric.unit === 'status') return metric.value > 0 ? 'Online' : 'Offline';
    return metric.value.toFixed(2);
  };

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'PERFORMANCE':
        return <Activity className="w-5 h-5" />;
      case 'MEMORY':
        return <Cpu className="w-5 h-5" />;
      case 'STORAGE':
        return <HardDrive className="w-5 h-5" />;
      case 'NETWORK':
        return <Wifi className="w-5 h-5" />;
      case 'PLUGIN':
        return <Plug className="w-5 h-5" />;
      case 'AGENT':
        return <Bot className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (!data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Health</h2>
          <p className="text-sm text-gray-600 mt-1">
            {isMonitoring ? 'Monitoring active' : 'Monitoring inactive'} • Last check:{' '}
            {new Date(data.lastCheck).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Uptime: {Math.floor(data.uptime / 1000)}s
          </div>
        </div>
      </div>

      {/* Overall Health Score */}
      <div className={`rounded-lg border-2 p-8 text-center ${getStatusColor(data.healthScore.status)}`}>
        <div className="flex items-center justify-center gap-4 mb-4">
          {getStatusIcon(data.healthScore.status)}
          <h3 className="text-xl font-semibold">Overall Health</h3>
        </div>
        <div className="text-6xl font-bold mb-2">{data.healthScore.score}</div>
        <div className="text-lg capitalize mb-4">{data.healthScore.status}</div>
        <div className="flex items-center justify-center gap-2 text-sm">
          {getTrendIcon(data.healthScore.trend)}
          <span className="capitalize">{data.healthScore.trend}</span>
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(data.healthScore.categories).map(([category, score]) => {
          const status = score >= 80 ? HealthStatus.HEALTHY : score >= 60 ? HealthStatus.WARNING : HealthStatus.CRITICAL;
          return (
            <div key={category} className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
              <div className="flex items-center gap-2 mb-2">
                {getMetricIcon(category.toUpperCase())}
                <div className="text-sm font-medium capitalize">{category}</div>
              </div>
              <div className="text-3xl font-bold">{score}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Active Alerts ({alerts.length})
          </h3>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`border-l-4 p-4 rounded ${getSeverityColor(alert.severity)}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{alert.metric}</div>
                    <div className="text-sm text-gray-700">{alert.message}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                {alert.actions.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Suggested actions:</div>
                    <ul className="text-xs text-gray-700 list-disc list-inside">
                      {alert.actions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  Fired {alert.count} time{alert.count !== 1 ? 's' : ''}
                  {alert.lastFired && ` • Last: ${new Date(alert.lastFired).toLocaleTimeString()}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.metrics.map((metric) => (
            <div
              key={`${metric.category}-${metric.name}`}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${getStatusColor(metric.status)}`}
              onClick={() => setSelectedMetric(metric.name)}
            >
              <div className="flex items-center gap-2 mb-2">
                {getMetricIcon(metric.category)}
                <div className="text-sm font-medium capitalize">{metric.name.replace(/-/g, ' ')}</div>
              </div>
              <div className="text-2xl font-bold">{formatValue(metric)}</div>
              <div className="text-xs text-gray-600 mt-1 capitalize">{metric.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Health History Chart */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Health History</h3>
          <div className="h-64 flex items-end gap-1">
            {history.map((point, i) => {
              const height = (point.score / 100) * 100;
              const isRecent = i >= history.length - 10;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${isRecent ? 'bg-blue-500' : 'bg-blue-200'} hover:bg-blue-600`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`Score: ${point.score} • ${new Date(point.timestamp).toLocaleTimeString()}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{history.length > 0 ? new Date(history[0].timestamp).toLocaleTimeString() : ''}</span>
            <span>{history.length > 0 ? new Date(history[history.length - 1].timestamp).toLocaleTimeString() : ''}</span>
          </div>
        </div>
      )}

      {/* Selected Metric Detail */}
      {selectedMetric && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold capitalize">{selectedMetric.replace(/-/g, ' ')}</h3>
            <button
              onClick={() => setSelectedMetric(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="h-64">
            {(() => {
              const metricHistory = getHealthMonitor().getMetricHistory(selectedMetric);
              if (metricHistory.length === 0) {
                return <div className="text-center text-gray-500 py-8">No history available</div>;
              }
              const maxValue = Math.max(...metricHistory.map((h) => h.value));
              const minValue = Math.min(...metricHistory.map((h) => h.value));
              const range = maxValue - minValue || 1;

              return (
                <div className="h-full flex items-end gap-1">
                  {metricHistory.map((point, i) => {
                    const normalizedValue = (point.value - minValue) / range;
                    const height = Math.max(4, normalizedValue * 100);
                    const isRecent = i >= metricHistory.length - 10;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all ${isRecent ? 'bg-green-500' : 'bg-green-200'} hover:bg-green-600`}
                        style={{ height: `${height}%` }}
                        title={`${point.value.toFixed(2)} • ${new Date(point.timestamp).toLocaleTimeString()}`}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
