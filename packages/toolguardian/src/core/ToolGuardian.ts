/**
 * ToolGuardian - Reliable Function Calling
 *
 * Main class providing reliable function execution with validation,
 * retry logic, sandboxing, and monitoring.
 *
 * @module core
 */

import { EventEmitter } from 'eventemitter3';
import {
  Tool,
  ToolRegistry,
  ExecutionOptions,
  ExecutionResult,
  ExecutionStatus,
  ToolGuardianConfig,
  ParsedIntent,
  PreExecutionHook,
  PostExecutionHook,
  PreExecutionContext,
  PostExecutionContext
} from '../types.js';
import { SchemaValidator } from '../validation/SchemaValidator.js';
import { RetryManager } from '../retry/RetryManager.js';
import { ExecutionSandbox } from '../sandbox/ExecutionSandbox.js';
import { Monitor } from '../monitoring/Monitor.js';

/**
 * Default execution options
 */
const DEFAULT_EXECUTION_OPTIONS: ExecutionOptions = {
  validateBeforeCall: true,
  retryOnFailure: true,
  sandbox: true,
  timeout: 30000,
  monitoring: true,
  throwOnError: false,
  context: {}
};

/**
 * ToolGuardian - Reliable function calling with validation and retry
 */
export class ToolGuardian extends EventEmitter {
  private tools: ToolRegistry;
  private validator: SchemaValidator;
  private retryManager: RetryManager;
  private sandbox: ExecutionSandbox;
  private monitor: Monitor;
  private preHooks: PreExecutionHook[];
  private postHooks: PostExecutionHook[];
  private strictValidation: boolean;
  public readonly hooks: {
    before: (toolName: string | '*', fn: (params: any, context: any) => Promise<void> | void) => void;
    after: (toolName: string | '*', fn: (result: any, params: any, context: any) => Promise<void> | void) => void;
    onError: (toolName: string | '*', fn: (error: Error, params: any, context?: any) => Promise<void> | void) => void;
    remove: (type: 'before' | 'after' | 'onError', toolName: string) => void;
    getHooks: (type: 'before' | 'after' | 'onError', toolName: string) => Array<Function>;
  };

