/**
 * Experiment Manager
 *
 * Manages the lifecycle of A/B experiments including creation,
 * starting, pausing, completing, and archiving.
 */

import type {
  Experiment,
  ExperimentStatus,
  ExperimentConfig,
  ExperimentEvent,
  ExperimentEventType,
  ExperimentEventListener,
  Variant,
  IExperimentManager,
} from './types';
import { AssignmentEngine } from './assignment';
import { MetricsTracker } from './metrics';
import { StatisticalAnalyzer } from './statistics';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExperimentConfig = {
  enabled: true,
  defaultConfidenceThreshold: 0.95,
  defaultMinSampleSize: 100,
  defaultTrafficAllocation: 1.0,
  earlyStoppingByDefault: true,
  banditByDefault: true,
  storageKey: 'personallog-experiments',
  persistAssignments: true,
  trackMetrics: true,
  debug: false,
  assignmentSalt: 'personallog-ab-salt',
};

/**
 * Generate unique experiment ID
 */
function generateExperimentId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate experiment definition
 */
function validateExperiment(experiment: Experiment): void {
  if (!experiment.name || experiment.name.trim().length === 0) {
    throw new Error('Experiment must have a name');
  }

  if (experiment.variants.length < 2) {
    throw new Error('Experiment must have at least 2 variants');
  }

  if (experiment.metrics.length === 0) {
    throw new Error('Experiment must have at least one metric');
  }

  const primaryMetrics = experiment.metrics.filter(m => m.primary);
  if (primaryMetrics.length !== 1) {
    throw new Error('Experiment must have exactly one primary metric');
  }

  if (experiment.trafficAllocation <= 0 || experiment.trafficAllocation > 1) {
    throw new Error('Traffic allocation must be between 0 and 1');
  }

  if (experiment.confidenceThreshold <= 0 || experiment.confidenceThreshold > 1) {
    throw new Error('Confidence threshold must be between 0 and 1');
  }

  // Validate variant weights
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) {
    throw new Error('Variant weights must be positive');
  }

  // Check for control variant
  const controls = experiment.variants.filter(v => v.isControl);
  if (controls.length !== 1) {
    throw new Error('Experiment must have exactly one control variant');
  }
}

/**
 * Normalize variant weights
 */
function normalizeVariantWeights(variants: Variant[]): Variant[] {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  return variants.map(v => ({
    ...v,
    weight: v.weight / totalWeight,
  }));
}

/**
 * Experiment manager implementation
 */
export class ExperimentManager implements IExperimentManager {
  private config: ExperimentConfig;
  private experiments: Map<string, Experiment> = new Map();
  private assignmentEngine: AssignmentEngine;
  private metricsTracker: MetricsTracker;
  private statisticalAnalyzer: StatisticalAnalyzer;
  private listeners: Map<ExperimentEventType, ExperimentEventListener[]> = new Map();
  private initialized = false;

  constructor(config?: Partial<ExperimentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.assignmentEngine = new AssignmentEngine(this.config);
    this.metricsTracker = new MetricsTracker(this.config);
    this.statisticalAnalyzer = new StatisticalAnalyzer(this.config);
  }

