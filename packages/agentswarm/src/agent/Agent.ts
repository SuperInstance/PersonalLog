import EventEmitter from 'eventemitter3';
import type {
  AgentConfig,
  AgentCapabilities,
  AgentReputation,
  Bid,
  Task,
  TaskResult,
  AgentEvent,
  AgentMetrics
} from '../types.js';

/**
 * Agent - Autonomous market participant with intelligence
 *
 * Features:
 * - Capability-based task evaluation
 * - Smart bid pricing strategy
 * - Specialization learning
 * - Reputation tracking
 * - Profit/loss optimization
 */
export class Agent extends EventEmitter<{
  [K in AgentEvent['type']]: AgentEvent;
}> {
  public readonly id: string;
  public readonly name: string;
  private capabilities: Map<string, AgentCapabilities>;
  private reputation: AgentReputation;
  private config: Omit<AgentConfig, 'id' | 'name' | 'capabilities'>;
  private activeTasks: Set<string> = new Set();
  private earnings: number = 0;
  private totalBids: number = 0;
  private winningBids: number = 0;
  private recentPerformance: number[] = [];
  private maxPerformanceHistory: number = 50;

  constructor(config: AgentConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.capabilities = new Map(
      config.capabilities.map(c => [c.name, { ...c }])
    );
    this.config = {
      minBid: config.minBid,
      maxTasks: config.maxTasks,
      riskTolerance: config.riskTolerance,
      learningRate: config.learningRate,
      metadata: config.metadata
    };

    this.reputation = this.initializeReputation();
  }

  private initializeReputation(): AgentReputation {
    return {
      score: 0.5,
      tasksCompleted: 0,
      tasksAttempted: 0,
      successRate: 1.0,
      avgQuality: 0.5,
      onTimeRate: 1.0,
      totalEarnings: 0,
      trend: 'stable'
    };
  }

  /**
   * Evaluate task and generate bid if suitable
   */
  evaluateTask(task: Task): Bid | null {
    // Check if agent has capacity
    if (this.activeTasks.size >= this.config.maxTasks) {
      return null;
    }

    // Check capability match
    const capabilityScore = this.calculateCapabilityScore(task);
    if (capabilityScore === 0) {
      return null; // No matching capabilities
    }

    // Calculate bid amount
    const bidAmount = this.calculateBidAmount(task, capabilityScore);

    // Validate bid against budget
    if (bidAmount > task.budget) {
      return null;
    }

    // Calculate confidence
    const confidence = this.calculateConfidence(task, capabilityScore);

    // Estimate duration
    const estimatedDuration = this.estimateDuration(task);

    this.totalBids++;

    return {
      id: `bid-${this.id}-${task.id}-${Date.now()}`,
      agentId: this.id,
      taskId: task.id,
      amount: bidAmount,
      estimatedDuration,
      confidence,
      timestamp: Date.now(),
      status: 'pending'
    };
  }

  /**
   * Calculate capability match score
   */
  private calculateCapabilityScore(task: Task): number {
    if (task.requiredCapabilities.length === 0) {
      return 0.5; // Neutral for tasks with no requirements
    }

    let totalScore = 0;
    let matchedCount = 0;

    for (const reqCap of task.requiredCapabilities) {
      const agentCap = this.capabilities.get(reqCap);
      if (agentCap) {
        totalScore += agentCap.proficiency;
        matchedCount++;
      }
    }

    if (matchedCount === 0) {
      return 0; // No matching capabilities
    }

    // Average proficiency of matched capabilities
    return totalScore / matchedCount;
  }

  /**
   * Calculate optimal bid amount
   */
  private calculateBidAmount(task: Task, capabilityScore: number): number {
    // Base bid from minimum
    let bid = this.config.minBid;

    // Capability premium (higher proficiency = higher bid)
    const capabilityPremium = capabilityScore * task.budget * 0.3;
    bid += capabilityPremium;

    // Risk adjustment (higher risk tolerance = higher bids)
    const riskAdjustment = this.config.riskTolerance * task.budget * 0.2;
    bid += riskAdjustment;

    // Reputation premium (higher reputation = higher bid)
    const reputationPremium = this.reputation.score * task.budget * 0.2;
    bid += reputationPremium;

    // Task priority premium
    const priorityPremium = (task.priority / 10) * task.budget * 0.1;
    bid += priorityPremium;

    // Market competition (if task has many bids, lower prices)
    // This would be updated with market data in a real system

    return Math.floor(bid);
  }

  /**
   * Calculate confidence in completing task successfully
   */
  private calculateConfidence(task: Task, capabilityScore: number): number {
    let confidence = capabilityScore * 0.5; // Base from capability

    // Reputation boosts confidence
    confidence += this.reputation.score * 0.3;

    // Success rate contributes
    confidence += this.reputation.successRate * 0.1;

    // Recent performance trend
    const recentAvg = this.getRecentPerformanceAverage();
    if (recentAvg !== null) {
      confidence += recentAvg * 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Estimate task completion time
   */
  private estimateDuration(task: Task): number {
    let totalAvgTime = 0;
    let count = 0;

    for (const reqCap of task.requiredCapabilities) {
      const cap = this.capabilities.get(reqCap);
      if (cap) {
        totalAvgTime += cap.avgExecutionTime;
        count++;
      }
    }

    if (count === 0) {
      return task.timeout * 0.5; // Default to half timeout
    }

    // Add buffer for uncertainty
    return Math.floor(totalAvgTime * 1.2);
  }

  /**
   * Accept a bid and start task execution
   */
  async acceptBid(bid: Bid, executeFn: (task: Task) => Promise<TaskResult>): Promise<TaskResult> {
    this.activeTasks.add(bid.taskId);
    this.reputation.tasksAttempted++;

    try {
      const result = await executeFn(this.getTask(bid.taskId));

      // Update capabilities and reputation based on result
      this.updateFromResult(bid, result);

      return result;
    } finally {
      this.activeTasks.delete(bid.taskId);
    }
  }

  /**
   * Update agent state based on task result
   */
  private updateFromResult(bid: Bid, result: TaskResult): void {
    if (result.success) {
      this.winningBids++;
      this.reputation.tasksCompleted++;
      this.earnings += bid.amount;
      this.reputation.totalEarnings += bid.amount;

      // Update success rate
      this.reputation.successRate =
        this.reputation.tasksCompleted / this.reputation.tasksAttempted;

      // Update average quality
      const totalQuality =
        this.reputation.avgQuality * (this.reputation.tasksCompleted - 1) + result.quality;
      this.reputation.avgQuality = totalQuality / this.reputation.tasksCompleted;

      // Update on-time rate
      const onTime = result.executionTime <= bid.estimatedDuration;
      const completedOnTime =
        this.reputation.onTimeRate * (this.reputation.tasksCompleted - 1) + (onTime ? 1 : 0);
      this.reputation.onTimeRate = completedOnTime / this.reputation.tasksCompleted;

      // Update capabilities
      for (const cap of bid.taskId ? this.getTask(bid.taskId).requiredCapabilities : []) {
        this.updateCapability(cap, result);
      }

      // Track recent performance
      this.recentPerformance.push(result.quality);
      if (this.recentPerformance.length > this.maxPerformanceHistory) {
        this.recentPerformance.shift();
      }

      // Update reputation score
      this.updateReputationScore();

      // Detect specialization
      this.detectSpecialization();
    } else {
      // Penalty for failure
      this.reputation.score *= 0.9;
    }
  }

  /**
   * Update capability based on task performance
   */
  private updateCapability(capabilityName: string, result: TaskResult): void {
    const capability = this.capabilities.get(capabilityName);
    if (!capability) {
      // Add new capability
      this.capabilities.set(capabilityName, {
        name: capabilityName,
        proficiency: Math.min(1, result.quality * 0.5), // Start lower, build up
        usageCount: 1,
        successRate: result.success ? 1 : 0,
        avgExecutionTime: result.executionTime
      });
      this.emit('capability-updated', {
        type: 'capability-updated',
        agentId: this.id,
        capability: capabilityName,
        proficiency: result.quality * 0.5
      });
      return;
    }

    // Update usage count
    capability.usageCount++;

    // Update proficiency (learning rate applied)
    const targetProficiency = result.quality;
    const proficiencyDelta =
      (targetProficiency - capability.proficiency) * this.config.learningRate;
    capability.proficiency = Math.min(1, Math.max(0, capability.proficiency + proficiencyDelta));

    // Update success rate
    const successContribution = result.success ? 1 : 0;
    capability.successRate =
      (capability.successRate * (capability.usageCount - 1) + successContribution) /
      capability.usageCount;

    // Update average execution time
    capability.avgExecutionTime =
      (capability.avgExecutionTime * (capability.usageCount - 1) + result.executionTime) /
      capability.usageCount;

    this.emit('capability-updated', {
      type: 'capability-updated',
      agentId: this.id,
      capability: capabilityName,
      proficiency: capability.proficiency
    });
  }

  /**
   * Update overall reputation score
   */
  private updateReputationScore(): void {
    const successWeight = 0.3;
    const qualityWeight = 0.3;
    const onTimeWeight = 0.2;
    const volumeWeight = 0.1; // More tasks = slightly better
    const trendWeight = 0.1;

    let trendScore = 0.5;
    if (this.recentPerformance.length >= 5) {
      const recent = this.recentPerformance.slice(-5);
      const older = this.recentPerformance.slice(-10, -5);
      if (older.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        trendScore = recentAvg > olderAvg ? 0.7 : recentAvg < olderAvg ? 0.3 : 0.5;
      }
    }

    const volumeBonus = Math.min(1, this.reputation.tasksCompleted / 100);

    this.reputation.score =
      (this.reputation.successRate * successWeight) +
      (this.reputation.avgQuality * qualityWeight) +
      (this.reputation.onTimeRate * onTimeWeight) +
      (volumeBonus * volumeWeight) +
      (trendScore * trendWeight);

    // Update trend
    if (this.recentPerformance.length >= 10) {
      const firstHalf = this.recentPerformance.slice(0, Math.floor(this.recentPerformance.length / 2));
      const secondHalf = this.recentPerformance.slice(Math.floor(this.recentPerformance.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      this.reputation.trend =
        secondAvg > firstAvg + 0.1 ? 'improving' :
        secondAvg < firstAvg - 0.1 ? 'declining' : 'stable';
    }

    this.emit('reputation-updated', {
      type: 'reputation-updated',
      agentId: this.id,
      reputation: { ...this.reputation }
    });
  }

  /**
   * Detect agent specialization patterns
   */
  private detectSpecialization(): void {
    // Find top capabilities by usage and proficiency
    const capabilities = Array.from(this.capabilities.values());
    const avgUsage = capabilities.reduce((sum, c) => sum + c.usageCount, 0) / capabilities.length;
    const avgProficiency = capabilities.reduce((sum, c) => sum + c.proficiency, 0) / capabilities.length;

    const specializations = capabilities.filter(
      c => c.usageCount > avgUsage * 1.5 && c.proficiency > avgProficiency * 1.2
    ).map(c => c.name);

    if (specializations.length > 0) {
      this.emit('specialization-changed', {
        type: 'specialization-changed',
        agentId: this.id,
        specializations
      });
    }
  }

  /**
   * Get recent performance average
   */
  private getRecentPerformanceAverage(): number | null {
    if (this.recentPerformance.length === 0) {
      return null;
    }
    return this.recentPerformance.reduce((a, b) => a + b, 0) / this.recentPerformance.length;
  }

  /**
   * Get task (helper method - would be injected in real system)
   */
  private getTask(taskId: string): Task {
    // This is a placeholder - in real system, task would be passed in
    return {} as Task;
  }

  /**
   * Get agent metrics
   */
  getMetrics(): AgentMetrics {
    const capabilities = Array.from(this.capabilities.values());
    const topCapabilities = capabilities
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 5)
      .map(c => c.name);

    // Calculate specialization score (Herfindahl index)
    const totalUsage = capabilities.reduce((sum, c) => sum + c.usageCount, 0);
    let specializationScore = 0;
    if (totalUsage > 0) {
      for (const cap of capabilities) {
        const share = cap.usageCount / totalUsage;
        specializationScore += share * share;
      }
    }

    return {
      agentId: this.id,
      reputation: { ...this.reputation },
      activeTasks: this.activeTasks.size,
      earnings: this.earnings,
      avgBid: this.totalBids > 0 ? this.earnings / this.totalBids : 0,
      winRate: this.totalBids > 0 ? this.winningBids / this.totalBids : 0,
      specializationScore,
      topCapabilities
    };
  }

  /**
   * Get capabilities
   */
  getCapabilities(): AgentCapabilities[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get reputation
   */
  getReputation(): AgentReputation {
    return { ...this.reputation };
  }

  /**
   * Check if agent can accept more tasks
   */
  hasCapacity(): boolean {
    return this.activeTasks.size < this.config.maxTasks;
  }

  /**
   * Get number of active tasks
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }
}
