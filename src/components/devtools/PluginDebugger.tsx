/**
 * Plugin Debugger - Debug and Monitor Plugins
 *
 * @component components/devtools/PluginDebugger
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Play, Square, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getPluginManager } from '../../lib/plugin/manager';
import type { PluginManifest, PluginRuntimeState } from '../../lib/plugin/types';

export function PluginDebugger() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [states, setStates] = useState<Record<string, PluginRuntimeState>>({});
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load plugins
  const loadPlugins = async () => {
    try {
      setLoading(true);
      const manager = getPluginManager();
      const installedPlugins = await manager.getInstalledPlugins();
      setPlugins(installedPlugins);

      // Load states
      const pluginStates: Record<string, PluginRuntimeState> = {};
      for (const plugin of installedPlugins) {
        const state = await manager.getPluginState(plugin.id);
        if (state) {
          pluginStates[plugin.id] = state;
        }
      }
      setStates(pluginStates);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
    const interval = setInterval(loadPlugins, 3000);
    return () => clearInterval(interval);
  }, []);

  // Activate plugin
  const activatePlugin = async (pluginId: string) => {
    try {
      const manager = getPluginManager();
      await manager.activate(pluginId as any);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to activate plugin:', error);
    }
  };

  // Deactivate plugin
  const deactivatePlugin = async (pluginId: string) => {
    try {
      const manager = getPluginManager();
      await manager.deactivate(pluginId as any);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to deactivate plugin:', error);
    }
  };

  // Get state icon
  const getStateIcon = (state?: PluginRuntimeState) => {
    if (!state) return <AlertTriangle className="w-4 h-4 text-gray-500" />;

    switch (state.state) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get plugin state
  const getPluginState = (pluginId: string) => {
    return states[pluginId];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Plugin List */}
      <div className="flex-1 overflow-auto">
        {plugins.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No plugins installed
          </div>
        ) : (
          <div className="divide-y divide-border">
            {plugins.map((plugin) => {
              const state = getPluginState(plugin.id);
              const isActive = state?.state === 'active';

              return (
                <div key={plugin.id}>
                  <button
                    onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
                    className="w-full p-3 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {getStateIcon(state)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{plugin.name}</span>
                          <span className="text-xs text-muted-foreground">{plugin.version}</span>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {plugin.description}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          {isActive ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deactivatePlugin(plugin.id);
                              }}
                              className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors flex items-center gap-1"
                            >
                              <Square className="w-3 h-3" />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                activatePlugin(plugin.id);
                              }}
                              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Activate
                            </button>
                          )}

                          <span className="text-xs text-muted-foreground capitalize">
                            {state?.state || 'unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {selectedPlugin === plugin.id && state && (
                    <div className="px-3 pb-3 pl-11 space-y-2">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-muted rounded p-2">
                          <div className="font-semibold">Activations</div>
                          <div className="text-lg">{state.stats.activationCount}</div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="font-semibold">Executions</div>
                          <div className="text-lg">{state.stats.executionCount}</div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="font-semibold">Errors</div>
                          <div className="text-lg text-red-500">{state.stats.errorCount}</div>
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted rounded p-2">
                          <div className="font-semibold">CPU Time</div>
                          <div>{state.stats.cpuTime.toFixed(2)}ms</div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="font-semibold">Peak Memory</div>
                          <div>{state.stats.peakMemoryMB}MB</div>
                        </div>
                      </div>

                      {/* Errors */}
                      {state.errors.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">Errors</div>
                          <div className="space-y-1">
                            {state.errors.map((error) => (
                              <div key={error.id} className="bg-destructive/10 text-destructive text-xs p-2 rounded">
                                <div className="font-semibold">{error.code}</div>
                                <div>{error.message}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Permissions */}
                      {state.grantedPermissions.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-1">Permissions</div>
                          <div className="flex flex-wrap gap-1">
                            {state.grantedPermissions.map((permission) => (
                              <span
                                key={permission}
                                className="px-1.5 py-0.5 text-xs bg-muted rounded"
                              >
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
