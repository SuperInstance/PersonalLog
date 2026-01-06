/**
 * Agent Communication Integrations
 *
 * Agent-specific message handlers and integration examples.
 *
 * NOTE: This is a simplified reference implementation showing how agents
 * could communicate. In production, each agent would implement its own
 * communication handlers based on its specific capabilities.
 */

import { agentEventBus } from './event-bus';
import { MessageType, type AgentMessage } from './types';

/**
 * JEPA Agent Communication Handler (Reference Implementation)
 *
 * This shows how JEPA could handle messages from other agents.
 * In production, this would be integrated into the actual JEPAAgentHandler class.
 */
export class JEPAAgentCommunicationHandler {
  constructor(private agentId: string = 'jepa-v1') {
    // Subscribe to messages
    agentEventBus.subscribe(this.agentId, this.handleMessage.bind(this));
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    console.log('[JEPA Communication] Received:', message.type, 'from', message.from.agentId);

    switch (message.type) {
      case MessageType.CONTEXT_CRITICAL:
        await this.handleContextCritical(message);
        break;

      case MessageType.COLLAB_REQUEST:
        await this.handleCollaborationRequest(message);
        break;

      case MessageType.AGENT_STATUS:
        await this.handleAgentStatus(message);
        break;

      default:
        console.log('[JEPA Communication] Unhandled message type:', message.type);
    }
  }

  /**
   * Handle context critical notification from Spreader
   */
  private async handleContextCritical(message: AgentMessage): Promise<void> {
    const { percentage, tokensUsed, tokensTotal } = message.payload as {
      percentage: number;
      tokensUsed: number;
      tokensTotal: number;
    };

    console.log(`[JEPA] Context is ${percentage}% full (${tokensUsed}/${tokensTotal} tokens)`);

    // Analyze emotional themes in recent conversation
    const recentEmotions = await this.analyzeRecentEmotionalThemes();

    // Send emotional summary to Spreader to help with compaction
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: this.agentId, type: 'agent' },
      to: message.from,
      type: MessageType.COLLAB_RESPONSE,
      payload: {
        action: 'emotional_summary_provided',
        result: {
          themes: recentEmotions,
          suggestion: this.generateCompactionSuggestion(recentEmotions)
        },
        correlationId: message.id
      } as any,
      timestamp: Date.now(),
      correlationId: message.id,
      priority: 'normal',
      status: 'pending'
    });
  }

  /**
   * Handle collaboration request from another agent
   */
  private async handleCollaborationRequest(message: AgentMessage): Promise<void> {
    const { action, params } = message.payload as {
      action: string;
      params: Record<string, unknown>;
    };

    console.log('[JEPA] Collaboration request:', action, params);

    let responsePayload: Record<string, unknown>;

    switch (action) {
      case 'analyze_emotion':
        // Analyze emotion for provided transcript
        // Note: This is a placeholder - actual implementation would call JEPA's analysis
        responsePayload = {
          emotion: {
            valence: 0.5,
            arousal: 0.5,
            dominance: 0.5,
            confidence: 0.7,
            emotions: ['neutral']
          }
        };
        break;

      case 'get_emotional_summary':
        // Get emotional summary of recent conversation
        const summary = await this.analyzeRecentEmotionalThemes();
        responsePayload = { summary };
        break;

      default:
        responsePayload = { error: 'Unknown action' };
    }

    // Send response
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: this.agentId, type: 'agent' },
      to: message.from,
      type: MessageType.COLLAB_RESPONSE,
      payload: {
        action,
        result: responsePayload,
        correlationId: message.id
      } as any,
      timestamp: Date.now(),
      correlationId: message.id,
      priority: 'normal',
      status: 'pending'
    });
  }

  /**
   * Handle agent status updates
   */
  private async handleAgentStatus(message: AgentMessage): Promise<void> {
    const { status, capabilities } = message.payload as {
      status: string;
      capabilities: string[];
    };

    console.log(`[JEPA] Agent ${message.from.agentId} status: ${status}`);
    console.log('[JEPA] Capabilities:', capabilities);
  }

  /**
   * Analyze recent emotional themes
   */
  private async analyzeRecentEmotionalThemes(): Promise<
    Array<{ emotion: string; frequency: number; timeframe: string }>
  > {
    // This would integrate with JEPA's actual analysis
    // For now, return example data
    return [
      { emotion: 'frustrated', frequency: 8, timeframe: 'last 50 messages' },
      { emotion: 'curious', frequency: 12, timeframe: 'last 50 messages' },
      { emotion: 'satisfied', frequency: 5, timeframe: 'last 50 messages' }
    ];
  }

  /**
   * Generate compaction suggestion based on emotions
   */
  private generateCompactionSuggestion(
    emotions: Array<{ emotion: string; frequency: number }>
  ): string {
    const dominantEmotion = emotions.sort((a, b) => b.frequency - a.frequency)[0];
    return `User is primarily ${dominantEmotion.emotion}. Consider preserving messages related to ${dominantEmotion.emotion} topics during compaction.`;
  }

  /**
   * Notify other agents about user frustration
   */
  notifyFrustration(emotionData: {
    valence: number;
    arousal: number;
    confidence: number;
    recentMessages: Array<{ emotion: string; timestamp: number }>;
  }): void {
    // Check if frustration is severe enough to notify
    if (emotionData.valence < 0.3 && emotionData.arousal > 0.7 && emotionData.confidence > 0.7) {
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: this.agentId, type: 'agent' },
        to: { agentId: 'spreader-v1', type: 'agent' },
        type: MessageType.USER_FRUSTRATION_DETECTED,
        payload: emotionData,
        timestamp: Date.now(),
        priority: 'high',
        status: 'pending'
      } as any);
    }
  }
}

