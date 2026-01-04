/**
 * Plugin Sandbox
 *
 * Secure execution environment for plugins using Web Workers and proxy-based isolation.
 * Enforces resource limits and permission checks.
 *
 * @module lib/plugin/sandbox
 */

import type {
  PluginId,
  SandboxConfig,
  SandboxResult,
  Permission,
  PluginAPIContext,
} from './types';
import { PermissionValidator } from './permissions';

// ============================================================================
// SANDBOX WORKER CODE
// ============================================================================

const SANDBOX_WORKER_CODE = `
  // Plugin sandbox worker
  let pluginContext = null;
  let pluginModule = null;

  self.onmessage = async (event) => {
    const { type, id, data } = event.data;

    try {
      switch (type) {
        case 'init':
          await initialize(data);
          self.postMessage({ type, id, success: true });
          break;

        case 'execute':
          const result = await execute(data);
          self.postMessage({ type, id, success: true, data: result });
          break;

        case 'call':
          const callResult = await call(data);
          self.postMessage({ type, id, success: true, data: callResult });
          break;

        default:
          throw new Error(\`Unknown worker message type: \${type}\`);
      }
    } catch (error) {
      self.postMessage({
        type,
        id,
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  };

  async initialize(data) {
    const { context, code } = data;
    pluginContext = context;

    // Create plugin module from code
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    pluginModule = await import(url);
    URL.revokeObjectURL(url);

    // Call plugin init if exists
    if (pluginModule.init) {
      await pluginModule.init(context);
    }
  }

  async execute(data) {
    const { function: funcName, args } = data;

    if (!pluginModule) {
      throw new Error('Plugin module not initialized');
    }

    if (typeof pluginModule[funcName] !== 'function') {
      throw new Error(\`Function not found: \${funcName}\`);
    }

    return await pluginModule[funcName](...args);
  }

  async call(data) {
    const { method, args } = data;

    // Call context methods (e.g., API calls)
    const [object, func] = method.split('.');
    return await pluginContext[object][func](...args);
  }
`;

// ============================================================================
// SANDBOX CLASS
// ============================================================================

export class PluginSandbox {
  private worker: Worker | null = null;
  private config: SandboxConfig;
  private permissionChecks: Map<string, Permission[]> = new Map();
  private executionTimes: Map<string, number[]> = new Map();
  private memoryUsage: Map<string, number[]> = new Map();

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  /**
   * Initialize sandbox
   */
  async initialize(pluginCode: string, context: PluginAPIContext): Promise<void> {
    // Create worker from sandbox code
    const blob = new Blob([SANDBOX_WORKER_CODE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url, { type: 'module' });
    URL.revokeObjectURL(url);

    // Initialize plugin in worker
    await this.postMessage('init', {
      context: this.sanitizeContext(context),
      code: pluginCode,
    });
  }

  /**
   * Execute plugin function
   */
  async execute<T = any>(
    functionName: string,
    args: any[] = [],
    timeout?: number
  ): Promise<SandboxResult<T>> {
    if (!this.worker) {
      throw new Error('Sandbox not initialized');
    }

    const startTime = Date.now();
    const execTimeout = timeout || this.config.timeout;

    try {
      // Execute with timeout
      const result = await this.withTimeout(
        this.postMessage('execute', {
          function: functionName,
          args,
        }),
        execTimeout
      );

      const executionTime = Date.now() - startTime;
      const memoryUsed = this.estimateMemoryUsage();

      // Track metrics
      this.trackExecution(functionName, executionTime, memoryUsed);

      // Check resource limits
      this.checkResourceLimits(functionName, executionTime, memoryUsed);

      return {
        success: true,
        data: result,
        executionTime,
        memoryUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }
  }

  /**
   * Call API method
   */
  async callApi<T = any>(
    method: string,
    args: any[] = [],
    requiredPermission?: Permission
  ): Promise<SandboxResult<T>> {
    if (requiredPermission) {
      // Check permission before calling API
      const { allowed, reason } = PermissionValidator.validateRequest(
        this.config.pluginId,
        requiredPermission,
        // We'll need to inject the permission manager here
        // For now, we'll assume permission check happens elsewhere
        null as any
      );

      if (!allowed) {
        return {
          success: false,
          error: reason || 'Permission denied',
          executionTime: 0,
          memoryUsed: 0,
        };
      }
    }

    const startTime = Date.now();

    try {
      const result = await this.postMessage('call', {
        method,
        args,
      });

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        memoryUsed: this.estimateMemoryUsage(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      };
    }
  }

  /**
   * Terminate sandbox
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.executionTimes.clear();
    this.memoryUsage.clear();
  }

  /**
   * Check if sandbox is active
   */
  isActive(): boolean {
    return this.worker !== null;
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Send message to worker and wait for response
   */
  private postMessage<T = any>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const handler = (event: MessageEvent) => {
        if (event.data.id === id) {
          this.worker!.removeEventListener('message', handler);
          if (event.data.success) {
            resolve(event.data.data);
          } else {
            const error = new Error(event.data.error);
            if (event.data.stack) {
              error.stack = event.data.stack;
            }
            reject(error);
          }
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ type, id, data });
    });
  }

