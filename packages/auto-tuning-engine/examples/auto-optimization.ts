/**
 * Auto-Optimization Example
 *
 * Demonstrates automatic optimization detection and application
 */

import { autoTuner } from '../src';

async function main() {
  console.log('=== Automatic Optimization ===\n');

  // 1. Monitor performance
  console.log('1. Monitoring performance...');
  const metrics = await autoTuner.monitor();
  console.log('   Current metrics:', {
    responseTime: metrics.responseTime.toFixed(0) + 'ms',
    cacheHitRate: (metrics.cacheHitRate * 100).toFixed(1) + '%',
    memoryUsage: metrics.memoryUsage.toFixed(1) + 'MB',
    renderPerformance: metrics.renderPerformance.toFixed(0) + 'fps',
  });

  // 2. Detect optimization opportunities
  console.log('\n2. Detecting optimization opportunities...');
  const opportunities = await autoTuner.detectOpportunities();
  console.log(`   Found ${opportunities.length} optimization opportunities`);

  if (opportunities.length === 0) {
    console.log('   No optimizations needed - performance is good!');
    return;
  }

  // 3. Display top opportunities
  console.log('\n3. Top optimization opportunities:');
  for (const opt of opportunities.slice(0, 3)) {
    console.log(`   - ${opt.configKey}`);
    console.log(`     Priority: ${opt.priority}/10`);
    console.log(`     Current: ${opt.currentValue} → Suggested: ${opt.suggestedValue.toFixed(0)}`);
    console.log(`     Expected improvement: ${opt.expectedImprovement}%`);
    console.log(`     Confidence: ${(opt.confidence * 100).toFixed(0)}%`);
    console.log(`     Risk level: ${opt.riskLevel}/100`);
    console.log(`     Reasoning: ${opt.reasoning}`);
    console.log('');
  }

  // 4. Apply safest optimization
  const safestOpt = opportunities.reduce((prev, current) =>
    current.riskLevel < prev.riskLevel ? current : prev
  );

  console.log('4. Applying safest optimization...');
  console.log(`   Selected: ${safestOpt.configKey}`);
  console.log(`   Risk level: ${safestOpt.riskLevel}/100`);

  const result = await autoTuner.apply(safestOpt);

  if (result.success) {
    console.log('   ✓ Optimization applied successfully!');
    console.log('   Changes:', result.changes);

    // 5. Monitor effectiveness (after delay)
    console.log('\n5. Monitoring effectiveness...');
    console.log('   (In a real scenario, wait 30s before measuring)');

    setTimeout(async () => {
      const effectiveness = await autoTuner.measure(result.optimizationId);
      if (effectiveness) {
        console.log('   ✓ Effectiveness measured:');
        console.log('   - Target:', effectiveness.target);
        console.log('   - Before:', effectiveness.before.toFixed(2));
        console.log('   - After:', effectiveness.after.toFixed(2));
        console.log('   - Improvement:', effectiveness.improvement);
      }
    }, 30000);
  } else {
    console.log('   ✗ Optimization failed:', result.error);
  }

  // 6. Show history
  console.log('\n6. Optimization history:');
  const allHistory = autoTuner.getHistory();
  console.log(`   Total optimizations applied: ${allHistory.length}`);
}

main().catch(console.error);
