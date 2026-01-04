/**
 * Plugin Card Component
 *
 * Displays plugin information with enable/disable and configuration options.
 */

'use client';

import { useState } from 'react';
import {
  Package,
  Power,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import type { PluginManifest, PluginRuntimeState } from '@/lib/plugin';

export interface PluginCardProps {
  manifest: PluginManifest;
  state: PluginRuntimeState;
  onEnable: (pluginId: string) => void;
  onDisable: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
  onConfigure: (pluginId: string) => void;
}

export function PluginCard({
  manifest,
  state,
  onEnable,
  onDisable,
  onUninstall,
  onConfigure,
}: PluginCardProps) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    state.state === 'active'
      ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
      : state.state === 'error'
      ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
      : 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';

  const statusText =
    state.state === 'active'
      ? 'Active'
      : state.state === 'error'
      ? 'Error'
      : state.state === 'inactive'
      ? 'Disabled'
      : state.state === 'loading'
      ? 'Loading'
      : 'Installed';

  const canToggle = state.state !== 'loading' && state.state !== 'uninstalling';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Plugin Icon */}
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          {manifest.icon ? (
            <img src={manifest.icon} alt={manifest.name} className="w-8 h-8" />
          ) : (
            <Package className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Plugin Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {manifest.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusText}
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {manifest.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span>v{manifest.version}</span>
            <span>by {manifest.author.name}</span>
            {manifest.type.length > 0 && (
              <span className="capitalize">{manifest.type[0]}</span>
            )}
          </div>

          {/* Error Display */}
          {state.state === 'error' && state.errors.length > 0 && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{state.errors[state.errors.length - 1].message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Enable/Disable Toggle */}
          <Switch
            checked={state.enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                onEnable(manifest.id);
              } else {
                onDisable(manifest.id);
              }
            }}
            disabled={!canToggle}
          />

          {/* Configure Button */}
          {manifest.settingsSchema && Object.keys(manifest.settingsSchema).length > 0 && (
            <button
              onClick={() => onConfigure(manifest.id)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Configure"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Show details"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {/* Uninstall Button */}
          <button
            onClick={() => {
              if (confirm(`Uninstall ${manifest.name}?`)) {
                onUninstall(manifest.id);
              }
            }}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Uninstall"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Permissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {manifest.permissions.map((permission) => (
                <span
                  key={permission}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>

          {/* Keywords */}
          {manifest.keywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {manifest.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-4 text-sm">
            {manifest.homepage && (
              <a
                href={manifest.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Homepage
              </a>
            )}
            {manifest.repository && (
              <a
                href={manifest.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Repository
              </a>
            )}
            {manifest.bugs && (
              <a
                href={manifest.bugs}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Report Issue
              </a>
            )}
          </div>

          {/* Statistics */}
          {state.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Activations</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {state.stats.activationCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Executions</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {state.stats.executionCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Errors</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {state.stats.errorCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Time</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {state.stats.avgExecutionTime.toFixed(0)}ms
                </div>
              </div>
            </div>
          )}

          {/* Dependencies */}
          {manifest.dependencies && manifest.dependencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Dependencies
              </h4>
              <div className="space-y-1">
                {manifest.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    {dep.required ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <span>{dep.id}</span>
                    <span className="text-gray-500 dark:text-gray-500 text-xs">
                      ({dep.version})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
