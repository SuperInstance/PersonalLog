/**
 * Example 8: Context Management
 *
 * Demonstrates using MemoryPalace for conversation/context management:
 * - Maintaining conversation history
 * - Tracking user intent and state
 * - Contextual retrieval for relevant responses
 *
 * @module examples/context-management
 */

import { MemoryPalace } from '../src/index.js';

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  embedding?: number[];
}

interface ConversationContext {
  conversationId: string;
  userId: string;
  topic: string;
  startTime: number;
  lastActivity: number;
  turnCount: number;
}

async function contextManagementDemo() {
  console.log('=== MemoryPalace: Context Management Demo ===\n');

  const memory = new MemoryPalace({
    consolidation: {
      workingToShortTermThreshold: 0.4,
      shortToLongTermThreshold: 0.6,
      workingMaxSize: 30,
      shortTermMaxSize: 1000,
      longTermMaxSize: 10000
    }
  });

  console.log('1. Starting a new conversation:\n');

  const conversationId = `conv-${Date.now()}`;
  const userId = 'user-123';

  // Store conversation context in working memory
  memory.working.set('currentConversation', {
    id: conversationId,
    userId,
    topic: 'WebGPU development',
    started: Date.now()
  } as ConversationContext);

  memory.working.set('userIntent', 'learn how to optimize WebGPU code');
  memory.working.set('conversationState', 'active');

  console.log(`  Started conversation ${conversationId}`);
  console.log(`  Topic: WebGPU development`);
  console.log(`  User intent: learn how to optimize WebGPU code\n`);

  console.log('2. Processing conversation turns:\n');

  // Simulate conversation
  const turns: ConversationTurn[] = [
    {
      role: 'user',
      content: 'How can I optimize my WebGPU compute shaders?',
      timestamp: Date.now()
    },
    {
      role: 'assistant',
      content: 'You can optimize using memory coalescing, workgroup size tuning, and shared memory.',
      timestamp: Date.now() + 1000
    },
    {
      role: 'user',
      content: 'What\'s the optimal workgroup size for matrix multiplication?',
      timestamp: Date.now() + 2000
    },
    {
      role: 'assistant',
      content: 'For matrix multiplication, 16x16 or 32x32 workgroups often work well depending on your GPU.',
      timestamp: Date.now() + 3000
    },
    {
      role: 'user',
      content: 'Can you show me a code example?',
      timestamp: Date.now() + 4000
    }
  ];

  // Store conversation in short-term
  for (const turn of turns) {
    await memory.shortTerm.store(turn, {
      agentId: 'conversation-manager',
      tags: ['conversation', conversationId, turn.role, 'webgpu'],
      importance: 0.5
    });
  }

  console.log(`  Stored ${turns.length} conversation turns`);

  // Update working context
  memory.working.set('lastMessage', turns[turns.length - 1].content);
  memory.working.set('turnCount', turns.length);
  memory.working.addTags('currentConversation', ['code-request', 'needs-example']);

  console.log('  Current context updated');
  console.log(`  Last message: "${turns[turns.length - 1].content}"\n`);

  console.log('3. Retrieving relevant context for response:\n');

  // Get recent conversation
  const recentTurns = await memory.shortTerm.search(conversationId, {
    tags: ['conversation', conversationId],
    limit: 5
  });

  console.log('  Recent conversation context:');
  for (const turn of recentTurns.slice(0, 3)) {
    console.log(`    [${turn.tags.includes('user') ? 'User' : 'Assistant'}] ${turn.content}`);
  }

  // Get related knowledge
  const webgpuKnowledge = await memory.retrieve('webgpu shader optimization');
  console.log(`\n  Found ${webgpuKnowledge.length} related memories`);

  // Check current intent
  const currentIntent = memory.working.get('userIntent');
  console.log(`\n  Current user intent: ${currentIntent}`);

  console.log('\n4. Context-aware response generation:\n');

  // Demonstrate context awareness
  const contextState = {
    conversation: memory.working.get('currentConversation'),
    intent: memory.working.get('userIntent'),
    state: memory.working.get('conversationState'),
    turnCount: memory.working.get('turnCount'),
    lastMessage: memory.working.get('lastMessage')
  };

  console.log('  Available context:');
  for (const [key, value] of Object.entries(contextState)) {
    if (value !== undefined) {
      const display = typeof value === 'object'
        ? JSON.stringify(value).substring(0, 50) + '...'
        : String(value);
      console.log(`    ${key}: ${display}`);
    }
  }

  console.log('\n5. Handling context transitions:\n');

  // User shifts topic
  console.log('  User shifts topic to "Rust programming"');
  memory.working.set('previousTopic', 'WebGPU development');
  memory.working.set('currentTopic', 'Rust programming');
  memory.working.set('userIntent', 'learn Rust ownership');

  // Store transition
  await memory.shortTerm.store({
    type: 'context-transition',
    from: 'WebGPU development',
    to: 'Rust programming',
    timestamp: Date.now()
  }, {
    agentId: 'conversation-manager',
    tags: ['context-transition', conversationId],
    importance: 0.6
  });

  console.log('  Context transition stored');

  console.log('\n6. Retrieving conversation history:\n');

  const allConvTurns = await memory.shortTerm.getByTag(conversationId);
  console.log(`  Retrieved ${allConvTurns.length} turns from conversation`);

  console.log('\n7. Topic-based context grouping:\n');

  // Group by topic
  const webgpuTurns = await memory.shortTerm.getByTag('webgpu');
  const rustTurns = await memory.shortTerm.getByTag('rust');

  console.log('  Topic distribution:');
  console.log(`    WebGPU: ${webgpuTurns.length} messages`);
  console.log(`    Rust: ${rustTurns.length} messages`);

  console.log('\n8. Context cleanup and archival:\n');

  // Simulate conversation ending - move to long-term
  const conversationSummary = await memory.shortTerm.store({
    type: 'conversation-summary',
    conversationId,
    topics: ['WebGPU', 'Rust'],
    turnCount: turns.length,
    userIntent: 'learn WebGPU and Rust',
    timestamp: Date.now()
  }, {
    agentId: 'conversation-manager',
    tags: ['summary', conversationId, 'archived'],
    importance: 0.7
  });

  console.log('  Conversation summary stored for archival');

  // Clear working memory
  memory.working.delete('currentConversation');
  memory.working.delete('userIntent');
  memory.working.delete('lastMessage');
  console.log('  Working memory cleared');

  console.log('\n9. Context retrieval statistics:\n');

  const stats = memory.getStats();
  console.log(`  Working: ${stats.working.count} (active context)`);
  console.log(`  Short-term: ${stats.shortTerm.count} (recent conversations)`);
  console.log(`  Long-term: ${stats.longTerm.count} (archived context)`);

  await memory.destroy();
  console.log('\n✓ Context management demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  contextManagementDemo().catch(console.error);
}

export { contextManagementDemo };
