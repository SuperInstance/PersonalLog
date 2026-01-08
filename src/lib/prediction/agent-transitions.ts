/**
 * Agent Transition Tracking System
 *
 * Records and manages agent usage transitions for ML model training.
 * Tracks when agents are activated, deactivated, and how they transition between each other.
 *
 * @example
 * ```typescript
 * import { transitionTracker } from '@/lib/prediction';
 *
 * // Track an agent activation
 * await transitionTracker.recordTransition({
 *   fromAgentId: 'jepa-v1',
 *   toAgentId: 'spreader-v1',
 *   conversationId: 'conv_123',
 *   taskType: TaskType.ANALYSIS,
 *   // ... other fields
 * });
 *
 * // Get transition history
 * const history = await transitionTracker.getTransitionHistory('conv_123');
 * ```
 */

import {
  AgentTransition,
  TaskType,
  TimeOfDay,
  ActionRecord,
  ActionType,
  TransitionStoreSchema,
} from './types';
import type { Message, Conversation } from '@/types/conversation';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

interface AgentTransitionDB extends DBSchema {
  transitions: {
    key: string;
    value: AgentTransition;
    indexes: {
      byConversation: string;
      byAgent: string;
      byTimestamp: number;
      byTaskType: TaskType;
      bySession: string;
    };
  };
  actions: {
    key: string;
    value: ActionRecord;
    indexes: {
      byConversation: string;
      byTimestamp: number;
      byType: ActionType;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      startTime: number;
      lastActivity: number;
      transitionCount: number;
    };
  };
}

// ============================================================================
// TRANSITION TRACKER CLASS
// ============================================================================

/**
 * Agent Transition Tracker
 *
 * Singleton class that manages agent transition data collection and storage.
 */
export class AgentTransitionTracker {
  private db: IDBPDatabase<AgentTransitionDB> | null = null;
  private readonly DB_NAME = 'AgentTransitionDB';
  private readonly DB_VERSION = 1;
  private currentSessionId: string | null = null;
  private actionHistory: ActionRecord[] = [];
  private readonly MAX_ACTION_HISTORY = 100;

