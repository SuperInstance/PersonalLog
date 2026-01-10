/**
 * ToolGuardian - Reliable Function Calling
 *
 * A hybrid reliability layer for LLM function calling that combines:
 * - Deterministic function routing (not LLM-based)
 * - Schema validation (catch invalid parameters before call)
 * - Automatic retry with fallback strategies
 * - Function execution sandboxing (prevent failures)
 * - Real-time monitoring and alerting
 *
 * @module types
 */

/**
 * Function result status
 */
export enum ExecutionStatus {
  SUCCESS = 'success',
  VALIDATION_ERROR = 'validation_error',
  PREREQUISITE_ERROR = 'prerequisite_error',
  EXECUTION_ERROR = 'execution_error',
  TIMEOUT = 'timeout',
  RETRIED = 'retried',
  FAILED = 'failed'
}

/**
 * Schema types for validation
 */
export enum SchemaType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
  ANY = 'any'
}

/**
 * Property schema definition
 *
 * Defines validation rules for a single property in a function schema.
 * Supports type checking, constraints, and nested structures.
 */
export interface PropertySchema {
  /** The expected type(s) for this property */
  type: SchemaType | SchemaType[];
  /** Human-readable description of what this property represents */
  description?: string;
  /** Whether this property is required (true) or optional (false/undefined) */
  required?: boolean | string[];
  /** Minimum string length (for string types) */
  minLength?: number;
  /** Maximum string length (for string types) */
  maxLength?: number;
  /** Minimum numeric value (for number types) */
  minimum?: number;
  /** Maximum numeric value (for number types) */
  maximum?: number;
  /** Regular expression pattern that string values must match (can be RegExp or string) */
  pattern?: RegExp | string;
  /** Array of allowed values for this property */
  enum?: any[];
  /** Nested property definitions for object types */
  properties?: Record<string, PropertySchema>;
  /** Schema for array item types */
  items?: PropertySchema;
  /** Default value if not provided */
  default?: any;
  /** Minimum number of items for array types */
  minItems?: number;
  /** Maximum number of items for array types */
  maxItems?: number;
}

/**
 * Input/output schema for a function
 */
export interface FunctionSchema {
  input?: Record<string, PropertySchema>;
  output?: Record<string, PropertySchema>;
  inputRequired?: string[];
}

/**
 * Function execution result
 */
export interface ExecutionResult<T = any> {
  status: ExecutionStatus;
  result?: T;
  error?: Error;
  validationErrors?: ValidationError[];
  retryCount?: number;
  executionTime?: number;
  functionName?: string;
  memoryUsed?: number;
}

/**
 * Validation error details
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  expected?: string;
}

/**
 * Retry strategy configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  jitter: boolean;
}

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  timeout: number;
  maxMemory?: number;
  allowedGlobals?: string[];
  catchErrors: boolean;
  restrictNetwork?: boolean;
}

/**
 * Monitoring metrics
 */
export interface MonitoringMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  retriedExecutions: number;
  slowExecutions?: number;
  averageExecutionTime: number;
  functionCallCounts: Record<string, number>;
  errorRates: Record<string, number>;
}

/**
 * Tool/function definition
 */
export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  fn: (input: TInput) => TOutput | Promise<TOutput>;
  schema?: FunctionSchema;
  prerequisites?: string[];
  timeout?: number;
  retryConfig?: Partial<RetryConfig>;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Tool registry
 */
export type ToolRegistry = Record<string, Tool>;

/**
 * Execution options
 */
export interface ExecutionOptions {
  validateBeforeCall?: boolean;
  retryOnFailure?: boolean;
  sandbox?: boolean | Partial<SandboxConfig>;
  timeout?: number;
  monitoring?: boolean;
  throwOnError?: boolean;
  context?: Record<string, any>;
}

/**
 * Intent parsing result
 */
export interface ParsedIntent {
  functionName: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

/**
 * Intent parser for extracting function calls from natural language
 */
export interface IntentParser {
  parse(input: string, availableTools: string[]): Promise<ParsedIntent[]>;
}

/**
 * Pre-execution hook
 */
export interface PreExecutionHook {
  name: string;
  fn: (context: PreExecutionContext) => Promise<void> | void;
}

/**
 * Post-execution hook
 */
export interface PostExecutionHook {
  name: string;
  fn: (context: PostExecutionContext) => Promise<void> | void;
}

/**
 * Pre-execution context
 */
export interface PreExecutionContext {
  toolName: string;
  parameters: Record<string, any>;
  options: ExecutionOptions;
  timestamp: number;
}

/**
 * Post-execution context
 */
export interface PostExecutionContext {
  toolName: string;
  parameters: Record<string, any>;
  result: ExecutionResult;
  options: ExecutionOptions;
  startTime: number;
  endTime: number;
}

/**
 * Tool execution history
 */
export interface ExecutionHistory {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  result: ExecutionResult;
  timestamp: number;
  duration: number;
  retryCount: number;
}

/**
 * ToolGuardian configuration
 */
export interface ToolGuardianConfig {
  tools?: ToolRegistry;
  defaultRetryConfig?: Partial<RetryConfig>;
  defaultSandboxConfig?: Partial<SandboxConfig>;
  intentParser?: IntentParser;
  enableMonitoring?: boolean;
  enableHistory?: boolean;
  maxHistorySize?: number;
  preHooks?: PreExecutionHook[];
  postHooks?: PostExecutionHook[];
  strictValidation?: boolean;
}
