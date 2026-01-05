/**
 * Performance Optimization Rules
 *
 * Pre-built optimization rules for improving performance metrics like
 * load time, latency, and frame rate.
 */

import type { OptimizationRule } from '../types';

// ============================================================================
// VECTOR PERFORMANCE RULES
// ============================================================================

/**
 * Reduce vector batch size for faster processing
 */
export const reduceVectorBatchSize: OptimizationRule = {
  id: 'reduce-vector-batch-size',
  name: 'Reduce Vector Batch Size',
  description: 'Decrease batch size for vector operations to improve responsiveness',
  enabled: true,
  category: 'performance',
  targets: ['response-latency'],
  priority: 'high',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['vector', 'performance', 'latency'],
  conditions: [
    {
      metric: 'response-latency',
      operator: 'gt',
      threshold: 1000, // > 1s
      duration: 10000, // for 10 seconds
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'vector.batchSize',
      value: 50,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 5,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: true,
        tolerance: 20,
      },
    ],
  },
};

/**
 * Increase vector batch size for better throughput
 */
export const increaseVectorBatchSize: OptimizationRule = {
  id: 'increase-vector-batch-size',
  name: 'Increase Vector Batch Size',
  description: 'Increase batch size for vector operations to improve throughput',
  enabled: true,
  category: 'performance',
  targets: ['response-latency'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 15,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['vector', 'performance', 'throughput'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'lt',
      threshold: 500, // < 500MB
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'vector.batchSize',
      value: 200,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 5,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: true,
        tolerance: 25,
      },
      {
        target: 'memory-usage',
        mustImprove: false,
        tolerance: 30,
      },
    ],
  },
};

// ============================================================================
// CACHE PERFORMANCE RULES
// ============================================================================

/**
 * Enable aggressive caching
 */
export const enableAggressiveCaching: OptimizationRule = {
  id: 'enable-aggressive-caching',
  name: 'Enable Aggressive Caching',
  description: 'Increase cache size and TTL to reduce load times',
  enabled: true,
  category: 'performance',
  targets: ['initial-load-time', 'response-latency'],
  priority: 'high',
  effort: 'trivial',
  impact: 'high',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 60000,
  rollbackTimeout: 180000,
  tags: ['cache', 'performance', 'load-time'],
  conditions: [
    {
      metric: 'initial-load-time',
      operator: 'gt',
      threshold: 3000, // > 3s
      duration: 15000,
      sampleSize: 3,
    },
  ],
  configChanges: [
    {
      key: 'cache.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'cache.ttl',
      value: 3600000, // 1 hour
      type: 'number',
      reversible: true,
    },
    {
      key: 'cache.maxSize',
      value: 1000,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 5,
    metrics: [
      {
        target: 'initial-load-time',
        mustImprove: true,
        tolerance: 30,
      },
    ],
  },
};

/**
 * Disable caching to free memory
 */
export const disableCaching: OptimizationRule = {
  id: 'disable-caching',
  name: 'Disable Caching',
  description: 'Disable caching to reduce memory footprint',
  enabled: true,
  category: 'performance',
  targets: ['memory-usage'],
  priority: 'medium',
  effort: 'trivial',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['cache', 'memory', 'resources'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'gt',
      threshold: 1000, // > 1GB
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'cache.enabled',
      value: false,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 20,
    metrics: [
      {
        target: 'memory-usage',
        mustImprove: true,
        tolerance: 15,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 50,
      },
    ],
  },
};

// ============================================================================
// RENDER PERFORMANCE RULES
// ============================================================================

/**
 * Enable virtual scrolling
 */
export const enableVirtualScrolling: OptimizationRule = {
  id: 'enable-virtual-scrolling',
  name: 'Enable Virtual Scrolling',
  description: 'Enable virtual scrolling to improve render performance',
  enabled: true,
  category: 'performance',
  targets: ['frame-rate', 'jank'],
  priority: 'high',
  effort: 'medium',
  impact: 'high',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 15,
  estimatedTestDuration: 45000,
  rollbackTimeout: 180000,
  tags: ['render', 'performance', 'ui'],
  conditions: [
    {
      metric: 'frame-rate',
      operator: 'lt',
      threshold: 30, // < 30fps
      duration: 10000,
      sampleSize: 10,
    },
  ],
  configChanges: [
    {
      key: 'render.virtualScrolling',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'render.overscan',
      value: 5,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 15,
    confidenceLevel: 0.95,
    minImprovementPercent: 20,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'frame-rate',
        mustImprove: true,
        tolerance: 15,
      },
      {
        target: 'jank',
        mustImprove: true,
        tolerance: 30,
      },
    ],
  },
};

/**
 * Reduce render complexity
 */
export const reduceRenderComplexity: OptimizationRule = {
  id: 'reduce-render-complexity',
  name: 'Reduce Render Complexity',
  description: 'Simplify UI rendering to improve frame rate',
  enabled: true,
  category: 'performance',
  targets: ['frame-rate', 'jank'],
  priority: 'medium',
  effort: 'medium',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 20,
  estimatedTestDuration: 45000,
  rollbackTimeout: 180000,
  tags: ['render', 'performance', 'ui'],
  conditions: [
    {
      metric: 'jank',
      operator: 'gt',
      threshold: 5, // > 5 long tasks/sec
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'render.animations',
      value: false,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'render.transitions',
      value: 'fast',
      type: 'string',
      reversible: true,
    },
    {
      key: 'render.shadows',
      value: false,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'jank',
        mustImprove: true,
        tolerance: 25,
      },
    ],
  },
};

// ============================================================================
// NETWORK PERFORMANCE RULES
// ============================================================================

/**
 * Enable request batching
 */
export const enableRequestBatching: OptimizationRule = {
  id: 'enable-request-batching',
  name: 'Enable Request Batching',
  description: 'Batch API requests to reduce network overhead',
  enabled: true,
  category: 'performance',
  targets: ['response-latency'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['network', 'performance', 'api'],
  conditions: [
    {
      metric: 'response-latency',
      operator: 'gt',
      threshold: 800,
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'api.batching',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'api.batchSize',
      value: 10,
      type: 'number',
      reversible: true,
    },
    {
      key: 'api.batchDelay',
      value: 100,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: true,
        tolerance: 20,
      },
    ],
  },
};

/**
 * Enable request deduplication
 */
export const enableRequestDeduplication: OptimizationRule = {
  id: 'enable-request-deduplication',
  name: 'Enable Request Deduplication',
  description: 'Deduplicate concurrent requests to same resource',
  enabled: true,
  category: 'performance',
  targets: ['response-latency'],
  priority: 'low',
  effort: 'trivial',
  impact: 'low',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 20000,
  rollbackTimeout: 60000,
  tags: ['network', 'performance', 'api'],
  conditions: [],
  configChanges: [
    {
      key: 'api.deduplication',
      value: true,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 5,
    maxDegradationPercent: 5,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: true,
        tolerance: 15,
      },
    ],
  },
};

// ============================================================================
// RULE COLLECTION
// ============================================================================

/**
 * All performance optimization rules
 */
export const performanceRules: OptimizationRule[] = [
  reduceVectorBatchSize,
  increaseVectorBatchSize,
  enableAggressiveCaching,
  disableCaching,
  enableVirtualScrolling,
  reduceRenderComplexity,
  enableRequestBatching,
  enableRequestDeduplication,
];

/**
 * Get performance rule by ID
 */
export function getPerformanceRule(id: string): OptimizationRule | undefined {
  return performanceRules.find((r) => r.id === id);
}
