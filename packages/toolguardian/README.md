# ToolGuardian

> Reliable function calling with validation, retry, and monitoring for AI agents and LLM applications.

ToolGuardian provides a comprehensive reliability layer for function execution, combining schema validation, automatic retry with exponential backoff, execution sandboxing, and real-time monitoring. Perfect for AI agents, LLM function calling, and any application requiring reliable tool execution.

## Features

- **Schema Validation**: JSON Schema-compatible input/output validation
- **Automatic Retry**: Exponential backoff with jitter and configurable retryable errors
- **Execution Sandbox**: Timeout protection and memory limit tracking
- **Real-time Monitoring**: Metrics, execution history, and alerting
- **Prerequisite Checking**: Automatic tool dependency validation
- **Parallel & Chain Execution**: Execute multiple tools concurrently or sequentially
- **Intent Parsing**: Natural language to function call extraction
- **Lifecycle Hooks**: Before/after/onError hooks for custom logic
- **TypeScript First**: Fully typed with comprehensive TypeScript support

## Installation

```bash
npm install @superinstance/toolguardian
# or
pnpm add @superinstance/toolguardian
# or
yarn add @superinstance/toolguardian
```

## Quick Start

```typescript
import { ToolGuardian, SchemaType } from '@superinstance/toolguardian';

// Define tools with validation schemas
const tools = {
  calculate: {
    name: 'calculate',
    description: 'Perform arithmetic operations',
    fn: async ({ a, b, operation }) => {
      switch (operation) {
        case 'add': return a + b;
        case 'multiply': return a * b;
        case 'divide': return b !== 0 ? a / b : 'Error: Division by zero';
        default: return 'Unknown operation';
      }
    },
    schema: {
      input: {
        a: { type: SchemaType.NUMBER, description: 'First number' },
        b: { type: SchemaType.NUMBER, description: 'Second number' },
        operation: {
          type: SchemaType.STRING,
          enum: ['add', 'subtract', 'multiply', 'divide']
        }
      }
    }
  },

  fetchData: {
    name: 'fetchData',
    description: 'Fetch data from API',
    fn: async ({ endpoint }) => {
      const response = await fetch(endpoint);
      return await response.json();
    },
    retryConfig: {
      maxAttempts: 3,
      initialDelay: 100,
      retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED']
    },
    schema: {
      input: {
        endpoint: {
          type: SchemaType.STRING,
          pattern: '^https?://'
        }
      }
    }
  }
};

// Create ToolGuardian instance
const guardian = new ToolGuardian({
  tools,
  enableMonitoring: true,
  defaultRetryConfig: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2
  }
});

// Execute tools
const result = await guardian.execute('calculate', {
  a: 10,
  b: 5,
  operation: 'multiply'
});

console.log(result); // { status: 'success', result: 50, executionTime: 2, ... }
```

## Usage

### Parallel Execution

Execute independent tools concurrently for improved performance:

```typescript
const results = await guardian.executeParallel([
  { tool: 'fetchUserProfile', parameters: { userId: 'user-123' } },
  { tool: 'fetchUserStats', parameters: { userId: 'user-123' } },
  { tool: 'fetchUserActivity', parameters: { userId: 'user-123' } }
]);
```

### Sequential Chaining

Execute tools in sequence with automatic prerequisite checking:

```typescript
const results = await guardian.executeChain([
  { tool: 'authenticate', parameters: { apiKey: 'sk-...' } },
  { tool: 'fetchData', parameters: {} },
  { tool: 'processData', parameters: {} }
]);
```

### Retry Configuration

Configure retry behavior per tool or globally:

```typescript
const tools = {
  flakyApi: {
    name: 'flakyApi',
    fn: async () => { /* ... */ },
    retryConfig: {
      maxAttempts: 5,
      initialDelay: 100,
      maxDelay: 2000,
      backoffMultiplier: 2,
      retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'NetworkError']
    },
    schema: { input: {} }
  }
};
```

### Monitoring and Metrics

Track execution metrics and history:

```typescript
// Get overall metrics
const metrics = guardian.getMetrics();
console.log({
  totalExecutions: metrics.totalExecutions,
  successRate: metrics.successfulExecutions / metrics.totalExecutions,
  averageTime: metrics.averageExecutionTime
});

// Get execution history
const history = guardian.getHistory({
  toolName: 'flakyApi',
  limit: 10,
  status: 'success'
});

// Get per-tool statistics
const successRate = guardian.getSuccessRate('flakyApi');
const avgTime = guardian.getAverageTime('flakyApi');
```

### Lifecycle Hooks

Execute custom logic before/after tool execution:

```typescript
guardian.hooks.before('*', async (params, context) => {
  console.log(`Executing ${context.toolName} with params:`, params);
});

guardian.hooks.after('*', async (result, params, context) => {
  console.log(`${context.toolName} completed with status: ${result.status}`);
});

guardian.hooks.onError('flakyApi', async (error, params) => {
  console.error(`flakyApi failed:`, error.message);
  // Send alert, log to external service, etc.
});
```

### Event Emitter

ToolGuardian extends EventEmitter for real-time event handling:

```typescript
guardian.on('execution:complete', (data) => {
  console.log(`✓ ${data.toolName} completed in ${data.duration}ms`);
});

guardian.on('execution:failed', (data) => {
  console.log(`✗ ${data.toolName} failed:`, data.error?.message);
});

guardian.on('execution:slow', (data) => {
  console.log(`⚠ ${data.toolName} is slow: ${data.duration}ms`);
});
```

### Intent Parsing

Extract function calls from natural language:

```typescript
const intents = await guardian.parseIntent(
  "Get the weather in Tokyo and search for sushi restaurants"
);

// Returns:
// [
//   { functionName: 'getWeather', parameters: { location: 'Tokyo' }, confidence: 0.85 },
//   { functionName: 'search', parameters: { query: 'sushi restaurants' }, confidence: 0.78 }
// ]
```

## API Reference

### ToolGuardian

| Method | Description |
|--------|-------------|
| `execute(toolName, parameters, options?)` | Execute a single tool |
| `executeParallel(calls)` | Execute multiple tools in parallel |
| `executeChain(calls)` | Execute tools sequentially |
| `parseIntent(input)` | Parse natural language to function calls |
| `executeFromDescription(input)` | Execute from natural language |
| `registerTool(tool)` | Register a new tool |
| `unregisterTool(name)` | Unregister a tool |
| `getSchemas()` | Get all tool schemas |
| `getMetrics()` | Get execution metrics |
| `getHistory(options?)` | Get execution history |
| `clearHistory()` | Clear execution history |
| `getSuccessRate(toolName)` | Get success rate for a tool |
| `getAverageTime(toolName)` | Get average execution time for a tool |

### Tool Definition

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

### Execution Options

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

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## Links

- [GitHub](https://github.com/SuperInstance/ToolGuardian)
- [Documentation](https://github.com/SuperInstance/ToolGuardian#readme)
- [Examples](./examples)
