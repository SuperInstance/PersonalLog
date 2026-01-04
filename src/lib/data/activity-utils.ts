/**
 * Data Activity Logging Utilities
 *
 * Utilities for logging and tracking data operations.
 */

import { DataOperation, LogFilter, DataOperationType, DataOperationStatus } from './types';

const STORAGE_KEY = 'data-activity-log';
const MAX_LOG_ENTRIES = 1000;

/**
 * Log a data operation
 */
export async function logDataOperation(
  type: DataOperationType,
  status: DataOperationStatus,
  description: string,
  details?: {
    itemsAffected?: number;
    sizeProcessed?: number;
    duration?: number;
    error?: string;
  }
): Promise<void> {
  const operation: DataOperation = {
    id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    status,
    timestamp: Date.now(),
    details: {
      description,
      ...details,
    },
  };

  const logs = await getActivityLogs();
  logs.unshift(operation);

  // Keep only the most recent entries
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.splice(MAX_LOG_ENTRIES);
  }

  saveActivityLogs(logs);
}

/**
 * Get all activity logs
 */
export async function getActivityLogs(filter?: LogFilter): Promise<DataOperation[]> {
  const logs = loadActivityLogs();

  if (!filter) {
    return logs;
  }

  return filterLogs(logs, filter);
}

/**
 * Filter logs based on criteria
 */
function filterLogs(logs: DataOperation[], filter: LogFilter): DataOperation[] {
  let filtered = [...logs];

  // Filter by type
  if (filter.types && filter.types.length > 0) {
    filtered = filtered.filter(log => filter.types!.includes(log.type));
  }

  // Filter by status
  if (filter.status && filter.status.length > 0) {
    filtered = filtered.filter(log => filter.status!.includes(log.status));
  }

  // Filter by date range
  if (filter.dateRange) {
    filtered = filtered.filter(
      log =>
        log.timestamp >= filter.dateRange!.start &&
        log.timestamp <= filter.dateRange!.end
    );
  }

  // Filter by search query
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(
      log =>
        log.details.description.toLowerCase().includes(searchLower) ||
        log.type.toLowerCase().includes(searchLower) ||
        log.details.error?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

/**
 * Load logs from storage
 */
function loadActivityLogs(): DataOperation[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load activity logs:', error);
  }
  return [];
}

/**
 * Save logs to storage
 */
function saveActivityLogs(logs: DataOperation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save activity logs:', error);
  }
}

/**
 * Clear activity logs
 */
export async function clearActivityLogs(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export activity logs as CSV
 */
export async function exportActivityLogsAsCSV(filter?: LogFilter): Promise<string> {
  const logs = await getActivityLogs(filter);

  const headers = ['ID', 'Type', 'Status', 'Timestamp', 'Description', 'Items Affected', 'Size Processed', 'Duration', 'Error'];
  const rows = logs.map(log => [
    log.id,
    log.type,
    log.status,
    new Date(log.timestamp).toISOString(),
    log.details.description,
    log.details.itemsAffected?.toString() || '',
    log.details.sizeProcessed ? formatBytes(log.details.sizeProcessed) : '',
    log.details.duration ? `${log.details.duration}ms` : '',
    log.details.error || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get operation statistics
 */
export async function getOperationStats(): Promise<{
  total: number;
  byType: Record<DataOperationType, number>;
  byStatus: Record<DataOperationStatus, number>;
  recent: DataOperation[];
}> {
  const logs = await getActivityLogs();
  const recent = logs.slice(0, 10);

  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const log of logs) {
    byType[log.type] = (byType[log.type] || 0) + 1;
    byStatus[log.status] = (byStatus[log.status] || 0) + 1;
  }

  return {
    total: logs.length,
    byType: byType as Record<DataOperationType, number>,
    byStatus: byStatus as Record<DataOperationStatus, number>,
    recent,
  };
}

/**
 * Log a backup operation
 */
export async function logBackup(
  status: DataOperationStatus,
  description: string,
  details?: { sizeProcessed?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('backup', status, description, details);
}

/**
 * Log a restore operation
 */
export async function logRestore(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('restore', status, description, details);
}

/**
 * Log a sync operation
 */
export async function logSync(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('sync', status, description, details);
}

/**
 * Log an export operation
 */
export async function logExport(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; sizeProcessed?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('export', status, description, details);
}

/**
 * Log an import operation
 */
export async function logImport(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; sizeProcessed?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('import', status, description, details);
}

/**
 * Log a cleanup operation
 */
export async function logCleanup(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; sizeProcessed?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('cleanup', status, description, details);
}

/**
 * Log an optimization operation
 */
export async function logOptimize(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; sizeProcessed?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('optimize', status, description, details);
}

/**
 * Log a verification operation
 */
export async function logVerify(
  status: DataOperationStatus,
  description: string,
  details?: { itemsAffected?: number; duration?: number; error?: string }
): Promise<void> {
  await logDataOperation('verify', status, description, details);
}
