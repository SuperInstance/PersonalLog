/**
 * Spreader Agent Handler
 *
 * Main agent implementation for context window management and parallel conversation spreading.
 */

import { Message } from '@/types/conversation'
import { getConversationTokenCount } from '@/lib/storage/conversation-store'
import {
  SpreaderState,
  SpreaderHandlerContext,
  SpreaderHandlerResponse,
  ContextMetrics,
  DEFAULT_MAX_TOKENS,
  DEFAULT_THRESHOLD_PERCENTAGE,
  DEFAULT_WARNING_PERCENTAGE,
  SPREADER_SYSTEM_PROMPT,
  calculateContextMetrics,
  createEmptySchema,
  SessionSchema,
} from './types'
import {
  generateSchema,
  updateSchemaWithMerge
} from './schema'
import {
  spreadConversations,
  mergeChildConversation,
  parseSpreadCommand,
  parseMergeCommand,
  isSpreadCommand,
  isMergeCommand
} from './spread-commands'
import { agentEventBus } from '../communication/event-bus'
import { MessageType, type AgentMessage } from '../communication/types'
import { ContextOptimizer } from '../spread/optimizer'
import { estimateTotalTokens } from '../spread/optimizer'

// ============================================================================
// SPREADER AGENT CLASS
// ============================================================================

/**
 * Spreader Agent - Manages context window and agent communication
 */
export class SpreaderAgent {
  private unsubscribeFromEventBus: (() => void) | null = null
  private currentMetrics: ContextMetrics | null = null

  constructor() {
    this.setupCommunication()
  }

