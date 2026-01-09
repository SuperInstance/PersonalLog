/**
 * Example 4: Automatic Consolidation
 *
 * Demonstrates the automatic memory consolidation process:
 * - Importance-based promotion between tiers
 * - Automatic eviction of low-importance memories
 * - Configurable consolidation intervals
 *
 * @module examples/automatic-consolidation
 */

import { MemoryPalace, MemoryTier } from '../src/index.js';

async function automaticConsolidationDemo() {
  console.log('=== MemoryPalace: Automatic Consolidation Demo ===\n');

  // Configure with low thresholds to trigger consolidation quickly
  const memory = new MemoryPalace({
    consolidation: {
      workingToShortTermThreshold: 0.5,  // Promote to short-term at 0.5
      shortToLongTermThreshold: 0.7,     // Promote to long-term at 0.7
      workingMaxSize: 10,                // Small working memory
      shortTermMaxSize: 100,
      longTermMaxSize: 1000,
      consolidationInterval: 10000       // 10 seconds for demo
    }
  });

  // Listen to consolidation events
  memory.on('consolidation:started', () => {
    console.log('\n[Event] Consolidation started...');
  });

  memory.on('consolidation:completed', (result) => {
    console.log('[Event] Consolidation completed:');
    console.log(`  Promoted to short-term: ${result.promoted.toShortTerm}`);
    console.log(`  Promoted to long-term: ${result.promoted.toLongTerm}`);
    console.log(`  Evicted from working: ${result.evicted.fromWorking}`);
    console.log(`  Duration: ${result.duration}ms`);
  });

  memory.on('memory:evicted', (data) => {
    console.log(`[Event] Memory evicted from ${data.tier}: ${data.memoryId}`);
  });

  console.log('1. Filling Working Memory with varied importance:\n');

  // Add memories with different importance levels
  const workingMemories = [
    { key: 'temp1', value: 'Low importance note', importance: 0.2 },
    { key: 'temp2', value: 'Another low importance', importance: 0.3 },
    { key: 'task1', value: 'Current task', importance: 0.4 },
    { key: 'context1', value: 'Active context', importance: 0.45 },
    { key: 'note1', value: 'Moderately important', importance: 0.5 },  // Will promote
    { key: 'note2', value: 'Should be remembered', importance: 0.6 },  // Will promote
    { key: 'important1', value: 'Important fact', importance: 0.7 },    // Will promote
    { key: 'important2', value: 'Very important', importance: 0.8 },    // Will promote
    { key: 'critical1', value: 'Critical info', importance: 0.9 },
    { key: 'critical2', value: 'Essential knowledge', importance: 0.95 },
    { key: 'overflow1', value: 'This should trigger eviction', importance: 0.1 }
  ];

  for (const mem of workingMemories) {
    memory.working.set(mem.key, mem.value, { importance: mem.importance });
    console.log(`  Added: ${mem.key} (importance: ${mem.importance})`);
  }

  console.log(`\n2. Working memory size: ${memory.working.size()} / ${memory.working.getMaxSize()}`);
  console.log('   Auto-eviction triggered when over capacity.\n');

  // Manual consolidation to see immediate effects
  console.log('3. Running manual consolidation...\n');
  const result = await memory.consolidate();

  console.log('Consolidation Results:');
  console.log(`  Promoted to short-term: ${result.promoted.toShortTerm}`);
  console.log(`  Promoted to long-term: ${result.promoted.toLongTerm}`);
  console.log(`  Evicted from working: ${result.evicted.fromWorking}`);
  console.log(`  Evicted from short-term: ${result.evicted.fromShortTerm}`);

  console.log('\n4. Checking tier distribution after consolidation:\n');

  const workingCount = memory.working.size();
  const shortTermCount = await memory.shortTerm.getUsage();
  const longTermCount = memory.longTerm.getUsage();

  console.log(`  Working: ${workingCount} memories`);
  console.log(`  Short-term: ${shortTermCount} memories`);
  console.log(`  Long-term: ${longTermCount} memories`);

  // Show what remains in working memory
  console.log('\n5. Remaining in Working Memory:');
  for (const mem of memory.working.getAll()) {
    console.log(`  - ${mem.id}: ${mem.content} (importance: ${mem.importance})`);
  }

  // Add more to trigger automatic eviction
  console.log('\n6. Adding more memories to test auto-eviction:\n');

  for (let i = 0; i < 5; i++) {
    memory.working.set(`overflow${i + 2}`, `Overflow ${i + 2}`, { importance: 0.15 });
  }

  console.log(`  Working memory size after adding: ${memory.working.size()}`);
  console.log('  Low-importance memories automatically evicted!\n');

  // Demonstrate importance decay over time
  console.log('7. Demonstrating importance-based retention:\n');

  const highImportanceMem = {
    key: 'persistent',
    value: 'This should persist due to high importance',
    importance: 0.9
  };

  memory.working.set(highImportanceMem.key, highImportanceMem.value, {
    importance: highImportanceMem.importance
  });

  // Add low importance items
  for (let i = 0; i < 10; i++) {
    memory.working.set(`low${i}`, `Low importance ${i}`, { importance: 0.2 });
  }

  console.log('  After filling with low-importance items:');
  console.log(`    High importance still present: ${memory.working.has('persistent')}`);
  console.log(`    Working memory size: ${memory.working.size()}`);

  // Final statistics
  console.log('\n8. Final Statistics:\n');
  const stats = memory.getStats();
  console.log(`  Total memories: ${stats.totalMemories}`);
  console.log(`  Working utilization: ${(stats.working.utilization * 100).toFixed(1)}%`);
  console.log(`  Short-term utilization: ${(stats.shortTerm.utilization * 100).toFixed(1)}%`);
  console.log(`  Long-term utilization: ${(stats.longTerm.utilization * 100).toFixed(1)}%`);

  await memory.destroy();
  console.log('\n✓ Automatic consolidation demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  automaticConsolidationDemo().catch(console.error);
}

export { automaticConsolidationDemo };
