/**
 * Example 3: Confidence Analysis
 *
 * Demonstrates detailed confidence tracking and analysis throughout reasoning.
 * Shows how ThoughtChain maintains high confidence through verification.
 *
 * SEO Keywords:
 * - AI confidence analysis
 * - reasoning confidence score
 * - LLM reliability
 * - verification metrics
 * - confidence threshold
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function confidenceAnalysis() {
  const thoughtChain = await ThoughtChain.init({
    verifiers: 3,
    confidenceThreshold: 0.85,
    backtrackOnLowConfidence: true,
  });

  const query = 'Calculate the compound interest on $10,000 at 5% for 3 years';

  const result = await thoughtChain.reason(query, {
    steps: 5,
    onStepComplete: (step) => {
      console.log(`\nStep ${step.step} Confidence Analysis:`);
      console.log(`  Raw confidence: ${(step.confidence * 100).toFixed(1)}%`);
      console.log(`  Verifier votes: [${step.verifierVotes.join(', ')}]`);
      console.log(`  Above threshold: ${step.confidence >= 0.85 ? '✓' : '✗'}`);

      if (step.confidence < 0.85) {
        console.log(`  ⚠️  Low confidence detected - triggering backtracking`);
      }
    },
  });

  // Overall confidence metrics
  console.log('\n=== Overall Confidence Metrics ===');
  console.log(`Average confidence: ${(result.reasoning.reduce((sum, s) => sum + s.confidence, 0) / result.reasoning.length * 100).toFixed(1)}%`);
  console.log(`Minimum confidence: ${(Math.min(...result.reasoning.map(s => s.confidence)) * 100).toFixed(1)}%`);
  console.log(`Maximum confidence: ${(Math.max(...result.reasoning.map(s => s.confidence)) * 100).toFixed(1)}%`);
  console.log(`Confidence variance: ${calculateVariance(result.reasoning.map(s => s.confidence)).toFixed(4)}`);

  function calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

// Key features:
// - Step-by-step confidence tracking
// - Verifier vote analysis
// - Confidence threshold enforcement
// - Statistical metrics
