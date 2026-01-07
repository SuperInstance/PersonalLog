/**
 * DAG (Directed Acyclic Graph) Task Dependency System
 *
 * Provides data structures for managing task dependencies with automatic
 * cycle detection and topological sorting for execution order.
 */

// ============================================================================
// DAG DATA STRUCTURES
// ============================================================================

/**
 * A single node in the DAG representing a task with its dependencies.
 */
export interface DAGNode {
  /** Unique task identifier */
  id: string
  /** Task name/description */
  name: string
  /** Task command/instruction */
  command: string
  /** List of task IDs this task depends on */
  dependsOn: string[]
  /** Execution status */
  status: 'pending' | 'running' | 'complete' | 'failed'
  /** Task object (for compatibility with executor) */
  task?: {
    id: string
    name: string
    command: string
    dependsOn: string[]
  }
  /** Execution metadata */
  metadata?: {
    startTime?: number
    endTime?: number
    duration?: number
    error?: string
  }
}

/**
 * Directed Acyclic Graph for managing task dependencies.
 */
export class DAGGraph {
  /** All nodes in the graph indexed by ID */
  private nodes: Map<string, DAGNode> = new Map()
  /** Adjacency list: node ID -> list of dependent node IDs */
  private adjacencyList: Map<string, Set<string>> = new Map()
  /** Reverse adjacency list: node ID -> list of prerequisite node IDs */
  private reverseAdjacencyList: Map<string, Set<string>> = new Map()

