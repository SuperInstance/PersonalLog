/**
 * Plugin List Component
 *
 * Displays list of installed plugins with filtering and search.
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Package } from 'lucide-react';
import { PluginCard } from './PluginCard';
import type { PluginManifest, PluginRuntimeState } from '@/lib/plugin';

export interface PluginListProps {
  plugins: Array<{
    manifest: PluginManifest;
    state: PluginRuntimeState;
  }>;
  onEnable: (pluginId: string) => void;
  onDisable: (pluginId: string) => void;
  onUninstall: (pluginId: string) => void;
  onConfigure: (pluginId: string) => void;
}

export function PluginList({
  plugins,
  onEnable,
  onDisable,
  onUninstall,
  onConfigure,
}: PluginListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'error'>('all');

  const filteredPlugins = useMemo(() => {
    return plugins.filter(({ manifest, state }) => {
      // Status filter
      if (filterType === 'active' && !state.enabled) return false;
      if (filterType === 'inactive' && state.enabled) return false;
      if (filterType === 'error' && state.state !== 'error') return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          manifest.name.toLowerCase().includes(query) ||
          manifest.description.toLowerCase().includes(query) ||
          manifest.author.name.toLowerCase().includes(query) ||
          manifest.keywords.some((k) => k.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [plugins, searchQuery, filterType]);

  const activeCount = plugins.filter((p) => p.state.enabled).length;
  const errorCount = plugins.filter((p) => p.state.state === 'error').length;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              All ({plugins.length})
            </button>
            <button
              onClick={() => setFilterType('active')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterType('inactive')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterType === 'inactive'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              Disabled ({plugins.length - activeCount})
            </button>
            {errorCount > 0 && (
              <button
                onClick={() => setFilterType('error')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterType === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                Errors ({errorCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plugin List */}
      {filteredPlugins.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {searchQuery || filterType !== 'all' ? 'No plugins found' : 'No plugins installed'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : filterType !== 'all'
              ? 'No plugins match the current filter'
              : 'Install your first plugin to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlugins.map(({ manifest, state }) => (
            <PluginCard
              key={manifest.id}
              manifest={manifest}
              state={state}
              onEnable={onEnable}
              onDisable={onDisable}
              onUninstall={onUninstall}
              onConfigure={onConfigure}
            />
          ))}
        </div>
      )}
    </div>
  );
}
