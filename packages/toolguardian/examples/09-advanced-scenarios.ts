/**
 * Example 9: Advanced Scenarios
 *
 * Demonstrates complex real-world scenarios:
 * - Circuit breaker pattern
 * - Batch processing with rate limiting
 * - Conditional execution
 * - Result caching
 * - Tool composition
 *
 * @module examples/advanced-scenarios
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

// Circuit breaker state
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private threshold: number = 3,
    private resetTimeout: number = 5000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt reset
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - calls are blocked');
      }
    }

    try {
      const result = await fn();

      // Success - handle state transitions
      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= 2) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.threshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
  }
}

async function advancedScenarios() {
  console.log('=== ToolGuardian: Advanced Scenarios ===\n');

  // Simulated external service with failures
  let apiFailureCount = 0;
  const apiShouldFail = () => apiFailureCount++ < 3;

  // Simple in-memory cache
  const cache = new Map<string, { value: any; expiry: number }>();

  // Rate limiter
  const rateLimiter = {
    calls: new Map<string, number[]>(),
    allow(key: string, limit: number, window: number): boolean {
      const now = Date.now();
      const calls = this.calls.get(key) || [];
      const validCalls = calls.filter(t => now - t < window);

      if (validCalls.length >= limit) {
        this.calls.set(key, validCalls);
        return false;
      }

      validCalls.push(now);
      this.calls.set(key, validCalls);
      return true;
    }
  };

  console.log('1. Circuit Breaker Pattern:\n');

  const circuitBreaker = new CircuitBreaker(3, 3000);

  const unreliableService = {
    name: 'unreliableService',
    description: 'Service with circuit breaker protection',
    fn: async ({ endpoint }) => {
      return await circuitBreaker.execute(async () => {
        if (apiShouldFail()) {
          throw new Error(`Service unavailable: ${endpoint}`);
        }
        return { endpoint, data: `Response from ${endpoint}`, state: circuitBreaker.getState() };
      });
    },
    schema: {
      input: {
        endpoint: { type: SchemaType.STRING }
      }
    }
  };

  const guardian1 = new ToolGuardian({
    tools: { unreliableService }
  });

  console.log('  Testing circuit breaker:');
  for (let i = 1; i <= 6; i++) {
    const result = await guardian1.execute('unreliableService', { endpoint: `/api/${i}` });
    console.log(`    Attempt ${i}: ${result.status}, Circuit: ${circuitBreaker.getState()}`);
    if (result.error) {
      console.log(`      Error: ${result.error.message}`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n  Waiting for circuit to reset...');
  await new Promise(r => setTimeout(r, 3100));

  console.log('  After reset timeout:');
  const resetResult = await guardian1.execute('unreliableService', { endpoint: '/api/recovered' });
  console.log(`    Status: ${resetResult.status}, Circuit: ${circuitBreaker.getState()}`);

  console.log('\n2. Result Caching:\n');

  const cachedTools = {
    expensiveComputation: {
      name: 'expensiveComputation',
      description: 'Compute expensive operation with caching',
      fn: async ({ n, useCache = true }) => {
        const cacheKey = `fib:${n}`;

        // Check cache
        if (useCache) {
          const cached = cache.get(cacheKey);
          if (cached && cached.expiry > Date.now()) {
            return { result: cached.value, cached: true };
          }
        }

        // Expensive computation
        const fib = (num: number): number => num <= 1 ? num : fib(num - 1) + fib(num - 2);
        const result = fib(n);

        // Cache result
        cache.set(cacheKey, { value: result, expiry: Date.now() + 60000 });

        return { result, cached: false };
      },
      schema: {
        input: {
          n: { type: SchemaType.NUMBER },
          useCache: { type: SchemaType.BOOLEAN, default: true }
        }
      }
    },

    clearCache: {
      name: 'clearCache',
      description: 'Clear the computation cache',
      fn: async () => {
        cache.clear();
        return { cleared: true, size: 0 };
      },
      schema: { input: {} }
    }
  };

  const guardian2 = new ToolGuardian({ tools: cachedTools });

  console.log('  First call (no cache):');
  const r1 = await guardian2.execute('expensiveComputation', { n: 35 });
  console.log(`    Result: ${r1.result?.result}, Cached: ${r1.result?.cached}`);

  console.log('  Second call (with cache):');
  const r2 = await guardian2.execute('expensiveComputation', { n: 35 });
  console.log(`    Result: ${r2.result?.result}, Cached: ${r2.result?.cached}`);

  console.log('  Different input (no cache):');
  const r3 = await guardian2.execute('expensiveComputation', { n: 36 });
  console.log(`    Result: ${r3.result?.result}, Cached: ${r3.result?.cached}`);

  console.log('\n3. Rate Limiting:\n');

  const rateLimitedTools = {
    apiCall: {
      name: 'apiCall',
      description: 'Rate limited API call',
      fn: async ({ key = 'default' }) => {
        if (!rateLimiter.allow(key, 3, 5000)) {
          throw new Error('Rate limit exceeded');
        }
        return { success: true, key, time: new Date().toISOString() };
      },
      schema: {
        input: {
          key: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian3 = new ToolGuardian({ tools: rateLimitedTools });

  console.log('  Making calls (limit: 3 per 5 seconds):');
  for (let i = 1; i <= 5; i++) {
    const result = await guardian3.execute('apiCall', { key: 'user-1' });
    console.log(`    Call ${i}: ${result.status}`);
    if (result.error) {
      console.log(`      Rate limited!`);
    }
  }

  console.log('\n4. Conditional Execution:\n');

  const conditionalTools = {
    checkCondition: {
      name: 'checkCondition',
      description: 'Check if a condition is met',
      fn: async ({ value }) => {
        return { shouldProceed: value > 50 };
      },
      schema: {
        input: {
          value: { type: SchemaType.NUMBER }
        }
      }
    },

    actionA: {
      name: 'actionA',
      description: 'Execute action A',
      fn: async () => ({ action: 'A executed' }),
      schema: { input: {} }
    },

    actionB: {
      name: 'actionB',
      description: 'Execute action B',
      fn: async () => ({ action: 'B executed' }),
      schema: { input: {} }
    }
  };

  const guardian4 = new ToolGuardian({ tools: conditionalTools });

  console.log('  Conditional execution flow:');
  const condResult = await guardian4.execute('checkCondition', { value: 75 });
  if (condResult.result?.shouldProceed) {
    const actionResult = await guardian4.execute('actionA', {});
    console.log(`    Condition met: ${JSON.stringify(actionResult.result)}`);
  } else {
    const actionResult = await guardian4.execute('actionB', {});
    console.log(`    Condition not met: ${JSON.stringify(actionResult.result)}`);
  }

  console.log('\n5. Tool Composition:\n');

  const compositionTools = {
    fetchUser: {
      name: 'fetchUser',
      description: 'Fetch user by ID',
      fn: async ({ userId }) => {
        return { userId, name: 'Alice', email: 'alice@example.com' };
      },
      schema: {
        input: { userId: { type: SchemaType.STRING } }
      }
    },

    fetchUserPosts: {
      name: 'fetchUserPosts',
      description: 'Fetch posts for a user',
      fn: async ({ userId }) => {
        return {
          userId,
          posts: [
            { id: 1, title: 'First post' },
            { id: 2, title: 'Second post' }
          ]
        };
      },
      schema: {
        input: { userId: { type: SchemaType.STRING } }
      }
    },

    fetchUserStats: {
      name: 'fetchUserStats',
      description: 'Fetch user statistics',
      fn: async ({ userId }) => {
        return { userId, posts: 42, likes: 1234, followers: 567 };
      },
      schema: {
        input: { userId: { type: SchemaType.STRING } }
      }
    },

    buildUserProfile: {
      name: 'buildUserProfile',
      description: 'Compose user data from multiple sources',
      fn: async ({ userId }) => {
        // Use guardian internally to call other tools
        const results = await guardian4.executeParallel([
          { tool: 'fetchUser', parameters: { userId } },
          { tool: 'fetchUserPosts', parameters: { userId } },
          { tool: 'fetchUserStats', parameters: { userId } }
        ]);

        const user = results.find(r => r.functionName === 'fetchUser')?.result;
        const posts = results.find(r => r.functionName === 'fetchUserPosts')?.result;
        const stats = results.find(r => r.functionName === 'fetchUserStats')?.result;

        return {
          profile: {
            ...user,
            postsCount: posts?.posts?.length || 0,
            latestPosts: posts?.posts || [],
            stats
          }
        };
      },
      schema: {
        input: { userId: { type: SchemaType.STRING } }
      }
    }
  };

  const guardian5 = new ToolGuardian({ tools: compositionTools });

  const profileResult = await guardian5.execute('buildUserProfile', { userId: 'user-123' });
  console.log('  Composed user profile:');
  console.log(`    Name: ${profileResult.result?.profile?.name}`);
  console.log(`    Posts: ${profileResult.result?.profile?.postsCount}`);
  console.log(`    Stats: ${JSON.stringify(profileResult.result?.profile?.stats)}`);

  console.log('\n6. Batch Processing:\n');

  const batchTools = {
    processItem: {
      name: 'processItem',
      description: 'Process a single item',
      fn: async ({ itemId, data }) => {
        await new Promise(r => setTimeout(r, 50));
        return { itemId, processed: true, result: data.toUpperCase() };
      },
      schema: {
        input: {
          itemId: { type: SchemaType.STRING },
          data: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian6 = new ToolGuardian({ tools: batchTools });

  console.log('  Processing batch of items:');
  const items = [
    { itemId: '1', data: 'item 1' },
    { itemId: '2', data: 'item 2' },
    { itemId: '3', data: 'item 3' }
  ];

  const batchStart = Date.now();
  const batchResults = await guardian6.executeParallel(
    items.map(item => ({
      tool: 'processItem',
      parameters: item
    }))
  );
  const batchTime = Date.now() - batchStart;

  console.log(`    Processed ${batchResults.length} items in ${batchTime}ms`);
  console.log(`    Parallel speedup: ~${Math.round(150 / batchTime * 10) / 10}x`);

  console.log('\n✓ Advanced scenarios demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  advancedScenarios().catch(console.error);
}

export { advancedScenarios };
