/**
 * Feature Flag Automation Dashboard
 *
 * Provides UI for monitoring and controlling automated feature flag management.
 * Shows flag states, recommendations, history, and allows user overrides.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type {
  AutomationFlag,
  AutomationAction,
  FlagChangeHistory,
  AutomationMetrics,
  AutomationNotification,
  AutomationFlagState,
} from '@/lib/flags/automation-types';
import {
  getAutomationEngine,
  type AutomationEngine,
} from '@/lib/flags/automation-engine';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: 'p-6 max-w-7xl mx-auto',
  header: 'mb-8',
  title: 'text-3xl font-bold text-gray-900 dark:text-white',
  subtitle: 'text-gray-600 dark:text-gray-400 mt-2',

  // Metrics
  metricsGrid: 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-8',
  metricCard: 'bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700',
  metricLabel: 'text-sm text-gray-600 dark:text-gray-400',
  metricValue: 'text-2xl font-bold text-gray-900 dark:text-white',
  metricTrend: 'text-xs mt-1',

  // Controls
  controlsBar: 'flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm',
  controlGroup: 'flex items-center gap-4',
  button: 'px-4 py-2 rounded-lg font-medium transition-colors',
  buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
  buttonSecondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600',
  buttonSuccess: 'bg-green-600 text-white hover:bg-green-700',
  buttonDanger: 'bg-red-600 text-white hover:bg-red-700',

  // Flags
  flagsSection: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm',
  sectionHeader: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
  sectionTitle: 'text-xl font-semibold text-gray-900 dark:text-white',
  sectionSubtitle: 'text-sm text-gray-600 dark:text-gray-400',

  flagList: 'divide-y divide-gray-200 dark:divide-gray-700',
  flagItem: 'p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors',
  flagHeader: 'flex items-start justify-between mb-3',
  flagName: 'text-lg font-medium text-gray-900 dark:text-white',
  flagState: 'px-3 py-1 rounded-full text-sm font-medium',

  stateEnabled: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  stateDisabled: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  stateAuto: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  stateForced: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  stateBlocked: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',

  flagDescription: 'text-sm text-gray-600 dark:text-gray-400 mb-3',
  flagMeta: 'flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500 mb-3',
  flagActions: 'flex items-center gap-2',

  // Recommendations
  recommendationsPanel: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6',
  recommendationItem: 'flex items-start justify-between mb-3 last:mb-0',
  recommendationText: 'flex-1',
  recommendationTitle: 'font-medium text-gray-900 dark:text-white',
  recommendationReason: 'text-sm text-gray-600 dark:text-gray-400',
  recommendationActions: 'flex items-center gap-2 ml-4',

  // Notifications
  notificationsPanel: 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6',
  notificationItem: 'flex items-start justify-between mb-3 last:mb-0',

  // History
  historySection: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm mt-6',
  historyList: 'divide-y divide-gray-200 dark:border-gray-700',
  historyItem: 'p-4',
  historyChange: 'text-sm font-medium text-gray-900 dark:text-white',
  historyTime: 'text-xs text-gray-500 dark:text-gray-500',
  historyReason: 'text-sm text-gray-600 dark:text-gray-400 mt-1',

  // Filters
  filterBar: 'flex items-center gap-4 mb-4',
  searchInput: 'px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
  filterSelect: 'px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white',

  // Empty state
  emptyState: 'text-center py-12',
  emptyIcon: 'text-4xl mb-4',
  emptyText: 'text-gray-500 dark:text-gray-500',
};

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Metric card component
 */
