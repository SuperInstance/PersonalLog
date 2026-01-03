/**
 * Intelligence Data Flow Integration
 *
 * Event bus and data pipelines for cross-system communication.
 * Ensures seamless data flow between analytics, experiments, optimization, and personalization.
 */

import type {
  IntelligenceEvent,
  IntelligenceEventListener,
  IntelligenceEventType,
  IntelligenceSystem,
  Conflict,
} from './types';
import type { IntelligenceHub } from './hub';

// ============================================================================
// EVENT BUS
// ============================================================================

export class IntelligenceEventBus {
  private listeners: Map<IntelligenceEventType, Set<IntelligenceEventListener>> = new Map();
  private hub: IntelligenceHub;

  constructor(hub: IntelligenceHub) {
    this.hub = hub;
  }

  /**
   * Subscribe to events
   */
  on(eventType: string, listener: IntelligenceEventListener): void {
    if (!this.listeners.has(eventType as IntelligenceEventType)) {
      this.listeners.set(eventType as IntelligenceEventType, new Set());
    }
    this.listeners.get(eventType as IntelligenceEventType)!.add(listener);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, listener: IntelligenceEventListener): void {
    const listeners = this.listeners.get(eventType as IntelligenceEventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to all subscribers
   */
  emit(event: IntelligenceEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[Intelligence Event Bus] Error in listener for ${event.type}:`, error);
        }
      }
    }
  }

  /**
   * Emit event from a specific system
   */
  emitFrom(system: IntelligenceSystem, eventType: IntelligenceEventType, data: Record<string, unknown>): void {
    this.emit({
      type: eventType,
      timestamp: Date.now(),
      source: system,
      data,
    });
  }

  /**
   * Get all event types with listeners
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get listener count for event type
   */
  getListenerCount(eventType: IntelligenceEventType): number {
    return this.listeners.get(eventType)?.size || 0;
  }
}

// ============================================================================
// DATA PIPELINES
// ============================================================================

/**
 * Coordinates data flow between systems:
 *
 * User Action → Analytics → Pattern Detection → Personalization Update
 *                          ↓
 *                     Performance Metrics → Optimization Trigger
 *                          ↓
 *                     Opportunity Detection → Experiment Creation
 *                          ↓
 *                     Experiment Results → Rollout Decision
 */
export class IntelligenceDataPipeline {
  private hub: IntelligenceHub;

  constructor(hub: IntelligenceHub) {
    this.hub = hub;
  }

  /**
   * Process user action through the pipeline
   */
  async processUserAction(action: {
    type: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    // Step 1: Track in analytics
    await this.trackAction(action);

    // Step 2: Detect patterns
    const patterns = await this.detectPatterns(action);

    // Step 3: Update personalization if patterns found
    if (patterns.length > 0) {
      await this.updatePersonalization(patterns);
    }

    // Step 4: Check if optimization needed
    const shouldOptimize = await this.checkOptimizationNeed(action);
    if (shouldOptimize) {
      await this.triggerOptimization();
    }
  }

  /**
   * Track action in analytics
   */
  private async trackAction(action: {
    type: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    // Emit to analytics
    this.hub.emitEvent({
      type: 'analytics:event_recorded',
      timestamp: Date.now(),
      source: 'analytics',
      data: action,
    });
  }

  /**
   * Detect patterns from action
   */
  private async detectPatterns(action: {
    type: string;
    context: Record<string, unknown>;
  }): Promise<any[]> {
    // This would analyze the action for patterns
    // For now, emit event and let personalization system handle it
    this.hub.emitEvent({
      type: 'personalization:pattern_detected',
      timestamp: Date.now(),
      source: 'personalization',
      data: { action },
    });

    return [];
  }

  /**
   * Update personalization based on patterns
   */
  private async updatePersonalization(patterns: any[]): Promise<void> {
    // Emit event to trigger personalization update
    this.hub.emitEvent({
      type: 'personalization:adaptation_applied',
      timestamp: Date.now(),
      source: 'personalization',
      data: { patterns },
    });
  }

  /**
   * Check if optimization is needed
   */
  private async checkOptimizationNeed(action: {
    type: string;
    context: Record<string, unknown>;
  }): Promise<boolean> {
    // Check if action indicates performance issue
    if (action.type === 'error_occurred' || action.type === 'performance_degraded') {
      return true;
    }

    return false;
  }

  /**
   * Trigger optimization workflow
   */
  private async triggerOptimization(): Promise<void> {
    this.hub.emitEvent({
      type: 'optimization:suggested',
      timestamp: Date.now(),
      source: 'optimization',
      data: { trigger: 'performance_issue' },
    });
  }

  /**
   * Process experiment results
   */
  async processExperimentResults(results: {
    experimentId: string;
    winner: string;
    impact: number;
  }): Promise<void> {
    // Step 1: Check for conflicts
    const conflicts = await this.checkConflicts(results);
    if (conflicts.length > 0) {
      for (const conflict of conflicts) {
        this.hub.emitEvent({
          type: 'intelligence:conflict_detected',
          timestamp: Date.now(),
          source: 'hub',
          data: { conflict },
        });
      }
      return;
    }

    // Step 2: Apply winner if auto-rollout enabled
    const settings = this.hub.getSettings();
    if (settings.experiments.autoRollout) {
      await this.applyExperimentWinner(results);
    }

    // Step 3: Track in analytics
    this.hub.emitEvent({
      type: 'experiments:winner_determined',
      timestamp: Date.now(),
      source: 'experiments',
      data: results,
    });
  }

  /**
   * Check for conflicts with other systems
   */
  private async checkConflicts(results: {
    experimentId: string;
    winner: string;
    impact: number;
  }): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check if conflicts with personalization
    // For example, if experiment changes UI but user prefers current UI

    // Check if conflicts with optimization
    // For example, if experiment changes performance settings

    return conflicts;
  }

  /**
   * Apply experiment winner
   */
  private async applyExperimentWinner(results: {
    experimentId: string;
    winner: string;
    impact: number;
  }): Promise<void> {
    // Apply the winning variant
    this.hub.emitEvent({
      type: 'experiments:experiment_completed',
      timestamp: Date.now(),
      source: 'experiments',
      data: { ...results, action: 'rollout' },
    });
  }
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export class ConflictResolver {
  private hub: IntelligenceHub;

  constructor(hub: IntelligenceHub) {
    this.hub = hub;
  }

  /**
   * Resolve conflict between systems based on priority
   */
  resolve(conflict: Conflict): Conflict {
    const priority = this.hub.getSettings().coordination.priority;

    // Determine which system takes precedence
    const prioritySystem = priority.find(p => conflict.systems.includes(p as IntelligenceSystem));

    if (!prioritySystem) {
      // No clear priority, don't resolve
      return conflict;
    }

    // Resolve based on priority
    const resolution = {
      action: `Priority given to ${prioritySystem}`,
      priority: prioritySystem as any,
      resolvedBy: 'auto' as const,
      resolvedAt: Date.now(),
    };

    return {
      ...conflict,
      resolution,
    };
  }

  /**
   * Check if two systems have conflicting operations
   */
  checkConflict(
    system1: IntelligenceSystem,
    operation1: string,
    system2: IntelligenceSystem,
    operation2: string
  ): Conflict | null {
    // Define known conflicts
    const conflicts: Array<{
      s1: IntelligenceSystem;
      op1: string;
      s2: IntelligenceSystem;
      op2: string;
    }> = [
      {
        s1: 'personalization',
        op1: 'adapt_ui',
        s2: 'experiments',
        op2: 'test_ui_variant',
      },
      {
        s1: 'optimization',
        op1: 'change_cache_size',
        s2: 'personalization',
        op2: 'adjust_memory_preference',
      },
    ];

    const conflict = conflicts.find(
      c => c.s1 === system1 && c.op1 === operation1 && c.s2 === system2 && c.op2 === operation2
    );

    if (conflict) {
      return {
        id: `conflict-${Date.now()}`,
        systems: [system1, system2],
        severity: 'medium',
        description: `Conflict between ${system1}.${operation1} and ${system2}.${operation2}`,
        detectedAt: Date.now(),
      };
    }

    return null;
  }
}

// ============================================================================
// INTEGRATION COORDINATOR
// ============================================================================

/**
 * High-level coordinator for all data flow and integration
 */
export class IntegrationCoordinator {
  private hub: IntelligenceHub;
  private pipeline: IntelligenceDataPipeline;
  private resolver: ConflictResolver;

  constructor(hub: IntelligenceHub) {
    this.hub = hub;
    this.pipeline = new IntelligenceDataPipeline(hub);
    this.resolver = new ConflictResolver(hub);
  }

  /**
   * Coordinate a user action through all systems
   */
  async coordinateAction(action: {
    type: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    // Process through pipeline
    await this.pipeline.processUserAction(action);
  }

  /**
   * Coordinate experiment completion
   */
  async coordinateExperimentCompletion(results: {
    experimentId: string;
    winner: string;
    impact: number;
  }): Promise<void> {
    await this.pipeline.processExperimentResults(results);
  }

  /**
   * Resolve conflicts
   */
  resolveConflicts(conflicts: Conflict[]): Conflict[] {
    return conflicts.map(c => this.resolver.resolve(c));
  }

  /**
   * Check for potential conflicts
   */
  checkForConflicts(
    system: IntelligenceSystem,
    operation: string
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    const systems: IntelligenceSystem[] = ['analytics', 'experiments', 'optimization', 'personalization'];

    for (const otherSystem of systems) {
      if (otherSystem === system) continue;

      const conflict = this.resolver.checkConflict(system, operation, otherSystem, '*');
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    return conflicts;
  }
}
