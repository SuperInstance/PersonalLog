/**
 * Basic Health Monitoring Example
 *
 * Demonstrates basic health monitoring usage
 */

import { getHealthMonitor } from '../src/index';

async function basicHealthMonitoring() {
  // Get the health monitor instance
  const monitor = getHealthMonitor();

  // Start monitoring
  console.log('Starting health monitoring...');
  await monitor.start();

  // Wait for some metrics to be collected
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get overall health score
  const healthScore = monitor.getHealthScore();
  console.log('\n=== Health Score ===');
  console.log(`Overall: ${healthScore.score}/100`);
  console.log(`Status: ${healthScore.status}`);
  console.log(`Trend: ${healthScore.trend}`);

  // Get category scores
  console.log('\n=== Category Scores ===');
  for (const [category, score] of Object.entries(healthScore.categories)) {
    console.log(`${category}: ${score.toFixed(0)}/100`);
  }

  // Get all metrics
  const metrics = monitor.getMetrics();
  console.log('\n=== Current Metrics ===');
  metrics.forEach(metric => {
    console.log(`${metric.name}: ${metric.value.toFixed(2)} ${metric.unit} (${metric.status})`);
  });

  // Check for alerts
  const alerts = monitor.getActiveAlerts();
  if (alerts.length > 0) {
    console.log('\n=== Alerts ===');
    alerts.forEach(alert => {
      console.log(`[${alert.severity}] ${alert.message}`);
      console.log(`  Current: ${alert.currentValue}, Threshold: ${alert.threshold}`);
    });
  } else {
    console.log('\n=== No Active Alerts ===');
  }

  // Get system health status
  const status = monitor.getSystemHealthStatus();
  console.log('\n=== System Status ===');
  console.log(`Uptime: ${(status.uptime / 1000).toFixed(0)}s`);
  console.log(`Monitoring: ${status.isMonitoring}`);
  console.log(`Last Check: ${new Date(status.lastCheck).toISOString()}`);

  // Stop monitoring
  console.log('\nStopping health monitoring...');
  monitor.stop();
}

// Run the example
basicHealthMonitoring().catch(console.error);
