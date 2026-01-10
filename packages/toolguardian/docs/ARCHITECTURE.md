# ToolGuardian Architecture

This document describes the system design, architecture decisions, and data flow of ToolGuardian.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Design Principles](#design-principles)
5. [Component Details](#component-details)
6. [Extensibility](#extensibility)

## Overview

ToolGuardian is a reliability layer for function execution in AI agents and LLM applications. It provides a unified interface for tool execution with built-in validation, retry logic, sandboxing, and monitoring.

```
┌─────────────────────────────────────────────────────────────────┐
│                         ToolGuardian                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Schema    │  │    Retry     │  │     Execution       │  │
│  │  Validator  │  │   Manager    │  │     Sandbox        │  │
│  └─────────────┘  └──────────────┘  └─────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Monitor                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### ToolGuardian (Main Class)

The central orchestrator that coordinates all components. It extends `EventEmitter` for event-driven architecture.

**Responsibilities:**
- Tool registration and management
- Execution orchestration
- Hook management
- Event emission
- Configuration management

### SchemaValidator

Validates function inputs and outputs against JSON Schema-compatible schemas.

**Responsibilities:**
- Input validation before execution
- Output validation after execution
- Schema conversion to JSON Schema format
- Human-readable error formatting

**Supported Validation Types:**
- Primitive types (string, number, boolean, array, object)
- String constraints (minLength, maxLength, pattern)
- Number constraints (minimum, maximum)
- Enum validation
- Nested object validation
- Array item validation

### RetryManager

Handles automatic retry with exponential backoff for failed executions.

**Responsibilities:**
- Retry logic with configurable attempts
- Exponential backoff calculation
- Jitter addition (prevents thundering herd)
- Retryable error detection
- Delay management

**Retry Strategy:**
```
Attempt 1: immediate
Attempt 2: initialDelay * 2^1 ± jitter
Attempt 3: initialDelay * 2^2 ± jitter
...
Attempt N: min(initialDelay * 2^(N-1), maxDelay) ± jitter
```

### ExecutionSandbox

Provides isolated execution environment with timeout protection.

**Responsibilities:**
- Timeout enforcement
- Error catching
- Memory usage estimation
- Resource limit tracking

**Protection Mechanisms:**
- Promise.race-based timeout
- Graceful error handling
- Optional memory limit tracking

### Monitor

Tracks execution metrics and maintains execution history.

**Responsibilities:**
- Metric collection (counters, timers)
- Execution history storage
- Success rate calculation
- Alert threshold checking
- History retention management

**Tracked Metrics:**
- Total executions
- Success/failure counts
- Average execution time
- Per-tool statistics
- Error rates

## Data Flow

### Execution Flow

```
┌──────────────┐
│   execute()  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. Pre-execution Checks                                       │
│     - Tool exists and enabled                                 │
│     - Before hooks                                            │
│     - Input validation (if enabled)                           │
│     - Prerequisite check                                      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Execution                                                  │
│     - Retry loop (if enabled)                                 │
│     - Sandbox timeout protection                              │
│     - Actual function execution                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Post-execution Processing                                  │
│     - Output validation (if enabled)                          │
│     - After hooks                                             │
│     - Metrics recording                                       │
│     - Event emission                                          │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
                       ┌─────────┐
                       │  Result │
                       └─────────┘
```

### Detailed Execution Steps

1. **Tool Lookup**: Retrieve tool from registry
2. **Before Hooks**: Execute registered before hooks
3. **Input Validation**: Validate parameters against schema
4. **Prerequisite Check**: Verify required tools have executed
5. **Retry Loop**: Execute with retry logic
6. **Sandbox Execution**: Run with timeout protection
7. **Output Validation**: Validate result against output schema
8. **After Hooks**: Execute registered after hooks
9. **Metrics Recording**: Update monitoring metrics
10. **Event Emission**: Emit appropriate events

## Design Principles

### 1. Separation of Concerns

Each component has a single, well-defined responsibility:
- `ToolGuardian`: Orchestration
- `SchemaValidator`: Validation
- `RetryManager`: Retry logic
- `ExecutionSandbox`: Resource protection
- `Monitor`: Metrics and history

### 2. Fail-Safe Defaults

Sensible defaults for all configurations:
- Validation enabled by default
- Retry enabled for network errors
- 30-second default timeout
- Monitoring enabled

### 3. Progressive Enhancement

Basic usage is simple, advanced features are opt-in:
```typescript
// Basic
await guardian.execute('toolName', { param: 'value' });

// Advanced
await guardian.execute('toolName', { param: 'value' }, {
  validateBeforeCall: true,
  retryOnFailure: true,
  timeout: 5000,
  monitoring: true
});
```

### 4. Event-Driven

Event emitter pattern for extensibility:
- `execution:starting`: Before execution begins
- `execution:complete`: After successful execution
- `execution:failed`: After failed execution
- `tool:registered`: When a tool is added
- `validation:failed`: When validation fails

### 5. TypeScript First

Full type safety with comprehensive type definitions:
- Generic types for input/output
- Enum types for status codes
- Strict null checks
- JSDoc comments for IDE support

## Component Details

### Hook System

Hooks allow custom logic at key execution points:

```typescript
// Before execution (all tools)
guardian.hooks.before('*', async (params, context) => {
  // Log, modify params, etc.
});

// Before execution (specific tool)
guardian.hooks.before('myTool', async (params, context) => {
  // Tool-specific logic
});

// After execution
guardian.hooks.after('*', async (result, params, context) => {
  // Process result
});

// On error
guardian.hooks.onError('myTool', async (error, params) => {
  // Handle errors
});
```

### Intent Parsing

Natural language to function call extraction:

```typescript
// Basic built-in parser
const intents = await guardian.parseIntent(
  "Get weather for Tokyo"
);
// [{ functionName: 'getWeather', parameters: { location: 'Tokyo' }, confidence: 0.8 }]

// Custom parser
const guardian = new ToolGuardian({
  tools,
  intentParser: {
    async parse(input, availableTools) {
      // Custom NLP logic
      return parsedIntents;
    }
  }
});
```

### Prerequisite System

Automatic dependency checking:

```typescript
const tools = {
  authenticate: { /* ... */ },
  fetchData: {
    prerequisites: ['authenticate'], // Must run authenticate first
    /* ... */
  },
  processData: {
    prerequisites: ['fetchData'], // Must run fetchData first
    /* ... */
  }
};
```

## Extensibility

### Custom Intent Parser

```typescript
interface IntentParser {
  parse(input: string, availableTools: string[]): Promise<ParsedIntent[]>;
}
```

### Custom Retry Logic

Override retry behavior per tool:

```typescript
const tool = {
  name: 'customRetry',
  fn: async () => { /* ... */ },
  retryConfig: {
    maxAttempts: 5,
    initialDelay: 50,
    maxDelay: 10000,
    backoffMultiplier: 3,
    retryableErrors: ['CustomError']
  }
};
```

### Custom Validation Schemas

Define complex validation rules:

```typescript
const schema = {
  input: {
    user: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, minLength: 1 },
        age: { type: SchemaType.NUMBER, minimum: 0, maximum: 150 },
        email: { type: SchemaType.STRING, pattern: /^[^@]+@[^@]+$/ }
      }
    },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING }
    }
  }
};
```

## Performance Considerations

### Memory Management

- Execution history is bounded by `maxHistorySize`
- Old entries are automatically removed based on retention period
- Memory usage is estimated for result tracking

### Concurrency

- `executeParallel()` uses `Promise.all` for concurrent execution
- Each execution is independent with its own timeout
- Shared state is minimal to prevent race conditions

### Optimization Tips

1. **Disable monitoring** in hot paths if metrics aren't needed
2. **Use parallel execution** for independent tools
3. **Adjust retry delays** based on your use case
4. **Set appropriate timeouts** to prevent hanging

## Security Considerations

### Input Validation

Always validate inputs before executing external functions:

```typescript
const tool = {
  name: 'safeTool',
  fn: async ({ url }) => {
    // Schema ensures URL starts with https://
    return fetch(url);
  },
  schema: {
    input: {
      url: {
        type: SchemaType.STRING,
        pattern: /^https:\/\//
      }
    }
  }
};
```

### Sandbox Protection

- Timeout protection prevents infinite loops
- Error catching prevents unhandled exceptions
- Memory limits prevent memory exhaustion

### Prerequisites

Use prerequisites to ensure authentication before sensitive operations:

```typescript
const sensitiveTool = {
  name: 'deleteUser',
  prerequisites: ['authenticate', 'authorize'],
  fn: async ({ userId }) => {
    // Only runs if authenticate and authorize succeeded
  }
};
```

## Future Enhancements

Potential areas for extension:

1. **Advanced Sandbox**: Web Worker-based isolation
2. **Distributed Tracing**: OpenTelemetry integration
3. **Circuit Breaker**: Automatic failure detection
4. **Result Caching**: Cache results based on inputs
5. **Tool Discovery**: Automatic tool schema detection
6. **Batch Execution**: Execute multiple calls in a single request
