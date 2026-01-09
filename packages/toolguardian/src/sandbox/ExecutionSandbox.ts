/**
 * Execution Sandbox
 *
 * Sandboxed execution environment for function calls to prevent
 * cascading failures and limit resource usage.
 *
 * @module sandbox
 */

import { SandboxConfig, ExecutionResult, ExecutionStatus } from '../types.js';

/**
 * Options for a single execution
 */
export interface ExecutionSandboxOptions {
  timeout?: number;
  catchErrors?: boolean;
  trackMemory?: boolean;
  context?: Record<string, any>;
}

/**
 * Default sandbox configuration
 */
const DEFAULT_SANDBOX_CONFIG = {
  timeout: 30000,
  maxMemory: undefined,
  allowedGlobals: undefined,
  catchErrors: true,
  restrictNetwork: false
};

/**
 * Timeout error class
 */
class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Sandbox for safe function execution
 */
export class ExecutionSandbox {
  private config: {
    timeout: number;
    maxMemory?: number;
    allowedGlobals?: string[];
    catchErrors: boolean;
    restrictNetwork: boolean;
  };

  constructor(config: (Partial<SandboxConfig> & { defaultTimeout?: number; defaultCatchErrors?: boolean }) | (SandboxConfig & { defaultTimeout?: number; defaultCatchErrors?: boolean }) = {}) {
    const timeout = (config as any).defaultTimeout ?? config.timeout ?? 30000;
    const catchErrors = (config as any).defaultCatchErrors ?? config.catchErrors ?? true;

    this.config = {
      timeout,
      catchErrors,
      maxMemory: config.maxMemory,
      allowedGlobals: config.allowedGlobals,
      restrictNetwork: config.restrictNetwork ?? false
    };
  }

  /**
   * Execute a function in the sandbox
   */
  async execute<T>(
    fn: () => Promise<T> | T,
    options?: ExecutionSandboxOptions
  ): Promise<ExecutionResult<T>> {
    const startTime = Date.now();
    const timeout = options?.timeout ?? this.config.timeout;
    const catchErrors = options?.catchErrors ?? this.config.catchErrors;

    try {
      // Execute with timeout
      const result = await this.withTimeout(fn(), timeout);

      // Estimate memory if tracking
      const memoryUsed = options?.trackMemory ? this.estimateSize(result) : undefined;

      return {
        status: ExecutionStatus.SUCCESS,
        result,
        executionTime: Date.now() - startTime,
        memoryUsed
      };
    } catch (error) {
      const err = error as Error;

      // Check if it's a timeout
      if (err instanceof TimeoutError || err.message.includes('timeout')) {
        return {
          status: ExecutionStatus.FAILED,
          error: err,
          executionTime: Date.now() - startTime
        };
      }

      // Handle other errors
      if (catchErrors) {
        return {
          status: ExecutionStatus.FAILED,
          error: err,
          executionTime: Date.now() - startTime
        };
      }

      // Re-throw if catchErrors is false
      throw err;
    }
  }

  /**
   * Wrap a promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T> | T, timeoutMs: number): Promise<T> {
    // Handle non-promise values
    const wrapped = promise instanceof Promise ? promise : Promise.resolve(promise);

    // Create a timeout promise with AbortController-like cleanup
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new TimeoutError(`Execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([wrapped, timeoutPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  /**
   * Estimate the size of a value in bytes (rough approximation)
   */
  private estimateSize(value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'string') {
      return value.length * 2; // 2 bytes per char
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'boolean') {
      return 4;
    }

    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }

    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }

    if (typeof value === 'object') {
      return Object.keys(value).reduce((sum, key) => {
        return sum + this.estimateSize(key) + this.estimateSize(value[key]);
      }, 0);
    }

    return 0;
  }

  /**
   * Execute a function with memory limit tracking
   */
  async executeWithMemoryLimit<T>(
    fn: () => Promise<T> | T,
    memoryLimit: number,
    context?: { toolName?: string }
  ): Promise<ExecutionResult<T>> {
    // In a real implementation, this would use Worker threads with memory limits
    // For now, we'll execute normally and track the result size
    const startTime = Date.now();

    try {
      const result = await fn();

      // Estimate result size (rough approximation)
      const size = this.estimateSize(result);
      if (size > memoryLimit) {
        return {
          status: ExecutionStatus.FAILED,
          error: new Error(`Result size exceeds memory limit: ${size} > ${memoryLimit}`),
          executionTime: Date.now() - startTime,
          functionName: context?.toolName
        };
      }

      return {
        status: ExecutionStatus.SUCCESS,
        result,
        executionTime: Date.now() - startTime,
        functionName: context?.toolName
      };
    } catch (error) {
      return {
        status: ExecutionStatus.FAILED,
        error: error as Error,
        executionTime: Date.now() - startTime,
        functionName: context?.toolName
      };
    }
  }

  /**
   * Update sandbox configuration
   */
  updateConfig(updates: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...updates as any };
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}
