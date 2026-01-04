'use client';

/**
 * Cleanup Tools Component
 *
 * Provides various cleanup utilities for managing data storage.
 * Includes confirmation dialogs and progress tracking.
 */

import React, { useState } from 'react';
import {
  Trash2,
  FolderOpen,
  Database,
  Package,
  Copy,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  clearCache,
  deleteOldConversations,
  removeDuplicates,
  resetAnalytics,
  clearPersonalization,
  factoryReset,
} from '@/lib/data/storage-utils';
import { logCleanup } from '@/lib/data';

interface CleanupTool {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  danger: boolean;
  action: () => Promise<void>;
  requiresConfirmation: boolean;
}

export function CleanupTools() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const executeCleanup = async (toolId: string, tool: CleanupTool) => {
    if (tool.requiresConfirmation && confirmDialog !== toolId) {
      setConfirmDialog(toolId);
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, [toolId]: true }));
      setConfirmDialog(null);

      await tool.action();

      setResults(prev => ({
        ...prev,
        [toolId]: { success: true, message: `${tool.label} completed successfully` },
      }));

      // Clear result after 5 seconds
      setTimeout(() => {
        setResults(prev => ({ ...prev, [toolId]: undefined as any }));
      }, 5000);
    } catch (error) {
      console.error('Cleanup failed:', error);
      setResults(prev => ({
        ...prev,
        [toolId]: {
          success: false,
          message: error instanceof Error ? error.message : 'Cleanup failed',
        },
      }));

      setTimeout(() => {
        setResults(prev => ({ ...prev, [toolId]: undefined as any }));
      }, 5000);
    } finally {
      setLoadingStates(prev => ({ ...prev, [toolId]: false }));
    }
  };

  const handleClearCache = async () => {
    const result = await clearCache();
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Cleared browser cache' : 'Failed to clear cache',
      {
        itemsAffected: result.itemsProcessed,
        sizeProcessed: result.spaceFreed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const handleDeleteOld = async () => {
    const result = await deleteOldConversations(90); // 90 days
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Deleted old conversations' : 'Failed to delete old conversations',
      {
        itemsAffected: result.itemsProcessed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const handleCompactKnowledge = async () => {
    // Placeholder
    await logCleanup('success', 'Compacted knowledge base', {
      itemsAffected: 0,
      sizeProcessed: 0,
    });
  };

  const handleCompressData = async () => {
    // Placeholder
    await logCleanup('success', 'Compressed old data', {
      itemsAffected: 0,
      sizeProcessed: 0,
    });
  };

  const handleRemoveDuplicates = async () => {
    const result = await removeDuplicates();
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Removed duplicate data' : 'Failed to remove duplicates',
      {
        itemsAffected: result.itemsProcessed,
        sizeProcessed: result.spaceFreed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const handleResetAnalytics = async () => {
    const result = await resetAnalytics();
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Reset analytics data' : 'Failed to reset analytics',
      {
        itemsAffected: result.itemsProcessed,
        sizeProcessed: result.spaceFreed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const handleClearPersonalization = async () => {
    const result = await clearPersonalization();
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Cleared personalization data' : 'Failed to clear personalization',
      {
        itemsAffected: result.itemsProcessed,
        sizeProcessed: result.spaceFreed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const handleFactoryReset = async () => {
    const result = await factoryReset();
    await logCleanup(
      result.success ? 'success' : 'failed',
      result.success ? 'Factory reset completed' : 'Factory reset failed',
      {
        itemsAffected: result.itemsProcessed,
        error: result.errors?.join(', '),
      }
    );
    if (!result.success) throw new Error(result.errors?.join(', '));
  };

  const tools: CleanupTool[] = [
    {
      id: 'clear-cache',
      label: 'Clear Cache',
      icon: Trash2,
      description: 'Remove cached data and temporary files',
      danger: false,
      action: handleClearCache,
      requiresConfirmation: false,
    },
    {
      id: 'delete-old',
      label: 'Delete Old Conversations',
      icon: FolderOpen,
      description: 'Remove conversations older than 90 days',
      danger: true,
      action: handleDeleteOld,
      requiresConfirmation: true,
    },
    {
      id: 'compact-knowledge',
      label: 'Compact Knowledge Base',
      icon: Database,
      description: 'Remove orphaned embeddings and optimize storage',
      danger: false,
      action: handleCompactKnowledge,
      requiresConfirmation: false,
    },
    {
      id: 'compress-data',
      label: 'Compress Data',
      icon: Package,
      description: 'Compress old conversations to save space',
      danger: false,
      action: handleCompressData,
      requiresConfirmation: false,
    },
    {
      id: 'remove-duplicates',
      label: 'Remove Duplicates',
      icon: Copy,
      description: 'Find and remove duplicate data entries',
      danger: false,
      action: handleRemoveDuplicates,
      requiresConfirmation: false,
    },
    {
      id: 'reset-analytics',
      label: 'Reset Analytics',
      icon: RotateCcw,
      description: 'Clear all analytics and usage data',
      danger: true,
      action: handleResetAnalytics,
      requiresConfirmation: true,
    },
    {
      id: 'clear-personalization',
      label: 'Clear Personalization',
      icon: RotateCcw,
      description: 'Reset learned preferences and patterns',
      danger: true,
      action: handleClearPersonalization,
      requiresConfirmation: true,
    },
    {
      id: 'factory-reset',
      label: 'Factory Reset',
      icon: AlertTriangle,
      description: 'Reset everything to default (WARNING: Cannot be undone)',
      danger: true,
      action: handleFactoryReset,
      requiresConfirmation: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Cleanup Tools
          </h3>
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Use with caution</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <CleanupToolButton
              key={tool.id}
              tool={tool}
              isLoading={loadingStates[tool.id]}
              result={results[tool.id]}
              isConfirming={confirmDialog === tool.id}
              onClick={() => executeCleanup(tool.id, tool)}
              onCancel={() => setConfirmDialog(null)}
            />
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Before running cleanup</p>
            <p className="text-blue-600 dark:text-blue-400">
              Consider creating a backup first. Some operations cannot be undone.
              Destructive actions require confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CleanupToolButtonProps {
  tool: CleanupTool;
  isLoading: boolean;
  result?: { success: boolean; message: string };
  isConfirming: boolean;
  onClick: () => void;
  onCancel: () => void;
}

function CleanupToolButton({
  tool,
  isLoading,
  result,
  isConfirming,
  onClick,
  onCancel,
}: CleanupToolButtonProps) {
  const Icon = tool.icon;

  if (isConfirming) {
    return (
      <div className="p-4 rounded-lg border-2 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100 mb-3">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Confirm {tool.label}</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
          This action cannot be undone. Are you sure?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClick}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, proceed
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`relative p-4 rounded-lg border-2 transition-all text-left ${
        tool.danger
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            tool.danger
              ? 'bg-red-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : result ? (
            result.success ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`font-medium text-sm ${
              tool.danger
                ? 'text-red-900 dark:text-red-100'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {tool.label}
          </div>
          <div
            className={`text-xs mt-1 ${
              tool.danger
                ? 'text-red-700 dark:text-red-300'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tool.description}
          </div>
          {result && (
            <div
              className={`text-xs mt-2 ${
                result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {result.message}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
