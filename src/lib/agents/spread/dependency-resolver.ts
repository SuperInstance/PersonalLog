/**
 * Dependency Resolver
 *
 * Resolves task execution order using topological sorting (Kahn's algorithm).
 * Handles dependencies, detects circular dependencies, and returns execution
 * groups for parallel processing.
 */

import { DAGGraph, DAGNode } from './dag'

// ============================================================================
// RESOLVER TYPES
// ============================================================================

/**
 * Execution level containing tasks that can run in parallel.
 */
export interface ExecutionLevel {
  /** Level number (0 = first to run) */
  level: number
  /** Tasks that can run in parallel at this level */
  tasks: DAGNode[]
  /** Total tasks in this level */
  count: number
}

/**
 * Resolution result containing execution plan.
 */
export interface ResolutionResult {
  /** Success status */
  success: boolean
  /** Execution levels (ordered) */
  levels: ExecutionLevel[]
  /** Total number of tasks */
  totalTasks: number
  /** Maximum parallel tasks at any level */
  maxParallelTasks: number
  /** Estimated critical path length */
  criticalPathLength: number
  /** Error message if resolution failed */
  error?: string
  /** Cycle path if circular dependency detected */
  cyclePath?: string[]
}

/**
 * Execution plan for task tracking.
 */
export interface ExecutionPlan {
  /** Execution levels */
  levels: ExecutionLevel[]
  /** Task lookup by ID */
  taskMap: Map<string, DAGNode>
  /** Level lookup by task ID */
  taskLevelMap: Map<string, number>
  /** Tasks ready to run at each level */
  readyTasks: Map<number, Set<string>>
  /** Completed tasks */
  completedTasks: Set<string>
  /** Failed tasks */
  failedTasks: Set<string>
}

// ============================================================================
// DEPENDENCY RESOLVER
// ============================================================================

/**
 * Resolves task dependencies and creates execution plan.
 */
