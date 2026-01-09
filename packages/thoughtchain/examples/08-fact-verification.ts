/**
 * Example 8: Fact Verification
 *
 * Demonstrates using ThoughtChain to verify factual claims and detect misinformation.
 * Shows ensemble verification for accuracy.
 *
 * SEO Keywords:
 * - AI fact checking
 * - misinformation detection
 * - claim verification
 * - factual accuracy
 * - ensemble verification
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function factVerification() {
  const factChecker = await ThoughtChain.init({
    verifiers: 7, // More verifiers for fact-checking
    confidenceThreshold: 0.93,
    aggregationStrategy: 'voting', // Require majority agreement
    steps: 8,
  });

  const claims = [
    'The Earth is flat',
    'Water boils at 100°C at sea level',
    'The moon is made of cheese',
    'Humans share 98% of their DNA with chimpanzees',
  ];

  console.log('🔍 FACT CHECKING SERVICE\n');

  for (const claim of claims) {
    console.log(`\nClaim: "${claim}"`);

    const result = await factChecker.reason(`Verify this claim: ${claim}`, {
      steps: 5,
      onProgress: (progress) => {
        process.stdout.write('.');
      },
    });

    console.log('\n---');
    console.log(`Verdict: ${result.overallConfidence > 0.9 ? '✅ TRUE' : result.overallConfidence < 0.3 ? '❌ FALSE' : '⚠️  UNCERTAIN'}`);
    console.log(`Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`Verifier agreement: ${calculateAgreement(result.reasoning)}`);

    // Show reasoning
    result.reasoning.forEach((step) => {
      console.log(`  - ${step.thought.substring(0, 80)}...`);
    });
  }

  function calculateAgreement(steps: any[]): string {
    const avgAgreement = steps.reduce((sum, step) => {
      return sum + (step.verifierVotes.filter((v: number) => v === 1).length / step.verifierVotes.length);
    }, 0) / steps.length;

    return `${(avgAgreement * 100).toFixed(1)}%`;
  }
}

// Example output:
// Claim: "The Earth is flat"
// .....
// ---
// Verdict: ❌ FALSE
// Confidence: 12.3%
// Verifier agreement: 100%
//   - The claim contradicts overwhelming scientific evidence from astronomy...
//   - Satellite imagery, GPS systems, and circumnavigation all prove...
//   - Ancient Greek astronomers calculated Earth's curvature over 2000...

// Key features:
// - Fact verification
// - Misinformation detection
// - High verifier count
// - Majority voting
// - Clear verdicts
