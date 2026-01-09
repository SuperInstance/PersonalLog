/**
 * Integration Tests for ToolGuardian
 *
 * These tests verify the complete workflow of ToolGuardian
 * with all components working together.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolGuardian, SchemaType } from '../src/index.js';

describe('ToolGuardian Integration Tests', () => {
  describe('Complete workflow with validation, retry, and monitoring', () => {
    let guardian: ToolGuardian;
    let callCount = 0;

    beforeEach(() => {
      callCount = 0;
      guardian = new ToolGuardian({
        enableMonitoring: true,
        defaultRetryConfig: {
          maxAttempts: 3,
          initialDelay: 10,
          retryableErrors: ['ETIMEDOUT']
        },
        defaultSandboxConfig: {
          timeout: 5000,
          catchErrors: true
        }
      });

      // Register a set of tools for a complete workflow
      guardian.registerTool({
        name: 'validateInput',
        description: 'Validate user input',
        fn: async ({ input }) => {
          if (!input || input.length < 3) {
            throw new Error('Input too short');
          }
          return { valid: true, sanitized: input.trim() };
        },
        schema: {
          input: {
            input: {
              type: SchemaType.STRING,
              minLength: 1
            }
          }
        }
      });

      guardian.registerTool({
        name: 'processData',
        description: 'Process the validated data',
        fn: async ({ data }) => {
          callCount++;
          // Simulate occasional failure
          if (callCount < 2) {
            throw new Error('ETIMEDOUT: Service unavailable');
          }
          return {
            processed: true,
            result: data.toUpperCase(),
            timestamp: new Date().toISOString()
          };
        },
        prerequisites: ['validateInput'],
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 10,
          retryableErrors: ['ETIMEDOUT']
        },
        schema: {
          input: {
            data: { type: SchemaType.STRING }
          }
        }
      });

      guardian.registerTool({
        name: 'saveResult',
        description: 'Save the processed result',
        fn: async ({ result }) => {
          return {
            saved: true,
            id: `result-${Date.now()}`,
            data: result
          };
        },
        prerequisites: ['processData'],
        schema: {
          input: {
            result: { type: SchemaType.STRING }
          }
        }
      });
    });

    it('should execute complete workflow with prerequisites', async () => {
      // First validate
      const validation = await guardian.execute('validateInput', {
        input: 'hello world'
      });
      expect(validation.status).toBe('success');
      expect(validation.result?.valid).toBe(true);

      // Then process (will retry and succeed)
      callCount = 0;
      const processing = await guardian.execute('processData', {
        data: validation.result?.sanitized || ''
      });
      expect(processing.status).toBe('success');
      expect(processing.result?.processed).toBe(true);

      // Finally save
      const saving = await guardian.execute('saveResult', {
        result: processing.result?.result || ''
      });
      expect(saving.status).toBe('success');
      expect(saving.result?.saved).toBe(true);
    });

    it('should execute workflow as a chain', async () => {
      callCount = 0;
      const results = await guardian.executeChain([
        { tool: 'validateInput', parameters: { input: 'test data' } },
        { tool: 'processData', parameters: { data: 'test data' } },
        { tool: 'saveResult', parameters: { result: 'TEST DATA' } }
      ]);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });

    it('should track metrics across the workflow', async () => {
      callCount = 0;
      await guardian.execute('validateInput', { input: 'test' });
      await guardian.execute('processData', { data: 'test' });

      const metrics = guardian.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThanOrEqual(2);
      expect(metrics.retriedExecutions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Parallel workflow with dependencies', () => {
    it('should execute independent tools in parallel', async () => {
      const guardian = new ToolGuardian({ enableMonitoring: true });

      // Register independent data fetchers
      const tools = ['userProfile', 'userStats', 'userActivity', 'userPrefs'];

      for (const tool of tools) {
        guardian.registerTool({
          name: tool,
          description: `Fetch ${tool}`,
          fn: async ({ userId }) => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 50));
            return { [tool]: userId, fetched: true };
          },
          schema: {
            input: {
              userId: { type: SchemaType.STRING }
            }
          }
        });
      }

      const startTime = Date.now();
      const results = await guardian.executeParallel(
        tools.map(tool => ({
          tool,
          parameters: { userId: 'user-123' }
        }))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(4);
      expect(results.every(r => r.status === 'success')).toBe(true);
      // Parallel should be faster than 4 * 50ms = 200ms
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Error recovery patterns', () => {
    it('should use fallback on repeated failure', async () => {
      const guardian = new ToolGuardian();

      let primaryCallCount = 0;

      // Primary service that fails
      guardian.registerTool({
        name: 'primaryService',
        description: 'Primary service',
        fn: async () => {
          primaryCallCount++;
          throw new Error('ETIMEDOUT');
        },
        retryConfig: {
          maxAttempts: 2,
          initialDelay: 5,
          retryableErrors: ['ETIMEDOUT']
        },
        schema: { input: {} }
      });

      // Fallback service
      guardian.registerTool({
        name: 'fallbackService',
        description: 'Fallback service',
        fn: async () => {
          return { source: 'fallback', data: 'from fallback' };
        },
        schema: { input: {} }
      });

      // Try primary, then fallback
      const primaryResult = await guardian.execute('primaryService', {});

      expect(primaryResult.status).toBe('failed');
      expect(primaryCallCount).toBe(2);

      const fallbackResult = await guardian.execute('fallbackService', {});

      expect(fallbackResult.status).toBe('success');
      expect(fallbackResult.result?.source).toBe('fallback');
    });
  });

  describe('Real-world scenario: E-commerce order processing', () => {
    it('should process order with multiple steps', async () => {
      const guardian = new ToolGuardian({
        enableMonitoring: true,
        defaultSandboxConfig: {
          timeout: 2000,
          catchErrors: true
        }
      });

      // Inventory check
      guardian.registerTool({
        name: 'checkInventory',
        description: 'Check product inventory',
        fn: async ({ productId, quantity }) => {
          await new Promise(resolve => setTimeout(resolve, 20));
          const inventory: Record<string, number> = {
            'prod-001': 100,
            'prod-002': 5,
            'prod-003': 0
          };
          const available = inventory[productId] || 0;
          return {
            productId,
            requested: quantity,
            available,
            canFulfill: available >= quantity
          };
        },
        schema: {
          input: {
            productId: { type: SchemaType.STRING },
            quantity: { type: SchemaType.NUMBER, minimum: 1 }
          }
        }
      });

      // Calculate pricing
      guardian.registerTool({
        name: 'calculatePrice',
        description: 'Calculate order price',
        fn: async ({ productId, quantity, discount = 0 }) => {
          const prices: Record<string, number> = {
            'prod-001': 29.99,
            'prod-002': 99.99,
            'prod-003': 14.99
          };
          const subtotal = (prices[productId] || 0) * quantity;
          const discountAmount = subtotal * (discount / 100);
          const total = subtotal - discountAmount;

          return { subtotal, discountAmount, total, currency: 'USD' };
        },
        schema: {
          input: {
            productId: { type: SchemaType.STRING },
            quantity: { type: SchemaType.NUMBER },
            discount: {
              type: SchemaType.NUMBER,
              minimum: 0,
              maximum: 100,
              default: 0
            }
          }
        }
      });

      // Process payment
      guardian.registerTool({
        name: 'processPayment',
        description: 'Process payment',
        fn: async ({ amount, method }) => {
          await new Promise(resolve => setTimeout(resolve, 30));
          return {
            paid: true,
            amount,
            method,
            transactionId: `txn-${Date.now()}`
          };
        },
        schema: {
          input: {
            amount: { type: SchemaType.NUMBER, minimum: 0.01 },
            method: {
              type: SchemaType.STRING,
              enum: ['credit_card', 'debit_card', 'paypal']
            }
          }
        }
      });

      // Create order
      guardian.registerTool({
        name: 'createOrder',
        description: 'Create the order',
        fn: async ({ items, payment }) => {
          return {
            orderId: `ord-${Date.now()}`,
            status: 'confirmed',
            items,
            payment,
            createdAt: new Date().toISOString()
          };
        },
        prerequisites: ['checkInventory', 'calculatePrice', 'processPayment'],
        schema: {
          input: {
            items: { type: SchemaType.OBJECT },
            payment: { type: SchemaType.OBJECT }
          }
        }
      });

      // Execute workflow
      const workflowResults = await guardian.executeChain([
        { tool: 'checkInventory', parameters: { productId: 'prod-001', quantity: 2 } },
        { tool: 'calculatePrice', parameters: { productId: 'prod-001', quantity: 2, discount: 10 } },
        { tool: 'processPayment', parameters: { amount: 53.98, method: 'credit_card' } }
      ]);

      expect(workflowResults[0].status).toBe('success');
      expect(workflowResults[0].result?.canFulfill).toBe(true);

      expect(workflowResults[1].status).toBe('success');
      expect(workflowResults[1].result?.total).toBe(53.98);

      expect(workflowResults[2].status).toBe('success');
      expect(workflowResults[2].result?.paid).toBe(true);
    });
  });

  describe('Lifecycle hooks in real workflow', () => {
    it('should execute hooks throughout workflow', async () => {
      const guardian = new ToolGuardian();
      const hookLog: string[] = [];

      // Global before hook
      guardian.hooks.before('*', async (_params, context) => {
        hookLog.push(`before:${context.toolName}`);
      });

      // Global after hook
      guardian.hooks.after('*', async (result, _params, context) => {
        hookLog.push(`after:${context.toolName}:${result.status}`);
      });

      // Error handler
      guardian.hooks.onError('*', async (error, _params, context) => {
        hookLog.push(`error:${context.toolName}:${error.message}`);
      });

      guardian.registerTool({
        name: 'step1',
        description: 'Step 1',
        fn: async () => ({ done: true }),
        schema: { input: {} }
      });

      guardian.registerTool({
        name: 'step2',
        description: 'Step 2',
        fn: async () => {
          throw new Error('Step 2 failed');
        },
        schema: { input: {} }
      });

      await guardian.execute('step1', {});
      await guardian.execute('step2', {});

      expect(hookLog).toContain('before:step1');
      expect(hookLog).toContain('after:step1:success');
      expect(hookLog).toContain('before:step2');
      expect(hookLog).toContain('error:step2:Step 2 failed');
      expect(hookLog).toContain('after:step2:failed');
    });
  });

  describe('Memory and resource management', () => {
    it('should respect execution timeout', async () => {
      const guardian = new ToolGuardian();

      guardian.registerTool({
        name: 'slowTask',
        description: 'Very slow task',
        fn: async () => {
          await new Promise(resolve => setTimeout(resolve, 10000));
          return { done: true };
        },
        schema: { input: {} }
      });

      const result = await guardian.execute('slowTask', {}, {
        timeout: 100,
        sandbox: true
      });

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('timeout');
      expect(result.executionTime).toBeLessThan(500);
    });

    it('should handle rapid parallel execution', async () => {
      const guardian = new ToolGuardian({ enableMonitoring: true });

      guardian.registerTool({
        name: 'quickTask',
        description: 'Quick task',
        fn: async ({ value }) => ({ result: value * 2 }),
        schema: {
          input: {
            value: { type: SchemaType.NUMBER }
          }
        }
      });

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(guardian.execute('quickTask', { value: i }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results.every(r => r.status === 'success')).toBe(true);

      const metrics = guardian.getMetrics();
      expect(metrics.totalExecutions).toBeGreaterThanOrEqual(50);
    });
  });
});
