/**
 * Child Conversation Management Utilities
 *
 * Creates, tracks, and merges parallel child conversations.
 */

import { Message } from '@/types/conversation'
import {
  ChildConversation,
  ChildStatus,
  SpreadRequest,
  SpreadResult,
  MergeRequest,
  MergeResult,
  createChildConversation
} from './types'
import { generateChildSummary } from './schema'
import { createConversation, addMessage, getMessages } from '@/lib/storage/conversation-store'
import { getSpreadAnalytics, type SpreadTask } from '../spread/analytics'

// ============================================================================
// SPREAD OPERATIONS
// ============================================================================

/**
 * Creates parallel child conversations for tasks.
 *
 * @param request - Spread request with tasks and context
 * @returns Promise resolving to spread result
 *
 * @example
 * ```typescript
 * const result = await spreadConversations({
 *   tasks: ['Research auth', 'Design DB', 'Write API'],
 *   parentConversationId: 'conv_123'
 * })
 * ```
 */
export async function spreadConversations(request: SpreadRequest): Promise<SpreadResult> {
  const { tasks, parentConversationId, context = [] } = request
  const spreadId = `spread_${Date.now()}`

  const children: ChildConversation[] = []
  const analytics = getSpreadAnalytics()

  // Track spread start
  const spreadTasks: SpreadTask[] = []
  const startTime = Date.now()

  for (const task of tasks) {
    try {
      // Create child conversation record
      const childConv = await createConversation(`📋 ${task}`, 'ai-assisted')

      // Create child metadata
      const child: ChildConversation = {
        ...createChildConversation(parentConversationId, task),
        id: childConv.id
      }

      // Add initial message with context
      const contextMessage = `You're working on: ${task}\n\n` +
        `This is a parallel task. Your goal is to complete this specific task independently.\n\n` +
        `Context from parent:\n${context.map(m => `- ${m.content.text}`).join('\n')}`

      await addMessage(
        childConv.id,
        'text',
        { type: 'system', reason: 'spread-context' },
        { text: contextMessage }
      )

      children.push(child)

      // Track task for analytics
      spreadTasks.push({
        id: child.id,
        task,
        model: 'gpt-4', // Default model, can be overridden
        startTime,
        status: 'pending',
        tokenCount: 0,
        cost: 0
      })

    } catch (error) {
      console.error(`Failed to create child for task: ${task}`, error)
    }
  }

  // Initial analytics tracking
  await analytics.trackSpread(spreadId, {
    parentConversationId,
    taskCount: tasks.length,
    tasks: spreadTasks,
    results: {
      totalDuration: 0,
      serialDuration: 0,
      timeSaved: 0,
      timeSavedPercentage: 0,
      totalCost: 0,
      serialCost: 0,
      costSaved: 0,
      successCount: 0,
      failCount: 0
    },
    quality: {
      resultQuality: 0,
      conflictRate: 0,
      autoMergeRate: 0
    }
  })

  return {
    spreadId,
    children,
    message: `Created ${children.length} parallel conversations for your tasks.`
  }
}

/**
 * Updates child conversation status.
 *
 * @param childId - Child conversation ID
 * @param status - New status
 * @returns Promise resolving to updated child
 */
export async function updateChildStatus(
  childId: string,
  status: ChildStatus,
  spreadId?: string,
  taskData?: {
    duration?: number
    tokenCount?: number
    cost?: number
  }
): Promise<ChildConversation | null> {
  // Update analytics if spreadId provided
  if (spreadId && taskData) {
    const analytics = getSpreadAnalytics()
    const event = await analytics.getSpread(spreadId)

    if (event) {
      // Update task in the event
      const taskIndex = event.tasks.findIndex(t => t.id === childId)
      if (taskIndex >= 0) {
        // Map ChildStatus to SpreadTask status
        const statusMap: Record<ChildStatus, 'pending' | 'running' | 'complete' | 'failed'> = {
          'pending': 'pending',
          'working': 'running',
          'complete': 'complete',
          'error': 'failed',
          'merged': 'complete'
        }
        event.tasks[taskIndex].status = statusMap[status]
        if (taskData.duration !== undefined) {
          event.tasks[taskIndex].duration = taskData.duration
          event.tasks[taskIndex].endTime = event.tasks[taskIndex].startTime + taskData.duration
        }
        if (taskData.tokenCount !== undefined) {
          event.tasks[taskIndex].tokenCount = taskData.tokenCount
        }
        if (taskData.cost !== undefined) {
          event.tasks[taskIndex].cost = taskData.cost
        }

        // Recalculate results
        const completedTasks = event.tasks.filter(t => t.status === 'complete')
        const failedTasks = event.tasks.filter(t => t.status === 'failed')

        // Calculate total duration (parallel = max end time - min start time)
        const startTimes = event.tasks.map(t => t.startTime)
        const endTimes = event.tasks.filter(t => t.endTime).map(t => t.endTime!)
        const totalDuration = endTimes.length > 0
          ? Math.max(...endTimes) - Math.min(...startTimes)
          : 0

        // Calculate serial duration (sum of all durations + overhead)
        const serialDuration = completedTasks.reduce((sum, t) => {
          return sum + (t.duration || 0) + 10000 // 10s overhead per task
        }, 0)

        // Calculate costs
        const totalCost = completedTasks.reduce((sum, t) => sum + t.cost, 0)
        const serialCost = completedTasks.reduce((sum, t) => {
          const cheapestCost = (t.tokenCount / 1e6) * 0.5 // GPT-3.5 price
          return sum + cheapestCost
        }, 0)

        await analytics.updateSpread(spreadId, {
          tasks: event.tasks,
          results: {
            totalDuration,
            serialDuration,
            timeSaved: Math.max(0, serialDuration - totalDuration),
            timeSavedPercentage: serialDuration > 0
              ? ((serialDuration - totalDuration) / serialDuration) * 100
              : 0,
            totalCost,
            serialCost,
            costSaved: Math.max(0, serialCost - totalCost),
            successCount: completedTasks.length,
            failCount: failedTasks.length
          }
        })
      }
    }
  }

  console.log(`Updating child ${childId} status to ${status}`)
  return null
}

