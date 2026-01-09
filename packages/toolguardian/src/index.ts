/**
 * ToolGuardian - Reliable Function Calling
 *
 * A hybrid reliability layer for LLM function calling that combines:
 * - Deterministic function routing (not LLM-based)
 * - Schema validation (catch invalid parameters before call)
 * - Automatic retry with fallback strategies
 * - Function execution sandboxing (prevent failures)
 * - Real-time monitoring and alerting
 * - Learning from failures (improve over time)
 *
 * @example
 * ```typescript
 * import { ToolGuardian } from '@superinstance/toolguardian';
 *
 * const guardian = new ToolGuardian({
 *   tools: {
 *     search: {
 *       name: 'search',
 *       description: 'Search the web',
 *       fn: async ({ query }) => { // ... },
 *       schema: {
 *         input: { query: { type: 'string', minLength: 1 } }
 *       }
 *     }
 *   }
 * });
 *
 * const result = await guardian.execute('search', { query: 'AI news' });
 * ```
 */

import { ToolGuardian } from './core/ToolGuardian.js';

export { ToolGuardian };

// Re-export types
export * from './types.js';

// Re-export components
export { SchemaValidator } from './validation/SchemaValidator.js';
export { RetryManager } from './retry/RetryManager.js';
export { ExecutionSandbox } from './sandbox/ExecutionSandbox.js';
export { Monitor } from './monitoring/Monitor.js';

// Re-export enums
export { ExecutionStatus, SchemaType } from './types.js';
