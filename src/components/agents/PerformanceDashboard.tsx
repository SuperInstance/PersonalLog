'use client';

/**
 * Agent Performance Dashboard
 *
 * Beautiful visualization of agent performance metrics.
 * Shows agent comparison charts, performance metrics, task completion rates,
 * and performance trends over time.
 *
 * Part of Neural MPC Phase 1: Predictive Agent Selection.
 */

import React, { useState, useEffect } from 'react';
import {
  performanceTracker,
  AgentPerformanceStats,
  AgentRanking,
  PerformanceHistory,
  TaskType,
  PrivacySettings,
  StorageStats,
} from '@/lib/agents/performance';

// ============================================================================
// TYPES
// ============================================================================

interface PerformanceDashboardProps {
  /** Current agent ID (optional, for focused view) */
  agentId?: string;
  /** Task type to filter by (optional) */
  taskType?: TaskType;
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get task type label
 */
function getTaskTypeLabel(taskType: TaskType): string {
  const labels: Record<TaskType, string> = {
    [TaskType.ANALYZE]: 'Analysis',
    [TaskType.GENERATE]: 'Generation',
    [TaskType.RETRIEVE]: 'Retrieval',
    [TaskType.AUTOMATE]: 'Automation',
    [TaskType.PROCESS]: 'Processing',
    [TaskType.SUMMARIZE]: 'Summarization',
    [TaskType.CUSTOM]: 'Custom',
  };
  return labels[taskType] || taskType;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Performance score gauge component
 */
function PerformanceScoreGauge({ score }: { score: number }): React.JSX.Element {
  const percentage = Math.min(Math.max(score * 100, 0), 100);
  const color =
    percentage >= 80 ? 'bg-green-500' :
    percentage >= 60 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="relative w-16 h-16">
      <svg className="transform -rotate-90 w-16 h-16">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className={color}
          strokeDasharray={`${percentage * 1.76} 176`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{percentage.toFixed(0)}</span>
      </div>
    </div>
  );
}

/**
 * Performance bar chart component
 */
function PerformanceBarChart({
  data,
  valueKey,
  labelKey,
  color = 'blue'
}: {
  data: Array<any>;
  valueKey: string;
  labelKey: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}): React.JSX.Element {
  const maxValue = Math.max(...data.map((d) => (d[valueKey] as number) || 0), 1);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="space-y-2">
      {data.map((item, index) => {
        const value = (item[valueKey] as number) || 0;
        const percentage = (value / maxValue) * 100;
        const label = item[labelKey] as string;

        return (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  className={`h-full ${colorClasses[color]} transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <div className="w-24 text-right text-sm text-gray-600 dark:text-gray-400">
              {label}
            </div>
            <div className="w-16 text-right text-sm font-medium">
              {valueKey === 'successRate' || valueKey === 'score' ?
                formatPercentage(value) :
                valueKey === 'averageDuration' ?
                formatDuration(value) :
                value.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Stats card component
 */
function StatsCard({
  title,
  value,
  subtitle,
  icon
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}): React.JSX.Element {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-50">{icon}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

/**
 * Performance dashboard component
 */
export function PerformanceDashboard({
  agentId,
  taskType
}: PerformanceDashboardProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'agents' | 'history' | 'settings'>('overview');
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [agentStats, setAgentStats] = useState<AgentPerformanceStats | null>(null);
  const [topAgents, setTopAgents] = useState<AgentRanking[]>([]);
  const [selectedTaskType, setSelectedTaskType] = useState<TaskType | undefined>(taskType);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceHistory | null>(null);
  const [historyWindow, setHistoryWindow] = useState<'day' | 'week' | 'month'>('week');

  // Load data
  useEffect(() => {
    loadData();
  }, [agentId, selectedTaskType, historyWindow]);

  async function loadData() {
    setLoading(true);
    try {
      // Load storage stats
      const stats = await performanceTracker.getStorageStats();
      setStorageStats(stats);

      // Load privacy settings
      const privacy = await performanceTracker.getPrivacySettings();
      setPrivacySettings(privacy);

      // Load agent stats if agent specified
      if (agentId) {
        const stats = await performanceTracker.getAgentPerformance(agentId);
        setAgentStats(stats);
      }

      // Load top agents for selected task type
      if (selectedTaskType) {
        const rankings = await performanceTracker.getTopAgentsForTask(selectedTaskType, {
          limit: 10,
          minSampleSize: 3
        });
        setTopAgents(rankings);
      }

      // Load performance history
      if (agentId) {
        const history = await performanceTracker.getPerformanceHistory(agentId, historyWindow);
        setPerformanceHistory(history);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAllData() {
    if (!confirm('Are you sure you want to clear all performance data? This cannot be undone.')) {
      return;
    }

    try {
      await performanceTracker.clearAllData();
      await loadData();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  async function handleUpdatePrivacySettings(updates: Partial<PrivacySettings>) {
    try {
      await performanceTracker.updatePrivacySettings(updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Performance Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and analyze agent performance metrics
          </p>
        </div>
        {agentId && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Agent</p>
            <p className="text-lg font-semibold">{agentId}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {(['overview', 'agents', 'history', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Storage Stats */}
          {storageStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Records"
                value={storageStats.totalRecords.toLocaleString()}
                icon="📊"
              />
              <StatsCard
                title="Storage Size"
                value={formatBytes(storageStats.estimatedSizeBytes)}
                icon="💾"
              />
              <StatsCard
                title="Agents Tracked"
                value={storageStats.agentsTracked}
                icon="🤖"
              />
              <StatsCard
                title="Data Range"
                value={
                  storageStats.oldestRecord ?
                    `${new Date(storageStats.oldestRecord).toLocaleDateString()} - ${new Date(storageStats.newestRecord || '').toLocaleDateString()}` :
                    'No data'
                }
                icon="📅"
              />
            </div>
          )}

          {/* Agent Stats */}
          {agentStats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Success Rate */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Success Rate</p>
                  <div className="flex items-center gap-3">
                    <PerformanceScoreGauge score={agentStats.successRate} />
                    <div>
                      <p className="text-2xl font-semibold">{formatPercentage(agentStats.successRate)}</p>
                      <p className="text-xs text-gray-500">
                        {agentStats.totalExecutions} executions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Duration */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Duration</p>
                  <p className="text-2xl font-semibold">{formatDuration(agentStats.averageDuration)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Median: {formatDuration(agentStats.medianDuration)}
                  </p>
                  <p className="text-xs text-gray-500">
                    P95: {formatDuration(agentStats.p95Duration)}
                  </p>
                </div>

                {/* User Satisfaction */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">User Satisfaction</p>
                  {agentStats.averageRating !== null ? (
                    <>
                      <p className="text-2xl font-semibold">
                        {agentStats.averageRating.toFixed(1)} / 5
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reuse rate: {formatPercentage(agentStats.reuseRate)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No ratings yet</p>
                  )}
                </div>
              </div>

              {/* Performance by Task */}
              {Object.keys(agentStats.performanceByTask).length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Performance by Task Type</h4>
                  <PerformanceBarChart
                    data={Object.values(agentStats.performanceByTask)}
                    valueKey="successRate"
                    labelKey="taskType"
                    color="green"
                  />
                </div>
              )}
            </div>
          )}

          {/* Top Agents */}
          {topAgents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                Top Agents for {selectedTaskType ? getTaskTypeLabel(selectedTaskType) : 'Tasks'}
              </h3>

              <div className="space-y-3">
                {topAgents.map((agent) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full font-semibold">
                      {agent.rank}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium">{agent.agentId}</p>
                      <p className="text-xs text-gray-500">
                        {agent.sampleSize} executions
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className="font-semibold">{agent.score.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Success</p>
                        <p className="font-semibold">{formatPercentage(agent.successRate)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Speed</p>
                        <p className="font-semibold">{formatPercentage(agent.speedScore)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Satisfaction</p>
                        <p className="font-semibold">{formatPercentage(agent.satisfactionScore)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'agents' && (
        <div className="space-y-6">
          {/* Task Type Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Task Type:</label>
            <select
              value={selectedTaskType || ''}
              onChange={(e) => setSelectedTaskType(e.target.value as TaskType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">All</option>
              {Object.values(TaskType).map((type: TaskType) => (
                <option key={String(type)} value={String(type)}>
                  {getTaskTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Top Agents Table */}
          {topAgents.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Speed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Satisfaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Samples
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {topAgents.map((agent) => (
                    <tr key={agent.agentId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-500 text-white rounded-full font-semibold">
                            {agent.rank}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {agent.agentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {agent.score.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatPercentage(agent.successRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatPercentage(agent.speedScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatPercentage(agent.satisfactionScore)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {agent.sampleSize}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No performance data available</p>
              <p className="text-sm text-gray-400 mt-1">
                Select a task type to see ranked agents
              </p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'history' && (
        <div className="space-y-6">
          {/* Time Window Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Time Window:</label>
            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              {(['day', 'week', 'month'] as const).map((window) => (
                <button
                  key={window}
                  onClick={() => setHistoryWindow(window)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    historyWindow === window
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {window.charAt(0).toUpperCase() + window.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Performance History */}
          {performanceHistory ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>

              <div className="space-y-4">
                {performanceHistory.history.map((point: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {new Date(point.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Success Rate</p>
                        <p className="font-semibold">{formatPercentage(point.successRate)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Avg Duration</p>
                        <p className="font-semibold">{formatDuration(point.averageDuration)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Executions</p>
                        <p className="font-semibold">{point.executionCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No performance history available</p>
              <p className="text-sm text-gray-400 mt-1">
                Select an agent to view performance history
              </p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'settings' && (
        <div className="space-y-6">
          {privacySettings && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>

              <div className="space-y-4">
                {/* Enable Tracking */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Performance Tracking</p>
                    <p className="text-sm text-gray-500">
                      Track agent performance metrics locally
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdatePrivacySettings({ enabled: !privacySettings.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      privacySettings.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        privacySettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Log Resources */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Log Resource Usage</p>
                    <p className="text-sm text-gray-500">
                      Track CPU and memory usage
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdatePrivacySettings({ logResources: !privacySettings.logResources })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      privacySettings.logResources ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        privacySettings.logResources ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Log Errors */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Log Error Messages</p>
                    <p className="text-sm text-gray-500">
                      Store error messages for debugging
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdatePrivacySettings({ logErrors: !privacySettings.logErrors })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      privacySettings.logErrors ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        privacySettings.logErrors ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Retention Days */}
                <div>
                  <p className="font-medium mb-2">Data Retention Period</p>
                  <p className="text-sm text-gray-500 mb-3">
                    Number of days to keep performance data (0 = keep forever)
                  </p>
                  <select
                    value={privacySettings.retentionDays}
                    onChange={(e) =>
                      handleUpdatePrivacySettings({ retentionDays: parseInt(e.target.value) })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="0">Keep Forever</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">
              Danger Zone
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                These actions are irreversible. Please be careful.
              </p>

              <button
                onClick={handleClearAllData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Clear All Performance Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
