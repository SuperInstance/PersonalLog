/**
 * Optimization Strategies
 *
 * Defines strategies for applying optimizations, including when to apply,
 * how to validate, and when to rollback.
 */

import type {
  OptimizationRule,
  OptimizationCandidate,
  OptimizationStatus,
  ConfigChange,
  MetricReading,
  PerformanceIssue,
} from './types';

// ============================================================================
// STRATEGY INTERFACE
// ============================================================================

/**
 * Optimization strategy interface
 */
export interface OptimizationStrategy {
  /** Strategy name */
  readonly name: string;

  /** Evaluate if optimization should be suggested */
  shouldSuggest(rule: OptimizationRule, context: StrategyContext): boolean;

  /** Calculate confidence score for suggestion */
  calculateConfidence(
    rule: OptimizationRule,
    context: StrategyContext
  ): number;

  /** Determine if optimization should be auto-applied */
  shouldAutoApply(rule: OptimizationRule, context: StrategyContext): boolean;

  /** Generate optimization candidate */
  generateCandidate(
    rule: OptimizationRule,
    context: StrategyContext
  ): OptimizationCandidate;
}

/**
 * Strategy context for evaluation
 */
export interface StrategyContext {
  /** Current metric readings */
  readings: Record<string, MetricReading>;

  /** Detected performance issues */
  issues: PerformanceIssue[];

  /** Current configuration */
  config: Record<string, unknown>;

  /** Applied optimizations */
  appliedOptimizations: string[];

  /** Optimization history */
  history: {
    successful: number;
    failed: number;
    rolledBack: number;
  };

  /** User preferences */
  preferences: {
    autoApply: boolean;
    consentRequired: boolean;
    maxRiskLevel: number;
  };
}

// ============================================================================
// CONSERVATIVE STRATEGY
// ============================================================================

/**
 * Conservative strategy - only suggest when clear problem exists
 */
export class ConservativeStrategy implements OptimizationStrategy {
  readonly name = 'conservative';

  shouldSuggest(rule: OptimizationRule, context: StrategyContext): boolean {
    // Only suggest if:
    // 1. There's a relevant performance issue
    // 2. Rule conditions are met
    // 3. Rule is auto-apply safe or has low risk

    const hasRelevantIssue = context.issues.some(
      (issue) => rule.targets.includes(issue.metric)
    );

    const conditionsMet = this.checkConditions(rule, context);
    const isSafe = rule.autoApplySafe || rule.riskLevel < 30;

    return hasRelevantIssue && conditionsMet && isSafe;
  }