  /**
   * Initialize the experiment manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.config.debug) {
        console.log('[Experiments] Already initialized');
      }
      return;
    }

    if (this.config.debug) {
      console.log('[Experiments] Initializing...');
    }

    // Load experiments from storage if persisting
    if (this.config.persistAssignments && typeof window !== 'undefined') {
      this.loadFromStorage();
    }

    // Initialize subsystems
    await this.assignmentEngine.initialize();
    await this.metricsTracker.initialize();
    await this.statisticalAnalyzer.initialize();

    this.initialized = true;

    if (this.config.debug) {
      console.log('[Experiments] Initialization complete');
    }
  }

  createExperiment(
    definition: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
  ): Experiment {
    const now = Date.now();

    // Create experiment with generated ID
    const experiment: Experiment = {
      ...definition,
      id: generateExperimentId(),
      variants: normalizeVariantWeights(definition.variants),
      status: 'draft',
      startTime: null,
      endTime: null,
      createdAt: now,
      updatedAt: now,
    };

    // Validate
    validateExperiment(experiment);

    // Calculate target sample size if not provided
    if (!experiment.targetSampleSize) {
      const primaryMetric = experiment.metrics.find(m => m.primary)!;
      experiment.targetSampleSize = this.calculateSampleSize(experiment, primaryMetric);
    }

    // Store experiment
    this.experiments.set(experiment.id, experiment);

    // Emit event
    this.emit('experiment_created', {
      experimentId: experiment.id,
      experiment,
    });

    // Persist if enabled
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Created experiment:', experiment.id, experiment.name);
    }

    return experiment;
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  getExperimentsByStatus(status: ExperimentStatus): Experiment[] {
    return this.getAllExperiments().filter(e => e.status === status);
  }

  getExperimentsByType(type: Experiment['type']): Experiment[] {
    return this.getAllExperiments().filter(e => e.type === type);
  }

  startExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    if (experiment.status !== 'draft' && experiment.status !== 'paused') {
      throw new Error(`Experiment cannot be started from status: ${experiment.status}`);
    }

    experiment.status = 'running';
    experiment.startTime = Date.now();
    experiment.updatedAt = Date.now();

    this.emit('experiment_started', { experimentId: id });
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Started experiment:', id);
    }
  }

  pauseExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment cannot be paused from status: ${experiment.status}`);
    }

    experiment.status = 'paused';
    experiment.updatedAt = Date.now();

    this.emit('experiment_paused', { experimentId: id });
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Paused experiment:', id);
    }
  }

  resumeExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    if (experiment.status !== 'paused') {
      throw new Error(`Experiment cannot be resumed from status: ${experiment.status}`);
    }

    experiment.status = 'running';
    experiment.updatedAt = Date.now();

    this.emit('experiment_resumed', { experimentId: id });
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Resumed experiment:', id);
    }
  }

  completeExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    if (experiment.status !== 'running') {
      throw new Error(`Experiment cannot be completed from status: ${experiment.status}`);
    }

    // Determine winner before completing
    const results = this.determineWinner(id);

    experiment.status = 'completed';
    experiment.endTime = Date.now();
    experiment.updatedAt = Date.now();

    this.emit('experiment_completed', {
      experimentId: id,
      winner: results.winner,
    });
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Completed experiment:', id, 'Winner:', results.winner?.variantId);
    }
  }

  archiveExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    if (experiment.status !== 'completed') {
      throw new Error(`Only completed experiments can be archived`);
    }

    experiment.status = 'archived';
    experiment.updatedAt = Date.now();

    this.emit('experiment_archived', { experimentId: id });
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Archived experiment:', id);
    }
  }

  deleteExperiment(id: string): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    // Only allow deletion of draft or archived experiments
    if (experiment.status !== 'draft' && experiment.status !== 'archived') {
      throw new Error(`Cannot delete experiment with status: ${experiment.status}`);
    }

    this.experiments.delete(id);
    this.metricsTracker.clearExperimentData(id);
    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Deleted experiment:', id);
    }
  }

  updateExperiment(id: string, updates: Partial<Experiment>): void {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error(`Experiment not found: ${id}`);
    }

    // Only allow updates to draft experiments
    if (experiment.status !== 'draft') {
      throw new Error('Cannot update non-draft experiments');
    }

    // Apply updates
    Object.assign(experiment, updates, {
      updatedAt: Date.now(),
    });

    // Re-validate if variants or metrics changed
    if (updates.variants || updates.metrics) {
      validateExperiment(experiment);
    }

    // Re-normalize variant weights if they changed
    if (updates.variants) {
      experiment.variants = normalizeVariantWeights(experiment.variants);
    }

    this.saveToStorage();

    if (this.config.debug) {
      console.log('[Experiments] Updated experiment:', id);
    }
  }

  assignVariant(experimentId: string, userId: string, sessionId?: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      if (this.config.debug) {
        console.warn('[Experiments] Experiment not found:', experimentId);
      }
      return null;
    }

    // Check if experiment is running
    if (experiment.status !== 'running') {
      if (this.config.debug) {
        console.warn('[Experiments] Experiment not running:', experimentId);
      }
      return null;
    }

    // Check traffic allocation
    const hash = this.assignmentEngine.hashUserId(userId);
    if (hash > experiment.trafficAllocation * 100) {
      if (this.config.debug) {
        console.log('[Experiments] User not in traffic allocation:', userId);
      }
      return null;
    }

    // Get or create assignment
    const assignment = this.assignmentEngine.assignVariant(
      experimentId,
      userId,
      experiment.variants,
      sessionId
    );

    if (!assignment) {
      return null;
    }

    // Get variant
    const variant = experiment.variants.find(v => v.id === assignment.variantId);
    if (!variant) {
      console.error('[Experiments] Variant not found:', assignment.variantId);
      return null;
    }

    this.emit('user_assigned', {
      experimentId,
      userId,
      variantId: variant.id,
      sessionId,
    });

    return variant;
  }

  getAssignment(experimentId: string, userId: string) {
    return this.assignmentEngine.getAssignment(experimentId, userId);
  }

  trackMetric(
    experimentId: string,
    variantId: string,
    metricId: string,
    value: number,
    userId?: string,
    sessionId?: string
  ): void {
    if (!this.config.trackMetrics) {
      return;
    }

    this.metricsTracker.track({
      experimentId,
      variantId,
      metricId,
      value,
      timestamp: Date.now(),
      userId,
      sessionId,
    });

    this.emit('metric_recorded', {
      experimentId,
      variantId,
      metricId,
      value,
      userId,
      sessionId,
    });

    // Check for early stopping if enabled
    const experiment = this.experiments.get(experimentId);
    if (experiment?.earlyStoppingEnabled && experiment.status === 'running') {
      this.checkEarlyStopping(experimentId);
    }
  }

  getResults(experimentId: string) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return undefined;
    }

    const allMetrics = this.metricsTracker.getExperimentMetrics(experimentId);
    return this.statisticalAnalyzer.analyze(experiment, allMetrics);
  }

  determineWinner(experimentId: string) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const results = this.getResults(experimentId);
    if (!results) {
      throw new Error('No results available');
    }

    if (results.winner) {
      this.emit('winner_determined', {
        experimentId,
        winner: results.winner,
        results,
      });
    }

    return results;
  }

  applyWinner(experimentId: string): void {
    const results = this.determineWinner(experimentId);

    if (!results.winner) {
      throw new Error('No winner determined yet');
    }

    // Apply winner to feature flags or configuration
    // This is application-specific, so we emit an event
    this.emit('experiment_completed', {
      experimentId,
      winner: results.winner,
      action: 'apply_winner',
    });

    if (this.config.debug) {
      console.log('[Experiments] Applied winner for experiment:', experimentId, results.winner.variantId);
    }
  }

  addEventListener(type: ExperimentEventType, listener: ExperimentEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: ExperimentEventType, listener: ExperimentEventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  exportExperiments(): string {
    const data = {
      experiments: Array.from(this.experiments.values()),
      assignments: this.assignmentEngine.exportAssignments(),
      metrics: this.metricsTracker.exportMetrics(),
      banditStates: this.statisticalAnalyzer.exportBanditStates(),
    };
    return JSON.stringify(data, null, 2);
  }

  importExperiments(data: string): void {
    try {
      const parsed = JSON.parse(data);

      // Import experiments
      if (parsed.experiments) {
        this.experiments.clear();
        parsed.experiments.forEach((exp: Experiment) => {
          this.experiments.set(exp.id, exp);
        });
      }

      // Import assignments
      if (parsed.assignments) {
        this.assignmentEngine.importAssignments(parsed.assignments);
      }

      // Import metrics
      if (parsed.metrics) {
        this.metricsTracker.importMetrics(parsed.metrics);
      }

      // Import bandit states
      if (parsed.banditStates) {
        this.statisticalAnalyzer.importBanditStates(parsed.banditStates);
      }

      this.saveToStorage();

      if (this.config.debug) {
        console.log('[Experiments] Imported experiments successfully');
      }
    } catch (e) {
      throw new Error('Failed to import experiments: ' + (e as Error).message);
    }
  }

  /**
   * Calculate required sample size for experiment
   */
  private calculateSampleSize(
    experiment: Experiment,
    metric: Experiment['metrics'][0]
  ): number {
    // Simplified sample size calculation
    // In production, use proper statistical formulas
    const minSize = metric.minSampleSize || this.config.defaultMinSampleSize;
    const numVariants = experiment.variants.length;

    // Account for multiple comparisons
    return Math.ceil(minSize * numVariants * 1.5);
  }

