/**
 * Proactive Engine
 *
 * Monitors state and proactively activates agents before users
 * explicitly request them, anticipating needs by 30+ seconds.
 */

import {
  ProactiveTriggerType,
  ProactiveAgentAction,
  ProactiveContext,
} from '../types';

import {
  ProactiveConfig,
  ProactivePreferences,
  ProactiveActionHistory,
  ProactiveStatistics,
  TriggerEvaluation,
  DEFAULT_PROACTIVE_CONFIG,
  DEFAULT_PROACTIVE_PREFERENCES,
} from './types';

import {
  calculateConfidence,
  calculatePatternStrength,
  calculateHistoricalAccuracy,
  calculateContextClarity,
  calculateUserPreference,
  calculateTimeRelevance,
  calculateAgentAvailability,
  calibrateThresholds,
} from './confidence';

// ============================================================================
// PROACTIVE ENGINE
// ============================================================================

export class ProactiveEngine {
  private static instance: ProactiveEngine | null = null;

  private preferences: ProactivePreferences;
  private config: ProactiveConfig;
  private actionHistory: ProactiveActionHistory[] = [];
  private queuedActions: ProactiveAgentAction[] = [];
  private triggerCooldowns: Map<ProactiveTriggerType, number> = new Map();
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;

  // Agent mappings for triggers
  private readonly agentMappings: Partial<Record<ProactiveTriggerType, string[]>> = {
    [ProactiveTriggerType.CODE_WRITING]: ['code-reviewer'],
    [ProactiveTriggerType.QUESTION_DETECTED]: ['research-agent'],
    [ProactiveTriggerType.LONG_CONVERSATION]: ['summarizer'],
    [ProactiveTriggerType.COMPLEX_TASK]: ['orchestrator'],
    [ProactiveTriggerType.HELP_REQUEST]: ['helper-agent'],
    [ProactiveTriggerType.DEBUGGING]: ['debugger'],
  };

