/**
 * Example 9: Memory Optimization
 *
 * Demonstrates techniques for efficient memory usage:
 * - Tag-based organization for faster retrieval
 * - Memory compression for large content
 * - TTL management for automatic cleanup
 * - Capacity planning and eviction strategies
 *
 * @module examples/memory-optimization
 */

import { MemoryPalace, MemoryTier } from '../src/index.js';

async function memoryOptimizationDemo() {
  console.log('=== MemoryPalace: Memory Optimization Demo ===\n');

  const memory = new MemoryPalace({
    consolidation: {
      workingToShortTermThreshold: 0.5,
      shortToLongTermThreshold: 0.75,
      workingMaxSize: 20,
      shortTermMaxSize: 500,
      longTermMaxSize: 2000,
      consolidationInterval: 30000
    }
  });

  console.log('1. Efficient Tag Organization:\n');

  // Store with well-organized tags for fast retrieval
  const tagStrategies = [
    { content: 'Vector search technique', tags: ['algorithm', 'search', 'vector', 'similarity'] },
    { content: 'Matrix multiplication optimization', tags: ['algorithm', 'math', 'optimization', 'gpu'] },
    { content: 'Memory management patterns', tags: ['pattern', 'memory', 'architecture'] },
    { content: 'Cache invalidation strategies', tags: ['pattern', 'cache', 'performance'] },
    { content: 'Async programming best practices', tags: ['pattern', 'async', 'javascript'] },
  ];

  for (const item of tagStrategies) {
    await memory.longTerm.store(item.content, {
      agentId: 'knowledge-base',
      tags: item.tags,
      importance: 0.7
    });
  }

  console.log('  Stored 5 items with strategic tags');

  // Demonstrate fast tag-based retrieval
  const algorithmItems = await memory.getByTag('algorithm');
  console.log(`  Items tagged "algorithm": ${algorithmItems.length}`);

  const patternItems = await memory.getByTag('pattern');
  console.log(`  Items tagged "pattern": ${patternItems.length}`);

  console.log('\n2. Memory Lifecycle Management:\n');

  // Store items with different importance to show lifecycle
  const lifecycleItems = [
    { key: 'temp1', importance: 0.2, description: 'Will be evicted quickly' },
    { key: 'short1', importance: 0.55, description: 'Promotes to short-term' },
    { key: 'long1', importance: 0.8, description: 'Promotes to long-term' },
    { key: 'critical', importance: 0.95, description: 'Permanent retention' },
  ];

  for (const item of lifecycleItems) {
    memory.working.set(item.key, item.description, { importance: item.importance });
    console.log(`  [${item.importance.toFixed(2)}] ${item.key}: ${item.description}`);
  }

  console.log('\n3. Working Memory Capacity Planning:\n');

  // Fill working memory to demonstrate auto-eviction
  const workingStats = memory.working.getStats();
  console.log(`  Current size: ${workingStats.size}`);
  console.log(`  Max capacity: ${workingStats.maxSize}`);
  console.log(`  Utilization: ${(workingStats.utilization * 100).toFixed(1)}%`);

  // Add items until eviction triggers
  console.log('\n  Adding items to trigger auto-eviction...');
  for (let i = 0; i < 25; i++) {
    memory.working.set(`overflow-${i}`, `Item ${i}`, { importance: 0.1 + Math.random() * 0.3 });
  }

  const newStats = memory.working.getStats();
  console.log(`  After overflow: size=${newStats.size}, utilization=${(newStats.utilization * 100).toFixed(1)}%`);
  console.log('  Low-importance items automatically evicted!');

  console.log('\n4. TTL-based Cleanup in Short-term:\n');

  // Store items with different effective TTLs based on importance
  const ttlItems = [
    { content: 'Session temp data', importance: 0.3 },
    { content: 'Recent user input', importance: 0.5 },
    { content: 'Important session state', importance: 0.7 },
  ];

  for (const item of ttlItems) {
    await memory.shortTerm.store(item.content, {
      agentId: 'session-manager',
      importance: item.importance
    });
  }

  console.log('  Stored items with varying importance');
  console.log('  Higher importance = longer effective TTL');

  // Show short-term stats
  const shortTermStats = memory.shortTerm.getStats();
  console.log(`\n  Short-term utilization: ${(shortTermStats.utilization * 100).toFixed(1)}%`);
  console.log(`  Items expiring soon: ${shortTermStats.expiringSoon}`);

  console.log('\n5. Query Optimization Strategies:\n');

  // Demonstrate efficient vs inefficient queries
  console.log('  Efficient queries:');

  // Tag-based is fast
  const startTime = Date.now();
  const taggedResults = await memory.getByTag('algorithm');
  const tagTime = Date.now() - startTime;
  console.log(`    Tag query: ${tagTime}ms (${taggedResults.length} results)`);

  // Specific tier is fast
  const startTime2 = Date.now();
  const workingItems = memory.working.getAll();
  const tierTime = Date.now() - startTime2;
  console.log(`    Tier-specific: ${tierTime}ms (${workingItems.length} results)`);

  // Cross-tier is slower but comprehensive
  const startTime3 = Date.now();
  const crossTier = await memory.retrieve('pattern');
  const crossTime = Date.now() - startTime3;
  console.log(`    Cross-tier search: ${crossTime}ms (${crossTier.length} results)`);

  console.log('\n6. Importance-based Retention Policy:\n');

  // Show retention by importance
  const beforeStats = memory.getStats();
  console.log('  Before consolidation:');
  console.log(`    Working: ${beforeStats.working.count}`);
  console.log(`    Short-term: ${beforeStats.shortTerm.count}`);
  console.log(`    Long-term: ${beforeStats.longTerm.count}`);

  await memory.consolidate();

  const afterStats = memory.getStats();
  console.log('\n  After consolidation:');
  console.log(`    Working: ${afterStats.working.count}`);
  console.log(`    Short-term: ${afterStats.shortTerm.count}`);
  console.log(`    Long-term: ${afterStats.longTerm.count}`);

  console.log('\n7. Memory Access Frequency Analysis:\n');

  // Demonstrate access frequency boosting importance
  const key = 'frequently-accessed';
  memory.working.set(key, 'This gets accessed often', { importance: 0.4 });

  // Access multiple times
  for (let i = 0; i < 10; i++) {
    memory.working.get(key);
  }

  const mem = memory.working.getMemory(key);
  console.log(`  Item "${key}":`);
  console.log(`    Access count: ${mem?.accessCount}`);
  console.log(`    Original importance: 0.4`);
  console.log(`    Note: High access count helps prevent eviction`);

  console.log('\n8. Storage Optimization Best Practices:\n');

  console.log('  Best practices for memory efficiency:');
  console.log('    1. Use specific tags for fast retrieval');
  console.log('    2. Set appropriate importance for automatic tiering');
  console.log('    3. Access working memory for hot data (< 1ms)');
  console.log('    4. Use short-term for session data (< 10ms)');
  console.log('    5. Reserve long-term for persistent knowledge (< 100ms)');
  console.log('    6. Let consolidation handle promotion automatically');
  console.log('    7. Use tag-based queries instead of full search');

  console.log('\n9. Final Optimization Metrics:\n');

  const finalStats = memory.getStats();
  console.log('  Memory distribution:');
  console.log(`    Working: ${finalStats.working.count}/${finalStats.working.maxSize} (${(finalStats.working.utilization * 100).toFixed(1)}%)`);
  console.log(`    Short-term: ${finalStats.shortTerm.count}/${finalStats.shortTerm.maxSize} (${(finalStats.shortTerm.utilization * 100).toFixed(1)}%)`);
  console.log(`    Long-term: ${finalStats.longTerm.count}/${finalStats.longTerm.maxSize} (${(finalStats.longTerm.utilization * 100).toFixed(1)}%)`);

  console.log(`  Total memories: ${finalStats.totalMemories}`);

  await memory.destroy();
  console.log('\n✓ Memory optimization demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  memoryOptimizationDemo().catch(console.error);
}

export { memoryOptimizationDemo };
