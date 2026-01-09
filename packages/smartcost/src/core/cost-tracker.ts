/**
 * Cost Tracker - Real-time Cost Monitoring Engine
 *
 * Tracks every API call with <10ms overhead, predictive cost estimation,
 * and real-time budget enforcement
 */

import { EventEmitter } from '../utils/event-emitter.js';
import type {
  CostRecord,
  CostMetrics,
  CostBreakdown,
  TokenUsage,
  BudgetState,
  BudgetConfig,
  SmartCostConfig,
  CostUpdateEvent,
  BudgetAlertEvent,
} from '../types/index.js';

// ============================================================================
// COST TRACKER CLASS
// ============================================================================

export class CostTracker extends EventEmitter {
  private records: CostRecord[] = [];
  private budgetState: BudgetState;
  private metrics: CostMetrics;
  private config: BudgetConfig;
  private monitoringEnabled: boolean;

  // Rate limiting state (per minute)
  private currentMinuteTokens: number = 0;
  private currentMinuteCost: number = 0;
  private lastMinuteReset: number = 0;

  // Performance tracking
  private trackingOverhead: number[] = [];

  constructor(config: SmartCostConfig = {}) {
    super();

    // Initialize budget configuration
    this.config = config.budget || {
      monthlyLimit: config.monthlyBudget || 500,
      alertThreshold: config.alertThreshold || 0.8,
      resetStrategy: 'monthly',
    };

    // Initialize budget state
    this.budgetState = this.initializeBudgetState();

    // Initialize metrics
    this.metrics = this.initializeMetrics();

    // Monitoring flag
    this.monitoringEnabled = config.enableMonitoring ?? true;

    // Start periodic tasks
    this.startPeriodicTasks();
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Track an API call (called before request)
   * Returns estimated cost and checks budget
   */
  public trackRequestStart(
    provider: string,
    model: string,
    estimatedTokens: { input: number; output: number },
    inputCostPerMillion: number,
    outputCostPerMillion: number
  ): {
    estimatedCost: number;
    budgetOk: boolean;
    budgetRemaining: number;
    requestId: string;
  } {
    const startTime = performance.now();

    // Generate unique request ID
    const requestId = this.generateRequestId();

    // Calculate estimated cost
    const estimatedInputCost =
      (estimatedTokens.input / 1_000_000) * inputCostPerMillion;
    const estimatedOutputCost =
      (estimatedTokens.output / 1_000_000) * outputCostPerMillion;
    const estimatedCost = estimatedInputCost + estimatedOutputCost;

    // Check budget
    const budgetOk = this.checkBudget(estimatedCost);
    const budgetRemaining = this.budgetState.remaining;

    // Track overhead
    const overhead = performance.now() - startTime;
    this.trackingOverhead.push(overhead);

    // Emit monitoring event
    if (this.monitoringEnabled) {
      this.emit('requestStart', {
        requestId,
        provider,
        model,
        estimatedCost,
        estimatedTokens,
      });
    }

    return {
      estimatedCost,
      budgetOk,
      budgetRemaining,
      requestId,
    };
  }

  /**
   * Complete API call tracking (called after response)
   * Records actual cost and tokens
   */
  public trackRequestComplete(
    requestId: string,
    provider: string,
    model: string,
    actualTokens: TokenUsage,
    inputCostPerMillion: number,
    outputCostPerMillion: number,
    duration: number,
    cached: boolean = false,
    cacheHitType: 'semantic' | 'exact' | 'none' = 'none'
  ): CostBreakdown {
    const startTime = performance.now();

    // Calculate actual cost
    const inputCost =
      (actualTokens.input / 1_000_000) * inputCostPerMillion;
    const outputCost =
      (actualTokens.output / 1_000_000) * outputCostPerMillion;
    const totalCost = inputCost + outputCost;

    // Create cost record
    const record: CostRecord = {
      requestId,
      timestamp: Date.now(),
      provider,
      model,
      tokens: actualTokens,
      cost: {
        inputCost,
        outputCost,
        totalCost,
      },
      duration,
      cached,
      cacheHitType,
    };

    // Store record
    this.records.push(record);

    // Update budget
    this.updateBudget(totalCost);

    // Update metrics
    this.updateMetrics(record);

    // Update rate limiting state
    this.updateRateLimits(actualTokens.total, totalCost);

    // Check budget alerts
    this.checkBudgetAlerts();

    // Track overhead
    const overhead = performance.now() - startTime;
    this.trackingOverhead.push(overhead);

    // Emit cost update event
    if (this.monitoringEnabled) {
      const event: CostUpdateEvent = {
        totalCost: this.metrics.totalCost,
        budgetUtilization: this.budgetState.utilization,
        totalSavings: this.metrics.totalSavings,
        savingsPercent: this.metrics.savingsPercent,
      };
      this.emit('costUpdate', event);
    }

    return record.cost;
  }

  /**
   * Record cost savings from caching or optimization
   */
  public recordSavings(originalCost: number, optimizedCost: number): void {
    const savings = originalCost - optimizedCost;
    if (savings > 0) {
      this.metrics.totalSavings += savings;
      this.metrics.savingsPercent =
        (this.metrics.totalSavings /
          (this.metrics.totalCost + this.metrics.totalSavings)) *
        100;
    }
  }

  /**
   * Get current budget state
   */
  public getBudgetState(): BudgetState {
    return { ...this.budgetState };
  }

  /**
   * Get current cost metrics
   */
  public getCostMetrics(): CostMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cost records (with optional filtering)
   */
  public getRecords(filter?: {
    provider?: string;
    model?: string;
    startTime?: number;
    endTime?: number;
  }): CostRecord[] {
    let records = this.records;

    if (filter) {
      if (filter.provider) {
        records = records.filter((r) => r.provider === filter.provider);
      }
      if (filter.model) {
        records = records.filter((r) => r.model === filter.model);
      }
      if (filter.startTime) {
        records = records.filter((r) => r.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        records = records.filter((r) => r.timestamp <= filter.endTime!);
      }
    }

    return records;
  }

  /**
   * Get average tracking overhead (should be <10ms)
   */
  public getAverageOverhead(): number {
    if (this.trackingOverhead.length === 0) return 0;
    const sum = this.trackingOverhead.reduce((a, b) => a + b, 0);
    return sum / this.trackingOverhead.length;
  }

  /**
   * Get provider cost breakdown
   */
  public getProviderCosts(): Record<string, number> {
    return { ...this.metrics.costByProvider };
  }

  /**
   * Get model cost breakdown
   */
  public getModelCosts(): Record<string, number> {
    return { ...this.metrics.costByModel };
  }

  /**
   * Reset tracking (for new budget period)
   */
  public resetTracking(): void {
    this.records = [];
    this.budgetState = this.initializeBudgetState();
    this.metrics = this.initializeMetrics();
    this.currentMinuteTokens = 0;
    this.currentMinuteCost = 0;
    this.trackingOverhead = [];

    this.emit('trackingReset');
  }

  /**
   * Estimate cost before making request
   */
  public estimateCost(
    inputTokens: number,
    outputTokens: number,
    inputCostPerMillion: number,
    outputCostPerMillion: number
  ): number {
    const inputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
    return inputCost + outputCost;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Initialize budget state
   */
  private initializeBudgetState(): BudgetState {
    const now = Date.now();
    const periodStart = this.getPeriodStart(now);
    const periodEnd = this.getPeriodEnd(periodStart);

    return {
      total: this.config.monthlyLimit,
      used: 0,
      remaining: this.config.monthlyLimit,
      utilization: 0,
      periodStart,
      periodEnd,
      alertThreshold: this.config.alertThreshold,
      alertTriggered: false,
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): CostMetrics {
    return {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      cacheHitRate: 0,
      totalSavings: 0,
      savingsPercent: 0,
      avgCostPerRequest: 0,
      avgTokensPerRequest: 0,
      costByProvider: {},
      costByModel: {},
      requestsByProvider: {},
      budgetUtilization: 0,
      periodStart: this.getPeriodStart(Date.now()),
      periodEnd: this.getPeriodEnd(this.getPeriodStart(Date.now())),
    };
  }

  /**
   * Get period start timestamp
   */
  private getPeriodStart(now: number): number {
    const date = new Date(now);

    switch (this.config.resetStrategy) {
      case 'daily':
        // Start of current day
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate()
        ).getTime();

      case 'weekly':
        // Start of current week (Sunday)
        const dayOfWeek = date.getDay();
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek.getTime();

      case 'monthly':
      default:
        // Start of current month
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          1
        ).getTime();
    }
  }

  /**
   * Get period end timestamp
   */
  private getPeriodEnd(periodStart: number): number {
    const date = new Date(periodStart);

    switch (this.config.resetStrategy) {
      case 'daily':
        // Add 1 day
        return periodStart + 24 * 60 * 60 * 1000;

      case 'weekly':
        // Add 7 days
        return periodStart + 7 * 24 * 60 * 60 * 1000;

      case 'monthly':
      default:
        // Start of next month
        return new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1
        ).getTime();
    }
  }

  /**
   * Check if budget allows this request
   */
  private checkBudget(estimatedCost: number): boolean {
    // Always allow if cost is negligible
    if (estimatedCost < 0.001) return true;

    // Check if budget would be exceeded
    return this.budgetState.remaining >= estimatedCost;
  }

  /**
   * Update budget after request
   */
  private updateBudget(cost: number): void {
    this.budgetState.used += cost;
    this.budgetState.remaining = this.budgetState.total - this.budgetState.used;
    this.budgetState.utilization =
      this.budgetState.used / this.budgetState.total;
  }

  /**
   * Update metrics after request
   */
  private updateMetrics(record: CostRecord): void {
    // Basic metrics
    this.metrics.totalCost += record.cost.totalCost;
    this.metrics.totalTokens += record.tokens.total;
    this.metrics.totalRequests += 1;

    // Provider metrics
    if (!this.metrics.costByProvider[record.provider]) {
      this.metrics.costByProvider[record.provider] = 0;
    }
    this.metrics.costByProvider[record.provider] += record.cost.totalCost;

    if (!this.metrics.requestsByProvider[record.provider]) {
      this.metrics.requestsByProvider[record.provider] = 0;
    }
    this.metrics.requestsByProvider[record.provider] += 1;

    // Model metrics
    const modelKey = `${record.provider}:${record.model}`;
    if (!this.metrics.costByModel[modelKey]) {
      this.metrics.costByModel[modelKey] = 0;
    }
    this.metrics.costByModel[modelKey] += record.cost.totalCost;

    // Cache metrics
    if (record.cached) {
      const cachedRequests =
        this.records.filter((r) => r.cached).length;
      this.metrics.cacheHitRate = cachedRequests / this.records.length;
    }

    // Average metrics
    this.metrics.avgCostPerRequest =
      this.metrics.totalCost / this.metrics.totalRequests;
    this.metrics.avgTokensPerRequest =
      this.metrics.totalTokens / this.metrics.totalRequests;

    // Budget utilization
    this.metrics.budgetUtilization = this.budgetState.utilization;
  }

  /**
   * Update rate limiting state
   */
  private updateRateLimits(tokens: number, cost: number): void {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000) * 60000;

    // Reset counters if new minute
    if (currentMinute !== this.lastMinuteReset) {
      this.currentMinuteTokens = 0;
      this.currentMinuteCost = 0;
      this.lastMinuteReset = currentMinute;
    }

    this.currentMinuteTokens += tokens;
    this.currentMinuteCost += cost;
  }

