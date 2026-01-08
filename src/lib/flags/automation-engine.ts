/**
 * Feature Flag Automation Engine
 *
 * Monitors world model predictions and automatically adjusts feature flags
 * to optimize resource usage and user experience.
 */

import type {
  AutomationFlag,
  AutomationFlagState,
  AutomationAction,
  AutomationActionType,
  AutomationConfig,
  AutomationRule,
  AutomationMetrics,
  AutomationExecutionResult,
  AutomationNotification,
  FlagChangeHistory,
  FlagCondition,
  ConditionGroup,
  ResourceImpact,
  FlagPriority,
} from './automation-types';
import {
  DEFAULT_AUTOMATION_CONFIG,
  PRIORITY_VALUES,
  isValidAutomationFlagState,
  isValidFlagPriority,
  isValidConfidence,
  isValidResourceImpact,
} from './automation-types';
import type {
  PredictedState,
  ResourcePrediction,
  ConversationState,
} from '@/lib/intelligence/world-model-types';
import { getWorldModel } from '@/lib/intelligence/world-model';
import { getGlobalManager } from './manager';

// ============================================================================
// AUTOMATION FLAG DEFINITIONS
// ============================================================================

/**
 * Default automation flags
 * Maps existing features to automation configurations
 */
export const AUTOMATION_FLAGS: AutomationFlag[] = [
  // AI Features
  {
    id: 'ai.local_models',
    name: 'Local AI Models',
    description: 'Support for running AI models locally via Ollama',
    state: 'auto',
    priority: 'high',
    performanceImpact: 70,
    dependencies: [],
    enableConditions: [
      {
        id: 'sufficient-resources',
        name: 'Sufficient Resources',
        conditions: [
          { type: 'memory_usage', operator: 'less_than', value: 70, weight: 1.0, required: true },
          { type: 'cpu_usage', operator: 'less_than', value: 80, weight: 0.8, required: false },
        ],
        operator: 'AND',
        minScore: 0.7,
      },
    ],
    disableConditions: [
      {
        id: 'low-resources',
        name: 'Low Resources',
        conditions: [
          { type: 'memory_usage', operator: 'greater_than', value: 85, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 2000,
    cooldownPeriod: 300000,
    lastChanged: 0,
    tags: ['ai', 'local', 'resource-intensive'],
  },
  {
    id: 'ai.parallel_processing',
    name: 'Parallel AI Processing',
    description: 'Process multiple AI requests simultaneously',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 40,
    dependencies: ['ai.streaming_responses'],
    enableConditions: [
      {
        id: 'good-performance',
        name: 'Good Performance',
        conditions: [
          { type: 'cpu_usage', operator: 'less_than', value: 60, weight: 1.0, required: true },
          { type: 'memory_usage', operator: 'less_than', value: 70, weight: 0.9, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    disableConditions: [
      {
        id: 'high-load',
        name: 'High Load',
        conditions: [
          { type: 'cpu_usage', operator: 'greater_than', value: 80, weight: 1.0, required: true },
          { type: 'system_load', operator: 'greater_than', value: 0.8, weight: 0.9, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 1000,
    cooldownPeriod: 120000,
    lastChanged: 0,
    tags: ['ai', 'performance', 'parallel'],
  },

  // JEPA Features
  {
    id: 'jepa.realtime',
    name: 'Real-time JEPA Transcription',
    description: 'Live transcription with JEPA subtext analysis during recording',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 85,
    dependencies: ['jepa.transcription'],
    enableConditions: [
      {
        id: 'realtime-resources',
        name: 'Real-time Resources',
        conditions: [
          { type: 'cpu_usage', operator: 'less_than', value: 50, weight: 1.0, required: true },
          { type: 'memory_usage', operator: 'less_than', value: 60, weight: 1.0, required: true },
          { type: 'battery_charging', operator: 'equals', value: true, weight: 0.5, required: false },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    disableConditions: [
      {
        id: 'realtime-high-load',
        name: 'Real-time High Load',
        conditions: [
          { type: 'cpu_usage', operator: 'greater_than', value: 70, weight: 1.0, required: true },
          { type: 'battery_level', operator: 'less_than', value: 20, weight: 0.9, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 500,
    cooldownPeriod: 60000,
    lastChanged: 0,
    tags: ['jepa', 'realtime', 'resource-intensive'],
  },
  {
    id: 'jepa.multimodal',
    name: 'JEPA Multimodal Analysis',
    description: 'Facial expression + voice emotion analysis',
    state: 'auto',
    priority: 'low',
    performanceImpact: 90,
    dependencies: ['jepa.transcription'],
    enableConditions: [
      {
        id: 'multimodal-resources',
        name: 'Multimodal Resources',
        conditions: [
          { type: 'memory_usage', operator: 'less_than', value: 50, weight: 1.0, required: true },
          { type: 'cpu_usage', operator: 'less_than', value: 50, weight: 1.0, required: true },
          { type: 'battery_charging', operator: 'equals', value: true, weight: 0.3, required: false },
        ],
        operator: 'AND',
        minScore: 0.9,
      },
    ],
    disableConditions: [
      {
        id: 'multimodal-low-battery',
        name: 'Multimodal Low Battery',
        conditions: [
          { type: 'battery_level', operator: 'less_than', value: 30, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 3000,
    cooldownPeriod: 300000,
    lastChanged: 0,
    tags: ['jepa', 'multimodal', 'experimental', 'resource-intensive'],
  },

  // UI Features
  {
    id: 'ui.animations',
    name: 'UI Animations',
    description: 'Smooth animations and transitions',
    state: 'auto',
    priority: 'low',
    performanceImpact: 15,
    dependencies: [],
    enableConditions: [
      {
        id: 'animations-performant',
        name: 'Animations Performant',
        conditions: [
          { type: 'cpu_usage', operator: 'less_than', value: 70, weight: 1.0, required: true },
          { type: 'system_load', operator: 'less_than', value: 0.8, weight: 0.8, required: false },
        ],
        operator: 'AND',
        minScore: 0.6,
      },
    ],
    disableConditions: [
      {
        id: 'animations-slow',
        name: 'Animations Slow',
        conditions: [
          { type: 'cpu_usage', operator: 'greater_than', value: 85, weight: 1.0, required: true },
          { type: 'battery_level', operator: 'less_than', value: 15, weight: 0.8, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 500,
    cooldownPeriod: 30000,
    lastChanged: 0,
    tags: ['ui', 'animations', 'ux'],
  },
  {
    id: 'ui.virtual_scrolling',
    name: 'Virtual Scrolling',
    description: 'Virtual scrolling for long conversations',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 20,
    dependencies: [],
    enableConditions: [
      {
        id: 'virtual-scroll-needed',
        name: 'Virtual Scroll Needed',
        conditions: [
          { type: 'memory_usage', operator: 'greater_than', value: 60, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.7,
      },
    ],
    disableConditions: [
      {
        id: 'virtual-scroll-not-needed',
        name: 'Virtual Scroll Not Needed',
        conditions: [
          { type: 'memory_usage', operator: 'less_than', value: 40, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 1000,
    cooldownPeriod: 60000,
    lastChanged: 0,
    tags: ['ui', 'performance', 'scrolling'],
  },

  // Advanced Features
  {
    id: 'advanced.offline_mode',
    name: 'Offline Mode',
    description: 'Work offline with local data',
    state: 'auto',
    priority: 'high',
    performanceImpact: 0,
    dependencies: [],
    enableConditions: [
      {
        id: 'offline-needed',
        name: 'Offline Needed',
        conditions: [
          { type: 'network_online', operator: 'equals', value: false, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.9,
      },
    ],
    disableConditions: [
      {
        id: 'online',
        name: 'Online',
        conditions: [
          { type: 'network_online', operator: 'equals', value: true, weight: 1.0, required: true },
          { type: 'network_speed', operator: 'greater_than', value: 5, weight: 0.8, required: false },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 1000,
    cooldownPeriod: 10000,
    lastChanged: 0,
    tags: ['advanced', 'offline', 'network'],
  },
  {
    id: 'advanced.background_sync',
    name: 'Background Sync',
    description: 'Sync data in the background',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 20,
    dependencies: ['advanced.offline_mode'],
    enableConditions: [
      {
        id: 'sync-allowed',
        name: 'Sync Allowed',
        conditions: [
          { type: 'network_online', operator: 'equals', value: true, weight: 1.0, required: true },
          { type: 'network_speed', operator: 'greater_than', value: 2, weight: 0.8, required: false },
          { type: 'battery_charging', operator: 'equals', value: true, weight: 0.5, required: false },
        ],
        operator: 'AND',
        minScore: 0.7,
      },
    ],
    disableConditions: [
      {
        id: 'sync-not-allowed',
        name: 'Sync Not Allowed',
        conditions: [
          { type: 'network_online', operator: 'equals', value: false, weight: 1.0, required: true },
          { type: 'battery_level', operator: 'less_than', value: 10, weight: 0.9, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 2000,
    cooldownPeriod: 60000,
    lastChanged: 0,
    tags: ['advanced', 'sync', 'background'],
  },

  // Media Features
  {
    id: 'media.compression',
    name: 'Media Compression',
    description: 'Compress media files before storage',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 40,
    dependencies: [],
    enableConditions: [
      {
        id: 'compression-beneficial',
        name: 'Compression Beneficial',
        conditions: [
          { type: 'storage_usage', operator: 'less_than', value: 10, weight: 1.0, required: true },
          { type: 'network_speed', operator: 'less_than', value: 10, weight: 0.7, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    disableConditions: [
      {
        id: 'compression-not-needed',
        name: 'Compression Not Needed',
        conditions: [
          { type: 'storage_usage', operator: 'greater_than', value: 50, weight: 1.0, required: true },
          { type: 'cpu_usage', operator: 'greater_than', value: 80, weight: 0.8, required: false },
        ],
        operator: 'OR',
        minScore: 0.7,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 1000,
    cooldownPeriod: 120000,
    lastChanged: 0,
    tags: ['media', 'compression', 'storage'],
  },

  // Knowledge Features
  {
    id: 'knowledge.embeddings_cache',
    name: 'Embeddings Cache',
    description: 'Cache embeddings for faster search',
    state: 'auto',
    priority: 'medium',
    performanceImpact: 20,
    dependencies: ['knowledge.vector_search'],
    enableConditions: [
      {
        id: 'cache-beneficial',
        name: 'Cache Beneficial',
        conditions: [
          { type: 'memory_usage', operator: 'less_than', value: 70, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.7,
      },
    ],
    disableConditions: [
      {
        id: 'cache-pressure',
        name: 'Cache Pressure',
        conditions: [
          { type: 'memory_usage', operator: 'greater_than', value: 85, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    automationEnabled: true,
    userOptedOut: false,
    transitionDuration: 2000,
    cooldownPeriod: 180000,
    lastChanged: 0,
    tags: ['knowledge', 'cache', 'performance'],
  },
];

// ============================================================================
// AUTOMATION RULES
// ============================================================================

/**
 * Default automation rules
 */
export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'high-cpu-disable-heavy-features',
    name: 'High CPU Disable Heavy Features',
    description: 'Disable CPU-intensive features when CPU usage is high',
    priority: 'high',
    conditions: [
      {
        id: 'high-cpu',
        name: 'High CPU Usage',
        conditions: [
          { type: 'cpu_usage', operator: 'greater_than', value: 85, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    actions: ['disable', 'reduce_quality'],
    targetFeatures: ['jepa.multimodal', 'jepa.realtime', 'ai.multimodal'],
    enabled: true,
    triggerCount: 0,
    lastTriggered: 0,
    effectiveness: 0.8,
  },
  {
    id: 'low-battery-power-save',
    name: 'Low Battery Power Save',
    description: 'Enable power saving mode when battery is low',
    priority: 'critical',
    conditions: [
      {
        id: 'low-battery',
        name: 'Low Battery',
        conditions: [
          { type: 'battery_level', operator: 'less_than', value: 20, weight: 1.0, required: true },
          { type: 'battery_charging', operator: 'equals', value: false, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.9,
      },
    ],
    actions: ['disable', 'reduce_quality', 'notify_user'],
    targetFeatures: ['jepa.multimodal', 'jepa.realtime', 'ui.animations', 'media.compression'],
    enabled: true,
    triggerCount: 0,
    lastTriggered: 0,
    effectiveness: 0.9,
  },
  {
    id: 'poor-network-offline-mode',
    name: 'Poor Network Offline Mode',
    description: 'Enable offline mode when network is poor',
    priority: 'high',
    conditions: [
      {
        id: 'poor-network',
        name: 'Poor Network',
        conditions: [
          { type: 'network_speed', operator: 'less_than', value: 1, weight: 1.0, required: true },
          { type: 'network_online', operator: 'equals', value: true, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    actions: ['enable', 'prefetch'],
    targetFeatures: ['advanced.offline_mode'],
    enabled: true,
    triggerCount: 0,
    lastTriggered: 0,
    effectiveness: 0.85,
  },
  {
    id: 'high-memory-clear-cache',
    name: 'High Memory Clear Cache',
    description: 'Clear caches when memory usage is high',
    priority: 'medium',
    conditions: [
      {
        id: 'high-memory',
        name: 'High Memory Usage',
        conditions: [
          { type: 'memory_usage', operator: 'greater_than', value: 85, weight: 1.0, required: true },
        ],
        operator: 'AND',
        minScore: 0.8,
      },
    ],
    actions: ['clear_cache', 'reduce_quality'],
    targetFeatures: [],
    enabled: true,
    triggerCount: 0,
    lastTriggered: 0,
    effectiveness: 0.7,
  },
  {
    id: 'resource-abundance-enable-features',
    name: 'Resource Abundance Enable Features',
    description: 'Enable high-quality features when resources are abundant',
    priority: 'low',
    conditions: [
      {
        id: 'abundant-resources',
        name: 'Abundant Resources',
        conditions: [
          { type: 'cpu_usage', operator: 'less_than', value: 30, weight: 0.8, required: true },
          { type: 'memory_usage', operator: 'less_than', value: 40, weight: 0.8, required: true },
          { type: 'battery_charging', operator: 'equals', value: true, weight: 0.5, required: false },
        ],
        operator: 'AND',
        minScore: 0.7,
      },
    ],
    actions: ['enable', 'increase_quality'],
    targetFeatures: ['jepa.multimodal', 'ui.animations', 'knowledge.embeddings_cache'],
    enabled: true,
    triggerCount: 0,
    lastTriggered: 0,
    effectiveness: 0.75,
  },
];

// ============================================================================
// AUTOMATION ENGINE CLASS
// ============================================================================

export class AutomationEngine {
  private config: AutomationConfig;
  private flags: Map<string, AutomationFlag>;
  private rules: Map<string, AutomationRule>;
  private changeHistory: FlagChangeHistory[] = [];
  private metrics: AutomationMetrics;
  private notifications: AutomationNotification[] = [];
  private evaluationInterval: number | null = null;
  private worldModel = getWorldModel();

  constructor(config?: Partial<AutomationConfig>) {
    this.config = { ...DEFAULT_AUTOMATION_CONFIG, ...config };
    this.flags = new Map(AUTOMATION_FLAGS.map(f => [f.id, f]));
    this.rules = new Map(AUTOMATION_RULES.map(r => [r.id, r]));
    this.metrics = {
      totalEvaluations: 0,
      totalRecommendations: 0,
      totalExecutions: 0,
      pendingApprovals: 0,
      automaticExecutions: 0,
      userChanges: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      satisfactionScore: 0,
      issuesPrevented: 0,
      falsePositives: 0,
      lastUpdate: Date.now(),
    };
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Start the automation engine
   */
  async start(): Promise<void> {
    if (this.evaluationInterval !== null) {
      console.log('[AutomationEngine] Already running');
      return;
    }

    console.log('[AutomationEngine] Starting...');

    // Initialize world model
    await this.worldModel.initialize();

    // Start evaluation loop
    this.evaluationInterval = window.setInterval(() => {
      this.evaluateAutomation();
    }, this.config.evaluationInterval);

    console.log('[AutomationEngine] Started successfully');
  }

  /**
   * Stop the automation engine
   */
  stop(): void {
    if (this.evaluationInterval === null) {
      console.log('[AutomationEngine] Not running');
      return;
    }

    console.log('[AutomationEngine] Stopping...');
    clearInterval(this.evaluationInterval);
    this.evaluationInterval = null;
    console.log('[AutomationEngine] Stopped');
  }

  // ========================================================================
  // MAIN EVALUATION LOOP
  // ========================================================================

  /**
   * Main evaluation loop - check predictions and adjust flags
   */
  private async evaluateAutomation(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.metrics.totalEvaluations++;

      // Get current state
      const currentState = this.worldModel.getCurrentState();
      if (!currentState) {
        console.warn('[AutomationEngine] No current state available');
        return;
      }

      // Get predictions
      const predictions = await this.worldModel.predictNextState(currentState);

      // Evaluate all flags
      const actions = await this.evaluateFlags(currentState, predictions);

      // Apply actions (respecting limits and permissions)
      const executedActions: AutomationExecutionResult[] = [];
      for (const action of actions.slice(0, this.config.maxActionsPerCycle)) {
        const result = await this.executeFlagChange(action.featureId, action.recommendedState, action);
        if (result.success) {
          executedActions.push(result);
        }
      }

      // Update metrics
      this.metrics.totalRecommendations += actions.length;
      this.metrics.totalExecutions += executedActions.length;
      this.metrics.lastUpdate = Date.now();

      console.log(`[AutomationEngine] Evaluation complete: ${actions.length} recommendations, ${executedActions.length} executed`);
    } catch (error) {
      console.error('[AutomationEngine] Evaluation failed:', error);
    }
  }

  // ========================================================================
  // FLAG EVALUATION
  // ========================================================================

  /**
   * Evaluate all flags based on predictions
   * Returns recommended actions
   */
  async evaluateFlags(
    currentState: ConversationState,
    predictions: PredictedState[]
  ): Promise<AutomationAction[]> {
    const actions: AutomationAction[] = [];

    // Evaluate each flag
    for (const [flagId, flag] of this.flags.entries()) {
      // Skip if automation disabled for this flag
      if (!flag.automationEnabled || flag.userOptedOut) {
        continue;
      }

      // Skip if in cooldown
      if (Date.now() - flag.lastChanged < flag.cooldownPeriod) {
        continue;
      }

      // Check if forced or blocked by user
      if (flag.state === 'forced' || flag.state === 'blocked') {
        continue;
      }

      // Evaluate enable conditions
      const enableResult = this.evaluateConditions(flag.enableConditions, currentState, predictions);

      // Evaluate disable conditions
      const disableResult = this.evaluateConditions(flag.disableConditions, currentState, predictions);

      // Determine action
      if (enableResult.shouldTrigger && flag.state !== 'enabled') {
        actions.push(this.createEnableAction(flag, predictions, enableResult.confidence));
      } else if (disableResult.shouldTrigger && flag.state !== 'disabled') {
        actions.push(this.createDisableAction(flag, predictions, disableResult.confidence));
      }
    }

    // Evaluate automation rules
    const ruleActions = await this.evaluateRules(currentState, predictions);
    actions.push(...ruleActions);

    // Sort by priority and confidence
    actions.sort((a, b) => {
      const priorityDiff = PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    return actions;
  }

  /**
   * Evaluate condition groups
   */
  private evaluateConditions(
    groups: ConditionGroup[],
    state: ConversationState,
    predictions: PredictedState[]
  ): { shouldTrigger: boolean; confidence: number } {
    for (const group of groups) {
      const score = this.evaluateConditionGroup(group, state, predictions);
      if (score >= group.minScore) {
        return { shouldTrigger: true, confidence: score };
      }
    }
    return { shouldTrigger: false, confidence: 0 };
  }

  /**
   * Evaluate a single condition group
   */
  private evaluateConditionGroup(
    group: ConditionGroup,
    state: ConversationState,
    predictions: PredictedState[]
  ): number {
    let score = 0;
    let weight = 0;

    for (const condition of group.conditions) {
      const met = this.evaluateCondition(condition, state, predictions);
      const conditionWeight = condition.weight;

      if (group.operator === 'AND') {
        if (condition.required && !met) {
          return 0; // Required condition failed
        }
        if (met) {
          score += conditionWeight;
        }
        weight += conditionWeight;
      } else { // OR
        if (met) {
          score += conditionWeight;
        }
        weight += conditionWeight;
      }
    }

    return weight > 0 ? score / weight : 0;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: FlagCondition,
    state: ConversationState,
    predictions: PredictedState[]
  ): boolean {
    // Get actual value from state
    const actualValue = this.getConditionValue(condition.type, state, predictions);

    if (actualValue === null) {
      return false; // Can't evaluate
    }

    // Apply comparison operator
    switch (condition.operator) {
      case 'greater_than':
        return typeof actualValue === 'number' && actualValue > (condition.value as number);
      case 'less_than':
        return typeof actualValue === 'number' && actualValue < (condition.value as number);
      case 'greater_equal':
        return typeof actualValue === 'number' && actualValue >= (condition.value as number);
      case 'less_equal':
        return typeof actualValue === 'number' && actualValue <= (condition.value as number);
      case 'equals':
        return actualValue === condition.value;
      case 'not_equals':
        return actualValue !== condition.value;
      case 'contains':
        return typeof actualValue === 'string' &&
          typeof condition.value === 'string' &&
          actualValue.includes(condition.value);
      case 'not_contains':
        return typeof actualValue === 'string' &&
          typeof condition.value === 'string' &&
          !actualValue.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue as string);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue as string);
      default:
        return false;
    }
  }

  /**
   * Get actual value for a condition type
   */
  private getConditionValue(
    type: string,
    state: ConversationState,
    predictions: PredictedState[]
  ): number | string | boolean | null {
    // Try to get from current state
    switch (type) {
      case 'cpu_usage':
        return state.systemLoad * 100; // Convert to percentage
      case 'memory_usage':
        // Estimate from state (would need actual monitoring)
        return state.systemLoad * 80;
      case 'battery_level':
        // Would need battery API
        return 100; // Default
      case 'battery_charging':
        // Would need battery API
        return true; // Default
      case 'network_speed':
        // Would need network info
        return 10; // Default
      case 'network_online':
        return navigator.onLine;
      case 'token_usage':
        return state.estimatedTokenUsage;
      case 'time_to_complete':
        return state.estimatedTimeMs;
      case 'confidence':
        return predictions.length > 0 ? predictions[0].confidence : 0;
      case 'system_load':
        return state.systemLoad;
      case 'user_intent':
        return state.userIntent;
      case 'emotion_state':
        return state.emotionState.category;
      case 'time_of_day':
        return state.timeOfDay;
      case 'conversation_age':
        return state.conversationAge;
      case 'message_rate':
        return state.messageRate;
      case 'active_agents':
        return state.activeAgentCount;
      case 'performance_impact':
        return 50; // Would be feature-specific
      case 'storage_usage':
        return 50; // Default, would need actual storage monitoring
      default:
        return null;
    }
  }

  // ========================================================================
  // ACTION CREATION
  // ========================================================================

  /**
   * Create enable action for flag
   */
  private createEnableAction(
    flag: AutomationFlag,
    predictions: PredictedState[],
    confidence: number
  ): AutomationAction {
    return {
      id: `action-${Date.now()}-${flag.id}`,
      featureId: flag.id,
      type: 'enable',
      recommendedState: 'enabled',
      confidence,
      reason: `Conditions met for enabling ${flag.name}`,
      predictions,
      resourceImpact: this.estimateResourceImpact(flag, 'enabled'),
      requiresApproval: flag.priority === 'critical' && this.config.askForCriticalChanges,
      priority: flag.priority,
      timeframe: 0, // Immediate
      transitionDuration: flag.transitionDuration,
      createdAt: Date.now(),
    };
  }

  /**
   * Create disable action for flag
   */
  private createDisableAction(
    flag: AutomationFlag,
    predictions: PredictedState[],
    confidence: number
  ): AutomationAction {
    return {
      id: `action-${Date.now()}-${flag.id}`,
      featureId: flag.id,
      type: 'disable',
      recommendedState: 'disabled',
      confidence,
      reason: `Conditions met for disabling ${flag.name}`,
      predictions,
      resourceImpact: this.estimateResourceImpact(flag, 'disabled'),
      requiresApproval: flag.priority === 'critical' && this.config.askForCriticalChanges,
      priority: flag.priority,
      timeframe: 0,
      transitionDuration: flag.transitionDuration,
      createdAt: Date.now(),
    };
  }

  /**
   * Estimate resource impact of flag change
   */
  private estimateResourceImpact(flag: AutomationFlag, newState: AutomationFlagState): ResourceImpact {
    const currentState = flag.state;
    const isEnabling = newState === 'enabled' && currentState !== 'enabled';
    const isDisabling = newState === 'disabled' && currentState !== 'disabled';

    const impactMultiplier = isDisabling ? -1 : isEnabling ? 1 : 0;
    const performanceFactor = flag.performanceImpact / 100;

    return {
      cpuChange: impactMultiplier * performanceFactor * 30,
      memoryChange: impactMultiplier * performanceFactor * 40,
      batteryChange: impactMultiplier * performanceFactor * 20,
      networkChange: 0,
      tokenChange: 0,
      overallImpact: impactMultiplier * performanceFactor * 100,
      duration: flag.transitionDuration,
    };
  }

  // ========================================================================
  // RULE EVALUATION
  // ========================================================================

  /**
   * Evaluate automation rules
   */
  async evaluateRules(
    currentState: ConversationState,
    predictions: PredictedState[]
  ): Promise<AutomationAction[]> {
    const actions: AutomationAction[] = [];

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      // Check rule conditions
      const evaluationResult = this.evaluateConditions(rule.conditions, currentState, predictions);

      if (evaluationResult.shouldTrigger) {
        // Create actions for target features
        const targetFlags = rule.targetFeatures.length > 0
          ? rule.targetFeatures
          : Array.from(this.flags.keys());

        for (const flagId of targetFlags) {
          const flag = this.flags.get(flagId);
          if (!flag) continue;

          // Create action based on rule actions
          for (const actionType of rule.actions) {
            actions.push({
              id: `rule-action-${Date.now()}-${ruleId}-${flagId}`,
              featureId: flagId,
              type: actionType,
              recommendedState: this.determineStateFromAction(actionType),
              confidence: evaluationResult.confidence,
              reason: `Rule "${rule.name}" triggered`,
              predictions,
              resourceImpact: this.estimateResourceImpact(flag, flag.state),
              requiresApproval: rule.priority === 'critical' && this.config.askForCriticalChanges,
              priority: rule.priority,
              timeframe: 0,
              transitionDuration: flag.transitionDuration,
              createdAt: Date.now(),
            });
          }
        }

        // Update rule stats
        rule.triggerCount++;
        rule.lastTriggered = Date.now();
      }
    }

    return actions;
  }

  /**
   * Determine target state from action type
   */
  private determineStateFromAction(action: AutomationActionType): AutomationFlagState {
    switch (action) {
      case 'enable':
      case 'increase_quality':
      case 'prefetch':
        return 'enabled';
      case 'disable':
      case 'reduce_quality':
      case 'clear_cache':
      case 'compress':
        return 'disabled';
      default:
        return 'auto';
    }
  }

  // ========================================================================
  // ACTION EXECUTION
  // ========================================================================

  /**
   * Execute a flag change
   */
  async executeFlagChange(
    featureId: string,
    newState: AutomationFlagState,
    action?: AutomationAction
  ): Promise<AutomationExecutionResult> {
    const flag = this.flags.get(featureId);
    if (!flag) {
      return {
        actionId: action?.id || 'unknown',
        featureId,
        success: false,
        previousState: 'auto',
        newState,
        timestamp: Date.now(),
        error: `Flag ${featureId} not found`,
      };
    }

    const previousState = flag.state;

    try {
      // Check if requires approval
      if (action?.requiresApproval) {
        // Send notification and wait for response
        await this.sendApprovalNotification(action);
        this.metrics.pendingApprovals++;
        return {
          actionId: action.id,
          featureId,
          success: false,
          previousState,
          newState: previousState,
          timestamp: Date.now(),
          error: 'Pending user approval',
        };
      }

      // Notify before change (if configured)
      if (this.config.notifyBeforeChanges && !action?.requiresApproval) {
        await this.sendChangeNotification(action);
      }

      // Apply the change to feature flag manager
      const flagManager = getGlobalManager();
      if (newState === 'enabled') {
        flagManager.enable(featureId);
      } else if (newState === 'disabled') {
        flagManager.disable(featureId);
      } else {
        flagManager.reset(featureId);
      }

      // Update automation flag state
      flag.state = newState;
      flag.lastChanged = Date.now();
      this.flags.set(featureId, flag);

      // Record history
      this.recordChangeHistory(flag, previousState, newState, action);

      // Update metrics
      if (action) {
        this.metrics.automaticExecutions++;
        if (action.resourceImpact.overallImpact < 0) {
          this.metrics.issuesPrevented++;
        }
      }

      console.log(`[AutomationEngine] Executed: ${featureId} ${previousState} -> ${newState}`);

      return {
        actionId: action?.id || 'manual',
        featureId,
        success: true,
        previousState,
        newState,
        timestamp: Date.now(),
        actualImpact: action?.resourceImpact,
      };
    } catch (error) {
      console.error(`[AutomationEngine] Failed to execute change for ${featureId}:`, error);

      return {
        actionId: action?.id || 'manual',
        featureId,
        success: false,
        previousState,
        newState: previousState,
        timestamp: Date.now(),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Record change in history
   */
  private recordChangeHistory(
    flag: AutomationFlag,
    previousState: AutomationFlagState,
    newState: AutomationFlagState,
    action?: AutomationAction
  ): void {
    const historyEntry: FlagChangeHistory = {
      id: `history-${Date.now()}-${flag.id}`,
      featureId: flag.id,
      previousState,
      newState,
      trigger: action ? 'automation' : 'user',
      reason: action?.reason || 'Manual change',
      predictions: action?.predictions,
      confidence: action?.confidence || 0,
      timestamp: Date.now(),
      userNotified: this.config.notifyBeforeChanges,
      userApproved: action?.requiresApproval ? false : undefined,
      resourceImpact: action?.resourceImpact || {
        cpuChange: 0,
        memoryChange: 0,
        batteryChange: 0,
        networkChange: 0,
        tokenChange: 0,
        overallImpact: 0,
        duration: 0,
      },
    };

    this.changeHistory.push(historyEntry);

    // Trim history if needed
    if (this.changeHistory.length > 1000) {
      this.changeHistory = this.changeHistory.slice(-1000);
    }
  }

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  /**
   * Send notification requesting user approval
   */
  private async sendApprovalNotification(action: AutomationAction): Promise<void> {
    const notification: AutomationNotification = {
      id: `notify-${action.id}`,
      type: 'pending_change',
      featureId: action.featureId,
      title: `Approval Required: ${action.featureId}`,
      message: action.reason,
      action,
      dismissible: false,
      userActions: [
        { label: 'Approve', action: 'approve' },
        { label: 'Deny', action: 'deny' },
        { label: 'Defer', action: 'defer' },
      ],
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.responseGracePeriod,
      read: false,
    };

    this.notifications.push(notification);
    // Emit event for UI to display
    console.log('[AutomationEngine] Approval notification:', notification);
  }

  /**
   * Send notification about change
   */
  private async sendChangeNotification(action?: AutomationAction): Promise<void> {
    if (!action) return;

    const notification: AutomationNotification = {
      id: `notify-change-${action.id}`,
      type: 'change_executed',
      featureId: action.featureId,
      title: `Feature Changed: ${action.featureId}`,
      message: action.reason,
      action,
      dismissible: true,
      timestamp: Date.now(),
      expiresAt: Date.now() + 30000, // 30 seconds
      read: false,
    };

    this.notifications.push(notification);
    console.log('[AutomationEngine] Change notification:', notification);
  }

  // ========================================================================
  // PUBLIC API
  // ========================================================================

  /**
   * Get recommended actions (without executing)
   */
  async getRecommendedActions(): Promise<AutomationAction[]> {
    const currentState = this.worldModel.getCurrentState();
    if (!currentState) {
      return [];
    }

    const predictions = await this.worldModel.predictNextState(currentState);
    return this.evaluateFlags(currentState, predictions);
  }

  /**
   * Get all automation flags
   */
  getFlags(): AutomationFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flag by ID
   */
  getFlag(id: string): AutomationFlag | undefined {
    return this.flags.get(id);
  }

  /**
   * Update flag
   */
  updateFlag(id: string, updates: Partial<AutomationFlag>): void {
    const flag = this.flags.get(id);
    if (flag) {
      this.flags.set(id, { ...flag, ...updates });
    }
  }

  /**
   * Opt out of automation for a flag
   */
  optOutFlag(id: string): void {
    const flag = this.flags.get(id);
    if (flag) {
      flag.userOptedOut = true;
      flag.automationEnabled = false;
      this.flags.set(id, flag);
    }
  }

  /**
   * Opt back into automation for a flag
   */
  optInFlag(id: string): void {
    const flag = this.flags.get(id);
    if (flag) {
      flag.userOptedOut = false;
      flag.automationEnabled = true;
      this.flags.set(id, flag);
    }
  }

  /**
   * Get change history
   */
  getChangeHistory(featureId?: string): FlagChangeHistory[] {
    if (featureId) {
      return this.changeHistory.filter(h => h.featureId === featureId);
    }
    return [...this.changeHistory];
  }

  /**
   * Get metrics
   */
  getMetrics(): AutomationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get notifications
   */
  getNotifications(): AutomationNotification[] {
    return [...this.notifications];
  }

  /**
   * Respond to notification
   */
  async respondToNotification(
    notificationId: string,
    response: 'approve' | 'deny' | 'defer'
  ): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification || notification.type !== 'pending_change') {
      return;
    }

    const action = notification.action;
    if (!action) return;

    if (response === 'approve') {
      await this.executeFlagChange(action.featureId, action.recommendedState, action);
    } else if (response === 'deny') {
      console.log(`[AutomationEngine] User denied change: ${action.featureId}`);
    }

    // Remove notification
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.metrics.pendingApprovals--;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get configuration
   */
  getConfig(): AutomationConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let automationEngineInstance: AutomationEngine | null = null;

/**
 * Get or create automation engine instance
 */
export function getAutomationEngine(config?: Partial<AutomationConfig>): AutomationEngine {
  if (!automationEngineInstance) {
    automationEngineInstance = new AutomationEngine(config);
  }
  return automationEngineInstance;
}

/**
 * Create new automation engine instance
 */
export function createAutomationEngine(config?: Partial<AutomationConfig>): AutomationEngine {
  return new AutomationEngine(config);
}

/**
 * Reset automation engine instance
 */
export function resetAutomationEngine(): void {
  const engine = automationEngineInstance;
  if (engine) {
    engine.stop();
  }
  automationEngineInstance = null;
}
