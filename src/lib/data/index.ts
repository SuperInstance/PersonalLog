/**
 * Data Integrity Module
 *
 * Comprehensive data integrity system for PersonalLog.
 * Provides validation, repair, health monitoring, corruption detection, and recovery.
 *
 * @module lib/data
 */

// Export existing data management
export * from './types';
export * from './storage-utils';
export * from './health-utils';
export * from './activity-utils';

// Export integrity modules
export * from './checksum';
export * from './validation';
export * from './repair';
export * from './health';
export * from './corruption';
export * from './schema';
export * from './recovery';

// Re-export commonly used types for convenience
export type {
  ValidationResult,
  ValidationReport,
  IntegrityReport,
  HealthCheckResult,
  OverallHealthStatus,
  CorruptionReport,
  RepairResult,
  RecoveryResult
} from './integrity-types';