  /**
   * Check and emit budget alerts
   */
  private checkBudgetAlerts(): void {
    const utilization = this.budgetState.utilization;

    // Check alert threshold
    if (
      !this.budgetState.alertTriggered &&
      utilization >= this.config.alertThreshold
    ) {
      this.budgetState.alertTriggered = true;

      const alert: BudgetAlertEvent = {
        level: utilization >= 1 ? 'exceeded' : 'warning',
        utilization,
        remaining: this.budgetState.remaining,
        recommendedAction: this.getRecommendedAction(utilization),
      };

      this.emit('budgetAlert', alert);
    }

    // Check critical threshold (90%)
    if (utilization >= 0.9 && utilization < 1) {
      const alert: BudgetAlertEvent = {
        level: 'critical',
        utilization,
        remaining: this.budgetState.remaining,
        recommendedAction: 'Consider upgrading plan or reducing usage',
      };

      this.emit('budgetAlert', alert);
    }

    // Check exceeded threshold
    if (utilization >= 1) {
      const alert: BudgetAlertEvent = {
        level: 'exceeded',
        utilization,
        remaining: 0,
        recommendedAction: 'Budget exceeded. Please upgrade plan or wait for reset.',
      };

      this.emit('budgetAlert', alert);
    }
  }

  /**
   * Get recommended action based on utilization
   */
  private getRecommendedAction(utilization: number): string {
    if (utilization >= 1) {
      return 'Budget exceeded. Please upgrade plan or wait for reset.';
    }
    if (utilization >= 0.9) {
      return 'Critical: 90%+ budget used. Consider upgrading plan immediately.';
    }
    if (utilization >= 0.8) {
      return 'Warning: 80%+ budget used. Monitor usage closely.';
    }
    if (utilization >= 0.5) {
      return 'Half of budget used. Continue monitoring.';
    }
    return 'Budget usage within normal range.';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Check for budget period reset every minute
    setInterval(() => {
      const now = Date.now();
      if (now >= this.budgetState.periodEnd) {
        this.resetTracking();
      }
    }, 60000); // Check every minute

    // Clean up old records periodically (keep last 10000)
    setInterval(() => {
      if (this.records.length > 10000) {
        this.records = this.records.slice(-10000);
      }
    }, 3600000); // Check every hour
  }
}
