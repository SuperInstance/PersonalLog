/**
 * Example 9: Decision Making
 *
 * Demonstrates using ThoughtChain for complex decision-making processes.
 * Shows systematic evaluation of options and trade-offs.
 *
 * SEO Keywords:
 * - AI decision support
 * - systematic decision making
 * - option evaluation
 * - trade-off analysis
 * - rational reasoning
 */

import { ThoughtChain } from '@superinstance/thoughtchain';

async function decisionMaking() {
  const decisionSupport = await ThoughtChain.init({
    verifiers: 5,
    confidenceThreshold: 0.90,
    steps: 12,
    explainReasoning: true,
  });

  const decisionScenario = `
    I need to choose between three job offers:
    1. Tech startup: $120k salary, high risk, significant equity, 60h/week
    2. Big corporation: $150k salary, stable, no equity, 45h/week
    3. Remote company: $100k salary, moderate risk, small equity, flexible hours

    What should I consider and which option seems best?
  `;

  console.log('🤔 DECISION SUPPORT SYSTEM\n');
  console.log(decisionScenario);

  const result = await decisionSupport.reason(decisionScenario, {
    steps: 15,
    onProgress: (progress) => {
      console.log(`Analyzing: ${progress.currentStepDescription}...`);
    },
  });

  console.log('\n=== DECISION ANALYSIS ===\n');

  // Extract evaluation of each option
  const options = ['Tech startup', 'Big corporation', 'Remote company'];

  options.forEach((option, i) => {
    const optionSteps = result.reasoning.filter(s =>
      s.thought.toLowerCase().includes(option.toLowerCase()) ||
      (i === 0 && s.thought.toLowerCase().includes('startup')) ||
      (i === 1 && s.thought.toLowerCase().includes('corporation')) ||
      (i === 2 && s.thought.toLowerCase().includes('remote'))
    );

    console.log(`${i + 1}. ${option}`);
    console.log(`   Analysis steps: ${optionSteps.length}`);

    if (optionSteps.length > 0) {
      const avgConfidence = optionSteps.reduce((sum, s) => sum + s.confidence, 0) / optionSteps.length;
      console.log(`   Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      // Show key considerations
      const keyPoints = optionSteps.slice(0, 2);
      keyPoints.forEach(point => {
        console.log(`   • ${point.thought.substring(0, 70)}...`);
      });
    }

    console.log('');
  });

  // Decision framework
  console.log('📊 DECISION FACTORS CONSIDERED');
  const factorCategories = {
    'Financial': ['salary', 'compensation', 'income', 'financial'],
    'Risk': ['risk', 'stability', 'security', 'uncertain'],
    'Work-Life Balance': ['hours', 'balance', 'flexible', 'personal'],
    'Career Growth': ['growth', 'opportunity', 'advancement', 'learn'],
    'Equity/Benefits': ['equity', 'stock', 'ownership', 'benefits'],
  };

  Object.entries(factorCategories).forEach(([category, keywords]) => {
    const relevantSteps = result.reasoning.filter(s =>
      keywords.some(kw => s.thought.toLowerCase().includes(kw))
    );

    if (relevantSteps.length > 0) {
      console.log(`  ${category}: ${relevantSteps.length} considerations`);
    }
  });

  console.log('\n💡 RECOMMENDATION');
  console.log(result.answer);

  console.log('\n🎯 CONFIDENCE IN RECOMMENDATION');
  console.log(`Overall: ${(result.overallConfidence * 100).toFixed(1)}%`);
  console.log(`Note: This is based on general factors. Personal values and circumstances should be considered.`);
}

// Key features:
// - Multi-option evaluation
// - Systematic analysis
// - Factor categorization
// - Confidence metrics
// - Balanced reasoning