  calculateConfidence(
    rule: OptimizationRule,
    context: StrategyContext
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence if there are severe issues
    const relevantIssues = context.issues.filter((issue) =>
      rule.targets.includes(issue.metric)
    );
    const avgSeverity =
      relevantIssues.reduce((sum, i) => sum + i.severity, 0) /
        relevantIssues.length || 0;
    confidence += avgSeverity * 0.3;

    // Reduce confidence based on risk
    confidence -= (rule.riskLevel / 100) * 0.2;

    // Boost confidence if rule has low effort
    if (rule.effort === 'trivial' || rule.effort === 'low') {
      confidence += 0.1;
    }

    // Consider history
    if (context.history.rolledBack > context.history.successful) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  shouldAutoApply(
    rule: OptimizationRule,
    context: StrategyContext
  ): boolean {
    // Auto-apply only if:
    // 1. Rule is explicitly auto-apply safe
    // 2. Risk is very low (< 20)
    // 3. User has auto-apply enabled
    // 4. No recent rollbacks

    if (!rule.autoApplySafe) return false;
    if (rule.riskLevel >= 20) return false;
    if (!context.preferences.autoApply) return false;

    // Check for recent rollbacks of similar optimizations
    const recentRollbacks = context.history.rolledBack > 0;
    if (recentRollbacks) return false;

    return true;
  }

  generateCandidate(
    rule: OptimizationRule,
    context: StrategyContext
  ): OptimizationCandidate {
    const currentMetrics: Record<string, number> = {};
    const expectedMetrics: Record<string, number> = {};

    // Get current metric values
    for (const target of rule.targets) {
      const reading = context.readings[target];
      if (reading) {
        currentMetrics[target] = reading.value;
        // Estimate improvement (conservative: 10-20%)
        expectedMetrics[target] = reading.value * 0.85;
      }
    }

    const confidence = this.calculateConfidence(rule, context);

    return {
      rule,
      currentMetrics: currentMetrics as any,
      expectedMetrics: expectedMetrics as any,
      confidence,
      estimatedImprovement: 0.15, // Conservative 15%
      reasoning: this.generateReasoning(rule, context),
      dependencies: [],
      conflicts: this.checkConflicts(rule, context),
    };
  }

  public checkConditions(
    rule: OptimizationRule,
    context: StrategyContext
  ): boolean {
    for (const condition of rule.conditions) {
      const reading = context.readings[condition.metric];
      if (!reading) continue;

      const value = reading.value;
      let passes = false;

      switch (condition.operator) {
        case 'gt':
          passes = value > condition.threshold;
          break;
        case 'lt':
          passes = value < condition.threshold;
          break;
        case 'gte':
          passes = value >= condition.threshold;
          break;
        case 'lte':
          passes = value <= condition.threshold;
          break;
        case 'eq':
          passes = value === condition.threshold;
          break;
        case 'neq':
          passes = value !== condition.threshold;
          break;
      }

      if (!passes) return false;
    }

    return true;
  }

  private checkConflicts(
    rule: OptimizationRule,
    context: StrategyContext
  ): string[] {
    const conflicts: string[] = [];

    // Check if any applied optimization modifies same config keys
    for (const appliedId of context.appliedOptimizations) {
      // In real implementation, would look up applied optimization details
      // For now, simple check on config keys
      for (const change of rule.configChanges) {
        if (change.key in context.config) {
          conflicts.push(appliedId);
        }
      }
    }

    return conflicts;
  }

  private generateReasoning(
    rule: OptimizationRule,
    context: StrategyContext
  ): string {
    const parts: string[] = [];

    // Add issue-based reasoning
    const relevantIssues = context.issues.filter((issue) =>
      rule.targets.includes(issue.metric)
    );
    if (relevantIssues.length > 0) {
      parts.push(
        `Detected ${relevantIssues.length} issue(s) with ${relevantIssues[0].metric}`
      );
    }

    // Add rule-specific reasoning
    if (rule.priority === 'critical') {
      parts.push('High priority optimization');
    }

    if (rule.impact === 'high' || rule.impact === 'massive') {
      parts.push('Expected high impact');
    }

    return parts.join('. ') || 'Optimization recommended based on analysis';
  }
}

// ============================================================================
// AGGRESSIVE STRATEGY
// ============================================================================

/**
 * Aggressive strategy - suggest more optimizations proactively
 */
export class AggressiveStrategy implements OptimizationStrategy {
  readonly name = 'aggressive';

  shouldSuggest(rule: OptimizationRule, context: StrategyContext): boolean {
    // Suggest if:
    // 1. Rule conditions are met
    // 2. Risk is acceptable to user
    // 3. Either has issue OR is high impact

    const conditionsMet = this.checkConditions(rule, context);
    if (!conditionsMet) return false;

    const riskAcceptable = rule.riskLevel <= context.preferences.maxRiskLevel;
    if (!riskAcceptable) return false;

    const hasIssue = context.issues.some((issue) =>
      rule.targets.includes(issue.metric)
    );
    const highImpact = rule.impact === 'high' || rule.impact === 'massive';

    return hasIssue || highImpact;
  }

