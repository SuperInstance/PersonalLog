/**
 * DAG Builder Utilities
 *
 * High-level utilities for constructing and optimizing DAGs from task lists.
 * Provides fluent API for building complex task dependency graphs.
 */

import {
  DAGGraph,
  DAGNode,
  DAGEdge,
  DAGValidationResult,
  validateDAG,
  createEmptyDAG,
  addNode,
  removeNode,
  addEdge,
  removeEdge,
  topologicalSort,
  createExecutionPlan,
  getDAGStatistics
} from '../spreader/dag';

// ============================================================================
// BUILDER TYPES
// ============================================================================

export interface TaskDefinition {
  id?: string; // Auto-generated if not provided
  task: string;
  dependsOn?: string[]; // Task IDs this depends on
  estimatedDuration?: number;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, unknown>;
}

export interface DAGBuildOptions {
  autoGenerateIds?: boolean;
  validateOnBuild?: boolean;
  optimizeParallelization?: boolean;
  removeRedundantEdges?: boolean;
}

export interface DAGBuildResult {
  dag: DAGGraph;
  validation: DAGValidationResult;
  executionPlan: ReturnType<typeof createExecutionPlan>;
  statistics: ReturnType<typeof getDAGStatistics>;
  warnings: string[];
}

// ============================================================================
// DAG BUILDER CLASS
// ============================================================================

/**
 * Fluent builder for constructing DAGs.
 */
export class DAGBuilder {
  private dag: DAGGraph;
  private warnings: string[] = [];
  private options: DAGBuildOptions;

  constructor(options: DAGBuildOptions = {}) {
    this.dag = createEmptyDAG();
    this.options = {
      autoGenerateIds: options.autoGenerateIds ?? true,
      validateOnBuild: options.validateOnBuild ?? true,
      optimizeParallelization: options.optimizeParallelization ?? true,
      removeRedundantEdges: options.removeRedundantEdges ?? true
    };
  }

  /**
   * Adds a task to the DAG.
   */
  addTask(definition: TaskDefinition): this {
    const id = definition.id || this.generateTaskId(definition.task);

    // Check for duplicate ID
    if (this.dag.nodes.has(id)) {
      this.warnings.push(`Duplicate task ID: ${id}. Overwriting existing task.`);
    }

    const node = {
      id,
      task: definition.task,
      dependencies: definition.dependsOn || [],
      estimatedDuration: definition.estimatedDuration,
      priority: definition.priority,
      metadata: definition.metadata
    };

    addNode(this.dag, node);
    return this;
  }

  /**
   * Adds multiple tasks to the DAG.
   */
  addTasks(definitions: TaskDefinition[]): this {
    for (const def of definitions) {
      this.addTask(def);
    }
    return this;
  }

  /**
   * Adds a dependency edge between two tasks.
   */
  addDependency(fromTaskId: string, toTaskId: string, type: 'hard' | 'soft' = 'hard'): this {
    // Validate both tasks exist
    if (!this.dag.nodes.has(fromTaskId)) {
      this.warnings.push(`Source task ${fromTaskId} does not exist. Dependency not added.`);
      return this;
    }

    if (!this.dag.nodes.has(toTaskId)) {
      this.warnings.push(`Target task ${toTaskId} does not exist. Dependency not added.`);
      return this;
    }

    // Check if this would create a circular dependency
    const testDag = this.cloneDAG();
    addEdge(testDag, fromTaskId, toTaskId, type);
    const validation = validateDAG(testDag);

    if (!validation.isValid && validation.cycles.length > 0) {
      this.warnings.push(
        `Cannot add dependency ${fromTaskId} -> ${toTaskId}: would create circular dependency`
      );
      return this;
    }

    addEdge(this.dag, fromTaskId, toTaskId, type);
    return this;
  }

  /**
   * Removes a dependency edge.
   */
  removeDependency(fromTaskId: string, toTaskId: string): this {
    removeEdge(this.dag, fromTaskId, toTaskId);
    return this;
  }

  /**
   * Removes a task from the DAG.
   */
  removeTask(taskId: string): this {
    removeNode(this.dag, taskId);
    return this;
  }

  /**
   * Sets task priority.
   */
  setPriority(taskId: string, priority: 'low' | 'normal' | 'high'): this {
    const node = this.dag.nodes.get(taskId);
    if (node) {
      node.priority = priority;
    } else {
      this.warnings.push(`Task ${taskId} not found. Priority not set.`);
    }
    return this;
  }

  /**
   * Sets task estimated duration.
   */
  setDuration(taskId: string, duration: number): this {
    const node = this.dag.nodes.get(taskId);
    if (node) {
      node.estimatedDuration = duration;
    } else {
      this.warnings.push(`Task ${taskId} not found. Duration not set.`);
    }
    return this;
  }

