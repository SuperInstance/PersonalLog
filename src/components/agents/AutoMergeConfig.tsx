/**
 * Auto-Merge Configuration Component (Simplified)
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import {
  AutoMergeConfig,
  MergeStrategy,
  DEFAULT_AUTO_MERGE_CONFIG,
} from '@/lib/agents/spread/auto-merge-orchestrator';
import { Settings, Save, RotateCcw } from 'lucide-react';

// Simple Label component
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium leading-none">
      {children}
    </label>
  );
}

// Simple Select component
function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface AutoMergeConfigProps {
  config: AutoMergeConfig;
  onChange?: (config: AutoMergeConfig) => void;
  onSave?: (config: AutoMergeConfig) => void;
  showActions?: boolean;
  disabled?: boolean;
}

const MERGE_STRATEGY_LABELS: Record<MergeStrategy, string> = {
  [MergeStrategy.CONCAT]: 'Concatenate - Append arrays together',
  [MergeStrategy.MERGE]: 'Smart Merge - Intelligent merging with conflict detection',
  [MergeStrategy.VOTE]: 'Majority Vote - Use majority voting for conflicts',
  [MergeStrategy.PRIORITY]: 'Priority Based - First task wins',
  [MergeStrategy.CUSTOM]: 'Custom - User-defined merge function',
};

export function AutoMergeConfigComponent({
  config,
  onChange,
  onSave,
  showActions = true,
  disabled = false,
}: AutoMergeConfigProps) {
  const [localConfig, setLocalConfig] = useState<AutoMergeConfig>(config);

  const handleChange = (key: keyof AutoMergeConfig, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange?.(newConfig);
  };

  const handleSave = () => {
    onSave?.(localConfig);
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_AUTO_MERGE_CONFIG);
    onChange?.(DEFAULT_AUTO_MERGE_CONFIG);
  };

  const strategyOptions = Object.values(MergeStrategy).map((strategy) => ({
    value: strategy,
    label: MERGE_STRATEGY_LABELS[strategy],
  }));

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold">Auto-Merge Configuration</h3>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Enable Auto-Merge</Label>
          <p className="text-sm text-gray-500">
            Automatically merge child task results when they complete
          </p>
        </div>
        <Switch
          checked={localConfig.enabled}
          onCheckedChange={(checked) => handleChange('enabled', checked)}
          disabled={disabled}
        />
      </div>

      {localConfig.enabled && (
        <>
          {/* Merge Strategy */}
          <div className="space-y-2">
            <Label>Merge Strategy</Label>
            <Select
              value={localConfig.strategy}
              onChange={(value) => handleChange('strategy', value as MergeStrategy)}
              options={strategyOptions}
              disabled={disabled}
            />
          </div>

          {/* Auto-Merge on Complete */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Merge on Complete</Label>
              <p className="text-sm text-gray-500">
                Automatically merge when all children finish
              </p>
            </div>
            <Switch
              checked={localConfig.autoMergeOnComplete}
              onCheckedChange={(checked) => handleChange('autoMergeOnComplete', checked)}
              disabled={disabled}
            />
          </div>

          {/* Wait for All Children */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Wait for All Children</Label>
              <p className="text-sm text-gray-500">
                Wait for all tasks before merging
              </p>
            </div>
            <Switch
              checked={localConfig.waitForAllChildren}
              onCheckedChange={(checked) => handleChange('waitForAllChildren', checked)}
              disabled={disabled}
            />
          </div>

          {/* Max Wait Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Wait Time</Label>
              <span className="text-sm text-gray-500">
                {Math.floor(localConfig.maxWaitTime / 1000)}s
              </span>
            </div>
            <Slider
              min={30000}
              max={600000}
              step={30000}
              value={localConfig.maxWaitTime}
              onChange={(value) => handleChange('maxWaitTime', value)}
              disabled={disabled}
              className="w-full"
            />
          </div>

          {/* Notify Progress */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Notify Progress</Label>
              <p className="text-sm text-gray-500">
                Show real-time merge progress
              </p>
            </div>
            <Switch
              checked={localConfig.notifyProgress}
              onCheckedChange={(checked) => handleChange('notifyProgress', checked)}
              disabled={disabled}
            />
          </div>

          {/* Show Conflicts */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Show Conflicts</Label>
              <p className="text-sm text-gray-500">
                Display detected conflicts in UI
              </p>
            </div>
            <Switch
              checked={localConfig.showConflicts}
              onCheckedChange={(checked) => handleChange('showConflicts', checked)}
              disabled={disabled}
            />
          </div>
        </>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={disabled}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      )}
    </Card>
  );
}
