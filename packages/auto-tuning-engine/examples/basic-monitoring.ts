/**
 * Basic Monitoring Example
 *
 * Demonstrates basic performance monitoring with the Auto-Tuner
 */

import { autoTuner } from '../src';

async function main() {
  console.log('=== Basic Performance Monitoring ===\n');

  // 1. Monitor current performance
  console.log('1. Monitoring current performance...');
  const metrics = await autoTuner.monitor();

  console.log('   Response Time:', metrics.responseTime.toFixed(0), 'ms');
  console.log('   Cache Hit Rate:', (metrics.cacheHitRate * 100).toFixed(1), '%');
  console.log('   Memory Usage:', metrics.memoryUsage.toFixed(1), 'MB');
  console.log('   Render Performance:', metrics.renderPerformance.toFixed(0), 'fps');
  console.log('   CPU Usage:', metrics.cpuUsage.toFixed(0), '%');
  console.log('   Error Rate:', (metrics.errorRate * 100).toFixed(2), '%');

  // 2. Get all tunable configurations
  console.log('\n2. Tunable configurations:');
  const configs = autoTuner.getAllTunableConfigs();
  console.log('   Total tunable configs:', configs.length);

  for (const config of configs.slice(0, 5)) {
    console.log(`   - ${config.key}: ${config.current} (${config.category})`);
  }

  // 3. Get optimization history
  console.log('\n3. Optimization history:');
  const history = autoTuner.getHistory();
  console.log('   Total optimizations:', history.length);
  console.log('   Successful:', autoTuner.getSuccessfulOptimizations().length);
  console.log('   Failed:', autoTuner.getFailedOptimizations().length);
}

main().catch(console.error);
