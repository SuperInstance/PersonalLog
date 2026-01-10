# ToolGuardian User Guide

This guide will help you get started with ToolGuardian and use it effectively in your projects.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Defining Tools](#defining-tools)
3. [Schema Validation](#schema-validation)
4. [Error Handling](#error-handling)
5. [Advanced Features](#advanced-features)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
npm install @superinstance/toolguardian
```

### Basic Setup

```typescript
import { ToolGuardian, SchemaType } from '@superinstance/toolguardian';

// Create a ToolGuardian instance
const guardian = new ToolGuardian({
  enableMonitoring: true,
  defaultRetryConfig: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000
  }
});
```

### Your First Tool

```typescript
// Define a simple tool
const tools = {
  greet: {
    name: 'greet',
    description: 'Greet someone by name',
    fn: async ({ name }) => {
      return `Hello, ${name}!`;
    },
    schema: {
      input: {
        name: {
          type: SchemaType.STRING,
          minLength: 1,
          description: 'Name to greet'
        }
      }
    }
  }
};

// Register and execute
guardian.registerTool(tools.greet);

const result = await guardian.execute('greet', { name: 'World' });
console.log(result.result); // "Hello, World!"
```

## Defining Tools

### Tool Structure

Every tool has the following structure:

```typescript
const myTool = {
  name: 'toolName',           // Unique identifier
  description: 'What it does', // Help text for LLMs
  fn: async (params) => {      // The function to execute
    // Your logic here
    return result;
  },
  schema: {                     // Optional validation
    input: {
      paramName: {
        type: SchemaType.STRING,
        description: 'Parameter description'
      }
    }
  },
  retryConfig: { /* ... */ },   // Optional retry settings
  prerequisites: [],            // Optional required tools
  timeout: 30000,               // Optional timeout override
  enabled: true                 // Enable/disable tool
};
```

### Tool Examples

#### HTTP API Tool

```typescript
const fetchWeather = {
  name: 'fetchWeather',
  description: 'Get current weather for a location',
  fn: async ({ location }) => {
    const response = await fetch(
      `https://api.weather.example.com?location=${encodeURIComponent(location)}`
    );
    if (!response.ok) {
      throw new Error(`Weather API failed: ${response.status}`);
    }
    return await response.json();
  },
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 200,
    retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']
  },
  schema: {
    input: {
      location: {
        type: SchemaType.STRING,
        minLength: 2,
        description: 'City name or zip code'
      }
    }
  }
};
```

#### Database Operation Tool

```typescript
const getUser = {
  name: 'getUser',
  description: 'Retrieve user from database',
  fn: async ({ userId }) => {
    // Simulated database query
    const user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  },
  timeout: 5000, // Shorter timeout for DB queries
  schema: {
    input: {
      userId: {
        type: SchemaType.STRING,
        pattern: /^[a-z0-9-]+$/,
        description: 'User ID in format xxx-xxx-xxx'
      }
    },
    output: {
      id: { type: SchemaType.STRING },
      name: { type: SchemaType.STRING },
      email: { type: SchemaType.STRING }
    }
  }
};
```

## Schema Validation

### Basic Types

```typescript
const schema = {
  input: {
    stringField: { type: SchemaType.STRING },
    numberField: { type: SchemaType.NUMBER },
    booleanField: { type: SchemaType.BOOLEAN },
    arrayField: { type: SchemaType.ARRAY },
    objectField: { type: SchemaType.OBJECT },
    anyField: { type: SchemaType.ANY }
  }
};
```

### String Constraints

```typescript
const schema = {
  input: {
    username: {
      type: SchemaType.STRING,
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/,
      description: 'Username for account creation'
    },
    email: {
      type: SchemaType.STRING,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      description: 'Valid email address'
    },
    role: {
      type: SchemaType.STRING,
      enum: ['admin', 'user', 'guest'],
      description: 'User role'
    }
  }
};
```

### Number Constraints

```typescript
const schema = {
  input: {
    age: {
      type: SchemaType.NUMBER,
      minimum: 0,
      maximum: 150,
      description: 'Age in years'
    },
    price: {
      type: SchemaType.NUMBER,
      minimum: 0,
      description: 'Price in USD'
    }
  }
};
```

### Array and Object Schemas

```typescript
const schema = {
  input: {
    tags: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        minLength: 1
      },
      description: 'List of tags'
    },
    user: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        age: { type: SchemaType.NUMBER }
      }
    }
  }
};
```

## Error Handling

### Understanding Execution Results

Every execution returns an `ExecutionResult`:

```typescript
interface ExecutionResult {
  status: ExecutionStatus;        // 'success', 'validation_error', etc.
  result?: any;                   // The actual result if successful
  error?: Error;                  // Error object if failed
  validationErrors?: ValidationError[]; // Validation errors
  retryCount?: number;            // Number of retries attempted
  executionTime?: number;         // Execution time in milliseconds
  functionName?: string;          // Name of the executed function
  memoryUsed?: number;            // Estimated memory usage
}
```

### Handling Different Error Types

```typescript
const result = await guardian.execute('myTool', { param: 'value' });

