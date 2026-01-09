/**
 * SmartCost Dashboard - Main Dashboard Component
 *
 * Complete real-time dashboard with all visualizations
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { useSmartCostRealtime } from '../hooks/useSmartCostRealtime';
import { CostOverviewCard } from './CostOverviewCard';
import { ProviderComparisonChart } from './ProviderComparisonChart';
import { CostTrendGraph } from './CostTrendGraph';
import { BudgetProgressBar } from './BudgetProgressBar';
import { AlertList } from './AlertList';
import type { DashboardConfig, DashboardAlert, TimeRange } from '../types/dashboard';

export interface SmartCostDashboardProps {
  /** Dashboard configuration */
  config?: DashboardConfig;

  /** Initial budget */
  budget: number;

  /** WebSocket URL */
  websocketUrl?: string;

  /** Enable real-time updates */
  enableRealTime?: boolean;

  /** On configuration change */
  onConfigChange?: (config: DashboardConfig) => void;
}

export const SmartCostDashboard: React.FC<SmartCostDashboardProps> = ({
  config: initialConfig = {},
  budget,
  websocketUrl,
  enableRealTime = true,
  onConfigChange,
}) => {
  // State
  const [config, setConfig] = useState<DashboardConfig>({
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
        background: '#ffffff',
        cardBackground: '#ffffff',
        text: '#111827',
        border: '#e5e7eb',
        gridLine: '#e5e7eb',
      },
      darkMode: false,
    },
    layout: {
      mode: 'grid',
      cardSize: 'medium',
      showComponents: {
        costOverview: true,
        savingsDisplay: true,
        providerComparison: true,
        costTrends: true,
        budgetProgress: true,
        alerts: true,
        cacheStats: true,
        routingStats: true,
      },
    },
    enableRealTime,
    updateInterval: 1000,
    websocketUrl,
    ...initialConfig,
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(config.theme?.darkMode || false);

  // Real-time hook
  const { state, connectionStatus, refresh, sendCommand } = useSmartCostRealtime(
    {},
    {
      url: websocketUrl,
      enabled: enableRealTime,
      onConnectionChange: (status) => {
        console.log('Connection status changed:', status);
      },
      onError: (error) => {
        console.error('Dashboard error:', error);
      },
    }
  );

  /**
   * Handle alert acknowledge
   */
  const handleAcknowledgeAlert = (alertId: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    }));

    // Send command to server
    sendCommand('acknowledgeAlert', { alertId });
  };

  /**
   * Handle alert dismiss
   */
  const handleDismissAlert = (alertId: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((alert) => alert.id !== alertId),
    }));

    // Send command to server
    sendCommand('dismissAlert', { alertId });
  };

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme!,
        darkMode: newDarkMode,
      },
    }));

    onConfigChange?.(config);

    // Apply dark mode to document
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    await refresh();
  };

  /**
   * Handle config update
   */
  const handleConfigUpdate = (newConfig: DashboardConfig) => {
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and title */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    SmartCost
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Real-time AI Cost Monitoring
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Connection status */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {connectionStatus.connected ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Live
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Offline
                      </span>
                    </>
                  )}
                </div>

                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={state.loading}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                      state.loading ? 'animate-spin' : ''
                    }`}
                  />
                </button>

                {/* Dark mode toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={darkMode ? 'Light mode' : 'Dark mode'}
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {/* Settings button */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Time Range:</span>
              <div className="flex gap-1">
                {(['1h', '24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedTimeRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedTimeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {range === '1h' ? '1H' :
                     range === '24h' ? '24H' :
                     range === '7d' ? '7D' :
                     range === '30d' ? '30D' : '90D'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status messages */}
          <AnimatePresence>
            {state.error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100">
                      Error Loading Data
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {state.error}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {!connectionStatus.connected && enableRealTime && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                      Connection Lost
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Attempting to reconnect... ({connectionStatus.reconnectAttempts} attempts)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Overview - Full width on mobile, half on desktop */}
            <div className="lg:col-span-2">
              <CostOverviewCard
                metrics={state.costMetrics}
                budget={budget}
                timeRange={selectedTimeRange}
              />
            </div>

            {/* Budget Progress - Full width */}
            <div className="lg:col-span-2">
              <BudgetProgressBar
                used={state.costMetrics.totalCost}
                total={budget}
                alertThreshold={config.theme?.colors?.warning ? 80 : 80}
              />
            </div>

            {/* Provider Comparison */}
            {config.layout?.showComponents?.providerComparison && (
              <div className="lg:col-span-1">
                <ProviderComparisonChart
                  providers={state.providerUsage}
                  chartType="bar"
                  metric="cost"
                  timeRange={selectedTimeRange}
                />
              </div>
            )}

            {/* Cost Trends */}
            {config.layout?.showComponents?.costTrends && (
              <div className="lg:col-span-1">
                <CostTrendGraph
                  history={state.costHistory}
                  budget={budget}
                  showBudgetLine={true}
                  showPredictions={true}
                  chartType="area"
                  timeRange={selectedTimeRange}
                />
              </div>
            )}

            {/* Alerts - Full width */}
            {config.layout?.showComponents?.alerts && (
              <div className="lg:col-span-2">
                <AlertList
                  alerts={state.alerts}
                  onAcknowledge={handleAcknowledgeAlert}
                  onDismiss={handleDismissAlert}
                />
              </div>
            )}
          </div>
        </main>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />

              {/* Settings panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Dashboard Settings
                    </h2>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Settings content */}
                  <div className="space-y-6">
                    {/* Real-time updates */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Real-time Updates
                      </h3>
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Enable live updates
                        </span>
                        <input
                          type="checkbox"
                          checked={config.enableRealTime}
                          onChange={(e) =>
                            handleConfigUpdate({
                              ...config,
                              enableRealTime: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    {/* Update interval */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Update Interval
                      </h3>
                      <select
                        value={config.updateInterval || 1000}
                        onChange={(e) =>
                          handleConfigUpdate({
                            ...config,
                            updateInterval: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                      >
                        <option value={500}>0.5 seconds</option>
                        <option value={1000}>1 second</option>
                        <option value={5000}>5 seconds</option>
                        <option value={10000}>10 seconds</option>
                        <option value={30000}>30 seconds</option>
                      </select>
                    </div>

                    {/* Theme */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Theme
                      </h3>
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Dark mode
                        </span>
                        <input
                          type="checkbox"
                          checked={darkMode}
                          onChange={toggleDarkMode}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    {/* Budget */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Budget Settings
                      </h3>
                      <input
                        type="number"
                        defaultValue={budget}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        placeholder="Monthly budget (USD)"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmartCostDashboard;