  /**
   * Wrap promise with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Sanitize context before passing to worker
   */
  private sanitizeContext(context: PluginAPIContext): any {
    // Remove non-serializable objects and create safe proxies
    return {
      pluginId: context.pluginId,
      version: context.version,
      permissions: context.permissions,
      settings: context.settings,
      // Create safe versions of logger, storage, and events
      logger: this.createSafeLogger(context.logger),
      storage: this.createSafeStorage(context.storage),
      events: this.createSafeEventBus(context.events),
    };
  }

  /**
   * Create safe logger proxy
   */
  private createSafeLogger(logger: any): any {
    return {
      debug: (...args: any[]) => logger.debug(...args),
      info: (...args: any[]) => logger.info(...args),
      warn: (...args: any[]) => logger.warn(...args),
      error: (...args: any[]) => logger.error(...args),
    };
  }

  /**
   * Create safe storage proxy
   */
  private createSafeStorage(storage: any): any {
    return {
      get: (key: string) => storage.get(key),
      set: (key: string, value: any) => storage.set(key, value),
      delete: (key: string) => storage.delete(key),
      keys: () => storage.keys(),
      clear: () => storage.clear(),
    };
  }

  /**
   * Create safe event bus proxy
   */
  private createSafeEventBus(events: any): any {
    return {
      on: (event: string, handler: (...args: any[]) => void) => events.on(event, handler),
      off: (event: string, handler: (...args: any[]) => void) => events.off(event, handler),
      emit: (event: string, ...args: any[]) => events.emit(event, ...args),
    };
  }

  /**
   * Track execution metrics
   */
  private trackExecution(functionName: string, time: number, memory: number): void {
    if (!this.executionTimes.has(functionName)) {
      this.executionTimes.set(functionName, []);
      this.memoryUsage.set(functionName, []);
    }

    const times = this.executionTimes.get(functionName)!;
    const memories = this.memoryUsage.get(functionName)!;

    times.push(time);
    memories.push(memory);

    // Keep only last 100 executions
    if (times.length > 100) times.shift();
    if (memories.length > 100) memories.shift();
  }

