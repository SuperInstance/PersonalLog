/**
 * Example 1: Basic Reasoning Chain
 *
 * Demonstrates basic chain-of-thought reasoning with step-by-step decomposition.
 * Breaks complex queries into manageable reasoning steps.
 *
 * SEO Keywords:
 * - chain-of-thought reasoning
 * - step-by-step AI
 * - query decomposition
 * - reasoning verification
 * - LLM reasoning chain
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function basicReasoningChain() {
  const thoughtChain = await ThoughtChain.init();

  const query = 'What is the capital of France and what is its population?';

  // Decompose into reasoning steps
  const result = await thoughtChain.reason(query, {
    steps: 5,
    onProgress: (progress) => {
      console.log(`Step ${progress.currentStep}/${progress.totalSteps}: ${progress.currentStepDescription}`);
    },
  });

  console.log('Reasoning chain:', result.reasoning);
  // Output:
  // Step 1: Understand what is being asked
  // Step 2: Identify that we need to find the capital of France
  // Step 3: Retrieve that Paris is the capital of France
  // Step 4: Find the population of Paris
  // Step 5: Synthesize the answer

  console.log('Final answer:', result.answer);
  // Output: "The capital of France is Paris, with a population of approximately 2.2 million people."

  console.log('Confidence:', result.overallConfidence);
  // Output: 0.94
}

// Key features:
// - Automatic query decomposition
// - Step-by-step reasoning
// - Progress tracking
// - High confidence results
