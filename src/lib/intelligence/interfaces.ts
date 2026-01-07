/**
 * Intelligence Interfaces
 *
 * Interfaces to break circular dependencies between intelligence modules.
 * These interfaces allow dependency injection without creating import cycles.
 */

import type {
  IntelligenceEvent,
  IntelligenceEventListener,
  IntelligenceSettings,
  SystemHealthStatus,
  UnifiedInsights,
  Recommendation,
  Conflict,
  Bottleneck,
} from './types';

// ============================================================================
// INTELLIGENCE HUB INTERFACE
// ============================================================================

/**
 * Interface for IntelligenceHub
 *
 * This interface breaks circular dependencies between:
 * - hub.ts and workflows.ts
 * - hub.ts and data-flow.ts
 *
 * Modules can depend on this interface instead of the concrete class.
 */
export interface IIntelligenceHub {
  // Lifecycle
  initialize(settings?: Partial<IntelligenceSettings>): Promise<void>;
  shutdown(): Promise<void>;

  // Settings
  getSettings(): IntelligenceSettings;
  updateSettings(updates: Partial<IntelligenceSettings>): void;

  // Coordinated operations
  analyzeAndOptimize(): Promise<Recommendation[]>;
  runExperiments(): Promise<any[]>;
  personalizeAndAdapt(): Promise<void>;
  generateInsights(): Promise<UnifiedInsights>;

  // System health
  getSystemHealth(): Promise<SystemHealthStatus>;

  // Conflicts and recommendations
  getConflicts(): Conflict[];
  getBottlenecks(): Bottleneck[];
  getRecommendations(): Recommendation[];

  // Event system
  on(eventType: string, listener: IntelligenceEventListener): void;
  off(eventType: string, listener: IntelligenceEventListener): void;
  emitEvent(event: IntelligenceEvent): void;

  // Lifecycle
  destroy(): Promise<void>;
}
