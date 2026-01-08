/**
 * React Integration Example
 *
 * Demonstrates using Central Error Manager with React applications
 */

import React, { useEffect, useState } from 'react';
import {
  initializeErrorHandler,
  handleError,
  getRecoveryActions,
  getErrorHistory,
  onError,
  CentralError,
  NetworkError,
  ValidationError,
} from '@superinstance/central-error-manager';

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorRecord: any;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorRecord: null,
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorRecord = handleError(error, {
      component: 'ErrorBoundary',
      operation: 'componentDidCatch',
      errorInfo,
    });

    this.setState({ errorRecord });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error!}
          errorRecord={this.state.errorRecord}
          onReset={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// ERROR FALLBACK UI
// ============================================================================

interface ErrorFallbackProps {
  error: Error;
  errorRecord: any;
  onReset: () => void;
}

function ErrorFallback({ error, errorRecord, onReset }: ErrorFallbackProps) {
  const [recoveryActions, setRecoveryActions] = useState<any[]>([]);

  useEffect(() => {
    const actions = getRecoveryActions(error);
    setRecoveryActions(actions);
  }, [error]);

  const handleRecovery = async (action: any) => {
    try {
      await action.action();
      if (action.primary) {
        onReset();
      }
    } catch (err) {
      console.error('Recovery action failed:', err);
    }
  };

  return (
    <div className="error-fallback">
      <div className="error-content">
        <h2>Something went wrong</h2>

        {errorRecord && (
          <p className="user-message">{errorRecord.userMessage}</p>
        )}

        {errorRecord?.technicalDetails && (
          <details>
            <summary>Technical Details</summary>
            <pre>{errorRecord.technicalDetails}</pre>
          </details>
        )}

        {recoveryActions.length > 0 && (
          <div className="recovery-actions">
            <h3>What would you like to do?</h3>
            {recoveryActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleRecovery(action)}
                className={action.primary ? 'primary' : ''}
                disabled={action.dangerous}
              >
                {action.label}
                {action.dangerous && ' ⚠️'}
              </button>
            ))}
          </div>
        )}

        <button onClick={onReset} className="reset-button">
          Try Again
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK: USE ERROR HANDLER
// ============================================================================

function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);
  const [errorRecord, setErrorRecord] = useState<any>(null);

  const captureError = (err: unknown, context?: any) => {
    const record = handleError(err, context);
    setError(err instanceof Error ? err : new Error(String(err)));
    setErrorRecord(record);
  };

  const reset = () => {
    setError(null);
    setErrorRecord(null);
  };

  return { error, errorRecord, captureError, reset };
}

// ============================================================================
// HOOK: USE ASYNC OPERATION
// ============================================================================

function useAsyncOperation<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { captureError } = useErrorHandler();

  const execute = async (operation: () => Promise<T>, context?: any) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      captureError(err, context);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}

// ============================================================================
// EXAMPLE COMPONENTS
// ============================================================================

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, execute } = useAsyncOperation<any>();

  useEffect(() => {
    execute(
      async () => {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new NetworkError('Failed to fetch user', {
            url: `/api/users/${userId}`,
            status: response.status,
          });
        }
        return response.json();
      },
      {
        component: 'UserProfile',
        operation: 'fetchUser',
        userId,
      }
    );
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading user profile</div>;
  if (!data) return null;

  return (
    <div className="user-profile">
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}

function ContactForm() {
  const { captureError } = useErrorHandler();
  const [formData, setFormData] = useState({ email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new ValidationError('Invalid email address', {
          field: 'email',
          value: formData.email,
        });
      }

      // Submit form
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new NetworkError('Failed to submit form', {
          url: '/api/contact',
          status: response.status,
        });
      }

      alert('Message sent!');
      setFormData({ email: '', message: '' });
    } catch (err) {
      captureError(err, {
        component: 'ContactForm',
        operation: 'submit',
        formData,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <textarea
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        placeholder="Message"
      />
      <button type="submit">Send</button>
    </form>
  );
}

function ErrorDashboard() {
  const [errorHistory, setErrorHistory] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to errors
    const unsubscribe = onError((errorRecord) => {
      console.log('New error:', errorRecord);
    });

    // Load error history
    const history = getErrorHistory({ since: Date.now() - 86400000 });
    setErrorHistory(history);

    return () => {
      unsubscribe();
    };
  }, []);

  const errorsByCategory = errorHistory.reduce((acc, entry) => {
    const category = entry.error.category;
    acc[category] = (acc[category] || 0) + entry.count;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="error-dashboard">
      <h2>Error Dashboard</h2>
      <div className="stats">
        <div>Total Errors: {errorHistory.length}</div>
        <div>
          By Category:
          <ul>
            {Object.entries(errorsByCategory).map(([category, count]) => (
              <li key={category}>
                {category}: {count as number}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// APP ROOT COMPONENT
// ============================================================================

function App() {
  useEffect(() => {
    // Initialize error handler on app mount
    initializeErrorHandler({
      enableLogging: true,
      logToConsole: true,
      userTechnicalLevel: 'intermediate',
    });
  }, []);

  return (
    <ErrorBoundary>
      <div className="app">
        <h1>My App</h1>
        <UserProfile userId="123" />
        <ContactForm />
        <ErrorDashboard />
      </div>
    </ErrorBoundary>
  );
}

export default App;