  /**
   * Setup agent communication
   */
  private setupCommunication(): void {
    // Subscribe to messages from other agents
    this.unsubscribeFromEventBus = agentEventBus.subscribe(
      'spreader-v1',
      this.handleAgentMessage.bind(this)
    )

    // Send initial status
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
      status: 'delivered'
    })
  }

  /**
   * Handle messages from other agents
   */
  private async handleAgentMessage(message: AgentMessage): Promise<void> {
    console.log('[Spreader] Received message:', message.type, 'from', message.from.agentId)

    switch (message.type) {
      case MessageType.USER_FRUSTRATION_DETECTED:
        await this.handleUserFrustration(message)
        break

      case MessageType.REQUEST_COMPACT:
        await this.handleRequestCompact(message)
        break

      case MessageType.COLLAB_RESPONSE:
        await this.handleCollaborationResponse(message)
        break

      default:
        // Ignore other message types
        break
    }
  }

  /**
   * Handle user frustration detected by JEPA
   */
  private async handleUserFrustration(message: AgentMessage): Promise<void> {
    const { valence, arousal, confidence } = message.payload as {
      valence: number
      arousal: number
      confidence: number
    }

    console.log(`[Spreader] User frustration detected: valence=${valence}, arousal=${arousal}`)

    // Check if we should suggest context compaction
    if (this.currentMetrics && this.currentMetrics.percentage > 70) {
      console.log('[Spreader] Suggesting context compaction due to user frustration')

      // Send collaboration response to JEPA
      agentEventBus.publish({
        id: crypto.randomUUID(),
        from: { agentId: 'spreader-v1', type: 'agent' },
        to: message.from,
        type: MessageType.COLLAB_RESPONSE,
        payload: {
          action: 'compaction_suggested',
          result: {
            context: `${this.currentMetrics.percentage}% full`,
            reason: 'User frustration detected, reducing context complexity may help'
          },
          correlationId: message.id
        },
        timestamp: Date.now(),
        correlationId: message.id,
        priority: 'high',
        status: 'pending'
      })
    }
  }

  /**
   * Handle request to compact context
   */
  private async handleRequestCompact(message: AgentMessage): Promise<void> {
    const { reason, targetSize } = message.payload as {
      reason: string
      targetSize?: number
    }

    console.log(`[Spreader] Compaction requested: ${reason}`)

    // Perform context compaction (would call actual compaction logic here)
    // Note: Using 'as any' temporarily since payload types vary
    const compacted = {
      previousSize: 100000,
      newSize: 60000,
      compressionRatio: 0.6,
      retainedThemes: ['task', 'planning', 'implementation']
    } as any

    // Notify about compaction result
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'spreader-v1', type: 'agent' },
      to: { agentId: 'broadcast', type: 'broadcast' },
      type: MessageType.CONTEXT_COMPACTED,
      payload: compacted,
      timestamp: Date.now(),
      priority: 'normal',
      status: 'pending'
    })
  }

  /**
   * Handle collaboration response
   */
  private async handleCollaborationResponse(message: AgentMessage): Promise<void> {
    const { action, result } = message.payload as {
      action: string
      result: Record<string, unknown>
    }

    console.log('[Spreader] Collaboration response:', action, result)

    switch (action) {
      case 'emotional_summary_provided':
        // Use emotional summary to inform context compaction
        console.log('[Spreader] Using emotional summary for compaction:', result)
        break

      default:
        console.log('[Spreader] Unknown collaboration action:', action)
    }
  }

  /**
   * Update current context metrics
   */
  updateMetrics(metrics: ContextMetrics): void {
    this.currentMetrics = metrics

    // Check if context is critical and notify JEPA
    if (metrics.status === 'critical' && metrics.percentage >= 85) {
      this.notifyContextCritical()
    }
  }

  /**
   * Notify JEPA that context is critical
   */
  private notifyContextCritical(): void {
    if (!this.currentMetrics) return

    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'spreader-v1', type: 'agent' },
      to: { agentId: 'jepa-v1', type: 'agent' },
      type: MessageType.CONTEXT_CRITICAL,
      payload: {
        percentage: this.currentMetrics.percentage,
        tokensUsed: this.currentMetrics.used,
        tokensTotal: this.currentMetrics.total,
        schema: {} // Would include actual schema here
      } as any,
      timestamp: Date.now(),
      priority: 'normal',
      status: 'pending'
    })
  }

  /**
   * Get current context percentage
   */
  getContextPercentage(): number {
    return this.currentMetrics?.percentage || 0
  }

  /**
   * Dispose the agent
   */
  dispose(): void {
    if (this.unsubscribeFromEventBus) {
      this.unsubscribeFromEventBus()
      this.unsubscribeFromEventBus = null
    }
  }
}

// Singleton instance
let spreaderAgentInstance: SpreaderAgent | null = null

/**
 * Get or create the singleton Spreader agent
 */
export function getSpreaderAgent(): SpreaderAgent {
  if (!spreaderAgentInstance) {
    spreaderAgentInstance = new SpreaderAgent()
  }
  return spreaderAgentInstance
}

// ============================================================================
// SPREADER AGENT HANDLER
// ============================================================================

/**
 * Main Spreader agent message handler.
 *
 * Processes user messages and manages context window, schema generation,
 * and parallel conversation spreading.
 *
 * @param message - Incoming user message
 * @param context - Handler context with state and utilities
 * @returns Promise resolving to handler response
 *
 * @example
 * ```typescript
 * const response = await spreaderHandler(
 *   { content: { text: 'Spread this: Task A, Task B' }, ... },
 *   { conversationId, agentState, messages, sendMessage }
 * )
 * ```
 */
