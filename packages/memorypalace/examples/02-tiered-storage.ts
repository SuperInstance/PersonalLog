/**
 * Example 2: Tiered Storage Demo
 *
 * Demonstrates how memories flow between tiers:
 * - Working memory for immediate context
 * - Short-term for recent information
 * - Long-term for persistent knowledge
 * - Automatic promotion/demotion based on importance
 *
 * @module examples/tiered-storage
 */

import { MemoryPalace, MemoryTier } from '../src/index.js';

async function tieredStorageDemo() {
  console.log('=== MemoryPalace: Tiered Storage Demo ===\n');

  const memory = new MemoryPalace({
    consolidation: {
      workingToShortTermThreshold: 0.5,
      shortToLongTermThreshold: 0.7,
      workingMaxSize: 20,
      shortTermMaxSize: 500,
      longTermMaxSize: 5000,
      consolidationInterval: 30000 // 30 seconds
    }
  });

  // Simulate an agent's workflow with different importance levels

  console.log('--- Phase 1: Working Memory (Immediate Context) ---');
  // Store current task context in working memory
  memory.working.set('currentPrompt', 'Explain quantum computing');
  memory.working.set('userIntent', 'learning');
  memory.working.set('conversationState', 'active');
  memory.working.set('lastMessage', 'What is a qubit?');

  console.log('Working memory items:');
  for (const mem of memory.working.getAll()) {
    console.log(`  - ${mem.id}: ${mem.content} (importance: ${mem.importance.toFixed(2)})`);
  }

  console.log('\n--- Phase 2: Short-term Memory (Recent Session) ---');
  // Store conversation summary in short-term
  const summaryId = await memory.shortTerm.store(
    {
      topic: 'Quantum Computing',
      userQuestions: ['What is a qubit?', 'How does superposition work?'],
      timestamp: Date.now()
    },
    {
      agentId: 'ai-assistant',
      tags: ['conversation', 'quantum', 'session-123'],
      importance: 0.6
    }
  );

  const sessionNoteId = await memory.shortTerm.store(
    'User showed interest in quantum applications',
    {
      agentId: 'ai-assistant',
      tags: ['observation', 'user-interest'],
      importance: 0.55
    }
  );

  console.log('Short-term memory count:', await memory.shortTerm.getUsage());

  console.log('\n--- Phase 3: Long-term Memory (Persistent Knowledge) ---');
  // Store important learnings in long-term
  const knowledgeId = await memory.longTerm.store(
    {
      fact: 'User is studying quantum computing for a course',
      confidence: 0.95,
      source: 'direct conversation'
    },
    {
      agentId: 'ai-assistant',
      tags: ['user-profile', 'quantum', 'education'],
      importance: 0.85
    }
  );

  const conceptId = await memory.longTerm.store(
    {
      concept: 'Quantum superposition',
      explanation: 'A quantum system can exist in multiple states simultaneously',
      relatedTopics: ['qubits', 'entanglement', 'quantum gates']
    },
    {
      agentId: 'ai-assistant',
      tags: ['knowledge', 'quantum', 'physics'],
      importance: 0.9
    }
  );

  console.log('Long-term memories stored:', 2);

  console.log('\n--- Phase 4: Memory Consolidation ---');
  // Manual consolidation to demonstrate tier promotion
  console.log('Running consolidation...');
  const result = await memory.consolidate();
  console.log('Promoted to short-term:', result.promoted.toShortTerm);
  console.log('Promoted to long-term:', result.promoted.toLongTerm);
  console.log('Evicted from working:', result.evicted.fromWorking);

  console.log('\n--- Phase 5: Cross-tier Search ---');
  // Search across all tiers
  const quantumResults = await memory.retrieve('quantum');
  console.log(`Found ${quantumResults.length} memories matching "quantum":`);
  for (const mem of quantumResults.slice(0, 3)) {
    console.log(`  [${mem.tier}] ${mem.id}: ${JSON.stringify(mem.content).substring(0, 60)}...`);
  }

  console.log('\n--- Phase 6: Tier-Specific Access ---');
  // Access specific tiers
  const workingStats = memory.working.getStats();
  console.log('Working memory utilization:', (workingStats.utilization * 100).toFixed(1) + '%');

  const shortTermStats = memory.shortTerm.getStats();
  console.log('Short-term count:', shortTermStats.count);

  const longTermStats = memory.longTerm.getStats();
  console.log('Long-term count:', longTermStats.count);

  console.log('\n--- Statistics Summary ---');
  const stats = memory.getStats();
  console.log('Total memories:', stats.totalMemories);
  console.log('Working:', stats.working.count, '/', stats.working.maxSize);
  console.log('Short-term:', stats.shortTerm.count, '/', stats.shortTerm.maxSize);
  console.log('Long-term:', stats.longTerm.count, '/', stats.longTerm.maxSize);

  await memory.destroy();
  console.log('\n✓ Tiered storage demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  tieredStorageDemo().catch(console.error);
}

export { tieredStorageDemo };