/**
 * Gets current status of all child conversations.
 *
 * @param parentId - Parent conversation ID
 * @returns Promise resolving to array of children
 */
export async function getChildConversations(
  parentId: string
): Promise<ChildConversation[]> {
  // In a real implementation, this would query a store
  // For now, return empty array
  return []
}

// ============================================================================
// MERGE OPERATIONS
// ============================================================================

/**
 * Merges a child conversation back into the parent.
 *
 * @param request - Merge request with child and parent IDs
 * @returns Promise resolving to merge result
 *
 * @example
 * ```typescript
 * const result = await mergeChildConversation({
 *   childId: 'child_123',
 *   parentConversationId: 'conv_123'
 * })
 * ```
 */
export async function mergeChildConversation(request: MergeRequest): Promise<MergeResult> {
  const { childId, parentConversationId, includeFullHistory = false } = request

  try {
    // Get child messages
    const childMessages = await getMessages(childId)

    if (childMessages.length === 0) {
      return {
        success: false,
        summary: 'No messages to merge',
        schemaUpdates: {},
        mergedAt: new Date().toISOString()
      }
    }

    // Generate summary
    const summary = await generateChildSummary(childMessages)

    // Add merge message to parent
    await addMessage(
      parentConversationId,
      'text',
      { type: 'system', reason: 'child-merge' },
      {
        text: `🔀 Merged from child conversation:\n\n${summary}`,
        systemNote: `Child ${childId} merged`
      }
    )

    // Extract key points for schema update
    const keyPoints = childMessages
      .filter(m => m.author === 'user' && m.content.text)
      .map(m => m.content.text!)
      .slice(0, 5)

    return {
      success: true,
      summary,
      schemaUpdates: {
        completed: [`[Merged] ${summary.slice(0, 50)}...`],
        next: keyPoints
      },
      mergedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error('Merge failed:', error)
    return {
      success: false,
      summary: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      schemaUpdates: {},
      mergedAt: new Date().toISOString()
    }
  }
}

/**
 * Opens a child conversation in a new tab.
 *
 * @param childId - Child conversation ID
 * @returns URL to open
 */
export function openChildConversation(childId: string): string {
  return `/conversation/${childId}`
}

// ============================================================================
// TASK PARSING
// ============================================================================

/**
 * Parses spread command to extract tasks.
 *
 * @param text - User message text
 * @returns Array of tasks
 *
 * @example
 * ```typescript
 * parseSpreadCommand("Spread this: Research auth, Design DB, Write API")
 * // Returns: ["Research auth", "Design DB", "Write API"]
 * ```
 */
export function parseSpreadCommand(text: string): string[] {
  const lowerText = text.toLowerCase()

  // Match "spread this:" or "spread:" patterns
  const spreadMatch = lowerText.match(/spread\s+(this)?:?\s*(.+)/i)
  if (!spreadMatch) {
    return []
  }

  const tasksText = spreadMatch[2]

  // Split by comma
  const tasks = tasksText
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  return tasks
}

/**
 * Parses merge command to extract child ID.
 *
 * @param text - User message text
 * @returns Child ID or null
 *
 * @example
 * ```typescript
 * parseMergeCommand("merge child child_123")
 * // Returns: "child_123"
 * ```
 */
export function parseMergeCommand(text: string): string | null {
  const lowerText = text.toLowerCase()

  // Match "merge child <id>" pattern
  const mergeMatch = lowerText.match(/merge\s+child\s+(\S+)/i)
  if (mergeMatch) {
    return mergeMatch[1]
  }

  // Try to extract any ID that looks like a child conversation
  const idMatch = lowerText.match(/child_[a-z0-9_]+/i)
  if (idMatch) {
    return idMatch[0]
  }

  return null
}

/**
 * Detects if a message is a spread command.
 *
 * @param text - User message text
 * @returns True if this is a spread command
 */
export function isSpreadCommand(text: string): boolean {
  return /^spread\s+(this)?:/i.test(text.trim())
}

/**
 * Detects if a message is a merge command.
 *
 * @param text - User message text
 * @returns True if this is a merge command
 */
export function isMergeCommand(text: string): boolean {
  return /^merge\s+child/i.test(text.trim())
}
