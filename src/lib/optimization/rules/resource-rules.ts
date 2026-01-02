/**
 * Resource Optimization Rules
 *
 * Pre-built optimization rules for optimizing resource usage like
 * CPU, memory, battery, and storage.
 */

import type { OptimizationRule } from '../types';

// ============================================================================
// MEMORY OPTIMIZATION RULES
// ============================================================================

/**
 * Reduce memory cache size
 */
export const reduceMemoryCache: OptimizationRule = {
  id: 'reduce-memory-cache',
  name: 'Reduce Memory Cache',
  description: 'Decrease cache size to reduce memory footprint',
  category: 'resources',
  targets: ['memory-usage'],
  priority: 'high',
  effort: 'trivial',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['memory', 'cache', 'resources'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'gt',
      threshold: 800, // > 800MB
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'cache.maxSize',
      value: 100,
      type: 'number',
      reversible: true,
    },
    {
      key: 'cache.ttl',
      value: 600000, // 10 minutes
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'memory-usage',
        mustImprove: true,
        tolerance: 20,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 30,
      },
    ],
  },
};

/**
 * Enable memory compaction
 */
export const enableMemoryCompaction: OptimizationRule = {
  id: 'enable-memory-compaction',
  name: 'Enable Memory Compaction',
  description: 'Enable automatic memory compaction to reduce footprint',
  category: 'resources',
  targets: ['memory-usage'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 15,
  estimatedTestDuration: 45000,
  rollbackTimeout: 180000,
  tags: ['memory', 'compaction', 'resources'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'gt',
      threshold: 600,
      duration: 15000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'memory.compaction.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'memory.compaction.interval',
      value: 300000, // 5 minutes
      type: 'number',
      reversible: true,
    },
    {
      key: 'memory.compaction.threshold',
      value: 0.7, // Compact when 70% full
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
        target: 'memory-usage',
        mustImprove: true,
        tolerance: 15,
      },
    ],
  },
};

/**
 * Reduce vector index size
 */
