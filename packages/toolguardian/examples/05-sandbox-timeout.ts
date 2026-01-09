/**
 * Example 5: Sandbox and Timeout
 *
 * Demonstrates execution sandboxing and timeout handling:
 * - Preventing infinite loops
 * - Limiting execution time
 * - Memory limits
 * - Error isolation
 *
 * @module examples/sandbox-timeout
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

async function sandboxAndTimeout() {
  console.log('=== ToolGuardian: Sandbox and Timeout ===\n');

  // Define tools with different timeout requirements
  const tools = {
    quickTask: {
      name: 'quickTask',
      description: 'A fast task',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { result: 'Quick task completed' };
      },
      timeout: 5000,
      schema: {
        input: {}
      }
    },

    slowTask: {
      name: 'slowTask',
      description: 'A task that takes a while',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { result: 'Slow task completed' };
      },
      timeout: 5000,
      schema: {
        input: {}
      }
    },

    infiniteLoop: {
      name: 'infiniteLoop',
      description: 'Simulates a task that never completes',
      fn: async () => {
        return new Promise(() => {
          // Never resolves - infinite loop
          while (true) { /* hang */ }
        });
      },
      timeout: 1000,
      schema: {
        input: {}
      }
    },

    memoryHeavy: {
      name: 'memoryHeavy',
      description: 'Process large data',
      fn: async ({ size }) => {
        // Simulate processing large data
        const data = new Array(size).fill('x').join('');
        return {
          processed: true,
          originalSize: data.length,
          compressedSize: data.length * 0.5
        };
      },
      timeout: 5000,
      schema: {
        input: {
          size: {
            type: SchemaType.NUMBER,
            minimum: 1,
            maximum: 1000000
          }
        }
      }
    },

    riskyOperation: {
      name: 'riskyOperation',
      description: 'Operation that might throw errors',
      fn: async () => {
        const random = Math.random();
        if (random < 0.3) {
          throw new Error('Random error occurred');
        }
        if (random < 0.5) {
          throw new Error('Network error');
        }
        return { success: true, value: random };
      },
      timeout: 5000,
      schema: {
        input: {}
      }
    }
  };

  const guardian = new ToolGuardian({
    tools,
    defaultSandboxConfig: {
      timeout: 2000,
      catchErrors: true
    }
  });

  console.log('1. Quick task (within timeout):\n');

  const quickResult = await guardian.execute('quickTask', {});
  console.log(`  Status: ${quickResult.status}`);
  console.log(`  Result: ${quickResult.result?.result}`);
  console.log(`  Time: ${quickResult.executionTime}ms\n`);

  console.log('2. Slow task (within timeout):\n');

  const slowResult = await guardian.execute('slowTask', {});
  console.log(`  Status: ${slowResult.status}`);
  console.log(`  Result: ${slowResult.result?.result}`);
  console.log(`  Time: ${slowResult.executionTime}ms\n`);

  console.log('3. Infinite loop (timeout protection):\n');

  const infiniteResult = await guardian.execute('infiniteLoop', {}, {
    timeout: 500
  });
  console.log(`  Status: ${infiniteResult.status}`);
  console.log(`  Error: ${infiniteResult.error?.message}`);
  console.log(`  Time: ${infiniteResult.executionTime}ms (stopped at timeout)\n`);

  console.log('4. Custom timeout per execution:\n');

  const customTimeoutResult = await guardian.execute('slowTask', {}, {
    sandbox: true,
    timeout: 300
  });
  console.log(`  Status: ${customTimeoutResult.status}`);
  console.log(`  Error: ${customTimeoutResult.error?.message}`);
  console.log(`  Time: ~300ms (custom timeout)\n`);

  console.log('5. Memory-heavy operation:\n');

  const memoryResult = await guardian.execute('memoryHeavy', {
    size: 100000
  });
  console.log(`  Status: ${memoryResult.status}`);
  console.log(`  Processed: ${memoryResult.result?.processed}`);
  console.log(`  Original size: ${memoryResult.result?.originalSize} characters\n`);

  console.log('6. Multiple executions with sandbox:\n');

  const parallelSandbox = await guardian.executeParallel([
    { tool: 'quickTask', parameters: {}, options: { timeout: 5000 } },
    { tool: 'infiniteLoop', parameters: {}, options: { timeout: 500 } }
  ]);

  console.log('  Parallel sandboxed execution:');
  for (const result of parallelSandbox) {
    console.log(`    ${result.functionName}: ${result.status} (${result.executionTime}ms)`);
  }

  console.log('\n7. Error isolation (other tools unaffected):\n');

  // First call succeeds
  const result1 = await guardian.execute('riskyOperation', {});
  console.log(`  First call: ${result1.status}`);

  // Second call might fail
  const result2 = await guardian.execute('riskyOperation', {});
  console.log(`  Second call: ${result2.status}`);

  // Third call
  const result3 = await guardian.execute('riskyOperation', {});
  console.log(`  Third call: ${result3.status}\n`);

  console.log('8. Get execution history:\n');

  const history = guardian.getHistory({ limit: 5 });
  console.log('  Recent executions:');
  for (const entry of history) {
    console.log(`    ${entry.toolName}: ${entry.result.status} (${entry.duration}ms)`);
  }

  console.log('\n✓ Sandbox and timeout demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  sandboxAndTimeout().catch(console.error);
}

export { sandboxAndTimeout };
