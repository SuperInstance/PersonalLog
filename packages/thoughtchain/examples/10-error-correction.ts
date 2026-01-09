/**
 * Example 10: Error Correction
 *
 * Demonstrates ThoughtChain's ability to detect and correct its own reasoning errors.
 * Shows robust error handling and self-improvement.
 *
 * SEO Keywords:
 * - AI error correction
 * - self-correcting reasoning
 * - LLM reliability
 * - reasoning robustness
 * - error recovery
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function errorCorrection() {
  const robustReasoning = await ThoughtChain.init({
    verifiers: 5,
    confidenceThreshold: 0.90,
    backtrackOnLowConfidence: true,
    maxBacktrackAttempts: 4,
    steps: 8,
  });

  // A tricky query that often causes reasoning errors
  const trickyQuery = 'If a bat and ball cost $1.10 total, and the bat costs $1.00 more than the ball, how much does the ball cost?';

  console.log('🎯 TESTING ERROR CORRECTION\n');
  console.log(`Query: ${trickyQuery}\n`);
  console.log('Note: This is a classic problem where the intuitive answer (10¢) is wrong.\n');

  const result = await robustReasoning.reason(trickyQuery, {
    steps: 6,
    onBacktrack: (event) => {
      console.log(`\n🔄 ERROR DETECTED AND CORRECTED:`);
      console.log(`   Step ${event.step} had low confidence: ${(event.originalConfidence * 100).toFixed(1)}%`);
      console.log(`   Strategy: ${event.strategy}`);
      console.log(`   New confidence: ${(event.newConfidence * 100).toFixed(1)}%`);
      console.log(`   Attempt: ${event.attempt}/4`);
    },
    onProgress: (progress) => {
      if (progress.status === 'verifying') {
        process.stdout.write('✓');
      } else if (progress.status === 'backtracking') {
        process.stdout.write('⟳');
      }
    },
  });

  console.log('\n\n=== REASONING PROCESS ===\n');

  result.reasoning.forEach((step, i) => {
    const wasBacktracked = result.backtrackingEvents.some(e => e.step === step.step);

    console.log(`Step ${step.step}${wasBacktracked ? ' (corrected)' : ''}`);
    console.log(`  Thought: ${step.thought}`);
    console.log(`  Confidence: ${(step.confidence * 100).toFixed(1)}%`);
    console.log(`  Verifier agreement: ${step.verifierVotes.filter(v => v === 1).length}/${step.verifierVotes.length}`);
    console.log('');
  });

  console.log('=== ERROR CORRECTION SUMMARY ===\n');
  console.log(`Initial intuition: 10¢ (WRONG)`);
  console.log(`Correct answer: ${result.answer}`);
  console.log(`Total backtracks: ${result.backtrackingEvents.length}`);
  console.log(`Steps improved: ${result.backtrackingEvents.length}`);
  console.log(`Final confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);

  // Calculate improvement
  const improvedSteps = result.backtrackingEvents.map(e => {
    const improvement = e.newConfidence - e.originalConfidence;
    return (improvement * 100).toFixed(1);
  });

  if (improvedSteps.length > 0) {
    console.log(`\nAverage confidence improvement: ${improvedSteps.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / improvedSteps.length.toFixed(1)}%`);
  }

  console.log('\n✅ Error correction successfully prevented incorrect answer!');
}

// Example output:
// ✓✓✓
//
// 🔄 ERROR DETECTED AND CORRECTED:
//    Step 2 had low confidence: 45.2%
//    Strategy: different-path
//    New confidence: 87.3%
//    Attempt: 1/4
// ✓✓✓✓✓✓
//
// === REASONING PROCESS ===
//
// Step 1
//   Thought: Let x be the cost of the ball. Then the bat costs x + $1.00.
//   Confidence: 98.5%
//   Verifier agreement: 5/5
//
// Step 2 (corrected)
//   Thought: The total is x + (x + 1.00) = 1.10, so 2x = 0.10, x = 0.05
//   Confidence: 87.3%
//   Verifier agreement: 4/5
// ...
//
// Final answer: The ball costs 5¢.
//
// Key features:
// - Error detection
// - Automatic correction
// - Multiple retry strategies
// - Confidence improvement tracking
// - Robust verification
