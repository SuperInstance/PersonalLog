/**
 * Example 1: Basic Usage
 *
 * Simple example showing how to use ThoughtChain for parallel reasoning verification.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';

async function basicUsage() {
  console.log('=== ThoughtChain Basic Usage ===\n');

  // Create mock verifiers (in production, use real LLM models)
  const verifiers = createMockVerifiers(3);

  // Create ThoughtChain instance
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.90,
    backtrackOnLowConfidence: true,
    explainReasoning: true,
  });

  // Listen to progress events
  tc.on('progress', (progress) => {
    console.log(
      `Progress: ${progress.percentage}% - ${progress.status} (${progress.currentStep}/${progress.totalSteps})`
    );
  });

  // Run reasoning
  const query = "What's the capital of France and why is it historically significant?";
  console.log(`Query: ${query}\n`);

  const result = await tc.reason(query);

  // Display results
  console.log('\n=== Results ===');
  console.log(`Answer: ${result.answer}`);
  console.log(`Overall Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log(`Steps Completed: ${result.stepsCompleted}`);
  console.log(`Steps Backtracked: ${result.stepsBacktracked}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Tokens Used: ${result.tokens.total}`);

  console.log('\n=== Reasoning Chain ===');
  for (const step of result.reasoning) {
    console.log(`\nStep ${step.step}:`);
    console.log(`  Thought: ${step.thought.substring(0, 150)}...`);
    console.log(`  Confidence: ${(step.confidence * 100).toFixed(1)}%`);
    console.log(`  Verifier Votes: [${step.verifierVotes.map(v => (v * 100).toFixed(1)).join(', ')}%]`);
  }

  console.log('\n=== Explanation ===');
  console.log(result.explanation);

  if (result.backtrackingEvents.length > 0) {
    console.log('\n=== Backtracking Events ===');
    for (const event of result.backtrackingEvents) {
      console.log(`Step ${event.step}: ${event.reason}`);
      console.log(`  Strategy: ${event.strategy}`);
      console.log(`  Confidence: ${event.originalConfidence.toFixed(2)} → ${event.newConfidence.toFixed(2)}`);
    }
  }
}

// Run the example
basicUsage().catch(console.error);
