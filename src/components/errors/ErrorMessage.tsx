/**
 * Error Message Component
 *
 * User-friendly error display with progressive disclosure.
 * Shows simple messages to basic users, technical details to advanced users.
 */

'use client';

import React from 'react';
import type { ErrorRecord } from '@/lib/errors';
import { getRecoveryActions } from '@/lib/errors';

// ============================================================================
// PROPS
// ============================================================================

export interface ErrorMessageProps {
  error: ErrorRecord | Error | unknown;
  variant?: 'inline' | 'banner' | 'modal' | 'toast';
  severity?: ErrorRecord['severity'];
  showRecoveryActions?: boolean;
  showTechnicalDetails?: boolean | 'auto'; // 'auto' = based on user level
  onClose?: () => void;
  className?: string;
}

// ============================================================================
// ICONS
// ============================================================================

function ErrorIcon({ category, severity }: { category: string; severity: string }) {
  const icons: Record<string, JSX.Element> = {
    system: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    quota: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    network: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    offline: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
    ),
    permission: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    capability: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    timeout: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    validation: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    'not-found': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    benchmark: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    default: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return icons[category] || icons.default;
}

// ============================================================================
// INLINE VARIANT
// ============================================================================

function InlineErrorMessage({
  error,
  showRecoveryActions = true,
  showTechnicalDetails = 'auto',
  className = '',
}: ErrorMessageProps): JSX.Element {
  const [expanded, setExpanded] = React.useState(false);
  const errorRecord = error as ErrorRecord;
  const recoveryActions = showRecoveryActions ? getRecoveryActions(error) : [];

  // Auto-show technical details for advanced users
  const shouldShowTechnical = showTechnicalDetails === 'auto'
    ? typeof window !== 'undefined' && localStorage.getItem('user-technical-level') === 'advanced'
    : showTechnicalDetails;

  const severityColors = {
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
    medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    info: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20',
  };

  return (
    <div className={`
      rounded-lg border-l-4 p-4 my-4
      ${severityColors[errorRecord.severity]}
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`text-${errorRecord.severity === 'critical' ? 'red' : errorRecord.severity === 'high' ? 'orange' : 'gray'}-600 dark:text-${errorRecord.severity === 'critical' ? 'red' : errorRecord.severity === 'high' ? 'orange' : 'gray'}-400`}>
          <ErrorIcon category={errorRecord.category} severity={errorRecord.severity} />
        </div>

        <div className="flex-1 min-w-0">
          {/* User Message */}
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {errorRecord.userMessage}
          </p>

          {/* Category & Severity Badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {errorRecord.category}
            </span>
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
              ${errorRecord.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
              ${errorRecord.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : ''}
              ${errorRecord.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
              ${errorRecord.severity === 'low' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : ''}
              ${errorRecord.severity === 'info' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' : ''}
            `}>
              {errorRecord.severity}
            </span>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      {(shouldShowTechnical || expanded) && errorRecord.technicalDetails && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <details className="group">
            <summary className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer list-none flex items-center gap-2">
              <svg
                className="w-4 h-4 transition-transform group-open:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Technical Details
            </summary>
            <pre className="mt-2 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono bg-slate-100 dark:bg-slate-800 rounded p-3 overflow-x-auto">
              {errorRecord.technicalDetails}
            </pre>
          </details>
        </div>
      )}

      {/* Recovery Actions */}
      {recoveryActions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            What would you like to do?
          </p>
          <div className="flex flex-wrap gap-2">
            {recoveryActions.map((action, index) => (
              <button
                key={index}
                onClick={async () => {
                  try {
                    await action.action();
                  } catch (err) {
                    console.error('Recovery action failed:', err);
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${action.primary
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
                  }
                  ${action.dangerous
                    ? 'border-2 border-orange-500 hover:border-orange-600'
                    : ''
                  }
                `}
              >
                {action.label}
                {action.dangerous && ' ⚠️'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BANNER VARIANT
// ============================================================================

function BannerErrorMessage({ error, onClose, className = '' }: ErrorMessageProps): JSX.Element {
  const errorRecord = error as ErrorRecord;

  const bannerColors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
    info: 'bg-gray-500',
  };

  return (
    <div className={`
      ${bannerColors[errorRecord.severity]}
      text-white px-4 py-3 rounded-lg shadow-lg
      flex items-center gap-3
      ${className}
    `}>
      <ErrorIcon category={errorRecord.category} severity={errorRecord.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {errorRecord.userMessage}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ErrorMessage({
  error,
  variant = 'inline',
  ...props
}: ErrorMessageProps): JSX.Element {
  // Normalize error
  const normalizedError: ErrorRecord = React.useMemo(() => {
    if (error && typeof error === 'object' && 'category' in error) {
      return error as ErrorRecord;
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        category: 'unknown',
        severity: 'medium',
        recovery: 'recoverable',
        userMessage: error.message,
        technicalDetails: error.stack,
        timestamp: Date.now(),
        recoverable: true,
      };
    }

    return {
      name: 'Error',
      message: String(error),
      category: 'unknown',
      severity: 'medium',
      recovery: 'recoverable',
      userMessage: String(error),
      timestamp: Date.now(),
      recoverable: true,
    };
  }, [error]);

  if (variant === 'banner') {
    return <BannerErrorMessage error={normalizedError} {...props} />;
  }

  return <InlineErrorMessage error={normalizedError} {...props} />;
}

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

/**
 * Inline error message
 */
export function InlineError(props: Omit<ErrorMessageProps, 'variant'>) {
  return <ErrorMessage {...props} variant="inline" />;
}

/**
 * Banner error message
 */
export function ErrorBanner(props: Omit<ErrorMessageProps, 'variant'>) {
  return <ErrorMessage {...props} variant="banner" />;
}

/**
 * Compact inline error (just the message)
 */
export function ErrorAlert({ error, className = '' }: { error: ErrorRecord | Error; className?: string }) {
  const errorRecord = error as ErrorRecord;

  return (
    <div className={`
      text-sm text-red-600 dark:text-red-400
      ${className}
    `}>
      {errorRecord.userMessage || errorRecord.message}
    </div>
  );
}
