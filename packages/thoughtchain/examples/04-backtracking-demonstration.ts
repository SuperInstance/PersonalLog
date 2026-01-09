/**
 * Example 4: Backtracking Demonstration
 *
 * Demonstrates automatic backtracking when low confidence is detected.
 * Shows how ThoughtChain self-corrects reasoning errors.
 *
 * SEO Keywords:
 * - automatic backtracking
 * - AI self-correction
 * - reasoning error recovery
 * - LLM backtracking
 * - error correction
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function backtrackingDemonstration() {
  const thoughtChain = await ThoughtChain.init({
    verifiers: 3,
    confidenceThreshold: 0.90,
    backtrackOnLowConfidence: true,
    maxBacktrackAttempts: 3,
  });

  const query = 'Solve: If 3x + 7 = 22, what is x?';

  const result = await thoughtChain.reason(query, {
    steps: 4,
    onBacktrack: (event) => {
      console.log(`\n⚠️  Backtracking event detected:`);
      console.log(`  Step: ${event.step}`);
      console.log(`  Original confidence: ${(event.originalConfidence * 100).toFixed(1)}%`);
      console.log(`  Attempt: ${event.attempt}`);
      console.log(`  Strategy: ${event.strategy}`);
      console.log(`  Reason: ${event.reason}`);
      console.log(`  New confidence: ${(event.newConfidence * 100).toFixed(1)}%`);
    },
  });

  console.log('\n=== Backtracking Summary ===');
  console.log(`Total backtracking events: ${result.backtrackingEvents.length}`);
  console.log(`Steps backtracked: ${result.stepsBacktracked}`);
  console.log(`Steps completed: ${result.stepsCompleted}`);
  console.log(`Success rate: ${((result.stepsCompleted / (result.stepsCompleted + result.stepsBacktracked)) * 100).toFixed(1)}%`);

  // Example output:
  // ⚠️  Backtracking event detected:
  //   Step: 2
  //   Original confidence: 65.3%
  //   Attempt: 1
  //   Strategy: more-verbatim
  //   Reason: Low confidence in initial attempt
  //   New confidence: 88.7%
}

// Key features:
// - Automatic error detection
// - Multiple retry strategies
// - Confidence improvement tracking
// - Self-correction demonstration