export class DependencyResolver {
  /**
   * Resolves execution order for a DAG graph.
   *
   * @param graph - DAG graph to resolve
   * @returns Resolution result with execution levels
   */
  resolve(graph: DAGGraph): ResolutionResult {
    // Validate graph
    const validation = graph.validate()
    if (!validation.valid) {
      return {
        success: false,
        levels: [],
        totalTasks: 0,
        maxParallelTasks: 0,
        criticalPathLength: 0,
        error: validation.errors.join(', '),
        cyclePath: validation.cyclePath
      }
    }

    const levels: ExecutionLevel[] = []
    const nodes = graph.getAllNodes()
    const totalTasks = nodes.length

    if (totalTasks === 0) {
      return {
        success: true,
        levels: [],
        totalTasks: 0,
        maxParallelTasks: 0,
        criticalPathLength: 0
      }
    }

    // Kahn's algorithm for topological sort with level grouping
    const inDegree = new Map<string, number>()
    const adjacencyList = new Map<string, string[]>()

    // Initialize in-degree and adjacency list
    for (const node of nodes) {
      inDegree.set(node.id, node.dependsOn.length)
      adjacencyList.set(node.id, [])
    }

    // Build adjacency list (reverse dependencies)
    for (const node of nodes) {
      for (const depId of node.dependsOn) {
        adjacencyList.get(depId)!.push(node.id)
      }
    }

    // Find all nodes with in-degree 0 (no dependencies)
    const queue: string[] = []
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId)
      }
    }

    let currentLevel = 0
    let processedCount = 0
    let maxParallelTasks = 0

    // Process level by level
    while (queue.length > 0) {
      const levelSize = queue.length
      maxParallelTasks = Math.max(maxParallelTasks, levelSize)

      const levelTasks: DAGNode[] = []
      const nextQueue: string[] = []

      // Process all nodes at current level
      for (let i = 0; i < levelSize; i++) {
        const nodeId = queue.shift()!
        const node = graph.getNode(nodeId)!

        levelTasks.push(node)
        processedCount++

        // Reduce in-degree for all dependent nodes
        const dependents = adjacencyList.get(nodeId) || []
        for (const depId of dependents) {
          const newDegree = inDegree.get(depId)! - 1
          inDegree.set(depId, newDegree)

          // If in-degree becomes 0, add to next level
          if (newDegree === 0) {
            nextQueue.push(depId)
          }
        }
      }

      levels.push({
        level: currentLevel,
        tasks: levelTasks,
        count: levelTasks.length
      })

      // Move to next level
      queue.push(...nextQueue)
      currentLevel++
    }

    // Check if all nodes were processed (detect cycle)
    if (processedCount !== totalTasks) {
      const cyclePath = graph.getCyclePath()
      return {
        success: false,
        levels: [],
        totalTasks,
        maxParallelTasks: 0,
        criticalPathLength: 0,
        error: `Circular dependency detected. Could not resolve execution order.`,
        cyclePath
      }
    }

    // Calculate critical path length (longest chain of dependencies)
    const criticalPathLength = this.calculateCriticalPath(graph)

    return {
      success: true,
      levels,
      totalTasks,
      maxParallelTasks,
      criticalPathLength
    }
  }

  /**
   * Creates an executable plan from resolution result.
   *
   * @param result - Resolution result
   * @param graph - Original DAG graph
   * @returns Execution plan
   */
  createExecutionPlan(result: ResolutionResult, graph: DAGGraph): ExecutionPlan {
    const taskMap = new Map<string, DAGNode>()
    const taskLevelMap = new Map<string, number>()
    const readyTasks = new Map<number, Set<string>>()

    // Build task map and level map
    for (const level of result.levels) {
      const taskIds = new Set<string>()
      for (const task of level.tasks) {
        taskMap.set(task.id, task)
        taskLevelMap.set(task.id, level.level)
        taskIds.add(task.id)
      }
      readyTasks.set(level.level, taskIds)
    }

    return {
      levels: result.levels,
      taskMap,
      taskLevelMap,
      readyTasks,
      completedTasks: new Set(),
      failedTasks: new Set()
    }
  }

  /**
   * Gets tasks ready to execute at the current state.
   *
   * @param plan - Execution plan
   * @returns Array of ready task IDs
   */
  getReadyTasks(plan: ExecutionPlan): string[] {
    const ready: string[] = []

    for (const [level, taskIds] of plan.readyTasks) {
      for (const taskId of taskIds) {
        const task = plan.taskMap.get(taskId)!

        // Check if all dependencies are satisfied
        const depsSatisfied = task.dependsOn.every(
          depId => plan.completedTasks.has(depId)
        )

        if (depsSatisfied && !plan.completedTasks.has(taskId) && !plan.failedTasks.has(taskId)) {
          ready.push(taskId)
        }
      }
    }

    return ready
  }

  /**
   * Marks a task as completed.
   *
   * @param plan - Execution plan
   * @param taskId - Task ID to mark complete
   */
  markTaskComplete(plan: ExecutionPlan, taskId: string): void {
    plan.completedTasks.add(taskId)
  }

  /**
   * Marks a task as failed.
   *
   * @param plan - Execution plan
   * @param taskId - Task ID to mark failed
   */
  markTaskFailed(plan: ExecutionPlan, taskId: string): void {
    plan.failedTasks.add(taskId)
  }

  /**
   * Checks if execution plan is complete.
   *
   * @param plan - Execution plan
   * @returns True if all tasks are complete or failed
   */
  isComplete(plan: ExecutionPlan): boolean {
    return plan.completedTasks.size + plan.failedTasks.size === plan.taskMap.size
  }

  /**
   * Gets next level of tasks that can run in parallel.
   *
   * @param plan - Execution plan
   * @returns Array of task IDs that can run now
   */
  getNextParallelBatch(plan: ExecutionPlan): string[] {
    const ready: string[] = []

    for (const [taskId, task] of plan.taskMap) {
      // Skip completed and failed tasks
      if (plan.completedTasks.has(taskId) || plan.failedTasks.has(taskId)) {
        continue
      }

      // Check if all dependencies are satisfied
      const depsSatisfied = task.dependsOn.every(
        depId => plan.completedTasks.has(depId)
      )

      if (depsSatisfied) {
        ready.push(taskId)
      }
    }

    return ready
  }

  /**
   * Calculates the critical path length (longest dependency chain).
   *
   * @param graph - DAG graph
   * @returns Length of critical path
   */
  private calculateCriticalPath(graph: DAGGraph): number {
    const memo = new Map<string, number>()

    const dfs = (nodeId: string): number => {
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!
      }

      const dependents = graph.getDependents(nodeId)

      if (dependents.length === 0) {
        memo.set(nodeId, 1)
        return 1
      }

      let maxDepth = 0
      for (const depId of dependents) {
        maxDepth = Math.max(maxDepth, dfs(depId))
      }

      const depth = maxDepth + 1
      memo.set(nodeId, depth)
      return depth
    }

    let maxPath = 0
    for (const nodeId of graph.getAllNodes().map(n => n.id)) {
      // Only start from root nodes (no dependencies)
      const node = graph.getNode(nodeId)!
      if (node.dependsOn.length === 0) {
        maxPath = Math.max(maxPath, dfs(nodeId))
      }
    }

    return maxPath
  }

  /**
   * Gets execution statistics for a resolution result.
   *
   * @param result - Resolution result
   * @returns Statistics object
   */
  getExecutionStats(result: ResolutionResult): {
    totalLevels: number
    avgTasksPerLevel: number
    parallelism: number
    theoreticalSpeedup: number
  } {
    const totalLevels = result.levels.length
    const avgTasksPerLevel = totalLevels > 0
      ? result.totalTasks / totalLevels
      : 0

    // Parallelism ratio (tasks / levels)
    const parallelism = totalLevels > 0
      ? result.totalTasks / totalLevels
      : 0

    // Theoretical speedup (ideal parallel execution)
    const theoreticalSpeedup = parallelism

    return {
      totalLevels,
      avgTasksPerLevel,
      parallelism,
      theoreticalSpeedup
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolves task execution order from a list of nodes.
 *
 * @param nodes - Array of DAG nodes
 * @returns Resolution result
 *
 * @example
 * ```typescript
 * const result = resolveExecutionOrder([
 *   { id: '1', name: 'DB', command: 'Design DB', dependsOn: [], status: 'pending' },
 *   { id: '2', name: 'API', command: 'Design API', dependsOn: ['1'], status: 'pending' }
 * ])
 *
 * if (result.success) {
 *   console.log('Execution order:', result.levels)
 * }
 * ```
 */
export function resolveExecutionOrder(nodes: DAGNode[]): ResolutionResult {
  const { DAGGraph, createDAG } = require('./dag')
  const graph = createDAG(nodes)
  const resolver = new DependencyResolver()
  return resolver.resolve(graph)
}

/**
 * Formats a resolution result as a human-readable string.
 *
 * @param result - Resolution result
 * @returns Formatted string
 */
export function formatResolutionResult(result: ResolutionResult): string {
  if (!result.success) {
    return `❌ Resolution failed:\n${result.error}\n${
      result.cyclePath ? `Cycle: ${result.cyclePath.join(' → ')}` : ''
    }`
  }

  let text = `✅ Execution order resolved:\n\n`
  text += `Total tasks: ${result.totalTasks}\n`
  text += `Execution levels: ${result.levels.length}\n`
  text += `Max parallel tasks: ${result.maxParallelTasks}\n`
  text += `Critical path length: ${result.criticalPathLength}\n\n`

  for (const level of result.levels) {
    text += `Level ${level.level} (parallel):\n`
    for (const task of level.tasks) {
      text += `  - [${task.id}] ${task.name}: ${task.command}\n`
    }
    text += '\n'
  }

  return text.trim()
}
