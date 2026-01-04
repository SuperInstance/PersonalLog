/**
 * Plugin Settings Component
 *
 * Modal for configuring plugin settings.
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { PluginManifest, SettingSchema } from '@/lib/plugin';

export interface PluginSettingsProps {
  manifest: PluginManifest;
  settings: Record<string, any>;
  onSave: (pluginId: string, settings: Record<string, any>) => void;
  onClose: () => void;
}

export function PluginSettings({
  manifest,
  settings: initialSettings,
  onSave,
  onClose,
}: PluginSettingsProps) {
  const [settings, setSettings] = useState<Record<string, any>>(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(initialSettings));
  }, [settings, initialSettings]);

  const handleSave = () => {
    onSave(manifest.id, settings);
    onClose();
  };

  const renderSettingInput = (key: string, schema: SettingSchema) => {
    const value = settings[key] ?? schema.default;

    switch (schema.type) {
      case 'boolean':
        return (
          <Switch
            checked={value ?? false}
            onCheckedChange={(checked) => {
              setSettings((prev) => ({ ...prev, [key]: checked }));
            }}
          />
        );

      case 'string':
        if (schema.options) {
          return (
            <select
              value={value ?? ''}
              onChange={(e) => {
                setSettings((prev) => ({ ...prev, [key]: e.target.value }));
              }}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {schema.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }

        return (
          <Input
            type="text"
            value={value ?? ''}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, [key]: e.target.value }));
            }}
            placeholder={schema.description}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? 0}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              setSettings((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
            }}
            min={schema.constraints?.min}
            max={schema.constraints?.max}
          />
        );

      case 'enum':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => {
              setSettings((prev) => ({ ...prev, [key]: e.target.value }));
            }}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {schema.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <Input
            type="text"
            value={JSON.stringify(value) ?? ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setSettings((prev) => ({ ...prev, [key]: parsed }));
              } catch {
                // Ignore invalid JSON
              }
            }}
          />
        );
    }
  };

  if (!manifest.settingsSchema) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Configure {manifest.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Adjust plugin settings and preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-6 space-y-6">
          {Object.entries(manifest.settingsSchema).map(([key, schema]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {schema.label}
                </label>
                {schema.required && (
                  <span className="text-xs text-red-600 dark:text-red-400">*</span>
                )}
              </div>

              {schema.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {schema.description}
                </p>
              )}

              {renderSettingInput(key, schema)}

              {/* Constraints hint */}
              {schema.constraints && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {schema.constraints.min !== undefined && (
                    <span>Min: {schema.constraints.min} </span>
                  )}
                  {schema.constraints.max !== undefined && (
                    <span>Max: {schema.constraints.max}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
