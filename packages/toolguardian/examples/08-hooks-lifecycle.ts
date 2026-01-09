/**
 * Example 8: Hooks and Lifecycle Events
 *
 * Demonstrates lifecycle hooks and event system:
 * - Before/after execution hooks
 * - Error handling hooks
 * - Validation hooks
 * - Custom middleware
 * - Event-driven architecture
 *
 * @module examples/hooks-lifecycle
 */

import { ToolGuardian, SchemaType } from '../src/index.js';
import type { ExecutionOptions } from '../src/types.js';

async function hooksAndLifecycle() {
  console.log('=== ToolGuardian: Hooks and Lifecycle ===\n');

  // Track hook executions
  const hookLog: string[] = [];

  // Define tools
  const tools = {
    processData: {
      name: 'processData',
      description: 'Process some data',
      fn: async ({ input }) => {
        hookLog.push('  [Inside processData fn]');
        return { processed: input.toUpperCase() };
      },
      schema: {
        input: {
          input: { type: SchemaType.STRING }
        }
      }
    },

    failingTask: {
      name: 'failingTask',
      description: 'A task that fails',
      fn: async () => {
        throw new Error('Intentional failure');
      },
      schema: {
        input: {}
      }
    },

    authenticatedTask: {
      name: 'authenticatedTask',
      description: 'Requires authentication',
      fn: async () => {
        return { secret: 'classified data' };
      },
      schema: {
        input: {}
      }
    }
  };

  const guardian = new ToolGuardian({ tools });

  console.log('1. Registering lifecycle hooks:\n');

  // Before execution hook
  guardian.hooks.before('processData', async (params) => {
    hookLog.push(`[before] processData called with: ${JSON.stringify(params)}`);
    console.log(`  → before hook: processing ${JSON.stringify(params)}`);
    // Can modify parameters
    if (params.input) {
      params.input = params.input.trim();
    }
  });

  // After execution hook
  guardian.hooks.after('processData', async (result, params) => {
    hookLog.push(`[after] processData completed: ${result.status}`);
    console.log(`  → after hook: result is ${result.status}`);
    // Can modify result
    if (result.result) {
      (result.result as any).timestamp = Date.now();
    }
  });

  // Before execution hook for all tools
  guardian.hooks.before('*', async (params, context) => {
    hookLog.push(`[before *] ${context.toolName} called`);
    console.log(`  → global before hook: ${context.toolName}`);
  });

  // After execution hook for all tools
  guardian.hooks.after('*', async (result, params, context) => {
    hookLog.push(`[after *] ${context.toolName} completed: ${result.status}`);
    console.log(`  → global after hook: ${context.toolName} = ${result.status}`);
  });

  // Error handling hook
  guardian.hooks.onError('failingTask', async (error, params) => {
    hookLog.push(`[onError] failingTask: ${error.message}`);
    console.log(`  → error hook: caught "${error.message}"`);
    // Can recover or modify error
    return { handled: true, message: 'Error was handled' };
  });

  console.log('2. Executing with hooks:\n');

  const result1 = await guardian.execute('processData', { input: '  hello world  ' });
  console.log(`  Result: ${JSON.stringify(result1.result)}`);
  console.log('\n  Hook execution order:');
  for (const log of hookLog) {
    console.log(`    ${log}`);
  }

  console.log('\n3. Error handling with hooks:\n');

  hookLog.length = 0;
  const result2 = await guardian.execute('failingTask', {});
  console.log(`  Result status: ${result2.status}`);
  console.log(`  Error: ${result2.error?.message}`);

  console.log('\n4. Authentication middleware via before hook:\n');

  // Simulated auth state
  let isAuthenticated = false;

  guardian.hooks.before('authenticatedTask', async (_params, context) => {
    if (!isAuthenticated) {
      hookLog.push(`[auth] rejected - not authenticated`);
      throw new Error('Authentication required');
    }
    hookLog.push(`[auth] granted - authenticated`);
    console.log('  → Auth check passed');
  });

  const result3 = await guardian.execute('authenticatedTask', {});
  console.log(`  Result status: ${result3.status}`);
  console.log(`  Error: ${result3.error?.message}`);

  console.log('\n5. After authentication:\n');

  isAuthenticated = true;
  const result4 = await guardian.execute('authenticatedTask', {});
  console.log(`  Result status: ${result4.status}`);
  console.log(`  Data: ${JSON.stringify(result4.result)}`);

  console.log('\n6. Event-driven architecture:\n');

  const eventLog: string[] = [];

  // Subscribe to all events
  guardian.on('execution:starting', (data) => {
    eventLog.push(`starting: ${data.toolName}`);
    console.log(`  [Event] Starting: ${data.toolName}`);
  });

  guardian.on('execution:complete', (data) => {
    eventLog.push(`complete: ${data.toolName} (${data.duration}ms)`);
    console.log(`  [Event] Complete: ${data.toolName} in ${data.duration}ms`);
  });

  guardian.on('execution:failed', (data) => {
    eventLog.push(`failed: ${data.toolName}`);
    console.log(`  [Event] Failed: ${data.toolName} - ${data.error?.message}`);
  });

  guardian.on('validation:failed', (data) => {
    eventLog.push(`validation: ${data.toolName}`);
    console.log(`  [Event] Validation failed: ${data.toolName}`);
  });

  console.log('  Executing tasks with event listeners...\n');
  await guardian.execute('processData', { input: 'test' });
  await guardian.execute('failingTask', {});

  console.log('\n7. Hook execution order summary:\n');

  console.log('  Events fired:');
  for (const event of eventLog) {
    console.log(`    - ${event}`);
  }

  console.log('\n8. Removing hooks:\n');

  // Get before hooks count
  const beforeHooks = guardian.hooks.getHooks('before', 'processData');
  console.log(`  Hooks before removal: ${beforeHooks.length}`);

  // Remove all before hooks for processData
  guardian.hooks.remove('before', 'processData');

  const afterRemoval = guardian.hooks.getHooks('before', 'processData');
  console.log(`  Hooks after removal: ${afterRemoval.length}`);

  console.log('\n9. Chained hooks execution:\n');

  hookLog.length = 0;

  // Add multiple before hooks
  guardian.hooks.before('processData', async (params) => {
    hookLog.push('[hook 1] sanitize input');
    console.log('  → Hook 1: Sanitizing input');
  });

  guardian.hooks.before('processData', async (params) => {
    hookLog.push('[hook 2] validate input');
    console.log('  → Hook 2: Validating input');
  });

  guardian.hooks.before('processData', async (params) => {
    hookLog.push('[hook 3] log request');
    console.log('  → Hook 3: Logging request');
  });

  await guardian.execute('processData', { input: 'test' });

  console.log('\n  Hook execution order:');
  for (const log of hookLog) {
    console.log(`    ${log}`);
  }

  console.log('\n10. Custom execution options with hooks:\n');

  const customOptions: ExecutionOptions = {
    sandbox: true,
    timeout: 5000,
    retryOnFailure: false,
    context: {
      userId: 'user-123',
      requestId: 'req-456'
    }
  };

  const result5 = await guardian.execute('processData', { input: 'custom' }, customOptions);
  console.log(`  Result with custom options: ${result5.status}`);

  console.log('\n✓ Hooks and lifecycle demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  hooksAndLifecycle().catch(console.error);
}

export { hooksAndLifecycle };