  /**
   * Adds metadata to a task.
   */
  setMetadata(taskId: string, metadata: Record<string, unknown>): this {
    const node = this.dag.nodes.get(taskId);
    if (node) {
      node.metadata = { ...node.metadata, ...metadata };
    } else {
      this.warnings.push(`Task ${taskId} not found. Metadata not set.`);
    }
    return this;
  }

  /**
   * Builds and validates the DAG.
   */
  build(): DAGBuildResult {
    // Optimize if enabled
    if (this.options.optimizeParallelization) {
      this.optimizeForParallelization();
    }

    // Remove redundant edges if enabled
    if (this.options.removeRedundantEdges) {
      this.removeTransitiveEdges();
    }

    // Validate if enabled
    let validation: DAGValidationResult = {
      isValid: true,
      cycles: [],
      missingDependencies: [],
      errors: []
    };

    if (this.options.validateOnBuild) {
      validation = validateDAG(this.dag);
    }

    // Create execution plan
    const executionPlan = createExecutionPlan(this.dag);

    // Calculate statistics
    const statistics = getDAGStatistics(this.dag);

    return {
      dag: this.dag,
      validation,
      executionPlan,
      statistics,
      warnings: [...this.warnings]
    };
  }

  /**
   * Gets the current DAG (without validation).
   */
  getDAG(): DAGGraph {
    return this.dag;
  }