function MetricCard({
  label,
  value,
  trend,
  trendPositive,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      {trend && (
        <div className={`${styles.metricTrend} ${trendPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </div>
      )}
    </div>
  );
}

/**
 * Flag state badge component
 */
function FlagStateBadge({ state }: { state: AutomationFlagState }) {
  const stateStyles = {
    enabled: styles.stateEnabled,
    disabled: styles.stateDisabled,
    auto: styles.stateAuto,
    forced: styles.stateForced,
    blocked: styles.stateBlocked,
  };

  const stateLabels = {
    enabled: 'Enabled',
    disabled: 'Disabled',
    auto: 'Auto',
    forced: 'Forced',
    blocked: 'Blocked',
  };

  return (
    <span className={`${styles.flagState} ${stateStyles[state]}`}>
      {stateLabels[state]}
    </span>
  );
}

/**
 * Flag item component
 */
function FlagItem({
  flag,
  onEnable,
  onDisable,
  onReset,
  onOptOut,
  onOptIn,
}: {
  flag: AutomationFlag;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onReset: (id: string) => void;
  onOptOut: (id: string) => void;
  onOptIn: (id: string) => void;
}) {
  return (
    <div className={styles.flagItem}>
      <div className={styles.flagHeader}>
        <div>
          <div className={styles.flagName}>{flag.name}</div>
          <div className={styles.flagDescription}>{flag.description}</div>
          <div className={styles.flagMeta}>
            <span>Priority: {flag.priority}</span>
            <span>•</span>
            <span>Impact: {flag.performanceImpact}%</span>
            <span>•</span>
            <span>Tags: {flag.tags.join(', ')}</span>
          </div>
        </div>
        <FlagStateBadge state={flag.state} />
      </div>

      <div className={styles.flagActions}>
        {flag.state !== 'enabled' && flag.state !== 'forced' && (
          <button
            className={`${styles.button} ${styles.buttonSuccess}`}
            onClick={() => onEnable(flag.id)}
          >
            Enable
          </button>
        )}
        {flag.state !== 'disabled' && flag.state !== 'blocked' && (
          <button
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={() => onDisable(flag.id)}
          >
            Disable
          </button>
        )}
        {flag.state === 'forced' || flag.state === 'blocked' ? (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => onReset(flag.id)}
          >
            Reset to Auto
          </button>
        ) : null}
        {flag.userOptedOut ? (
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => onOptIn(flag.id)}
          >
            Opt-in to Automation
          </button>
        ) : (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => onOptOut(flag.id)}
          >
            Opt-out of Automation
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Recommendation item component
 */
function RecommendationItem({
  recommendation,
  onApprove,
  onDeny,
}: {
  recommendation: AutomationAction;
  onApprove: (action: AutomationAction) => void;
  onDeny: (action: AutomationAction) => void;
}) {
  return (
    <div className={styles.recommendationItem}>
      <div className={styles.recommendationText}>
        <div className={styles.recommendationTitle}>
          {recommendation.type === 'enable' ? 'Enable' : 'Disable'} {recommendation.featureId}
        </div>
        <div className={styles.recommendationReason}>{recommendation.reason}</div>
        <div className="text-xs text-gray-500 mt-1">
          Confidence: {Math.round(recommendation.confidence * 100)}% |
          Priority: {recommendation.priority}
        </div>
      </div>
      <div className={styles.recommendationActions}>
        <button
          className={`${styles.button} ${styles.buttonSuccess} text-sm`}
          onClick={() => onApprove(recommendation)}
        >
          Approve
        </button>
        <button
          className={`${styles.button} ${styles.buttonSecondary} text-sm`}
          onClick={() => onDeny(recommendation)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

/**
 * Notification item component
 */
function NotificationItem({
  notification,
  onRespond,
}: {
  notification: AutomationNotification;
  onRespond: (id: string, response: 'approve' | 'deny' | 'defer') => void;
}) {
  return (
    <div className={styles.notificationItem}>
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-white">{notification.title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</div>
      </div>
      {notification.userActions && (
        <div className="flex items-center gap-2 ml-4">
          {notification.userActions.map((userAction, idx) => (
            <button
              key={idx}
              className={`${styles.button} ${styles.buttonPrimary} text-sm`}
              onClick={() => onRespond(notification.id, userAction.action)}
            >
              {userAction.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * History item component
 */
function HistoryItem({ history }: { history: FlagChangeHistory }) {
  const changeText = `${history.previousState} → ${history.newState}`;

  return (
    <div className={styles.historyItem}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={styles.historyChange}>{history.featureId}: {changeText}</div>
          <div className={styles.historyReason}>{history.reason}</div>
          {history.resourceImpact && (
            <div className="text-xs text-gray-500 mt-1">
              Impact: CPU {history.resourceImpact.cpuChange > 0 ? '+' : ''}
              {history.resourceImpact.cpuChange}%, Memory {history.resourceImpact.memoryChange > 0 ? '+' : ''}
              {history.resourceImpact.memoryChange}%
            </div>
          )}
        </div>
        <div className={styles.historyTime}>
          {new Date(history.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function FlagAutomationDashboard() {
  const [engine] = useState<AutomationEngine>(() => getAutomationEngine());
  const [flags, setFlags] = useState<AutomationFlag[]>([]);
  const [recommendations, setRecommendations] = useState<AutomationAction[]>([]);
  const [notifications, setNotifications] = useState<AutomationNotification[]>([]);
  const [history, setHistory] = useState<FlagChangeHistory[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [config, setConfig] = useState(engine.getConfig());
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadData();

    // Set up refresh interval
    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [engine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [flagsData, recommendationsData, notificationsData, historyData, metricsData] =
        await Promise.all([
          Promise.resolve(engine.getFlags()),
          engine.getRecommendedActions(),
          Promise.resolve(engine.getNotifications()),
          Promise.resolve(engine.getChangeHistory()),
          Promise.resolve(engine.getMetrics()),
        ]);

      setFlags(flagsData);
      setRecommendations(recommendationsData);
      setNotifications(notificationsData);
      setHistory(historyData.slice(0, 50)); // Last 50 entries
      setMetrics(metricsData);
      setConfig(engine.getConfig());
    } catch (error) {
      console.error('Failed to load automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flag actions
  const handleEnableFlag = async (flagId: string) => {
    const flag = flags.find(f => f.id === flagId);
    if (flag) {
      engine.updateFlag(flagId, { state: 'forced' });
      await engine.executeFlagChange(flagId, 'forced');
      loadData();
    }
  };

  const handleDisableFlag = async (flagId: string) => {
    const flag = flags.find(f => f.id === flagId);
    if (flag) {
      engine.updateFlag(flagId, { state: 'blocked' });
      await engine.executeFlagChange(flagId, 'blocked');
      loadData();
    }
  };

  const handleResetFlag = async (flagId: string) => {
    engine.updateFlag(flagId, { state: 'auto' });
    loadData();
  };

  const handleOptOutFlag = (flagId: string) => {
    engine.optOutFlag(flagId);
    loadData();
  };

  const handleOptInFlag = (flagId: string) => {
    engine.optInFlag(flagId);
    loadData();
  };

  // Recommendation actions
  const handleApproveRecommendation = async (recommendation: AutomationAction) => {
    await engine.executeFlagChange(recommendation.featureId, recommendation.recommendedState, recommendation);
    loadData();
  };

  const handleDenyRecommendation = (recommendation: AutomationAction) => {
    console.log('Recommendation denied:', recommendation);
    loadData();
  };

  // Notification actions
  const handleRespondNotification = async (
    notificationId: string,
    response: 'approve' | 'deny' | 'defer'
  ) => {
    await engine.respondToNotification(notificationId, response);
    loadData();
  };

  // Control actions
  const handleToggleAutomation = () => {
    engine.updateConfig({ enabled: !config.enabled });
    setConfig(engine.getConfig());
  };

  // Filter flags
  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filter === 'all' ||
      (filter === 'automated' && flag.automationEnabled && !flag.userOptedOut) ||
      (filter === 'manual' && (!flag.automationEnabled || flag.userOptedOut)) ||
      (filter === 'enabled' && (flag.state === 'enabled' || flag.state === 'forced')) ||
      (filter === 'disabled' && (flag.state === 'disabled' || flag.state === 'blocked'));

    return matchesSearch && matchesFilter;
  });

  if (loading && flags.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚙️</div>
          <div className={styles.emptyText}>Loading automation system...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Feature Flag Automation</h1>
        <p className={styles.subtitle}>
          Intelligent feature management based on world model predictions
        </p>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className={styles.metricsGrid}>
          <MetricCard
            label="Total Evaluations"
            value={metrics.totalEvaluations}
          />
          <MetricCard
            label="Actions Executed"
            value={metrics.totalExecutions}
            trend={`${metrics.automaticExecutions} automatic`}
          />
          <MetricCard
            label="Issues Prevented"
            value={metrics.issuesPrevented}
            trendPositive
          />
          <MetricCard
            label="Avg Confidence"
            value={`${Math.round(metrics.avgConfidence * 100)}%`}
          />
        </div>
      )}

      {/* Controls */}
      <div className={styles.controlsBar}>
        <div className={styles.controlGroup}>
          <button
            className={`${styles.button} ${config.enabled ? styles.buttonSuccess : styles.buttonSecondary}`}
            onClick={handleToggleAutomation}
          >
            {config.enabled ? 'Automation Enabled' : 'Automation Disabled'}
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={loadData}
          >
            Refresh
          </button>
        </div>
        <div className={styles.controlGroup}>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Evaluation: Every {config.evaluationInterval / 1000}s
          </span>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className={styles.notificationsPanel}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pending Notifications ({notifications.length})
          </h3>
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRespond={handleRespondNotification}
            />
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className={styles.recommendationsPanel}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recommended Actions ({recommendations.length})
          </h3>
          {recommendations.slice(0, 5).map(recommendation => (
            <RecommendationItem
              key={recommendation.id}
              recommendation={recommendation}
              onApprove={handleApproveRecommendation}
              onDeny={handleDenyRecommendation}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search flags..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Flags</option>
          <option value="automated">Automated</option>
          <option value="manual">Manual</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Flags List */}
      <div className={styles.flagsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Feature Flags ({filteredFlags.length})</h2>
          <p className={styles.sectionSubtitle}>
            Manage automation settings for each feature
          </p>
        </div>
        <div className={styles.flagList}>
          {filteredFlags.map(flag => (
            <FlagItem
              key={flag.id}
              flag={flag}
              onEnable={handleEnableFlag}
              onDisable={handleDisableFlag}
              onReset={handleResetFlag}
              onOptOut={handleOptOutFlag}
              onOptIn={handleOptInFlag}
            />
          ))}
          {filteredFlags.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyText}>No flags match your filters</div>
            </div>
          )}
        </div>
      </div>

      {/* Change History */}
      {history.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Change History</h2>
            <p className={styles.sectionSubtitle}>
              Recent automated and manual changes
            </p>
          </div>
          <div className={styles.historyList}>
            {history.map(h => (
              <HistoryItem key={h.id} history={h} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