  constructor(config: ToolGuardianConfig = {}) {
    super();

    this.tools = config.tools ?? {};
    this.strictValidation = config.strictValidation ?? false;

    // Initialize components
    this.validator = new SchemaValidator(this.strictValidation);
    this.retryManager = new RetryManager(config.defaultRetryConfig);
    this.sandbox = new ExecutionSandbox(config.defaultSandboxConfig);
    this.monitor = new Monitor(config.maxHistorySize ?? 1000);
    this.preHooks = config.preHooks ?? [];
    this.postHooks = config.postHooks ?? [];

    // Create hooks registry for easy access
    const hooksRegistry: Map<string, Map<'before' | 'after' | 'onError', Function[]>> = new Map();

    this.hooks = {
      before: (toolName: string | '*', fn: (params: any, context: any) => Promise<void> | void) => {
        const key = typeof toolName === 'string' ? toolName : '*';
        if (!hooksRegistry.has(key)) {
          hooksRegistry.set(key, new Map());
        }
        if (!hooksRegistry.get(key)!.has('before')) {
          hooksRegistry.get(key)!.set('before', []);
        }
        hooksRegistry.get(key)!.get('before')!.push(fn);
      },
      after: (toolName: string | '*', fn: (result: any, params: any, context: any) => Promise<void> | void) => {
        const key = typeof toolName === 'string' ? toolName : '*';
        if (!hooksRegistry.has(key)) {
          hooksRegistry.set(key, new Map());
        }
        if (!hooksRegistry.get(key)!.has('after')) {
          hooksRegistry.get(key)!.set('after', []);
        }
        hooksRegistry.get(key)!.get('after')!.push(fn);
      },
      onError: (toolName: string | '*', fn: (error: Error, params: any, context?: any) => Promise<void> | void) => {
        const key = typeof toolName === 'string' ? toolName : '*';
        if (!hooksRegistry.has(key)) {
          hooksRegistry.set(key, new Map());
        }
        if (!hooksRegistry.get(key)!.has('onError')) {
          hooksRegistry.get(key)!.set('onError', []);
        }
        hooksRegistry.get(key)!.get('onError')!.push(fn);
      },
      remove: (type: 'before' | 'after' | 'onError', toolName: string) => {
        if (hooksRegistry.has(toolName)) {
          hooksRegistry.get(toolName)!.delete(type);
        }
      },
      getHooks: (type: 'before' | 'after' | 'onError', toolName: string) => {
        const hooks: Function[] = [];
        // Get tool-specific hooks
        if (hooksRegistry.has(toolName)) {
          const typeHooks = hooksRegistry.get(toolName)!.get(type);
          if (typeHooks) {
            hooks.push(...typeHooks);
          }
        }
        // Get wildcard hooks
        if (hooksRegistry.has('*')) {
          const wildcardHooks = hooksRegistry.get('*')!.get(type);
          if (wildcardHooks) {
            hooks.push(...wildcardHooks);
          }
        }
        return hooks;
      }
    };

    // Store hooks registry for internal use
    (this as any)._hooksRegistry = hooksRegistry;

    // Set up monitoring
    if (config.enableMonitoring) {
      this.monitor.on('threshold:exceeded', (data) => {
        this.emit('alert', data);
      });
    }
  }

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools[tool.name] = tool;
    this.emit('tool:registered', { tool: tool.name });
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    if (name in this.tools) {
      delete this.tools[name];
      this.emit('tool:unregistered', { tool: name });
      return true;
    }
    return false;
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return name in this.tools && this.tools[name].enabled !== false;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools[name];
  }

  /**
   * Get all registered tools
   */
  getTools(): Record<string, Tool> {
    return { ...this.tools };
  }

  /**
   * Execute a tool by name with parameters
   */
  async execute(
    toolName: string,
    parameters: Record<string, any>,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const mergedOptions = { ...DEFAULT_EXECUTION_OPTIONS, ...options };

    // Check if tool exists and is enabled
    const tool = this.tools[toolName];
    if (!tool) {
      return {
        status: ExecutionStatus.FAILED,
        error: new Error(`Tool '${toolName}' not found`),
        functionName: toolName
      };
    }

    if (tool.enabled === false) {
      return {
        status: ExecutionStatus.FAILED,
        error: new Error(`Tool '${toolName}' is disabled`),
        functionName: toolName
      };
    }

    const startTime = Date.now();

    // Emit starting event
    this.emit('execution:starting', { toolName, parameters, startTime });

    // Get hooks from registry
    const hooksRegistry = (this as any)._hooksRegistry as Map<string, Map<'before' | 'after' | 'onError', Function[]>>;

    // Call before hooks (tool-specific + wildcard)
    const beforeHooks: Function[] = [];
    if (hooksRegistry?.has(toolName)) {
      const toolHooks = hooksRegistry.get(toolName)!.get('before');
      if (toolHooks) beforeHooks.push(...toolHooks);
    }
    if (hooksRegistry?.has('*')) {
      const wildcardHooks = hooksRegistry.get('*')!.get('before');
      if (wildcardHooks) beforeHooks.push(...wildcardHooks);
    }

    for (const hook of beforeHooks) {
      try {
        await hook(parameters, { toolName });
      } catch (error) {
        return {
          status: ExecutionStatus.FAILED,
          error: error as Error,
          functionName: toolName
        };
      }
    }

    // Old-style pre-execution hooks
    for (const hook of this.preHooks) {
      try {
        await hook.fn({
          toolName,
          parameters,
          options: mergedOptions,
          timestamp: startTime
        });
      } catch (error) {
        return {
          status: ExecutionStatus.FAILED,
          error: error as Error,
          functionName: toolName
        };
      }
    }

    // Validate input if requested
    if (mergedOptions.validateBeforeCall && tool.schema) {
      const validationErrors = this.validator.validate(parameters, tool.schema);
      if (validationErrors.length > 0) {
        const result: ExecutionResult = {
          status: ExecutionStatus.VALIDATION_ERROR,
          error: new Error(`Validation failed:\n${this.validator.formatErrors(validationErrors)}`),
          validationErrors,
          functionName: toolName
        };

        this.emit('validation:failed', { toolName, errors: validationErrors });

        if (mergedOptions.monitoring) {
          this.monitor.record(result, toolName);
        }

        return result;
      }
    }

    // Check prerequisites
    if (tool.prerequisites && tool.prerequisites.length > 0) {
      const prereqResult = this.checkPrerequisites(tool);
      if (!prereqResult.success) {
        const result: ExecutionResult = {
          status: ExecutionStatus.PREREQUISITE_ERROR,
          error: new Error(`Prerequisites not met: ${prereqResult.reason}`),
          functionName: toolName
        };

        if (mergedOptions.monitoring) {
          this.monitor.record(result, toolName);
        }

        return result;
      }
    }

    // Execute with retry logic
    const executeTool = async () => {
      const sandbox = mergedOptions.sandbox
        ? new ExecutionSandbox(
            typeof mergedOptions.sandbox === 'object'
              ? { ...this.sandbox.getConfig(), ...mergedOptions.sandbox }
              : this.sandbox.getConfig()
          )
        : this.sandbox;

      // Get timeout from options or tool config
      const timeout = mergedOptions.timeout ?? tool.timeout ?? this.sandbox.getConfig().timeout;

      return await sandbox.execute(async () => {
        return await tool.fn(parameters);
      }, { timeout, trackMemory: mergedOptions.monitoring });
    };

    let result: ExecutionResult;

    try {
      if (mergedOptions.retryOnFailure) {
        result = await this.retryManager.execute(executeTool, {
          toolName,
          params: parameters
        });
      } else {
        result = await executeTool();
      }
    } catch (error) {
      result = {
        status: ExecutionStatus.FAILED,
        error: error as Error,
        functionName: toolName
      };
    }

    // Set function name if not set
    if (!result.functionName) {
      result.functionName = toolName;
    }

    // Validate output if requested
    if (result.status === ExecutionStatus.SUCCESS && mergedOptions.validateBeforeCall && tool.schema?.output) {
      const validationErrors = this.validator.validateOutput(result.result, tool.schema);
      if (validationErrors.length > 0) {
        result = {
          ...result,
          status: ExecutionStatus.VALIDATION_ERROR,
          error: new Error(`Output validation failed:\n${this.validator.formatErrors(validationErrors)}`),
          validationErrors
        };
      }
    }

    // Call after hooks
    const afterHooks: Function[] = [];
    if (hooksRegistry?.has(toolName)) {
      const toolHooks = hooksRegistry.get(toolName)!.get('after');
      if (toolHooks) afterHooks.push(...toolHooks);
    }
    if (hooksRegistry?.has('*')) {
      const wildcardHooks = hooksRegistry.get('*')!.get('after');
      if (wildcardHooks) afterHooks.push(...wildcardHooks);
    }

    for (const hook of afterHooks) {
      try {
        await hook(result, parameters, { toolName });
      } catch (error) {
        // Log hook errors but don't fail the execution
        console.error(`After hook for '${toolName}' failed:`, error);
      }
    }

    // Old-style post-execution hooks
    for (const hook of this.postHooks) {
      try {
        await hook.fn({
          toolName,
          parameters,
          result,
          options: mergedOptions,
          startTime,
          endTime: Date.now()
        });
      } catch (error) {
        // Log hook errors but don't fail the execution
        console.error(`Post-execution hook '${hook.name}' failed:`, error);
      }
    }

    // Record metrics
    if (mergedOptions.monitoring) {
      this.monitor.record(result, toolName);
    }

    // Emit events
    const duration = result.executionTime ?? Date.now() - startTime;
    if (result.status === ExecutionStatus.SUCCESS) {
      this.emit('execution:complete', { toolName, status: 'success', duration, result });
    } else {
      this.emit('execution:failed', { toolName, status: result.status, duration, error: result.error });
    }

    // Throw if requested
    if (mergedOptions.throwOnError && result.status !== ExecutionStatus.SUCCESS) {
      throw result.error;
    }

    return result;
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    calls: Array<{ tool: string; parameters: Record<string, any>; options?: ExecutionOptions }>
  ): Promise<ExecutionResult[]> {
    return Promise.all(
      calls.map(call => this.execute(call.tool, call.parameters, call.options))
    );
  }

  /**
   * Execute tools in sequence (chaining)
   */
  async executeChain(
    calls: Array<{ tool: string; parameters: Record<string, any>; options?: ExecutionOptions }>
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const call of calls) {
      const result = await this.execute(call.tool, call.parameters, call.options);

      // Stop chain if execution failed
      if (result.status !== ExecutionStatus.SUCCESS) {
        results.push(result);
        break;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Parse natural language intent into function calls
   */
  async parseIntent(input: string): Promise<ParsedIntent[]> {
    const availableTools = Object.keys(this.tools).filter(name =>
      this.tools[name].enabled !== false
    );

    if (!this.intentParser) {
      // Basic intent parsing fallback
      return this.basicParseIntent(input, availableTools);
    }

    return this.intentParser.parse(input, availableTools);
  }

  /**
   * Execute from natural language description
   */
  async executeFromDescription(input: string, options?: ExecutionOptions): Promise<ExecutionResult[]> {
    const intents = await this.parseIntent(input);
    const results: ExecutionResult[] = [];

    for (const intent of intents) {
      const result = await this.execute(intent.functionName, intent.parameters, options);
      results.push(result);

      if (result.status !== ExecutionStatus.SUCCESS) {
        break;
      }
    }

    return results;
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return this.monitor.getMetrics();
  }

  /**
   * Get execution history
   */
  getHistory(options?: {
    limit?: number;
    toolName?: string;
    status?: ExecutionStatus;
    startTime?: number;
    endTime?: number;
  }) {
    return this.monitor.getHistory(options);
  }

  /**
   * Clear execution history
   */
  clearHistory() {
    this.monitor.clearHistory();
  }

  /**
   * Get success rate for a specific tool
   */
  getSuccessRate(toolName: string): number {
    return this.monitor.getSuccessRate(toolName);
  }

  /**
   * Get average execution time for a specific tool
   */
  getAverageTime(toolName: string): number {
    return this.monitor.getAverageTime(toolName);
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(thresholds: { slowExecution?: number; lowSuccessRate?: number; highFailureRate?: number }) {
    this.monitor.setAlertThresholds(thresholds);
  }

  /**
   * Set history retention period
   */
  setRetentionPeriod(ms: number) {
    this.monitor.setRetentionPeriod(ms);
  }

  /**
   * Get tool schemas as JSON Schema format
   */
  getSchemas(): Record<string, Record<string, any>> {
    const schemas: Record<string, any> = {};

    for (const [name, tool] of Object.entries(this.tools)) {
      if (tool.schema) {
        schemas[name] = {
          name,
          description: tool.description,
          schema: this.validator.toJsonSchema(tool.schema)
        };
      }
    }

    return schemas;
  }

  /**
   * Add a pre-execution hook
   */
  addPreHook(hook: PreExecutionHook): void {
    this.preHooks.push(hook);
  }

  /**
   * Add a post-execution hook
   */
  addPostHook(hook: PostExecutionHook): void {
    this.postHooks.push(hook);
  }

  /**
   * Check if tool prerequisites are satisfied
   */
  private checkPrerequisites(tool: Tool): { success: boolean; reason?: string } {
    if (!tool.prerequisites || tool.prerequisites.length === 0) {
      return { success: true };
    }

    for (const prereq of tool.prerequisites) {
      if (!(prereq in this.tools)) {
        return {
          success: false,
          reason: `Required tool '${prereq}' not found`
        };
      }

      // Check if prerequisite tool has been used successfully
      const history = this.monitor.getRecentForTool(prereq, 1);
      if (history.length === 0 || history[0].result.status !== ExecutionStatus.SUCCESS) {
        return {
          success: false,
          reason: `Prerequisite tool '${prereq}' must be executed successfully first`
        };
      }
    }

    return { success: true };
  }

  /**
   * Basic intent parsing fallback
   */
  private basicParseIntent(input: string, availableTools: string[]): ParsedIntent[] {
    const results: ParsedIntent[] = [];
    const lowerInput = input.toLowerCase();

    // Simple keyword matching
    for (const toolName of availableTools) {
      const tool = this.tools[toolName];
      const keywords = tool.name.toLowerCase().split(/[\s_-]+/);

      // Check if tool keywords appear in input
      const matchScore = keywords.reduce((score, keyword) => {
        return score + (lowerInput.includes(keyword) ? 1 : 0);
      }, 0);

      if (matchScore > 0) {
        results.push({
          functionName: tool.name,
          parameters: {},
          confidence: Math.min(matchScore * 0.2, 0.9),
          reasoning: `Keyword match: ${keywords.join(', ')}`
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private intentParser?: any = undefined;
}
