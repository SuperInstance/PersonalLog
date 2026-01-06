/**
 * Auto-Optimization Engine
 *
 * Main engine that coordinates monitoring, analysis, optimization,
 * and validation.
 */

import { MonitorRegistry } from './monitors';
import { StrategyFactory } from './strategies';
import { ValidationManager } from './validator';
import type {
  OptimizationRule,
  OptimizationCandidate,
  OptimizationResult,
  OptimizationRecord,
  OptimizationHistory,
  OptimizationEngineConfig,
  OptimizationEngineState,
  OptimizationSuggestions,
  HealthStatus,
  OptimizationTarget,
  PerformanceSnapshot,
  OptimizationEvent,
  OptimizationEventType,
  ConfigChange,
} from './types';

// ============================================================================
// OPTIMIZATION ENGINE
// ============================================================================

export class OptimizationEngine {
  private state: OptimizationEngineState;
  private monitors: MonitorRegistry;
  private validator: ValidationManager;
  private rules: Map<string, OptimizationRule> = new Map();
  private eventListeners: Map<OptimizationEventType, Set<Function>> = new Map();
  private monitorIntervalId?: number;
  private analysisIntervalId?: number;

  constructor(config?: Partial<OptimizationEngineConfig>) {
    // Initialize state
    this.state = this.initializeState(config);

    // Initialize subsystems
    this.monitors = new MonitorRegistry();
    this.validator = new ValidationManager();

    // Load state from storage if enabled
    this.loadState();
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Start the optimization engine
   */
  async start(): Promise<void> {
    if (this.state.status === 'monitoring') {
      return; // Already running
    }

    console.log('[Optimization Engine] Starting...');

    // Start monitoring
    this.monitors.start();

    // Set up monitoring interval
    this.monitorIntervalId = window.setInterval(
      () => this.performMonitoring(),
      this.state.config.monitorInterval
    );

    // Set up analysis interval
    this.analysisIntervalId = window.setInterval(
      () => this.performAnalysis(),
      this.state.config.analysisInterval
    );

    this.state.status = 'monitoring';
    this.emitEvent({ type: 'monitoring-started', timestamp: Date.now(), data: null });

    console.log('[Optimization Engine] Started');
  }

  /**
   * Stop the optimization engine
   */
  async stop(): Promise<void> {
    console.log('[Optimization Engine] Stopping...');

    // Stop monitoring
    this.monitors.stop();

    // Clear intervals
    if (this.monitorIntervalId) {
      clearInterval(this.monitorIntervalId);
    }
    if (this.analysisIntervalId) {
      clearInterval(this.analysisIntervalId);
    }

    this.state.status = 'idle';
    this.emitEvent({ type: 'monitoring-stopped', timestamp: Date.now(), data: null });

    // Save state
    this.saveState();

    console.log('[Optimization Engine] Stopped');
  }

  // ========================================================================
  // RULE MANAGEMENT
  // ========================================================================

  /**
   * Register optimization rule
   */
  registerRule(rule: OptimizationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Unregister optimization rule
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): OptimizationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): OptimizationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): OptimizationRule[] {
    return Array.from(this.rules.values()).filter((r) => r.category === category);
  }

  // ========================================================================
  // OPTIMIZATION SUGGESTIONS
  // ========================================================================

  /**
   * Get current optimization suggestions
   */
  async suggestOptimizations(): Promise<OptimizationSuggestions> {
    const snapshot = this.monitors.createSnapshot();
    const context = this.buildStrategyContext(snapshot);

    // Select strategy
    const strategy = StrategyFactory.autoSelect(context);

    // Generate candidates
    const candidates: OptimizationCandidate[] = [];

    const rulesArray = Array.from(this.rules.values());
    for (const rule of rulesArray) {
      if (strategy.shouldSuggest(rule, context)) {
        const candidate = strategy.generateCandidate(rule, context);
        candidates.push(candidate);
      }
    }

    // Sort by priority and confidence
    candidates.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.rule.priority];
      const bPriority = priorityOrder[b.rule.priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return b.confidence - a.confidence;
    });

    // Group by priority
    const suggestions: OptimizationSuggestions = {
      high: [],
      medium: [],
      low: [],
      count: candidates.length,
      timestamp: Date.now(),
    };

    for (const candidate of candidates) {
      switch (candidate.rule.priority) {
        case 'critical':
        case 'high':
          suggestions.high.push(candidate);
          break;
        case 'medium':
          suggestions.medium.push(candidate);
          break;
        case 'low':
          suggestions.low.push(candidate);
          break;
      }
    }

    // Update snapshot suggestions
    snapshot.suggestions = candidates;

    return suggestions;
  }

  // ========================================================================
  // OPTIMIZATION APPLICATION
  // ========================================================================

  /**
   * Apply optimization with optional A/B testing
   */
  async applyOptimization(
    ruleId: string,
    options: {
      validate?: boolean;
      skipValidation?: boolean;
      force?: boolean;
    } = {}
  ): Promise<OptimizationResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return {
        success: false,
        optimizationId: ruleId,
        changes: [],
        error: 'Rule not found',
        timestamp: Date.now(),
      };
    }

    console.log(`[Optimization Engine] Applying optimization: ${rule.name}`);

    try {
      // Check if already applied
      if (this.state.appliedOptimizations.includes(ruleId) && !options.force) {
        return {
          success: false,
          optimizationId: ruleId,
          changes: [],
          error: 'Optimization already applied',
          timestamp: Date.now(),
        };
      }

      // Get current metrics before
      const snapshot = this.monitors.createSnapshot();
      const beforeMetrics: Record<string, number> = {};
      for (const [metric, reading] of Object.entries(snapshot.metrics)) {
        beforeMetrics[metric] = reading.value;
      }

      // Store previous values for rollback
      const changesWithPrevious = rule.configChanges.map((change) => ({
        ...change,
        previousValue: this.getCurrentConfigValue(change.key),
      }));

      // Apply configuration changes
      for (const change of changesWithPrevious) {
        this.applyConfigChange(change);
      }

      // Record optimization
      const record: OptimizationRecord = {
        id: `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: Date.now(),
        status: 'applied',
        changes: changesWithPrevious,
        beforeMetrics: beforeMetrics as any,
        validated: false,
      };

      // Add to history
      this.state.history.records.push(record);
      this.state.appliedOptimizations.push(ruleId);

      // Emit event
      this.emitEvent({
        type: 'optimization-applied',
        timestamp: Date.now(),
        data: { ruleId, record },
      });

      console.log(`[Optimization Engine] Optimization applied: ${rule.name}`);

      // Start monitoring for rollback
      this.startRollbackMonitoring(rule, record);

      return {
        success: true,
        optimizationId: ruleId,
        changes: changesWithPrevious,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[Optimization Engine] Failed to apply optimization:`, error);

      return {
        success: false,
        optimizationId: ruleId,
        changes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Rollback optimization
   */
  async rollbackOptimization(recordId: string): Promise<boolean> {
    const record = this.state.history.records.find((r) => r.id === recordId);
    if (!record) {
      console.error(`[Optimization Engine] Record not found: ${recordId}`);
      return false;
    }

    console.log(`[Optimization Engine] Rolling back optimization: ${record.ruleName}`);

    try {
      // Apply rollback changes
      for (const change of record.changes) {
        if (change.previousValue !== undefined) {
          this.applyConfigChange({
            key: change.key,
            value: change.previousValue,
            type: change.type,
            reversible: false,
          });
        }
      }

      // Update record
      record.status = 'rollback';
      record.rollback = {
        timestamp: Date.now(),
        reason: 'Manual rollback',
      };

      // Remove from applied list
      const idx = this.state.appliedOptimizations.indexOf(record.ruleId);
      if (idx > -1) {
        this.state.appliedOptimizations.splice(idx, 1);
      }

      // Emit event
      this.emitEvent({
        type: 'optimization-rollback',
        timestamp: Date.now(),
        data: { recordId, record },
      });

      console.log(`[Optimization Engine] Rollback complete: ${record.ruleName}`);
      return true;
    } catch (error) {
      console.error(`[Optimization Engine] Rollback failed:`, error);
      return false;
    }
  }

  // ========================================================================
  // STATUS & HEALTH
  // ========================================================================

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    const snapshot = this.monitors.createSnapshot();

    // Calculate category scores
    let performanceSum = 0;
    let performanceCount = 0;
    let qualitySum = 0;
    let qualityCount = 0;
    let resourcesSum = 0;
    let resourcesCount = 0;

    for (const [metric, reading] of Object.entries(snapshot.metrics)) {
      const score = reading.anomaly
        ? Math.max(0, 100 - ((reading.severity || 0) * 100))
        : 100;

      if (['initial-load-time', 'response-latency', 'frame-rate', 'jank'].includes(metric)) {
        performanceSum += score;
        performanceCount++;
      } else if (['memory-usage', 'cpu-usage'].includes(metric)) {
        resourcesSum += score;
        resourcesCount++;
      } else if (['error-rate', 'feature-reliability'].includes(metric)) {
        qualitySum += score;
        qualityCount++;
      }
    }

    return {
      overall: snapshot.healthScore,
      performance: performanceCount > 0 ? performanceSum / performanceCount : 100,
      quality: qualityCount > 0 ? qualitySum / qualityCount : 100,
      resources: resourcesCount > 0 ? resourcesSum / resourcesCount : 100,
      issues: snapshot.issues,
      recentOptimizations: this.state.history.records.slice(-10),
    };
  }

  /**
   * Get optimization history
   */
  getHistory(limit?: number): OptimizationHistory {
    const records = limit
      ? this.state.history.records.slice(-limit)
      : this.state.history.records;

    // Calculate summary
    const successful = records.filter((r) => r.status === 'applied').length;
    const rolledBack = records.filter((r) => r.status === 'rollback').length;
    const failed = records.filter((r) => r.status === 'failed').length;

    const improvements = records
      .filter((r) => r.improvementPercent !== undefined)
      .map((r) => r.improvementPercent!);
    const avgImprovement =
      improvements.length > 0
        ? improvements.reduce((sum, i) => sum + i, 0) / improvements.length
        : 0;

    return {
      records,
      summary: {
        totalApplied: successful,
        successful,
        rolledBack,
        failed,
        avgImprovement,
      },
      trends: {
        improvements: {} as Record<OptimizationTarget, number>,
        successRate:
          records.length > 0 ? (successful + rolledBack) / records.length : 1,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): Record<string, unknown> {
    return this.state.config as any;
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Add event listener
   */
  addEventListener(type: OptimizationEventType, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: OptimizationEventType, listener: Function): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Initialize state
   */
  private initializeState(
    config?: Partial<OptimizationEngineConfig>
  ): OptimizationEngineState {
    const defaultConfig: OptimizationEngineConfig = {
      enabled: true,
      monitorInterval: 5000, // 5 seconds
      analysisInterval: 30000, // 30 seconds
      autoApply: false,
      maxAutoApplyRisk: 30,
      requireConsent: true,
      defaultRollbackTimeout: 300000, // 5 minutes
      storageKey: 'personallog-optimization',
      maxHistoryRecords: 1000,
      persistState: true,
      debug: false,
    };

    return {
      config: { ...defaultConfig, ...config },
      status: 'idle',
      appliedOptimizations: [],
      history: {
        records: [],
        summary: {
          totalApplied: 0,
          successful: 0,
          rolledBack: 0,
          failed: 0,
          avgImprovement: 0,
        },
        trends: {
          improvements: {} as Record<OptimizationTarget, number>,
          successRate: 1,
        },
      },
      baseline: {} as Record<OptimizationTarget, number>,
      lastMonitorTime: 0,
      lastAnalysisTime: 0,
    };
  }

  /**
   * Perform monitoring cycle
   */
  private performMonitoring(): void {
    if (!this.state.config.enabled) return;

    const snapshot = this.monitors.createSnapshot();

    // Check for issues
    if (snapshot.issues.length > 0) {
      for (const issue of snapshot.issues) {
        this.emitEvent({
          type: 'issue-detected',
          timestamp: Date.now(),
          data: { issue, snapshot },
        });
      }
    }

    this.state.lastMonitorTime = Date.now();
  }

  /**
   * Perform analysis cycle
   */
  private async performAnalysis(): Promise<void> {
    if (!this.state.config.enabled) return;

    // Get suggestions
    const suggestions = await this.suggestOptimizations();

    if (suggestions.count > 0) {
      this.emitEvent({
        type: 'optimization-suggested',
        timestamp: Date.now(),
        data: { suggestions },
      });

      // Auto-apply safe optimizations if enabled
      if (this.state.config.autoApply) {
        for (const candidate of suggestions.high) {
          if (candidate.rule.autoApplySafe && candidate.rule.riskLevel < this.state.config.maxAutoApplyRisk) {
            await this.applyOptimization(candidate.rule.id);
          }
        }
      }
    }

    this.state.lastAnalysisTime = Date.now();
  }

  /**
   * Start rollback monitoring for optimization
   */
  private startRollbackMonitoring(rule: OptimizationRule, record: OptimizationRecord): void {
    const checkRollback = () => {
      const snapshot = this.monitors.createSnapshot();
      const currentReadings: Record<string, any> = snapshot.metrics;

      // Check if should rollback
      const shouldRollback =
        rule.conditions.some((condition) => {
          const reading = currentReadings[condition.metric];
          if (!reading) return false;

          // Check for severe anomaly
          return reading.anomaly && (reading.severity || 0) > 0.7;
        }) || record.rollback !== undefined;

      if (shouldRollback && !record.rollback) {
        console.log(`[Optimization Engine] Auto-rollback triggered: ${rule.name}`);
        this.rollbackOptimization(record.id);
      }
    };

    // Check periodically during rollback window
    const checkInterval = 10000; // 10 seconds
    const checks = rule.rollbackTimeout / checkInterval;

    for (let i = 0; i < checks; i++) {
      setTimeout(checkRollback, checkInterval * (i + 1));
    }
  }

  /**
   * Build strategy context
   */
  private buildStrategyContext(snapshot: PerformanceSnapshot): any {
    return {
      readings: snapshot.metrics,
      issues: snapshot.issues,
      config: {},
      appliedOptimizations: this.state.appliedOptimizations,
      history: {
        successful: this.state.history.summary.successful,
        failed: this.state.history.summary.failed,
        rolledBack: this.state.history.summary.rolledBack,
      },
      preferences: {
        autoApply: this.state.config.autoApply,
        consentRequired: this.state.config.requireConsent,
        maxRiskLevel: this.state.config.maxAutoApplyRisk,
      },
    };
  }

  /**
   * Apply configuration change
   */
  private applyConfigChange(change: ConfigChange): void {
    // In real implementation, this would apply to actual system config
    // For now, just store in a local map
    if (this.state.config.debug) {
      console.log(`[Optimization Engine] Applying config: ${change.key} = ${change.value}`);
    }
  }

  /**
   * Get current config value
   */
  private getCurrentConfigValue(key: string): unknown {
    // In real implementation, this would read from system config
    return undefined;
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: OptimizationEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      const listenersArray = Array.from(listeners);
      for (const listener of listenersArray) {
        try {
          listener(event);
        } catch (error) {
          console.error('[Optimization Engine] Event listener error:', error);
        }
      }
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    if (!this.state.config.persistState) return;

    try {
      const data = JSON.stringify({
        appliedOptimizations: this.state.appliedOptimizations,
        history: this.state.history.records.slice(-this.state.config.maxHistoryRecords),
        baseline: this.state.baseline,
      });
      localStorage.setItem(this.state.config.storageKey, data);
    } catch (error) {
      console.error('[Optimization Engine] Failed to save state:', error);
    }
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    if (!this.state.config.persistState) return;

    try {
      const data = localStorage.getItem(this.state.config.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.state.appliedOptimizations = parsed.appliedOptimizations || [];
        this.state.history.records = parsed.history || [];
        this.state.baseline = parsed.baseline || {};
      }
    } catch (error) {
      console.error('[Optimization Engine] Failed to load state:', error);
    }
  }

  /**
   * Apply multiple optimizations (convenience method for tests)
   */
  async applyOptimizations(ruleIds: string[]): Promise<void> {
    for (const ruleId of ruleIds) {
      await this.applyOptimization(ruleId)
    }
  }

  /**
   * Get current configuration (convenience method for tests)
   */
  getCurrentConfig(): Record<string, unknown> {
    return this.getConfiguration()
  }

  /**
   * Get recommendations (convenience method for tests)
   */
  getRecommendations(): OptimizationRule[] {
    return this.getAllRules().filter(rule => rule.enabled)
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create optimization engine with default configuration
 */
export function createOptimizationEngine(
  config?: Partial<OptimizationEngineConfig>
): OptimizationEngine {
  return new OptimizationEngine(config);
}