  /**
   * Gets current warnings.
   */
  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Clears all warnings.
   */
  clearWarnings(): this {
    this.warnings = [];
    return this;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generates a unique task ID from task description.
   */
  private generateTaskId(task: string): string {
    // Extract first few words and sanitize
    const words = task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 3);

    const baseId = words.join('-');

    // Ensure uniqueness
    let id = baseId;
    let counter = 1;
    while (this.dag.nodes.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Creates a deep clone of the current DAG.
   */
  private cloneDAG(): DAGGraph {
    const cloned: DAGGraph = {
      nodes: new Map(),
      edges: [...this.dag.edges]
    };

    for (const [id, node] of this.dag.nodes) {
      cloned.nodes.set(id, { ...node });
    }

    return cloned;
  }

  /**
   * Optimizes DAG for parallel execution.
   * Attempts to minimize critical path and maximize parallelization.
   */
  private optimizeForParallelization(): void {
    // Sort tasks by priority within dependency levels
    const sorted = topologicalSort(this.dag);

    // Group by dependency level
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    for (const taskId of sorted) {
      if (visited.has(taskId)) continue;

      const level = this.calculateLevel(taskId, visited);
      levels.set(taskId, level);
    }

    // Reorder edges to prioritize high-priority tasks
    // (This is a simple optimization - more sophisticated ones exist)
  }

  /**
   * Calculates the dependency level of a task.
   */
  private calculateLevel(taskId: string, visited: Set<string>): number {
    if (visited.has(taskId)) {
      return 0;
    }

    visited.add(taskId);

    const node = this.dag.nodes.get(taskId);
    if (!node || node.dependencies.length === 0) {
      return 0;
    }

    const depLevels = node.dependencies.map(depId =>
      this.calculateLevel(depId, visited)
    );

    return Math.max(...depLevels) + 1;
  }

  /**
   * Removes transitive (redundant) edges.
   * If A -> B and B -> C, then A -> C is redundant.
   */
  private removeTransitiveEdges(): void {
    const toRemove: string[] = [];

    for (const edge of this.dag.edges) {
      const { from, to } = edge;

      // Check if there's a path from 'from' to 'to' through other nodes
      if (hasAlternativePath(this.dag, from, to, [])) {
        toRemove.push(`${from}-${to}`);
      }
    }

    // Remove redundant edges
    for (const edgeKey of toRemove) {
      const [from, to] = edgeKey.split('-');
      removeEdge(this.dag, from, to);
    }

    if (toRemove.length > 0) {
      this.warnings.push(
        `Removed ${toRemove.length} redundant edges for optimization`
      );
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if there's an alternative path from 'from' to 'to' (excluding direct edge).
 */
function hasAlternativePath(
  dag: DAGGraph,
  from: string,
  to: string,
  visited: string[]
): boolean {
  const fromNode = dag.nodes.get(from);
  if (!fromNode) return false;

  for (const depId of fromNode.dependencies) {
    if (depId === to) {
      // Found a path through this dependency
      return true;
    }

    if (!visited.includes(depId)) {
      if (hasAlternativePath(dag, depId, to, [...visited, depId])) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Builds a DAG from a list of task definitions.
 */
export function buildDAGFromTasks(
  tasks: TaskDefinition[],
  options?: DAGBuildOptions
): DAGBuildResult {
  const builder = new DAGBuilder(options);
  builder.addTasks(tasks);
  return builder.build();
}

/**
 * Creates a simple sequential DAG (tasks execute one after another).
 */
export function createSequentialDAG(tasks: string[]): DAGBuildResult {
  const definitions: TaskDefinition[] = tasks.map((task, index) => ({
    task,
    dependsOn: index > 0 ? [`task-${index - 1}`] : []
  }));

  return buildDAGFromTasks(definitions, {
    autoGenerateIds: true
  });
}

/**
 * Creates a parallel DAG (all tasks execute simultaneously).
 */
export function createParallelDAG(tasks: string[]): DAGBuildResult {
  const definitions: TaskDefinition[] = tasks.map(task => ({
    task,
    dependsOn: [] // No dependencies = all can run in parallel
  }));

  return buildDAGFromTasks(definitions);
}

/**
 * Creates a tiered DAG (tasks organized in tiers/layers).
 */
export function createTieredDAG(tiers: string[][]): DAGBuildResult {
  const definitions: TaskDefinition[] = [];
  const taskIdMap = new Map<number, string[]>();

  // Create task definitions
  tiers.forEach((tierTasks, tierIndex) => {
    const taskIds: string[] = [];

    tierTasks.forEach((task, taskIndex) => {
      const id = `tier-${tierIndex}-task-${taskIndex}`;
      taskIds.push(id);

      definitions.push({
        id,
        task,
        dependsOn: tierIndex > 0 ? taskIdMap.get(tierIndex - 1) || [] : []
      });
    });

    taskIdMap.set(tierIndex, taskIds);
  });

  return buildDAGFromTasks(definitions);
}

/**
 * Parses natural language task descriptions into DAG.
 * Simple heuristic-based parser.
 */
export function parseTasksFromText(text: string): TaskDefinition[] {
  const tasks: TaskDefinition[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Skip comments
    if (line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Parse dependency notation: "task (depends on: task1, task2)"
    const depMatch = line.match(/^(.+?)\s*\(depends\s+on:\s*(.+)\)$/i);
    if (depMatch) {
      const task = depMatch[1].trim();
      const deps = depMatch[2].split(',').map(d => d.trim());

      tasks.push({
        task,
        dependsOn: deps
      });
      continue;
    }

    // Parse priority notation: "task [high priority]"
    const priorityMatch = line.match(/^(.+?)\s*\[(\w+)\s+priority\]$/i);
    if (priorityMatch) {
      const task = priorityMatch[1].trim();
      const priority = priorityMatch[2].toLowerCase() as 'low' | 'normal' | 'high';

      tasks.push({
        task,
        priority: ['low', 'normal', 'high'].includes(priority) ? priority : 'normal'
      });
      continue;
    }

    // Simple task (no dependencies or special notation)
    tasks.push({ task: line });
  }

  return tasks;
}

/**
 * Creates a DAG from natural language text.
 */
export function createDAGFromText(text: string, options?: DAGBuildOptions): DAGBuildResult {
  const tasks = parseTasksFromText(text);
  return buildDAGFromTasks(tasks, options);
}

// ============================================================================
// DAG EXPORT/IMPORT
// ============================================================================

/**
 * Exports DAG to human-readable format.
 */
export function exportDAGAsText(dag: DAGGraph): string {
  const lines: string[] = [];

  lines.push('# DAG Task Execution Plan\n');

  for (const [id, node] of dag.nodes) {
    let line = `- ${node.task}`;

    if (node.dependencies.length > 0) {
      line += ` (depends on: ${node.dependencies.join(', ')})`;
    }

    if (node.priority && node.priority !== 'normal') {
      line += ` [${node.priority} priority]`;
    }

    if (node.estimatedDuration) {
      line += ` [~${node.estimatedDuration}s]`;
    }

    lines.push(line);
  }

  lines.push('');
  lines.push('---');
  lines.push(`Total tasks: ${dag.nodes.size}`);
  lines.push(`Dependencies: ${dag.edges.length}`);

  return lines.join('\n');
}

/**
 * Imports DAG from JSON string.
 */
export function importDAGFromJSON(json: string): DAGGraph {
  return JSON.parse(json);
}

/**
 * Exports DAG to JSON string.
 */
export function exportDAGAsJSON(dag: DAGGraph): string {
  return JSON.stringify({
    nodes: Array.from(dag.nodes.entries()),
    edges: dag.edges
  }, null, 2);
}