export const reduceVectorIndex: OptimizationRule = {
  id: 'reduce-vector-index',
  name: 'Reduce Vector Index Size',
  description: 'Reduce vector index size to save memory',
  category: 'resources',
  targets: ['memory-usage', 'response-latency'],
  priority: 'medium',
  effort: 'medium',
  impact: 'moderate',
  autoApplySafe: false,
  requiresConsent: true,
  riskLevel: 30,
  estimatedTestDuration: 60000,
  rollbackTimeout: 300000,
  tags: ['memory', 'vector', 'resources'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'gt',
      threshold: 1000,
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'vector.index.size',
      value: 1000,
      type: 'number',
      reversible: false,
    },
    {
      key: 'vector.index.compression',
      value: true,
      type: 'boolean',
      reversible: false,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 20,
    metrics: [
      {
        target: 'memory-usage',
        mustImprove: true,
        tolerance: 20,
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
// CPU OPTIMIZATION RULES
// ============================================================================

/**
 * Reduce CPU concurrency
 */
export const reduceCpuConcurrency: OptimizationRule = {
  id: 'reduce-cpu-concurrency',
  name: 'Reduce CPU Concurrency',
  description: 'Reduce concurrent operations to lower CPU usage',
  category: 'resources',
  targets: ['cpu-usage'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 15,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['cpu', 'performance', 'resources'],
  conditions: [
    {
      metric: 'cpu-usage',
      operator: 'gt',
      threshold: 80, // > 80%
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'concurrency.maxWorkers',
      value: 2,
      type: 'number',
      reversible: true,
    },
    {
      key: 'concurrency.queueSize',
      value: 50,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 20,
    metrics: [
      {
        target: 'cpu-usage',
        mustImprove: true,
        tolerance: 20,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 30,
      },
    ],
  },
};

/**
 * Enable work throttling
 */
export const enableWorkThrottling: OptimizationRule = {
  id: 'enable-work-throttling',
  name: 'Enable Work Throttling',
  description: 'Throttle heavy work to reduce CPU spikes',
  category: 'resources',
  targets: ['cpu-usage', 'jank'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['cpu', 'throttling', 'performance'],
  conditions: [
    {
      metric: 'jank',
      operator: 'gt',
      threshold: 3,
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'throttling.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'throttling.cpuThreshold',
      value: 70,
      type: 'number',
      reversible: true,
    },
    {
      key: 'throttling.timeSlice',
      value: 50,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'jank',
        mustImprove: true,
        tolerance: 25,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 25,
      },
    ],
  },
};

// ============================================================================
// STORAGE OPTIMIZATION RULES
// ============================================================================

/**
 * Enable storage compression
 */
export const enableStorageCompression: OptimizationRule = {
  id: 'enable-storage-compression',
  name: 'Enable Storage Compression',
  description: 'Compress stored data to reduce storage usage',
  category: 'resources',
  targets: ['storage-usage'],
  priority: 'low',
  effort: 'medium',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 20,
  estimatedTestDuration: 60000,
  rollbackTimeout: 300000,
  tags: ['storage', 'compression', 'resources'],
  conditions: [
    {
      metric: 'storage-usage',
      operator: 'gt',
      threshold: 80, // > 80% of quota
      duration: 30000,
      sampleSize: 3,
    },
  ],
  configChanges: [
    {
      key: 'storage.compression',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'storage.compressionLevel',
      value: 6,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 30,
    maxDegradationPercent: 20,
    metrics: [
      {
        target: 'storage-usage',
        mustImprove: true,
        tolerance: 20,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 30,
      },
    ],
  },
};

/**
 * Enable data pruning
 */
export const enableDataPruning: OptimizationRule = {
  id: 'enable-data-pruning',
  name: 'Enable Data Pruning',
  description: 'Automatically prune old or unnecessary data',
  category: 'resources',
  targets: ['storage-usage'],
  priority: 'medium',
  effort: 'medium',
  impact: 'moderate',
  autoApplySafe: false,
  requiresConsent: true,
  riskLevel: 40,
  estimatedTestDuration: 45000,
  rollbackTimeout: 60000,
  tags: ['storage', 'pruning', 'cleanup'],
  conditions: [
    {
      metric: 'storage-usage',
      operator: 'gt',
      threshold: 90,
      duration: 15000,
      sampleSize: 3,
    },
  ],
  configChanges: [
    {
      key: 'storage.pruning.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'storage.pruning.maxAge',
      value: 90, // 90 days
      type: 'number',
      reversible: true,
    },
    {
      key: 'storage.pruning.maxSize',
      value: 1000000000, // 1GB
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 20,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'storage-usage',
        mustImprove: true,
        tolerance: 15,
      },
    ],
  },
};

/**
 * Reduce storage batch size
 */
export const reduceStorageBatch: OptimizationRule = {
  id: 'reduce-storage-batch',
  name: 'Reduce Storage Batch Size',
  description: 'Write data more frequently in smaller batches',
  category: 'resources',
  targets: ['storage-usage', 'memory-usage'],
  priority: 'low',
  effort: 'trivial',
  impact: 'low',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['storage', 'memory', 'resources'],
  conditions: [
    {
      metric: 'memory-usage',
      operator: 'gt',
      threshold: 500,
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'storage.batchSize',
      value: 50,
      type: 'number',
      reversible: true,
    },
    {
      key: 'storage.flushInterval',
      value: 5000,
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
        target: 'memory-usage',
        mustImprove: true,
        tolerance: 15,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 20,
      },
    ],
  },
};

// ============================================================================
// BATTERY OPTIMIZATION RULES
// ============================================================================

/**
 * Enable battery saver mode
 */
export const enableBatterySaver: OptimizationRule = {
  id: 'enable-battery-saver',
  name: 'Enable Battery Saver Mode',
  description: 'Reduce activity to conserve battery',
  category: 'resources',
  targets: ['battery-drain'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: true,
  riskLevel: 20,
  estimatedTestDuration: 120000, // 2 minutes
  rollbackTimeout: 300000,
  tags: ['battery', 'power', 'resources'],
  conditions: [
    {
      metric: 'battery-drain',
      operator: 'gt',
      threshold: 10, // > 10% per hour
      duration: 60000,
      sampleSize: 2,
    },
  ],
  configChanges: [
    {
      key: 'battery.saver.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'battery.saver.reducedActivity',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'battery.saver.lowerRefresh',
      value: true,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 20,
    metrics: [
      {
        target: 'battery-drain',
        mustImprove: true,
        tolerance: 20,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 50,
      },
    ],
  },
};

/**
 * Reduce background activity
 */
export const reduceBackgroundActivity: OptimizationRule = {
  id: 'reduce-background-activity',
  name: 'Reduce Background Activity',
  description: 'Minimize background operations to save battery',
  category: 'resources',
  targets: ['battery-drain'],
  priority: 'low',
  effort: 'low',
  impact: 'low',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 120000,
  rollbackTimeout: 300000,
  tags: ['battery', 'background', 'resources'],
  conditions: [],
  configChanges: [
    {
      key: 'background.syncInterval',
      value: 300000, // 5 minutes
      type: 'number',
      reversible: true,
    },
    {
      key: 'background.indexing',
      value: false,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'battery-drain',
        mustImprove: true,
        tolerance: 20,
      },
    ],
  },
};

// ============================================================================
// RULE COLLECTION
// ============================================================================

/**
 * All resource optimization rules
 */
export const resourceRules: OptimizationRule[] = [
  reduceMemoryCache,
  enableMemoryCompaction,
  reduceVectorIndex,
  reduceCpuConcurrency,
  enableWorkThrottling,
  enableStorageCompression,
  enableDataPruning,
  reduceStorageBatch,
  enableBatterySaver,
  reduceBackgroundActivity,
];

/**
 * Get resource rule by ID
 */
export function getResourceRule(id: string): OptimizationRule | undefined {
  return resourceRules.find((r) => r.id === id);
}