  calculateConfidence(
    rule: OptimizationRule,
    context: StrategyContext
  ): number {
    let confidence = 0.6; // Higher base confidence

    // Boost for high impact
    if (rule.impact === 'high') confidence += 0.15;
    if (rule.impact === 'massive') confidence += 0.25;

    // Reduce for risk
    confidence -= (rule.riskLevel / 100) * 0.3;

    // Boost for low effort
    if (rule.effort === 'trivial') confidence += 0.15;
    if (rule.effort === 'low') confidence += 0.1;

    // Consider issues
    const hasIssue = context.issues.some((i) => rule.targets.includes(i.metric));
    if (hasIssue) confidence += 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  shouldAutoApply(
    rule: OptimizationRule,
    context: StrategyContext
  ): boolean {
    // More liberal auto-apply:
    // 1. Risk is low enough for user (< 40)
    // 2. User has auto-apply enabled
    // 3. No conflicting recent failures

    if (rule.riskLevel >= context.preferences.maxRiskLevel) return false;
    if (!context.preferences.autoApply) return false;

    // Check failure rate
    const totalAttempts =
      context.history.successful + context.history.failed + context.history.rolledBack;
    if (totalAttempts > 5) {
      const failureRate =
        (context.history.failed + context.history.rolledBack) / totalAttempts;
      if (failureRate > 0.3) return false; // > 30% failure rate
    }

    return true;
  }

  generateCandidate(
    rule: OptimizationRule,
    context: StrategyContext
  ): OptimizationCandidate {
    const conservative = new ConservativeStrategy();
    const candidate = conservative.generateCandidate(rule, context);

    // Override with aggressive values
    candidate.confidence = this.calculateConfidence(rule, context);
    candidate.estimatedImprovement = 0.3; // Aggressive 30% estimate

    return candidate;
  }

  public checkConditions(
    rule: OptimizationRule,
    context: StrategyContext
  ): boolean {
    const conservative = new ConservativeStrategy();
    return conservative.checkConditions(rule, context);
  }
}

// ============================================================================
// BALANCED STRATEGY
// ============================================================================

/**
 * Balanced strategy - middle ground between conservative and aggressive
 */
export class BalancedStrategy implements OptimizationStrategy {
  readonly name = 'balanced';

  private conservative = new ConservativeStrategy();
  private aggressive = new AggressiveStrategy();

  shouldSuggest(rule: OptimizationRule, context: StrategyContext): boolean {
    // Use conservative for high-risk changes, aggressive for low-risk
    if (rule.riskLevel >= 50) {
      return this.conservative.shouldSuggest(rule, context);
    }
    return this.aggressive.shouldSuggest(rule, context);
  }

  calculateConfidence(
    rule: OptimizationRule,
    context: StrategyContext
  ): number {
    const consConf = this.conservative.calculateConfidence(rule, context);
    const aggConf = this.aggressive.calculateConfidence(rule, context);

    // Weighted average based on risk
    const riskFactor = rule.riskLevel / 100;
    return consConf * riskFactor + aggConf * (1 - riskFactor);
  }

  shouldAutoApply(
    rule: OptimizationRule,
    context: StrategyContext
  ): boolean {
    // Auto-apply if:
    // 1. Rule is auto-apply safe AND risk < 30
    // 2. OR rule is low risk (< 20) AND user has auto-apply

    if (rule.autoApplySafe && rule.riskLevel < 30) {
      return true;
    }

    if (rule.riskLevel < 20 && context.preferences.autoApply) {
      return true;
    }

    return false;
  }

