/**
 * Adaptive Optimization Engine
 *
 * Monitors system metrics and automatically triggers optimizations
 * when performance degrades. Features rule-based triggers, effectiveness
 * tracking, and automatic rollback.
 */

import type {
  OptimizationTrigger,
  Optimization,
  OptimizationExecution,
  TriggerHistory,
  OptimizationStatus,
  OptimizationConfig,
  RuleStatistics,
  RuleValidation,
  MetricType,
} from './optimization-types';
import {
  DEFAULT_CONFIG,
  BUILT_IN_TRIGGERS,
  type OptimizationEngineState,
  type TriggerCondition,
} from './optimization-types';
import { BUILT_IN_OPTIMIZATIONS } from './optimizations';
import { getPerformanceMonitor } from './performance';

// ============================================================================
// ENGINE STATE
// ============================================================================

class OptimizationEngine {
  private state: OptimizationEngineState;
  private evaluationTimer: number | null = null;
  private activeOptimizations = new Set<string>();
  private metricHistory = new Map<string, Array<{ timestamp: number; value: number }>>();

  constructor() {
    this.state = this.initializeState();
  }

  /**
   * Initialize engine state
   */
  private initializeState(): OptimizationEngineState {
    // Load from localStorage if available
    const savedState = this.loadState();

    if (savedState) {
      return savedState;
    }

    // Initialize with built-in triggers and optimizations
    return {
      running: false,
      triggers: BUILT_IN_TRIGGERS.map((t, index) => ({
        ...t,
        id: `builtin-trigger-${index}`,
        enabled: true,
      })),
      optimizations: BUILT_IN_OPTIMIZATIONS,
      executions: [],
      triggerHistory: [],
      statistics: {},
      config: DEFAULT_CONFIG,
    };
  }

  // ============================================================================
// PUBLIC API
  // ============================================================================

  /**
   * Start the optimization engine
   */
  start(): void {
    if (this.state.running) {
      this.log('warn', 'Optimization engine already running');
      return;
    }

    this.state.running = true;
    this.scheduleNextEvaluation();

    this.log('info', `Optimization engine started (interval: ${this.state.config.evaluationInterval}ms)`);
  }

  /**
   * Stop the optimization engine
   */
  stop(): void {
    if (!this.state.running) {
      this.log('warn', 'Optimization engine not running');
      return;
    }

    this.state.running = false;

    if (this.evaluationTimer !== null) {
      clearTimeout(this.evaluationTimer);
      this.evaluationTimer = null;
    }

    this.log('info', 'Optimization engine stopped');
  }

  /**
   * Register a custom trigger
   */
  registerTrigger(trigger: Omit<OptimizationTrigger, 'id'>): string {
    const id = `custom-trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newTrigger: OptimizationTrigger = {
      ...trigger,
      id,
    };

    // Validate trigger
    const validation = this.validateTrigger(newTrigger);
    if (!validation.valid) {
      throw new Error(`Invalid trigger: ${validation.errors.join(', ')}`);
    }

    this.state.triggers.push(newTrigger);
    this.saveState();

    this.log('info', `Registered trigger: ${newTrigger.name} (${id})`);
    return id;
  }

  /**
   * Unregister a trigger
   */
  unregisterTrigger(triggerId: string): boolean {
    const index = this.state.triggers.findIndex((t) => t.id === triggerId);
    if (index === -1) {
      return false;
    }

    const trigger = this.state.triggers[index];
    this.state.triggers.splice(index, 1);
    this.saveState();

    this.log('info', `Unregistered trigger: ${trigger.name} (${triggerId})`);
    return true;
  }

  /**
   * Enable/disable a trigger
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.state.triggers.find((t) => t.id === triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = enabled;
    this.saveState();

    this.log('info', `${enabled ? 'Enabled' : 'Disabled'} trigger: ${trigger.name} (${triggerId})`);
    return true;
  }

  /**
   * Register a custom optimization
   */
  registerOptimization(optimization: Omit<Optimization, 'id'>): string {
    const id = `custom-opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOptimization: Optimization = {
      ...optimization,
      id,
    };

    this.state.optimizations.push(newOptimization);
    this.saveState();

    this.log('info', `Registered optimization: ${newOptimization.name} (${id})`);
    return id;
  }

