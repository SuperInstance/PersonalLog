/**
 * Recovery Actions Component
 *
 * Displays actionable recovery suggestions for errors.
 * Helps users resolve issues rather than just reporting them.
 */

'use client';

import React from 'react';
import type { RecoveryAction, PersonalLogError, ErrorRecord } from '@/lib/errors';
import { getRecoveryActions } from '@/lib/errors';

// ============================================================================
// PROPS
// ============================================================================

export interface RecoveryActionsProps {
  error: ErrorRecord | PersonalLogError | Error | unknown;
  layout?: 'vertical' | 'horizontal' | 'grid';
  variant?: 'default' | 'compact' | 'detailed';
  onActionExecuted?: (action: RecoveryAction, success: boolean) => void;
  className?: string;
}

// ============================================================================
// ACTION BUTTON COMPONENT
// ============================================================================

function ActionButton({
  action,
  onActionExecuted,
  variant,
}: {
  action: RecoveryAction;
  onActionExecuted?: (action: RecoveryAction, success: boolean) => void;
  variant: 'default' | 'compact' | 'detailed';
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await action.action();
      onActionExecuted?.(action, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      setError(errorMessage);
      onActionExecuted?.(action, false);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonStyles = variant === 'compact'
    ? 'px-3 py-1.5 text-sm'
    : variant === 'detailed'
    ? 'px-5 py-3 text-base'
    : 'px-4 py-2 text-sm';

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          ${buttonStyles}
          rounded-lg font-medium transition-all
          ${action.primary
            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
          }
          ${action.dangerous
            ? 'border-2 border-orange-500 hover:border-orange-600'
            : ''
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          disabled:opacity-50
          flex items-center gap-2
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            {action.label}
            {action.dangerous && ' ⚠️'}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// RECOVERY ACTIONS COMPONENT
// ============================================================================

export function RecoveryActions({
  error,
  layout = 'vertical',
  variant = 'default',
  onActionExecuted,
  className = '',
}: RecoveryActionsProps): JSX.Element | null {
  const actions = React.useMemo(() => {
    return getRecoveryActions(error);
  }, [error]);

  if (actions.length === 0) {
    return null;
  }

  const layoutStyles = {
    vertical: 'flex-col',
    horizontal: 'flex-row',
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`
      ${layoutStyles[layout]}
      gap-3
      ${className}
    `}>
      {actions.map((action, index) => (
        <ActionButton
          key={index}
          action={action}
          onActionExecuted={onActionExecuted}
          variant={variant}
        />
      ))}
    </div>
  );
}

// ============================================================================
// SPECIALIZED RECOVERY COMPONENTS
// ============================================================================

/**
 * Storage quota recovery actions
 */
export function StorageQuotaRecovery({
  usedBytes,
  totalBytes,
  onRecovered,
}: {
  usedBytes: number;
  totalBytes: number;
  onRecovered?: (bytesRecovered: number) => void;
}) {
  const usagePercentage = (usedBytes / totalBytes) * 100;
  const usedMB = Math.round(usedBytes / (1024 * 1024));
  const totalMB = Math.round(totalBytes / (1024 * 1024));

  const actions: RecoveryAction[] = [
    {
      label: 'Clear Old Conversations',
      action: async () => {
        // Implement conversation clearing
        const recovered = usedBytes * 0.2; // Assume 20% recovered
        onRecovered?.(recovered);
      },
      primary: true,
      dangerous: true,
    },
    {
      label: 'Enable Auto-Compaction',
      action: async () => {
        // Enable auto-compaction in settings
        localStorage.setItem('auto-compaction', 'true');
      },
    },
    {
      label: 'Clear Cache',
      action: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          const recovered = usedBytes * 0.1; // Assume 10% recovered
          onRecovered?.(recovered);
        }
      },
    },
    {
      label: 'Request More Storage',
      action: async () => {
        // Request persistent storage
        if ('storage' in navigator && 'requestPersistent' in navigator.storage) {
          // @ts-ignore
          await navigator.storage.requestPersistent();
        }
      },
    },
  ];

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Storage Quota
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {usedMB}MB / {totalMB}MB
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`
                h-2 rounded-full transition-all
                ${usagePercentage > 90 ? 'bg-red-500' : usagePercentage > 75 ? 'bg-orange-500' : 'bg-green-500'}
              `}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Free up space to continue:
        </p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <ActionButton
              key={index}
              action={action}
              onActionExecuted={(action, success) => {
                if (success) {
                  console.log('Action executed:', action.label);
                }
              }}
              variant="compact"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Network recovery actions
 */
export function NetworkRecovery({ onRetry }: { onRetry?: () => void }) {
  const isOnline = navigator.onLine;

  const actions: RecoveryAction[] = isOnline
    ? [
        {
          label: 'Retry',
          action: async () => {
            onRetry?.();
            window.location.reload();
          },
          primary: true,
        },
        {
          label: 'Check Status',
          action: async () => {
            window.open('/settings/network', '_blank');
          },
        },
      ]
    : [
        {
          label: 'Go Offline',
          action: async () => {
            // Enable offline mode
            localStorage.setItem('offline-mode', 'true');
          },
          primary: true,
        },
        {
          label: 'Check Connection',
          action: async () => {
            window.open('/settings/network', '_blank');
          },
        },
      ];

  return (
    <div className={`
      rounded-lg p-4 space-y-4
      ${isOnline
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }
    `}>
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isOnline ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}
        `}>
          {isOnline ? (
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {isOnline ? 'Network Issues Detected' : 'You Are Offline'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isOnline
              ? 'Having trouble connecting. Try the actions below.'
              : 'Some features may be limited while offline.'
            }
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            action={action}
            onActionExecuted={(action, success) => {
              if (success) {
                console.log('Action executed:', action.label);
              }
            }}
            variant="compact"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Permission recovery actions
 */
export function PermissionRecovery({
  permission,
  onRequest,
}: {
  permission: string;
  onRequest?: () => void;
}) {
  const actions: RecoveryAction[] = [
    {
      label: `Grant ${permission} Permission`,
      action: async () => {
        onRequest?.();
      },
      primary: true,
    },
    {
      label: 'Learn More',
      action: async () => {
        window.open('/docs/permissions', '_blank');
      },
    },
  ];

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Permission Required
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            This feature requires <strong>{permission}</strong> permission to work.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            action={action}
            onActionExecuted={(action, success) => {
              if (success) {
                console.log('Action executed:', action.label);
              }
            }}
            variant="compact"
          />
        ))}
      </div>
    </div>
  );
}
