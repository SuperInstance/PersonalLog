import EventEmitter from 'eventemitter3';
import type {
  Task,
  Bid,
  Match,
  MarketConfig,
  MarketStats,
  MarketEvent,
  TaskResult
} from '../types.js';

/**
 * Market Engine - Double auction market for task-agent matching
 *
 * Features:
 * - Real-time bid matching (60 FPS capable)
 * - Price discovery through competition
 * - Reputation-weighted matching
 * - Transaction fee handling
 * - Market statistics tracking
 */
export class MarketEngine extends EventEmitter<{
  [K in MarketEvent['type']]: MarketEvent;
}> {
  private config: MarketConfig;
  private tasks: Map<string, Task> = new Map();
  private bids: Map<string, Bid> = new Map();
  private matches: Map<string, Match> = new Map();
  private agentReputations: Map<string, number> = new Map();
  private stats: MarketStats;
  private clearingInterval: NodeJS.Timeout | null = null;

  constructor(config: MarketConfig) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
    this.startClearing();
  }

  private initializeStats(): MarketStats {
    return {
      totalTasks: 0,
      totalBids: 0,
      totalMatches: 0,
      pendingTasks: 0,
      activeMatches: 0,
      avgBidAmount: 0,
      avgMatchTime: 0,
      clearingPrice: 0,
      efficiency: 1
    };
  }

  /**
   * Post a task to the market
   */
  postTask(task: Task): void {
    task.status = 'posted';
    this.tasks.set(task.id, task);
    this.stats.totalTasks++;
    this.stats.pendingTasks++;

    this.emit('task-posted', { type: 'task-posted', taskId: task.id, budget: task.budget });

    // Try immediate match for continuous markets
    if (this.config.type === 'continuous' || this.config.type === 'double-auction') {
      this.tryMatch(task.id);
    }
  }

  /**
   * Place a bid on a task
   */
  placeBid(bid: Bid): boolean {
    const task = this.tasks.get(bid.taskId);
    if (!task || task.status !== 'posted') {
      return false;
    }

    // Validate bid
    if (bid.amount > task.budget) {
      return false; // Bid over budget
    }

    if (bid.amount < 0) {
      return false; // Invalid bid
    }

    bid.status = 'pending';
    bid.timestamp = Date.now();
    this.bids.set(bid.id, bid);
    this.stats.totalBids++;
    this.updateAvgBidAmount();

    this.emit('bid-placed', {
      type: 'bid-placed',
      bidId: bid.id,
      agentId: bid.agentId,
      amount: bid.amount
    });

    // Try immediate match
    this.tryMatch(task.id);

    return true;
  }

  /**
   * Try to match bids with tasks
   */
  private tryMatch(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'posted') {
      return;
    }

    // Get all pending bids for this task
    const taskBids = Array.from(this.bids.values()).filter(
      b => b.taskId === taskId && b.status === 'pending'
    );

    if (taskBids.length === 0) {
      return;
    }

    // Score bids based on amount, confidence, and reputation
    const scoredBids = taskBids.map(bid => {
      const reputation = this.agentReputations.get(bid.agentId) || 0.5;
      const amountScore = 1 - (bid.amount / task.budget); // Lower is better
      const confidenceScore = bid.confidence;
      const reputationScore = this.config.reputationSystem ? reputation : 0.5;

      // Weighted combination
      const score =
        (amountScore * 0.4) +
        (confidenceScore * 0.3) +
        (reputationScore * this.config.reputationWeight * 0.3);

      return { bid, score };
    });

    // Sort by score (highest first)
    scoredBids.sort((a, b) => b.score - a.score);

    // Select best bid
    const best = scoredBids[0];
    if (!best) return;

    // Create match
    this.createMatch(task, best.bid);
  }

  /**
   * Create a match between task and bid
   */
  private createMatch(task: Task, bid: Bid): void {
    const match: Match = {
      id: `match-${task.id}-${bid.id}`,
      taskId: task.id,
      agentId: bid.agentId,
      bidAmount: bid.amount,
      matchedAt: Date.now(),
      status: 'active'
    };

    this.matches.set(match.id, match);
    this.stats.totalMatches++;
    this.stats.activeMatches++;
    this.stats.pendingTasks--;

    // Update task and bid status
    task.status = 'matched';
    bid.status = 'accepted';

    // Reject other bids for this task
    this.rejectOtherBids(task.id, bid.id);

    // Update clearing price (last accepted bid)
    this.stats.clearingPrice = bid.amount;

    this.emit('bid-matched', {
      type: 'bid-matched',
      matchId: match.id,
      taskId: task.id,
      agentId: bid.agentId,
      amount: bid.amount
    });
  }

  /**
   * Reject all other pending bids for a task
   */
  private rejectOtherBids(taskId: string, acceptedBidId: string): void {
    const otherBids = Array.from(this.bids.values()).filter(
      b => b.taskId === taskId && b.status === 'pending' && b.id !== acceptedBidId
    );

    for (const bid of otherBids) {
      bid.status = 'rejected';
    }
  }

  /**
   * Complete a match with results
   */
  completeMatch(matchId: string, result: TaskResult): void {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.status = result.success ? 'completed' : 'failed';
    match.result = result;
    this.stats.activeMatches--;

    const task = this.tasks.get(match.taskId);
    if (task) {
      task.status = result.success ? 'completed' : 'failed';
    }

    // Update agent reputation
    if (this.config.reputationSystem) {
      this.updateReputation(match.agentId, result);
    }

    if (result.success) {
      this.emit('task-completed', {
        type: 'task-completed',
        taskId: match.taskId,
        agentId: match.agentId,
        quality: result.quality
      });
    } else {
      this.emit('task-failed', {
        type: 'task-failed',
        taskId: match.taskId,
        agentId: match.agentId,
        error: result.error || 'Unknown error'
      });
    }
  }

  /**
   * Update agent reputation based on performance
   */
  private updateReputation(agentId: string, result: TaskResult): void {
    const currentRep = this.agentReputations.get(agentId) || 0.5;

    // Calculate reputation adjustment
    let adjustment = 0;

    // Success/failure impact
    if (result.success) {
      adjustment += 0.05 * result.quality; // Up to +0.05
    } else {
      adjustment -= 0.1; // -0.1 for failures
    }

    // Quality impact
    adjustment += (result.quality - 0.5) * 0.02; // -0.01 to +0.01

    // Update reputation with bounds [0, 1]
    const newRep = Math.max(0, Math.min(1, currentRep + adjustment));
    this.agentReputations.set(agentId, newRep);
  }

  /**
   * Start periodic market clearing (for call markets)
   */
  private startClearing(): void {
    if (this.config.type === 'call-market' && this.config.clearingInterval) {
      this.clearingInterval = setInterval(() => {
        this.clearMarket();
      }, this.config.clearingInterval);
    }
  }

  /**
   * Clear the market (match all pending tasks)
   */
  private clearMarket(): void {
    const pendingTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'posted'
    );

    for (const task of pendingTasks) {
      this.tryMatch(task.id);
    }

    // Update market efficiency
    this.updateMarketEfficiency();

    this.emit('market-cleared', { type: 'market-cleared', stats: this.getStats() });
  }

  /**
   * Update market efficiency metric
   */
  private updateMarketEfficiency(): void {
    const completedTasks = Array.from(this.tasks.values()).filter(
      t => t.status === 'completed'
    ).length;

    const totalTasks = this.tasks.size;
    if (totalTasks === 0) {
      this.stats.efficiency = 1;
      return;
    }

    this.stats.efficiency = completedTasks / totalTasks;
  }

  /**
   * Update average bid amount
   */
  private updateAvgBidAmount(): void {
    const bids = Array.from(this.bids.values());
    if (bids.length === 0) {
      this.stats.avgBidAmount = 0;
      return;
    }

    const total = bids.reduce((sum, bid) => sum + bid.amount, 0);
    this.stats.avgBidAmount = total / bids.length;
  }

  /**
   * Get agent reputation
   */
  getAgentReputation(agentId: string): number {
    return this.agentReputations.get(agentId) || 0.5;
  }

  /**
   * Get market statistics
   */
  getStats(): MarketStats {
    return { ...this.stats };
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'posted');
  }

  /**
   * Get all active matches
   */
  getActiveMatches(): Match[] {
    return Array.from(this.matches.values()).filter(m => m.status === 'active');
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'posted') {
      return false;
    }

    task.status = 'failed';
    this.stats.pendingTasks--;

    // Reject all pending bids
    this.rejectOtherBids(taskId, '');

    return true;
  }

  /**
   * Withdraw a bid
   */
  withdrawBid(bidId: string): boolean {
    const bid = this.bids.get(bidId);
    if (!bid || bid.status !== 'pending') {
      return false;
    }

    bid.status = 'withdrawn';
    return true;
  }

  /**
   * Clean up completed tasks and matches
   */
  cleanup(olderThan: number = 3600000): void {
    const cutoff = Date.now() - olderThan;

    // Clean up old completed tasks
    for (const [id, task] of this.tasks) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        this.matches.get(`match-${id}`)?.matchedAt &&
        this.matches.get(`match-${id}`)!.matchedAt! < cutoff
      ) {
        this.tasks.delete(id);
      }
    }

    // Clean up old completed matches
    for (const [id, match] of this.matches) {
      if (
        (match.status === 'completed' || match.status === 'failed') &&
        match.matchedAt < cutoff
      ) {
        this.matches.delete(id);
      }
    }
  }

  /**
   * Shutdown the market engine
   */
  shutdown(): void {
    if (this.clearingInterval) {
      clearInterval(this.clearingInterval);
      this.clearingInterval = null;
    }
    this.removeAllListeners();
  }

  /**
   * Reset the market (clear all data)
   */
  reset(): void {
    this.tasks.clear();
    this.bids.clear();
    this.matches.clear();
    this.agentReputations.clear();
    this.stats = this.initializeStats();
  }
}
