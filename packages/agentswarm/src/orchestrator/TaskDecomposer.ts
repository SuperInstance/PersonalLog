import type { Task, SwarmConfig } from '../types.js';

/**
 * Task Decomposer - Break complex tasks into subtasks
 *
 * Features:
 * - Hierarchical decomposition
 * - Capability-based splitting
 * - Budget allocation
 * - Priority inheritance
 */
export class TaskDecomposer {
  private config: SwarmConfig;
  private taskIdCounter: number = 0;

  constructor(config: SwarmConfig) {
    this.config = config;
  }

  /**
   * Decompose a task into subtasks
   */
  decompose(task: Task, depth: number = 0): Task[] {
    // Check max depth
    if (depth >= this.config.maxDecompositionDepth) {
      return [task];
    }

    // Analyze task complexity
    const complexity = this.analyzeComplexity(task);

    // Simple tasks don't need decomposition
    if (complexity.score < 0.3) {
      return [task];
    }

    // Determine decomposition strategy
    const strategy = this.determineStrategy(task, complexity);

    // Decompose based on strategy
    const subtasks = strategy === 'hierarchical'
      ? this.hierarchicalDecompose(task, complexity, depth)
      : strategy === 'flat'
      ? this.flatDecompose(task, complexity)
      : this.adaptiveDecompose(task, complexity, depth);

    // Update task with subtasks
    task.subtasks = subtasks;
    task.status = 'pending';

    return subtasks;
  }

  /**
   * Analyze task complexity
   */
  private analyzeComplexity(task: Task): ComplexityAnalysis {
    let score = 0;
    const factors: string[] = [];

    // Number of required capabilities
    if (task.requiredCapabilities.length > 3) {
      score += 0.2;
      factors.push('multiple-capabilities');
    }

    // Budget size
    if (task.budget > 500) {
      score += 0.15;
      factors.push('high-budget');
    }

    // Task description length (proxy for complexity)
    const wordCount = task.description.split(/\s+/).length;
    if (wordCount > 50) {
      score += 0.1;
      factors.push('long-description');
    }

    // Priority
    if (task.priority > 7) {
      score += 0.1;
      factors.push('high-priority');
    }

    return { score, factors };
  }

  /**
   * Determine decomposition strategy
   */
  private determineStrategy(task: Task, complexity: ComplexityAnalysis): 'hierarchical' | 'flat' | 'adaptive' {
    if (this.config.decompositionStrategy !== 'adaptive') {
      return this.config.decompositionStrategy;
    }

    // Adaptive strategy based on complexity
    if (complexity.score > 0.4) {
      return 'hierarchical'; // Complex tasks get hierarchical decomposition
    } else if (complexity.score > 0.2) {
      return 'flat'; // Medium complexity gets flat decomposition
    } else {
      return 'flat'; // Simple tasks might not decompose at all
    }
  }

  /**
   * Hierarchical decomposition
   */
  private hierarchicalDecompose(task: Task, complexity: ComplexityAnalysis, depth: number): Task[] {
    const subtasks: Task[] = [];

    // Create subtasks based on required capabilities
    for (let i = 0; i < task.requiredCapabilities.length; i++) {
      const capability = task.requiredCapabilities[i];

      const subtask: Task = {
        id: this.generateTaskId(),
        description: `Subtask ${i + 1} for ${task.id}: ${capability}`,
        requiredCapabilities: [capability],
        budget: Math.floor(task.budget / task.requiredCapabilities.length),
        timeout: task.timeout,
        priority: task.priority,
        metadata: {
          ...task.metadata,
          parentCapability: capability,
          subtaskIndex: i
        },
        parentTaskId: task.id,
        status: 'pending'
      };

      subtasks.push(subtask);
    }

    // Recursively decompose if needed
    const finalSubtasks: Task[] = [];
    for (const subtask of subtasks) {
      const decomposed = this.decompose(subtask, depth + 1);
      finalSubtasks.push(...decomposed);
    }

    return finalSubtasks;
  }

  /**
   * Flat decomposition
   */
  private flatDecompose(task: Task, complexity: ComplexityAnalysis): Task[] {
    const subtasks: Task[] = [];

    // Split into roughly equal parts based on capabilities
    const chunkSize = Math.max(1, Math.ceil(task.requiredCapabilities.length / 2));

    for (let i = 0; i < task.requiredCapabilities.length; i += chunkSize) {
      const chunk = task.requiredCapabilities.slice(i, i + chunkSize);

      const subtask: Task = {
        id: this.generateTaskId(),
        description: `Task chunk ${Math.floor(i / chunkSize) + 1} for ${task.id}`,
        requiredCapabilities: chunk,
        budget: Math.floor((task.budget / task.requiredCapabilities.length) * chunk.length),
        timeout: task.timeout,
        priority: task.priority,
        metadata: task.metadata,
        parentTaskId: task.id,
        status: 'pending'
      };

      subtasks.push(subtask);
    }

    return subtasks;
  }

