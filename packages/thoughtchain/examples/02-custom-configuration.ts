/**
 * Example 2: Custom Configuration
 *
 * Demonstrates various configuration options and their effects.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';

async function customConfiguration() {
  console.log('=== ThoughtChain Custom Configuration ===\n');

  const verifiers = createMockVerifiers(5); // Use more verifiers

  // Create ThoughtChain with custom configuration
  const tc = new ThoughtChain(verifiers, {
    steps: 7, // More reasoning steps
    verifiers: 5, // More verifiers
    confidenceThreshold: 0.95, // Higher threshold
    backtrackOnLowConfidence: true,
    maxBacktrackAttempts: 5, // More attempts
    explainReasoning: true,
    timeout: 45000, // Longer timeout
    aggregationStrategy: 'confidence-weighted', // Different strategy

    // Progress callback
    onProgress: (progress) => {
      if (progress.status === 'verifying') {
        console.log(`[Progress] ${progress.currentStepDescription}`);
      }
    },

    // Step complete callback
    onStepComplete: (step) => {
      console.log(`[Step ${step.step}] Completed with confidence: ${(step.confidence * 100).toFixed(1)}%`);
    },

    // Backtrack callback
    onBacktrack: (event) => {
      console.log(
        `[Backtrack] Step ${event.step} - ${event.strategy} ` +
        `(${event.originalConfidence.toFixed(2)} → ${event.newConfidence.toFixed(2)})`
      );
    },
  });

  // Test with a complex query
  const query =
    'Analyze the historical, economic, and cultural factors that contributed to ' +
    'the Renaissance, and explain its lasting impact on modern society.';

  console.log(`Query: ${query}\n`);

  const startTime = Date.now();
  const result = await tc.reason(query);
  const duration = Date.now() - startTime;

  // Detailed analysis
  console.log('\n=== Performance Analysis ===');
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Average Time per Step: ${(duration / result.stepsCompleted).toFixed(0)}ms`);
  console.log(`Average Confidence: ${
    (result.reasoning.reduce((sum, s) => sum + s.confidence, 0) / result.reasoning.length * 100).toFixed(1)
  }%`);
  console.log(`Backtracking Rate: ${(result.stepsBacktracked / result.stepsCompleted * 100).toFixed(1)}%`);

  // Token efficiency
  if (result.tokens.total > 0) {
    const confidencePerToken = result.overallConfidence / result.tokens.total;
    console.log(`Token Efficiency: ${(confidencePerToken * 1000).toFixed(4)} confidence per 1K tokens`);
  }

  // Verifier agreement analysis
  console.log('\n=== Verifier Agreement Analysis ===');
  let totalAgreement = 0;
  for (const step of result.reasoning) {
    const avgVote = step.verifierVotes.reduce((a, b) => a + b, 0) / step.verifierVotes.length;
    const variance = step.verifierVotes.reduce((sum, v) => sum + Math.pow(v - avgVote, 2), 0) / step.verifierVotes.length;
    const agreementRate = 1 - variance; // Lower variance = higher agreement
    totalAgreement += agreementRate;

    console.log(`Step ${step.step}: ${(agreementRate * 100).toFixed(1)}% agreement`);
  }
  console.log(`Average Agreement: ${(totalAgreement / result.reasoning.length * 100).toFixed(1)}%`);

  // Success criteria check
  console.log('\n=== Success Criteria ===');
  const successChecks = {
    'Overall Confidence ≥ 95%': result.overallConfidence >= 0.95,
    'All steps ≥ 90% confidence': result.reasoning.every(s => s.confidence >= 0.90),
    'Backtracking improved results': result.backtrackingEvents.some(
      e => e.newConfidence > e.originalConfidence
    ),
    'Completed all planned steps': result.stepsCompleted >= 7,
    'No critical errors': result.success,
  };

  for (const [check, passed] of Object.entries(successChecks)) {
    console.log(`${passed ? '✓' : '✗'} ${check}`);
  }

  const allPassed = Object.values(successChecks).every(v => v);
  console.log(`\nOverall: ${allPassed ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED'}`);
}

// Run the example
customConfiguration().catch(console.error);
