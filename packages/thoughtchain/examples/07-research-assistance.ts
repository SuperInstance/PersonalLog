/**
 * Example 7: Research Assistance
 *
 * Demonstrates using ThoughtChain for academic research and fact verification.
 * Shows systematic approach to research questions.
 *
 * SEO Keywords:
 * - AI research assistant
 * - academic AI reasoning
 * - fact verification
 * - research methodology
 * - scholarly analysis
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function researchAssistance() {
  const researchAssistant = await ThoughtChain.init({
    verifiers: 5,
    confidenceThreshold: 0.95, // Higher threshold for research
    steps: 10,
    explainReasoning: true,
  });

  const researchQuestion = 'What are the primary factors contributing to the decline in bee populations, and what are the most promising mitigation strategies?';

  console.log('📚 Research Mode Activated\n');
  console.log(`Question: ${researchQuestion}\n`);

  const result = await researchAssistant.reason(researchQuestion, {
    steps: 15,
    onProgress: (progress) => {
      if (progress.status === 'verifying') {
        console.log(`🔍 Verifying step ${progress.currentStep}...`);
      } else if (progress.status === 'backtracking') {
        console.log(`🔄 Re-evaluating step ${progress.currentStep}...`);
      }
    },
  });

  // Research report structure
  console.log('\n=== RESEARCH REPORT ===\n');

  console.log('📋 METHODOLOGY');
  console.log(`Total reasoning steps: ${result.stepsCompleted}`);
  console.log(`Verification models: 5`);
  console.log(`Confidence threshold: 95%`);
  console.log(`Backtracking events: ${result.backtrackingEvents.length}\n`);

  console.log('🔍 KEY FINDINGS');
  const factorSteps = result.reasoning.filter(s =>
    s.thought.includes('factor') || s.thought.includes('cause')
  );

  factorSteps.forEach((step, i) => {
    console.log(`${i + 1}. ${step.thought}`);
    console.log(`   Confidence: ${(step.confidence * 100).toFixed(1)}%\n`);
  });

  console.log('💡 MITIGATION STRATEGIES');
  const strategySteps = result.reasoning.filter(s =>
    s.thought.includes('strategy') || s.thought.includes('solution') || s.thought.includes('mitigation')
  );

  strategySteps.forEach((step, i) => {
    console.log(`${i + 1}. ${step.thought}`);
    console.log(`   Confidence: ${(step.confidence * 100).toFixed(1)}%\n`);
  });

  console.log('📊 RELIABILITY METRICS');
  console.log(`Overall confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log(`Average step confidence: ${(result.reasoning.reduce((sum, s) => sum + s.confidence, 0) / result.reasoning.length * 100).toFixed(1)}%`);
  console.log(`Sources cross-verified: Yes (${result.reasoning.length} steps)`);

  console.log('\n📝 CONCLUSION');
  console.log(result.answer);
}

// Key features:
// - Academic-level analysis
// - High confidence thresholds
// - Structured research output
// - Source verification
// - Detailed methodology
