/**
 * Example 6: Importance Scoring
 *
 * Demonstrates how importance scores determine memory retention:
 * - Manual importance assignment
 * - Automatic importance calculation
 * - Importance-based consolidation decisions
 *
 * @module examples/importance-scoring
 */

import { MemoryPalace, MemoryTier } from '../src/index.js';

async function importanceScoringDemo() {
  console.log('=== MemoryPalace: Importance Scoring Demo ===\n');

  const memory = new MemoryPalace({
    consolidation: {
      workingToShortTermThreshold: 0.5,
      shortToLongTermThreshold: 0.75,
      workingMaxSize: 15,
      shortTermMaxSize: 200,
      longTermMaxSize: 1000
    }
  });

  console.log('1. Storing memories with different importance levels:\n');

  // Very low importance - will be evicted first
  memory.working.set('temp1', 'Temporary scratch note', { importance: 0.1 });
  console.log('  [0.10] Temporary scratch note');

  // Low importance
  memory.working.set('low1', 'Minor observation', { importance: 0.25 });
  console.log('  [0.25] Minor observation');

  // Below promotion threshold
  memory.working.set('med1', 'Somewhat useful info', { importance: 0.45 });
  console.log('  [0.45] Somewhat useful info');

  // At promotion threshold to short-term
  memory.working.set('promote1', 'Worth remembering for a while', { importance: 0.5 });
  console.log('  [0.50] Worth remembering (promotes to short-term)');

  // Good importance
  memory.working.set('good1', 'Useful information', { importance: 0.65 });
  console.log('  [0.65] Useful information');

  // High importance
  memory.working.set('high1', 'Important fact', { importance: 0.8 });
  console.log('  [0.80] Important fact');

  // Critical importance - will definitely persist
  memory.working.set('critical1', 'Essential knowledge', { importance: 0.95 });
  console.log('  [0.95] Essential knowledge');

  console.log('\n2. Current working memory:\n');

  const allWorking = memory.working.getByImportance();
  console.log('  Memories sorted by importance:');
  for (const mem of allWorking) {
    console.log(`    [${mem.importance.toFixed(2)}] ${mem.content}`);
  }

  console.log('\n3. Demonstrating importance updates:\n');

  // Boost importance of a memory
  const key = 'med1';
  console.log(`  Original importance of "${key}": ${memory.working.getMemory(key)?.importance.toFixed(2)}`);
  memory.working.updateImportance(key, 0.7);
  console.log(`  Updated importance: ${memory.working.getMemory(key)?.importance.toFixed(2)}`);

  // Add tags to increase contextual importance
  memory.working.addTags('high1', ['urgent', 'user-requested']);
  const updatedMem = memory.working.getMemory('high1');
  console.log(`  Added tags to "high1": ${updatedMem?.tags.join(', ')}`);

  console.log('\n4. Running consolidation to see promotion decisions:\n');

  const result = await memory.consolidate();
  console.log(`  Promoted to short-term: ${result.promoted.toShortTerm}`);
  console.log(`  Promoted to long-term: ${result.promoted.toLongTerm}`);
  console.log(`  Evicted from working: ${result.evicted.fromWorking}`);

  console.log('\n5. What remains in working memory:\n');

  const remainingWorking = memory.working.getAll();
  if (remainingWorking.length === 0) {
    console.log('  Working memory is now empty (all promoted or evicted)');
  } else {
    for (const mem of remainingWorking) {
      console.log(`    [${mem.importance.toFixed(2)}] ${mem.content}`);
    }
  }

  console.log('\n6. Storing in short-term with different importance:\n');

  await memory.shortTerm.store(
    'Conversation about preferences',
    { userLikes: 'technical content', complexity: 'high' },
    { importance: 0.55, tags: ['user-profile'] }
  );
  console.log('  [0.55] User preference data (below long-term threshold)');

  await memory.shortTerm.store(
    'Important milestone: User subscribed',
    { date: Date.now(), plan: 'premium' },
    { importance: 0.8, tags: ['milestone', 'subscription'] }
  );
  console.log('  [0.80] Subscription event (above long-term threshold)');

  await memory.shortTerm.store(
    'Bug report: Critical issue found',
    { issue: 'security', severity: 'critical' },
    { importance: 0.95, tags: ['bug', 'security'] }
  );
  console.log('  [0.95] Critical bug report (definitely long-term)');

  console.log('\n7. Consolidating again to promote from short-term:\n');

  const result2 = await memory.consolidate();
  console.log(`  Promoted to short-term: ${result2.promoted.toShortTerm}`);
  console.log(`  Promoted to long-term: ${result2.promoted.toLongTerm}`);

  console.log('\n8. Final tier distribution:\n');

  const stats = memory.getStats();
  console.log(`  Working: ${stats.working.count} memories`);
  console.log(`  Short-term: ${stats.shortTerm.count} memories`);
  console.log(`  Long-term: ${stats.longTerm.count} memories`);

  console.log('\n9. Retrieving by importance thresholds:\n');

  // Get important memories across all tiers
  const veryImportant = await memory.getImportant(0.8);
  console.log(`  Memories with importance >= 0.8:`);
  for (const mem of veryImportant) {
    console.log(`    [${mem.tier}] [${mem.importance.toFixed(2)}] ${JSON.stringify(mem.content).substring(0, 50)}...`);
  }

  await memory.destroy();
  console.log('\n✓ Importance scoring demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  importanceScoringDemo().catch(console.error);
}

export { importanceScoringDemo };
