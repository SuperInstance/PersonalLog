/**
 * React Error Boundary
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs them, and displays a fallback UI.
 */

'use client';

import React, { Component, ReactNode, ComponentType } from 'react';
import { log, getUserMessage, getRecoveryActions, type ErrorRecord } from '@/lib/errors';

// ============================================================================
// PROPS
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: ErrorRecord) => void;
  isolate?: boolean; // If true, don't propagate to parent boundaries
}

export interface ErrorBoundaryState {
  error: Error | null;
  errorRecord: ErrorRecord | null;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorRecord: ErrorRecord;
  resetError: () => void;
}

// ============================================================================
// DEFAULT FALLBACK COMPONENT
// ============================================================================

export function DefaultErrorFallback({
  error,
  errorRecord,
  resetError,
}: ErrorBoundaryFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const recoveryActions = getRecoveryActions(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
              <p className="text-white/80 text-sm mt-1">
                {errorRecord.category} error - {errorRecord.severity} severity
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* User Message */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="text-slate-900 dark:text-slate-100">
              {errorRecord.userMessage}
            </p>
          </div>

          {/* Technical Details (collapsible) */}
          {showDetails && errorRecord.technicalDetails && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Technical Details
              </h3>
              <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                {errorRecord.technicalDetails}
              </pre>
            </div>
          )}

          {/* Recovery Actions */}
          {recoveryActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                What would you like to do?
              </p>
              <div className="flex flex-wrap gap-2">
                {recoveryActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={async () => {
                      try {
                        await action.action();
                        if (!action.dangerous) {
                          resetError();
                        }
                      } catch (err) {
                        console.error('Recovery action failed:', err);
                      }
                    }}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-colors
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

          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorRecord: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    const errorRecord = log(error, {
      component: errorInfo.componentStack || 'Unknown',
      additional: {
        errorBoundary: true,
        reactErrorInfo: errorInfo,
      },
    });

    this.setState({ errorRecord });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(errorRecord);
    }

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      error: null,
      errorRecord: null,
    });
  };

  render() {
    const { error, errorRecord } = this.state;
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

    if (error !== null && errorRecord !== null) {
      return <Fallback error={error} errorRecord={errorRecord} resetError={this.handleReset} />;
    }

    return children;
  }
}

// ============================================================================
// HOOK: USE ERROR BOUNDARY
// ============================================================================

/**
 * Hook to programmatically trigger error boundary
 *
 * @example
 * function MyComponent() {
 *   const triggerError = useErrorBoundary();
 *
 *   const handleClick = () => {
 *     try {
 *       riskyOperation();
 *     } catch (error) {
 *       triggerError(error);
 *     }
 *   };
 * }
 */
export function useErrorBoundary(): (error: unknown) => void {
  return React.useCallback((error: unknown) => {
    throw error;
  }, []);
}

// ============================================================================
// HOOK: USE ERROR HANDLER
// ============================================================================

/**
 * Hook to access error handler in components
 *
 * @example
 * function MyComponent() {
 *   const handleError = useErrorHandler();
 *
 *   const load = async () => {
 *     try {
 *       await fetchData();
 *     } catch (error) {
 *       handleError(error, { component: 'MyComponent' });
 *     }
 *   };
 * }
 */
export function useErrorHandler(): (
  error: unknown,
  context?: { component?: string; operation?: string; additional?: Record<string, unknown> }
) => void {
  return React.useCallback((error, context) => {
    log(error, context);
  }, []);
}

// ============================================================================
// HOC: WITH ERROR BOUNDARY
// ============================================================================

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * export default withErrorBoundary(MyComponent);
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  fallback?: ComponentType<ErrorBoundaryFallbackProps>
): ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
