/**
 * Example 1: Basic Tool Execution
 *
 * Demonstrates the fundamental usage of ToolGuardian:
 * - Registering tools with schemas
 * - Executing tools with validation
 * - Handling execution results
 *
 * @module examples/basic-execution
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

async function basicExecution() {
  console.log('=== ToolGuardian: Basic Execution ===\n');

  // Define tools with validation schemas
  const tools = {
    // Simple greeting tool
    greet: {
      name: 'greet',
      description: 'Greet a person by name',
      fn: async ({ name, title }) => {
        return `Hello, ${title} ${name}!`;
      },
      schema: {
        input: {
          name: {
            type: SchemaType.STRING,
            description: 'Person\'s name',
            minLength: 1,
            maxLength: 100
          },
          title: {
            type: SchemaType.STRING,
            description: 'Title (Mr, Ms, Dr, etc.)',
            enum: ['Mr', 'Ms', 'Dr', 'Professor'],
            default: 'Mr'
          }
        }
      }
    },

    // Calculator tool
    calculate: {
      name: 'calculate',
      description: 'Perform basic arithmetic',
      fn: async ({ a, b, operation }) => {
        switch (operation) {
          case 'add': return a + b;
          case 'subtract': return a - b;
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
    }
  };

  // Initialize ToolGuardian
  const guardian = new ToolGuardian({
    tools,
    strictValidation: true,
    enableMonitoring: true
  });

  console.log('1. Successful tool execution:\n');

  const greetResult = await guardian.execute('greet', {
    name: 'Alice',
    title: 'Dr'
  });

  console.log(`  Status: ${greetResult.status}`);
  console.log(`  Result: ${greetResult.result}`);
  console.log(`  Execution time: ${greetResult.executionTime}ms\n`);

  console.log('2. Calculation:\n');

  const calcResult = await guardian.execute('calculate', {
    a: 10,
    b: 5,
    operation: 'multiply'
  });

  console.log(`  Status: ${calcResult.status}`);
  console.log(`  Result: 10 * 5 = ${calcResult.result}\n`);

  console.log('3. Validation error (missing required field):\n');

  const invalidResult = await guardian.execute('greet', {
    // Missing 'name' field
    title: 'Dr'
  });

  console.log(`  Status: ${invalidResult.status}`);
  console.log(`  Error: ${invalidResult.error?.message}\n`);

  console.log('4. Validation error (invalid enum value):\n');

  const invalidEnumResult = await guardian.execute('greet', {
    name: 'Bob',
    title: 'Sir' // Not in enum
  });

  console.log(`  Status: ${invalidEnumResult.status}`);
  console.log(`  Validation errors: ${invalidEnumResult.validationErrors?.length}\n`);

  console.log('5. Get metrics:\n');

  const metrics = guardian.getMetrics();
  console.log(`  Total executions: ${metrics.totalExecutions}`);
  console.log(`  Successful: ${metrics.successfulExecutions}`);
  console.log(`  Failed: ${metrics.failedExecutions}`);
  console.log(`  Average time: ${metrics.averageExecutionTime.toFixed(2)}ms\n`);

  console.log('6. Tool schemas:\n');

  const schemas = guardian.getSchemas();
  console.log('  Available tools:', Object.keys(schemas).join(', '));
  console.log('\n  greet schema:');
  console.log(JSON.stringify(schemas.greet, null, 2));

  console.log('\n✓ Basic execution demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  basicExecution().catch(console.error);
}

export { basicExecution };
