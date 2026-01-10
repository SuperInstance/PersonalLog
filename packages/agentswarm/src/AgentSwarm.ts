import { MarketEngine } from './market/MarketEngine.js';
import { Agent } from './agent/Agent.js';
import { TaskDecomposer } from './orchestrator/TaskDecomposer.js';
import type {
  SwarmConfig,
  Task,
  ExecutionSummary,
  Match,
  AgentMetrics,
  MarketStats
} from './types.js';

/**
 * AgentSwarm - Market-based multi-agent coordination system
 *
 * Features:
 * - 10+ agent coordination
 * - Market-based task allocation
 * - Autonomous specialization
 * - Fault tolerance
 * - Emergent behaviors
 */
export class AgentSwarm {
  private market: MarketEngine;
  private agents: Map<string, Agent> = new Map();
  private decomposer: TaskDecomposer;
  private config: SwarmConfig;
  private executionHistory: Map<string, ExecutionSummary> = new Map();

  constructor(config: SwarmConfig) {
    this.config = config;
    this.market = new MarketEngine(config.market);
    this.decomposer = new TaskDecomposer(config);

    // Initialize agents
    for (const agentConfig of config.agents) {
      const agent = new Agent(agentConfig);
      this.agents.set(agent.id, agent);

      // Listen to agent events for analytics
      agent.on('specialization-changed', ({ agentId, specializations }) => {
        console.log(`Agent ${agentId} specialized in: ${specializations.join(', ')}`);
      });
    }

    // Listen to market events
    this.setupMarketListeners();
  }

  /**
   * Execute a task using the swarm
   */
  async execute(taskInput: {
    task: string;
    budget?: number;
    timeout?: number;
    priority?: number;
    capabilities?: string[];
  }): Promise<ExecutionSummary> {
    const startTime = Date.now();

    // Create task
    const task: Task = {
      id: this.generateTaskId(),
      description: taskInput.task,
      requiredCapabilities: taskInput.capabilities || [],
      budget: taskInput.budget || 1000,
      timeout: taskInput.timeout || 60000,
      priority: taskInput.priority || 5,
      status: 'pending'
    };

    // Decompose task
    const subtasks = this.decomposer.decompose(task);

    // If no decomposition, execute as single task
    if (subtasks.length === 1 && subtasks[0].id === task.id) {
      return await this.executeSingleTask(task, startTime);
    }

    // Execute subtasks
    const subtaskSummaries: Array<{
      task: Task;
      agent: string;
      cost: number;
      output: unknown;
      duration: number;
      quality: number;
    }> = [];

    let totalCost = 0;
    let successCount = 0;
    let totalQuality = 0;

    for (const subtask of subtasks) {
      try {
        const result = await this.executeSubtask(subtask);

        subtaskSummaries.push({
          task: subtask,
          agent: result.agentId,
          cost: result.cost,
          output: result.output,
          duration: result.duration,
          quality: result.quality
        });

        totalCost += result.cost;
        if (result.success) successCount++;
        totalQuality += result.quality;
      } catch (error) {
        // Handle fault tolerance
        const handled = await this.handleSubtaskFailure(subtask, error as Error);
        if (handled) {
          subtaskSummaries.push(handled);
          totalCost += handled.cost;
          successCount++;
          totalQuality += handled.quality;
        }
      }
    }

    // Aggregate results
    const finalOutput = this.decomposer.reconstructResults(task, subtaskSummaries as any);

    const duration = Date.now() - startTime;

    const summary: ExecutionSummary = {
      task,
      finalOutput,
      subtasks: subtaskSummaries,
      totalCost,
      savings: task.budget - totalCost,
      totalDuration: duration,
      agentsInvolved: new Set(subtaskSummaries.map(s => s.agent)).size,
      successRate: successCount / subtasks.length,
      avgQuality: totalQuality / subtasks.length
    };

    this.executionHistory.set(task.id, summary);

    return summary;
  }

