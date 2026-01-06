/**
 * ValidationAlert Component
 *
 * Displays validation errors and warnings for agent definitions.
 * Provides clear, actionable feedback to users.
 */

'use client';

import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import type { ValidationResult } from '@/lib/agents/validation';
import { cn } from '@/lib/utils';

interface ValidationAlertProps {
  /** Validation result to display */
  result: ValidationResult;
  /** Custom className */
  className?: string;
  /** Whether to show warnings */
  showWarnings?: boolean;
}

export function ValidationAlert({
  result,
  className = '',
  showWarnings = true,
}: ValidationAlertProps) {
  if (result.valid && (!showWarnings || result.warnings.length === 0)) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800',
          className
        )}
        role="alert"
        aria-live="polite"
      >
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Agent definition is valid
          </p>
          {result.warnings.length > 0 && showWarnings && (
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''} (non-blocking)
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-3',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Errors Section */}
      {result.errors.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              {result.errors.length} validation error{result.errors.length > 1 ? 's' : ''} found
            </p>
            <ul className="space-y-1.5">
              {result.errors.map((error, index) => (
                <li
                  key={index}
                  className="text-xs text-red-700 dark:text-red-300 flex items-start gap-2"
                >
                  <span className="font-mono font-semibold select-none">
                    [{error.field}]
                  </span>
                  <span>{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {result.warnings.length > 0 && showWarnings && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
              {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''} (non-blocking)
            </p>
            <ul className="space-y-1.5">
              {result.warnings.map((warning, index) => (
                <li
                  key={index}
                  className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2"
                >
                  <span className="font-mono font-semibold select-none">
                    [{warning.field}]
                  </span>
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Success message when only warnings */}
      {result.valid && result.errors.length === 0 && result.warnings.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Agent definition is valid (with warnings)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact validation badge
 *
 * Shows a small badge with validation status.
 */
interface ValidationBadgeProps {
  /** Validation result */
  result: ValidationResult;
  /** Custom className */
  className?: string;
}

export function ValidationBadge({ result, className = '' }: ValidationBadgeProps) {
  if (!result.valid) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
          className
        )}
      >
        <XCircle className="w-3.5 h-3.5" />
        {result.errors.length} error{result.errors.length > 1 ? 's' : ''}
      </span>
    );
  }

  if (result.warnings.length > 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
          className
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        className
      )}
    >
      <CheckCircle className="w-3.5 h-3.5" />
      Valid
    </span>
  );
}