  /**
   * Check if experiment should stop early
   */
  private checkEarlyStopping(experimentId: string): void {
    const results = this.getResults(experimentId);
    if (!results) {
      return;
    }

    const experiment = this.experiments.get(experimentId)!;

    // Check minimum sample size
    if (results.totalSampleSize < (experiment.minSampleSizeForStopping || experiment.targetSampleSize! / 2)) {
      return;
    }

    // Check if we have a clear winner
    if (results.winner && results.overallConfidence >= experiment.confidenceThreshold) {
      if (this.config.debug) {
        console.log('[Experiments] Early stopping triggered for experiment:', experimentId);
      }

      // Complete experiment with winner
      this.completeExperiment(experimentId);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(type: ExperimentEventType, data: Record<string, unknown>): void {
    const event: ExperimentEvent = {
      type,
      timestamp: Date.now(),
      experimentId: data.experimentId as string,
      data,
      userId: data.userId as string | undefined,
      sessionId: data.sessionId as string | undefined,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (e) {
          console.error('[Experiments] Error in event listener:', e);
        }
      });
    }
  }

  /**
   * Save experiments to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistAssignments || typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        experiments: Array.from(this.experiments.values()),
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[Experiments] Failed to save to storage:', e);
    }
  }

  /**
   * Load experiments from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      if (data.experiments) {
        data.experiments.forEach((exp: Experiment) => {
          this.experiments.set(exp.id, exp);
        });
      }

      if (this.config.debug) {
        console.log('[Experiments] Loaded experiments from storage');
      }
    } catch (e) {
      console.error('[Experiments] Failed to load from storage:', e);
    }
  }
}

// Global instance
let globalManager: ExperimentManager | null = null;

/**
 * Get global experiment manager instance
 */
export function getGlobalManager(config?: Partial<ExperimentConfig>): ExperimentManager {
  if (!globalManager) {
    globalManager = new ExperimentManager(config);
  }
  return globalManager;
}

/**
 * Reset global manager (useful for testing)
 */
export function resetGlobalManager(): void {
  globalManager = null;
}

/**
 * Initialize global experiment manager
 */
export async function initializeExperiments(config?: Partial<ExperimentConfig>): Promise<ExperimentManager> {
  const manager = getGlobalManager(config);
  await manager.initialize();
  return manager;
}
