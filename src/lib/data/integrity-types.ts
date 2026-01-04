/**
 * Data Integrity Type Definitions
 *
 * Comprehensive types for data validation, health monitoring, corruption detection,
 * and recovery operations in PersonalLog.
 */

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Severity level for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Category of validation issue
 */
export type ValidationCategory =
  | 'structure'      // Missing fields, wrong types
  | 'reference'      // Broken references, orphaned records
  | 'business-logic' // Invalid dates, wrong order
  | 'format'         // Invalid strings, malformed data
  | 'constraint'     // Length limits, value ranges
  | 'checksum';      // Checksum mismatches

/**
 * Individual validation error
 */
export interface ValidationError {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  field?: string;
  message: string;
  code: string;
  value?: unknown;
  expected?: string;
  timestamp: number;
}

/**
 * Individual validation warning
 */
export interface ValidationWarning {
  id: string;
  field?: string;
  message: string;
  code: string;
  value?: unknown;
  recommendation?: string;
  timestamp: number;
}

/**
 * Result of validating a single data item
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: number;
  duration: number; // ms
  dataHash?: string; // For comparison
}

/**
 * Comprehensive validation report for entire database
 */
export interface ValidationReport {
  timestamp: number;
  duration: number;
  overall: 'passed' | 'failed' | 'degraded';
  score: number; // 0-100
  results: {
    conversations: ValidationResult;
    messages: ValidationResult;
    knowledge: ValidationResult;
    agents: ValidationResult;
    settings: ValidationResult;
  };
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: number;
  };
}

// ============================================================================
// INTEGRITY TYPES
// ============================================================================

/**
 * Overall integrity status
 */
export type IntegrityStatus = 'healthy' | 'degraded' | 'corrupted' | 'critical';

/**
 * Individual integrity check
 */
export interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  score: number; // 0-100
  message: string;
  details?: string;
  timestamp: number;
  duration: number;
}

/**
 * Comprehensive integrity report
 */
export interface IntegrityReport {
  overall: IntegrityStatus;
  score: number; // 0-100
  timestamp: number;
  duration: number;
  checks: {
    structural: IntegrityCheck;
    referential: IntegrityCheck;
    businessLogic: IntegrityCheck;
    performance: IntegrityCheck;
  };
  recommendations: string[];
  issues: DataIssue[];
}

/**
 * Health trend over time
 */
export interface HealthTrend {
  timestamp: number;
  score: number;
  issueCount: number;
}

/**
 * Data issue for integrity reports
 */
export interface DataIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  collection: string;
  itemId: string;
  description: string;
  details?: string;
  repairable: boolean;
  repairAction?: string;
  timestamp: number;
  detectedBy: string;
}

// ============================================================================
// REPAIR TYPES
// ============================================================================

/**
 * Result of repair operation
 */
export interface RepairResult {
  success: boolean;
  issueId: string;
  action: string;
  itemsRepaired: number;
  itemsFailed: number;
  errors: string[];
  timestamp: number;
  duration: number;
}

/**
 * Summary of auto-repair operations
 */
export interface RepairSummary {
  timestamp: number;
  duration: number;
  totalIssues: number;
  repaired: number;
  failed: number;
  skipped: number;
  results: RepairResult[];
  backupCreated: boolean;
  backupId?: string;
}

/**
 * Result of data recovery
 */
export interface RecoveryResult {
  success: boolean;
  itemsRecovered: number;
  itemsFailed: number;
  errors: string[];
  timestamp: number;
  duration: number;
}

/**
 * Result of salvaging corrupted data
 */
export interface SalvageResult {
  success: boolean;
  salvagedData: unknown;
  lostData: string[];
  partial: boolean;
  errors: string[];
}

// ============================================================================
// HEALTH MONITORING TYPES
// ============================================================================

/**
 * Overall health status
 */
export type HealthStatusCode = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Result of health check operation
 */
export interface HealthCheckResult {
  timestamp: number;
  duration: number;
  status: HealthStatusCode;
  score: number;
  checks: HealthCheckItem[];
  issues: HealthIssue[];
  recommendations: string[];
}

/**
 * Individual health check item
 */
export interface HealthCheckItem {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  score: number; // 0-100
  message: string;
  details?: string;
  lastCheck: number;
  value?: number;
  threshold?: number;
}

/**
 * Overall health status
 */
export interface OverallHealthStatus {
  overall: HealthStatusCode;
  score: number;
  checks: HealthCheckItem[];
  lastCheck: number;
  trends: HealthTrend[];
  issues: HealthIssue[];
  uptime: number; // ms since last issue
}

/**
 * Health issue
 */
export interface HealthIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  details?: string;
  recommendation?: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Storage status information
 */
export interface StorageStatus {
  available: number; // bytes
  total: number; // bytes
  used: number; // bytes
  percentage: number; // 0-100
  status: 'ok' | 'warning' | 'critical';
  fragmentation: number; // 0-100
  growthRate: number; // bytes per day
}

/**
 * Performance status
 */
export interface PerformanceStatus {
  queryTime: {
    avg: number; // ms
    p95: number; // ms
    p99: number; // ms
  };
  indexEfficiency: number; // 0-100
  cacheHitRate: number; // 0-100
  operationThroughput: number; // ops per second
}

/**
 * Detected anomaly
 */
export interface Anomaly {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  metric: string;
  value: number;
  expected: number;
  deviation: number; // percentage
  timestamp: number;
}

// ============================================================================
// CORRUPTION DETECTION TYPES
// ============================================================================

/**
 * Checksum issue
 */
export interface ChecksumIssue {
  id: string;
  collection: string;
  itemId: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Orphaned record
 */
export interface OrphanRecord {
  id: string;
  collection: string;
  referencedBy: string;
  referenceId: string;
  missingParent: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Duplicate record
 */
export interface DuplicateRecord {
  id: string;
  collection: string;
  duplicateIds: string[];
  field: string;
  value: unknown;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Broken reference
 */
export interface BrokenReference {
  id: string;
  collection: string;
  field: string;
  referenceId: string;
  targetCollection: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Encoding issue
 */
export interface EncodingIssue {
  id: string;
  collection: string;
  itemId: string;
  field: string;
  detectedEncoding: string;
  expectedEncoding: string;
  sample: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Comprehensive corruption report
 */
export interface CorruptionReport {
  timestamp: number;
  duration: number;
  totalIssues: number;
  issues: {
    checksums: ChecksumIssue[];
    orphans: OrphanRecord[];
    duplicates: DuplicateRecord[];
    brokenReferences: BrokenReference[];
    encoding: EncodingIssue[];
  };
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
}

// ============================================================================
// COMPACTION TYPES
// ============================================================================

/**
 * Result of database compaction
 */
export interface CompactionResult {
  success: boolean;
  beforeSize: number; // bytes
  afterSize: number; // bytes
  saved: number; // bytes
  percentage: number; // 0-100
  duration: number; // ms
  timestamp: number;
  errors: string[];
}

// ============================================================================
// LOST DATA TYPES
// ============================================================================

/**
 * Lost data item
 */
export interface LostData {
  id: string;
  type: string;
  location: string;
  size: number; // bytes
  recoverable: boolean;
  confidence: number; // 0-100
  preview?: string;
  timestamp: number;
}
