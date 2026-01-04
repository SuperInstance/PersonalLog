/**
 * Plugin Installer Component
 *
 * Interface for installing plugins from files or URLs.
 */

'use client';

import { useState } from 'react';
import { Upload, Link, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface PluginInstallerProps {
  onInstallFromFile: (file: File) => Promise<{ success: boolean; error?: string }>;
  onInstallFromURL: (url: string) => Promise<{ success: boolean; error?: string }>;
}

export function PluginInstaller({ onInstallFromFile, onInstallFromURL }: PluginInstallerProps) {
  const [installMethod, setInstallMethod] = useState<'file' | 'url' | null>(null);
  const [url, setUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInstalling(true);
    setResult(null);

    try {
      const result = await onInstallFromFile(file);
      setResult({
        success: result.success,
        message: result.success
          ? `Plugin installed successfully from ${file.name}`
          : result.error || 'Installation failed',
      });
      if (result.success) {
        event.target.value = ''; // Reset input
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleURLInstall = async () => {
    if (!url.trim()) return;

    setInstalling(true);
    setResult(null);

    try {
      const result = await onInstallFromURL(url.trim());
      setResult({
        success: result.success,
        message: result.success
          ? `Plugin installed successfully from URL`
          : result.error || 'Installation failed',
      });
      if (result.success) {
        setUrl('');
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Install Plugin
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add new functionality to PersonalLog
          </p>
        </div>
      </div>

      {/* Installation Method Selection */}
      {installMethod === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Install from File */}
          <button
            onClick={() => setInstallMethod('file')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <Upload className="w-12 h-12 text-gray-600 dark:text-gray-400" />
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Install from File
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Upload a plugin package (.json)
              </div>
            </div>
          </button>

          {/* Install from URL */}
          <button
            onClick={() => setInstallMethod('url')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
          >
            <Link className="w-12 h-12 text-gray-600 dark:text-gray-400" />
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                Install from URL
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Install from a remote URL
              </div>
            </div>
          </button>
        </div>
      ) : (
        <>
          {/* Back Button */}
          <button
            onClick={() => {
              setInstallMethod(null);
              setResult(null);
              setUrl('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            ← Back to options
          </button>

          {/* File Upload */}
          {installMethod === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Choose a plugin file to install
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={installing}
                  className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 dark:hover:file:bg-blue-900/30"
                />
              </div>
            </div>
          )}

          {/* URL Input */}
          {installMethod === 'url' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="plugin-url"
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
                >
                  Plugin URL
                </label>
                <input
                  id="plugin-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/plugin.json"
                  disabled={installing}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <Button
                onClick={handleURLInstall}
                disabled={!url.trim() || installing}
                className="w-full"
              >
                {installing ? 'Installing...' : 'Install Plugin'}
              </Button>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    result.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          About Plugins
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          Plugins extend PersonalLog with new features and functionality. They can add custom
          UI components, data sources, AI providers, export formats, and more.
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Only install plugins from sources you trust. Plugins run in a sandboxed environment
          but still require certain permissions to function.
        </p>
      </div>
    </Card>
  );
}
