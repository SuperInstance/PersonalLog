/**
 * ThoughtChain - Parallel Reasoning Verification System
 *
 * Core type definitions for reasoning decomposition, parallel verification,
 * confidence scoring, and backtracking.
 */

/**
 * A single reasoning step in the thought chain
 */
export interface ReasoningStep {
  /** Step number in the chain */
  step: number;

  /** The thought/reasoning for this step */
  thought: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Individual verifier votes */
  verifierVotes: number[];

  /** Optional sub-question that prompted this step */
  subQuestion?: string;

  /** Dependencies on previous steps */
  dependencies?: number[];

  /** Any alternative reasoning paths considered */
  alternatives?: ReasoningAlternative[];

  /** Token usage for this step */
  tokens?: {
    input: number;
    output: number;
    total: number;
  };

  /** Timing information */
  timing?: {
    started: number;
    completed: number;
    duration: number;
  };
}

/**
 * Alternative reasoning path for a step
 */
export interface ReasoningAlternative {
  /** Alternative thought */
  thought: string;

  /** Confidence score */
  confidence: number;

  /** Why this alternative was considered */
  reason: string;

  /** Verifier votes */
  verifierVotes: number[];
}

/**
 * Backtracking event when a step is retried
 */
export interface BacktrackingEvent {
  /** Step number that was backtracked */
  step: number;

  /** Original confidence that triggered backtrack */
  originalConfidence: number;

  /** Retry attempt number */
  attempt: number;

  /** New reasoning thought */
  newThought: string;

  /** New confidence score */
  newConfidence: number;

  /** Why backtracking occurred */
  reason: string;

  /** Strategy used for retry */
  strategy: 'more-verbatim' | 'different-path' | 'decompose-further' | 'increase-verifiers';
}

/**
 * Verification result from a single model
 */
export interface VerificationResult {
  /** Model identifier */
  modelId: string;

  /** The reasoning/output from this model */
  reasoning: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Time taken for verification */
  duration: number;

  /** Any errors that occurred */
  error?: string;

  /** Token usage */
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Configuration for ThoughtChain reasoning
 */
export interface ThoughtChainConfig {
  /** Target number of reasoning steps (default: 5) */
  steps?: number;

  /** Number of verifier models to run in parallel (default: 3) */
  verifiers?: number;

  /** Confidence threshold (0-1, default: 0.90) */
  confidenceThreshold?: number;

  /** Enable automatic backtracking on low confidence (default: true) */
  backtrackOnLowConfidence?: boolean;

  /** Maximum backtracking attempts per step (default: 3) */
  maxBacktrackAttempts?: number;

  /** Generate detailed explanations (default: true) */
  explainReasoning?: boolean;

  /** Timeout per step in milliseconds (default: 30000) */
  timeout?: number;

  /** Whether to show intermediate results (default: false) */
  showIntermediateResults?: boolean;

  /** Strategy for aggregating verifier results (default: 'mean') */
  aggregationStrategy?: 'mean' | 'median' | 'weighted' | 'voting' | 'confidence-weighted';

  /** Callback for progress updates */
  onProgress?: (progress: ReasoningProgress) => void;

  /** Callback for each completed step */
  onStepComplete?: (step: ReasoningStep) => void;

  /** Callback for backtracking events */
  onBacktrack?: (event: BacktrackingEvent) => void;
}

/**
 * Progress update during reasoning
 */
export interface ReasoningProgress {
  /** Current step number */
  currentStep: number;

  /** Total steps */
  totalSteps: number;

  /** Percentage complete */
  percentage: number;

  /** Current status */
  status: 'decomposing' | 'verifying' | 'aggregating' | 'backtracking' | 'complete';

  /** Current step description */
  currentStepDescription?: string;
}

/**
 * Final reasoning result
 */
export interface ReasoningResult {
  /** Final answer/conclusion */
  answer: string;

  /** Complete reasoning chain */
  reasoning: ReasoningStep[];

  /** Overall confidence score */
  overallConfidence: number;

  /** Any backtracking events that occurred */
  backtrackingEvents: BacktrackingEvent[];

  /** Explanation of the reasoning process */
  explanation: string;

  /** Total time taken */
  duration: number;

  /** Total token usage */
  tokens: {
    input: number;
    output: number;
    total: number;
  };

  /** Number of steps completed */
  stepsCompleted: number;

  /** Number of steps backtracked */
  stepsBacktracked: number;

  /** Success status */
  success: boolean;

  /** Any errors that occurred */
  errors?: string[];
}

/**
 * Query decomposition result
 */
export interface QueryDecomposition {
  /** Original query */
  originalQuery: string;

  /** Decomposed steps/sub-questions */
  steps: {
    /** Step number */
    step: number;

    /** Sub-question or task */
    question: string;

    /** Dependencies on other steps */
    dependencies: number[];

    /** Estimated complexity */
    complexity: 'low' | 'medium' | 'high';
  }[];

  /** Execution order (respecting dependencies) */
  executionOrder: number[];

  /** Total estimated steps */
  totalSteps: number;
}

/**
 * Verifier model interface
 */
export interface VerifierModel {
  /** Unique model identifier */
  id: string;

  /** Model name/description */
  name: string;

  /** Run verification for a step */
  verify(input: VerificationInput): Promise<VerificationResult>;

  /** Get model capabilities */
  getCapabilities(): ModelCapabilities;

  /** Initialize model (if needed) */
  initialize?(): Promise<void>;

  /** Cleanup model resources */
  cleanup?(): Promise<void>;
}

/**
 * Input to a verifier model
 */
export interface VerificationInput {
  /** Original query */
  query: string;

  /** Current reasoning step */
  step: number;

  /** Total steps */
  totalSteps: number;

  /** Previous steps in the chain */
  previousSteps: ReasoningStep[];

  /** Current step question/task */
  currentQuestion: string;

  /** Context from previous steps */
  context: string;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  /** Maximum tokens the model can handle */
  maxTokens: number;

  /** Whether model supports parallel execution */
  supportsParallel: boolean;

  /** Typical response time in milliseconds */
  typicalResponseTime: number;

  /** Model quality/capability score */
  capabilityScore: number;

  /** Cost per token (if applicable) */
  costPerToken?: number;
}

/**
 * Ensemble voting result
 */
export interface EnsembleVote {
  /** Agreed-upon answer */
  answer: string;

  /** Confidence score */
  confidence: number;

  /** Number of verifiers in agreement */
  agreement: number;

  /** Total verifiers */
  total: number;

  /** Disagreement details */
  disagreements: {
    /** Verifier ID */
    verifierId: string;

    /** Their answer */
    answer: string;

    /** Their confidence */
    confidence: number;
  }[];

  /** Aggregation method used */
  method: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Total reasoning time */
  totalTime: number;

  /** Average time per step */
  avgTimePerStep: number;

  /** Average confidence across steps */
  avgConfidence: number;

  /** Backtracking rate (steps backtracked / total steps) */
  backtrackRate: number;

  /** Verifier agreement rate */
  verifierAgreementRate: number;

  /** Token efficiency (tokens per confidence point) */
  tokenEfficiency: number;

  /** Parallel execution efficiency */
  parallelEfficiency: number;
}
