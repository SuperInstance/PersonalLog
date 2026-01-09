/**
 * Example 1: Basic Memory Operations
 *
 * Demonstrates the fundamental operations of MemoryPalace:
 * - Setting and getting values in working memory
 * - Storing in short-term and long-term memory
 * - Basic retrieval across all tiers
 *
 * @module examples/basic-operations
 */

import { MemoryPalace, MemoryTier } from '../src/index.js';

async function basicOperations() {
  console.log('=== MemoryPalace: Basic Operations ===\n');

  // Initialize MemoryPalace
  const memory = new MemoryPalace({
    consolidation: {
      workingMaxSize: 10,
      shortTermMaxSize: 100,
      longTermMaxSize: 1000,
      consolidationInterval: 60000 // 1 minute for demo
    }
  });

  // 1. Working Memory - Fast, temporary storage
  console.log('1. Working Memory Operations:');
  memory.working.set('currentTask', 'Learn MemoryPalace');
  memory.working.set('activeProject', 'AI Tools');

  const currentTask = memory.working.get('currentTask');
  console.log('   Current task:', currentTask);
  console.log('   Working memory size:', memory.working.size());

  // 2. Short-term Memory - Recent information
  console.log('\n2. Short-term Memory Operations:');
  const conversationId = await memory.shortTerm.store(
    'User asked about semantic search',
    {
      agentId: 'assistant',
      tags: ['conversation', 'question'],
      importance: 0.6
    }
  );
  console.log('   Stored conversation:', conversationId);

  const retrieved = await memory.shortTerm.get(conversationId);
  console.log('   Retrieved:', retrieved?.content);

  // 3. Long-term Memory - Important knowledge
  console.log('\n3. Long-term Memory Operations:');
  const knowledgeId = await memory.longTerm.store(
    { concept: 'Vector embeddings represent text as numbers', category: 'AI' },
    {
      agentId: 'assistant',
      tags: ['knowledge', 'embeddings', 'ai'],
      importance: 0.9
    }
  );
  console.log('   Stored knowledge:', knowledgeId);

  // 4. Store with automatic tier selection
  console.log('\n4. Auto-tier Storage:');
  const lowImportanceId = await memory.store(
    'Temporary note',
    { importance: 0.4, tier: MemoryTier.WORKING }
  );
  console.log('   Low importance stored in working memory');

  const highImportanceId = await memory.store(
    { key: 'Important fact', value: 'Remember this' },
    { importance: 0.85 }
  );
  console.log('   High importance stored in long-term:', highImportanceId);

  // 5. Cross-tier retrieval
  console.log('\n5. Cross-tier Retrieval:');
  const allTaskResults = await memory.retrieve('task');
  console.log('   Found', allTaskResults.length, 'memories matching "task"');

  // 6. Get statistics
  console.log('\n6. Memory Statistics:');
  const stats = memory.getStats();
  console.log('   Working:', stats.working.count, '/', stats.working.maxSize);
  console.log('   Short-term:', stats.shortTerm.count, '/', stats.shortTerm.maxSize);
  console.log('   Long-term:', stats.longTerm.count, '/', stats.longTerm.maxSize);
  console.log('   Total:', stats.totalMemories);

  // Cleanup
  await memory.destroy();
  console.log('\n✓ Basic operations completed');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicOperations().catch(console.error);
}

export { basicOperations };