/**
 * Spreader Agent Communication Handler (Reference Implementation)
 *
 * This shows how Spreader could handle messages from other agents.
 * In production, this would be integrated into the actual SpreaderAgent class.
 */
export class SpreaderAgentCommunicationHandler {
  constructor(private agentId: string = 'spreader-v1') {
    // Subscribe to messages
    agentEventBus.subscribe(this.agentId, this.handleMessage.bind(this));
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    console.log('[Spreader Communication] Received:', message.type, 'from', message.from.agentId);

    switch (message.type) {
      case MessageType.USER_FRUSTRATION_DETECTED:
        await this.handleUserFrustration(message);
        break;

      case MessageType.REQUEST_COMPACT:
        await this.handleRequestCompact(message);
        break;

      case MessageType.COLLAB_RESPONSE:
        await this.handleCollaborationResponse(message);
        break;

      default:
        console.log('[Spreader Communication] Unhandled message type:', message.type);
    }
  }

  /**
   * Handle user frustration detected by JEPA
   */
  private async handleUserFrustration(message: AgentMessage): Promise<void> {
    const { valence, arousal, confidence } = message.payload as {
      valence: number;
      arousal: number;
      confidence: number;
    };

    console.log(`[Spreader] User frustration detected: valence=${valence}, arousal=${arousal}`);

    // In production, would check actual context percentage
    const contextPercentage = 75; // Example value

    if (contextPercentage > 70) {
      // Suggest context compaction to reduce complexity
      console.log('[Spreader] Suggesting context compaction due to user frustration');

      // Send collaboration response to JEPA
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: this.agentId, type: 'agent' },
        to: message.from,
        type: MessageType.COLLAB_RESPONSE,
        payload: {
          action: 'compaction_suggested',
          result: {
            context: `${contextPercentage}% full`,
            reason: 'User frustration detected, reducing context complexity may help'
          },
          correlationId: message.id
        } as any,
        timestamp: Date.now(),
        correlationId: message.id,
        priority: 'high',
        status: 'pending'
      });
    }
  }

  /**
   * Handle request to compact context
   */
  private async handleRequestCompact(message: AgentMessage): Promise<void> {
    const { reason, targetSize } = message.payload as {
      reason: string;
      targetSize?: number;
    };

    console.log(`[Spreader] Compaction requested: ${reason}`);

    // Perform context compaction (placeholder)
    const compacted = {
      previousSize: 100000,
      newSize: 60000,
      compressionRatio: 0.6,
      themes: ['task', 'planning', 'implementation']
    };

    // Notify about compaction result
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: this.agentId, type: 'agent' },
      to: { agentId: 'broadcast', type: 'broadcast' },
      type: MessageType.CONTEXT_COMPACTED,
      payload: {
        previousSize: compacted.previousSize,
        newSize: compacted.newSize,
        compressionRatio: compacted.compressionRatio,
        retainedThemes: compacted.themes
      } as any,
      timestamp: Date.now(),
      priority: 'normal',
      status: 'pending'
    });
  }

  /**
   * Handle collaboration response
   */
  private async handleCollaborationResponse(message: AgentMessage): Promise<void> {
    const { action, result } = message.payload as {
      action: string;
      result: Record<string, unknown>;
    };

    console.log('[Spreader] Collaboration response:', action, result);

    switch (action) {
      case 'emotional_summary_provided':
        // Use emotional summary to inform context compaction
        console.log('[Spreader] Using emotional summary for compaction:', result);
        break;

      default:
        console.log('[Spreader] Unknown collaboration action:', action);
    }
  }

  /**
   * Notify when context becomes critical
   */
  notifyContextCritical(contextData: {
    percentage: number;
    tokensUsed: number;
    tokensTotal: number;
    schema: Record<string, unknown>;
  }): void {
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: this.agentId, type: 'agent' },
      to: { agentId: 'jepa-v1', type: 'agent' },
      type: MessageType.CONTEXT_CRITICAL,
      payload: contextData,
      timestamp: Date.now(),
      priority: 'normal',
      status: 'pending'
    } as any);
  }
}

/**
 * Example: Setting up communication for JEPA and Spreader
 */
export function setupAgentCommunication(): void {
  // Create communication handlers
  const jepaHandler = new JEPAAgentCommunicationHandler('jepa-v1');
  const spreaderHandler = new SpreaderAgentCommunicationHandler('spreader-v1');

  console.log('[Agent Communication] JEPA and Spreader communication handlers registered');

  // Send initial status messages
  agentEventBus.publish({
    id: crypto.randomUUID(),
    from: { agentId: 'jepa-v1', type: 'agent' },
    to: { agentId: 'broadcast', type: 'broadcast' },
    type: MessageType.AGENT_STATUS,
    payload: {
      status: 'active',
      capabilities: ['emotion_analysis', 'frustration_detection', 'emotional_summarization'],
      load: 0
    },
    timestamp: Date.now(),
    priority: 'low',
    status: 'pending'
  } as any);

  agentEventBus.publish({
    id: crypto.randomUUID(),
    from: { agentId: 'spreader-v1', type: 'agent' },
    to: { agentId: 'broadcast', type: 'broadcast' },
    type: MessageType.AGENT_STATUS,
    payload: {
      status: 'active',
      capabilities: ['context_management', 'schema_generation', 'context_compaction'],
      load: 0
    },
    timestamp: Date.now(),
    priority: 'low',
    status: 'pending'
  } as any);
}