  /**
   * Adaptive decomposition
   */
  private adaptiveDecompose(task: Task, complexity: ComplexityAnalysis, depth: number): Task[] {
    // Analyze task description for natural breakpoints
    const breakpoints = this.findBreakpoints(task.description);

    if (breakpoints.length === 0) {
      // No clear breakpoints, use flat decomposition
      return this.flatDecompose(task, complexity);
    }

    // Create subtasks at breakpoints
    const subtasks: Task[] = [];
    const budgetPerSubtask = Math.floor(task.budget / (breakpoints.length + 1));

    let lastIndex = 0;
    for (let i = 0; i < breakpoints.length; i++) {
      const breakpoint = breakpoints[i];
      const subtaskDescription = task.description.substring(lastIndex, breakpoint).trim();

      const subtask: Task = {
        id: this.generateTaskId(),
        description: subtaskDescription,
        requiredCapabilities: this.assignCapabilities(subtaskDescription, task.requiredCapabilities),
        budget: budgetPerSubtask,
        timeout: Math.floor(task.timeout / (breakpoints.length + 1)),
        priority: task.priority,
        metadata: task.metadata,
        parentTaskId: task.id,
        status: 'pending'
      };

      subtasks.push(subtask);
      lastIndex = breakpoint;
    }

    return subtasks;
  }

  /**
   * Find natural breakpoints in task description
   */
  private findBreakpoints(description: string): number[] {
    const breakpoints: number[] = [];
    const sentences = description.split(/[.!?]+/);

    let offset = 0;
    for (const sentence of sentences) {
      offset += sentence.length + 1;
      if (sentence.trim().length > 20) {
        breakpoints.push(offset);
      }
    }

    return breakpoints;
  }

  /**
   * Assign capabilities to subtask based on description
   */
  private assignCapabilities(description: string, availableCapabilities: string[]): string[] {
    // Simple keyword matching
    const assigned: string[] = [];

    for (const capability of availableCapabilities) {
      const keywords = capability.split(/[-\s]+/);
      const matches = keywords.filter(keyword =>
        description.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matches.length > 0) {
        assigned.push(capability);
      }
    }

    // If no assignments, give all capabilities
    if (assigned.length === 0) {
      return availableCapabilities;
    }

    return assigned;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${this.taskIdCounter++}`;
  }

  /**
   * Reconstruct result from subtask results
   */
  reconstructResults(mainTask: Task, subtaskResults: Array<Task & { result?: unknown }>): unknown {
    switch (this.config.aggregationStrategy) {
      case 'merge':
        return this.mergeResults(subtaskResults);
      case 'vote':
        return this.voteResults(subtaskResults);
      case 'best':
        return this.selectBestResult(subtaskResults);
      case 'custom':
        return this.customAggregation(mainTask, subtaskResults);
      default:
        return this.mergeResults(subtaskResults);
    }
  }

  /**
   * Merge results
   */
  private mergeResults(subtaskResults: Array<Task & { result?: unknown }>): unknown {
    if (subtaskResults.length === 1) {
      return subtaskResults[0].result;
    }

    // Merge results into array
    return {
      type: 'merged',
      parts: subtaskResults.map(r => r.result),
      count: subtaskResults.length
    };
  }

  /**
   * Vote on results
   */
  private voteResults(subtaskResults: Array<Task & { result?: unknown }>): unknown {
    // Count occurrences of results
    const votes = new Map<string, number>();

    for (const result of subtaskResults) {
      const key = JSON.stringify(result.result);
      votes.set(key, (votes.get(key) || 0) + 1);
    }

    // Find most common result
    let maxVotes = 0;
    let winner = subtaskResults[0].result;

    for (const [key, count] of votes) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = JSON.parse(key);
      }
    }

    return winner;
  }

  /**
   * Select best result
   */
  private selectBestResult(subtaskResults: Array<Task & { result?: unknown }>): unknown {
    // Sort by task priority and return first
    const sorted = [...subtaskResults].sort((a, b) => b.priority - a.priority);
    return sorted[0].result;
  }

  /**
   * Custom aggregation (can be overridden)
   */
  private customAggregation(mainTask: Task, subtaskResults: Array<Task & { result?: unknown }>): unknown {
    // Default to merge
    return this.mergeResults(subtaskResults);
  }
}

interface ComplexityAnalysis {
  score: number;
  factors: string[];
}
