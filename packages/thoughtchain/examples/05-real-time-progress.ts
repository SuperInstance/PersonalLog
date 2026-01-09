/**
 * Example 5: Real-Time Progress Monitoring
 *
 * Demonstrates real-time progress tracking and event monitoring.
 */

import { ThoughtChain, createMockVerifiers } from '@superinstance/thoughtchain';
import type { ReasoningProgress, ReasoningStep, BacktrackingEvent } from '@superinstance/thoughtchain';

async function realTimeProgressMonitoring() {
  console.log('=== Real-Time Progress Monitoring ===\n');

  const verifiers = createMockVerifiers(3);
  const tc = new ThoughtChain(verifiers, {
    steps: 5,
    verifiers: 3,
    confidenceThreshold: 0.90,
    backtrackOnLowConfidence: true,
    explainReasoning: true,
  });

  // Track progress
  let currentProgress = 0;
  const progressHistory: number[] = [];

  tc.on('progress', (progress: ReasoningProgress) => {
    const bar = '█'.repeat(Math.floor(progress.percentage / 5)) + '░'.repeat(20 - Math.floor(progress.percentage / 5));
    console.log(`\r[${bar}] ${progress.percentage}% - ${progress.status.toUpperCase()}: ${progress.currentStepDescription || ''}`);

    progressHistory.push(progress.percentage);
    currentProgress = progress.percentage;
  });

  // Track step completion
  tc.on('stepComplete', (step: ReasoningStep) => {
    console.log(`\n✓ Step ${step.step} complete`);
    console.log(`  Confidence: ${(step.confidence * 100).toFixed(1)}%`);
    console.log(`  Verifiers: [${step.verifierVotes.map(v => (v * 100).toFixed(0)).join(', ')}%]`);

    if (step.alternatives && step.alternatives.length > 0) {
      console.log(`  Alternatives considered: ${step.alternatives.length}`);
    }
  });

  // Track backtracking
  tc.on('backtrack', (event: BacktrackingEvent) => {
    console.log(`\n⚠ Backtracking on step ${event.step}`);
    console.log(`  Reason: ${event.reason}`);
    console.log(`  Strategy: ${event.strategy}`);
    console.log(`  Attempt ${event.attempt}: ${event.originalConfidence.toFixed(2)} → ${event.newConfidence.toFixed(2)}`);
  });

  // Track completion
  tc.on('complete', (result) => {
    console.log('\n✓ Reasoning complete!');
    console.log(`  Final confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log(`  Total time: ${result.duration}ms`);
    console.log(`  Steps: ${result.stepsCompleted}`);
  });

  // Track errors
  tc.on('error', (error) => {
    console.error(`\n✗ Error: ${error}`);
  });

  // Run reasoning
  const query = 'Analyze the impact of artificial intelligence on healthcare, education, and employment.';
  console.log(`Query: ${query}\n`);

  const result = await tc.reason(query);

  // Progress analysis
  console.log('\n=== Progress Analysis ===');
  console.log(`Progress Updates: ${progressHistory.length}`);
  console.log(`Final Progress: ${currentProgress}%`);

  if (progressHistory.length > 1) {
    const avgProgressIncrement = progressHistory.reduce((a, b) => b - a, 0) / (progressHistory.length - 1);
    console.log(`Avg. Progress Increment: ${avgProgressIncrement.toFixed(1)}%`);
  }

  // Timeline
  console.log('\n=== Execution Timeline ===');
  let currentTime = 0;
  for (const step of result.reasoning) {
    if (step.timing) {
      const stepTime = step.timing.duration;
      console.log(`Step ${step.step}: ${stepTime}ms (cumulative: ${currentTime + stepTime}ms)`);
      currentTime += stepTime;
    }
  }
  console.log(`Total: ${currentTime}ms`);

  // Verifier response times
  console.log('\n=== Verifier Performance ===');
  const verifierTimes: Record<string, number[]> = {};

  for (const step of result.reasoning) {
    if (step.timing) {
      // Estimate individual verifier times (simplified)
      const avgVerifierTime = step.timing.duration / verifiers.length;
      for (let i = 0; i < verifiers.length; i++) {
        const verifierId = `verifier-${i + 1}`;
        if (!verifierTimes[verifierId]) {
          verifierTimes[verifierId] = [];
        }
        verifierTimes[verifierId].push(avgVerifierTime * (0.8 + Math.random() * 0.4)); // Add variance
      }
    }
  }

  for (const [verifierId, times] of Object.entries(verifierTimes)) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`${verifierId}: ${avgTime.toFixed(0)}ms average`);
  }
}

// Run the example
realTimeProgressMonitoring().catch(console.error);
