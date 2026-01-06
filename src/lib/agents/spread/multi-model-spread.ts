/**
 * Multi-Model Spreading Integration
 *
 * Integrates intelligent model selection with the Spreader agent's
 * parallel conversation spreading system.
 */

import { Message } from '@/types/conversation'
import type {
  SpreadRequest,
  SpreadResult,
  ChildConversation
} from '../spreader/types'
import {
  createChildConversation
} from '../spreader/types'
import { analyzeTasks, optimizeTaskModelAssignment } from './model-matcher'
import {
  getModelSelector,
  getModelCostEstimator,
  ModelCostEstimator
} from './multi-model'
import type {
  TaskRequirements,
  SpreadTaskWithModel,
  MultiModelSpreadResult,
  UserPreferences
} from './types'
import { createConversation, addMessage } from '@/lib/storage/conversation-store'

// ============================================================================
// MULTI-MODEL SPREADER
// ============================================================================

/**
 * SpreaderAgentHandler with multi-model intelligence.
 *
 * Extends the basic spreading functionality to intelligently assign
 * different AI models to different tasks based on requirements.
 */
export class MultiModelSpreader {
  private costEstimator: ModelCostEstimator

  constructor() {
    this.costEstimator = getModelCostEstimator()
  }

  /**
   * Handle spread command with intelligent model assignment.
   *
   * @param tasks - Task descriptions
   * @param context - Conversation context
   * @param preferences - User preferences for optimization
   * @returns Spread result with model assignments
   */
  async spreadWithMultiModel(
    tasks: string[],
    context: {
      parentConversationId: string
      messages: Message[]
    },
    preferences?: UserPreferences
  ): Promise<MultiModelSpreadResult> {
    // Analyze all tasks
    const taskRequirements = analyzeTasks(tasks, preferences)

    // Optimize model assignment
    const assignment = optimizeTaskModelAssignment(taskRequirements, preferences)

    // Build spread tasks with models
    const spreadTasks: SpreadTaskWithModel[] = []

    for (let i = 0; i < tasks.length; i++) {
      const modelId = assignment.get(i)
      if (!modelId) continue

      const task = tasks[i]
      const requirements = taskRequirements[i]

      // Get model details
      const selector = getModelSelector()
      const model = selector.selectModelForTask(requirements, preferences)

      // Estimate cost
      const costEstimate = this.costEstimator.estimateCost(requirements, model)

      spreadTasks.push({
        id: `task_${Date.now()}_${i}`,
        task,
        requirements,
        modelId,
        model,
        costEstimate,
        createdAt: new Date().toISOString()
      })
    }

    // Calculate totals
    const totalCost = spreadTasks.reduce((sum, t) => sum + t.costEstimate.totalCost, 0)
    const maxTime = Math.max(...spreadTasks.map(t => t.costEstimate.estimatedTime))

    // Calculate cost savings (compared to using best model for all)
    const bestModel = spreadTasks.sort((a, b) =>
      b.model.performance.quality === 'high' ? 1 : -1
    )[0]

    const baselineCost = tasks.reduce((sum, task) => {
      const requirements = taskRequirements[tasks.indexOf(task)]
      return sum + this.costEstimator.estimateCost(requirements, bestModel.model).totalCost
    }, 0)

    const costSavings = {
      amount: baselineCost - totalCost,
      percentage: ((baselineCost - totalCost) / baselineCost) * 100,
      baseline: bestModel.modelId
    }

    return {
      spreadId: `spread_${Date.now()}`,
      tasks: spreadTasks,
      totalCost,
      totalEstimatedTime: maxTime, // Parallel execution
      costSavings
    }
  }

  /**
   * Create child conversations with assigned models.
   *
   * @param result - Multi-model spread result
   * @param parentConversationId - Parent conversation ID
   * @returns Promise resolving to created children
   */
  async createChildConversations(
    result: MultiModelSpreadResult,
    parentConversationId: string
  ): Promise<ChildConversation[]> {
    const children: ChildConversation[] = []

    for (const spreadTask of result.tasks) {
      try {
        // Create child conversation
        const childConv = await createConversation(
          `📋 ${spreadTask.task}`,
          'ai-assisted'
        )

        // Create child metadata
        const child: ChildConversation = {
          ...createChildConversation(parentConversationId, spreadTask.task),
          id: childConv.id
        }

        // Add initial message with context and model assignment
        const contextMessage = this.buildContextMessage(spreadTask)

        await addMessage(
          childConv.id,
          'text',
          { type: 'system', reason: 'multi-model-spread' },
          {
            text: contextMessage,
            systemNote: `Using model: ${spreadTask.model.name} (${spreadTask.modelId})`
          }
        )

        children.push(child)

      } catch (error) {
        console.error(`Failed to create child for task: ${spreadTask.task}`, error)
      }
    }

    return children
  }

