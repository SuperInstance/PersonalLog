/**
 * Proactive Agent Activation Engine
 *
 * Monitors conversation state and proactively activates agents before users
 * explicitly request them, anticipating needs by 30+ seconds.
 */

import { classifyTask } from '@/lib/agents/task-classifier';
import { agentRegistry } from '@/lib/agents/registry';
import type { AgentDefinition } from '@/lib/agents/types';
import type { Message, Conversation } from '@/types/conversation';
import {
  ProactiveTriggerType,
  ProactiveContext,
  ProactiveAgentAction,
  TriggerEvaluation,
  ProactivePreferences,
  ProactiveConfig,
  ProactiveActionHistory,
  ProactiveStatistics,
  DEFAULT_PROACTIVE_CONFIG,
  DEFAULT_PROACTIVE_PREFERENCES,
} from './proactive-types';
import {
  calculateConfidence,
  calculatePatternStrength,
  calculateHistoricalAccuracy,
  calculateContextClarity,
  calculateUserPreference,
  calculateTimeRelevance,
  calculateAgentAvailability,
  calibrateThresholds,
} from './proactive-confidence';

// ============================================================================
// PROACTIVE ENGINE
// ============================================================================

class ProactiveEngine {
  private preferences: ProactivePreferences;
  private config: ProactiveConfig;
  private actionHistory: ProactiveActionHistory[] = [];
  private queuedActions: ProactiveAgentAction[] = [];
  private triggerCooldowns: Map<ProactiveTriggerType, number> = new Map();
  private evaluationInterval: ReturnType<typeof setInterval> | null = null;
  private lastEvaluation: number = 0;

  // Agent mappings for triggers
  private readonly agentMappings: Partial<Record<ProactiveTriggerType, string[]>> = {
    [ProactiveTriggerType.CODE_WRITING]: ['code-reviewer', 'jepa-v1'],
    [ProactiveTriggerType.QUESTION_DETECTED]: ['research-agent', 'spreader-v1'],
    [ProactiveTriggerType.LONG_CONVERSATION]: ['summarizer'],
    [ProactiveTriggerType.EMOTION_DETECTED]: ['jepa-v1'],
    [ProactiveTriggerType.COMPLEX_TASK]: ['spreader-v1'],
    [ProactiveTriggerType.HELP_REQUEST]: ['helper-agent'],
    [ProactiveTriggerType.DEBUGGING]: ['debugger-agent', 'code-reviewer'],
    [ProactiveTriggerType.REPETITIVE_TASK]: ['automation-agent'],
  };

