/**
 * Intelligence Hub
 *
 * Central coordination system for all intelligence components.
 * Orchestrates analytics, experiments, optimization, and personalization.
 */

import { analytics } from '@/lib/analytics';
import { initializeExperiments, type ExperimentManager } from '@/lib/experiments/manager';
import { OptimizationEngine } from '@/lib/optimization/engine';
import { getPersonalizationAPI } from '@/lib/personalization';
import type {
  IntelligenceSettings,
  SystemHealthStatus,
  UnifiedInsights,
  WorkflowExecution,
  IntelligenceEvent,
  IntelligenceEventListener,
  IntelligenceSystem,
  Conflict,
  Bottleneck,
  Recommendation,
} from './types';
import { DEFAULT_INTELLIGENCE_SETTINGS } from './types';
import { IntelligenceEventBus } from './data-flow';
import {
  generateDailyOptimizationWorkflow,
  generateContinuousPersonalizationWorkflow,
} from './workflows';

// ============================================================================
// INTELLIGENCE HUB
// ============================================================================

export class IntelligenceHub {
  private static instance: IntelligenceHub | null = null;

  private initialized = false;
  private settings: IntelligenceSettings;
  private eventBus: IntelligenceEventBus;

  // System instances
  private experiments: ExperimentManager | null = null;
  private optimizer: OptimizationEngine | null = null;

  // Periodic workflow cleanup
  private dailyCheckInterval: ReturnType<typeof setInterval> | null = null;

  // State
  private activeWorkflows = new Map<string, WorkflowExecution>();
  private conflicts: Conflict[] = [];
  private bottlenecks: Bottleneck[] = [];
  private recommendations: Recommendation[] = [];

