/**
 * Basic Usage Example
 *
 * Getting started with Proactive Planning AI Hub
 */

import { IntelligenceHub, getProactiveEngine } from '../index';

async function main() {
  console.log('=== Proactive Planning AI Hub - Basic Usage ===\n');

  // 1. Initialize the Intelligence Hub
  console.log('1. Initializing Intelligence Hub...');
  const hub = new IntelligenceHub();
  await hub.initialize({
    enabled: true,
    level: 'full',
    proactive: {
      enabled: true,
      aggressiveness: 'moderate',
      autoActivate: false,
    },
  });
  console.log('✓ Hub initialized\n');

  // 2. Start the Proactive Engine
  console.log('2. Starting Proactive Engine...');
  const proactiveEngine = getProactiveEngine();
  proactiveEngine.start();
  console.log('✓ Proactive engine started\n');

  // 3. Evaluate proactive actions
  console.log('3. Evaluating proactive actions...');
  const suggestions = await proactiveEngine.evaluateProactiveActions(
    'conversation-123',
    'How do I implement a React component with TypeScript?',
    ['assistant']
  );

  console.log(`Found ${suggestions.length} proactive suggestions:`);
  for (const suggestion of suggestions) {
    console.log(`  - Agent: ${suggestion.agentId}`);
    console.log(`    Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`    Reason: ${suggestion.reason}`);
    console.log(`    Benefit: ${suggestion.expectedBenefit}`);
  }
  console.log();

  // 4. Get statistics
  console.log('4. Getting statistics...');
  const stats = proactiveEngine.getStatistics();
  console.log(`Total suggestions: ${stats.totalSuggestions}`);
  console.log(`Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(0)}%`);
  console.log();

  // 5. Get system health
  console.log('5. Getting system health...');
  const health = await hub.getSystemHealth();
  console.log(`System status: ${health.status}`);
  console.log(`Active conflicts: ${health.conflicts.length}`);
  console.log(`Bottlenecks: ${health.bottlenecks.length}`);
  console.log(`Recommendations: ${health.recommendations.length}`);
  console.log();

  // 6. Shutdown
  console.log('6. Shutting down...');
  proactiveEngine.stop();
  await hub.shutdown();
  console.log('✓ Shutdown complete\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