  constructor() {
    this.preferences = JSON.parse(JSON.stringify(DEFAULT_PROACTIVE_PREFERENCES));
    this.config = JSON.parse(JSON.stringify(DEFAULT_PROACTIVE_CONFIG));
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

    this.lastEvaluation = Date.now();
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
   *
   * Main API called periodically to check if any agents should be activated
   */
  async evaluateProactiveActions(
    conversation: Conversation,
    recentMessages: Message[],
    activeAgents: string[],
    userFocus?: ProactiveContext['userFocus']
  ): Promise<ProactiveAgentAction[]> {
    // Build context
    const context: ProactiveContext = {
      conversation,
      recentMessages,
      messageCount: conversation.messages.length,
      conversationDuration: this.calculateConversationDuration(conversation),
      timeSinceLastMessage: this.calculateTimeSinceLastMessage(recentMessages),
      activeAgents,
      recentAgentActivations: [],
      timestamp: Date.now(),
      userFocus,
    };

    // Get task category from recent messages
    if (recentMessages.length > 0) {
      const lastUserMessage = [...recentMessages].reverse().find(m =>
        typeof m.author === 'string' ? m.author === 'user' : m.author.type === 'ai-contact' ? false : true
      );
      if (lastUserMessage && lastUserMessage.content.text) {
        const classification = classifyTask(lastUserMessage.content.text, {
          timestamp: parseInt(lastUserMessage.timestamp),
        });
        context.taskCategory = classification.category;
      }
    }

    // Evaluate all triggers
    const evaluations: TriggerEvaluation[] = [];
    for (const triggerType of Object.values(ProactiveTriggerType)) {
      if (!this.preferences.triggerPreferences[triggerType]?.enabled) {
        continue;
      }

      // Check cooldown
      if (this.isTriggerInCooldown(triggerType)) {
        continue;
      }

      const evaluation = await this.evaluateTrigger(triggerType, context);
      if (evaluation.triggered) {
        evaluations.push(evaluation);
      }
    }

    // Process evaluations into actions
    const actions = await this.processEvaluations(evaluations, context);

    // Add to queue
    for (const action of actions) {
      if (this.queuedActions.length < this.config.maxQueuedActions) {
        this.queuedActions.push(action);
      }
    }

    return actions;
  }

  /**
   * Get proactive suggestions for user
   */
  getProactiveSuggestions(): ProactiveAgentAction[] {
    return this.queuedActions.filter(a => !a.executed);
  }

  /**
   * Execute proactive action
   */
  async executeProactiveAction(actionId: string): Promise<boolean> {
    const action = this.queuedActions.find(a => a.id === actionId);
    if (!action) {
      console.warn(`[Proactive Engine] Action not found: ${actionId}`);
      return false;
    }

    if (action.executed) {
      console.warn(`[Proactive Engine] Action already executed: ${actionId}`);
      return false;
    }

    try {
      // Activate the agent
      const activated = agentRegistry.activateAgent(action.agentId);
      if (!activated) {
        console.warn(`[Proactive Engine] Failed to activate agent: ${action.agentId}`);
        return false;
      }

      // Mark as executed
      action.executed = true;
      action.userAccepted = true;

      // Record in history
      this.recordAction(action, 'accept');

      // Update cooldown
      this.setTriggerCooldown(action.triggerType);

      // Remove from queue
      this.queuedActions = this.queuedActions.filter(a => a.id !== actionId);

      console.log(`[Proactive Engine] Executed proactive action: ${actionId}`);
      return true;
    } catch (error) {
      console.error('[Proactive Engine] Error executing action:', error);
      return false;
    }
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
    action.userFeedback = feedback || 'neutral';

    // Record in history
    this.recordAction(action, 'dismiss');

    // Remove from queue
    this.queuedActions = this.queuedActions.filter(a => a.id !== actionId);

    console.log(`[Proactive Engine] Dismissed proactive action: ${actionId}`);
  }

  // ========================================================================
  // TRIGGER EVALUATION
  // ========================================================================

  /**
   * Evaluate a single trigger type
   */
  private async evaluateTrigger(
    triggerType: ProactiveTriggerType,
    context: ProactiveContext
  ): Promise<TriggerEvaluation> {
    const actions: ProactiveAgentAction[] = [];
    let triggered = false;
    let confidence = 0;
    let reason = '';

    switch (triggerType) {
      case ProactiveTriggerType.CODE_WRITING:
        ({ triggered, confidence, reason } = this.evaluateCodeWriting(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.QUESTION_DETECTED:
        ({ triggered, confidence, reason } = this.evaluateQuestionDetected(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.LONG_CONVERSATION:
        ({ triggered, confidence, reason } = this.evaluateLongConversation(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.EMOTION_DETECTED:
        ({ triggered, confidence, reason } = this.evaluateEmotionDetected(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.COMPLEX_TASK:
        ({ triggered, confidence, reason } = this.evaluateComplexTask(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.HELP_REQUEST:
        ({ triggered, confidence, reason } = this.evaluateHelpRequest(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      case ProactiveTriggerType.DEBUGGING:
        ({ triggered, confidence, reason } = this.evaluateDebugging(context));
        if (triggered) {
          actions.push(...this.createAgentActions(triggerType, context, confidence, reason));
        }
        break;

      default:
        // Other triggers would be implemented similarly
        break;
    }

    return {
      triggerType,
      triggered,
      confidence,
      actions,
      reason,
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluate code writing trigger
   */
  private evaluateCodeWriting(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const patternStrength = calculatePatternStrength(
      ProactiveTriggerType.CODE_WRITING,
      {
        inputText,
        messageCount: context.messageCount,
        conversationDuration: context.conversationDuration,
        recentMessages: context.recentMessages as any,
      }
    );

    const historicalAccuracy = calculateHistoricalAccuracy(
      ProactiveTriggerType.CODE_WRITING,
      this.actionHistory
    );

    const contextClarity = calculateContextClarity({
      inputText,
      messageCount: context.messageCount,
      conversationDuration: context.conversationDuration,
      taskCategory: context.taskCategory,
      hasExplicitRequest: inputText.toLowerCase().includes('please') ||
                         inputText.toLowerCase().includes('can you'),
    });

    const userPreference = calculateUserPreference(
      ProactiveTriggerType.CODE_WRITING,
      this.preferences.triggerPreferences[ProactiveTriggerType.CODE_WRITING].acceptCount,
      this.preferences.triggerPreferences[ProactiveTriggerType.CODE_WRITING].dismissCount
    );

    const timeRelevance = calculateTimeRelevance({
      timeSinceLastMessage: context.timeSinceLastMessage,
      userActivity: context.userFocus?.activity || 'active',
      timeOfDay: new Date().getHours(),
    });

    const agentAvailability = calculateAgentAvailability(
      true, // Assume available
      context.activeAgents.includes('code-reviewer')
    );

    // Calculate overall confidence
    const { confidence, shouldSuggest } = calculateConfidence(
      ProactiveTriggerType.CODE_WRITING,
      { patternStrength, historicalAccuracy, contextClarity, userPreference, timeRelevance, agentAvailability },
      this.actionHistory,
      this.config.confidenceThresholds
    );

    return {
      triggered: shouldSuggest,
      confidence,
      reason: `Code writing detected (confidence: ${(confidence * 100).toFixed(0)}%)`,
    };
  }

  /**
   * Evaluate question detected trigger
   */
  private evaluateQuestionDetected(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const isQuestion = inputText.includes('?') ||
                      /^(what|how|why|when|where|who|which|can|could|would|should|is|are)/i.test(inputText);

    if (!isQuestion) {
      return { triggered: false, confidence: 0, reason: 'No question detected' };
    }

    const confidence = 0.8; // Questions are clear signals

    return {
      triggered: true,
      confidence,
      reason: 'Question detected - research agent may help',
    };
  }

  /**
   * Evaluate long conversation trigger
   */
  private evaluateLongConversation(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    const LONG_CONVERSATION_THRESHOLD = 20;

    if (context.messageCount < LONG_CONVERSATION_THRESHOLD) {
      return {
        triggered: false,
        confidence: context.messageCount / LONG_CONVERSATION_THRESHOLD,
        reason: `Conversation not long enough (${context.messageCount}/${LONG_CONVERSATION_THRESHOLD} messages)`,
      };
    }

    const confidence = Math.min((context.messageCount - LONG_CONVERSATION_THRESHOLD) / 20 + 0.7, 1.0);

    return {
      triggered: true,
      confidence,
      reason: `Long conversation detected (${context.messageCount} messages) - summarization may help`,
    };
  }

  /**
   * Evaluate emotion detected trigger
   */
  private evaluateEmotionDetected(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const patternStrength = calculatePatternStrength(
      ProactiveTriggerType.EMOTION_DETECTED,
      {
        inputText,
        messageCount: context.messageCount,
        conversationDuration: context.conversationDuration,
        recentMessages: context.recentMessages as any,
      }
    );

    const confidence = patternStrength;

    return {
      triggered: confidence > 0.5,
      confidence,
      reason: confidence > 0.5 ? 'Emotion detected - JEPA analysis may help' : 'No strong emotion detected',
    };
  }

  /**
   * Evaluate complex task trigger
   */
  private evaluateComplexTask(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const patternStrength = calculatePatternStrength(
      ProactiveTriggerType.COMPLEX_TASK,
      {
        inputText,
        messageCount: context.messageCount,
        conversationDuration: context.conversationDuration,
        recentMessages: context.recentMessages as any,
      }
    );

    return {
      triggered: patternStrength > 0.6,
      confidence: patternStrength,
      reason: patternStrength > 0.6 ? 'Complex task detected - Spreader may help parallelize' : 'Task appears straightforward',
    };
  }

  /**
   * Evaluate help request trigger
   */
  private evaluateHelpRequest(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const lowerContent = inputText.toLowerCase();
    const isHelpRequest = lowerContent.includes('help') ||
                         lowerContent.includes('assist') ||
                         lowerContent.startsWith('can you') ||
                         lowerContent.startsWith('could you');

    if (!isHelpRequest) {
      return { triggered: false, confidence: 0, reason: 'No help request detected' };
    }

    return {
      triggered: true,
      confidence: 0.9,
      reason: 'Help request detected',
    };
  }

  /**
   * Evaluate debugging trigger
   */
  private evaluateDebugging(context: ProactiveContext): {
    triggered: boolean;
    confidence: number;
    reason: string;
  } {
    if (context.recentMessages.length === 0) {
      return { triggered: false, confidence: 0, reason: 'No messages to analyze' };
    }

    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    const inputText = lastMessage.content?.text || '';
    const patternStrength = calculatePatternStrength(
      ProactiveTriggerType.DEBUGGING,
      {
        inputText,
        messageCount: context.messageCount,
        conversationDuration: context.conversationDuration,
        recentMessages: context.recentMessages as any,
      }
    );

    return {
      triggered: patternStrength > 0.7,
      confidence: patternStrength,
      reason: patternStrength > 0.7 ? 'Debugging detected - code reviewer may help' : 'No debugging detected',
    };
  }

  // ========================================================================
  // ACTION CREATION
  // ========================================================================

  /**
   * Create agent actions for a trigger
   */
  private createAgentActions(
    triggerType: ProactiveTriggerType,
    context: ProactiveContext,
    confidence: number,
    reason: string
  ): ProactiveAgentAction[] {
    const agentIds = this.agentMappings[triggerType] || [];
    const actions: ProactiveAgentAction[] = [];

    for (const agentId of agentIds) {
      // Check if agent is already active
      if (context.activeAgents.includes(agentId)) {
        continue;
      }

      const action: ProactiveAgentAction = {
        id: `proactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agentId,
        triggerType,
        conversationId: context.conversation.id,
        confidence,
        reason,
        expectedBenefit: this.getExpectedBenefit(triggerType, agentId),
        timestamp: Date.now(),
        executed: false,
      };

      actions.push(action);
    }

    return actions;
  }

  /**
   * Get expected benefit for proactive action
   */
  private getExpectedBenefit(triggerType: ProactiveTriggerType, agentId: string): string {
    const benefits: Record<ProactiveTriggerType, string> = {
      [ProactiveTriggerType.CODE_WRITING]: 'Catch potential issues early and improve code quality',
      [ProactiveTriggerType.QUESTION_DETECTED]: 'Provide relevant information and context',
      [ProactiveTriggerType.LONG_CONVERSATION]: 'Summarize key points and reduce clutter',
      [ProactiveTriggerType.EMOTION_DETECTED]: 'Track emotional patterns and provide insights',
      [ProactiveTriggerType.COMPLEX_TASK]: 'Parallelize work and complete tasks faster',
      [ProactiveTriggerType.HELP_REQUEST]: 'Provide timely assistance and guidance',
      [ProactiveTriggerType.DEBUGGING]: 'Identify and fix bugs more efficiently',
      [ProactiveTriggerType.AGENT_TRANSITION]: 'Smooth workflow transitions',
      [ProactiveTriggerType.TIME_BASED]: 'Automate routine tasks',
      [ProactiveTriggerType.CONTEXT_SWITCH]: 'Maintain context across changes',
      [ProactiveTriggerType.REPETITIVE_TASK]: 'Automate repetitive work',
    };

    return benefits[triggerType] || 'Improve your workflow';
  }

  // ========================================================================
  // PROCESSING
  // ========================================================================

  /**
   * Process trigger evaluations into actions
   */
  private async processEvaluations(
    evaluations: TriggerEvaluation[],
    context: ProactiveContext
  ): Promise<ProactiveAgentAction[]> {
    const actions: ProactiveAgentAction[] = [];

    for (const evaluation of evaluations) {
      // Filter actions by confidence threshold
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

    // Sort by confidence
    actions.sort((a, b) => b.confidence - a.confidence);

    return actions;
  }

  // ========================================================================
  // HISTORY & STATISTICS
  // ========================================================================

  /**
   * Record action in history
   */
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

    // Trim history if needed
    if (this.actionHistory.length > this.config.historySize) {
      this.actionHistory = this.actionHistory.slice(-this.config.historySize);
    }

    // Update trigger preferences
    const triggerPref = this.preferences.triggerPreferences[action.triggerType];
    if (userResponse === 'accept') {
      triggerPref.acceptCount++;
    } else {
      triggerPref.dismissCount++;
    }

    // Update feedback score
    if (action.userFeedback) {
      const currentScore = triggerPref.feedbackScore;
      const newScore = action.userFeedback === 'helpful' ? 1 : action.userFeedback === 'not_helpful' ? 0 : 0.5;
      triggerPref.feedbackScore = currentScore * 0.8 + newScore * 0.2;
    }

    // Calibrate thresholds periodically
    if (this.actionHistory.length % 20 === 0) {
      this.config.confidenceThresholds = calibrateThresholds(
        this.config.confidenceThresholds,
        this.actionHistory
      );
    }
  }

  /**
   * Get proactive statistics
   */
  getStatistics(): ProactiveStatistics {
    const totalSuggestions = this.actionHistory.length;
    const totalExecuted = this.actionHistory.filter(h => h.executed).length;
    const acceptanceRate = totalSuggestions > 0 ? totalExecuted / totalSuggestions : 0;
    const avgConfidence = totalSuggestions > 0
      ? this.actionHistory.reduce((sum, h) => sum + h.confidence, 0) / totalSuggestions
      : 0;

    // Calculate per-trigger stats
    const triggerStats: Record<string, any> = {};
    for (const triggerType of Object.values(ProactiveTriggerType)) {
      const triggerHistory = this.actionHistory.filter(h => h.triggerType === triggerType);
      const acceptCount = triggerHistory.filter(h => h.userResponse === 'accept').length;
      const avgConf = triggerHistory.length > 0
        ? triggerHistory.reduce((sum, h) => sum + h.confidence, 0) / triggerHistory.length
        : 0;

      triggerStats[triggerType] = {
        triggerCount: triggerHistory.length,
        acceptCount,
        acceptanceRate: triggerHistory.length > 0 ? acceptCount / triggerHistory.length : 0,
        avgConfidence: avgConf,
        avgTimeToActivation: 0, // Would be calculated from timing data
        feedbackScore: triggerHistory.length > 0
          ? triggerHistory.reduce((sum, h) => sum + (h.feedbackScore || 0), 0) / triggerHistory.length
          : 0.5,
      };
    }

    return {
      totalSuggestions,
      totalExecuted,
      acceptanceRate,
      avgConfidence,
      triggerStats,
      anticipation: {
        avgTime: 25000, // Would be calculated from actual timing
        bestTime: 10000,
        targetTime: this.config.targetAnticipationTime,
      },
    };
  }

  /**
   * Get action history
   */
  getActionHistory(): ProactiveActionHistory[] {
    return [...this.actionHistory];
  }

  // ========================================================================
  // PREFERENCES & CONFIG
  // ========================================================================

  /**
   * Update proactive preferences
   */
  updatePreferences(updates: Partial<ProactivePreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    console.log('[Proactive Engine] Preferences updated', updates);
  }

  /**
   * Get proactive preferences
   */
  getPreferences(): ProactivePreferences {
    return { ...this.preferences };
  }

  /**
   * Update proactive config
   */
  updateConfig(updates: Partial<ProactiveConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('[Proactive Engine] Config updated', updates);
  }

  /**
   * Get proactive config
   */
  getConfig(): ProactiveConfig {
    return { ...this.config };
  }

  // ========================================================================
  // COOLDOWN MANAGEMENT
  // ========================================================================

  /**
   * Check if trigger is in cooldown
   */
  private isTriggerInCooldown(triggerType: ProactiveTriggerType): boolean {
    const lastTriggered = this.triggerCooldowns.get(triggerType);
    if (!lastTriggered) {
      return false;
    }

    const cooldownMs = this.config.confidenceThresholds.cooldownMs;
    return Date.now() - lastTriggered < cooldownMs;
  }

  /**
   * Set trigger cooldown
   */
  private setTriggerCooldown(triggerType: ProactiveTriggerType): void {
    this.triggerCooldowns.set(triggerType, Date.now());
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Calculate conversation duration
   */
  private calculateConversationDuration(conversation: Conversation): number {
    if (conversation.messages.length === 0) {
      return 0;
    }

    const firstMessage = conversation.messages[0];
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const firstTime = parseInt(firstMessage.timestamp);
    const lastTime = parseInt(lastMessage.timestamp);
    return lastTime - firstTime;
  }

  /**
   * Calculate time since last message
   */
  private calculateTimeSinceLastMessage(recentMessages: Message[]): number {
    if (recentMessages.length === 0) {
      return Infinity;
    }

    const lastMessage = recentMessages[recentMessages.length - 1];
    const lastTime = parseInt(lastMessage.timestamp);
    return Date.now() - lastTime;
  }

  /**
   * Main evaluation loop
   */
  private evaluate(): void {
    this.lastEvaluation = Date.now();
    // Actual evaluation happens via evaluateProactiveActions
    // This is just a placeholder for periodic tasks
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let proactiveEngineInstance: ProactiveEngine | null = null;

/**
 * Get the proactive engine singleton
 */
export function getProactiveEngine(): ProactiveEngine {
  if (!proactiveEngineInstance) {
    proactiveEngineInstance = new ProactiveEngine();
  }
  return proactiveEngineInstance;
}

/**
 * Initialize and start the proactive engine
 */
export function initializeProactiveEngine(): ProactiveEngine {
  const engine = getProactiveEngine();
  engine.start();
  return engine;
}
