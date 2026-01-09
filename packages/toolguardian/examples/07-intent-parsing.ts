/**
 * Example 7: Intent Parsing and Natural Language Execution
 *
 * Demonstrates natural language understanding capabilities:
 * - Intent parsing from natural language
 * - Parameter extraction
 * - Automatic tool selection
 * - Multi-intent execution
 * - Confidence scoring
 *
 * @module examples/intent-parsing
 */

import { ToolGuardian, SchemaType } from '../src/index.js';

async function intentParsing() {
  console.log('=== ToolGuardian: Intent Parsing ===\n');

  // Define a comprehensive tool set
  const tools = {
    // Weather tool
    getWeather: {
      name: 'getWeather',
      description: 'Get the current weather for a location',
      fn: async ({ location, unit = 'celsius' }) => {
        return {
          location,
          temperature: unit === 'celsius' ? 22 : 72,
          condition: 'Partly cloudy',
          humidity: 65,
          unit
        };
      },
      schema: {
        input: {
          location: {
            type: SchemaType.STRING,
            description: 'City name or location'
          },
          unit: {
            type: SchemaType.STRING,
            enum: ['celsius', 'fahrenheit'],
            default: 'celsius'
          }
        }
      }
    },

    // Calculator tool
    calculate: {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      fn: async ({ expression, a, b, operation }) => {
        if (expression) {
          try {
            // Safe evaluation of simple math expressions
            const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
            return { result: eval(sanitized), expression };
          } catch {
            return { error: 'Invalid expression', expression };
          }
        }
        if (operation && a !== undefined && b !== undefined) {
          switch (operation) {
            case 'add': return { result: a + b };
            case 'subtract': return { result: a - b };
            case 'multiply': return { result: a * b };
            case 'divide': return { result: b !== 0 ? a / b : 'Error: Division by zero' };
          }
        }
        return { error: 'Invalid parameters' };
      },
      schema: {
        input: {
          expression: {
            type: SchemaType.STRING,
            description: 'Mathematical expression like "2 + 2"'
          },
          a: { type: SchemaType.NUMBER },
          b: { type: SchemaType.NUMBER },
          operation: {
            type: SchemaType.STRING,
            enum: ['add', 'subtract', 'multiply', 'divide']
          }
        }
      }
    },

    // Search tool
    search: {
      name: 'search',
      description: 'Search for information on the web',
      fn: async ({ query, limit = 5 }) => {
        return {
          query,
          results: [
            { title: `Result 1 for "${query}"`, url: `https://example.com/1` },
            { title: `Result 2 for "${query}"`, url: `https://example.com/2` },
            { title: `Result 3 for "${query}"`, url: `https://example.com/3` }
          ].slice(0, limit),
          count: Math.min(3, limit)
        };
      },
      schema: {
        input: {
          query: {
            type: SchemaType.STRING,
            description: 'Search query'
          },
          limit: {
            type: SchemaType.NUMBER,
            description: 'Number of results',
            default: 5
          }
        }
      }
    },

    // Email tool
    sendEmail: {
      name: 'sendEmail',
      description: 'Send an email to a recipient',
      fn: async ({ to, subject, body }) => {
        return {
          sent: true,
          to,
          subject,
          messageId: `msg-${Date.now()}`
        };
      },
      schema: {
        input: {
          to: {
            type: SchemaType.STRING,
            description: 'Recipient email address',
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$'
          },
          subject: {
            type: SchemaType.STRING,
            description: 'Email subject'
          },
          body: {
            type: SchemaType.STRING,
            description: 'Email body content'
          }
        }
      }
    },

    // Time tool
    getCurrentTime: {
      name: 'getCurrentTime',
      description: 'Get the current time in a specific timezone or location',
      fn: async ({ timezone = 'UTC' }) => {
        return {
          timezone,
          currentTime: new Date().toISOString(),
          unixTimestamp: Math.floor(Date.now() / 1000)
        };
      },
      schema: {
        input: {
          timezone: {
            type: SchemaType.STRING,
            description: 'Timezone like "UTC", "America/New_York", "Asia/Tokyo"',
            default: 'UTC'
          }
        }
      }
    }
  };

  const guardian = new ToolGuardian({ tools });

  console.log('1. Simple intent parsing:\n');

  const intents1 = await guardian.parseIntent("What's the weather in Tokyo?");
  console.log('  Input: "What\'s the weather in Tokyo?"');
  console.log('  Parsed intents:');
  for (const intent of intents1) {
    console.log(`    - Tool: ${intent.toolName} (confidence: ${intent.confidence?.toFixed(2)})`);
    console.log(`      Parameters: ${JSON.stringify(intent.parameters)}`);
  }

  console.log('\n2. Executing from natural language:\n');

  const results1 = await guardian.executeFromDescription("Get weather in London");
  console.log('  Input: "Get weather in London"');
  console.log('  Result:');
  for (const result of results1) {
    console.log(`    ${result.functionName}: ${result.status}`);
    console.log(`    ${JSON.stringify(result.result)}`);
  }

  console.log('\n3. Mathematical expressions:\n');

  const mathResults = await guardian.executeFromDescription("Calculate 15 times 7");
  console.log('  Input: "Calculate 15 times 7"');
  console.log('  Result:');
  for (const result of mathResults) {
    console.log(`    ${result.functionName}: ${result.status}`);
    console.log(`    ${JSON.stringify(result.result)}`);
  }

  console.log('\n4. Multiple intents in one request:\n');

  const multiIntent = await guardian.parseIntent("Get the weather in Paris and also search for TypeScript tutorials");
  console.log('  Input: "Get the weather in Paris and also search for TypeScript tutorials"');
  console.log('  Parsed intents:');
  for (const intent of multiIntent) {
    console.log(`    - ${intent.toolName} (confidence: ${intent.confidence?.toFixed(2)})`);
    console.log(`      Parameters: ${JSON.stringify(intent.parameters)}`);
  }

  console.log('\n5. Parameter extraction with units:\n');

  const unitResults = await guardian.executeFromDescription("What's the temperature in New York in fahrenheit");
  console.log('  Input: "What\'s the temperature in New York in fahrenheit"');
  console.log('  Result:');
  for (const result of unitResults) {
    console.log(`    ${JSON.stringify(result.result)}`);
  }

  console.log('\n6. Email composition:\n');

  const emailIntent = await guardian.parseIntent("Send an email to john@example.com with subject Hello and body How are you?");
  console.log('  Input: "Send an email to john@example.com..."');
  console.log('  Parsed intent:');
  for (const intent of emailIntent) {
    console.log(`    Tool: ${intent.toolName}`);
    console.log(`    Parameters: ${JSON.stringify(intent.parameters, null, 6).split('\n').join('\n      ')}`);
  }

  console.log('\n7. Time queries:\n');

  const timeResults = await guardian.executeFromDescription("What time is it in Tokyo?");
  console.log('  Input: "What time is it in Tokyo?"');
  console.log('  Result:');
  for (const result of timeResults) {
    console.log(`    ${JSON.stringify(result.result)}`);
  }

  console.log('\n8. Low confidence handling:\n');

  const lowConfidence = await guardian.parseIntent("Do something cool");
  console.log('  Input: "Do something cool" (ambiguous)');
  console.log('  Parsed intents:');
  for (const intent of lowConfidence) {
    console.log(`    - ${intent.toolName} (confidence: ${intent.confidence?.toFixed(2)})`);
  }

  console.log('\n9. Complex search queries:\n');

  const searchResults = await guardian.executeFromDescription("Search for information about quantum computing with limit 3");
  console.log('  Input: "Search for information about quantum computing with limit 3"');
  console.log('  Result:');
  for (const result of searchResults) {
    console.log(`    Found ${result.result?.count} results`);
    if (result.result?.results) {
      for (const r of result.result.results) {
        console.log(`      - ${r.title}`);
      }
    }
  }

  console.log('\n10. All available tools:\n');

  const schemas = guardian.getSchemas();
  console.log('  Registered tools:');
  for (const [name, schema] of Object.entries(schemas)) {
    console.log(`    - ${name}`);
    console.log(`      Description: ${schema.description}`);
    console.log(`      Parameters: ${Object.keys(schema.input || {}).join(', ') || 'none'}`);
  }

  console.log('\n✓ Intent parsing demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  intentParsing().catch(console.error);
}

export { intentParsing };