  /**
   * Execute a single task (no decomposition)
   */
  private async executeSingleTask(task: Task, startTime: number): Promise<ExecutionSummary> {
    // Post task to market
    this.market.postTask(task);

    // Wait for match
    const match = await this.waitForMatch(task.id, task.timeout);
    if (!match) {
      throw new Error(`Task ${task.id} failed to match within timeout`);
    }

    // Execute task
    const result = await this.executeWithAgent(match);

    const duration = Date.now() - startTime;

    return {
      task,
      finalOutput: result.output,
      subtasks: [{
        task,
        agent: result.agentId,
        cost: result.cost,
        output: result.output,
        duration,
        quality: result.quality
      }],
      totalCost: result.cost,
      savings: task.budget - result.cost,
      totalDuration: duration,
      agentsInvolved: 1,
      successRate: result.success ? 1 : 0,
      avgQuality: result.quality
    };
  }

  /**
   * Execute a subtask
   */
  private async executeSubtask(subtask: Task): Promise<{
    agentId: string;
    cost: number;
    output: unknown;
    duration: number;
    quality: number;
    success: boolean;
  }> {
    // Post subtask to market
    this.market.postTask(subtask);

    // Wait for match
    const match = await this.waitForMatch(subtask.id, subtask.timeout);
    if (!match) {
      throw new Error(`Subtask ${subtask.id} failed to match`);
    }

    // Execute with agent
    const result = await this.executeWithAgent(match);

    return {
      ...result,
      duration: Date.now() - Date.now()
    };
  }

  /**
   * Wait for task to be matched
   */
  private async waitForMatch(taskId: string, timeout: number): Promise<Match | null> {
    return new Promise(resolve => {
      const deadline = Date.now() + timeout;
      const checkInterval = 100; // Check every 100ms

      const checkMatch = () => {
        const activeMatches = this.market.getActiveMatches();
        const match = activeMatches.find(m => m.taskId === taskId);

        if (match) {
          resolve(match);
          return;
        }

        if (Date.now() >= deadline) {
          resolve(null);
          return;
        }

        setTimeout(checkMatch, checkInterval);
      };

      checkMatch();
    });
  }

  /**
   * Execute task with matched agent
   */
  private async executeWithAgent(match: Match): Promise<{
    agentId: string;
    cost: number;
    output: unknown;
    quality: number;
    success: boolean;
  }> {
    const agent = this.agents.get(match.agentId);
    if (!agent) {
      throw new Error(`Agent ${match.agentId} not found`);
    }

    const task = this.market.getTask(match.taskId);
    if (!task) {
      throw new Error(`Task ${match.taskId} not found`);
    }

    // Simulate task execution (in real system, this would call agent's execute method)
    const executionResult = await this.simulateExecution(agent, task);

    // Complete the match
    this.market.completeMatch(match.id, executionResult);

    return {
      agentId: agent.id,
      cost: match.bidAmount,
      output: executionResult.output,
      quality: executionResult.quality,
      success: executionResult.success
    };
  }

  /**
   * Simulate task execution (placeholder for real execution)
   */
  private async simulateExecution(agent: Agent, task: Task): Promise<{
    taskId: string;
    agentId: string;
    executionTime: number;
    output: unknown;
    quality: number;
    success: boolean;
  }> {
    // In a real system, this would:
    // 1. Call the agent's execute method with the task
    // 2. Use LLM to generate output
    // 3. Validate and score the result

    // For now, simulate with random but realistic values
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    const executionTime = Date.now() - startTime;

    const success = Math.random() > 0.1; // 90% success rate
    const quality = success ? 0.7 + Math.random() * 0.3 : 0;

    return {
      taskId: task.id,
      agentId: agent.id,
      executionTime,
      output: success ? {
        taskId: task.id,
        agentId: agent.id,
        result: `Simulated execution result for task: ${task.description}`
      } : null,
      quality,
      success
    };
  }

  /**
   * Handle subtask failure with fault tolerance
   */
  private async handleSubtaskFailure(subtask: Task, error: Error): Promise<{
    task: Task;
    agent: string;
    cost: number;
    output: unknown;
    duration: number;
    quality: number;
  } | null> {
    switch (this.config.faultTolerance) {
      case 'retry':
        return await this.retrySubtask(subtask);
      case 'repost':
        return await this.repostSubtask(subtask);
      case 'ignore':
        return null;
      default:
        return null;
    }
  }

