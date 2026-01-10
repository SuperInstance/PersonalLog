/**
 * Core type definitions for AgentSwarm market-based coordination system
 */

/**
 * Task that needs to be executed by agents
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Task description or prompt */
  description: string;
  /** Required capabilities to execute this task */
  requiredCapabilities: string[];
  /** Maximum budget for this task (tokens) */
  budget: number;
  /** Task timeout in milliseconds */
  timeout: number;
  /** Task priority (higher = more important) */
  priority: number;
  /** Task metadata */
  metadata?: Record<string, unknown>;
  /** Subtasks if decomposed */
  subtasks?: Task[];
  /** Parent task ID if this is a subtask */
  parentTaskId?: string;
  /** Current status */
  status: 'pending' | 'posted' | 'matched' | 'in-progress' | 'completed' | 'failed';
}

/**
 * Bid placed by an agent for a task
 */
export interface Bid {
  /** Unique bid identifier */
  id: string;
  /** Agent placing the bid */
  agentId: string;
  /** Task being bid on */
  taskId: string;
  /** Bid amount (tokens) */
  amount: number;
  /** Estimated completion time (ms) */
  estimatedDuration: number;
  /** Confidence in bid (0-1) */
  confidence: number;
  /** When bid was placed */
  timestamp: number;
  /** Bid status */
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';
}

/**
 * Match between a task and a bid
 */
export interface Match {
  /** Unique match identifier */
  id: string;
  /** Task being executed */
  taskId: string;
  /** Agent executing the task */
  agentId: string;
  /** Accepted bid amount */
  bidAmount: number;
  /** When match was created */
  matchedAt: number;
  /** Match status */
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  /** Task result if completed */
  result?: TaskResult;
}

/**
 * Result of task execution
 */
export interface TaskResult {
  /** Task identifier */
  taskId: string;
  /** Agent who executed */
  agentId: string;
  /** Execution output */
  output: unknown;
  /** Actual execution time (ms) */
  executionTime: number;
  /** Quality score (0-1) */
  quality: number;
  /** Whether task was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Agent capabilities and metadata
 */
export interface AgentCapabilities {
  /** Capability name */
  name: string;
  /** Proficiency level (0-1) */
  proficiency: number;
  /** Number of times used */
  usageCount: number;
  /** Average success rate */
  successRate: number;
  /** Average execution time (ms) */
  avgExecutionTime: number;
}

/**
 * Agent reputation metrics
 */
export interface AgentReputation {
  /** Overall reputation score (0-1) */
  score: number;
  /** Total tasks completed */
  tasksCompleted: number;
  /** Total tasks attempted */
  tasksAttempted: number;
  /** Success rate (completed/attempted) */
  successRate: number;
  /** Average quality score across all tasks */
  avgQuality: number;
  /** On-time completion rate */
  onTimeRate: number;
  /** Total earnings (tokens) */
  totalEarnings: number;
  /** Recent performance trend */
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Unique agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Agent capabilities */
  capabilities: AgentCapabilities[];
  /** Minimum bid amount */
  minBid: number;
  /** Maximum concurrent tasks */
  maxTasks: number;
  /** Risk tolerance (0-1, higher = more aggressive bidding) */
  riskTolerance: number;
  /** Learning rate for adaptation (0-1) */
  learningRate: number;
  /** Agent metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Market configuration
 */
export interface MarketConfig {
  /** Market type */
  type: 'double-auction' | 'continuous' | 'call-market';
  /** Clearing frequency for call market (ms) */
  clearingInterval?: number;
  /** Transaction fee (0-1) */
  transactionFee: number;
  /** Enable reputation system */
  reputationSystem: boolean;
  /** Reputation weight in bid scoring (0-1) */
  reputationWeight: number;
  /** Minimum reputation to participate */
  minReputation: number;
}

/**
 * Swarm configuration
 */
export interface SwarmConfig {
  /** Agents in the swarm */
  agents: AgentConfig[];
  /** Market configuration */
  market: MarketConfig;
  /** Task decomposition strategy */
  decompositionStrategy: 'hierarchical' | 'flat' | 'adaptive';
  /** Maximum decomposition depth */
  maxDecompositionDepth: number;
  /** Result aggregation strategy */
  aggregationStrategy: 'merge' | 'vote' | 'best' | 'custom';
  /** Fault tolerance strategy */
  faultTolerance: 'retry' | 'repost' | 'ignore';
  /** Maximum retries for failed tasks */
  maxRetries: number;
  /** Load balancing strategy */
  loadBalancing: 'market-based' | 'round-robin' | 'least-loaded';
}

/**
 * Market statistics
 */
export interface MarketStats {
  /** Total tasks posted */
  totalTasks: number;
  /** Total bids placed */
  totalBids: number;
  /** Total matches made */
  totalMatches: number;
  /** Current pending tasks */
  pendingTasks: number;
  /** Current active matches */
  activeMatches: number;
  /** Average bid amount */
  avgBidAmount: number;
  /** Average match time (ms) */
  avgMatchTime: number;
  /** Market clearing price */
  clearingPrice: number;
  /** Market efficiency (0-1) */
  efficiency: number;
}

/**
 * Agent performance metrics
 */
export interface AgentMetrics {
  /** Agent ID */
  agentId: string;
  /** Current reputation */
  reputation: AgentReputation;
  /** Current active tasks */
  activeTasks: number;
  /** Total earnings */
  earnings: number;
  /** Average bid amount */
  avgBid: number;
  /** Win rate (bids accepted/bids placed) */
  winRate: number;
  /** Specialization score (0-1, how focused they are) */
  specializationScore: number;
  /** Top capabilities */
  topCapabilities: string[];
}

/**
 * Task execution summary
 */
export interface ExecutionSummary {
  /** Original task */
  task: Task;
  /** Final output */
  finalOutput: unknown;
  /** Subtask execution details */
  subtasks: Array<{
    task: Task;
    agent: string;
    cost: number;
    output: unknown;
    duration: number;
    quality: number;
  }>;
  /** Total cost */
  totalCost: number;
  /** Budget savings */
  savings: number;
  /** Total execution time */
  totalDuration: number;
  /** Number of agents involved */
  agentsInvolved: number;
  /** Success rate */
  successRate: number;
  /** Average quality */
  avgQuality: number;
}

/**
 * Market event types
 */
export type MarketEvent =
  | { type: 'task-posted'; taskId: string; budget: number }
  | { type: 'bid-placed'; bidId: string; agentId: string; amount: number }
  | { type: 'bid-matched'; matchId: string; taskId: string; agentId: string; amount: number }
  | { type: 'task-completed'; taskId: string; agentId: string; quality: number }
  | { type: 'task-failed'; taskId: string; agentId: string; error: string }
  | { type: 'market-cleared'; stats: MarketStats };

/**
 * Agent event types
 */
export type AgentEvent =
  | { type: 'capability-updated'; agentId: string; capability: string; proficiency: number }
  | { type: 'reputation-updated'; agentId: string; reputation: AgentReputation }
  | { type: 'specialization-changed'; agentId: string; specializations: string[] }
  | { type: 'strategy-updated'; agentId: string; strategy: string };