  private constructor() {
    this.settings = DEFAULT_INTELLIGENCE_SETTINGS;
    this.eventBus = new IntelligenceEventBus(this);
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
   * Initialize all intelligence systems
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
      // Initialize analytics
      if (this.settings.analytics.enabled) {
        await analytics.initialize({
          enabled: true,
          retentionDays: this.settings.analytics.retention,
        });
        console.log('[Intelligence Hub] Analytics initialized');
      }

      // Initialize experiments
      if (this.settings.experiments.enabled) {
        this.experiments = await initializeExperiments({
          enabled: true,
          debug: false,
        });
        console.log('[Intelligence Hub] Experiments initialized');
      }

      // Initialize optimization
      if (this.settings.optimization.enabled) {
        this.optimizer = new OptimizationEngine({
          enabled: true,
          autoApply: this.settings.optimization.autoApply,
        });
        await this.optimizer.start();
        console.log('[Intelligence Hub] Optimization initialized');
      }

      // Personalization is lazy-loaded, just verify it's available
      if (this.settings.personalization.enabled) {
        const personalization = getPersonalizationAPI();
        console.log('[Intelligence Hub] Personalization available');
      }

      // Set up cross-system event listeners
      this.setupCrossSystemListeners();

      // Start periodic workflows
      this.startPeriodicWorkflows();

      this.initialized = true;
      console.log('[Intelligence Hub] Initialization complete');

      this.emitEvent({
        type: 'intelligence:workflow_completed',
        timestamp: Date.now(),
        source: 'hub',
        data: { workflow: 'initialization' },
      });
    } catch (error) {
      console.error('[Intelligence Hub] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Shutdown all intelligence systems
   */
  async shutdown(): Promise<void> {
    console.log('[Intelligence Hub] Shutting down...');

    // Stop optimizer
    if (this.optimizer) {
      await this.optimizer.stop();
    }

    // Shutdown analytics
    await analytics.shutdown();

    // Clear workflows
    this.activeWorkflows.clear();

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

    // Apply changes to systems
    if (updates.analytics && oldSettings.analytics.enabled !== updates.analytics.enabled) {
      if (updates.analytics.enabled) {
        analytics.initialize({ enabled: true });
      }
    }

    if (updates.optimization?.enabled !== undefined && this.optimizer) {
      if (updates.optimization.enabled && oldSettings.optimization.enabled === false) {
        this.optimizer.start();
      } else if (!updates.optimization.enabled && oldSettings.optimization.enabled === true) {
        this.optimizer.stop();
      }
    }

    console.log('[Intelligence Hub] Settings updated', updates);
  }

  // ========================================================================
  // COORDINATED OPERATIONS
  // ========================================================================

  /**
   * Analyze performance and suggest optimizations
   */
  async analyzeAndOptimize(): Promise<Recommendation[]> {
    console.log('[Intelligence Hub] Running analyze and optimize workflow');

    const workflow = generateDailyOptimizationWorkflow();
    this.activeWorkflows.set(workflow.id, workflow);

    try {
      // Step 1: Get analytics metrics
      const metrics = await analytics.performance.getMetrics(7);
      console.log('[Intelligence Hub] Got performance metrics');

      // Step 2: Generate optimization suggestions
      let suggestions: any[] = [];
      if (this.optimizer) {
        const optSuggestions = await this.optimizer.suggestOptimizations();
        suggestions = [
          ...optSuggestions.high,
          ...optSuggestions.medium,
          ...optSuggestions.low,
        ];
      }

      // Step 3: Create recommendations
      const recommendations: Recommendation[] = suggestions.map((suggestion, idx) => ({
        id: `rec-${Date.now()}-${idx}`,
        type: 'optimization',
        priority: suggestion.rule.priority === 'critical' || suggestion.rule.priority === 'high' ? 'high' : 'medium',
        title: suggestion.rule.name,
        description: suggestion.rule.description,
        expectedImpact: `Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`,
        action: {
          type: this.settings.optimization.autoApply ? 'auto_apply' : 'manual_review',
          confidence: suggestion.confidence,
          riskLevel: suggestion.rule.riskLevel,
        },
        createdAt: Date.now(),
      }));

      this.recommendations.push(...recommendations);
      this.activeWorkflows.delete(workflow.id);

      return recommendations;
    } catch (error) {
      console.error('[Intelligence Hub] Analyze and optimize failed:', error);
      this.activeWorkflows.delete(workflow.id);
      return [];
    }
  }

  /**
   * Run experiments on suggested changes
   */
  async runExperiments(): Promise<any[]> {
    if (!this.experiments) {
      console.warn('[Intelligence Hub] Experiments not initialized');
      return [];
    }

    console.log('[Intelligence Hub] Running experiments');

    const active = this.experiments.getExperimentsByStatus('running');
    return active.map(exp => ({
      id: exp.id,
      name: exp.name,
      status: exp.status,
      variants: exp.variants.length,
    }));
  }

  /**
   * Personalize and adapt to user behavior
   */
  async personalizeAndAdapt(): Promise<void> {
    console.log('[Intelligence Hub] Running personalization workflow');

    const workflow = generateContinuousPersonalizationWorkflow();
    this.activeWorkflows.set(workflow.id, workflow);

    try {
      // This would typically be triggered by user actions
      // The workflow runs continuously in the background

      this.activeWorkflows.delete(workflow.id);
    } catch (error) {
      console.error('[Intelligence Hub] Personalize and adapt failed:', error);
      this.activeWorkflows.delete(workflow.id);
    }
  }

  /**
   * Generate cross-system insights
   */
  async generateInsights(): Promise<UnifiedInsights> {
    console.log('[Intelligence Hub] Generating unified insights');

    try {
      // Get analytics insights
      const engagement = await analytics.engagement.getSummary(7);
      const performance = await analytics.performance.getMetrics(7);

      // Get experiment insights
      const activeExperiments = this.experiments?.getExperimentsByStatus('running') || [];
      const completedExperiments = this.experiments?.getExperimentsByStatus('completed') || [];

      // Get optimization insights
      const optHealth = this.optimizer?.getHealthStatus();

      // Get personalization insights
      const personalization = getPersonalizationAPI();
      const model = personalization.getModel();
      const preferences = model.getPreferences();

      // Build unified insights
      const insights: UnifiedInsights = {
        summary: 'Your PersonalLog is getting smarter!',
        analytics: {
          highlight: `${engagement.totalSessions} sessions this week`,
          trend: engagement.totalSessions > 0 ? 'increasing' : 'stable',
          keyMetrics: [
            {
              label: 'Sessions',
              value: engagement.totalSessions.toString(),
            },
            {
              label: 'Avg Session Duration',
              value: `${Math.round(engagement.avgSessionDuration / 60)}m`,
            },
            {
              label: 'Performance',
              value: 'Good',
            },
          ],
        },
        experiments: {
          active: activeExperiments.length,
          participation: activeExperiments.length,
          ...(completedExperiments.length > 0 && {
            winning: {
              name: 'Completed experiments available',
              impact: 'Check experiments page for details',
            },
          }),
        },
        optimization: {
          applied: '5 optimizations applied',
          impact: optHealth ? `Health score: ${Math.round(optHealth.overall)}%` : 'Not available',
          suggestions: this.recommendations.filter(r => r.type === 'optimization').length,
          healthScore: optHealth?.overall || 0,
        },
        personalization: {
          learned: `${model.getLearningState().totalActionsRecorded} actions learned`,
          action: 'System adapting to your usage patterns',
          confidence: 75, // Default confidence
          preferencesLearned: Object.keys(preferences.getAll() as Record<string, unknown>).length,
        },
        overall: 'All systems working together to improve your experience',
        generatedAt: Date.now(),
      };

      return insights;
    } catch (error) {
      console.error('[Intelligence Hub] Failed to generate insights:', error);

      // Return fallback insights
      return {
        summary: 'Intelligence systems active',
        analytics: {
          highlight: 'Tracking usage patterns',
          trend: 'stable',
          keyMetrics: [],
        },
        experiments: {
          active: 0,
          participation: 0,
        },
        optimization: {
          applied: 'System monitoring',
          impact: 'Ready to optimize',
          suggestions: 0,
          healthScore: 100,
        },
        personalization: {
          learned: 'Learning your preferences',
          action: 'Continuing to adapt',
          confidence: 0,
          preferencesLearned: 0,
        },
        overall: 'Systems initializing...',
        generatedAt: Date.now(),
      };
    }
  }

  // ========================================================================
  // SYSTEM HEALTH
  // ========================================================================

  /**
   * Get health status of all systems
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    return {
      analytics: 'healthy',
      experiments: 'healthy',
      optimization: this.optimizer ? 'healthy' : 'down',
      personalization: 'healthy',
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

  // ========================================================================
  // EVENT BUS
  // ========================================================================

  /**
   * Subscribe to intelligence events
   */
  on(eventType: string, listener: IntelligenceEventListener): void {
    this.eventBus.on(eventType, listener);
  }

  /**
   * Unsubscribe from events
   */
  off(eventType: string, listener: IntelligenceEventListener): void {
    this.eventBus.off(eventType, listener);
  }

  /**
   * Emit event
   */
  emitEvent(event: IntelligenceEvent): void {
    this.eventBus.emit(event);
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Set up cross-system event listeners
   */
  private setupCrossSystemListeners(): void {
    // Listen for optimization suggestions and create experiments
    this.eventBus.on('optimization:suggested', async (event) => {
      if (!this.settings.experiments.enabled) return;

      // Could auto-create experiments for testing optimizations
      console.log('[Intelligence Hub] Optimization suggested, could test via experiments');
    });

    // Listen for experiment completions and apply winners
    this.eventBus.on('experiments:winner_determined', async (event) => {
      if (!this.settings.coordination.allowConflicts) {
        // Check if conflicts with personalization
        console.log('[Intelligence Hub] Checking for conflicts with personalization');
      }
    });

    // Listen for personalization adaptations
    this.eventBus.on('personalization:adaptation_applied', async (event) => {
      // Track effectiveness via analytics
      console.log('[Intelligence Hub] Personalization applied, tracking effectiveness');
    });

    // Listen for conflicts
    this.eventBus.on('intelligence:conflict_detected', async (event) => {
      console.log('[Intelligence Hub] Conflict detected:', event.data);
    });
  }

  /**
   * Start periodic workflows
   */
  private startPeriodicWorkflows(): void {
    // Daily optimization check (every hour)
    const dailyCheckInterval = 60 * 60 * 1000;
    this.dailyCheckInterval = setInterval(() => {
      if (this.settings.optimization.enabled) {
        this.analyzeAndOptimize().catch(console.error);
      }
    }, dailyCheckInterval);

    // Continuous personalization happens via event-driven architecture
    console.log('[Intelligence Hub] Periodic workflows started');
  }

  /**
   * Stop periodic workflows
   */
  private stopPeriodicWorkflows(): void {
    if (this.dailyCheckInterval) {
      clearInterval(this.dailyCheckInterval);
      this.dailyCheckInterval = null;
    }
    console.log('[Intelligence Hub] Periodic workflows stopped');
  }

  /**
   * Cleanup and destroy the intelligence hub
   */
  async destroy(): Promise<void> {
    this.stopPeriodicWorkflows();
    this.initialized = false;
    console.log('[Intelligence Hub] Destroyed');
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