  /**
   * Retry failed subtask
   */
  private async retrySubtask(subtask: Task): Promise<{
    task: Task;
    agent: string;
    cost: number;
    output: unknown;
    duration: number;
    quality: number;
  } | null> {
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        const result = await this.executeSubtask(subtask);
        return {
          task: subtask,
          agent: result.agentId,
          cost: result.cost,
          output: result.output,
          duration: 0,
          quality: result.quality
        };
      } catch {
        // Continue retrying
      }
    }
    return null;
  }

  /**
   * Repost failed subtask to market
   */
  private async repostSubtask(subtask: Task): Promise<{
    task: Task;
    agent: string;
    cost: number;
    output: unknown;
    duration: number;
    quality: number;
  } | null> {
    // Create new subtask with higher budget
    const repostedTask: Task = {
      ...subtask,
      id: this.generateTaskId(),
      budget: subtask.budget * 1.2
    };

    try {
      const result = await this.executeSubtask(repostedTask);
      return {
        task: subtask,
        agent: result.agentId,
        cost: result.cost,
        output: result.output,
        duration: 0,
        quality: result.quality
      };
    } catch {
      return null;
    }
  }

  /**
   * Setup market event listeners
   */
  private setupMarketListeners(): void {
    this.market.on('task-posted', ({ taskId, budget }) => {
      // Collect bids from agents
      this.collectBids(taskId);
    });

    this.market.on('bid-matched', ({ matchId, taskId, agentId, amount }) => {
      console.log(`Matched: ${taskId} -> ${agentId} for ${amount} tokens`);
    });

    this.market.on('task-completed', ({ taskId, agentId, quality }) => {
      console.log(`Completed: ${taskId} by ${agentId} (quality: ${quality.toFixed(2)})`);
    });

    this.market.on('task-failed', ({ taskId, agentId, error }) => {
      console.error(`Failed: ${taskId} by ${agentId} - ${error}`);
    });
  }

  /**
   * Collect bids from agents for a task
   */
  private collectBids(taskId: string): void {
    const task = this.market.getTask(taskId);
    if (!task) return;

    for (const agent of this.agents.values()) {
      if (!agent.hasCapacity()) continue;

      const bid = agent.evaluateTask(task);
      if (bid) {
        this.market.placeBid(bid);
      }
    }
  }

  /**
   * Get agent metrics
   */
  getAgentMetrics(agentId: string): AgentMetrics | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    return agent.getMetrics();
  }

  /**
   * Get all agent metrics
   */
  getAllAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agents.values()).map(agent => agent.getMetrics());
  }

  /**
   * Get market statistics
   */
  getMarketStats(): MarketStats {
    return this.market.getStats();
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionSummary[] {
    return Array.from(this.executionHistory.values());
  }

  /**
   * Get swarm statistics
   */
  getSwarmStats(): {
    totalAgents: number;
    activeAgents: number;
    totalExecutions: number;
    avgSuccessRate: number;
    avgQuality: number;
    totalCost: number;
    totalSavings: number;
  } {
    const executions = this.getExecutionHistory();
    const agentMetrics = this.getAllAgentMetrics();

    return {
      totalAgents: this.agents.size,
      activeAgents: agentMetrics.filter(a => a.activeTasks > 0).length,
      totalExecutions: executions.length,
      avgSuccessRate: executions.reduce((sum, e) => sum + e.successRate, 0) / (executions.length || 1),
      avgQuality: executions.reduce((sum, e) => sum + e.avgQuality, 0) / (executions.length || 1),
      totalCost: executions.reduce((sum, e) => sum + e.totalCost, 0),
      totalSavings: executions.reduce((sum, e) => sum + e.savings, 0)
    };
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown the swarm
   */
  shutdown(): void {
    this.market.shutdown();
    this.agents.clear();
    this.executionHistory.clear();
  }
}
