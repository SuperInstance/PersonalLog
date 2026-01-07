/**
 * DAG (Directed Acyclic Graph) Task System
 *
 * Enables intelligent orchestration of parallel conversations with dependencies.
 * Provides topological sorting, cycle detection, and execution planning.
 */

// ============================================================================
// DAG TYPES
// ============================================================================

export interface DAGNode {
  id: string;
  task: string; // Human-readable task description
  dependencies: string[]; // IDs of tasks this depends on
  estimatedDuration?: number; // In seconds
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

export interface DAGEdge {
  from: string; // Task ID
  to: string; // Task ID
  type: 'hard' | 'soft'; // Hard = must wait, Soft = preferred order
}

export interface DAGGraph {
  nodes: Map<string, DAGNode>;
  edges: DAGEdge[];
}

export interface DAGExecutionPlan {
  rounds: Array<{
    round: number;
    parallelTasks: string[]; // Tasks that can run in parallel
  }>;
  criticalPath: string[]; // Tasks on longest path
  estimatedDuration: number; // Total duration in seconds
}

export type DAGNodeStatus = 'pending' | 'running' | 'complete' | 'failed' | 'skipped';

export interface DAGExecutionState {
  status: DAGNodeStatus;
  startTime?: number;
  endTime?: number;
  result?: unknown;
  error?: Error;
  retries: number;
}

export interface DAGValidationResult {
  isValid: boolean;
  cycles: string[][]; // Array of cycles (each is array of task IDs)
  missingDependencies: string[]; // Dependencies that don't exist
  errors: string[];
}

// ============================================================================
// DAG CREATION
// ============================================================================

/**
 * Creates an empty DAG graph.
 */
export function createEmptyDAG(): DAGGraph {
  return {
    nodes: new Map(),
    edges: []
  };
}

/**
 * Creates a DAG node from task description.
 */
export function createDAGNode(
  id: string,
  task: string,
  dependencies: string[] = [],
  options?: {
    estimatedDuration?: number;
    priority?: 'low' | 'normal' | 'high';
    metadata?: Record<string, unknown>;
  }
): DAGNode {
  return {
    id,
    task,
    dependencies,
    estimatedDuration: options?.estimatedDuration,
    priority: options?.priority || 'normal',
    metadata: options?.metadata
  };
}

/**
 * Adds a node to the DAG.
 */
export function addNode(dag: DAGGraph, node: DAGNode): void {
  dag.nodes.set(node.id, node);

  // Add edges for dependencies
  for (const depId of node.dependencies) {
    dag.edges.push({
      from: depId,
      to: node.id,
      type: 'hard'
    });
  }
}

/**
 * Removes a node from the DAG.
 */
export function removeNode(dag: DAGGraph, nodeId: string): boolean {
  const removed = dag.nodes.delete(nodeId);

  if (removed) {
    // Remove all edges involving this node
    dag.edges = dag.edges.filter(
      edge => edge.from !== nodeId && edge.to !== nodeId
    );
  }

  return removed;
}

/**
 * Adds an edge between two nodes.
 */
export function addEdge(
  dag: DAGGraph,
  from: string,
  to: string,
  type: 'hard' | 'soft' = 'hard'
): void {
  // Check if edge already exists
  const exists = dag.edges.some(
    edge => edge.from === from && edge.to === to
  );

  if (!exists) {
    dag.edges.push({ from, to, type });
  }
}

/**
 * Removes an edge from the DAG.
 */
export function removeEdge(dag: DAGGraph, from: string, to: string): boolean {
  const initialLength = dag.edges.length;
  dag.edges = dag.edges.filter(
    edge => !(edge.from === from && edge.to === to)
  );
  return dag.edges.length < initialLength;
}

// ============================================================================
// DAG VALIDATION
// ============================================================================

/**
 * Validates the DAG structure.
 */
export function validateDAG(dag: DAGGraph): DAGValidationResult {
  const errors: string[] = [];
  const cycles: string[][] = [];
  const missingDependencies: string[] = [];

  // Check for missing dependencies
  for (const [id, node] of dag.nodes) {
    for (const depId of node.dependencies) {
      if (!dag.nodes.has(depId)) {
        missingDependencies.push(`${id} -> ${depId}`);
      }
    }
  }

  if (missingDependencies.length > 0) {
    errors.push(
      `Missing dependencies: ${missingDependencies.join(', ')}`
    );
  }

  // Check for cycles
  const detectedCycles = detectCycles(dag);
  cycles.push(...detectedCycles);

  if (cycles.length > 0) {
    errors.push(
      `Circular dependencies detected: ${cycles.map(c => c.join(' -> ')).join('; ')}`
    );
  }

  return {
    isValid: errors.length === 0,
    cycles,
    missingDependencies,
    errors
  };
}

/**
 * Detects circular dependencies in the DAG using DFS.
 */
export function detectCycles(dag: DAGGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const node = dag.nodes.get(nodeId);
    if (!node) {
      path.pop();
      recStack.delete(nodeId);
      return;
    }

    for (const depId of node.dependencies) {
      if (!visited.has(depId)) {
        dfs(depId, [...path]);
      } else if (recStack.has(depId)) {
        // Found a cycle
        const cycleStart = path.indexOf(depId);
        const cycle = path.slice(cycleStart);
        cycle.push(depId);
        cycles.push(cycle);
      }
    }

    recStack.delete(nodeId);
    path.pop();
  }