  /**
   * Get all triggers
   */
  getTriggers(): OptimizationTrigger[] {
    return [...this.state.triggers];
  }

  /**
   * Get all optimizations
   */
  getOptimizations(): Optimization[] {
    return [...this.state.optimizations];
  }

  /**
   * Get optimization execution history
   */
  getExecutionHistory(limit?: number): OptimizationExecution[] {
    const history = [...this.state.executions].sort((a, b) => b.triggeredAt - a.triggeredAt);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get trigger history
   */
  getTriggerHistory(triggerId?: string, limit?: number): TriggerHistory[] {
    let history = [...this.state.triggerHistory].sort((a, b) => b.timestamp - a.timestamp);

    if (triggerId) {
      history = history.filter((h) => h.triggerId === triggerId);
    }

    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get rule statistics
   */
  getRuleStatistics(triggerId?: string): Record<string, RuleStatistics> {
    if (triggerId) {
      const stats = this.state.statistics[triggerId];
      return stats ? { [triggerId]: stats } : {};
    }

    return { ...this.state.statistics };
  }

  /**
   * Manually trigger an optimization
   */
  async triggerOptimization(optimizationId: string): Promise<string> {
    const optimization = this.state.optimizations.find((o) => o.id === optimizationId);
    if (!optimization) {
      throw new Error(`Optimization not found: ${optimizationId}`);
    }

    const executionId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.log('info', `Manual trigger: ${optimization.name} (${optimizationId})`);

    await this.executeOptimization(optimization, executionId, null);

    return executionId;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizationConfig>): void {
    this.state.config = {
      ...this.state.config,
      ...config,
    };

    // Restart if interval changed and engine is running
    if (config.evaluationInterval && this.state.running) {
      this.stop();
      this.start();
    }

    this.saveState();
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.state.config };
  }

  /**
   * Validate a trigger definition
   */
  validateTrigger(trigger: OptimizationTrigger): RuleValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate name
    if (!trigger.name || trigger.name.trim().length === 0) {
      errors.push('Trigger name is required');
    }

    // Validate conditions
    if (!trigger.conditions || trigger.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    trigger.conditions?.forEach((condition, index) => {
      if (!this.isValidMetric(condition.metric)) {
        errors.push(`Condition ${index}: Invalid metric type: ${condition.metric}`);
      }

      if (condition.duration !== undefined && condition.duration < 0) {
        errors.push(`Condition ${index}: Duration must be positive`);
      }

      if (condition.operator === 'between' && !Array.isArray(condition.threshold)) {
        errors.push(`Condition ${index}: 'between' operator requires threshold to be an array`);
      }
    });

    // Validate optimization exists
    const optimization = this.state.optimizations.find((o) => o.id === trigger.optimizationId);
    if (!optimization) {
      errors.push(`Optimization not found: ${trigger.optimizationId}`);
    }

    // Warnings
    if (trigger.cooldown < 1000) {
      warnings.push('Cooldown is very short (<1s), may trigger too frequently');
    }

    if (trigger.maxTriggers && trigger.maxTriggers < 5) {
      warnings.push('maxTriggers is very low, trigger may rarely fire');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
// EVALUATION
  // ============================================================================

  /**
   * Schedule next evaluation cycle
   */
  private scheduleNextEvaluation(): void {
    if (!this.state.running) {
      return;
    }

    this.evaluationTimer = window.setTimeout(() => {
      this.evaluateTriggers();
      this.scheduleNextEvaluation();
    }, this.state.config.evaluationInterval);
  }

  /**
   * Evaluate all triggers and fire if conditions met
   */
  private async evaluateTriggers(): Promise<void> {
    this.state.lastEvaluation = Date.now();

    // Get current metrics
    const metrics = await this.getCurrentMetrics();

    // Update metric history
    this.updateMetricHistory(metrics);

    // Sort triggers by priority
    const sortedTriggers = [...this.state.triggers]
      .filter((t) => t.enabled)
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

    // Evaluate each trigger
    for (const trigger of sortedTriggers) {
      if (await this.shouldTrigger(trigger, metrics)) {
        await this.fireTrigger(trigger, metrics);
      }
    }
  }

  /**
   * Check if a trigger should fire
   */
  private async shouldTrigger(trigger: OptimizationTrigger, metrics: Record<string, number>): Promise<boolean> {
    // Check cooldown
    if (this.isOnCooldown(trigger.id)) {
      return false;
    }

    // Check max triggers
    if (this.hasExceededMaxTriggers(trigger)) {
      return false;
    }

    // Check all conditions (AND logic)
    for (const condition of trigger.conditions) {
      if (!(await this.evaluateCondition(condition, metrics))) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: TriggerCondition, metrics: Record<string, number>): Promise<boolean> {
    const currentValue = metrics[condition.metric];
    if (currentValue === undefined) {
      this.log('warn', `Metric not available: ${condition.metric}`);
      return false;
    }

    // Get historical value if duration is specified
    let valueToCompare = currentValue;
    if (condition.duration) {
      const pastValue = this.getHistoricalMetricValue(condition.metric, condition.duration);
      if (pastValue === null) {
        // Not enough history yet
        return false;
      }
      valueToCompare = pastValue;
    }

    // Evaluate condition
    return this.compareValues(valueToCompare, condition.operator, condition.threshold);
  }

  /**
   * Compare values based on operator
   */
  private compareValues(
    value: number,
    operator: TriggerCondition['operator'],
    threshold: number | [number, number]
  ): boolean {
    switch (operator) {
      case '>':
        return value > (threshold as number);
      case '>=':
        return value >= (threshold as number);
      case '<':
        return value < (threshold as number);
      case '<=':
        return value <= (threshold as number);
      case '==':
        return value === (threshold as number);
      case '!=':
        return value !== (threshold as number);
      case 'between':
        const [min, max] = threshold as [number, number];
        return value >= min && value <= max;
      default:
        return false;
    }
  }

  /**
   * Fire a trigger and execute its optimization
   */
  private async fireTrigger(trigger: OptimizationTrigger, metrics: Record<string, number>): Promise<void> {
    const optimization = this.state.optimizations.find((o) => o.id === trigger.optimizationId);
    if (!optimization) {
      this.log('error', `Optimization not found for trigger: ${trigger.name}`);
      return;
    }

    // Check if too many concurrent optimizations
    if (this.activeOptimizations.size >= this.state.config.maxConcurrentOptimizations) {
      this.log('warn', `Max concurrent optimizations reached, skipping: ${trigger.name}`);
      return;
    }

    const executionId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Record trigger history
    this.state.triggerHistory.push({
      triggerId: trigger.id,
      timestamp: Date.now(),
      metricValues: metrics,
      executionId,
    });

    this.log('info', `Trigger fired: ${trigger.name} → ${optimization.name}`);

    await this.executeOptimization(optimization, executionId, trigger.id);
  }

  /**
   * Execute an optimization
   */
  private async executeOptimization(
    optimization: Optimization,
    executionId: string,
    triggerId: string | null
  ): Promise<void> {
    const startTime = Date.now();

    // Create execution record
    const execution: OptimizationExecution = {
      id: executionId,
      triggerId: triggerId || 'manual',
      optimizationId: optimization.id,
      status: 'running',
      triggeredAt: startTime,
      rolledBack: false,
    };

    this.state.executions.push(execution);
    this.activeOptimizations.add(executionId);

    try {
      // Execute optimization
      this.log('info', `Executing optimization: ${optimization.name}...`);
      const result = await optimization.action();

      execution.completedAt = Date.now();
      execution.duration = execution.completedAt - startTime;
      execution.result = result;
      execution.status = result.success ? 'completed' : 'failed';
      execution.effectiveness = this.calculateEffectiveness(result);

      // Update statistics
      if (triggerId) {
        this.updateStatistics(triggerId, execution);
      }

      // Auto-rollback if ineffective
      if (
        result.success &&
        optimization.canRollback &&
        execution.effectiveness !== undefined &&
        execution.effectiveness < this.state.config.autoRollbackThreshold
      ) {
        this.log('info', `Optimization ineffective (${execution.effectiveness}%), rolling back...`);
        await this.rollbackExecution(execution, optimization);
      }

      this.log('info', `Optimization ${result.success ? 'completed' : 'failed'}: ${optimization.name}`);
    } catch (error) {
      execution.completedAt = Date.now();
      execution.duration = execution.completedAt - startTime;
      execution.status = 'failed';
      execution.result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        before: {},
        after: {},
        improvements: {},
      };

      this.log('error', `Optimization failed: ${optimization.name} - ${execution.result.error}`);
    } finally {
      this.activeOptimizations.delete(executionId);
      this.saveState();
    }
  }

  /**
   * Rollback an optimization execution
   */
  private async rollbackExecution(execution: OptimizationExecution, optimization: Optimization): Promise<void> {
    if (!optimization.rollback) {
      this.log('warn', `No rollback function for: ${optimization.name}`);
      return;
    }

    try {
      await optimization.rollback();
      execution.rolledBack = true;
      execution.rolledBackAt = Date.now();

      this.log('info', `Rolled back optimization: ${optimization.name}`);
    } catch (error) {
      this.log('error', `Rollback failed: ${optimization.name} - ${error}`);
    }
  }

  // ============================================================================
// METRICS
  // ============================================================================

  /**
   * Get current system metrics
   */
  private async getCurrentMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Get performance monitor metrics
    const perfMonitor = getPerformanceMonitor();
    const webVitals = perfMonitor.getWebVitalsSummary();
    const apiMetrics = perfMonitor.getAPIMetricsSummary();

    // Memory metrics
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        metrics['memory-used'] = memory.usedJSHeapSize / 1024 / 1024; // MB
        metrics['memory-total'] = memory.totalJSHeapSize / 1024 / 1024; // MB
        metrics['memory-limit'] = memory.jsHeapSizeLimit / 1024 / 1024; // MB
        metrics['memory-percent'] = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      }
    }

    // Storage metrics
    if (typeof navigator !== 'undefined' && 'storage' in navigator) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage && estimate.quota) {
          metrics['storage-used'] = estimate.usage / 1024 / 1024; // MB
          metrics['storage-quota'] = estimate.quota / 1024 / 1024; // MB
          metrics['storage-percent'] = (estimate.usage / estimate.quota) * 100;
        }
      } catch {
        // Storage estimation not supported
      }
    }

    // Web Vitals
    if (webVitals.lcp) metrics['lcp'] = webVitals.lcp.value;
    if (webVitals.fcp) metrics['fcp'] = webVitals.fcp.value;
    if (webVitals.inp) metrics['inp'] = webVitals.inp.value;
    if (webVitals.cls) metrics['cls'] = webVitals.cls.value;
    if (webVitals.ttfb) metrics['ttfb'] = webVitals.ttfb.value;

    // API metrics (average duration and failure rate)
    if (apiMetrics.length > 0) {
      const totalDuration = apiMetrics.reduce((sum, m) => sum + m.avgDuration * m.count, 0);
      const totalCount = apiMetrics.reduce((sum, m) => sum + m.count, 0);
      const totalFailures = apiMetrics.reduce((sum, m) => sum + m.failureRate * m.count, 0);

      metrics['api-duration'] = totalDuration / totalCount;
      metrics['api-failure-rate'] = totalFailures / totalCount;
    }

    // Long tasks
    const longTasks = perfMonitor.getMetricsByName('long-task');
    const recentLongTasks = longTasks.filter((t) => Date.now() - t.timestamp < 60000); // Last minute
    metrics['long-tasks'] = recentLongTasks.length;

    // Errors (from localStorage if tracked)
    if (typeof localStorage !== 'undefined') {
      const errorCount = localStorage.getItem('error-count');
      if (errorCount) {
        metrics['error-count'] = parseInt(errorCount, 10);
      }
    }

    return metrics;
  }

  /**
   * Update metric history
   */
  private updateMetricHistory(metrics: Record<string, number>): void {
    const now = Date.now();
    const maxHistoryAge = 5 * 60 * 1000; // Keep 5 minutes of history

    for (const [key, value] of Object.entries(metrics)) {
      if (!this.metricHistory.has(key)) {
        this.metricHistory.set(key, []);
      }

      const history = this.metricHistory.get(key)!;
      history.push({ timestamp: now, value });

      // Remove old entries
      const cutoff = now - maxHistoryAge;
      const filtered = history.filter((entry) => entry.timestamp > cutoff);
      this.metricHistory.set(key, filtered);
    }
  }

  /**
   * Get historical metric value
   */
  private getHistoricalMetricValue(metric: string, duration: number): number | null {
    const history = this.metricHistory.get(metric);
    if (!history || history.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoff = now - duration;

    // Get all entries within the duration
    const entries = history.filter((entry) => entry.timestamp > cutoff);
    if (entries.length === 0) {
      return null;
    }

    // Return average value over the duration
    const sum = entries.reduce((acc, entry) => acc + entry.value, 0);
    return sum / entries.length;
  }

  // ============================================================================
// STATISTICS AND COOLDOWNS
  // ============================================================================

  /**
   * Check if trigger is on cooldown
   */
  private isOnCooldown(triggerId: string): boolean {
    const trigger = this.state.triggers.find((t) => t.id === triggerId);
    if (!trigger) return false;

    const stats = this.state.statistics[triggerId];
    if (!stats || !stats.lastTriggered) return false;

    const timeSinceLastTrigger = Date.now() - stats.lastTriggered;
    return timeSinceLastTrigger < trigger.cooldown;
  }

  /**
   * Check if trigger has exceeded max triggers
   */
  private hasExceededMaxTriggers(trigger: OptimizationTrigger): boolean {
    if (!trigger.maxTriggers) return false;

    const stats = this.state.statistics[trigger.id];
    if (!stats) return false;

    if (trigger.triggerWindow) {
      // Check within time window
      const windowStart = Date.now() - trigger.triggerWindow;
      const recentTriggers = this.state.triggerHistory.filter(
        (h) => h.triggerId === trigger.id && h.timestamp > windowStart
      );
      return recentTriggers.length >= trigger.maxTriggers;
    } else {
      // Check total
      return stats.triggerCount >= trigger.maxTriggers;
    }
  }

  /**
   * Update trigger statistics
   */
  private updateStatistics(triggerId: string, execution: OptimizationExecution): void {
    if (!this.state.statistics[triggerId]) {
      this.state.statistics[triggerId] = {
        triggerCount: 0,
        avgEffectiveness: 0,
        successRate: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        rolledBackExecutions: 0,
      };
    }

    const stats = this.state.statistics[triggerId];
    stats.triggerCount++;
    stats.totalExecutions++;
    stats.lastTriggered = execution.triggeredAt;

    if (execution.status === 'completed') {
      stats.successfulExecutions++;
    } else if (execution.status === 'failed') {
      stats.failedExecutions++;
    }

    if (execution.rolledBack) {
      stats.rolledBackExecutions++;
    }

    // Update average effectiveness
    if (execution.effectiveness !== undefined) {
      const totalEffectiveness = stats.avgEffectiveness * (stats.totalExecutions - 1) + execution.effectiveness;
      stats.avgEffectiveness = totalEffectiveness / stats.totalExecutions;
    }

    // Update success rate
    stats.successRate = stats.successfulExecutions / stats.totalExecutions;
  }

  /**
   * Calculate effectiveness score (0-100)
   */
  private calculateEffectiveness(result: import('./optimization-types').OptimizationResult): number {
    if (!result.success) {
      return 0;
    }

    // Count positive improvements
    let positiveImprovements = 0;
    let totalImprovements = 0;

    for (const [key, value] of Object.entries(result.improvements)) {
      totalImprovements++;

      const numValue = typeof value === 'number' ? value : 0;

      // Memory/storage: decrease is good
      if (key.includes('memory') || key.includes('storage') || key.includes('cache')) {
        if (numValue < 0) positiveImprovements++;
      }
      // Hit rates: increase is good
      else if (key.includes('rate') || key.includes('hit')) {
        if (numValue > 0) positiveImprovements++;
      }
      // Duration/time: decrease is good
      else if (key.includes('duration') || key.includes('time')) {
        if (numValue < 0) positiveImprovements++;
      }
    }

    if (totalImprovements === 0) {
      return 50; // Neutral
    }

    return Math.round((positiveImprovements / totalImprovements) * 100);
  }

  // ============================================================================
// UTILITIES
  // ============================================================================

  /**
   * Check if metric type is valid
   */
  private isValidMetric(metric: MetricType): boolean {
    const validMetrics: MetricType[] = [
      'memory-used',
      'memory-percent',
      'cpu-percent',
      'api-duration',
      'api-failure-rate',
      'cache-hit-rate',
      'render-duration',
      'long-tasks',
      'error-count',
      'storage-used',
      'storage-percent',
      'custom',
    ];
    return validMetrics.includes(metric);
  }

  /**
   * Get numeric priority value
   */
  private getPriorityValue(priority: OptimizationTrigger['priority']): number {
    const values = { critical: 4, high: 3, medium: 2, low: 1 };
    return values[priority];
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const logLevel = this.state.config.logLevel;

    if (logLevel === 'none') return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[level];

    if (currentLevel >= levels[logLevel]) {
      const prefix = '[OptimizationEngine]';
      switch (level) {
        case 'debug':
          console.debug(prefix, message);
          break;
        case 'info':
          console.info(prefix, message);
          break;
        case 'warn':
          console.warn(prefix, message);
          break;
        case 'error':
          console.error(prefix, message);
          break;
      }
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      const stateToSave = {
        ...this.state,
        // Don't save running state or timer
        running: false,
        evaluationTimer: null,
      };
      localStorage.setItem('optimization-engine-state', JSON.stringify(stateToSave));
    } catch (error) {
      this.log('error', `Failed to save state: ${error}`);
    }
  }

  /**
   * Load state from localStorage
   */
  private loadState(): OptimizationEngineState | null {
    try {
      const saved = localStorage.getItem('optimization-engine-state');
      if (!saved) return null;

      const parsed = JSON.parse(saved);

      // Clean up old execution history
      const cutoff = Date.now() - DEFAULT_CONFIG.historyRetention;
      parsed.executions = parsed.executions?.filter((e: OptimizationExecution) => e.triggeredAt > cutoff) || [];
      parsed.triggerHistory = parsed.triggerHistory?.filter((h: TriggerHistory) => h.timestamp > cutoff) || [];

      return parsed;
    } catch (error) {
      this.log('error', `Failed to load state: ${error}`);
      return null;
    }
  }

  /**
   * Clear all state
   */
  clearState(): void {
    localStorage.removeItem('optimization-engine-state');
    this.state = this.initializeState();
    this.metricHistory.clear();
    this.log('info', 'State cleared');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let engine: OptimizationEngine | null = null;

export function getOptimizationEngine(): OptimizationEngine {
  if (!engine) {
    engine = new OptimizationEngine();
  }
  return engine;
}

// Export types
export type { OptimizationTrigger, Optimization, OptimizationExecution, TriggerHistory };
