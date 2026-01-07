/**
 * Merge Progress Indicator Component
 *
 * Shows real-time feedback on auto-merge operations including:
 * - Task completion status
 * - Merge strategy being used
 * - Conflict detection and resolution
 * - User input requirements
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  GitMerge,
} from 'lucide-react';
import { MergeProgress, MergeStrategy } from '@/lib/agents/spread/auto-merge-orchestrator';

// Simple Progress component
function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className || ''}`}>
      <div
        className="h-full flex-1 bg-blue-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Simple Badge component
function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

interface MergeProgressIndicatorProps {
  /** Merge progress data */
  progress: MergeProgress;

  /** Whether to show detailed information */
  showDetails?: boolean;

  /** Callback to cancel merge */
  onCancel?: () => void;

  /** Callback to resolve conflicts */
  onResolveConflicts?: () => void;

  /** Component height (compact vs full) */
  size?: 'compact' | 'full';
}

/**
 * Format merge strategy for display
 */
function formatMergeStrategy(strategy: MergeStrategy): string {
  const strategies: Record<MergeStrategy, string> = {
    [MergeStrategy.CONCAT]: 'Concatenate',
    [MergeStrategy.MERGE]: 'Smart Merge',
    [MergeStrategy.VOTE]: 'Majority Vote',
    [MergeStrategy.PRIORITY]: 'Priority Based',
    [MergeStrategy.CUSTOM]: 'Custom',
  };
  return strategies[strategy] || strategy;
}

/**
 * Get status icon for merge status
 */
function getStatusIcon(status: MergeProgress['status']) {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'merging':
      return <GitMerge className="h-4 w-4 animate-pulse text-blue-500" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

/**
 * Get status color for badge
 */
function getStatusColor(status: MergeProgress['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-500';
    case 'merging':
      return 'bg-blue-500';
    case 'complete':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
  }
}

export function MergeProgressIndicator({
  progress,
  showDetails = true,
  onCancel,
  onResolveConflicts,
  size = 'full',
}: MergeProgressIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time for animation
  useEffect(() => {
    if (progress.status === 'merging') {
      const interval = setInterval(() => setCurrentTime(Date.now()), 100);
      return () => clearInterval(interval);
    }
  }, [progress.status]);

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getStatusIcon(progress.status)}
        <span className="font-medium">
          {progress.completedChildren}/{progress.totalChildren} merged
        </span>
        <Progress value={progress.percentage} className="h-2 w-24" />
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Auto-Merge Progress</h3>
          <Badge className={`${getStatusColor(progress.status)} text-white`}>
            {progress.status}
          </Badge>
        </div>

        {progress.status === 'merging' && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-red-500"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {progress.completedChildren} of {progress.totalChildren} tasks merged
          </span>
          <span className="font-medium">{progress.percentage.toFixed(0)}%</span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
      </div>

      {/* Task Status */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <div>
            <div className="font-medium">{progress.completedChildren}</div>
            <div className="text-gray-500">Complete</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <div>
            <div className="font-medium">
              {progress.totalChildren -
                progress.completedChildren -
                progress.failedChildren}
            </div>
            <div className="text-gray-500">Running</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <div>
            <div className="font-medium">{progress.failedChildren}</div>
            <div className="text-gray-500">Failed</div>
          </div>
        </div>
      </div>

      {/* Merge Details */}
      {showDetails && (
        <div className="space-y-2 text-sm border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Merge Strategy:</span>
            <Badge className="border border-gray-300 bg-white">
              {formatMergeStrategy(progress.strategy)}
            </Badge>
          </div>

          {progress.conflictsDetected > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Conflicts:</span>
              <div className="flex items-center gap-2">
                <span>
                  {progress.conflictsResolved} / {progress.conflictsDetected} resolved
                </span>
                {progress.conflictsResolved < progress.conflictsDetected && (
                  <Badge className="border border-yellow-500 bg-white text-yellow-700">
                    {progress.conflictsDetected - progress.conflictsResolved} remaining
                  </Badge>
                )}
              </div>
            </div>
          )}

          {progress.requiresUserInput && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700">
                User input required to resolve conflicts
              </span>
              {onResolveConflicts && (
                <Button size="sm" variant="outline" onClick={onResolveConflicts}>
                  Resolve
                </Button>
              )}
            </div>
          )}

          {progress.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
              <div className="font-medium">Merge Failed</div>
              <div className="text-sm">{progress.error}</div>
            </div>
          )}
        </div>
      )}

      {/* Status Message */}
      {progress.status === 'complete' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Merge Complete!</span>
          </div>
          <div className="text-sm text-green-600 mt-1">
            All {progress.totalChildren} tasks have been successfully merged.
            {progress.conflictsResolved > 0 &&
              ` Resolved ${progress.conflictsResolved} conflicts.`}
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Compact merge status badge
 */
export function MergeStatusBadge({
  progress,
}: {
  progress: MergeProgress;
}): React.ReactElement {
  return (
    <Badge className="flex items-center gap-1 border border-gray-300 bg-white">
      {getStatusIcon(progress.status)}
      <span>
        {progress.completedChildren}/{progress.totalChildren}
      </span>
    </Badge>
  );
}