  generateCandidate(
    rule: OptimizationRule,
    context: StrategyContext
  ): OptimizationCandidate {
    // Use conservative for high-risk, aggressive for low-risk
    if (rule.riskLevel >= 50) {
      return this.conservative.generateCandidate(rule, context);
    }
    return this.aggressive.generateCandidate(rule, context);
  }
}

// ============================================================================
// VALIDATION STRATEGY
// ============================================================================

/**
 * Validation strategy for checking optimization results
 */
export class ValidationStrategy {
  /**
   * Determine if optimization passed validation
   */
  static validate(
    before: Record<string, number>,
    after: Record<string, number>,
    rule: OptimizationRule,
    sampleSize: number
  ): { passed: boolean; reason: string; improvement: number } {
    const { minSampleSize, minImprovementPercent, maxDegradationPercent, metrics } =
      rule.validation;

    // Check sample size
    if (sampleSize < minSampleSize) {
      return {
        passed: false,
        reason: `Insufficient sample size: ${sampleSize} < ${minSampleSize}`,
        improvement: 0,
      };
    }

    let totalImprovement = 0;
    let metricCount = 0;

    // Check each metric
    for (const metric of metrics) {
      const beforeValue = before[metric.target];
      const afterValue = after[metric.target];

      if (beforeValue === undefined || afterValue === undefined) {
        continue;
      }

      const change = ((afterValue - beforeValue) / beforeValue) * 100;
      totalImprovement += change;
      metricCount++;

      // Check if metric must improve and didn't
      if (metric.mustImprove && change < minImprovementPercent) {
        return {
          passed: false,
          reason: `${metric.target} did not improve enough: ${change.toFixed(1)}% < ${minImprovementPercent}%`,
          improvement: change,
        };
      }

      // Check for excessive degradation
      if (change < -maxDegradationPercent) {
        return {
          passed: false,
          reason: `${metric.target} degraded too much: ${change.toFixed(1)}% < -${maxDegradationPercent}%`,
          improvement: change,
        };
      }

      // Check tolerance
      if (Math.abs(change) > metric.tolerance && !metric.mustImprove) {
        return {
          passed: false,
          reason: `${metric.target} change outside tolerance: ${Math.abs(change).toFixed(1)}% > ${metric.tolerance}%`,
          improvement: change,
        };
      }
    }

    // Calculate average improvement
    const avgImprovement = metricCount > 0 ? totalImprovement / metricCount : 0;

    return {
      passed: true,
      reason: 'Validation passed',
      improvement: avgImprovement,
    };
  }
}

// ============================================================================
// ROLLBACK STRATEGY
// ============================================================================

/**
 * Rollback strategy for determining when to rollback
 */
export class RollbackStrategy {
  /**
   * Determine if optimization should be rolled back
   */
  static shouldRollback(
    rule: OptimizationRule,
    appliedAt: number,
    currentReadings: Record<string, MetricReading>
  ): { shouldRollback: boolean; reason: string } {
    // Check timeout
    const elapsed = Date.now() - appliedAt;
    if (elapsed > rule.rollbackTimeout) {
      // Timeout expired, optimization is stable
      return { shouldRollback: false, reason: 'Rollback timeout expired' };
    }

    // Check for anomalies in target metrics
    for (const target of rule.targets) {
      const reading = currentReadings[target];
      if (reading?.anomaly) {
        // Check severity
        if ((reading.severity || 0) > 0.7) {
          return {
            shouldRollback: true,
            reason: `${target} showing severe anomalies (${(reading.severity! * 100).toFixed(0)}%)`,
          };
        }
      }
    }

    return { shouldRollback: false, reason: 'No rollback conditions met' };
  }

  /**
   * Generate rollback configuration changes
   */
  static generateRollback(changes: ConfigChange[]): ConfigChange[] {
    return changes.map((change) => ({
      key: change.key,
      value: change.previousValue,
      type: change.type,
      reversible: false, // Rollback is one-way
      previousValue: undefined,
    }));
  }
}

// ============================================================================
// STRATEGY SELECTION
// ============================================================================

/**
 * Strategy factory
 */
export class StrategyFactory {
  static create(type: 'conservative' | 'aggressive' | 'balanced'): OptimizationStrategy {
    switch (type) {
      case 'conservative':
        return new ConservativeStrategy();
      case 'aggressive':
        return new AggressiveStrategy();
      case 'balanced':
        return new BalancedStrategy();
      default:
        return new BalancedStrategy();
    }
  }

  /**
   * Auto-select strategy based on user preferences and history
   */
  static autoSelect(context: StrategyContext): OptimizationStrategy {
    // If user has been burned many times, be conservative
    const failureRate =
      (context.history.failed + context.history.rolledBack) /
      (context.history.successful + context.history.failed + context.history.rolledBack + 1);

    if (failureRate > 0.4) {
      return new ConservativeStrategy();
    }

    if (failureRate < 0.1) {
      return new AggressiveStrategy();
    }

    return new BalancedStrategy();
  }
}
