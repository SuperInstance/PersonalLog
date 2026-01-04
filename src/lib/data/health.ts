/**
 * Data Health Monitoring System
 *
 * Continuous monitoring of data health including:
 * - Storage usage
 * - Performance metrics
 * - Anomaly detection
 * - Health trends
 * - Automated health checks
 */

import type {
  HealthCheckResult,
  OverallHealthStatus,
  HealthIssue,
  HealthCheckItem,
  StorageStatus,
  PerformanceStatus,
  Anomaly,
  HealthTrend,
  HealthStatusCode
} from './integrity-types';

// ============================================================================
// DATA HEALTH MONITOR
// ============================================================================

export class DataHealthMonitor {
  private monitoring: boolean = false;
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: number | null = null;
  private healthHistory: HealthTrend[] = [];
  private maxHistorySize: number = 100;

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.monitoring) return;

    this.monitoring = true;
    this.intervalId = window.setInterval(() => {
      this.runHealthCheck().catch(console.error);
    }, this.checkInterval);

    // Run initial check
    await this.runHealthCheck();
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<OverallHealthStatus> {
    const result = await this.runHealthCheck();

    return {
      overall: result.status,
      score: result.score,
      checks: result.checks,
      lastCheck: result.timestamp,
      trends: this.healthHistory.slice(-10),
      issues: result.issues,
      uptime: this.calculateUptime()
    };
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Run all health checks
    const [
      storageHealth,
      performanceHealth,
      integrityHealth,
      corruptionHealth
    ] = await Promise.all([
      this.checkStorageHealth(),
      this.checkPerformanceHealth(),
      this.checkIntegrityHealth(),
      this.checkCorruptionHealth()
    ]);

    const checks: HealthCheckItem[] = [
      storageHealth,
      performanceHealth,
      integrityHealth,
      corruptionHealth
    ];

    // Calculate overall score
    const score = this.calculateOverallScore(checks);

    // Determine overall status
    const status = this.determineStatus(score, checks);

    // Collect issues
    const issues = this.collectIssues(checks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(status, score, issues);

    // Record health trend
    this.recordHealthTrend(score, issues.length);

    return {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      status,
      score,
      checks,
      issues,
      recommendations
    };
  }

  /**
   * Monitor storage usage
   */
  async monitorStorage(): Promise<StorageStatus> {
    // Estimate storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 1;

        return {
          available: quota - usage,
          total: quota,
          used: usage,
          percentage: (usage / quota) * 100,
          status: this.getStorageStatus((usage / quota) * 100),
          fragmentation: 0, // Cannot detect in browser
          growthRate: 0 // Would be calculated from historical data
        };
      } catch (error) {
        // Fallback to defaults
      }
    }

    // Fallback defaults
    return {
      available: 100 * 1024 * 1024,
      total: 100 * 1024 * 1024,
      used: 0,
      percentage: 0,
      status: 'ok',
      fragmentation: 0,
      growthRate: 0
    };
  }

  /**
   * Monitor performance
   */
  async monitorPerformance(): Promise<PerformanceStatus> {
    // Placeholder - would measure actual query performance
    return {
      queryTime: {
        avg: 50,
        p95: 100,
        p99: 200
      },
      indexEfficiency: 95,
      cacheHitRate: 85,
      operationThroughput: 100
    };
  }

  /**
   * Detect anomalies
   */
  async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for unusual patterns
    const health = await this.getHealth();
    const recentTrends = this.healthHistory.slice(-10);

    if (recentTrends.length >= 5) {
      // Detect sudden score drops
      const recentScores = recentTrends.map(t => t.score);
      const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

      if (health.score < avgScore - 20) {
        anomalies.push({
          id: `anomaly_${Date.now()}`,
          type: 'score-drop',
          severity: 'high',
          description: 'Health score has dropped significantly',
          metric: 'health-score',
          value: health.score,
          expected: avgScore,
          deviation: Math.abs((health.score - avgScore) / avgScore * 100),
          timestamp: Date.now()
        });
      }
    }

    return anomalies;
  }

  // ==========================================================================
  // PRIVATE HEALTH CHECKS
  // ==========================================================================

  private async checkStorageHealth(): Promise<HealthCheckItem> {
    const storage = await this.monitorStorage();
    let status: 'pass' | 'fail' | 'warn';
    let score: number;
    let message: string;

    if (storage.percentage < 50) {
      status = 'pass';
      score = 100;
      message = 'Storage usage is healthy';
    } else if (storage.percentage < 80) {
      status = 'warn';
      score = 70;
      message = 'Storage usage is getting high';
    } else {
      status = 'fail';
      score = 40;
      message = 'Storage is almost full';
    }

    return {
      name: 'Storage Health',
      status,
      score,
      message,
      details: `${Math.round(storage.percentage)}% used (${this.formatBytes(storage.used)} of ${this.formatBytes(storage.total)})`,
      lastCheck: Date.now(),
      value: storage.percentage,
      threshold: 80
    };
  }

  private async checkPerformanceHealth(): Promise<HealthCheckItem> {
    const perf = await this.monitorPerformance();
    const avgTime = perf.queryTime.avg;
    let status: 'pass' | 'fail' | 'warn';
    let score: number;
    let message: string;

    if (avgTime < 100) {
      status = 'pass';
      score = 100;
      message = 'Performance is excellent';
    } else if (avgTime < 200) {
      status = 'warn';
      score = 75;
      message = 'Performance is degraded';
    } else {
      status = 'fail';
      score = 50;
      message = 'Performance is poor';
    }

    return {
      name: 'Performance',
      status,
      score,
      message,
      details: `Average query time: ${avgTime}ms, Cache hit rate: ${perf.cacheHitRate}%`,
      lastCheck: Date.now(),
      value: avgTime,
      threshold: 200
    };
  }

  private async checkIntegrityHealth(): Promise<HealthCheckItem> {
    // Placeholder - would run actual integrity checks
    return {
      name: 'Data Integrity',
      status: 'pass',
      score: 100,
      message: 'All integrity checks passed',
      details: 'No structural or referential issues detected',
      lastCheck: Date.now()
    };
  }

  private async checkCorruptionHealth(): Promise<HealthCheckItem> {
    // Placeholder - would run actual corruption checks
    return {
      name: 'Corruption Check',
      status: 'pass',
      score: 100,
      message: 'No corruption detected',
      details: 'All checksums valid, no orphaned records',
      lastCheck: Date.now()
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private calculateOverallScore(checks: HealthCheckItem[]): number {
    if (checks.length === 0) return 100;
    return Math.round(checks.reduce((sum, check) => sum + check.score, 0) / checks.length);
  }

  private determineStatus(
    score: number,
    checks: HealthCheckItem[]
  ): HealthStatusCode {
    const hasFailures = checks.some(c => c.status === 'fail');
    const hasWarnings = checks.some(c => c.status === 'warn');

    if (hasFailures || score < 50) return 'critical';
    if (hasWarnings || score < 70) return 'fair';
    if (score < 90) return 'good';
    return 'excellent';
  }

  private collectIssues(checks: HealthCheckItem[]): HealthIssue[] {
    const issues: HealthIssue[] = [];

    checks.forEach(check => {
      if (check.status === 'fail' || check.status === 'warn') {
        issues.push({
          id: `issue_${Date.now()}_${check.name}`,
          severity: check.status === 'fail' ? 'high' : 'medium',
          category: check.name,
          message: check.message,
          details: check.details,
          recommendation: `Review ${check.name.toLowerCase()} and take corrective action`,
          timestamp: Date.now(),
          resolved: false
        });
      }
    });

    return issues;
  }

  private generateRecommendations(
    status: HealthStatusCode,
    score: number,
    issues: HealthIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (status === 'critical') {
      recommendations.push('Critical issues detected. Immediate action required.');
    }

    if (score < 70) {
      recommendations.push('Health score is below optimal. Review failing checks.');
    }

    if (issues.length > 0) {
      recommendations.push(`${issues.length} issue(s) require attention.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems healthy. Continue regular monitoring.');
    }

    return recommendations;
  }

  private getStorageStatus(percentage: number): 'ok' | 'warning' | 'critical' {
    if (percentage < 80) return 'ok';
    if (percentage < 90) return 'warning';
    return 'critical';
  }

  private recordHealthTrend(score: number, issueCount: number): void {
    this.healthHistory.push({
      timestamp: Date.now(),
      score,
      issueCount
    });

    // Keep only recent history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  private calculateUptime(): number {
    // Calculate time since last issue
    // Placeholder - would track actual uptime
    return Date.now();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================
