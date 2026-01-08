/**
 * Intelligence Hub - Central Coordination System
 *
 * Orchestrates all intelligence components including proactive engine,
 * MPC controller, world model, and scenario simulator.
 */

import type {
  IntelligenceSettings,
  SystemHealth,
  Recommendation,
  Conflict,
  Bottleneck,
  SystemEvent,
  EventListener,
} from '../types';

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceSettings = {
  enabled: true,
  level: 'full',
  analytics: {
    enabled: true,
    retention: 30,
    sampleRate: 1.0,
  },
  personalization: {
    enabled: true,
    sensitivity: 'medium',
    explainability: true,
  },
  proactive: {
    enabled: true,
    aggressiveness: 'moderate',
    autoActivate: false,
  },
  coordination: {
    allowConflicts: false,
    priority: ['personalization', 'proactive', 'analytics'],
    syncInterval: 5,
  },
};

// ============================================================================
// INTELLIGENCE HUB
// ============================================================================

export class IntelligenceHub {
  private static instance: IntelligenceHub | null = null;

  private initialized = false;
  private settings: IntelligenceSettings;
  private eventListeners: Map<string, Set<EventListener>> = new Map();

  // State
  private conflicts: Conflict[] = [];
  private bottlenecks: Bottleneck[] = [];
  private recommendations: Recommendation[] = [];

  private constructor() {
    this.settings = { ...DEFAULT_INTELLIGENCE_SETTINGS };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IntelligenceHub {
    if (!IntelligenceHub.instance) {
      IntelligenceHub.instance = new IntelligenceHub();
    }
    return IntelligenceHub.instance;
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Initialize the intelligence hub
   */
  async initialize(settings?: Partial<IntelligenceSettings>): Promise<void> {
    if (this.initialized) {
      console.log('[Intelligence Hub] Already initialized');
      return;
    }

    console.log('[Intelligence Hub] Initializing...');

    // Apply settings
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }

    try {
      // Initialize subsystems would go here
      // For now, just log initialization

      this.initialized = true;
      console.log('[Intelligence Hub] Initialization complete');

      this.emitEvent({
        type: 'hub:initialized',
        timestamp: Date.now(),
        source: 'hub',
        data: { settings: this.settings },
      });
    } catch (error) {
      console.error('[Intelligence Hub] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown the intelligence hub
   */
  async shutdown(): Promise<void> {
    console.log('[Intelligence Hub] Shutting down...');

    this.initialized = false;
    console.log('[Intelligence Hub] Shutdown complete');
  }

  // ========================================================================
  // SETTINGS
  // ========================================================================

  /**
   * Get current settings
   */
  getSettings(): IntelligenceSettings {
    return { ...this.settings };
  }

  /**
   * Update settings
   */
  updateSettings(updates: Partial<IntelligenceSettings>): void {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...updates };

    console.log('[Intelligence Hub] Settings updated', updates);

    // Emit settings changed event
    this.emitEvent({
      type: 'hub:settings_changed',
      timestamp: Date.now(),
      source: 'hub',
      data: { oldSettings, newSettings: this.settings, updates },
    });
  }

  // ========================================================================
  // HEALTH & INSIGHTS
  // ========================================================================

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return {
      status: 'healthy',
      conflicts: this.conflicts,
      bottlenecks: this.bottlenecks,
      recommendations: this.recommendations.slice(-10),
    };
  }

  /**
   * Get active conflicts
   */
  getConflicts(): Conflict[] {
    return [...this.conflicts];
  }

  /**
   * Get active bottlenecks
   */
  getBottlenecks(): Bottleneck[] {
    return [...this.bottlenecks];
  }

  /**
   * Get recommendations
   */
  getRecommendations(): Recommendation[] {
    return [...this.recommendations];
  }

  /**
   * Add a recommendation
   */
  addRecommendation(recommendation: Recommendation): void {
    this.recommendations.push(recommendation);

    // Keep only last 100 recommendations
    if (this.recommendations.length > 100) {
      this.recommendations = this.recommendations.slice(-100);
    }

    this.emitEvent({
      type: 'hub:recommendation_added',
      timestamp: Date.now(),
      source: 'hub',
      data: { recommendation },
    });
  }

  // ========================================================================
  // EVENT SYSTEM
  // ========================================================================

  /**
   * Subscribe to events
   */
  on(eventType: string, listener: EventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: SystemEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Emit a custom event
   */
  emit(eventType: string, data: Record<string, unknown>): void {
    this.emitEvent({
      type: eventType,
      timestamp: Date.now(),
      source: 'hub',
      data,
    });
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Get the intelligence hub singleton
 */
export function getIntelligenceHub(): IntelligenceHub {
  return IntelligenceHub.getInstance();
}

/**
 * Initialize intelligence hub
 */
export async function initializeIntelligence(
  settings?: Partial<IntelligenceSettings>
): Promise<IntelligenceHub> {
  const hub = getIntelligenceHub();
  await hub.initialize(settings);
  return hub;
}
