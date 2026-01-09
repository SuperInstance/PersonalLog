/**
 * Example 8: Transparency and Debugging
 *
 * Demonstrates how ThoughtChain provides transparent reasoning for debugging and analysis.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';

async function transparencyAndDebugging() {
  console.log('=== Transparency and Debugging ===\n');

  const verifiers = createMockVerifiers(3);
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.90,
    backtrackOnLowConfidence: true,
    explainReasoning: true,
  });

  const query = 'Why do birds migrate south for the winter?';
  console.log(`Query: ${query}\n`);

  const result = await tc.reason(query);

  // Full reasoning chain
  console.log('=== Complete Reasoning Chain ===\n');

  for (const step of result.reasoning) {
    console.log(`Step ${step.step}`);
    console.log(`─`.repeat(80));
    console.log(`Question: ${step.subQuestion}`);
    console.log(`\nThought Process:`);
    console.log(`  ${step.thought}`);
    console.log(`\nConfidence Analysis:`);
    console.log(`  Overall: ${(step.confidence * 100).toFixed(1)}%`);

    if (step.verifierVotes && step.verifierVotes.length > 0) {
      console.log(`  Individual Verifiers:`);
      step.verifierVotes.forEach((vote, i) => {
        console.log(`    Verifier ${i + 1}: ${(vote * 100).toFixed(1)}%`);
      });

      const avgVote = step.verifierVotes.reduce((a, b) => a + b, 0) / step.verifierVotes.length;
      const variance = step.verifierVotes.reduce((sum, v) => sum + Math.pow(v - avgVote, 2), 0) / step.verifierVotes.length;
      console.log(`  Variance: ${variance.toFixed(4)} (lower = more agreement)`);
    }

    if (step.dependencies && step.dependencies.length > 0) {
      console.log(`\nDependencies: Steps [${step.dependencies.join(', ')}]`);
    }

    if (step.alternatives && step.alternatives.length > 0) {
      console.log(`\nAlternatives Considered:`);
      step.alternatives.forEach((alt, i) => {
        console.log(`  ${i + 1}. ${alt.thought.substring(0, 100)}... (${(alt.confidence * 100).toFixed(1)}%)`);
        console.log(`     Reason: ${alt.reason}`);
      });
    }

    if (step.timing) {
      console.log(`\nTiming:`);
      console.log(`  Duration: ${step.timing.duration}ms`);
      console.log(`  Started: ${new Date(step.timing.started).toISOString()}`);
      console.log(`  Completed: ${new Date(step.timing.completed).toISOString()}`);
    }

    if (step.tokens) {
      console.log(`\nToken Usage:`);
      console.log(`  Input: ${step.tokens.input}, Output: ${step.tokens.output}, Total: ${step.tokens.total}`);
    }

    console.log();
  }

  // Backtracking analysis
  if (result.backtrackingEvents.length > 0) {
    console.log('=== Backtracking Analysis ===\n');

    for (const event of result.backtrackingEvents) {
      console.log(`Step ${event.step} - Attempt ${event.attempt}`);
      console.log(`─`.repeat(80));
      console.log(`Trigger: ${event.reason}`);
      console.log(`Strategy: ${event.strategy}`);
      console.log(`Original Confidence: ${(event.originalConfidence * 100).toFixed(1)}%`);
      console.log(`New Confidence: ${(event.newConfidence * 100).toFixed(1)}%`);
      console.log(`Improvement: ${((event.newConfidence - event.originalConfidence) * 100).toFixed(1)}%`);
      console.log(`\nOriginal Thought:`);
      console.log(`  ${result.reasoning[event.step - 1]?.thought.substring(0, 150)}...`);
      console.log(`\nNew Thought:`);
      console.log(`  ${event.newThought.substring(0, 150)}...`);
      console.log();
    }
  }

  // Verifier disagreement analysis
  console.log('=== Verifier Disagreement Analysis ===\n');

  let totalDisagreements = 0;
  const stepDisagreements: Array<{ step: number; disagreement: number }> = [];

  for (const step of result.reasoning) {
    if (step.verifierVotes && step.verifierVotes.length >= 2) {
      const avg = step.verifierVotes.reduce((a, b) => a + b, 0) / step.verifierVotes.length;
      const variance = step.verifierVotes.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / step.verifierVotes.length;
      const disagreement = variance;

      stepDisagreements.push({ step: step.step, disagreement });

      if (disagreement > 0.01) {
        totalDisagreements++;
        console.log(`Step ${step.step}: High disagreement (${(disagreement * 100).toFixed(2)}% variance)`);
        console.log(`  Votes: [${step.verifierVotes.map(v => (v * 100).toFixed(1)).join(', ')}%]`);
        console.log(`  → Indicates ambiguity or complexity in this step`);
      }
    }
  }

  if (totalDisagreements === 0) {
    console.log('✓ All verifiers were in agreement');
  } else {
    console.log(`\nTotal steps with high disagreement: ${totalDisagreements}/${result.reasoning.length}`);
  }

  // Confidence trajectory
  console.log('\n=== Confidence Trajectory ===\n');

  const trajectory = result.reasoning.map(s => ({ step: s.step, confidence: s.confidence }));
  console.log('Step | Confidence | Change');
  console.log('─────┼────────────┼───────');

  let prevConfidence = 0;
  for (const point of trajectory) {
    const change = point.confidence - prevConfidence;
    const changeStr = change >= 0 ? `+${(change * 100).toFixed(1)}%` : `${(change * 100).toFixed(1)}%`;
    console.log(`${point.step.toString().padStart(4)} | ${(point.confidence * 100).toFixed(1).padStart(9)}% | ${changeStr.padStart(6)}`);
    prevConfidence = point.confidence;
  }

  // Final explanation
  console.log('\n=== Final Explanation ===\n');
  console.log(result.explanation);

  // Debugging insights
  console.log('\n=== Debugging Insights ===\n');
  console.log('This transparent view allows you to:');
  console.log('✓ Verify each reasoning step');
  console.log('✓ Identify where the model is uncertain');
  console.log('✓ See how backtracking improved results');
  console.log('✓ Understand verifier disagreements');
  console.log('✓ Track confidence trajectory');
  console.log('✓ Debug issues in the reasoning process');
  console.log('\nThis level of transparency is crucial for:');
  console.log('• Production debugging');
  console.log('• Model interpretability');
  console.log('• Regulatory compliance');
  console.log('• User trust and adoption');
}

// Run the example
transparencyAndDebugging().catch(console.error);
