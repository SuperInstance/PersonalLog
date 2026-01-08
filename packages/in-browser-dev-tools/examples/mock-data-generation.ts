/**
 * Example: Mock Data Generation
 *
 * Demonstrates mock data generation capabilities.
 */

import {
  mockData,
  generateConversation,
  generateConversations,
  generateMessages,
  generateKnowledgeEntry,
  generateKnowledgeEntries,
  generatePluginState,
  generatePluginStates,
  MockConversation,
  MockMessage,
  MockKnowledgeEntry,
  MockPluginState
} from '../src';

// Basic random data generation
function demonstrateBasicGeneration() {
  console.log('=== Basic Data Generation Demo ===\n');

  console.log('Random string:', mockData.randomString(10));
  console.log('Random ID:', mockData.randomId('user_'));
  console.log('Random number:', mockData.randomNumber(1, 100));
  console.log('Random boolean:', mockData.randomBoolean(0.7));
  console.log('Random date:', new Date(mockData.randomDate(30)).toISOString());
  console.log('Random text:', mockData.randomLorem(3));
}

// Conversation data
function demonstrateConversations() {
  console.log('\n=== Conversation Data Demo ===\n');

  // Generate single conversation
  const conversation = generateConversation({
    title: 'Test Conversation',
    messageCount: 5
  });
  console.log('Conversation:', conversation);

  // Generate multiple conversations
  const conversations = generateConversations(3);
  console.log(`\nGenerated ${conversations.length} conversations:`);
  conversations.forEach((conv: MockConversation, index: number) => {
    console.log(`  ${index + 1}. ${conv.title} (${conv.messageCount} messages)`);
  });
}