switch (result.status) {
  case 'success':
    console.log('Success:', result.result);
    break;

  case 'validation_error':
    console.error('Validation failed:');
    result.validationErrors?.forEach(err => {
      console.error(`  ${err.path}: ${err.message}`);
    });
    break;

  case 'prerequisite_error':
    console.error('Prerequisites not met:', result.error?.message);
    break;

  case 'timeout':
    console.error('Execution timed out');
    break;

  case 'failed':
    console.error('Execution failed:', result.error?.message);
    break;
}
```

## Advanced Features

### Parallel Execution

Execute multiple independent tools concurrently:

```typescript
const results = await guardian.executeParallel([
  { tool: 'fetchUserProfile', parameters: { userId: '123' } },
  { tool: 'fetchUserPosts', parameters: { userId: '123' } },
  { tool: 'fetchUserStats', parameters: { userId: '123' } }
]);
```

### Sequential Chaining

Execute tools in order where each depends on the previous:

```typescript
const results = await guardian.executeChain([
  { tool: 'authenticate', parameters: { apiKey: 'sk-...' } },
  { tool: 'fetchUserData', parameters: {} },
  { tool: 'processData', parameters: {} }
]);
```

### Lifecycle Hooks

Run custom code before or after execution:

```typescript
guardian.hooks.before('*', async (params, context) => {
  console.log(`Starting ${context.toolName}`);
});

guardian.hooks.after('*', async (result, params, context) => {
  if (result.status === 'success') {
    console.log(`${context.toolName} completed in ${result.executionTime}ms`);
  }
});

guardian.hooks.onError('apiCall', async (error, params) => {
  await logError('apiCall', error, params);
});
```

### Metrics and Monitoring

```typescript
// Get overall metrics
const metrics = guardian.getMetrics();

// Get tool-specific metrics
const successRate = guardian.getSuccessRate('myTool');
const avgTime = guardian.getAverageTime('myTool');

// Get execution history
const history = guardian.getHistory({
  toolName: 'myTool',
  limit: 10
});
```

## Best Practices

1. **Always Define Schemas**: Prevent invalid inputs
2. **Use Descriptive Names**: Help LLMs understand your tools
3. **Set Appropriate Timeouts**: Prevent hanging operations
4. **Configure Retry for Network Operations**: Handle transient failures
5. **Use Prerequisites**: Ensure correct execution order
6. **Enable Monitoring in Production**: Track performance and errors
7. **Handle Errors Gracefully**: Provide user-friendly error messages

## Troubleshooting

### Tools Not Executing

Check if tool is registered and enabled:

```typescript
console.log(guardian.hasTool('toolName')); // true/false
```

### Validation Errors

Review the schema and check for missing required fields:

```typescript
const result = await guardian.execute('tool', params);
if (result.status === 'validation_error') {
  console.table(result.validationErrors);
}
```

### Timeouts

Increase timeout for the tool or in execution options:

```typescript
await guardian.execute('tool', params, { timeout: 60000 });
```

For more help, see the [API Reference](./API.md) or [Architecture](./ARCHITECTURE.md) documentation.