  for (const nodeId of dag.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

// ============================================================================
// TOPOLOGICAL SORT
// ============================================================================

/**
 * Performs topological sort on the DAG.
 * Returns tasks in execution order (dependencies first).
 *
 * @throws {Error} If circular dependencies are detected
 */
export function topologicalSort(dag: DAGGraph): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(nodeId: string): void {
    if (temp.has(nodeId)) {
      throw new Error(`Circular dependency detected involving ${nodeId}`);
    }

    if (visited.has(nodeId)) {
      return;
    }

    temp.add(nodeId);

    const node = dag.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Visit dependencies first
    for (const depId of node.dependencies) {
      visit(depId);
    }

    temp.delete(nodeId);
    visited.add(nodeId);
    sorted.push(nodeId);
  }

  // Visit all nodes
  for (const nodeId of dag.nodes.keys()) {
    visit(nodeId);
  }

  return sorted;
}

// ============================================================================
// EXECUTION PLANNING
// ============================================================================

/**
 * Creates an execution plan for the DAG.
 * Determines which tasks can run in parallel in each round.
 */
export function createExecutionPlan(dag: DAGGraph): DAGExecutionPlan {
  const sorted = topologicalSort(dag);
  const rounds: DAGExecutionPlan['rounds'] = [];
  const completed = new Set<string>();

  let round = 0;
  let i = 0;

  while (completed.size < sorted.length) {
    const parallelTasks: string[] = [];
    const addedThisRound = new Set<string>();

    // Find tasks whose dependencies are complete
    for (const taskId of sorted) {
      if (completed.has(taskId) || addedThisRound.has(taskId)) {
        continue;
      }

      const node = dag.nodes.get(taskId);
      if (!node) continue;

      const depsComplete = node.dependencies.every(dep => completed.has(dep));

      if (depsComplete) {
        parallelTasks.push(taskId);
        addedThisRound.add(taskId);
      }
    }

    if (parallelTasks.length === 0 && completed.size < sorted.length) {
      // This shouldn't happen if DAG is valid
      throw new Error('Unable to create execution plan: possible circular dependency');
    }

    if (parallelTasks.length > 0) {
      // Sort by priority (high -> normal -> low)
      parallelTasks.sort((a, b) => {
        const nodeA = dag.nodes.get(a);
        const nodeB = dag.nodes.get(b);
        const priorityA = nodeA?.priority || 'normal';
        const priorityB = nodeB?.priority || 'normal';

        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[priorityA] - priorityOrder[priorityB];
      });

      rounds.push({
        round,
        parallelTasks
      });

      // Mark as complete (for planning purposes)
      for (const taskId of parallelTasks) {
        completed.add(taskId);
      }

      round++;
    } else {
      break;
    }
  }

  // Calculate critical path
  const criticalPath = calculateCriticalPath(dag);

  // Estimate duration (parallel tasks count as max duration)
  const estimatedDuration = rounds.reduce((total, round) => {
    const maxDuration = Math.max(
      ...round.parallelTasks.map(id => {
        const node = dag.nodes.get(id);
        return node?.estimatedDuration || 0;
      })
    );
    return total + maxDuration;
  }, 0);

  return { rounds, criticalPath, estimatedDuration };
}

/**
 * Calculates the critical path (longest path) through the DAG.
 * Uses dynamic programming to find the path with maximum total duration.
 */
export function calculateCriticalPath(dag: DAGGraph): string[] {
  const distance = new Map<string, number>();
  const predecessor = new Map<string, string | null>();

  // Initialize distances
  for (const [id, node] of dag.nodes) {
    if (node.dependencies.length === 0) {
      distance.set(id, node.estimatedDuration || 1);
      predecessor.set(id, null);
    } else {
      distance.set(id, 0);
      predecessor.set(id, null);
    }
  }

  // Process in topological order
  const sorted = topologicalSort(dag);

  for (const nodeId of sorted) {
    const node = dag.nodes.get(nodeId);
    if (!node) continue;

    for (const depId of node.dependencies) {
      const depDist = distance.get(depId) || 0;
      const nodeDist = distance.get(nodeId) || 0;
      const edgeWeight = node.estimatedDuration || 1;

      if (depDist + edgeWeight > nodeDist) {
        distance.set(nodeId, depDist + edgeWeight);
        predecessor.set(nodeId, depId);
      }
    }
  }

  // Find node with maximum distance
  let maxId = '';
  let maxDist = 0;
  for (const [id, dist] of distance) {
    if (dist > maxDist) {
      maxDist = dist;
      maxId = id;
    }
  }

  // Reconstruct path by following predecessors
  const path: string[] = [];
  let current = maxId;
  while (current) {
    path.unshift(current);
    const next = predecessor.get(current);
    if (!next) break;
    current = next;
  }

  return path;
}

/**
 * Gets tasks that are ready to execute (all dependencies complete).
 */
export function getExecutableTasks(
  dag: DAGGraph,
  completedTasks: Set<string>
): string[] {
  const executable: string[] = [];

  for (const [id, node] of dag.nodes) {
    if (completedTasks.has(id)) {
      continue; // Already complete
    }

    // Check if all dependencies are complete
    const depsComplete = node.dependencies.every(dep => completedTasks.has(dep));

    if (depsComplete) {
      executable.push(id);
    }
  }

  return executable;
}

/**
 * Gets node dependencies (both direct and transitive).
 */
export function getAllDependencies(
  dag: DAGGraph,
  nodeId: string,
  visited = new Set<string>()
): string[] {
  if (visited.has(nodeId)) {
    return [];
  }

  visited.add(nodeId);

  const node = dag.nodes.get(nodeId);
  if (!node) {
    return [];
  }

  const deps: string[] = [...node.dependencies];

  for (const depId of node.dependencies) {
    deps.push(...getAllDependencies(dag, depId, visited));
  }

  return deps;
}

/**
 * Gets node dependents (tasks that depend on this node).
 */
export function getDependents(dag: DAGGraph, nodeId: string): string[] {
  const dependents: string[] = [];

  for (const [id, node] of dag.nodes) {
    if (node.dependencies.includes(nodeId)) {
      dependents.push(id);
    }
  }

  return dependents;
}

// ============================================================================
// DAG SERIALIZATION
// ============================================================================

/**
 * Serializes DAG to JSON.
 */
export function serializeDAG(dag: DAGGraph): string {
  const data = {
    nodes: Array.from(dag.nodes.entries()),
    edges: dag.edges
  };

  return JSON.stringify(data);
}

/**
 * Deserializes DAG from JSON.
 */
export function deserializeDAG(json: string): DAGGraph {
  const data = JSON.parse(json);

  return {
    nodes: new Map(data.nodes),
    edges: data.edges
  };
}

// ============================================================================
// DAG STATISTICS
// ============================================================================

/**
 * Gets statistics about the DAG.
 */
export function getDAGStatistics(dag: DAGGraph) {
  const nodeCount = dag.nodes.size;
  const edgeCount = dag.edges.length;

  // Count nodes by priority
  const priorityCounts = {
    high: 0,
    normal: 0,
    low: 0
  };

  for (const node of dag.nodes.values()) {
    const priority = node.priority || 'normal';
    priorityCounts[priority]++;
  }

  // Count nodes with no dependencies (roots)
  const rootNodes = Array.from(dag.nodes.values()).filter(
    node => node.dependencies.length === 0
  ).length;

  // Count nodes with no dependents (leaves)
  const leafNodes = Array.from(dag.nodes.keys()).filter(id =>
    getDependents(dag, id).length === 0
  ).length;

  // Calculate average duration
  const totalDuration = Array.from(dag.nodes.values())
    .reduce((sum, node) => sum + (node.estimatedDuration || 0), 0);
  const avgDuration = nodeCount > 0 ? totalDuration / nodeCount : 0;

  return {
    nodeCount,
    edgeCount,
    priorityCounts,
    rootNodes,
    leafNodes,
    totalDuration,
    avgDuration
  };
}

// ============================================================================
// DAG CREATION HELPERS
// ============================================================================

/**
 * Creates a DAG from an array of nodes.
 * Convenience function that creates an empty DAG and adds all nodes.
 */
export function createDAG(nodes: DAGNode[]): DAGGraph {
  const dag = createEmptyDAG();
  for (const node of nodes) {
    addNode(dag, node);
  }
  return dag;
}

/**
 * Converts parsed tasks to DAG nodes.
 * Used by the spread command parser.
 */
export function tasksToDAGNodes(
  tasks: Array<{ id: string; command: string; dependsOn: string[] }>
): DAGNode[] {
  return tasks.map(task =>
    createDAGNode(
      task.id,
      task.command,
      task.dependsOn
    )
  );
}