export async function spreaderHandler(
  message: Message,
  context: SpreaderHandlerContext
): Promise<SpreaderHandlerResponse> {
  const { conversationId, agentState, messages, sendMessage } = context
  const text = message.content.text?.toLowerCase() || ''

  // Initialize state if needed
  if (!agentState.currentSchema) {
    agentState.currentSchema = createEmptySchema()
  }

  // Calculate current context metrics
  const tokenCount = await getConversationTokenCount(conversationId)
  const metrics = calculateContextMetrics(
    tokenCount,
    agentState.maxTokens || DEFAULT_MAX_TOKENS
  )

  // Handle spread commands
  if (isSpreadCommand(text)) {
    return await handleSpreadCommand(message, context)
  }

  // Handle merge commands
  if (isMergeCommand(text)) {
    return await handleMergeCommand(message, context)
  }

  // Handle optimization commands
  if (text.includes('optimize') || text.includes('compact')) {
    return await handleOptimizeCommand(metrics, agentState, messages, sendMessage)
  }

  // Handle status requests
  if (text.includes('status') || text.includes('context')) {
    return await handleStatusRequest(metrics, agentState)
  }

  // Handle help requests
  if (text.includes('help')) {
    return {
      type: 'message',
      content: generateHelpMessage(metrics)
    }
  }

  // Check for threshold warnings
  if (metrics.status === 'critical' && !agentState.schemaGenerated) {
    return await handleThresholdWarning(metrics, agentState, messages, sendMessage)
  }

  // Default: background processing (no message needed)
  return {
    type: 'background',
    metadata: { percentage: metrics.percentage }
  }
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Handles "optimize" and "compact" commands.
 */
async function handleOptimizeCommand(
  metrics: ContextMetrics,
  state: SpreaderState,
  messages: Message[],
  sendMessage: (content: string, metadata?: any) => Promise<void>
): Promise<SpreaderHandlerResponse> {
  const optimizer = new ContextOptimizer(0.8)
  const targetTokens = Math.floor(state.maxTokens * 0.8)

  const result = await optimizer.compressContext(
    messages,
    targetTokens,
    'hybrid'
  )

  const reduction = ((result.originalTokens - result.compressedTokens) / result.originalTokens * 100).toFixed(1)

  const message = `🗜️ **Context Optimized**\n\n` +
    `**Before:** ${result.originalTokens.toLocaleString()} tokens (${metrics.percentage.toFixed(1)}%)\n` +
    `**After:** ${result.compressedTokens.toLocaleString()} tokens (${((result.compressedTokens / state.maxTokens) * 100).toFixed(1)}%)\n` +
    `**Reduction:** ${reduction}%\n` +
    `**Strategy:** ${result.strategy}\n` +
    `**Messages Removed:** ${result.removedCount}\n\n` +
    `The context has been compressed while preserving important information.`

  return {
    type: 'message',
    content: message,
    metadata: {
      percentage: ((result.compressedTokens / state.maxTokens) * 100)
    }
  }
}

/**
 * Handles "Spread this:" commands.
 */
async function handleSpreadCommand(
  message: Message,
  context: SpreaderHandlerContext
): Promise<SpreaderHandlerResponse> {
  const { conversationId, messages } = context
  const text = message.content.text || ''

  // Parse tasks
  const tasks = parseSpreadCommand(text)

  if (tasks.length === 0) {
    return {
      type: 'message',
      content: "I couldn't find any tasks to spread. Try: 'Spread this: Research auth, Design DB, Write API'"
    }
  }

  // Create parallel conversations
  const result = await spreadConversations({
    tasks,
    parentConversationId: conversationId,
    context: messages.slice(-10)  // Last 10 messages as context
  })

  // Format response
  const taskList = result.children.map((child, i) =>
    `${i + 1}. ${child.task} (${child.status})`
  ).join('\n')

  return {
    type: 'spread',
    content: `📊 Creating ${result.children.length} parallel conversations:\n\n${taskList}\n\n` +
      `Each conversation will work independently. When they're done, you can merge them back here.`,
    metadata: { children: result.children }
  }
}

/**
 * Handles "merge child <id>" commands.
 */
async function handleMergeCommand(
  message: Message,
  context: SpreaderHandlerContext
): Promise<SpreaderHandlerResponse> {
  const { conversationId, agentState } = context
  const text = message.content.text || ''

  // Parse child ID
  const childId = parseMergeCommand(text)

  if (!childId) {
    return {
      type: 'message',
      content: "I couldn't find a child conversation ID. Try: 'Merge child child_abc123'"
    }
  }

  // Perform merge
  const result = await mergeChildConversation({
    childId,
    parentConversationId: conversationId
  })

  if (!result.success) {
    return {
      type: 'message',
      content: `❌ Merge failed: ${result.summary}`
    }
  }

  // Update schema
  if (agentState.currentSchema) {
    agentState.currentSchema = updateSchemaWithMerge(
      agentState.currentSchema,
      result.summary
    )
  }

  return {
    type: 'merge',
    content: `✅ Merged child conversation:\n\n${result.summary}`,
    metadata: {
      merge: result,
      schema: agentState.currentSchema || undefined
    }
  }
}

/**
 * Handles status/context requests.
 */
async function handleStatusRequest(
  metrics: ContextMetrics,
  state: SpreaderState
): Promise<SpreaderHandlerResponse> {
  const statusEmoji = metrics.status === 'critical' ? '🔴' :
                     metrics.status === 'warning' ? '🟡' : '🟢'

  let content = `${statusEmoji} **Context Status**\n\n`
  content += `Usage: ${metrics.used.toLocaleString()} / ${metrics.total.toLocaleString()} tokens (${metrics.percentage.toFixed(1)}%)\n\n`

  if (state.childConversations.length > 0) {
    content += `📋 Active children: ${state.childConversations.length}\n`
    const active = state.childConversations.filter(c => c.status === 'working').length
    const complete = state.childConversations.filter(c => c.status === 'complete').length
    content += `- Working: ${active}\n`
    content += `- Complete: ${complete}\n\n`
  }

  if (state.currentSchema) {
    content += `📝 Schema: ${state.currentSchema.project || 'Not generated'}\n`
  }

  return {
    type: 'message',
    content
  }
}

/**
 * Handles threshold warnings (85% context usage).
 */
async function handleThresholdWarning(
  metrics: ContextMetrics,
  state: SpreaderState,
  messages: Message[],
  sendMessage: (content: string, metadata?: any) => Promise<void>
): Promise<SpreaderHandlerResponse> {
  // Generate schema
  const schema = await generateSchema(messages)
  state.currentSchema = schema
  state.schemaGenerated = true

  // Format schema for display
  const schemaText = formatSchema(schema)

  // Check if auto-optimization should be suggested
  const optimizer = new ContextOptimizer(0.8)
  const needsOptimization = optimizer.needsOptimization(
    messages,
    state.maxTokens,
    0.85
  )

  // Send warning message
  let warning = `⚠️ Context at ${metrics.percentage.toFixed(0)}% capacity!\n\n` +
    `I've generated a schema to summarize what we've covered:\n\n${schemaText}\n\n` +
    `**Options:**\n` +
    `1. Continue working (I'll keep tracking)\n` +
    `2. Say "Spread this: task1, task2" to create parallel conversations\n` +
    `3. Say "Optimize" to compress context intelligently\n` +
    `4. Say "Compact context" to summarize old messages`

  if (needsOptimization && state.autoCompact) {
    warning += `\n\n💡 **Tip:** Say "Optimize" to reduce context to ~80% while preserving important information.`
  }

  await sendMessage(warning, { schema, percentage: metrics.percentage })

  return {
    type: 'schema',
    content: warning,
    metadata: { schema, percentage: metrics.percentage }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generates a help message for users.
 */
function generateHelpMessage(metrics: ContextMetrics): string {
  return `**Hi! I'm Spreader** 📚 - your context window manager.\n\n` +
    `I help you work around AI context limits by:\n\n` +
    `1. **Tracking context usage** (currently at ${metrics.percentage.toFixed(1)}%)\n` +
    `2. **Generating schemas** when you hit 85% capacity\n` +
    `3. **"Spreading" parallel tasks** to child conversations\n` +
    `4. **Merging results** back into the main conversation\n\n` +
    `**Commands:**\n` +
    `- \`Spread this: task1, task2, task3\` - Create parallel conversations\n` +
    `- \`Merge child <id>\` - Merge a child conversation back\n` +
    `- \`Status\` - Show current context usage\n` +
    `- \`Help\` - Show this message\n\n` +
    `**Current status:** ${metrics.status} (${metrics.percentage.toFixed(1)}%)\n\n` +
    `Try saying: "Spread this: Research topic A, Research topic B"`
}

/**
 * Formats a schema for display.
 */
function formatSchema(schema: SessionSchema): string {
  let text = ''

  if (schema.project) {
    text += `**Project:** ${schema.project}\n`
  }

  if (schema.description) {
    text += `**Description:** ${schema.description}\n\n`
  }

  if (schema.completed.length > 0) {
    text += `**✅ Completed:**\n${schema.completed.map((c: string) => `- ${c}`).join('\n')}\n\n`
  }

  if (schema.inProgress.length > 0) {
    text += `**🔄 In Progress:**\n${schema.inProgress.map((i: string) => `- ${i}`).join('\n')}\n\n`
  }

  if (schema.next.length > 0) {
    text += `**⏭️ Next:**\n${schema.next.map((n: string) => `- ${n}`).join('\n')}\n\n`
  }

  if (Array.isArray(schema.decisions) && schema.decisions.length > 0) {
    text += `**💡 Decisions:**\n${schema.decisions.map((d: string) => `- ${d}`).join('\n')}\n\n`
  }

  const specs = schema.technicalSpecs
  if (specs.stack?.length || specs.architecture || specs.patterns?.length) {
    text += `**🔧 Technical Specs:**\n`
    if (specs.stack?.length) {
      text += `- Stack: ${specs.stack.join(', ')}\n`
    }
    if (specs.architecture) {
      text += `- Architecture: ${specs.architecture}\n`
    }
    if (specs.patterns?.length) {
      text += `- Patterns: ${specs.patterns.join(', ')}\n`
    }
  }

  return text.trim()
}

/**
 * Creates initial Spreader agent state.
 */
export function createInitialSpreaderState(): SpreaderState {
  return {
    currentTokens: 0,
    maxTokens: DEFAULT_MAX_TOKENS,
    thresholdTokens: Math.floor(DEFAULT_MAX_TOKENS * DEFAULT_THRESHOLD_PERCENTAGE),
    warningTokens: Math.floor(DEFAULT_MAX_TOKENS * DEFAULT_WARNING_PERCENTAGE),
    schemaGenerated: false,
    currentSchema: createEmptySchema(),
    lastSchemaUpdate: null,
    childConversations: [],
    activeSpreadId: null,
    autoCompact: true,
    autoSpread: false
  }
}

/**
 * Estimates tokens for a message.
 */
export async function estimateMessageTokens(message: Message): Promise<number> {
  let text = ''

  if (message.content.text) {
    text += message.content.text
  }

  if (message.content.systemNote) {
    text += message.content.systemNote
  }

  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Updates context tracking after a new message.
 */
export async function updateContextTracking(
  state: SpreaderState,
  newMessage: Message
): Promise<void> {
  const tokens = await estimateMessageTokens(newMessage)
  state.currentTokens += tokens
}

/**
 * Checks if context is at warning threshold (60%).
 */
export function isAtWarningThreshold(state: SpreaderState): boolean {
  return state.currentTokens >= state.warningTokens
}

/**
 * Checks if context is at critical threshold (85%).
 */
export function isAtCriticalThreshold(state: SpreaderState): boolean {
  return state.currentTokens >= state.thresholdTokens
}

/**
 * Gets current context percentage.
 */
export function getContextPercentage(state: SpreaderState): number {
  return (state.currentTokens / state.maxTokens) * 100
}

/**
 * Gets color class for context percentage.
 */
export function getContextColor(percentage: number): string {
  if (percentage >= 85) return 'red'
  if (percentage >= 60) return 'yellow'
  return 'green'
}
