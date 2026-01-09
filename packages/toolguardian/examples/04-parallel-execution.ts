/**
 * Example 4: Parallel Execution
 *
 * Demonstrates executing multiple tools concurrently:
 * - Parallel tool execution for independence
 * - Aggregating parallel results
 * - Error handling in parallel execution
 *
 * @module examples/parallel-execution
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

// Simulated async operations with delays
const delays = new Map<string, number>();

async function simulateDelay(toolName: string, ms: number): Promise<void> {
  delays.set(toolName, ms);
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function parallelExecution() {
  console.log('=== ToolGuardian: Parallel Execution ===\n');

  // Define independent tools
  const tools = {
    fetchUserProfile: {
      name: 'fetchUserProfile',
      description: 'Fetch user profile from database',
      fn: async ({ userId }) => {
        await simulateDelay('fetchUserProfile', 150);
        return {
          userId,
          name: 'Alice',
          email: 'alice@example.com',
          role: 'Developer'
        };
      },
      schema: {
        input: {
          userId: { type: SchemaType.STRING }
        }
      }
    },

    fetchUserStats: {
      name: 'fetchUserStats',
      description: 'Fetch user statistics',
      fn: async ({ userId }) => {
        await simulateDelay('fetchUserStats', 200);
        return {
          userId,
          logins: 142,
          lastLogin: new Date().toISOString(),
          projects: 8
        };
      },
      schema: {
        input: {
          userId: { type: SchemaType.STRING }
        }
      }
    },

    fetchUserActivity: {
      name: 'fetchUserActivity',
      description: 'Fetch recent user activity',
      fn: async ({ userId, limit = 10 }) => {
        await simulateDelay('fetchUserActivity', 100);
        return {
          userId,
          activities: [
            { action: 'commit', repo: 'project-a', time: '2h ago' },
            { action: 'push', repo: 'project-b', time: '5h ago' },
            { action: 'pr', repo: 'project-a', time: '1d ago' }
          ].slice(0, limit)
        };
      },
      schema: {
        input: {
          userId: { type: SchemaType.STRING },
          limit: { type: SchemaType.NUMBER, default: 10 }
        }
      }
    },

    fetchUserNotifications: {
      name: 'fetchUserNotifications',
      description: 'Fetch unread notifications',
      fn: async ({ userId }) => {
        await simulateDelay('fetchUserNotifications', 120);
        return {
          userId,
          unread: 3,
          notifications: [
            { id: 1, message: 'PR approved' },
            { id: 2, message: 'Build failed' },
            { id: 3, message: 'New comment' }
          ]
        };
      },
      schema: {
        input: {
          userId: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian = new ToolGuardian({ tools });

  console.log('1. Sequential execution (for comparison):\n');

  const startTime = Date.now();

  await guardian.execute('fetchUserProfile', { userId: 'user-123' });
  await guardian.execute('fetchUserStats', { userId: 'user-123' });
  await guardian.execute('fetchUserActivity', { userId: 'user-123' });
  await guardian.execute('fetchUserNotifications', { userId: 'user-123' });

  const sequentialTime = Date.now() - startTime;
  console.log(`  Total time: ${sequentialTime}ms\n`);

  console.log('2. Parallel execution:\n');

  const parallelStartTime = Date.now();

  const parallelResults = await guardian.executeParallel([
    { tool: 'fetchUserProfile', parameters: { userId: 'user-123' } },
    { tool: 'fetchUserStats', parameters: { userId: 'user-123' } },
    { tool: 'fetchUserActivity', parameters: { userId: 'user-123', limit: 5 } },
    { tool: 'fetchUserNotifications', parameters: { userId: 'user-123' } }
  ]);

  const parallelTime = Date.now() - parallelStartTime;

  console.log('  Parallel results:');
  for (const result of parallelResults) {
    const truncated = JSON.stringify(result.result).substring(0, 60);
    console.log(`    ${result.functionName}: ${result.status} (${result.executionTime}ms)`);
    console.log(`      ${truncated}...`);
  }

  console.log(`\n  Total time: ${parallelTime}ms`);
  console.log(`  Speedup: ${(sequentialTime / parallelTime).toFixed(2)}x\n`);

  console.log('3. Parallel execution with one failure:\n');

  const toolsWithError = {
    ...tools,
    failingTool: {
      name: 'failingTool',
      description: 'This tool always fails',
      fn: async () => {
        throw new Error('Simulated failure');
      },
      schema: {
        input: {}
      }
    }
  };

  const guardianWithError = new ToolGuardian({ tools: toolsWithError });

  const mixedResults = await guardianWithError.executeParallel([
    { tool: 'fetchUserProfile', parameters: { userId: 'user-456' } },
    { tool: 'failingTool', parameters: {} },
    { tool: 'fetchUserStats', parameters: { userId: 'user-456' } }
  ]);

  console.log('  Mixed results (one failure):');
  for (const result of mixedResults) {
    console.log(`    ${result.functionName}: ${result.status}`);
    if (result.error) {
      console.log(`      Error: ${result.error.message}`);
    }
  }

  console.log('\n4. Aggregate parallel results:\n');

  interface UserDashboard {
    profile?: any;
    stats?: any;
    activity?: any;
    notifications?: any;
    errors: string[];
  }

  const dashboard: UserDashboard = { errors: [] };

  for (const result of parallelResults) {
    if (result.status === 'success' && result.result) {
      // Extract tool name from function name
      const key = result.functionName!.replace('fetchUser', '').toLowerCase() as keyof UserDashboard;
      dashboard[key] = result.result;
    }
  }

  console.log('  Aggregated dashboard data:');
  console.log(`    Profile: ${JSON.stringify(dashboard.profile).substring(0, 50)}...`);
  console.log(`    Stats: ${JSON.stringify(dashboard.stats).substring(0, 50)}...`);
  console.log(`    Activity: ${dashboard.activity?.activities?.length} activities`);
  console.log(`    Notifications: ${dashboard.notifications?.unread} unread\n`);

  console.log('✓ Parallel execution demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  parallelExecution().catch(console.error);
}

export { parallelExecution };
