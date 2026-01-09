/**
 * SmartCost Dashboard - Configuration Panel Component
 *
 * Full-featured configuration UI for dashboard settings
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  RotateCcw,
  X,
  ChevronDown,
  ChevronRight,
  Sliders,
  Palette,
  Layout,
  Bell,
  Database,
} from 'lucide-react';
import type { ConfigurationPanelProps, DashboardConfig } from '../types/dashboard';

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
  onSave,
  onReset,
  readOnly = false,
}) => {
  const [activeSection, setActiveSection] = useState<string>('general');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));

  /**
   * Toggle section expanded state
   */
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  /**
   * Handle config change
   */
  const handleConfigChange = (path: string, value: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    onChange(newConfig);
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    onSave?.();
  };

  /**
   * Handle reset
   */
  const handleReset = () => {
    onReset?.();
  };

  const sections = [
    { id: 'general', label: 'General', icon: Sliders },
    { id: 'theme', label: 'Appearance', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'charts', label: 'Charts', icon: Database },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configuration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize your dashboard
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {onReset && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            {onSave && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Configuration sections */}
      <div className="space-y-4">
        {/* General Settings */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                General Settings
              </span>
            </div>
            {expandedSections.has('general') ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.has('general') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
            >
              {/* Enable real-time */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable Real-time Updates
                  </span>
                  <input
                    type="checkbox"
                    checked={config.enableRealTime ?? true}
                    onChange={(e) => handleConfigChange('enableRealTime', e.target.checked)}
                    disabled={readOnly}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Receive live updates via WebSocket connection
                </p>
              </div>

              {/* Update interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Update Interval
                </label>
                <select
                  value={config.updateInterval ?? 1000}
                  onChange={(e) => handleConfigChange('updateInterval', Number(e.target.value))}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value={500}>0.5 seconds</option>
                  <option value={1000}>1 second</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                </select>
              </div>

              {/* WebSocket URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  WebSocket URL
                </label>
                <input
                  type="text"
                  value={config.websocketUrl ?? ''}
                  onChange={(e) => handleConfigChange('websocketUrl', e.target.value)}
                  disabled={readOnly}
                  placeholder="ws://localhost:3000"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Theme Settings */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('theme')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Appearance
              </span>
            </div>
            {expandedSections.has('theme') ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.has('theme') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
            >
              {/* Dark mode */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Dark Mode
                  </span>
                  <input
                    type="checkbox"
                    checked={config.theme?.darkMode ?? false}
                    onChange={(e) =>
                      handleConfigChange('theme.darkMode', e.target.checked)
                    }
                    disabled={readOnly}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Primary color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.theme?.colors?.primary ?? '#3b82f6'}
                    onChange={(e) =>
                      handleConfigChange('theme.colors.primary', e.target.value)
                    }
                    disabled={readOnly}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.theme?.colors?.primary ?? '#3b82f6'}
                    onChange={(e) =>
                      handleConfigChange('theme.colors.primary', e.target.value)
                    }
                    disabled={readOnly}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              {/* Custom CSS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom CSS
                </label>
                <textarea
                  value={config.theme?.customCSS ?? ''}
                  onChange={(e) =>
                    handleConfigChange('theme.customCSS', e.target.value)
                  }
                  disabled={readOnly}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="/* Custom CSS here */"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Layout Settings */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('layout')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layout className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Layout
              </span>
            </div>
            {expandedSections.has('layout') ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.has('layout') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
            >
              {/* Layout mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Layout Mode
                </label>
                <select
                  value={config.layout?.mode ?? 'grid'}
                  onChange={(e) => handleConfigChange('layout.mode', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="grid">Grid</option>
                  <option value="list">List</option>
                  <option value="compact">Compact</option>
                </select>
              </div>

              {/* Card size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Size
                </label>
                <select
                  value={config.layout?.cardSize ?? 'medium'}
                  onChange={(e) => handleConfigChange('layout.cardSize', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Component visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Show Components
                </label>
                <div className="space-y-2">
                  {Object.entries(config.layout?.showComponents ?? {}).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) =>
                          handleConfigChange(`layout.showComponents.${key}`, e.target.checked)
                        }
                        disabled={readOnly}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Alert Settings */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('alerts')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                Alerts
              </span>
            </div>
            {expandedSections.has('alerts') ? (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {expandedSections.has('alerts') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
            >
              {/* Enable sound */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable Sound Alerts
                  </span>
                  <input
                    type="checkbox"
                    checked={config.alerts?.enableSound ?? false}
                    onChange={(e) =>
                      handleConfigChange('alerts.enableSound', e.target.checked)
                    }
                    disabled={readOnly}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Enable notifications */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable Desktop Notifications
                  </span>
                  <input
                    type="checkbox"
                    checked={config.alerts?.enableNotifications ?? false}
                    onChange={(e) =>
                      handleConfigChange('alerts.enableNotifications', e.target.checked)
                    }
                    disabled={readOnly}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Auto-dismiss */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Auto-dismiss Alerts (ms)
                </label>
                <input
                  type="number"
                  value={config.alerts?.autoDismiss ?? 5000}
                  onChange={(e) =>
                    handleConfigChange('alerts.autoDismiss', Number(e.target.value))
                  }
                  disabled={readOnly}
                  min={0}
                  step={1000}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ConfigurationPanel;
