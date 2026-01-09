/**
 * SmartCost Dashboard - Alert List Component
 *
 * Displays alerts with filtering and acknowledgment functionality
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Check,
  Bell,
  BellOff,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AlertListProps, DashboardAlert, AlertSeverity } from '../types/dashboard';

export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  maxAlerts = 10,
  filterSeverity,
  onAcknowledge,
  onDismiss,
}) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AlertSeverity | 'all'>('all');

  /**
   * Filter and sort alerts
   */
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by severity
    if (filterSeverity && filterSeverity.length > 0) {
      filtered = filtered.filter(alert => filterSeverity.includes(alert.severity));
    }

    // Apply manual filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === activeFilter);
    }

    // Sort by timestamp (newest first) and acknowledgment status
    filtered.sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) {
        return a.acknowledged ? 1 : -1;
      }
      return b.timestamp - a.timestamp;
    });

    // Limit to maxAlerts
    return filtered.slice(0, maxAlerts);
  }, [alerts, maxAlerts, filterSeverity, activeFilter]);

  /**
   * Get alert icon
   */
  const getAlertIcon = (alert: DashboardAlert) => {
    const iconClass = "w-5 h-5 flex-shrink-0";

    switch (alert.severity) {
      case 'critical':
        return <AlertTriangle className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500 dark:text-red-400`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
    }
  };

  /**
   * Get alert color classes
   */
  const getAlertClasses = (alert: DashboardAlert) => {
    const baseClasses = "border-l-4 rounded-r-lg p-4 transition-all duration-200";

    switch (alert.severity) {
      case 'critical':
        return `${baseClasses} bg-red-50 dark:bg-red-950 border-red-500 dark:border-red-400`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-500`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 dark:bg-yellow-950 border-yellow-500 dark:border-yellow-400`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-400`;
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  /**
   * Handle acknowledge
   */
  const handleAcknowledge = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onAcknowledge?.(alertId);
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.(alertId);
  };

  /**
   * Get severity counts
   */
  const severityCounts = useMemo(() => {
    return {
      all: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      error: alerts.filter(a => a.severity === 'error').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    };
  }, [alerts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
            <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alerts
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAlerts.length} of {alerts.length} alerts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Toggle filters"
        >
          {showFilters ? (
            <BellOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-gray-800 dark:bg-gray-700 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All ({severityCounts.all})
              </button>
              <button
                onClick={() => setActiveFilter('critical')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950'
                }`}
              >
                Critical ({severityCounts.critical})
              </button>
              <button
                onClick={() => setActiveFilter('error')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950'
                }`}
              >
                Error ({severityCounts.error})
              </button>
              <button
                onClick={() => setActiveFilter('warning')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'warning'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-950'
                }`}
              >
                Warning ({severityCounts.warning})
              </button>
              <button
                onClick={() => setActiveFilter('info')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === 'info'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950'
                }`}
              >
                Info ({severityCounts.info})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert list */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No alerts to display
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Everything is running smoothly
              </p>
            </motion.div>
          ) : (
            filteredAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={`${getAlertClasses(alert)} ${
                  alert.acknowledged ? 'opacity-60' : 'opacity-100'
                } cursor-pointer`}
                onClick={() => setExpandedAlert(
                  expandedAlert === alert.id ? null : alert.id
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alert)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-gray-900 dark:text-white ${
                          alert.acknowledged ? 'line-through' : ''
                        }`}>
                          {alert.title}
                          {alert.acknowledged && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                              (Acknowledged)
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatTimestamp(alert.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!alert.acknowledged && onAcknowledge && (
                          <button
                            onClick={(e) => handleAcknowledge(alert.id, e)}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                            title="Acknowledge"
                          >
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        )}
                        {onDismiss && (
                          <button
                            onClick={(e) => handleDismiss(alert.id, e)}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                            title="Dismiss"
                          >
                            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded transition-colors"
                          title={expandedAlert === alert.id ? 'Collapse' : 'Expand'}
                        >
                          {expandedAlert === alert.id ? (
                            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {expandedAlert === alert.id && alert.data && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600"
                        >
                          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto">
                            {JSON.stringify(alert.data, null, 2)}
                          </pre>

                          {/* Actions */}
                          {alert.actions && alert.actions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {alert.actions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.handler();
                                  }}
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    action.type === 'primary'
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : action.type === 'danger'
                                      ? 'bg-red-600 text-white hover:bg-red-700'
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AlertList;
