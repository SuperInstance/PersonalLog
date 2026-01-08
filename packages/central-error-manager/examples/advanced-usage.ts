/**
 * Advanced Usage Example
 *
 * Demonstrates advanced features: error wrapping, recovery actions, logging
 */

import {
  initializeErrorHandler,
  handleError,
  withErrorHandling,
  withFallback,
  getErrorHistory,
  onError,
  getRecoveryActions,
  registerRecoveryActions,
  CentralError,
  NetworkError,
  TimeoutError,
  getLogger,
  logInfo,
  logError,
  logWarn,
} from '@superinstance/central-error-manager';

// Initialize with custom config
async function init() {
  await initializeErrorHandler({
    enableLogging: true,
    logToConsole: true,
    userTechnicalLevel: 'advanced',
  });

  // Register custom error listener for analytics
  onError((errorRecord) => {
    // Send to analytics service
    console.log('[Analytics] Error tracked:', errorRecord.category);
  });

  // Register custom recovery actions for network errors
  registerRecoveryActions('network', (error) => {
    if (error instanceof NetworkError) {
      return [
        {
          label: 'Retry Connection',
          action: async () => {
            console.log('Retrying connection...');
            // Retry logic here
          },
          primary: true,
        },
        {
          label: 'Use Cached Data',
          action: () => {
            console.log('Loading from cache...');
            // Load from cache
          },
        },
      ];
    }
    return [];
  });
}

// Example 1: Wrap functions with error handling
const safeFetch = withErrorHandling(fetch, {
  component: 'API',
  operation: 'safeFetch',
});

async function fetchWithLogging(url: string) {
  try {
    const response = await safeFetch(url);
    return response.json();
  } catch (error) {
    handleError(error, {
      component: 'API',
      operation: 'fetchWithLogging',
      url,
    });
    throw error;
  }
}

// Example 2: Fallback implementation
async function loadWasmVectorSearch() {
  // Simulate WASM loading
  console.log('Loading WASM vector search...');
  throw new Error('WASM not available');
}

async function loadJsVectorSearch() {
  // Simulate JS fallback
  console.log('Loading JS vector search fallback...');
  return {
    search: async (query: number[]) => [1, 2, 3],
  };
}

const getVectorSearch = withFallback(
  loadWasmVectorSearch,
  loadJsVectorSearch,
  'vector-search'
);

// Example 3: Error history and patterns
async function analyzeErrors() {
  const history = getErrorHistory({
    since: Date.now() - 3600000, // Last hour
  });

  console.log('\n=== Error Analysis ===');
  console.log(`Total unique errors: ${history.length}`);

  // Group by category
  const byCategory = history.reduce((acc, entry) => {
    const category = entry.error.category;
    acc[category] = (acc[category] || 0) + entry.count;
    return acc;
  }, {} as Record<string, number>);

  console.log('Errors by category:', byCategory);

  // Find most frequent errors
  const sorted = history.sort((a, b) => b.count - a.count);
  console.log('Top 5 errors:');
  sorted.slice(0, 5).forEach(entry => {
    console.log(`  ${entry.error.message}: ${entry.count} times`);
  });
}

// Example 4: Recovery actions in UI
async function showErrorUI(error: unknown) {
  const actions = getRecoveryActions(error);

  console.log('\n=== Error Recovery UI ===');
  console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
  console.log('Available actions:');

  actions.forEach((action, index) => {
    const prefix = action.primary ? '★' : ' ';
    const danger = action.dangerous ? ' ⚠️' : '';
    console.log(`  ${prefix} ${index + 1}. ${action.label}${danger}`);
  });

  // Simulate user selecting first action
  if (actions.length > 0) {
    console.log(`\nExecuting: ${actions[0].label}`);
    await actions[0].action();
  }
}

// Example 5: Structured logging
async function logOperation(userId: string, operation: string) {
  const logger = getLogger();

  logger.debug('Starting operation', {
    component: 'UserService',
    operation,
    userId,
  });

  try {
    logInfo('Operation successful', {
      component: 'UserService',
      operation,
      userId,
      duration: 1234,
    });
  } catch (error) {
    logError('Operation failed', error as any, {
      component: 'UserService',
      operation,
      userId,
    });
    throw error;
  }
}

// Example 6: Timeout with fallback
async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      handleError(new TimeoutError('fetch', timeout, {
        context: { url },
      }));
      throw error;
    }
    throw error;
  }
}

// Example 7: Complex error chain
async function processOrder(orderData: any) {
  try {
    // Validate order
    if (!orderData.items || orderData.items.length === 0) {
      throw new CentralError('Order has no items', {
        category: 'validation',
        severity: 'low',
        recovery: 'recoverable',
        userMessage: 'Please add items to your order',
        context: { orderId: orderData.id },
      });
    }

    // Check inventory
    const inventoryCheck = await checkInventory(orderData.items);
    if (!inventoryCheck.available) {
      throw new CentralError('Items out of stock', {
        category: 'capability',
        severity: 'high',
        recovery: 'degraded',
        userMessage: 'Some items are out of stock',
        context: { outOfStockItems: inventoryCheck.missingItems },
      });
    }

    // Process payment
    const payment = await processPayment(orderData.payment);
    if (!payment.success) {
      throw new CentralError('Payment failed', {
        category: 'network',
        severity: 'high',
        recovery: 'recoverable',
        userMessage: 'Payment processing failed. Please try again.',
        context: { paymentMethod: orderData.payment.method },
      });
    }

    return { success: true, orderId: orderData.id };
  } catch (error) {
    handleError(error, {
      component: 'OrderService',
      operation: 'processOrder',
      orderId: orderData.id,
    });
    throw error;
  }
}

async function checkInventory(items: any[]) {
  // Simulated inventory check
  return { available: true, missingItems: [] };
}

async function processPayment(payment: any) {
  // Simulated payment
  return { success: true };
}

// Run examples
async function main() {
  await init();

  console.log('=== Example 1: Safe Fetch ===');
  try {
    await fetchWithLogging('https://api.example.com/data');
  } catch (error) {
    console.log('Fetch error handled');
  }

  console.log('\n=== Example 2: Vector Search Fallback ===');
  const vectorSearch = await getVectorSearch();
  console.log('Vector search loaded:', vectorSearch);

  console.log('\n=== Example 3: Error Analysis ===');
  // Simulate some errors
  handleError(new Error('Test error 1'));
  handleError(new Error('Test error 2'));
  handleError(new Error('Test error 1')); // Duplicate
  await analyzeErrors();

  console.log('\n=== Example 4: Recovery UI ===');
  try {
    throw new NetworkError('Failed to connect', {
      url: 'https://api.example.com',
    });
  } catch (error) {
    await showErrorUI(error);
  }

  console.log('\n=== Example 5: Structured Logging ===');
  await logOperation('user123', 'updateProfile');

  console.log('\n=== Example 6: Timeout ===');
  try {
    await fetchWithTimeout('https://api.example.com/slow', 100);
  } catch (error) {
    console.log('Timeout handled');
  }

  console.log('\n=== Example 7: Order Processing ===');
  try {
    await processOrder({
      id: 'order123',
      items: [],
      payment: { method: 'credit-card' },
    });
  } catch (error) {
    console.log('Order error handled');
  }
}

// Uncomment to run
// main().catch(console.error);
