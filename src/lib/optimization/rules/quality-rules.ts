/**
 * Quality Optimization Rules
 *
 * Pre-built optimization rules for improving quality metrics like
 * error rates, reliability, and user satisfaction.
 */

import type { OptimizationRule } from '../types';

// ============================================================================
// ERROR HANDLING RULES
// ============================================================================

/**
 * Enable retry with exponential backoff
 */
export const enableRetryWithBackoff: OptimizationRule = {
  id: 'enable-retry-with-backoff',
  name: 'Enable Retry with Exponential Backoff',
  description: 'Automatically retry failed requests with exponential backoff',
  category: 'quality',
  targets: ['error-rate', 'feature-reliability'],
  priority: 'high',
  effort: 'low',
  impact: 'high',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 60000,
  rollbackTimeout: 180000,
  tags: ['reliability', 'error-handling', 'network'],
  conditions: [
    {
      metric: 'error-rate',
      operator: 'gt',
      threshold: 5, // > 5% error rate
      duration: 15000,
      sampleSize: 10,
    },
  ],
  configChanges: [
    {
      key: 'retry.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'retry.maxAttempts',
      value: 3,
      type: 'number',
      reversible: true,
    },
    {
      key: 'retry.initialDelay',
      value: 1000,
      type: 'number',
      reversible: true,
    },
    {
      key: 'retry.backoffMultiplier',
      value: 2,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 20,
    confidenceLevel: 0.95,
    minImprovementPercent: 20,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'error-rate',
        mustImprove: true,
        tolerance: 25,
      },
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 50, // Retries may increase latency
      },
    ],
  },
};

/**
 * Enable circuit breaker
 */
export const enableCircuitBreaker: OptimizationRule = {
  id: 'enable-circuit-breaker',
  name: 'Enable Circuit Breaker',
  description: 'Enable circuit breaker to prevent cascading failures',
  category: 'quality',
  targets: ['error-rate', 'feature-reliability'],
  priority: 'critical',
  effort: 'low',
  impact: 'high',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 15,
  estimatedTestDuration: 60000,
  rollbackTimeout: 180000,
  tags: ['reliability', 'error-handling', 'resilience'],
  conditions: [
    {
      metric: 'error-rate',
      operator: 'gt',
      threshold: 10, // > 10% error rate
      duration: 10000,
      sampleSize: 5,
    },
  ],
  configChanges: [
    {
      key: 'circuitBreaker.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'circuitBreaker.failureThreshold',
      value: 5,
      type: 'number',
      reversible: true,
    },
    {
      key: 'circuitBreaker.resetTimeout',
      value: 60000,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 15,
    confidenceLevel: 0.95,
    minImprovementPercent: 15,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'error-rate',
        mustImprove: true,
        tolerance: 20,
      },
    ],
  },
};

// ============================================================================
// FEATURE RELIABILITY RULES
// ============================================================================

/**
 * Enable feature degradation
 */
export const enableFeatureDegradation: OptimizationRule = {
  id: 'enable-feature-degradation',
  name: 'Enable Feature Degradation',
  description: 'Gracefully degrade features when system is under load',
  category: 'quality',
  targets: ['feature-reliability'],
  priority: 'high',
  effort: 'medium',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: true,
  riskLevel: 25,
  estimatedTestDuration: 45000,
  rollbackTimeout: 120000,
  tags: ['reliability', 'degradation', 'features'],
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
      key: 'features.degradation.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'features.degradation.memoryThreshold',
      value: 800,
      type: 'number',
      reversible: true,
    },
    {
      key: 'features.degradation.cpuThreshold',
      value: 80,
      type: 'number',
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
        target: 'feature-reliability',
        mustImprove: true,
        tolerance: 20,
      },
    ],
  },
};

/**
 * Enable timeout protection
 */
export const enableTimeoutProtection: OptimizationRule = {
  id: 'enable-timeout-protection',
  name: 'Enable Timeout Protection',
  description: 'Set aggressive timeouts to prevent hanging operations',
  category: 'quality',
  targets: ['feature-reliability', 'response-latency'],
  priority: 'medium',
  effort: 'low',
  impact: 'moderate',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 10,
  estimatedTestDuration: 30000,
  rollbackTimeout: 120000,
  tags: ['reliability', 'timeout', 'performance'],
  conditions: [
    {
      metric: 'response-latency',
      operator: 'gt',
      threshold: 5000, // > 5s
      duration: 10000,
      sampleSize: 3,
    },
  ],
  configChanges: [
    {
      key: 'timeout.api',
      value: 10000,
      type: 'number',
      reversible: true,
    },
    {
      key: 'timeout.vector',
      value: 5000,
      type: 'number',
      reversible: true,
    },
    {
      key: 'timeout.storage',
      value: 3000,
      type: 'number',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 10,
    maxDegradationPercent: 15,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 30,
      },
      {
        target: 'error-rate',
        mustImprove: false,
        tolerance: 20,
      },
    ],
  },
};

