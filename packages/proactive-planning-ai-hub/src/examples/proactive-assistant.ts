/**
 * Proactive Assistant Example
 *
 * Building a proactive code assistant that anticipates user needs
 */

import { getProactiveEngine, ProactiveTriggerType } from '../index';

async function demonstrateProactiveAssistant() {
  console.log('=== Proactive Assistant Demo ===\n');

  const engine = getProactiveEngine();
  engine.start();

  // Scenario 1: User is writing code
  console.log('Scenario 1: User writing code');
  console.log('Input: "function calculateTotal(items) { ... }"');

  const codeSuggestions = await engine.evaluateProactiveActions(
    'conv-code-1',
    'function calculateTotal(items) { return items.reduce((a, b) => a + b.price, 0); }',
    ['coder']
  );

  if (codeSuggestions.length > 0) {
    const suggestion = codeSuggestions[0];
    console.log(`✓ Proactive activation suggested:`);
    console.log(`  Agent: ${suggestion.agentId}`);
    console.log(`  Trigger: ${suggestion.triggerType}`);
    console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`  Benefit: ${suggestion.expectedBenefit}\n`);
  }

  // Scenario 2: User asks a question
  console.log('Scenario 2: User asks question');
  console.log('Input: "What is the difference between React and Vue?"');

  const questionSuggestions = await engine.evaluateProactiveActions(
    'conv-question-1',
    'What is the difference between React and Vue?',
    ['assistant']
  );

  if (questionSuggestions.length > 0) {
    const suggestion = questionSuggestions[0];
    console.log(`✓ Proactive activation suggested:`);
    console.log(`  Agent: ${suggestion.agentId}`);
    console.log(`  Trigger: ${suggestion.triggerType}`);
    console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`  Benefit: ${suggestion.expectedBenefit}\n`);
  }

  // Scenario 3: Complex task
  console.log('Scenario 3: Complex multi-step task');
  console.log('Input: "I need to integrate multiple APIs and create a dashboard"');

  const complexSuggestions = await engine.evaluateProactiveActions(
    'conv-complex-1',
    'I need to integrate multiple APIs and create a dashboard with real-time updates',
    ['assistant']
  );

  if (complexSuggestions.length > 0) {
    const suggestion = complexSuggestions[0];
    console.log(`✓ Proactive activation suggested:`);
    console.log(`  Agent: ${suggestion.agentId}`);
    console.log(`  Trigger: ${suggestion.triggerType}`);
    console.log(`  Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log(`  Benefit: ${suggestion.expectedBenefit}\n`);
  }

  // Show statistics
  const stats = engine.getStatistics();
  console.log('Proactive System Statistics:');
  console.log(`  Total suggestions: ${stats.totalSuggestions}`);
  console.log(`  Acceptance rate: ${(stats.acceptanceRate * 100).toFixed(0)}%`);
  console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(0)}%`);
  console.log();

  engine.stop();
  console.log('=== Demo Complete ===');
}

demonstrateProactiveAssistant().catch(console.error);
