/**
 * Proactive Notifications UI Component
 *
 * Displays smart proactive notifications with urgency indicators,
 * action buttons, and user feedback collection.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ProactiveNotification,
  NotificationUrgency,
  NotificationQueueStats,
} from '@/lib/notifications/types';
import {
  getNotificationEngine,
} from '@/lib/notifications/proactive-notifications';

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '24px',
    right: '24px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxWidth: '420px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
  },

  notification: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    padding: '16px',
    transition: 'all 0.3s ease',
    borderLeft: '4px solid #ccc',
  },

  urgencyColors: {
    low: '#3b82f6',      // blue
    medium: '#f59e0b',   // amber
    high: '#ef4444',     // red
    critical: '#dc2626', // dark red
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },

  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    flex: 1,
  },

  urgencyBadge: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    padding: '4px 8px',
    borderRadius: '4px',
    marginLeft: '8px',
  },

  message: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5',
    marginBottom: '12px',
  },

  details: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '12px',
    padding: '8px',
    background: '#f9fafb',
    borderRadius: '6px',
  },

  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },

  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  },

  primaryButton: {
    background: '#3b82f6',
    color: 'white',
  },

  secondaryButton: {
    background: '#f3f4f6',
    color: '#374151',
  },

  feedback: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },

  feedbackButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    background: 'white',
    transition: 'all 0.2s ease',
  },

  statsPanel: {
    background: 'white',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '12px',
  },

  statsText: {
    fontSize: '12px',
    color: '#6b7280',
  },

  empty: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#9ca3af',
    fontSize: '14px',
  },
};

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: ProactiveNotification;
  onDismiss: (id: string) => void;
  onExecuteAction: (notificationId: string, actionId: string) => void;
  onSnooze: (id: string) => void;
  onFeedback: (id: string, helpful: boolean) => void;
}

function NotificationItem({
  notification,
  onDismiss,
  onExecuteAction,
  onSnooze,
  onFeedback,
}: NotificationItemProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleAction = useCallback((actionId: string) => {
    onExecuteAction(notification.id, actionId);
    setShowFeedback(true);
  }, [notification.id, onExecuteAction]);

  const handleFeedback = useCallback((helpful: boolean) => {
    onFeedback(notification.id, helpful);
    setFeedbackGiven(true);
  }, [notification.id, onFeedback]);

  const urgencyColor = styles.urgencyColors[notification.urgency];

  return (
    <div
      style={{
        ...styles.notification,
        borderLeftColor: urgencyColor,
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>{notification.title}</h3>
        <div
          style={{
            ...styles.urgencyBadge,
            background: urgencyColor,
            color: 'white',
          }}
        >
          {notification.urgency}
        </div>
      </div>

      {/* Message */}
      <p style={styles.message}>{notification.message}</p>

      {/* Details */}
      <div style={styles.details}>
        <div><strong>Why:</strong> {notification.impact}</div>
        {notification.timeframe > 0 && (
          <div>
            <strong>When:</strong> In {Math.round(notification.timeframe / 60000)} minutes
          </div>
        )}
        {notification.estimatedResolutionTime && (
          <div>
            <strong>Time to resolve:</strong> {Math.round(notification.estimatedResolutionTime / 1000)}s
          </div>
        )}
        <div style={{ fontSize: '11px', marginTop: '4px' }}>
          Confidence: {Math.round(notification.confidence * 100)}%
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {notification.actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            style={{
              ...styles.button,
              ...(action.primary ? styles.primaryButton : styles.secondaryButton),
            }}
            disabled={feedbackGiven}
          >
            {action.label}
          </button>
        ))}

        {notification.urgency !== 'critical' && !feedbackGiven && (
          <button
            onClick={() => onSnooze(notification.id)}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            Snooze
          </button>
        )}

        {!feedbackGiven && (
          <button
            onClick={() => onDismiss(notification.id)}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Feedback */}
      {(showFeedback || feedbackGiven) && (
        <div style={styles.feedback}>
          <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>
            Was this helpful?
          </span>
          {!feedbackGiven ? (
            <>
              <button
                onClick={() => handleFeedback(true)}
                style={styles.feedbackButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d1fae5';
                  e.currentTarget.style.borderColor = '#10b981';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                👍 Yes
              </button>
              <button
                onClick={() => handleFeedback(false)}
                style={styles.feedbackButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                👎 No
              </button>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: '#10b981' }}>
              Thanks for your feedback!
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProactiveNotificationsProps {
  maxNotifications?: number;
  showStats?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export function ProactiveNotifications({
  maxNotifications = 5,
  showStats = true,
  autoHide = true,
  autoHideDelay = 10000,
}: ProactiveNotificationsProps) {
  const [notifications, setNotifications] = useState<ProactiveNotification[]>([]);
  const [stats, setStats] = useState<NotificationQueueStats | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const engine = getNotificationEngine();

  // Load pending notifications periodically
  useEffect(() => {
    const loadNotifications = () => {
      const pending = engine.getPendingNotifications();
      const toShow = pending
        .filter(entry => entry.canShow && !hidden.has(entry.notification.id))
        .slice(0, maxNotifications)
        .map(entry => entry.notification);

      setNotifications(toShow);

      if (showStats) {
        setStats(engine.getQueueStats());
      }
    };

    // Initial load
    loadNotifications();

    // Refresh every 5 seconds
    const interval = setInterval(loadNotifications, 5000);

    return () => clearInterval(interval);
  }, [engine, maxNotifications, showStats, hidden]);

  // Auto-hide notifications
  useEffect(() => {
    if (!autoHide) return;

    const timers = notifications.map(notification => {
      return setTimeout(() => {
        setHidden(prev => new Set([...prev, notification.id]));
      }, autoHideDelay);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, autoHide, autoHideDelay]);

  // Handle dismiss
  const handleDismiss = useCallback((id: string) => {
    engine.dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [engine]);

  // Handle execute action
  const handleExecuteAction = useCallback((notificationId: string, actionId: string) => {
    engine.executeAction(notificationId, actionId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, [engine]);

  // Handle snooze
  const handleSnooze = useCallback((id: string) => {
    engine.snoozeNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [engine]);

  // Handle feedback
  const handleFeedback = useCallback((id: string, helpful: boolean) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    // Record feedback (this would update the notification engine)
    console.log('[ProactiveNotifications] Feedback:', id, helpful);

    // Auto-hide after feedback
    setTimeout(() => {
      setHidden(prev => new Set([...prev, id]));
    }, 2000);
  }, [notifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Stats Panel */}
      {showStats && stats && (
        <div style={styles.statsPanel}>
          <div style={styles.statsText}>
            <strong>{stats.totalPending}</strong> pending notifications
            {stats.byUrgency.critical > 0 && (
              <span style={{ color: styles.urgencyColors.critical, marginLeft: '8px' }}>
                • {stats.byUrgency.critical} critical
              </span>
            )}
            {stats.byUrgency.high > 0 && (
              <span style={{ color: styles.urgencyColors.high, marginLeft: '8px' }}>
                • {stats.byUrgency.high} high
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
          onExecuteAction={handleExecuteAction}
          onSnooze={handleSnooze}
          onFeedback={handleFeedback}
        />
      ))}
    </div>
  );
}

// ============================================================================
// NOTIFICATION PREFERENCES COMPONENT
// ============================================================================

interface NotificationPreferencesPanelProps {
  onClose?: () => void;
}

export function NotificationPreferencesPanel({
  onClose,
}: NotificationPreferencesPanelProps) {
  const [settings, setSettings] = useState(() => getNotificationEngine().getSettings());
  const [saved, setSaved] = useState(false);

  const handleToggle = useCallback((trigger: string, enabled: boolean) => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [trigger]: {
          ...settings.preferences[trigger as keyof typeof settings.preferences],
          enabled,
        },
      },
    };
    setSettings(newSettings);
    getNotificationEngine().updateSettings(newSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const handleQuietHoursToggle = useCallback(() => {
    const newSettings = {
      ...settings,
      quietHours: {
        ...settings.quietHours,
        enabled: !settings.quietHours.enabled,
      },
    };
    setSettings(newSettings);
    getNotificationEngine().updateSettings(newSettings);
  }, [settings]);

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      padding: '24px',
      zIndex: 10000,
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Notification Preferences</h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            ×
          </button>
        )}
      </div>

      {saved && (
        <div style={{
          padding: '12px',
          background: '#d1fae5',
          color: '#065f46',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          Preferences saved successfully!
        </div>
      )}

      {/* Global Settings */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Global Settings</h3>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => {
              const newSettings = { ...settings, enabled: e.target.checked };
              setSettings(newSettings);
              getNotificationEngine().updateSettings(newSettings);
            }}
            style={{ marginRight: '8px' }}
          />
          Enable proactive notifications
        </label>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.quietHours.enabled}
            onChange={handleQuietHoursToggle}
            style={{ marginRight: '8px' }}
          />
          Quiet hours ({settings.quietHours.start}:00 - {settings.quietHours.end}:00)
        </label>

        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.enableLearning}
            onChange={(e) => {
              const newSettings = { ...settings, enableLearning: e.target.checked };
              setSettings(newSettings);
              getNotificationEngine().updateSettings(newSettings);
            }}
            style={{ marginRight: '8px' }}
          />
          Learn from my feedback
        </label>
      </div>

      {/* Per-Type Preferences */}
      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Notification Types</h3>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {Object.entries(settings.preferences).map(([trigger, prefs]) => (
            <div
              key={trigger}
              style={{
                padding: '12px',
                background: '#f9fafb',
                borderRadius: '6px',
                marginBottom: '8px',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) => handleToggle(trigger, e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  {trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </label>

              {prefs.helpfulnessScore !== 0 && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', marginLeft: '24px' }}>
                  Helpfulness: {prefs.helpfulnessScore > 0 ? '😊' : '😞'} ({Math.abs(Math.round(prefs.helpfulnessScore * 100))}%)
                  {prefs.actionCount > 0 && ` • Acted upon ${prefs.actionCount} times`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICATION HISTORY COMPONENT
// ============================================================================

interface NotificationHistoryProps {
  limit?: number;
}

export function NotificationHistory({ limit = 50 }: NotificationHistoryProps) {
  const [history, setHistory] = useState(() =>
    getNotificationEngine().getHistory(limit)
  );
  const [metrics, setMetrics] = useState(() =>
    getNotificationEngine().getEffectivenessMetrics()
  );

  const refresh = useCallback(() => {
    setHistory(getNotificationEngine().getHistory(limit));
    setMetrics(getNotificationEngine().getEffectivenessMetrics());
  }, [limit]);

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Notification History</h2>
        <button
          onClick={refresh}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Shown</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {metrics.totalShown}
          </div>
        </div>

        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Action Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {Math.round(metrics.actionRate * 100)}%
          </div>
        </div>

        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Prevented</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#10b981' }}>
            {metrics.issuesPrevented}
          </div>
        </div>

        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Helpfulness</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
            {Math.round(metrics.avgHelpfulness * 100)}%
          </div>
        </div>
      </div>

      {/* History List */}
      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Recent Notifications</h3>

        {history.length === 0 ? (
          <div style={styles.empty}>No notification history yet</div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {history.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>
                    {entry.trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </strong>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {new Date(entry.shownAt).toLocaleString()}
                  </span>
                </div>

                {entry.action && (
                  <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                    ✓ Action taken: {entry.action}
                  </div>
                )}

                {entry.feedback && (
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {entry.feedback.helpful ? '😊' : '😞'} Helpful
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProactiveNotifications;
