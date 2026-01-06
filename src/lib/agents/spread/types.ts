/**
 * Multi-Model Spreading Types
 *
 * Type definitions for the intelligent model selection and spreading system.
 */

// ============================================================================
// MODEL CAPABILITIES
// ============================================================================

/**
 * AI model capabilities and features.
 */
export interface ModelCapabilities {
  /** Can write and understand code */
  code: boolean
  /** Can perform mathematical reasoning */
  math: boolean
  /** Creative writing capability */
  creative: boolean
  /** Data analysis capability */
  analysis: boolean
  /** Multimodal (images/audio) support */
  multimodal: boolean
  /** Function calling / tools support */
  tools: boolean
  /** Streaming response support */
  streaming: boolean
}

// ============================================================================
// AI MODEL DEFINITION
// ============================================================================

/**
 * Complete AI model definition with capabilities, pricing, and benchmarks.
 */
export interface AIModel {
  /** Unique model identifier (e.g., 'gpt-4-turbo', 'claude-3-opus') */
  id: string
  /** Human-readable model name */
  name: string
  /** Model provider */
  provider: 'openai' | 'anthropic' | 'google' | 'local' | 'cloudflare'

  /** Model capabilities */
  capabilities: ModelCapabilities

  /** Performance metrics */
  performance: {
    /** Speed category */
    speed: 'fast' | 'medium' | 'slow'
    /** Quality category */
    quality: 'low' | 'medium' | 'high'
    /** Reliability score (0-1) */
    reliability: number
  }

  /** Pricing information */
  pricing: {
    /** Input cost per 1M tokens */
    inputCost: number
    /** Output cost per 1M tokens */
    outputCost: number
    /** Free tier token allowance (if applicable) */
    freeTierTokens?: number
  }

  /** Model limits */
  limits: {
    /** Maximum context window (tokens) */
    maxTokens: number
    /** Rate limit (requests per minute) */
    requestsPerMinute: number
  }

  /** Performance benchmarks */
  benchmarks: {
    /** Average response time (seconds) */
    avgResponseTime: number
    /** Average tokens per second */
    avgTokensPerSecond: number
  }
}

// ============================================================================
// TASK REQUIREMENTS
// ============================================================================

/**
 * Analyzed task requirements for model matching.
 */
export interface TaskRequirements {
  /** Task type */
  type: 'code' | 'writing' | 'analysis' | 'math' | 'creative' | 'general'

  /** Capability requirements */
  requiresCode: boolean
  requiresMath: boolean
  requiresCreative: boolean
  requiresAnalysis: boolean
  requiresMultimodal: boolean
  requiresTools: boolean

  /** Task complexity */
  complexity: 'low' | 'medium' | 'high'

  /** Estimated token usage */
  estimatedTokens: {
    input: number
    output: number
  }

  /** Task description */
  description: string

  /** Priority (used for model selection) */
  priority?: 'speed' | 'quality' | 'cost'

  /** Whether fallback to simpler models is allowed */
  fallbackAllowed?: boolean
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

/**
 * User preferences for model selection.
 */
export interface UserPreferences {
  /** Optimization priority */
  priority: 'cost' | 'quality' | 'speed'

  /** Maximum budget per task (in dollars) */
  maxCost?: number

  /** Maximum time per task (in seconds) */
  maxTime?: number

  /** Preferred providers (empty = all) */
  preferredProviders?: Array<'openai' | 'anthropic' | 'google' | 'local' | 'cloudflare'>

  /** Exclude local models? */
  excludeLocal?: boolean

  /** Exclude specific model IDs */
  excludeModels?: string[]

  /** Require free tier only? */
  freeTierOnly?: boolean

  /** Require specific capabilities? */
  requiredCapabilities?: Partial<ModelCapabilities>
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Cost estimate for a task with a specific model.
 */
export interface CostEstimate {
  /** Model ID */
  modelId: string
  /** Model name */
  modelName: string
  /** Input token cost */
  inputCost: number
  /** Output token cost */
  outputCost: number
  /** Total estimated cost */
  totalCost: number
  /** Estimated completion time (seconds) */
  estimatedTime: number
  /** Token estimates */
  tokens: {
    input: number
    output: number
  }
  /** Model reference */
  model: AIModel
}

/**
 * Cost comparison across multiple models.
 */
export interface CostComparison {
  /** Cheapest option */
  cheapest: CostEstimate
  /** Fastest option */
  fastest: CostEstimate
  /** Best quality option */
  bestQuality: CostEstimate
  /** All model estimates */
  all: CostEstimate[]
}

// ============================================================================
// SPREAD TASK WITH MODEL
// ============================================================================

/**
 * A task to be spread with an assigned model.
 */
export interface SpreadTaskWithModel {
  /** Unique task ID */
  id: string
  /** Task description */
  task: string
  /** Analyzed requirements */
  requirements: TaskRequirements
  /** Selected model for this task */
  modelId: string
  /** Model reference */
  model: AIModel
  /** Cost estimate */
  costEstimate: CostEstimate
  /** Creation timestamp */
  createdAt: string
}

/**
 * Result of spreading tasks with multi-model assignment.
 */
export interface MultiModelSpreadResult {
  /** Spread ID */
  spreadId: string
  /** Tasks with assigned models */
  tasks: SpreadTaskWithModel[]
  /** Total estimated cost */
  totalCost: number
  /** Total estimated time (parallel) */
  totalEstimatedTime: number
  /** Cost savings compared to using best model for all */
  costSavings: {
    amount: number
    percentage: number
    baseline: string // Model ID used for comparison
  }
}

// ============================================================================
// MODEL SELECTION RECOMMENDATION
// ============================================================================

/**
 * Model selection recommendation with reasoning.
 */
export interface ModelRecommendation {
  /** Recommended model */
  model: AIModel
  /** Confidence score (0-1) */
  confidence: number
  /** Score value */
  score: number
  /** Reasoning for recommendation */
  reasoning: string[]
  /** Cost estimate */
  cost: CostEstimate
  /** Alternatives */
  alternatives: Array<{
    model: AIModel
    score: number
    reason: string
  }>
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Performance record for tracking actual model performance.
 */
export interface PerformanceRecord {
  /** Model ID */
  modelId: string
  /** Task ID */
  taskId: string
  /** Task type */
  taskType: TaskRequirements['type']
  /** Actual cost incurred */
  actualCost: number
  /** Actual time taken */
  actualTime: number
  /** Actual tokens used */
  actualTokens: {
    input: number
    output: number
  }
  /** Whether task succeeded */
  success: boolean
  /** Timestamp */
  timestamp: number
}

/**
 * Average performance metrics.
 */
export interface AveragePerformance {
  /** Model ID */
  modelId: string
  /** Average cost */
  averageCost: number
  /** Average time */
  averageTime: number
  /** Success rate (0-1) */
  successRate: number
  /** Sample size */
  sampleSize: number
}

// ============================================================================
// TASK ANALYSIS CONTEXT
// ============================================================================

/**
 * Context for task analysis.
 */
export interface TaskAnalysisContext {
  /** Task description */
  description: string
  /** Conversation history (optional) */
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  /** User preferences */
  preferences?: UserPreferences
  /** Available models (default: all) */
  availableModels?: AIModel[]
}