  /**
   * Adds a node to the graph.
   *
   * @param node - Node to add
   * @throws Error if node with same ID already exists
   */
  addNode(node: DAGNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with ID '${node.id}' already exists`)
    }

    this.nodes.set(node.id, node)
    this.adjacencyList.set(node.id, new Set(node.dependsOn))
    this.reverseAdjacencyList.set(node.id, new Set())

    // Update reverse adjacency for dependencies
    for (const depId of node.dependsOn) {
      if (!this.reverseAdjacencyList.has(depId)) {
        this.reverseAdjacencyList.set(depId, new Set())
      }
      this.reverseAdjacencyList.get(depId)!.add(node.id)
    }
  }

  /**
   * Adds an edge from one node to another (creates dependency).
   *
   * @param fromId - Source node ID (dependent task)
   * @param toId - Target node ID (prerequisite task)
   * @throws Error if nodes don't exist or if edge creates a cycle
   */
  addEdge(fromId: string, toId: string): void {
    if (!this.nodes.has(fromId)) {
      throw new Error(`Node '${fromId}' does not exist`)
    }
    if (!this.nodes.has(toId)) {
      throw new Error(`Node '${toId}' does not exist`)
    }

    // Add edge
    this.adjacencyList.get(fromId)!.add(toId)
    this.reverseAdjacencyList.get(toId)!.add(fromId)

    // Update node's dependencies
    const node = this.nodes.get(fromId)!
    if (!node.dependsOn.includes(toId)) {
      node.dependsOn.push(toId)
    }

    // Check for cycles
    if (this.detectCycle()) {
      // Rollback edge addition
      this.adjacencyList.get(fromId)!.delete(toId)
      this.reverseAdjacencyList.get(toId)!.delete(fromId)
      node.dependsOn = node.dependsOn.filter(id => id !== toId)

      throw new Error(`Adding edge '${fromId}' -> '${toId}' would create a cycle`)
    }
  }

  /**
   * Gets a node by ID.
   *
   * @param id - Node ID
   * @returns Node or undefined if not found
   */
  getNode(id: string): DAGNode | undefined {
    return this.nodes.get(id)
  }

  /**
   * Gets all nodes in the graph.
   *
   * @returns Array of all nodes
   */
  getAllNodes(): DAGNode[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Gets the nodes map (for iteration in executor).
   *
   * @returns Map of node ID to node
   */
  getNodesMap(): Map<string, DAGNode> {
    return this.nodes
  }

  /**
   * Gets all nodes that have no dependencies (can run immediately).
   *
   * @returns Array of nodes with no dependencies
   */
  getRootNodes(): DAGNode[] {
    return Array.from(this.nodes.values()).filter(node => node.dependsOn.length === 0)
  }

  /**
   * Gets all nodes that depend on the given node.
   *
   * @param id - Node ID
   * @returns Array of dependent node IDs
   */
  getDependents(id: string): string[] {
    return Array.from(this.reverseAdjacencyList.get(id) || [])
  }

  /**
   * Gets all nodes that the given node depends on.
   *
   * @param id - Node ID
   * @returns Array of prerequisite node IDs
   */
  getPrerequisites(id: string): string[] {
    return Array.from(this.adjacencyList.get(id) || [])
  }

  /**
   * Detects if there's a cycle in the graph using DFS.
   *
   * @returns True if a cycle exists, false otherwise
   */
  detectCycle(): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = this.adjacencyList.get(nodeId) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a back edge - cycle detected
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Gets the cycle path if one exists (for debugging).
   *
   * @returns Array of node IDs forming the cycle, or empty array if no cycle
   */
  getCyclePath(): string[] {
    const visited = new Set<string>()
    const parent = new Map<string, string | null>()

    const dfs = (nodeId: string, path: string[]): string[] | null => {
      visited.add(nodeId)
      path.push(nodeId)

      const neighbors = this.adjacencyList.get(nodeId) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          parent.set(neighbor, nodeId)
          const result = dfs(neighbor, path)
          if (result) return result
        } else if (path.includes(neighbor)) {
          // Found cycle - extract path
          const cycleStart = path.indexOf(neighbor)
          return [...path.slice(cycleStart), neighbor]
        }
      }

      path.pop()
      return null
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId, [])
        if (cycle) return cycle
      }
    }

    return []
  }

  /**
   * Validates the graph structure.
   *
   * @returns Object with validation results
   */
  validate(): {
    valid: boolean
    errors: string[]
    cyclePath?: string[]
  } {
    const errors: string[] = []

    // Check for cycles
    if (this.detectCycle()) {
      const cyclePath = this.getCyclePath()
      errors.push(`Circular dependency detected: ${cyclePath.join(' -> ')}`)
      return {
        valid: false,
        errors,
        cyclePath
      }
    }

    // Check for missing dependencies
    for (const node of this.nodes.values()) {
      for (const depId of node.dependsOn) {
        if (!this.nodes.has(depId)) {
          errors.push(`Node '${node.id}' depends on non-existent node '${depId}'`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Creates a deep copy of the graph.
   *
   * @returns New DAGGraph instance with copied nodes
   */
  clone(): DAGGraph {
    const newGraph = new DAGGraph()
    for (const node of this.nodes.values()) {
      newGraph.addNode({
        ...node,
        dependsOn: [...node.dependsOn]
      })
    }
    return newGraph
  }

  /**
   * Performs topological sort on the graph using Kahn's algorithm.
   *
   * @returns Array of node IDs in topological order
   * @throws Error if graph contains a cycle
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>()
    const queue: string[] = []

    // Initialize in-degrees
    for (const [id, node] of this.nodes) {
      const degree = node.dependsOn.length
      inDegree.set(id, degree)
      if (degree === 0) {
        queue.push(id)
      }
    }

    const sorted: string[] = []

    while (queue.length > 0) {
      const id = queue.shift()!
      sorted.push(id)

      // Reduce in-degree for all dependent nodes
      for (const dependent of this.getDependents(id)) {
        const newDegree = inDegree.get(dependent)! - 1
        inDegree.set(dependent, newDegree)

        if (newDegree === 0) {
          queue.push(dependent)
        }
      }
    }

    // Check if all nodes were processed (no cycles)
    if (sorted.length !== this.nodes.size) {
      throw new Error('Graph contains a cycle')
    }

    return sorted
  }

  /**
   * Gets execution levels (groups of tasks that can run in parallel).
   *
   * @returns Array of levels, each containing node IDs that can run in parallel
   */
  getExecutionLevels(): string[][] {
    const levels: string[][] = []
    const processed = new Set<string>()
    let currentLevel: string[] = []

    // Start with root nodes (no dependencies)
    currentLevel = this.getRootNodes().map(n => n.id)

    while (currentLevel.length > 0) {
      levels.push(currentLevel)

      // Mark current level as processed
      for (const id of currentLevel) {
        processed.add(id)
      }

      // Find next level: nodes whose dependencies are all processed
      const nextLevel: string[] = []
      for (const node of this.nodes.values()) {
        if (processed.has(node.id)) continue

        // Check if all dependencies are processed
        const dependencies = node.dependsOn
        const allDepsProcessed = dependencies.every(dep => processed.has(dep))

        if (allDepsProcessed) {
          nextLevel.push(node.id)
        }
      }

      currentLevel = nextLevel
    }

    return levels
  }

  /**
   * Gets graph statistics.
   *
   * @returns Object with graph metrics
   */
  getStats(): {
    nodeCount: number
    edgeCount: number
    maxDepth: number
    rootCount: number
    leafCount: number
  } {
    let edgeCount = 0
    let maxDepth = 0
    let leafCount = 0

    // Count edges
    for (const deps of this.adjacencyList.values()) {
      edgeCount += deps.size
    }

    // Calculate max depth and count leaves
    const calculateDepth = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0
      visited.add(nodeId)

      const dependents = this.getDependents(nodeId)
      if (dependents.length === 0) {
        return 0
      }

      let maxChildDepth = 0
      for (const depId of dependents) {
        maxChildDepth = Math.max(maxChildDepth, calculateDepth(depId, visited))
      }
      return maxChildDepth + 1
    }

    for (const nodeId of this.nodes.keys()) {
      const depth = calculateDepth(nodeId)
      maxDepth = Math.max(maxDepth, depth)

      if (this.getDependents(nodeId).length === 0) {
        leafCount++
      }
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount,
      maxDepth,
      rootCount: this.getRootNodes().length,
      leafCount
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a DAG graph from an array of nodes.
 *
 * @param nodes - Array of DAG nodes
 * @returns DAGGraph instance
 * @throws Error if graph is invalid
 */
export function createDAG(nodes: DAGNode[]): DAGGraph {
  const graph = new DAGGraph()

  for (const node of nodes) {
    graph.addNode(node)
  }

  // Validate graph
  const validation = graph.validate()
  if (!validation.valid) {
    throw new Error(`Invalid DAG: ${validation.errors.join(', ')}`)
  }

  return graph
}

/**
 * Converts a task list with dependencies to DAG nodes.
 *
 * @param tasks - Array of tasks with optional dependencies
 * @returns Array of DAG nodes
 *
 * @example
 * ```typescript
 * const nodes = tasksToDAGNodes([
 *   { id: '1', name: 'DB', command: 'Design DB', dependsOn: [] },
 *   { id: '2', name: 'API', command: 'Design API', dependsOn: ['1'] }
 * ])
 * ```
 */
export function tasksToDAGNodes(tasks: Array<{
  id: string
  name: string
  command: string
  dependsOn?: string[]
}>): DAGNode[] {
  return tasks.map(task => ({
    id: task.id,
    name: task.name,
    command: task.command,
    dependsOn: task.dependsOn || [],
    status: 'pending'
  }))
}

// ============================================================================
// DAG EXECUTION TYPES (for integration with DAGExecutor)
// ============================================================================

/**
 * Execution state of a single DAG node.
 */
export type DAGNodeStatus = 'pending' | 'running' | 'complete' | 'failed'

/**
 * Execution state for a single task/node in the DAG.
 */
export interface DAGTaskState {
  /** Current status of the task */
  status: DAGNodeStatus
  /** Number of retry attempts */
  retries?: number
  /** Task start time (timestamp) */
  startTime?: number
  /** Task end time (timestamp) */
  endTime?: number
  /** Task result (if completed) */
  result?: unknown
  /** Task error (if failed) */
  error?: Error
}

/**
 * Full execution state for all nodes in the DAG (mapping from node ID to status only).
 * Use DAGTaskState for detailed task state tracking.
 */
export interface DAGExecutionState {
  /** Map of node ID to execution status */
  [nodeId: string]: DAGNodeStatus
}

/**
 * Execution plan produced by topological sort.
 */
export interface DAGExecutionPlan {
  /** Whether the plan is valid */
  isValid: boolean
  /** Validation errors if any */
  errors: string[]
  /** Levels of execution (each level can run in parallel) */
  levels: string[][]
  /** Rounds with metadata for execution */
  rounds: Array<{
    round: number
    parallelTasks: string[]
  }>
  /** Complete execution order */
  order: string[]
  /** Total number of levels */
  levelCount: number
  /** Nodes that can run immediately (level 0) */
  ready: string[]
}

/**
 * Validates a DAG and produces an execution plan.
 */
export function validateDAG(graph: DAGGraph): DAGExecutionPlan {
  const validation = graph.validate()
  if (!validation.valid) {
    return {
      isValid: false,
      errors: validation.errors,
      levels: [],
      rounds: [],
      order: [],
      levelCount: 0,
      ready: []
    }
  }

  const sorted = graph.topologicalSort()
  const levels = graph.getExecutionLevels()

  // Convert levels to rounds with metadata
  const rounds = levels.map((parallelTasks, round) => ({
    round,
    parallelTasks
  }))

  return {
    isValid: true,
    errors: [],
    levels,
    rounds,
    order: sorted,
    levelCount: levels.length,
    ready: levels[0] || []
  }
}

/**
 * Creates an execution plan from a DAG graph.
 */
export function createExecutionPlan(graph: DAGGraph): DAGExecutionPlan {
  return validateDAG(graph)
}
