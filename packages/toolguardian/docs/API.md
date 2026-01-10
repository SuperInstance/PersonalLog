# ToolGuardian API Reference

Complete API documentation for ToolGuardian.

## Table of Contents

1. [Classes](#classes)
2. [Interfaces](#interfaces)
3. [Enums](#enums)
4. [Type Aliases](#type-aliases)
5. [Functions](#functions)

## Classes

### ToolGuardian

Main class for tool execution and management.

Extends: `EventEmitter`

#### Constructor

```typescript
constructor(config?: ToolGuardianConfig)
```

**Parameters:**
- `config` - Configuration object (optional)

**Example:**
```typescript
const guardian = new ToolGuardian({
  tools: { /* ... */ },
  enableMonitoring: true,
  defaultRetryConfig: {
    maxAttempts: 3,
    initialDelay: 100
  }
});
```

#### Methods

##### execute()

Execute a single tool.

```typescript
async execute(
  toolName: string,
  parameters: Record<string, any>,
  options?: ExecutionOptions
): Promise<ExecutionResult>
```

**Parameters:**
- `toolName` - Name of the tool to execute
- `parameters` - Input parameters for the tool
- `options` - Execution options (optional)

**Returns:** `Promise<ExecutionResult>`

**Example:**
```typescript
const result = await guardian.execute('calculate', {
  a: 10,
  b: 5,
  operation: 'add'
});

if (result.status === 'success') {
  console.log(result.result); // 15
}
```

##### executeParallel()

Execute multiple tools concurrently.

```typescript
async executeParallel(
  calls: Array<{
    tool: string;
    parameters: Record<string, any>;
    options?: ExecutionOptions;
  }>
): Promise<ExecutionResult[]>
```

**Parameters:**
- `calls` - Array of tool calls to execute in parallel

**Returns:** `Promise<ExecutionResult[]>`

**Example:**
```typescript
const results = await guardian.executeParallel([
  { tool: 'fetchUser', parameters: { id: '123' } },
  { tool: 'fetchPosts', parameters: { userId: '123' } }
]);
```

##### executeChain()

Execute tools sequentially with automatic prerequisite checking.

```typescript
async executeChain(
  calls: Array<{
    tool: string;
    parameters: Record<string, any>;
    options?: ExecutionOptions;
  }>
): Promise<ExecutionResult[]>
```

**Parameters:**
- `calls` - Array of tool calls to execute in order

**Returns:** `Promise<ExecutionResult[]>` - Stops on first failure

**Example:**
```typescript
const results = await guardian.executeChain([
  { tool: 'authenticate', parameters: { apiKey: 'sk-...' } },
  { tool: 'fetchData', parameters: {} },
  { tool: 'process', parameters: {} }
]);
```

##### parseIntent()

Parse natural language into function calls.

```typescript
async parseIntent(input: string): Promise<ParsedIntent[]>
```

**Parameters:**
- `input` - Natural language input

**Returns:** `Promise<ParsedIntent[]>`

**Example:**
```typescript
const intents = await guardian.parseIntent('Get weather for Tokyo');
// [{ functionName: 'getWeather', parameters: { location: 'Tokyo' }, confidence: 0.8 }]
```

##### executeFromDescription()

Execute tools based on natural language description.

```typescript
async executeFromDescription(
  input: string,
  options?: ExecutionOptions
): Promise<ExecutionResult[]>
```

**Parameters:**
- `input` - Natural language description
- `options` - Execution options (optional)

**Returns:** `Promise<ExecutionResult[]>`

##### registerTool()

Register a new tool.

```typescript
registerTool(tool: Tool): void
```

**Parameters:**
- `tool` - Tool definition

**Example:**
```typescript
guardian.registerTool({
  name: 'myTool',
  description: 'My custom tool',
  fn: async ({ param }) => {
    return `Result: ${param}`;
  },
  schema: {
    input: {
      param: { type: SchemaType.STRING }
    }
  }
});
```

##### unregisterTool()

Unregister a tool.

```typescript
unregisterTool(name: string): boolean
```

**Parameters:**
- `name` - Name of the tool to unregister

**Returns:** `boolean` - True if tool was found and removed

##### hasTool()

Check if a tool exists and is enabled.

```typescript
hasTool(name: string): boolean
```

**Parameters:**
- `name` - Name of the tool

**Returns:** `boolean`

##### getTool()

Get a tool definition by name.

```typescript
getTool(name: string): Tool | undefined
```

**Parameters:**
- `name` - Name of the tool

**Returns:** `Tool | undefined`

##### getTools()

Get all registered tools.

```typescript
getTools(): Record<string, Tool>
```

**Returns:** `Record<string, Tool>` - Copy of tools registry

##### getSchemas()

Get all tool schemas in JSON Schema format.

```typescript
getSchemas(): Record<string, Record<string, any>>
```

**Returns:** Tool schemas for use with LLM function calling

**Example:**
```typescript
const schemas = guardian.getSchemas();
// Use with OpenAI function calling
const response = await openai.chat.completions.create({
  functions: Object.values(schemas),
  // ...
});
```

##### getMetrics()

Get execution metrics.

```typescript
getMetrics(): MonitoringMetrics
```

**Returns:** `MonitoringMetrics`

**Example:**
```typescript
const metrics = guardian.getMetrics();
console.log({
  total: metrics.totalExecutions,
  successRate: metrics.successfulExecutions / metrics.totalExecutions,
  averageTime: metrics.averageExecutionTime
});
```

##### getHistory()

Get execution history.

```typescript
getHistory(options?: {
  limit?: number;
  toolName?: string;
  status?: ExecutionStatus;
  startTime?: number;
  endTime?: number;
}): ExecutionHistory[]
```

**Parameters:**
- `options` - Filter options (optional)

**Returns:** `ExecutionHistory[]`

**Example:**
```typescript
// Get last 10 executions for a tool
const history = guardian.getHistory({
  toolName: 'myTool',
  limit: 10
});

// Get failed executions in the last hour
const failures = guardian.getHistory({
  status: ExecutionStatus.FAILED,
  startTime: Date.now() - 3600000
});
```

##### clearHistory()

Clear execution history.

```typescript
clearHistory(): void
```

##### getSuccessRate()

Get success rate for a specific tool.

```typescript
getSuccessRate(toolName: string): number
```

**Parameters:**
- `toolName` - Name of the tool

**Returns:** `number` - Success rate between 0 and 1

##### getAverageTime()

Get average execution time for a specific tool.

```typescript
getAverageTime(toolName: string): number
```

**Parameters:**
- `toolName` - Name of the tool

**Returns:** `number` - Average time in milliseconds

##### setAlertThresholds()

Set alert thresholds for monitoring.

```typescript
setAlertThresholds(thresholds: {
  slowExecution?: number;
  lowSuccessRate?: number;
  highFailureRate?: number;
}): void
```

**Parameters:**
- `thresholds` - Threshold values

**Example:**
```typescript
guardian.setAlertThresholds({
  slowExecution: 5000,
  lowSuccessRate: 0.8
});
```

##### setRetentionPeriod()

Set history retention period.

```typescript
setRetentionPeriod(ms: number): void
```

**Parameters:**
- `ms` - Retention period in milliseconds

##### addPreHook()

Add a pre-execution hook.

```typescript
addPreHook(hook: PreExecutionHook): void
```

##### addPostHook()

Add a post-execution hook.

```typescript
addPostHook(hook: PostExecutionHook): void
```

#### Properties

##### hooks

Hook registry for lifecycle hooks.

```typescript
readonly hooks: {
  before: (toolName: string | '*', fn: HookFn) => void;
  after: (toolName: string | '*', fn: HookFn) => void;
  onError: (toolName: string | '*', fn: ErrorHookFn) => void;
  remove: (type: 'before' | 'after' | 'onError', toolName: string) => void;
  getHooks: (type: 'before' | 'after' | 'onError', toolName: string) => Function[];
}
```

**Example:**
```typescript
guardian.hooks.before('*', async (params, context) => {
  console.log(`Executing ${context.toolName}`);
});

guardian.hooks.after('myTool', async (result, params) => {
  console.log(`Completed with status: ${result.status}`);
});

guardian.hooks.onError('*', async (error, params) => {
  console.error('Error:', error.message);
});
```

#### Events

ToolGuardian extends EventEmitter and emits the following events:

| Event | Data | Description |
|-------|------|-------------|
| `execution:starting` | `{ toolName, parameters, startTime }` | Before execution starts |
| `execution:complete` | `{ toolName, status, duration, result }` | After successful execution |
| `execution:failed` | `{ toolName, status, duration, error }` | After failed execution |
| `validation:failed` | `{ toolName, errors }` | When validation fails |
| `tool:registered` | `{ tool }` | When a tool is registered |
| `tool:unregistered` | `{ tool }` | When a tool is unregistered |
| `alert` | `{ type, message, data }` | When threshold is exceeded |

**Example:**
```typescript
guardian.on('execution:complete', (data) => {
  console.log(`${data.toolName} completed in ${data.duration}ms`);
});
```

### SchemaValidator

Validates function inputs and outputs against schemas.

#### Constructor

```typescript
constructor(strictMode: boolean = false)
```

#### Methods

##### validate()

Validate input against schema.

```typescript
validate(
  input: any,
  schema: FunctionSchema,
  requiredFields?: string[]
): ValidationError[]
```

##### validateOutput()

Validate output against schema.

```typescript
validateOutput(
  output: any,
  schema: FunctionSchema
): ValidationError[]
```

##### formatErrors()

Format validation errors into human-readable string.

```typescript
formatErrors(errors: ValidationError[]): string
```

##### toJsonSchema()

Convert schema to JSON Schema format.

```typescript
toJsonSchema(functionSchema: FunctionSchema): Record<string, any>
```

### RetryManager

Handles automatic retry with exponential backoff.

#### Constructor

```typescript
constructor(config: Partial<RetryConfig> = {})
```

#### Methods

##### execute()

Execute a function with retry logic.

```typescript
async execute<T>(
  fn: () => Promise<T> | T,
  context?: { toolName?: string; params?: Record<string, any> }
): Promise<ExecutionResult<T>>
```

##### updateConfig()

Update retry configuration.

```typescript
updateConfig(updates: Partial<RetryConfig>): void
```

##### getConfig()

Get current configuration.

```typescript
getConfig(): Readonly<Required<RetryConfig>>
```

### ExecutionSandbox

Sandboxed execution environment with timeout protection.

#### Constructor

```typescript
constructor(config: Partial<SandboxConfig> = {})
```

#### Methods

##### execute()

Execute a function in the sandbox.

```typescript
async execute<T>(
  fn: () => Promise<T> | T,
  options?: ExecutionSandboxOptions
): Promise<ExecutionResult<T>>
```

##### executeWithMemoryLimit()

Execute with memory limit tracking.

```typescript
async executeWithMemoryLimit<T>(
  fn: () => Promise<T> | T,
  memoryLimit: number,
  context?: { toolName?: string }
): Promise<ExecutionResult<T>>
```

##### updateConfig()

Update sandbox configuration.

```typescript
updateConfig(updates: Partial<SandboxConfig>): void
```

##### getConfig()

Get current configuration.

```typescript
getConfig(): SandboxConfig
```

### Monitor

Tracks execution metrics and maintains history.

#### Constructor

```typescript
constructor(maxHistorySize?: number)
```

#### Methods

##### record()

Record an execution result.

```typescript
record(result: ExecutionResult, toolName: string): void
```

##### getMetrics()

Get execution metrics.

```typescript
getMetrics(): MonitoringMetrics
```

##### getHistory()

Get execution history.

```typescript
getHistory(options?: {
  limit?: number;
  toolName?: string;
  status?: ExecutionStatus;
}): ExecutionHistory[]
```

##### clearHistory()

Clear execution history.

```typescript
clearHistory(): void
```

##### getSuccessRate()

Get success rate for a tool.

```typescript
getSuccessRate(toolName: string): number
```

##### getAverageTime()

Get average execution time for a tool.

```typescript
getAverageTime(toolName: string): number
```

##### setAlertThresholds()

Set alert thresholds.

```typescript
setAlertThresholds(thresholds: {
  slowExecution?: number;
  lowSuccessRate?: number;
  highFailureRate?: number;
}): void
```

##### setRetentionPeriod()

Set history retention period.

```typescript
setRetentionPeriod(ms: number): void
```

## Interfaces

### Tool

Definition of a tool/function.

```typescript
interface Tool<TInput = any, TOutput = any> {
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
```

### FunctionSchema

Input/output schema for a function.

```typescript
interface FunctionSchema {
  input?: Record<string, PropertySchema>;
  output?: Record<string, PropertySchema>;
  inputRequired?: string[];
}
```

### PropertySchema

Schema definition for a property.

```typescript
interface PropertySchema {
  type: SchemaType | SchemaType[];
  description?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: RegExp;
  enum?: any[];
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
  default?: any;
}
```

### ExecutionResult

Result of a function execution.

```typescript
interface ExecutionResult<T = any> {
  status: ExecutionStatus;
  result?: T;
  error?: Error;
  validationErrors?: ValidationError[];
  retryCount?: number;
  executionTime?: number;
  functionName?: string;
  memoryUsed?: number;
}
```

### ValidationError

Validation error details.

```typescript
interface ValidationError {
  path: string;
  message: string;
  value?: any;
  expected?: string;
}
```

### RetryConfig

Retry strategy configuration.

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  jitter: boolean;
}
```

### SandboxConfig

Sandbox configuration.

```typescript
interface SandboxConfig {
  timeout: number;
  maxMemory?: number;
  allowedGlobals?: string[];
  catchErrors: boolean;
  restrictNetwork?: boolean;
}
```

### ExecutionOptions

Options for a single execution.

```typescript
interface ExecutionOptions {
  validateBeforeCall?: boolean;
  retryOnFailure?: boolean;
  sandbox?: boolean | Partial<SandboxConfig>;
  timeout?: number;
  monitoring?: boolean;
  throwOnError?: boolean;
  context?: Record<string, any>;
}
```

### ToolGuardianConfig

Configuration for ToolGuardian.

```typescript
interface ToolGuardianConfig {
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
```

### ParsedIntent

Result of intent parsing.

```typescript
interface ParsedIntent {
  functionName: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning?: string;
}
```

### MonitoringMetrics

Monitoring metrics.

```typescript
interface MonitoringMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  retriedExecutions: number;
  slowExecutions?: number;
  averageExecutionTime: number;
  functionCallCounts: Record<string, number>;
  errorRates: Record<string, number>;
}
```

### ExecutionHistory

Execution history entry.

```typescript
interface ExecutionHistory {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  result: ExecutionResult;
  timestamp: number;
  duration: number;
  retryCount: number;
}
```

### IntentParser

Parser for extracting function calls from natural language.

```typescript
interface IntentParser {
  parse(input: string, availableTools: string[]): Promise<ParsedIntent[]>;
}
```

## Enums

### ExecutionStatus

Status of a function execution.

```typescript
enum ExecutionStatus {
  SUCCESS = 'success',
  VALIDATION_ERROR = 'validation_error',
  PREREQUISITE_ERROR = 'prerequisite_error',
  EXECUTION_ERROR = 'execution_error',
  TIMEOUT = 'timeout',
  RETRIED = 'retried',
  FAILED = 'failed'
}
```

### SchemaType

Types for schema validation.

```typescript
enum SchemaType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  NULL = 'null',
  ANY = 'any'
}
```

## Type Aliases

```typescript
type ToolRegistry = Record<string, Tool>;
```

## Events

ToolGuardian emits the following EventEmitter events:

| Event | Payload | Description |
|-------|---------|-------------|
| `execution:starting` | `{ toolName: string, parameters: any, startTime: number }` | Before execution |
| `execution:complete` | `{ toolName: string, status: string, duration: number, result: any }` | After success |
| `execution:failed` | `{ toolName: string, status: string, duration: number, error?: Error }` | After failure |
| `validation:failed` | `{ toolName: string, errors: ValidationError[] }` | Validation failed |
| `tool:registered` | `{ tool: string }` | Tool registered |
| `tool:unregistered` | `{ tool: string }` | Tool unregistered |
| `alert` | `{ type: string, message: string, data: any }` | Alert triggered |

Monitor emits the following events:

| Event | Payload | Description |
|-------|---------|-------------|
| `threshold:exceeded` | `{ type: string, threshold: number, actual: number, toolName?: string }` | Threshold exceeded |
