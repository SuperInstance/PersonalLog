/**
 * Tests for ToolGuardian
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolGuardian, SchemaType, ExecutionStatus } from '../src/index.js';

describe('ToolGuardian', () => {
  let guardian: ToolGuardian;

  beforeEach(() => {
    guardian = new ToolGuardian();
  });

  describe('tool registration', () => {
    it('should register tools via constructor', () => {
      const tools = {
        testTool: {
          name: 'testTool',
          description: 'A test tool',
          fn: async () => ({ result: 'test' }),
          schema: { input: {} }
        }
      };

      const g = new ToolGuardian({ tools });

      expect(g.getSchemas()).toHaveProperty('testTool');
    });

    it('should register tools individually', () => {
      const tool = {
        name: 'testTool',
        description: 'A test tool',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      };

      guardian.registerTool(tool);
      const schemas = guardian.getSchemas();

      expect(schemas).toHaveProperty('testTool');
    });

    it('should unregister tools', () => {
      const tool = {
        name: 'testTool',
        description: 'A test tool',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      };

      guardian.registerTool(tool);
      expect(guardian.getSchemas()).toHaveProperty('testTool');

      guardian.unregisterTool('testTool');
      expect(guardian.getSchemas()).not.toHaveProperty('testTool');
    });

    it('should check if tool exists', () => {
      const tool = {
        name: 'testTool',
        description: 'A test tool',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      };

      expect(guardian.hasTool('testTool')).toBe(false);

      guardian.registerTool(tool);
      expect(guardian.hasTool('testTool')).toBe(true);
    });
  });

  describe('execute()', () => {
    beforeEach(() => {
      guardian.registerTool({
        name: 'echo',
        description: 'Echo input',
        fn: async ({ message }) => ({ echo: message }),
        schema: {
          input: {
            message: { type: SchemaType.STRING }
          }
        }
      });
    });

    it('should execute tool successfully', async () => {
      const result = await guardian.execute('echo', { message: 'hello' });

      expect(result.status).toBe('success');
      expect(result.result).toEqual({ echo: 'hello' });
    });

    it('should validate input parameters', async () => {
      const result = await guardian.execute('echo', {});

      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.length).toBeGreaterThan(0);
    });

    it('should use default values', async () => {
      guardian.registerTool({
        name: 'greet',
        description: 'Greet user',
        fn: async ({ name, title }) => ({ message: `Hello, ${title} ${name}` }),
        schema: {
          input: {
            name: { type: SchemaType.STRING },
            title: {
              type: SchemaType.STRING,
              enum: ['Mr', 'Ms', 'Dr'],
              default: 'Dr'
            }
          }
        }
      });

      const result = await guardian.execute('greet', { name: 'Smith' });

      expect(result.status).toBe('success');
      expect(result.result).toEqual({ message: 'Hello, Dr Smith' });
    });

    it('should handle tool errors', async () => {
      guardian.registerTool({
        name: 'failingTool',
        description: 'Always fails',
        fn: async () => {
          throw new Error('Tool failed');
        },
        schema: { input: {} }
      });

      const result = await guardian.execute('failingTool', {});

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Tool failed');
    });

    it('should track execution time', async () => {
      guardian.registerTool({
        name: 'delay',
        description: 'Delay tool',
        fn: async ({ ms }) => {
          await new Promise(resolve => setTimeout(resolve, ms));
          return { done: true };
        },
        schema: {
          input: {
            ms: { type: SchemaType.NUMBER, default: 50 }
          }
        }
      });

      const result = await guardian.execute('delay', { ms: 50 });

      expect(result.executionTime).toBeGreaterThanOrEqual(40);
    });

    it('should fail for non-existent tool', async () => {
      const result = await guardian.execute('nonExistent', {});

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('executeParallel()', () => {
    beforeEach(() => {
      guardian.registerTool({
        name: 'delayTool',
        description: 'Tool with delay',
        fn: async ({ delay, value }) => {
          await new Promise(resolve => setTimeout(resolve, delay));
          return { value };
        },
        schema: {
          input: {
            delay: { type: SchemaType.NUMBER },
            value: { type: SchemaType.STRING }
          }
        }
      });
    });

    it('should execute tools in parallel', async () => {
      const startTime = Date.now();

      const results = await guardian.executeParallel([
        { tool: 'delayTool', parameters: { delay: 50, value: 'a' } },
        { tool: 'delayTool', parameters: { delay: 50, value: 'b' } },
        { tool: 'delayTool', parameters: { delay: 50, value: 'c' } }
      ]);

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
      // Parallel execution should be faster than sequential
      expect(duration).toBeLessThan(150);
    });

    it('should return all results including failures', async () => {
      guardian.registerTool({
        name: 'failingTool',
        description: 'Fails',
        fn: async () => {
          throw new Error('Failed');
        },
        schema: { input: {} }
      });

      const results = await guardian.executeParallel([
        { tool: 'delayTool', parameters: { delay: 10, value: 'success' } },
        { tool: 'failingTool', parameters: {} }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('executeChain()', () => {
    beforeEach(() => {
      // Set up a workflow
      guardian.registerTool({
        name: 'step1',
        description: 'First step',
        fn: async () => ({ step1: true }),
        schema: { input: {} }
      });

      guardian.registerTool({
        name: 'step2',
        description: 'Second step',
        fn: async () => ({ step2: true }),
        schema: { input: {} }
      });

      guardian.registerTool({
        name: 'step3',
        description: 'Third step',
        fn: async () => ({ step3: true }),
        schema: { input: {} }
      });
    });

    it('should execute tools sequentially', async () => {
      const results = await guardian.executeChain([
        { tool: 'step1', parameters: {} },
        { tool: 'step2', parameters: {} },
        { tool: 'step3', parameters: {} }
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });

    it('should stop on first failure', async () => {
      guardian.registerTool({
        name: 'failingStep',
        description: 'Fails',
        fn: async () => {
          throw new Error('Chain broken');
        },
        schema: { input: {} }
      });

      const results = await guardian.executeChain([
        { tool: 'step1', parameters: {} },
        { tool: 'failingStep', parameters: {} },
        { tool: 'step3', parameters: {} } // Should not execute
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('retry behavior', () => {
    it('should retry on failure when configured', async () => {
      let attempts = 0;

      guardian.registerTool({
        name: 'flakyTool',
        description: 'Flaky tool',
        fn: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('ETIMEDOUT');
          }
          return { success: true };
        },
        retryConfig: {
          maxAttempts: 5,
          initialDelay: 10,
          retryableErrors: ['ETIMEDOUT']
        },
        schema: { input: {} }
      });

      const result = await guardian.execute('flakyTool', {});

      expect(result.status).toBe('success');
      expect(attempts).toBe(3);
      expect(result.retryCount).toBe(2);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;

      guardian.registerTool({
        name: 'validationTool',
        description: 'Validation tool',
        fn: async () => {
          attempts++;
          throw new Error('ValidationError');
        },
        retryConfig: {
          maxAttempts: 5,
          retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED']
        },
        schema: { input: {} }
      });

      const result = await guardian.execute('validationTool', {});

      expect(result.status).toBe('failed');
      expect(attempts).toBe(1);
      expect(result.retryCount).toBe(0);
    });
  });

  describe('sandbox behavior', () => {
    it('should timeout slow execution', async () => {
      guardian.registerTool({
        name: 'slowTool',
        description: 'Slow tool',
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 5000));
          return { done: true };
        },
        schema: { input: {} }
      });

      const result = await guardian.execute('slowTool', {}, {
        timeout: 100,
        sandbox: true
      });

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('prerequisites', () => {
    it('should check prerequisites before execution', async () => {
      guardian.registerTool({
        name: 'auth',
        description: 'Authenticate',
        fn: async () => ({ authenticated: true }),
        prerequisites: [],
        schema: { input: {} }
      });

      guardian.registerTool({
        name: 'protectedAction',
        description: 'Protected action',
        fn: async () => ({ action: 'done' }),
        prerequisites: ['auth'],
        schema: { input: {} }
      });

      // Should fail without auth
      const result1 = await guardian.execute('protectedAction', {});
      expect(result1.status).toBe('failed');

      // Should succeed after auth
      await guardian.execute('auth', {});
      const result2 = await guardian.execute('protectedAction', {});
      expect(result2.status).toBe('success');
    });
  });

  describe('monitoring', () => {
    it('should track metrics when enabled', async () => {
      const g = new ToolGuardian({ enableMonitoring: true });

      g.registerTool({
        name: 'testTool',
        description: 'Test',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      });

      await g.execute('testTool', {});

      const metrics = g.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.successfulExecutions).toBe(1);
    });

    it('should track execution history', async () => {
      const g = new ToolGuardian({ enableMonitoring: true });

      g.registerTool({
        name: 'testTool',
        description: 'Test',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      });

      await g.execute('testTool', {});
      await g.execute('testTool', {});

      const history = g.getHistory({ toolName: 'testTool' });
      expect(history).toHaveLength(2);
    });
  });

  describe('getSchemas()', () => {
    it('should return all tool schemas', () => {
      guardian.registerTool({
        name: 'tool1',
        description: 'Tool 1',
        fn: async () => ({}),
        schema: {
          input: {
            param1: { type: SchemaType.STRING }
          }
        }
      });

      guardian.registerTool({
        name: 'tool2',
        description: 'Tool 2',
        fn: async () => ({}),
        schema: {
          input: {
            param2: { type: SchemaType.NUMBER }
          }
        }
      });

      const schemas = guardian.getSchemas();

      expect(schemas).toHaveProperty('tool1');
      expect(schemas).toHaveProperty('tool2');
      expect(schemas.tool1.input).toHaveProperty('param1');
      expect(schemas.tool2.input).toHaveProperty('param2');
    });
  });

  describe('hooks', () => {
    it('should execute before hooks', async () => {
      const beforeHook = vi.fn();

      guardian.hooks.before('*', async (_params, context) => {
        beforeHook(context.toolName);
      });

      guardian.registerTool({
        name: 'testTool',
        description: 'Test',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      });

      await guardian.execute('testTool', {});

      expect(beforeHook).toHaveBeenCalledWith('testTool');
    });

    it('should execute after hooks', async () => {
      const afterHook = vi.fn();

      guardian.hooks.after('*', async (result, _params, context) => {
        afterHook(context.toolName, result.status);
      });

      guardian.registerTool({
        name: 'testTool',
        description: 'Test',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      });

      await guardian.execute('testTool', {});

      expect(afterHook).toHaveBeenCalledWith('testTool', 'success');
    });
  });

  describe('events', () => {
    it('should emit execution:complete event', async () => {
      const handler = vi.fn();

      guardian.on('execution:complete', handler);

      guardian.registerTool({
        name: 'testTool',
        description: 'Test',
        fn: async () => ({ result: 'test' }),
        schema: { input: {} }
      });

      await guardian.execute('testTool', {});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'testTool',
          status: 'success'
        })
      );
    });

    it('should emit execution:failed event', async () => {
      const handler = vi.fn();

      guardian.on('execution:failed', handler);

      guardian.registerTool({
        name: 'failingTool',
        description: 'Fails',
        fn: async () => {
          throw new Error('Failed');
        },
        schema: { input: {} }
      });

      await guardian.execute('failingTool', {});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          toolName: 'failingTool',
          error: expect.any(Error)
        })
      );
    });
  });
});
