/**
 * Intelligence System - Public API
 *
 * Unified coordination of all self-improving systems:
 * - Analytics (usage tracking)
 * - Experiments (A/B testing)
 * - Optimization (performance tuning)
 * - Personalization (preference learning)
 *
 * @example
 * ```typescript
 * import { intelligence } from '@/lib/intelligence'
 *
 * // Initialize on app startup
 * await intelligence.initialize()
 *
 * // Get unified insights
 * const insights = await intelligence.getInsights()
 *
 * // Update settings
 * intelligence.updateSettings({ level: 'full' })
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Core types
  IntelligenceSystem,
  SystemHealth,
  IntelligenceLevel,
  OptimizationPriority,
  // Configuration
  IntelligenceSettings,
  // Health
  SystemHealthStatus,
  Conflict,
  Bottleneck,
  Recommendation,
  // Insights
  UnifiedInsights,
  AnalyticsInsights,
  ExperimentsInsights,
  OptimizationInsights,
  PersonalizationInsights,
  // Workflows
  WorkflowExecution,
  WorkflowStep,
  WorkflowResult,
  // Events
  IntelligenceEvent,
  IntelligenceEventType,
  IntelligenceEventListener,
  // State
  IntelligenceState,
} from './types';

export { DEFAULT_INTELLIGENCE_SETTINGS } from './types';

// ============================================================================
// CLASS EXPORTS
// ============================================================================

export {
  IntelligenceHub,
  getIntelligenceHub,
  initializeIntelligence,
} from './hub';

export {
  IntelligenceEventBus,
  IntelligenceDataPipeline,
  ConflictResolver,
  IntegrationCoordinator,
} from './data-flow';

export {
  generateDailyOptimizationWorkflow,
  generateContinuousPersonalizationWorkflow,
  generatePerformanceRecoveryWorkflow,
  generateFeatureRolloutWorkflow,
  generateAdaptiveInterfaceWorkflow,
  WorkflowExecutor,
  WorkflowScheduler,
} from './workflows';

export {
  IntelligenceSettingsManager,
  getSettingsManager,
  getIntelligenceSettings,
  updateIntelligenceSettings,
  resetIntelligenceSettings,
} from './settings';

// ============================================================================
// UNIFIED API
// ============================================================================

import { IntelligenceHub, getIntelligenceHub } from './hub';
import type {
  IntelligenceSettings,
  UnifiedInsights,
  SystemHealthStatus,
  Recommendation,
  Conflict,
  Bottleneck,
  IntelligenceEvent,
  IntelligenceEventListener,
} from './types';

/**
 * Unified intelligence API
 */
class IntelligenceAPI {
  private hub: IntelligenceHub;

  constructor() {
    this.hub = getIntelligenceHub();
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Initialize all intelligence systems
   */
  async initialize(settings?: Partial<IntelligenceSettings>): Promise<void> {
    await this.hub.initialize(settings);
  }

  /**
   * Shutdown all intelligence systems
   */
  async shutdown(): Promise<void> {
    await this.hub.shutdown();
  }

  // ========================================================================
  // SETTINGS
  // ========================================================================

  /**
   * Get current settings
   */
  getSettings(): IntelligenceSettings {
    return this.hub.getSettings();
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<IntelligenceSettings>): void {
    this.hub.updateSettings(updates);
  }

  // ========================================================================
  // COORDINATED OPERATIONS
  // ========================================================================

  /**
   * Analyze and optimize - daily workflow
   */
  async analyzeAndOptimize(): Promise<Recommendation[]> {
    return this.hub.analyzeAndOptimize();
  }

  /**
   * Run experiments
   */
  async runExperiments(): Promise<any[]> {
    return this.hub.runExperiments();
  }

  /**
   * Personalize and adapt - continuous workflow
   */
  async personalizeAndAdapt(): Promise<void> {
    return this.hub.personalizeAndAdapt();
  }

  /**
   * Generate unified insights from all systems
   */
  async getInsights(): Promise<UnifiedInsights> {
    return this.hub.generateInsights();
  }

  // ========================================================================
  // SYSTEM HEALTH
  // ========================================================================

  /**
   * Get health status of all systems
   */
  async getHealth(): Promise<SystemHealthStatus> {
    return this.hub.getSystemHealth();
  }

  /**
   * Get active conflicts
   */
  getConflicts(): Conflict[] {
    return this.hub.getConflicts();
  }

  /**
   * Get active bottlenecks
   */
  getBottlenecks(): Bottleneck[] {
    return this.hub.getBottlenecks();
  }

  /**
   * Get recommendations
   */
  getRecommendations(): Recommendation[] {
    return this.hub.getRecommendations();
  }

  // ========================================================================
  // EVENTS
  // ========================================================================

  /**
   * Subscribe to intelligence events
   */
  on(eventType: string, listener: IntelligenceEventListener): void {
    this.hub.on(eventType, listener);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, listener: IntelligenceEventListener): void {
    this.hub.off(eventType, listener);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const intelligence = new IntelligenceAPI();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize intelligence system
 */
export async function setupIntelligence(
  settings?: Partial<IntelligenceSettings>
): Promise<void> {
  await intelligence.initialize(settings);
}

/**
 * Get unified insights
 */
export async function getIntelligenceInsights(): Promise<UnifiedInsights> {
  return intelligence.getInsights();
}

/**
 * Get system health
 */
export async function getIntelligenceHealth(): Promise<SystemHealthStatus> {
  return intelligence.getHealth();
}

/**
 * Update intelligence settings
 */
export function setIntelligenceSettings(
  updates: Partial<IntelligenceSettings>
): void {
  intelligence.updateSettings(updates);
}

/**
 * Get intelligence settings
 */
export function getIntelligenceSettingsConfig(): IntelligenceSettings {
  return intelligence.getSettings();
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default intelligence;

// Re-export as named export for convenience
export { intelligence };