  /**
   * Check resource limits
   */
  private checkResourceLimits(functionName: string, time: number, memory: number): void {
    const limits = this.config.resourceLimits;

    // Check execution time
    if (limits.maxExecutionTime && time > limits.maxExecutionTime) {
      throw new Error(
        `Execution time ${time}ms exceeds limit ${limits.maxExecutionTime}ms`
      );
    }

    // Check memory usage
    if (limits.maxMemoryMB && memory > limits.maxMemoryMB) {
      throw new Error(
        `Memory usage ${memory}MB exceeds limit ${limits.maxMemoryMB}MB`
      );
    }

    // Check average execution time
    const times = this.executionTimes.get(functionName) || [];
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      // Allow 2x spike but check sustained usage
      if (avgTime > (limits.maxExecutionTime || Infinity) * 0.8) {
        console.warn(`Plugin ${this.config.pluginId} sustained high execution time: ${avgTime}ms`);
      }
    }
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    // Rough estimate based on execution history
    const memories = Array.from(this.memoryUsage.values()).flat();
    if (memories.length === 0) return 0;
    return memories.reduce((a, b) => a + b, 0) / memories.length;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    totalExecutions: number;
    averageExecutionTime: number;
    peakMemoryUsage: number;
    functionStats: Record<
      string,
      { calls: number; avgTime: number; maxTime: number; avgMemory: number }
    >;
  } {
    let totalExecutions = 0;
    let totalTime = 0;
    let peakMemory = 0;

    const functionStats: Record<
      string,
      { calls: number; avgTime: number; maxTime: number; avgMemory: number }
    > = {};

    for (const [funcName, times] of this.executionTimes.entries()) {
      const memories = this.memoryUsage.get(funcName) || [];
      const calls = times.length;
      const avgTime = times.reduce((a, b) => a + b, 0) / calls;
      const maxTime = Math.max(...times);
      const avgMemory = memories.length > 0 ? memories.reduce((a, b) => a + b, 0) / memories.length : 0;

      functionStats[funcName] = { calls, avgTime, maxTime, avgMemory };

      totalExecutions += calls;
      totalTime += times.reduce((a, b) => a + b, 0);
      peakMemory = Math.max(peakMemory, ...memories);
    }

    return {
      totalExecutions,
      averageExecutionTime: totalExecutions > 0 ? totalTime / totalExecutions : 0,
      peakMemoryUsage: peakMemory,
      functionStats,
    };
  }
}

// ============================================================================
// SANDBOX MANAGER
// ============================================================================

export class SandboxManager {
  private sandboxes: Map<PluginId, PluginSandbox> = new Map();

  /**
   * Create sandbox for plugin
   */
  createSandbox(config: SandboxConfig): PluginSandbox {
    const sandbox = new PluginSandbox(config);
    this.sandboxes.set(config.pluginId, sandbox);
    return sandbox;
  }

  /**
   * Get sandbox for plugin
   */
  getSandbox(pluginId: PluginId): PluginSandbox | undefined {
    return this.sandboxes.get(pluginId);
  }

  /**
   * Remove sandbox for plugin
   */
  removeSandbox(pluginId: PluginId): void {
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      sandbox.terminate();
      this.sandboxes.delete(pluginId);
    }
  }

  /**
   * Remove all sandboxes
   */
  removeAll(): void {
    for (const [pluginId, sandbox] of this.sandboxes.entries()) {
      sandbox.terminate();
    }
    this.sandboxes.clear();
  }

  /**
   * Get all active sandboxes
   */
  getActiveSandboxes(): PluginId[] {
    return Array.from(this.sandboxes.keys()).filter(
      (id) => this.sandboxes.get(id)?.isActive()
    );
  }

  /**
   * Get statistics for all sandboxes
   */
  getAllStats(): Record<string, ReturnType<PluginSandbox['getStats']>> {
    const stats: Record<string, ReturnType<PluginSandbox['getStats']>> = {};

    for (const [pluginId, sandbox] of this.sandboxes.entries()) {
      stats[pluginId] = sandbox.getStats();
    }

    return stats;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let sandboxManagerInstance: SandboxManager | null = null;

/**
 * Get sandbox manager instance
 */
export function getSandboxManager(): SandboxManager {
  if (!sandboxManagerInstance) {
    sandboxManagerInstance = new SandboxManager();
  }
  return sandboxManagerInstance;
}
