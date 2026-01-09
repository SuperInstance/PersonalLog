/**
 * Example 2: Retry with Fallback
 *
 * Demonstrates automatic retry with exponential backoff:
 * - Configurable retry strategies
 * - Retryable vs non-retryable errors
 * - Fallback function execution
 *
 * @module examples/retry-fallback
 */

import { ToolGuardian, SchemaType, ExecutionStatus } from '../src/index.js';

// Simulated unreliable API
let attemptCount = 0;

async function unreliableApiCall(query: string): Promise<string> {
  attemptCount++;
  console.log(`  API attempt ${attemptCount}...`);

  // Fail first 2 attempts, succeed on 3rd
  if (attemptCount < 3) {
    throw new Error('ETIMEDOUT: API request timed out');
  }

  return `Results for: ${query}`;
}

async function retryWithFallback() {
  console.log('=== ToolGuardian: Retry with Fallback ===\n');

  // Define tools with retry configuration
  const tools = {
    search: {
      name: 'search',
      description: 'Search an API (simulated unreliable service)',
      fn: async ({ query }) => {
        return await unreliableApiCall(query);
      },
      retryConfig: {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 2000,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'NetworkError']
      },
      schema: {
        input: {
          query: {
            type: SchemaType.STRING,
            minLength: 1,
            maxLength: 100
          }
        }
      }
    },

    // Non-retryable operation
    chargePayment: {
      name: 'chargePayment',
      description: 'Process payment (no retry on failure)',
      fn: async ({ amount, cardToken }) => {
        // Simulate payment failure
        throw new Error('Insufficient funds');
      },
      retryConfig: {
        maxAttempts: 1 // Don't retry payments
      },
      schema: {
        input: {
          amount: { type: SchemaType.NUMBER, minimum: 1 },
          cardToken: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian = new ToolGuardian({
    tools,
    defaultRetryConfig: {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
      retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'],
      jitter: true
    }
  });

  console.log('1. Executing with retry (unreliable API):\n');

  attemptCount = 0;
  const searchResult = await guardian.execute('search', {
    query: 'AI trends 2026'
  });

  console.log(`\n  Final status: ${searchResult.status}`);
  console.log(`  Retry count: ${searchResult.retryCount}`);
  console.log(`  Result: ${searchResult.result}`);
  console.log(`  Total time: ${searchResult.executionTime}ms\n`);

  console.log('2. Non-retryable operation (payment):\n');

  const paymentResult = await guardian.execute('chargePayment', {
    amount: 100,
    cardToken: 'tok_12345'
  });

  console.log(`  Status: ${paymentResult.status}`);
  console.log(`  Retry count: ${paymentResult.retryCount} (should be 0)`);
  console.log(`  Error: ${paymentResult.error?.message}\n`);

  console.log('3. Custom retry options per execution:\n');

  attemptCount = 0;
  const customRetryResult = await guardian.execute('search', {
    query: 'custom retry test'
  }, {
    retryOnFailure: true
  });

  console.log(`  Executed with custom retry options`);
  console.log(`  Status: ${customRetryResult.status}\n`);

  console.log('4. Monitoring retry metrics:\n');

  const metrics = guardian.getMetrics();
  console.log(`  Total retried executions: ${metrics.retriedExecutions}`);
  console.log(`  Search call count: ${metrics.functionCallCounts.search || 0}`);

  const history = guardian.getHistory({ toolName: 'search' });
  console.log(`  Search history: ${history.length} executions`);
  for (const entry of history.slice(-3)) {
    console.log(`    - ${new Date(entry.timestamp).toISOString()}: ${entry.result.status} (${entry.duration}ms)`);
  }

  console.log('\n✓ Retry with fallback demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  retryWithFallback().catch(console.error);
}

export { retryWithFallback };