  /**
   * Build context message for child conversation.
   */
  private buildContextMessage(spreadTask: SpreadTaskWithModel): string {
    const { task, requirements, model, costEstimate } = spreadTask

    let message = `**Task:** ${task}\n\n`
    message += `**Assigned Model:** ${model.name} (${model.provider})\n`
    message += `**Quality:** ${model.performance.quality} | **Speed:** ${model.performance.speed}\n\n`

    if (requirements.type) {
      message += `**Task Type:** ${requirements.type}\n`
    }
    if (requirements.complexity) {
      message += `**Complexity:** ${requirements.complexity}\n`
    }

    message += `\nThis model was selected because it best fits this task's requirements.\n`
    message += `Estimated cost: $${costEstimate.totalCost.toFixed(4)}\n`
    message += `Estimated time: ${costEstimate.estimatedTime.toFixed(1)}s\n\n`

    message += `Work on this task independently. When done, your results will be merged back into the parent conversation.`

    return message
  }

  /**
   * Generate summary of multi-model spread.
   */
  generateSpreadSummary(result: MultiModelSpreadResult): string {
    const taskCount = result.tasks.length
    const models = [...new Set(result.tasks.map(t => t.model.name))]

    let summary = `📊 **Multi-Model Spread**\n\n`
    summary += `Created ${taskCount} parallel conversations using ${models.length} different AI models:\n\n`

    // Task list
    result.tasks.forEach((task, i) => {
      summary += `${i + 1}. **${task.model.name}** - ${task.task}\n`
      summary += `   Cost: $${task.costEstimate.totalCost.toFixed(4)} | Time: ${task.costEstimate.estimatedTime.toFixed(1)}s\n`
    })

    summary += `\n**Total Cost:** $${result.totalCost.toFixed(4)}\n`
    summary += `**Total Time:** ${result.totalEstimatedTime.toFixed(1)}s (parallel)\n`

    if (result.costSavings.percentage > 0) {
      summary += `\n💰 **Cost Savings:** $${result.costSavings.amount.toFixed(4)} (${result.costSavings.percentage.toFixed(1)}%) vs using ${result.costSavings.baseline} for all tasks\n`
    }

    summary += `\nEach conversation will work independently with its optimal model.`

    return summary
  }
}

// ============================================================================
// LEGACY SPREAD FUNCTION (ENHANCED)
// ============================================================================

/**
 * Enhanced spreadConversations with multi-model support.
 *
 * @param request - Spread request
 * @param preferences - Optional user preferences
 * @returns Promise resolving to spread result
 */
export async function spreadConversationsWithMultiModel(
  request: SpreadRequest,
  preferences?: UserPreferences
): Promise<SpreadResult> {
  const { tasks, parentConversationId, context = [] } = request

  // Use multi-model spreader
  const spreader = new MultiModelSpreader()

  const result = await spreader.spreadWithMultiModel(
    tasks,
    { parentConversationId, messages: context },
    preferences
  )

  // Create child conversations
  const children = await spreader.createChildConversations(result, parentConversationId)

  // Generate summary message
  const summary = spreader.generateSpreadSummary(result)

  return {
    spreadId: result.spreadId,
    children,
    message: summary
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse tasks from spread command with model hints.
 *
 * Supports syntax like:
 * - "Spread this: Research auth [code], Design DB [analysis]"
 * - "Spread this: Task 1, Task 2, Task 3"
 *
 * @param text - User message text
 * @returns Array of task descriptions
 */
export function parseSpreadCommandWithHints(text: string): Array<{
  task: string
  hint?: string
}> {
  const lowerText = text.toLowerCase()

  // Match "spread this:" or "spread:" patterns
  const spreadMatch = lowerText.match(/spread\s+(this)?:?\s*(.+)/i)
  if (!spreadMatch) {
    return []
  }

  const tasksText = spreadMatch[2]

  // Split by comma, but preserve brackets
  const tasks: Array<{ task: string; hint?: string }> = []
  let currentTask = ''
  let inBrackets = false

  for (let i = 0; i < tasksText.length; i++) {
    const char = tasksText[i]

    if (char === '[') {
      inBrackets = true
    } else if (char === ']') {
      inBrackets = false
    } else if (char === ',' && !inBrackets) {
      // End of task
      const trimmed = currentTask.trim()
      if (trimmed) {
        tasks.push(parseTaskWithHint(trimmed))
      }
      currentTask = ''
    } else {
      currentTask += char
    }
  }

  // Don't forget the last task
  const trimmed = currentTask.trim()
  if (trimmed) {
    tasks.push(parseTaskWithHint(trimmed))
  }

  return tasks
}

/**
 * Parse a single task with optional hint.
 *
 * @param taskText - Task text possibly containing [hint]
 * @returns Task object with hint
 */
function parseTaskWithHint(taskText: string): { task: string; hint?: string } {
  const hintMatch = taskText.match(/\[([^\]]+)\]$/)

  if (hintMatch) {
    return {
      task: taskText.replace(hintMatch[0], '').trim(),
      hint: hintMatch[1].trim().toLowerCase()
    }
  }

  return { task: taskText }
}

// ============================================================================
// SINGLETON
// ============================================================================

let multiModelSpreaderInstance: MultiModelSpreader | null = null

/**
 * Get or create the singleton MultiModelSpreader.
 */
export function getMultiModelSpreader(): MultiModelSpreader {
  if (!multiModelSpreaderInstance) {
    multiModelSpreaderInstance = new MultiModelSpreader()
  }
  return multiModelSpreaderInstance
}