  /**
   * Initialize the tracker and open database connection
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    this.db = await openDB<AgentTransitionDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Transitions store
        if (!db.objectStoreNames.contains('transitions')) {
          const transitionStore = db.createObjectStore('transitions', {
            keyPath: 'id',
          });
          transitionStore.createIndex('byConversation', 'conversationId');
          transitionStore.createIndex('byAgent', 'toAgentId');
          transitionStore.createIndex('byTimestamp', 'timestamp');
          transitionStore.createIndex('byTaskType', 'taskType');
          transitionStore.createIndex('bySession', 'sessionId');
        }

        // Actions store
        if (!db.objectStoreNames.contains('actions')) {
          const actionStore = db.createObjectStore('actions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          actionStore.createIndex('byConversation', 'conversationId');
          actionStore.createIndex('byTimestamp', 'timestamp');
          actionStore.createIndex('byType', 'type');
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', {
            keyPath: 'id',
          });
        }
      },
    });

    // Start or resume session
    await this.startSession();
  }

  /**
   * Start a new tracking session
   */
  private async startSession(): Promise<void> {
    const sessionId = this.generateSessionId();
    this.currentSessionId = sessionId;

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.db.put('sessions', {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      transitionCount: 0,
    });
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  // ========================================================================
  // ACTION TRACKING
  // ========================================================================

  /**
   * Record an action for context tracking
   *
   * @param type - Action type
   * @param conversationId - Conversation ID
   * @param agentId - Optional agent ID
   * @param context - Additional context data
   */
  async recordAction(
    type: ActionType,
    conversationId: string,
    agentId?: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.ensureInitialized();

    const action: ActionRecord = {
      type,
      timestamp: Date.now(),
      agentId,
      conversationId,
      context,
    };

    // Add to in-memory history
    this.actionHistory.push(action);

    // Limit history size
    if (this.actionHistory.length > this.MAX_ACTION_HISTORY) {
      this.actionHistory = this.actionHistory.slice(-this.MAX_ACTION_HISTORY);
    }

    // Persist to database
    if (this.db) {
      await this.db.add('actions', action);
    }
  }

  /**
   * Get recent actions for a conversation
   *
   * @param conversationId - Conversation ID
   * @param limit - Maximum number of actions to return
   * @returns Recent actions
   */
  async getRecentActions(
    conversationId: string,
    limit: number = 5
  ): Promise<ActionRecord[]> {
    await this.ensureInitialized();

    if (!this.db) {
      return [];
    }

    // Get from in-memory history first
    const memoryActions = this.actionHistory
      .filter((a) => a.conversationId === conversationId)
      .slice(-limit);

    // If we have enough in memory, return those
    if (memoryActions.length >= limit) {
      return memoryActions;
    }

    // Otherwise, fetch from database
    const tx = this.db.transaction('actions', 'readonly');
    const index = tx.store.index('byConversation');

    const actions: ActionRecord[] = [];
    let count = 0;

    for await (const cursor of index.iterate(conversationId)) {
      if (count >= limit) {
        break;
      }
      actions.push(cursor.value);
      count++;
    }

    return actions.reverse();
  }

  // ========================================================================
  // TRANSITION TRACKING
  // ========================================================================

  /**
   * Record an agent transition
   *
   * @param transition - Transition data (without ID)
   * @returns The recorded transition with generated ID
   */
  async recordTransition(
    transition: Omit<AgentTransition, 'id' | 'timestamp' | 'userId' | 'sessionId'>
  ): Promise<AgentTransition> {
    await this.ensureInitialized();

    if (!this.db || !this.currentSessionId) {
      throw new Error('Database not initialized');
    }

    // Create full transition record
    const fullTransition: AgentTransition = {
      ...transition,
      id: this.generateTransitionId(),
      timestamp: Date.now(),
      userId: 'default',
      sessionId: this.currentSessionId,
    };

    // Store transition
    await this.db.add('transitions', fullTransition);

    // Update session activity
    const session = await this.db.get('sessions', this.currentSessionId);
    if (session) {
      session.lastActivity = Date.now();
      session.transitionCount += 1;
      await this.db.put('sessions', session);
    }

    // Record action
    await this.recordAction(
      ActionType.AGENT_ACTIVATED,
      transition.conversationId,
      transition.toAgentId,
      { fromAgentId: transition.fromAgentId }
    );

    return fullTransition;
  }

  /**
   * Record agent completion
   *
   * @param agentId - Agent ID
   * @param conversationId - Conversation ID
   * @param success - Whether the agent completed successfully
   */
  async recordAgentCompletion(
    agentId: string,
    conversationId: string,
    success: boolean = true
  ): Promise<void> {
    await this.recordAction(
      ActionType.AGENT_COMPLETED,
      conversationId,
      agentId,
      { success }
    );
  }

  /**
   * Generate a unique transition ID
   */
  private generateTransitionId(): string {
    return `trans_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // ========================================================================
  // DATA RETRIEVAL
  // ========================================================================

  /**
   * Get transition history for a conversation
   *
   * @param conversationId - Conversation ID
   * @returns Array of transitions
   */
  async getTransitionHistory(conversationId: string): Promise<AgentTransition[]> {
    await this.ensureInitialized();

    if (!this.db) {
      return [];
    }

    const tx = this.db.transaction('transitions', 'readonly');
    const index = tx.store.index('byConversation');

    const transitions: AgentTransition[] = [];
    for await (const cursor of index.iterate(conversationId)) {
      transitions.push(cursor.value);
    }

    return transitions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all transitions for an agent
   *
   * @param agentId - Agent ID
   * @returns Array of transitions
   */
  async getTransitionsByAgent(agentId: string): Promise<AgentTransition[]> {
    await this.ensureInitialized();

    if (!this.db) {
      return [];
    }

    const tx = this.db.transaction('transitions', 'readonly');
    const index = tx.store.index('byAgent');

    const transitions: AgentTransition[] = [];
    for await (const cursor of index.iterate(agentId)) {
      transitions.push(cursor.value);
    }

    return transitions.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get transitions within a time range
   *
   * @param startTime - Start timestamp
   * @param endTime - End timestamp
   * @returns Array of transitions
   */
  async getTransitionsByTimeRange(
    startTime: number,
    endTime: number
  ): Promise<AgentTransition[]> {
    await this.ensureInitialized();

    if (!this.db) {
      return [];
    }

    const tx = this.db.transaction('transitions', 'readonly');
    const index = tx.store.index('byTimestamp');

    const transitions: AgentTransition[] = [];
    for await (const cursor of index.iterate(
      IDBKeyRange.bound(startTime, endTime)
    )) {
      transitions.push(cursor.value);
    }

    return transitions;
  }

  /**
   * Get all transitions for training
   *
   * @param limit - Maximum number of transitions to return
   * @returns Array of transitions
   */
  async getAllTransitions(limit?: number): Promise<AgentTransition[]> {
    await this.ensureInitialized();

    if (!this.db) {
      return [];
    }

    const tx = this.db.transaction('transitions', 'readonly');
    const transitions: AgentTransition[] = [];

    if (limit) {
      let count = 0;
      for await (const cursor of tx.store) {
        if (count >= limit) {
          break;
        }
        transitions.push(cursor.value);
        count++;
      }
    } else {
      for await (const cursor of tx.store) {
        transitions.push(cursor.value);
      }
    }

    return transitions.sort((a, b) => a.timestamp - b.timestamp);
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  /**
   * Get transition statistics
   *
   * @returns Statistics about recorded transitions
   */
  async getStatistics(): Promise<{
    totalTransitions: number;
    totalActions: number;
    transitionsByAgent: Map<string, number>;
    transitionsByTaskType: Map<TaskType, number>;
    transitionsByTimeOfDay: Map<TimeOfDay, number>;
  }> {
    await this.ensureInitialized();

    if (!this.db) {
      return {
        totalTransitions: 0,
        totalActions: 0,
        transitionsByAgent: new Map(),
        transitionsByTaskType: new Map(),
        transitionsByTimeOfDay: new Map(),
      };
    }

    const transitions = await this.getAllTransitions();

    const transitionsByAgent = new Map<string, number>();
    const transitionsByTaskType = new Map<TaskType, number>();
    const transitionsByTimeOfDay = new Map<TimeOfDay, number>();

    for (const trans of transitions) {
      // Count by agent
      transitionsByAgent.set(
        trans.toAgentId,
        (transitionsByAgent.get(trans.toAgentId) || 0) + 1
      );

      // Count by task type
      transitionsByTaskType.set(
        trans.taskType,
        (transitionsByTaskType.get(trans.taskType) || 0) + 1
      );

      // Count by time of day
      transitionsByTimeOfDay.set(
        trans.timeOfDay,
        (transitionsByTimeOfDay.get(trans.timeOfDay) || 0) + 1
      );
    }

    // Get total actions count
    const tx = this.db.transaction('actions', 'readonly');
    let totalActions = 0;
    for await (const _ of tx.store) {
      totalActions++;
    }

    return {
      totalTransitions: transitions.length,
      totalActions,
      transitionsByAgent,
      transitionsByTaskType,
      transitionsByTimeOfDay,
    };
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Determine time of day from timestamp
   *
   * @param timestamp - Unix timestamp
   * @returns Time of day category
   */
  static getTimeOfDay(timestamp: number): TimeOfDay {
    const hour = new Date(timestamp).getHours();

    if (hour >= 6 && hour < 12) {
      return TimeOfDay.MORNING;
    } else if (hour >= 12 && hour < 18) {
      return TimeOfDay.AFTERNOON;
    } else if (hour >= 18 && hour < 24) {
      return TimeOfDay.EVENING;
    } else {
      return TimeOfDay.NIGHT;
    }
  }

  /**
   * Infer task type from conversation context
   *
   * @param conversation - Conversation object
   * @param recentMessage - Recent message to analyze
   * @returns Inferred task type
   */
  static inferTaskType(
    conversation: Conversation,
    recentMessage?: Message
  ): TaskType {
    // Analyze recent messages for task indicators
    const messages = recentMessage
      ? [recentMessage]
      : conversation.messages.slice(-10);

    const text = messages
      .map((m) => m.content.text?.toLowerCase() || '')
      .join(' ');

    // Task type keyword patterns
    const patterns = {
      [TaskType.CODING]: [
        'code',
        'function',
        'bug',
        'debug',
        'implement',
        'refactor',
        'api',
        'test',
        'deploy',
        'git',
        'typescript',
        'javascript',
      ],
      [TaskType.WRITING]: [
        'write',
        'draft',
        'edit',
        'content',
        'blog',
        'article',
        'story',
        'narrative',
      ],
      [TaskType.ANALYSIS]: [
        'analyze',
        'research',
        'investigate',
        'explore',
        'understand',
        'review',
        'examine',
      ],
      [TaskType.DEBUGGING]: [
        'error',
        'issue',
        'fix',
        'broken',
        'not working',
        'failure',
        'crash',
      ],
      [TaskType.PLANNING]: [
        'plan',
        'schedule',
        'roadmap',
        'strategy',
        'organize',
        'structure',
      ],
      [TaskType.LEARNING]: [
        'learn',
        'explain',
        'understand',
        'teach',
        'tutorial',
        'how to',
        'what is',
      ],
    };

    // Score each task type
    const scores = new Map<TaskType, number>();
    for (const [taskType, keywords] of Object.entries(patterns)) {
      const score = keywords.filter((kw) => text.includes(kw)).length;
      scores.set(taskType as TaskType, score);
    }

    // Find highest score
    let maxScore = 0;
    let bestTask = TaskType.GENERAL;

    for (const [taskType, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        bestTask = taskType;
      }
    }

    return bestTask;
  }

  // ========================================================================
  // CLEARING
  // ========================================================================

  /**
   * Clear all transition data
   *
   * @warning This cannot be undone
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      return;
    }

    const tx = this.db.transaction(['transitions', 'actions', 'sessions'], 'readwrite');
    await tx.objectStore('transitions').clear();
    await tx.objectStore('actions').clear();
    await tx.objectStore('sessions').clear();

    this.actionHistory = [];
    await this.startSession();
  }

  /**
   * Clear data older than specified days
   *
   * @param days - Number of days to keep
   */
  async clearOldData(days: number): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      return;
    }

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const tx = this.db.transaction('transitions', 'readwrite');
    const index = tx.store.index('byTimestamp');

    for await (const cursor of index.iterate(IDBKeyRange.upperBound(cutoffTime))) {
      cursor.delete();
    }
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

/**
 * Global agent transition tracker instance
 */
export const transitionTracker = new AgentTransitionTracker();