// Message data
function demonstrateMessages() {
  console.log('\n=== Message Data Demo ===\n');

  const conversationId = mockData.randomId('conv_');

  // Generate messages
  const messages = generateMessages(conversationId, 5);
  console.log(`Generated ${messages.length} messages:`);

  messages.forEach((msg: MockMessage, index: number) => {
    console.log(`  ${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
  });
}

// Knowledge data
function demonstrateKnowledgeEntries() {
  console.log('\n=== Knowledge Entry Data Demo ===\n');

  // Generate single entry
  const entry = generateKnowledgeEntry({
    title: 'Test Entry',
    tags: ['test', 'documentation']
  });
  console.log('Knowledge entry:', entry);

  // Generate multiple entries
  const entries = generateKnowledgeEntries(3);
  console.log(`\nGenerated ${entries.length} knowledge entries:`);

  entries.forEach((entry: MockKnowledgeEntry, index: number) => {
    console.log(`  ${index + 1}. ${entry.title}`);
    console.log(`     Tags: ${entry.tags.join(', ')}`);
    console.log(`     Embedding: ${entry.embedding ? 'Yes' : 'No'}`);
  });
}

// Plugin state data
function demonstratePluginStates() {
  console.log('\n=== Plugin State Data Demo ===\n');

  // Generate single plugin state
  const pluginState = generatePluginState({
    name: 'Test Plugin',
    enabled: true
  });
  console.log('Plugin state:', JSON.stringify(pluginState, null, 2));

  // Generate multiple plugin states
  const pluginStates = generatePluginStates(3);
  console.log(`\nGenerated ${pluginStates.length} plugin states:`);

  pluginStates.forEach((plugin: MockPluginState, index: number) => {
    console.log(`  ${index + 1}. ${plugin.name}`);
    console.log(`     Enabled: ${plugin.enabled}`);
    console.log(`     State: ${plugin.state}`);
    console.log(`     Executions: ${plugin.stats.executionCount}`);
    console.log(`     Errors: ${plugin.stats.errorCount}`);
  });
}

// Performance data
function demonstratePerformanceData() {
  console.log('\n=== Performance Data Demo ===\n');

  // Generate performance metrics
  const metrics = mockData.generatePerformanceMetrics();
  console.log('Performance metrics:', metrics);

  // Generate performance timeline
  const timeline = mockData.generatePerformanceTimeline(5);
  console.log(`\nPerformance timeline (${timeline.length} points):`);

  timeline.forEach((point: any, index: number) => {
    console.log(`  ${index + 1}. ${new Date(point.timestamp).toISOString()}`);
    console.log(`     FPS: ${point.metrics.fps}`);
    console.log(`     Memory: ${point.metrics.memoryUsed}MB`);
    console.log(`     CPU: ${point.metrics.cpuUsage}%`);
  });
}

// Log data
function demonstrateLogData() {
  console.log('\n=== Log Data Demo ===\n');

  // Generate single log entry
  const logEntry = mockData.generateLogEntry();
  console.log('Log entry:', logEntry);

  // Generate multiple log entries
  const logEntries = mockData.generateLogEntries(10);
  console.log(`\nGenerated ${logEntries.length} log entries:`);

  // Group by level
  const byLevel: Record<string, number> = {};
  logEntries.forEach((entry: any) => {
    byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
  });

  console.log('By level:', byLevel);

  // Group by category
  const byCategory: Record<string, number> = {};
  logEntries.forEach((entry: any) => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  });

  console.log('By category:', byCategory);
}

// Random data utilities
function demonstrateRandomUtilities() {
  console.log('\n=== Random Data Utilities Demo ===\n');

  // Random items from array
  const fruits = ['apple', 'banana', 'orange', 'grape', 'mango'];
  const randomFruit = mockData.randomItem(fruits);
  const randomFruits = mockData.randomItems(fruits, 3);

  console.log('Random fruit:', randomFruit);
  console.log('Random fruits:', randomFruits);

  // Random dates within range
  const dates = Array.from({ length: 5 }, () => mockData.randomDate(7));
  console.log('\nRandom dates (last 7 days):');
  dates.forEach((date: number, index: number) => {
    console.log(`  ${index + 1}. ${new Date(date).toISOString()}`);
  });

  // Random lorem ipsum
  console.log('\nRandom text:');
  for (let i = 1; i <= 3; i++) {
    console.log(`  ${i}. ${mockData.randomLorem(i)}`);
  }
}

// Custom data generation
function demonstrateCustomGeneration() {
  console.log('\n=== Custom Data Generation Demo ===\n');

  // Generate custom user data
  interface CustomUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
    createdAt: number;
  }

  const generateUser = (): CustomUser => ({
    id: mockData.randomId('user_'),
    name: `User ${mockData.randomNumber(1, 1000)}`,
    email: `user${mockData.randomNumber(1, 1000)}@example.com`,
    role: mockData.randomItem(['admin', 'user', 'guest']),
    createdAt: mockData.randomDate(365)
  });

  const users = Array.from({ length: 5 }, generateUser);
  console.log('Generated users:');
  users.forEach((user: CustomUser, index: number) => {
    console.log(`  ${index + 1}. ${user.name} (${user.role}) - ${user.email}`);
  });
}

// Integration example: Generate test dataset
async function generateTestDataset() {
  console.log('\n=== Test Dataset Generation Demo ===\n');

  // Generate conversations with messages
  const conversations = generateConversations(3);
  const dataset = {
    conversations: await Promise.all(conversations.map(async (conv) => ({
      ...conv,
      messages: generateMessages(conv.id, conv.messageCount)
    }))),
    knowledgeEntries: generateKnowledgeEntries(5),
    pluginStates: generatePluginStates(2),
    performanceTimeline: mockData.generatePerformanceTimeline(10),
    logs: mockData.generateLogEntries(20)
  };

  console.log('Test dataset generated:');
  console.log(`  Conversations: ${dataset.conversations.length}`);
  console.log(`  Total messages: ${dataset.conversations.reduce((sum, conv) => sum + conv.messages.length, 0)}`);
  console.log(`  Knowledge entries: ${dataset.knowledgeEntries.length}`);
  console.log(`  Plugin states: ${dataset.pluginStates.length}`);
  console.log(`  Performance points: ${dataset.performanceTimeline.length}`);
  console.log(`  Log entries: ${dataset.logs.length}`);

  return dataset;
}

// Run all demonstrations
async function main() {
  demonstrateBasicGeneration();
  demonstrateConversations();
  demonstrateMessages();
  demonstrateKnowledgeEntries();
  demonstratePluginStates();
  demonstratePerformanceData();
  demonstrateLogData();
  demonstrateRandomUtilities();
  demonstrateCustomGeneration();
  await generateTestDataset();

  console.log('\n=== Demo Complete ===');
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  demonstrateBasicGeneration,
  demonstrateConversations,
  demonstrateMessages,
  demonstrateKnowledgeEntries,
  demonstratePluginStates,
  demonstratePerformanceData,
  demonstrateLogData,
  demonstrateRandomUtilities,
  demonstrateCustomGeneration,
  generateTestDataset,
};
