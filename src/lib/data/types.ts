/**
 * Data Management Types
 *
 * Type definitions for the data management dashboard including
 * storage overview, health monitoring, and activity logging.
 */

/**
 * Storage item breakdown by category
 */
export interface StorageItem {
  name: string;
  size: string; // Human-readable size (e.g., "245 MB")
  sizeBytes: number; // Size in bytes
  count: number; // Number of items
  percentage: number; // Percentage of total storage
}

/**
 * Storage trend data point
 */
export interface StorageTrend {
  date: string; // ISO date string
  totalUsed: number; // Total bytes used
  categories: {
    conversations: number;
    knowledge: number;
    analytics: number;
    cache: number;
    backups: number;
    other: number;
  };
}

/**
 * Complete storage overview
 */
export interface StorageOverview {
  totalUsed: number; // Total bytes used
  totalAvailable: number; // Total bytes available
  usagePercentage: number; // 0-100
  breakdown: {
    conversations: StorageItem;
    knowledge: StorageItem;
    analytics: StorageItem;
    cache: StorageItem;
    backups: StorageItem;
    other: StorageItem;
  };
  trend: StorageTrend[];
  recommendations: string[];
}

/**
 * Health check status
 */
export type HealthStatus = 'pass' | 'warn' | 'fail';

/**
 * Overall health status
 */
export type OverallHealth = 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Individual health check
 */
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  action?: string;
  lastChecked: number; // Timestamp
}

/**
 * Data issue found during health check
 */
export interface DataIssue {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  details?: string;
  action?: string;
  discovered: number; // Timestamp
  resolved?: boolean;
}

/**
 * Complete data health status
 */
export interface DataHealth {
  overall: OverallHealth;
  checks: HealthCheck[];
  issues: DataIssue[];
  recommendations: string[];
  lastScan: number; // Timestamp
  nextScan: number; // Timestamp
}

/**
 * Data operation type
 */
export type DataOperationType = 'backup' | 'restore' | 'sync' | 'export' | 'import' | 'cleanup' | 'optimize' | 'verify';

/**
 * Data operation status
 */
export type DataOperationStatus = 'success' | 'failed' | 'in_progress' | 'cancelled';

/**
 * Data operation log entry
 */
export interface DataOperation {
  id: string;
  type: DataOperationType;
  status: DataOperationStatus;
  timestamp: number; // Timestamp
  details: {
    description: string;
    itemsAffected?: number;
    sizeProcessed?: number;
    duration?: number; // milliseconds
    error?: string;
  };
  userId?: string;
}

/**
 * Log filter options
 */
export interface LogFilter {
  types?: DataOperationType[];
  status?: DataOperationStatus[];
  dateRange?: {
    start: number; // Timestamp
    end: number; // Timestamp
  };
  search?: string; // Search query
}

/**
 * Cleanup operation configuration
 */
export interface CleanupOperation {
  type: 'cache' | 'old-conversations' | 'compact-knowledge' | 'compress-data' | 'remove-duplicates' | 'reset-analytics' | 'clear-personalization';
  enabled: boolean;
  config?: {
    daysOld?: number; // For old conversations
    minSize?: number; // For compression
    dryRun?: boolean; // Preview without executing
  };
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  operation: CleanupOperation['type'];
  success: boolean;
  itemsProcessed: number;
  spaceFreed: number; // Bytes
  errors?: string[];
  details?: string;
}

/**
 * Storage statistics for quick actions
 */
export interface QuickActionStats {
  lastBackup: number | null;
  lastSync: number | null;
  storageUsage: number;
  issuesCount: number;
  pendingActions: number;
}
