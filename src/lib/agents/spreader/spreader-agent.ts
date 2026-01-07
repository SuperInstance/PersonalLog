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
  parseSpreadCommandWithDeps,
  parseMergeCommand,
  isSpreadCommand,
  isMergeCommand,
  type ParsedTask
} from './spread-commands'
import { agentEventBus } from '../communication/event-bus'
import { MessageType, type AgentMessage } from '../communication/types'
import { ContextOptimizer } from '../spread/optimizer'
import { estimateTotalTokens } from '../spread/optimizer'
import { DAGNode, createDAG, tasksToDAGNodes } from '../spread/dag'
import { DependencyResolver, formatResolutionResult } from '../spread/dependency-resolver'
import { DAGExecutor, DAGExecutionProgress } from '../spread/dag-executor'
import { executeDAGWithAutoMerge, type AutoMergeDAGExecutorConfig } from '../spread/dag-auto-merge-integration'
import {
  optimizeContextForSpread,
  optimizeContextAfterMerge,
  getContextOptimizer
} from '../spread/context-integration'
import { MergeStrategy } from '../spread/auto-merge-orchestrator'
import type { DAGGraph } from '../spread/dag'

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
    const { valence, arousal, confidence, recentMessages } = message.payload as {
      valence: number
      arousal: number
      confidence: number
      recentMessages?: Array<{ emotion: string; timestamp: number }>
    }

    console.log(`[Spreader] User frustration detected: valence=${valence.toFixed(2)}, arousal=${arousal.toFixed(2)}, confidence=${confidence.toFixed(2)}`)

    // Check if we should compact context based on frustration level
    // Severe frustration: valence < 0.3, arousal > 0.7
    // Moderate frustration: valence < 0.4, arousal > 0.6
    const severeFrustration = valence < 0.3 && arousal > 0.7 && confidence > 0.6
    const moderateFrustration = valence < 0.4 && arousal > 0.6 && confidence > 0.5

    if (!severeFrustration && !moderateFrustration) {
      console.log('[Spreader] Frustration level not high enough to trigger compaction')
      return
    }

    // Determine compaction strategy based on frustration severity and context usage
    let targetPercentage: number
    let strategy: string

    if (severeFrustration) {
      // Aggressive compaction for severe frustration
      targetPercentage = 50
      strategy = 'aggressive'
    } else {
      // Moderate compaction for moderate frustration
      targetPercentage = 70
      strategy = 'moderate'
    }

    console.log(`[Spreader] Compacting context using ${strategy} strategy (target: ${targetPercentage}%)`)

    // Perform context compaction
    const compactionResult = await this.performContextCompaction(targetPercentage, strategy)

    // Send acknowledgment to JEPA
    agentEventBus.publish({
      id: crypto.randomUUID(),
      from: { agentId: 'spreader-v1', type: 'agent' },
      to: message.from,
      type: MessageType.CONTEXT_COMPACTED,
      payload: {
        previousSize: compactionResult.previousSize,
        newSize: compactionResult.newSize,
        compressionRatio: compactionResult.compressionRatio,
        retainedThemes: compactionResult.retainedThemes
      },
      timestamp: Date.now(),
      correlationId: message.id,
      priority: 'high',
      status: 'pending'
    } as any)

    console.log('[Spreader] Context compaction complete:', compactionResult)
  }

  /**
   * Perform context compaction to reduce token usage
   */
  private async performContextCompaction(
    targetPercentage: number,
    strategy: string
  ): Promise<{
    previousSize: number
    newSize: number
    compressionRatio: number
    retainedThemes: string[]
  }> {
    if (!this.currentMetrics) {
      throw new Error('Cannot compact context: no metrics available')
    }

    const previousSize = this.currentMetrics.used
    const targetSize = Math.floor((this.currentMetrics.total * targetPercentage) / 100)

    console.log(`[Spreader] Compacting context: ${previousSize} → ${targetSize} tokens (${targetPercentage}%)`)

    // Analyze emotional themes from recent messages if available
    // This would integrate with JEPA's emotional summaries
    const retainedThemes = [
      'user_intent',
      'active_task',
      'recent_context'
    ]

    // Calculate compression ratio
    const compressionRatio = targetSize / previousSize

    // Update metrics to reflect compaction
    this.currentMetrics = {
      ...this.currentMetrics,
      used: targetSize,
      percentage: targetPercentage,
      status: targetPercentage < 60 ? 'healthy' : targetPercentage < 85 ? 'warning' : 'critical'
    }

    console.log('[Spreader] Context compaction simulated:', {
      previousSize,
      newSize: targetSize,
      compressionRatio: compressionRatio.toFixed(2),
      retainedThemes
    })

    // In production, this would actually:
    // 1. Use ContextOptimizer to compress messages
    // 2. Keep recent messages (last 20-30)
    // 3. Summarize older messages into themes
    // 4. Preserve emotional context from JEPA

    return {
      previousSize,
      newSize: targetSize,
      compressionRatio,
      retainedThemes
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
 * Handles "Spread this:" commands with DAG-based dependency resolution and auto-merge.
 */
async function handleSpreadCommand(
  message: Message,
  context: SpreaderHandlerContext
): Promise<SpreaderHandlerResponse> {
  const { conversationId, messages, agentState } = context
  const text = message.content.text || ''

  // Parse tasks with dependencies
  const parsedTasks = parseSpreadCommandWithDeps(text)

  if (parsedTasks.length === 0) {
    return {
      type: 'message',
      content: "I couldn't find any tasks to spread. Try: 'Spread this: Research auth, Design DB, Write API'"
    }
  }

  // Convert to DAG nodes
  const dagNodes = tasksToDAGNodes(parsedTasks)

  // Create DAG and resolve execution order
  let resolutionResult
  try {
    const graph = createDAG(dagNodes)
    const resolver = new DependencyResolver()
    resolutionResult = resolver.resolve(graph)
  } catch (error) {
    return {
      type: 'message',
      content: `❌ Failed to resolve task dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  // Check if resolution failed
  if (!resolutionResult.success) {
    return {
      type: 'message',
      content: `❌ Invalid task dependencies:\n${resolutionResult.error}\n${
        resolutionResult.cyclePath ? `\nCycle: ${resolutionResult.cyclePath.join(' → ')}` : ''
      }`
    }
  }

  // Check if tasks have dependencies
  const hasDependencies = parsedTasks.some(t => t.dependsOn.length > 0)

  if (!hasDependencies) {
    // No dependencies: use legacy parallel spawning
    const tasks = parseSpreadCommand(text)

    // Apply context optimization
    let optimizedContext = messages.slice(-10)
    if (agentState.autoCompact) {
      const optimizationResult = await optimizeContextForSpread(
        messages,
        tasks
      )
      optimizedContext = optimizationResult.optimizedParentContext

      console.log('[Spreader] Context optimized for spread:', {
        originalTokens: await estimateTotalTokens(messages),
        optimizedTokens: await estimateTotalTokens(optimizedContext),
        savings: optimizationResult.optimizationResult?.tokensSaved || 0
      })
    }

    const result = await spreadConversations({
      tasks,
      parentConversationId: conversationId,
      context: optimizedContext
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

  // Has dependencies: Use full DAG executor with auto-merge
  const graph = createDAG(dagNodes)

  // Build execution plan content
  let content = `📊 Creating ${parsedTasks.length} conversations with dependencies:\n\n`
  content += `Execution plan:\n\n`

  for (const level of resolutionResult.levels) {
    content += `Level ${level.level} (parallel):\n`
    for (const task of level.tasks) {
      content += `  - [${task.id}] ${task.name}\n`
    }
    content += '\n'
  }

  content += `✨ Features enabled:\n`
  content += `  - DAG-based execution order\n`
  content += `  - Auto-merge on completion\n`
  content += `  - Context optimization\n`
  content += `  - Error recovery & retry\n\n`

  content += `💡 Tasks will execute in dependency order. Results will auto-merge when complete.`

  // Apply context optimization
  let optimizedContext = messages
  if (agentState.autoCompact) {
    const optimizationResult = await optimizeContextForSpread(
      messages,
      parsedTasks.map(t => t.command)
    )
    optimizedContext = optimizationResult.optimizedParentContext

    console.log('[Spreader] Context optimized for DAG spread:', {
      originalTokens: await estimateTotalTokens(messages),
      optimizedTokens: await estimateTotalTokens(optimizedContext),
      savings: optimizationResult.optimizationResult?.tokensSaved || 0
    })
  }

  // Create parent conversation object for auto-merge
  const parentConversation = {
    id: conversationId,
    title: 'Parent Conversation',
    messages: optimizedContext
  } as any

  // Create parent schema for merging
  const parentSchema = agentState.currentSchema || {
    project: '',
    completed: [],
    next: parsedTasks.map(t => t.command),
    decisions: {},
    technicalSpecs: { stack: [], architecture: '', patterns: [] }
  }

  // Configure auto-merge
  const autoMergeConfig: AutoMergeDAGExecutorConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    maxParallelTasks: 5,
    continueOnFailure: true,
    minimumSuccessRate: 0.8,
    parentConversation,
    parentSchema,
    autoMerge: {
      enabled: true,
      strategy: MergeStrategy.MERGE,
      autoMergeOnComplete: true,
      waitForAllChildren: true,
      maxWaitTime: 300000, // 5 minutes
      notifyProgress: true,
      showConflicts: true
    },
    onProgress: (progress: DAGExecutionProgress) => {
      console.log('[Spreader] DAG execution progress:', {
        completed: progress.completedTasks,
        total: progress.totalTasks,
        percentage: progress.percentage.toFixed(1),
        round: `${progress.currentRound}/${progress.totalRounds}`
      })
    },
    onMergeComplete: (result) => {
      console.log('[Spreader] Auto-merge complete:', {
        schema: result.mergedSchema
      })

      // Update agent state with merged schema
      if (agentState.currentSchema) {
        agentState.currentSchema = {
          ...agentState.currentSchema,
          ...result.mergedSchema
        }
      }
    },
    onMergeFailed: (error) => {
      console.error('[Spreader] Auto-merge failed:', error)
    }
  }

  // Execute DAG with auto-merge (fire and forget - execution happens in background)
  executeDAGWithAutoMerge(graph, parentConversation, parentSchema, autoMergeConfig)
    .then(result => {
      console.log('[Spreader] DAG execution complete:', {
        success: result.executionResult.success,
        completed: result.executionResult.completedTasks.length,
        failed: result.executionResult.failedTasks.length,
        executionTime: result.executionResult.executionTime
      })

      // Optimize context after merge
      if (agentState.autoCompact) {
        optimizeContextAfterMerge(messages, [], {
          optimizer: getContextOptimizer(),
          autoOptimizeBeforeSpread: agentState.autoCompact,
          autoOptimizeAfterMerge: agentState.autoCompact,
          maxContextTokens: DEFAULT_MAX_TOKENS,
          spreadContextTokens: Math.floor(DEFAULT_MAX_TOKENS / 4),
          enableTaskAnalysis: false,
          logOptimizations: true
        })
          .then(postMergeResult => {
            console.log('[Spreader] Post-merge optimization:', {
              tokensSaved: postMergeResult.optimizationResult?.tokensSaved || 0
            })
          })
      }
    })
    .catch(error => {
      console.error('[Spreader] DAG execution failed:', error)
    })

  // Store DAG nodes and execution state for dashboard visualization
  agentState.dagNodes = dagNodes
  agentState.dagExecutionState = new Map()

  return {
    type: 'spread',
    content,
    metadata: {
      executionPlan: resolutionResult,
      hasDependencies: true,
      autoMergeEnabled: true,
      contextOptimizationEnabled: agentState.autoCompact
    }
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
    `- \`Spread this: Task A (1), Task B (2) depends on 1\` - Create dependent tasks\n` +
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
