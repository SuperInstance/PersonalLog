/**
 * Example 3: Prerequisites and Chaining
 *
 * Demonstrates tool dependencies and sequential execution:
 * - Defining tool prerequisites
 * - Automatic prerequisite checking
 * - Sequential tool execution (chaining)
 *
 * @module examples/prerequisites-chaining
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

// Shared state to simulate workflow
const workflowState = {
  userAuthenticated: false,
  dataRetrieved: false,
  reportGenerated: false
};

async function prerequisitesAndChaining() {
  console.log('=== ToolGuardian: Prerequisites and Chaining ===\n');

  // Define tools with prerequisites
  const tools = {
    authenticate: {
      name: 'authenticate',
      description: 'Authenticate user',
      fn: async ({ apiKey }) => {
        workflowState.userAuthenticated = true;
        return { userId: 'user-123', token: 'tok-abc' };
      },
      prerequisites: [], // No prerequisites
      schema: {
        input: {
          apiKey: { type: SchemaType.STRING, minLength: 10 }
        }
      }
    },

    fetchData: {
      name: 'fetchData',
      description: 'Fetch data from API',
      fn: async () => {
        if (!workflowState.userAuthenticated) {
          throw new Error('Not authenticated');
        }
        workflowState.dataRetrieved = true;
        return { records: 42, data: [1, 2, 3] };
      },
      prerequisites: ['authenticate'], // Must authenticate first
      schema: {
        input: {}
      }
    },

    generateReport: {
      name: 'generateReport',
      description: 'Generate report from data',
      fn: async () => {
        if (!workflowState.dataRetrieved) {
          throw new Error('Data not fetched');
        }
        workflowState.reportGenerated = true;
        return { reportUrl: '/reports/abc-123', pages: 5 };
      },
      prerequisites: ['fetchData'], // Must fetch data first
      schema: {
        input: {}
      }
    },

    sendEmail: {
      name: 'sendEmail',
      description: 'Send email with report',
      fn: async () => {
        if (!workflowState.reportGenerated) {
          throw new Error('Report not generated');
        }
        return { messageId: 'msg-xyz', status: 'sent' };
      },
      prerequisites: ['generateReport'],
      schema: {
        input: {
          recipient: { type: SchemaType.STRING }
        }
      }
    }
  };

  const guardian = new ToolGuardian({ tools });

  console.log('1. Attempting to execute tool without prerequisites:\n');

  const fetchResult = await guardian.execute('fetchData', {});
  console.log(`  fetchData status: ${fetchResult.status}`);
  console.log(`  Error: ${fetchResult.error?.message}\n`);

  console.log('2. Executing tools in correct order (manual):\n');

  const authResult = await guardian.execute('authenticate', {
    apiKey: 'sk-test-1234567890'
  });
  console.log(`  authenticate: ${authResult.status} → ${JSON.stringify(authResult.result).substring(0, 30)}...`);

  const fetchDataResult = await guardian.execute('fetchData', {});
  console.log(`  fetchData: ${fetchDataResult.status} → ${JSON.stringify(fetchDataResult.result).substring(0, 30)}...`);

  const reportResult = await guardian.execute('generateReport', {});
  console.log(`  generateReport: ${reportResult.status} → ${JSON.stringify(reportResult.result).substring(0, 30)}...`);

  const emailResult = await guardian.execute('sendEmail', {
    recipient: 'user@example.com'
  });
  console.log(`  sendEmail: ${emailResult.status} → ${JSON.stringify(emailResult.result).substring(0, 30)}...\n`);

  console.log('3. Using executeChain for sequential execution:\n');

  // Reset state
  workflowState.userAuthenticated = false;
  workflowState.dataRetrieved = false;
  workflowState.reportGenerated = false;

  const chainResults = await guardian.executeChain([
    { tool: 'authenticate', parameters: { apiKey: 'sk-test-1234567890' } },
    { tool: 'fetchData', parameters: {} },
    { tool: 'generateReport', parameters: {} },
    { tool: 'sendEmail', parameters: { recipient: 'admin@example.com' } }
  ]);

  console.log('  Chain execution results:');
  for (const result of chainResults) {
    const truncated = JSON.stringify(result.result || '').substring(0, 40);
    console.log(`    ${result.functionName}: ${result.status} → ${truncated}...`);
  }

  console.log(`\n  All ${chainResults.length} steps completed successfully!`);

  console.log('\n4. Chain with early failure:\n');

  // Reset state
  workflowState.userAuthenticated = false;
  workflowState.dataRetrieved = false;
  workflowState.reportGenerated = false;

  const failedChain = await guardian.executeChain([
    { tool: 'fetchData', parameters: {} } // Will fail - no auth
  ]);

  console.log('  Chain stopped at first failure:');
  console.log(`    ${failedChain[0].functionName}: ${failedChain[0].status}`);
  console.log(`    Error: ${failedChain[0].error?.message}`);

  console.log('\n✓ Prerequisites and chaining demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prerequisitesAndChaining().catch(console.error);
}

export { prerequisitesAndChaining };