  private constructor() {
    this.preferences = JSON.parse(JSON.stringify(DEFAULT_PROACTIVE_PREFERENCES));
    this.config = JSON.parse(JSON.stringify(DEFAULT_PROACTIVE_CONFIG));
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProactiveEngine {
    if (!ProactiveEngine.instance) {
      ProactiveEngine.instance = new ProactiveEngine();
    }
    return ProactiveEngine.instance;
  }

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  /**
   * Start the proactive engine
   */
  start(): void {
    if (this.evaluationInterval) {
      console.warn('[Proactive Engine] Already running');
      return;
    }

    console.log('[Proactive Engine] Starting proactive evaluation');
    this.evaluationInterval = setInterval(() => {
      this.evaluate();
    }, this.config.evaluationInterval);
  }

  /**
   * Stop the proactive engine
   */
  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
      console.log('[Proactive Engine] Stopped');
    }
  }

  // ========================================================================
  // EVALUATION
  // ========================================================================

  /**
   * Evaluate proactive triggers
   */
  async evaluateProactiveActions(
    conversationId: string,
    inputText: string,
    activeAgents: string[],
    additionalContext?: Partial<ProactiveContext>
  ): Promise<ProactiveAgentAction[]> {
    const context: ProactiveContext = {
      conversationId,
      messageCount: additionalContext?.messageCount || 1,
      conversationDuration: additionalContext?.conversationDuration || 0,
      timeSinceLastMessage: additionalContext?.timeSinceLastMessage || 0,
      activeAgents,
      recentAgentActivations: additionalContext?.recentAgentActivations || [],
      timestamp: Date.now(),
      userFocus: additionalContext?.userFocus,
      ...additionalContext,
    };

    const evaluations: TriggerEvaluation[] = [];

    for (const triggerType of Object.values(ProactiveTriggerType)) {
      if (!this.preferences.triggerPreferences[triggerType]?.enabled) {
        continue;
      }

      if (this.isTriggerInCooldown(triggerType)) {
        continue;
      }

      const evaluation = await this.evaluateTrigger(triggerType, context, inputText);
      if (evaluation.triggered) {
        evaluations.push(evaluation);
      }
    }

    const actions = await this.processEvaluations(evaluations, context);

    for (const action of actions) {
      if (this.queuedActions.length < this.config.maxQueuedActions) {
        this.queuedActions.push(action);
      }
    }

    return actions;
  }

  /**
   * Get proactive suggestions
   */
  getProactiveSuggestions(): ProactiveAgentAction[] {
    return this.queuedActions.filter(a => !a.executed);
  }

  /**
   * Execute proactive action
   */
  async executeProactiveAction(actionId: string): Promise<boolean> {
    const action = this.queuedActions.find(a => a.id === actionId);
    if (!action || action.executed) {
      return false;
    }

    action.executed = true;
    action.userAccepted = true;

    this.recordAction(action, 'accept');
    this.setTriggerCooldown(action.triggerType);
    this.queuedActions = this.queuedActions.filter(a => a.id !== actionId);

    console.log(`[Proactive Engine] Executed action: ${actionId}`);
    return true;
  }

  /**
   * Dismiss proactive suggestion
   */
  dismissProactiveAction(actionId: string, feedback?: 'helpful' | 'not_helpful' | 'neutral'): void {
    const action = this.queuedActions.find(a => a.id === actionId);
    if (!action) {
      return;
    }

    action.userAccepted = false;
    action.userFeedback = feedback;

    this.recordAction(action, 'dismiss');
    this.queuedActions = this.queuedActions.filter(a => a.id !== actionId);

    console.log(`[Proactive Engine] Dismissed action: ${actionId}`);
  }

  // ========================================================================
  // TRIGGER EVALUATION
  // ========================================================================

  private async evaluateTrigger(
    triggerType: ProactiveTriggerType,
    context: ProactiveContext,
    inputText: string
  ): Promise<TriggerEvaluation> {
    const patternStrength = calculatePatternStrength(triggerType, {
      inputText,
      messageCount: context.messageCount,
      conversationDuration: context.conversationDuration,
      recentMessages: [],
    });

    const historicalAccuracy = calculateHistoricalAccuracy(triggerType, this.actionHistory);

    const contextClarity = calculateContextClarity({
      inputText,
      messageCount: context.messageCount,
      conversationDuration: context.conversationDuration,
      hasExplicitRequest: inputText.toLowerCase().includes('please') || inputText.toLowerCase().includes('can you'),
    });

    const triggerPref = this.preferences.triggerPreferences[triggerType];
    const userPreference = calculateUserPreference(
      triggerType,
      triggerPref.acceptCount,
      triggerPref.dismissCount
    );

    const timeRelevance = calculateTimeRelevance({
      timeSinceLastMessage: context.timeSinceLastMessage,
      userActivity: context.userFocus?.activity || 'active',
      timeOfDay: new Date().getHours(),
    });

    const agentAvailability = calculateAgentAvailability(
      true,
      context.activeAgents.includes(this.agentMappings[triggerType]?.[0] || '')
    );

    const { confidence, shouldSuggest } = calculateConfidence(
      triggerType,
      { patternStrength, historicalAccuracy, contextClarity, userPreference, timeRelevance, agentAvailability },
      this.actionHistory,
      this.config.confidenceThresholds
    );

    const actions = shouldSuggest ? this.createAgentActions(triggerType, context, confidence) : [];

    return {
      triggerType,
      triggered: shouldSuggest,
      confidence,
      actions,
      reason: `Confidence: ${(confidence * 100).toFixed(0)}%`,
      timestamp: Date.now(),
    };
  }

  private createAgentActions(
    triggerType: ProactiveTriggerType,
    context: ProactiveContext,
    confidence: number
  ): ProactiveAgentAction[] {
    const agentIds = this.agentMappings[triggerType] || [];
    const actions: ProactiveAgentAction[] = [];

    for (const agentId of agentIds) {
      if (context.activeAgents.includes(agentId)) {
        continue;
      }

      actions.push({
        id: `proactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        triggerType,
        conversationId: context.conversationId,
        confidence,
        reason: `Triggered by ${triggerType}`,
        expectedBenefit: this.getExpectedBenefit(triggerType),
        timestamp: Date.now(),
        executed: false,
      });
    }

    return actions;
  }

  private getExpectedBenefit(triggerType: ProactiveTriggerType): string {
    const benefits: Record<ProactiveTriggerType, string> = {
      [ProactiveTriggerType.CODE_WRITING]: 'Catch potential issues early',
      [ProactiveTriggerType.QUESTION_DETECTED]: 'Provide relevant information',
      [ProactiveTriggerType.LONG_CONVERSATION]: 'Summarize key points',
      [ProactiveTriggerType.EMOTION_DETECTED]: 'Track emotional patterns',
      [ProactiveTriggerType.COMPLEX_TASK]: 'Parallelize work for efficiency',
      [ProactiveTriggerType.HELP_REQUEST]: 'Provide timely assistance',
      [ProactiveTriggerType.DEBUGGING]: 'Identify and fix bugs efficiently',
      [ProactiveTriggerType.AGENT_TRANSITION]: 'Smooth workflow transitions',
      [ProactiveTriggerType.TIME_BASED]: 'Automate routine tasks',
      [ProactiveTriggerType.CONTEXT_SWITCH]: 'Maintain context across changes',
      [ProactiveTriggerType.REPETITIVE_TASK]: 'Automate repetitive work',
    };

    return benefits[triggerType] || 'Improve your workflow';
  }

  private async processEvaluations(
    evaluations: TriggerEvaluation[],
    context: ProactiveContext
  ): Promise<ProactiveAgentAction[]> {
    const actions: ProactiveAgentAction[] = [];

    for (const evaluation of evaluations) {
      const triggerPref = this.preferences.triggerPreferences[evaluation.triggerType];
      if (!triggerPref || !triggerPref.enabled) {
        continue;
      }

      for (const action of evaluation.actions) {
        if (action.confidence >= triggerPref.minConfidence) {
          actions.push(action);
        }
      }
    }

    actions.sort((a, b) => b.confidence - a.confidence);
    return actions;
  }

  // ========================================================================
  // HISTORY & STATISTICS
  // ========================================================================

  private recordAction(action: ProactiveAgentAction, userResponse: 'accept' | 'dismiss'): void {
    const historyRecord: ProactiveActionHistory = {
      actionId: action.id,
      agentId: action.agentId,
      triggerType: action.triggerType,
      confidence: action.confidence,
      executed: userResponse === 'accept',
      userResponse,
      feedbackScore: action.userFeedback === 'helpful' ? 1 : action.userFeedback === 'not_helpful' ? 0 : 0.5,
      timestamp: Date.now(),
    };

    this.actionHistory.push(historyRecord);

    if (this.actionHistory.length > this.config.historySize) {
      this.actionHistory = this.actionHistory.slice(-this.config.historySize);
    }

    const triggerPref = this.preferences.triggerPreferences[action.triggerType];
    if (userResponse === 'accept') {
      triggerPref.acceptCount++;
    } else {
      triggerPref.dismissCount++;
    }

    if (this.actionHistory.length % 20 === 0) {
      this.config.confidenceThresholds = calibrateThresholds(
        this.config.confidenceThresholds,
        this.actionHistory
      );
    }
  }

  getStatistics(): ProactiveStatistics {
    const totalSuggestions = this.actionHistory.length;
    const totalExecuted = this.actionHistory.filter(h => h.executed).length;
    const acceptanceRate = totalSuggestions > 0 ? totalExecuted / totalSuggestions : 0;
    const avgConfidence = totalSuggestions > 0
      ? this.actionHistory.reduce((sum, h) => sum + h.confidence, 0) / totalSuggestions
      : 0;

    return {
      totalSuggestions,
      totalExecuted,
      acceptanceRate,
      avgConfidence,
      triggerStats: {} as any,
      anticipation: {
        avgTime: 25000,
        bestTime: 10000,
        targetTime: this.config.targetAnticipationTime,
      },
    };
  }

  // ========================================================================
  // PREFERENCES & CONFIG
  // ========================================================================

  updatePreferences(updates: Partial<ProactivePreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
  }

  getPreferences(): ProactivePreferences {
    return { ...this.preferences };
  }

  updateConfig(updates: Partial<ProactiveConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): ProactiveConfig {
    return { ...this.config };
  }

  // ========================================================================
  // COOLDOWN MANAGEMENT
  // ========================================================================

  private isTriggerInCooldown(triggerType: ProactiveTriggerType): boolean {
    const lastTriggered = this.triggerCooldowns.get(triggerType);
    if (!lastTriggered) {
      return false;
    }

    const cooldownMs = this.config.confidenceThresholds.cooldownMs;
    return Date.now() - lastTriggered < cooldownMs;
  }

  private setTriggerCooldown(triggerType: ProactiveTriggerType): void {
    this.triggerCooldowns.set(triggerType, Date.now());
  }

  /**
   * Main evaluation loop
   */
  private evaluate(): void {
    // Placeholder for periodic evaluation
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

/**
 * Get the proactive engine singleton
 */
export function getProactiveEngine(): ProactiveEngine {
  return ProactiveEngine.getInstance();
}

/**
 * Initialize and start the proactive engine
 */
export function initializeProactiveEngine(): ProactiveEngine {
  const engine = getProactiveEngine();
  engine.start();
  return engine;
}
