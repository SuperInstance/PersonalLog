'use client';

/**
 * Plugins Settings Page
 *
 * Manage installed plugins - enable, disable, configure, and uninstall.
 * Install new plugins from files or URLs.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Puzzle, Loader2 } from 'lucide-react';
import { PluginList } from '@/components/plugins/PluginList';
import { PluginInstaller } from '@/components/plugins/PluginInstaller';
import { PluginSettings } from '@/components/plugins/PluginSettings';
import { getPluginManager } from '@/lib/plugin';
import { getPluginLoader } from '@/lib/plugin';
import type { PluginManifest, PluginRuntimeState } from '@/lib/plugin';

export default function PluginsPage() {
  const [loading, setLoading] = useState(true);
  const [plugins, setPlugins] = useState<Array<{ manifest: PluginManifest; state: PluginRuntimeState }>>([]);
  const [showInstaller, setShowInstaller] = useState(false);
  const [configuringPlugin, setConfiguringPlugin] = useState<string | null>(null);
  const [pluginSettings, setPluginSettings] = useState<Record<string, Record<string, any>>>({});

  const pluginManager = getPluginManager();
  const pluginLoader = getPluginLoader();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const manifests = await pluginManager.getInstalledPlugins();

      const pluginData = await Promise.all(
        manifests.map(async (manifest) => {
          const state = await pluginManager.getPluginState(manifest.id);
          const settings = await pluginManager['registry'].getPluginSettings(manifest.id);

          return {
            manifest,
            state: state!,
          };
        })
      );

      setPlugins(pluginData);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (pluginId: string) => {
    try {
      await pluginManager.enable(pluginId as any);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to enable plugin:', error);
      alert(`Failed to enable plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDisable = async (pluginId: string) => {
    try {
      await pluginManager.disable(pluginId as any);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to disable plugin:', error);
      alert(`Failed to disable plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      await pluginManager.uninstall(pluginId as any);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      alert(`Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleConfigure = (pluginId: string) => {
    setConfiguringPlugin(pluginId);
  };

  const handleInstallFromFile = async (file: File) => {
    return pluginLoader.loadFromFile(file);
  };

  const handleInstallFromURL = async (url: string) => {
    return pluginLoader.loadFromURL(url);
  };

  const handleSaveSettings = async (pluginId: string, settings: Record<string, any>) => {
    try {
      await pluginManager.updateSettings(pluginId as any, settings);
      await loadPlugins();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const configuringManifest = plugins.find((p) => p.manifest.id === configuringPlugin)?.manifest;
  const configuringSettings = configuringPlugin ? pluginSettings[configuringPlugin] || {} : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/settings"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Puzzle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Plugins
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {plugins.filter((p) => p.state.enabled).length} of {plugins.length} active
                </p>
              </div>
            </div>

            {/* Install Plugin Button */}
            <button
              onClick={() => setShowInstaller(!showInstaller)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-medium"
            >
              {showInstaller ? 'Cancel' : '+ Install Plugin'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Loading plugins...</p>
          </div>
        ) : showInstaller ? (
          <PluginInstaller
            onInstallFromFile={async (file) => {
              const result = await handleInstallFromFile(file);
              if (result.success) {
                await loadPlugins();
                setShowInstaller(false);
              }
              return result;
            }}
            onInstallFromURL={async (url) => {
              const result = await handleInstallFromURL(url);
              if (result.success) {
                await loadPlugins();
                setShowInstaller(false);
              }
              return result;
            }}
          />
        ) : (
          <PluginList
            plugins={plugins}
            onEnable={handleEnable}
            onDisable={handleDisable}
            onUninstall={handleUninstall}
            onConfigure={handleConfigure}
          />
        )}

        {/* Info Section */}
        {!loading && !showInstaller && (
          <div className="mt-8 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              About Plugins
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
              Plugins extend PersonalLog with new features and functionality. They run in a
              secure sandboxed environment with granular permission control.
            </p>
            <div className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>
                  <strong>Active:</strong> Plugin is running and can be used
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>
                  <strong>Disabled:</strong> Plugin is installed but not running
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>
                  <strong>Error:</strong> Plugin encountered an error (check details)
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Plugin Settings Modal */}
      {configuringManifest && configuringSettings !== null && (
        <PluginSettings
          manifest={configuringManifest}
          settings={configuringSettings}
          onSave={handleSaveSettings}
          onClose={() => setConfiguringPlugin(null)}
        />
      )}
    </div>
  );
}
