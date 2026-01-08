/**
 * Example: Basic Logging
 *
 * Demonstrates basic logging functionality with different levels and categories.
 */

import { logger, debug, info, warn, error, LogCategory } from '../src';

// Basic logging at different levels
function demonstrateBasicLogging() {
  console.log('=== Basic Logging Demo ===\n');

  // Debug level - detailed information
  debug('Function called with parameters', { userId: '123', action: 'fetch' }, 'api', 'userService');

  // Info level - general information
  info('User logged in successfully', { userId: '123', timestamp: Date.now() }, 'api', 'authService');

  // Warning level - something unusual but not an error
  warn('High memory usage detected', { usage: '85%', threshold: '80%' }, 'performance', 'monitor');

  // Error level - something went wrong
  try {
    throw new Error('Database connection failed');
  } catch (err) {
    error(
      'Failed to connect to database',
      { host: 'localhost', port: 5432 },
      'system',
      'dbService',
      err as Error
    );
  }
}

// Filtering logs
function demonstrateLogFiltering() {
  console.log('\n=== Log Filtering Demo ===\n');

  // Get all error logs from the last hour
  const recentErrors = logger.getLogs({
    minLevel: 'error',
    startTime: Date.now() - 3600000
  });
  console.log(`Found ${recentErrors.length} recent errors`);

  // Get all API logs
  const apiLogs = logger.getLogs({
    categories: ['api']
  });
  console.log(`Found ${apiLogs.length} API logs`);

  // Search for specific text
  const searchResults = logger.getLogs({
    search: 'user'
  });
  console.log(`Found ${searchResults.length} logs containing 'user'`);
}

// Log statistics
function demonstrateLogStatistics() {
  console.log('\n=== Log Statistics Demo ===\n');

  const byLevel = logger.getLogsByLevel();
  console.log('Logs by level:', byLevel);

  const byCategory = logger.getLogsByCategory();
  console.log('Logs by category:', byCategory);
}

// Subscribe to logs
function demonstrateLogSubscription() {
  console.log('\n=== Log Subscription Demo ===\n');

  const unsubscribe = logger.subscribe((entry: any) => {
    if (entry.level === 'error') {
      console.log(`[ERROR SUBSCRIPTION] New error: ${entry.message}`);
    }
  });

  // Generate some logs
  info('This is an info message');
  warn('This is a warning');
  error('This is an error - should trigger subscription');

  // Cleanup
  unsubscribe();
}

// Export/Import logs
function demonstrateLogExportImport() {
  console.log('\n=== Log Export/Import Demo ===\n');

  // Export logs
  const exported = logger.exportLogs();
  console.log(`Exported ${exported.length} characters of log data`);

  // Clear and import
  logger.clear();
  console.log('Logs cleared');

  logger.importLogs(exported);
  console.log(`Logs restored - count: ${logger.getLogCount()}`);
}

// Category filtering
function demonstrateCategoryFiltering() {
  console.log('\n=== Category Filtering Demo ===\n');

  // Disable performance logs
  logger.setCategoryFilter('performance', false);

  // This won't be logged
  warn('Performance warning', { metric: 'slow' }, 'performance', 'monitor');

  // This will be logged
  warn('API warning', { endpoint: '/users' }, 'api', 'userService');

  // Re-enable performance logs
  logger.setCategoryFilter('performance', true);
}

// Run all demonstrations
async function main() {
  demonstrateBasicLogging();
  demonstrateLogFiltering();
  demonstrateLogStatistics();
  demonstrateLogSubscription();
  demonstrateLogExportImport();
  demonstrateCategoryFiltering();

  console.log('\n=== Demo Complete ===');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateBasicLogging,
  demonstrateLogFiltering,
  demonstrateLogStatistics,
  demonstrateLogSubscription,
  demonstrateLogExportImport,
  demonstrateCategoryFiltering,
};