// ============================================================================
// DATA INTEGRITY RULES
// ============================================================================

/**
 * Enable data validation
 */
export const enableDataValidation: OptimizationRule = {
  id: 'enable-data-validation',
  name: 'Enable Data Validation',
  description: 'Add strict data validation to prevent corruption',
  category: 'quality',
  targets: ['error-rate'],
  priority: 'medium',
  effort: 'low',
  impact: 'low',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 30000,
  rollbackTimeout: 60000,
  tags: ['quality', 'validation', 'data'],
  conditions: [],
  configChanges: [
    {
      key: 'validation.enabled',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'validation.strictMode',
      value: true,
      type: 'boolean',
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
        target: 'error-rate',
        mustImprove: true,
        tolerance: 15,
      },
    ],
  },
};

/**
 * Enable checksum verification
 */
export const enableChecksumVerification: OptimizationRule = {
  id: 'enable-checksum-verification',
  name: 'Enable Checksum Verification',
  description: 'Verify checksums for critical data operations',
  category: 'quality',
  targets: ['error-rate', 'feature-reliability'],
  priority: 'low',
  effort: 'low',
  impact: 'low',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 30000,
  rollbackTimeout: 60000,
  tags: ['quality', 'validation', 'data'],
  conditions: [],
  configChanges: [
    {
      key: 'storage.checksums',
      value: true,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 10,
    confidenceLevel: 0.95,
    minImprovementPercent: 2,
    maxDegradationPercent: 10,
    metrics: [
      {
        target: 'error-rate',
        mustImprove: true,
        tolerance: 15,
      },
    ],
  },
};

// ============================================================================
// LOGGING AND MONITORING RULES
// ============================================================================

/**
 * Enable detailed error logging
 */
export const enableDetailedErrorLogging: OptimizationRule = {
  id: 'enable-detailed-error-logging',
  name: 'Enable Detailed Error Logging',
  description: 'Log detailed error information for debugging',
  category: 'quality',
  targets: ['error-rate'],
  priority: 'low',
  effort: 'trivial',
  impact: 'minimal',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 5,
  estimatedTestDuration: 20000,
  rollbackTimeout: 60000,
  tags: ['logging', 'debugging', 'quality'],
  conditions: [],
  configChanges: [
    {
      key: 'logging.errorDetails',
      value: true,
      type: 'boolean',
      reversible: true,
    },
    {
      key: 'logging.stackTraces',
      value: true,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 0,
    maxDegradationPercent: 5,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 10,
      },
    ],
  },
};

/**
 * Enable performance monitoring
 */
export const enablePerformanceMonitoring: OptimizationRule = {
  id: 'enable-performance-monitoring',
  name: 'Enable Performance Monitoring',
  description: 'Monitor performance metrics continuously',
  category: 'quality',
  targets: ['feature-reliability'],
  priority: 'low',
  effort: 'trivial',
  impact: 'minimal',
  autoApplySafe: true,
  requiresConsent: false,
  riskLevel: 0,
  estimatedTestDuration: 10000,
  rollbackTimeout: 30000,
  tags: ['monitoring', 'performance', 'quality'],
  conditions: [],
  configChanges: [
    {
      key: 'monitoring.performance',
      value: true,
      type: 'boolean',
      reversible: true,
    },
  ],
  validation: {
    minSampleSize: 5,
    confidenceLevel: 0.95,
    minImprovementPercent: 0,
    maxDegradationPercent: 5,
    metrics: [
      {
        target: 'response-latency',
        mustImprove: false,
        tolerance: 5,
      },
    ],
  },
};

// ============================================================================
// RULE COLLECTION
// ============================================================================

/**
 * All quality optimization rules
 */
export const qualityRules: OptimizationRule[] = [
  enableRetryWithBackoff,
  enableCircuitBreaker,
  enableFeatureDegradation,
  enableTimeoutProtection,
  enableDataValidation,
  enableChecksumVerification,
  enableDetailedErrorLogging,
  enablePerformanceMonitoring,
];

/**
 * Get quality rule by ID
 */
export function getQualityRule(id: string): OptimizationRule | undefined {
  return qualityRules.find((r) => r.id === id);
}
