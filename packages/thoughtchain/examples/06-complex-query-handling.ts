/**
 * Example 6: Complex Query Handling
 *
 * Demonstrates handling complex multi-faceted queries with many reasoning steps.
 * Shows scalability to challenging problems.
 *
 * SEO Keywords:
 * - complex AI reasoning
 * - multi-step problem solving
 * - advanced chain-of-thought
 * - scalable reasoning
 * - deep reasoning
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function complexQueryHandling() {
  const thoughtChain = await ThoughtChain.init({
    verifiers: 5,
    steps: 10,
    confidenceThreshold: 0.92,
    maxBacktrackAttempts: 3,
  });

  const query = `
    Analyze the potential economic, social, and environmental impacts of
    transitioning to 100% renewable energy by 2050, considering both
    opportunities and challenges.
  `;

  console.log('Processing complex query...\n');

  const result = await thoughtChain.reason(query, {
    steps: 12,
    showIntermediateResults: true,
    onProgress: (progress) => {
      const bar = '█'.repeat(Math.floor(progress.percentage / 5)) +
                  '░'.repeat(20 - Math.floor(progress.percentage / 5));
      console.log(`\r[${bar}] ${(progress.percentage).toFixed(1)}% - ${progress.status}`);
    },
  });

  console.log('\n\n=== Reasoning Breakdown ===');

  // Group reasoning by topic
  const economicSteps = result.reasoning.filter(s =>
    s.thought.toLowerCase().includes('economic') ||
    s.thought.toLowerCase().includes('cost') ||
    s.thought.toLowerCase().includes('financial')
  );

  const socialSteps = result.reasoning.filter(s =>
    s.thought.toLowerCase().includes('social') ||
    s.thought.toLowerCase().includes('society') ||
    s.thought.toLowerCase().includes('people')
  );

  const environmentalSteps = result.reasoning.filter(s =>
    s.thought.toLowerCase().includes('environment') ||
    s.thought.toLowerCase().includes('climate') ||
    s.thought.toLowerCase().includes('emission')
  );

  console.log(`\nEconomic analysis: ${economicSteps.length} steps`);
  console.log(`Social analysis: ${socialSteps.length} steps`);
  console.log(`Environmental analysis: ${environmentalSteps.length} steps`);

  console.log(`\nTotal reasoning steps: ${result.reasoning.length}`);
  console.log(`Backtracking events: ${result.backtrackingEvents.length}`);
  console.log(`Overall confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log(`Processing time: ${(result.duration / 1000).toFixed(2)}s`);
}

// Key features:
// - Complex query decomposition
// - Multi-dimensional analysis
// - 12+ reasoning steps
// - Progress visualization
// - Detailed metrics
