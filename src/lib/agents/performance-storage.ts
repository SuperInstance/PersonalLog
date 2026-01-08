/**
 * Agent Performance Storage (IndexedDB)
 *
 * Persistent storage for agent performance tracking data.
 * Privacy-first design with no user content, only metadata.
 *
 * Part of Neural MPC Phase 1: Predictive Agent Selection.
 */

import {
  AgentExecutionRecord,
  AgentPerformanceStats,
  AgentRanking,
  PerformanceHistory,
  PerformanceQueryOptions,
  RankingQueryOptions,
  PrivacySettings,
  StorageStats,
  TaskOutcome,
  TaskType,
  TaskPerformance,
  ErrorType,
  isValidTaskType,
  isValidTaskOutcome,
  isValidErrorType,
  isValidRating,
  isValidDuration,
  isValidResourceUsage,
} from './performance-types';
import { StorageError, ValidationError, NotFoundError } from '@/lib/errors';

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

const DB_NAME = 'PersonalLogAgentPerformance';
const DB_VERSION = 1;
const STORE_EXECUTIONS = 'executions';
const STORE_PRIVACY = 'privacy';

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let db: IDBDatabase | null = null;

/**
 * Get IndexedDB instance
 *
 * Opens or returns existing database connection.
 */
async function getDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () =>
      reject(
        new StorageError('Failed to open performance database', {
          technicalDetails: `DB: ${DB_NAME}, Version: ${DB_VERSION}`,
          context: { dbName: DB_NAME, version: DB_VERSION },
        })
      );

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create executions store
      if (!database.objectStoreNames.contains(STORE_EXECUTIONS)) {
        const executionStore = database.createObjectStore(STORE_EXECUTIONS, {
          keyPath: 'id',
        });
        executionStore.createIndex('agentId', 'agentId', { unique: false });
        executionStore.createIndex('taskType', 'taskType', { unique: false });
        executionStore.createIndex('outcome', 'outcome', { unique: false });
        executionStore.createIndex('timestamp', 'timestamp', { unique: false });
        executionStore.createIndex('agentTask', ['agentId', 'taskType'], {
          unique: false,
        });
        executionStore.createIndex('agentTimestamp', ['agentId', 'timestamp'], {
          unique: false,
        });
      }

      // Create privacy settings store
      if (!database.objectStoreNames.contains(STORE_PRIVACY)) {
        database.createObjectStore(STORE_PRIVACY, { keyPath: 'key' });
      }
    };
  });
}

// ============================================================================
// EXECUTION RECORD STORAGE
// ============================================================================

/**
 * Record an agent execution
 *
 * @param record - Execution record to save
 * @returns Promise resolving to saved record
 * @throws {ValidationError} If record is invalid
 * @throws {StorageError} If database operation fails
 */
export async function recordExecution(
  record: AgentExecutionRecord
): Promise<AgentExecutionRecord> {
  // Validate record
  if (!record.id?.trim()) {
    throw new ValidationError('Execution record ID cannot be empty', {
      field: 'id',
      value: record.id,
    });
  }

  if (!record.agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: record.agentId,
    });
  }

  if (!isValidTaskType(record.taskType)) {
    throw new ValidationError('Invalid task type', {
      field: 'taskType',
      value: record.taskType,
    });
  }

  if (!isValidTaskOutcome(record.outcome)) {
    throw new ValidationError('Invalid task outcome', {
      field: 'outcome',
      value: record.outcome,
    });
  }

  if (!isValidDuration(record.duration)) {
    throw new ValidationError('Invalid duration', {
      field: 'duration',
      value: record.duration,
    });
  }

  if (record.rating !== undefined && !isValidRating(record.rating)) {
    throw new ValidationError('Invalid rating (must be 1-5)', {
      field: 'rating',
      value: record.rating,
    });
  }

  if (
    !isValidResourceUsage(record.resources.cpu, record.resources.memory)
  ) {
    throw new ValidationError('Invalid resource usage', {
      field: 'resources',
      value: record.resources,
    });
  }

  // Check privacy settings
  const privacy = await getPrivacySettings();
  if (!privacy.enabled) {
    // Silently skip recording if tracking is disabled
    return record;
  }

  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EXECUTIONS);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () =>
      reject(
        new StorageError(`Failed to record execution: ${record.id}`, {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

/**
 * Query execution records
 *
 * @param options - Query options
 * @returns Promise resolving to matching records
 */
export async function queryExecutions(
  options: PerformanceQueryOptions = {}
): Promise<AgentExecutionRecord[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EXECUTIONS);
    const index = store.index('timestamp');

    // Build range
    let range: IDBKeyRange | null = null;
    if (options.startTime && options.endTime) {
      range = IDBKeyRange.bound(options.startTime, options.endTime);
    } else if (options.startTime) {
      range = IDBKeyRange.lowerBound(options.startTime);
    } else if (options.endTime) {
      range = IDBKeyRange.upperBound(options.endTime);
    }

    const direction = options.sortOrder === 'asc' ? 'next' : 'prev';
    const request = range ? index.openCursor(range, direction) : index.openCursor(null, direction);

    const results: AgentExecutionRecord[] = [];
    let skipped = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const record = cursor.value as AgentExecutionRecord;

        // Apply filters
        if (options.agentId && record.agentId !== options.agentId) {
          cursor.continue();
          return;
        }

        if (options.taskType && record.taskType !== options.taskType) {
          cursor.continue();
          return;
        }

        if (options.outcome && record.outcome !== options.outcome) {
          cursor.continue();
          return;
        }

        if (options.errorType && record.errorType !== options.errorType) {
          cursor.continue();
          return;
        }

        if (options.minRating && (record.rating || 0) < options.minRating) {
          cursor.continue();
          return;
        }

        // Handle offset
        if (options.offset && skipped < options.offset) {
          skipped++;
          cursor.continue();
          return;
        }

        // Handle limit
        if (options.limit && results.length >= options.limit) {
          resolve(results);
          return;
        }

        results.push(record);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get execution records for a specific agent
 *
 * @param agentId - Agent ID
 * @param limit - Maximum records to return
 * @returns Promise resolving to agent's execution records
 */
export async function getAgentExecutions(
  agentId: string,
  limit?: number
): Promise<AgentExecutionRecord[]> {
  return queryExecutions({ agentId, limit });
}

/**
 * Delete execution records
 *
 * @param ids - Record IDs to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteExecutions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EXECUTIONS);

    ids.forEach((id) => {
      store.delete(id);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new StorageError('Failed to delete executions', {
          technicalDetails: transaction.error?.message,
          cause: transaction.error || undefined,
        })
      );
  });
}

/**
 * Delete execution records older than a date
 *
 * @param date - Cutoff date (ISO string)
 * @returns Promise resolving to number of deleted records
 */
export async function deleteExecutionsBefore(date: string): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EXECUTIONS);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(date, true);

    const request = index.openCursor(range);
    let count = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        count++;
        cursor.continue();
      } else {
        resolve(count);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Count total execution records
 *
 * @returns Promise resolving to total count
 */
export async function countExecutions(): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readonly');
    const store = transaction.objectStore(STORE_EXECUTIONS);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all execution records
 *
 * WARNING: This is a destructive operation!
 *
 * @returns Promise that resolves when all records are deleted
 */
export async function clearAllExecutions(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_EXECUTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_EXECUTIONS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(
        new StorageError('Failed to clear executions', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

// ============================================================================
// PRIVACY SETTINGS
// ============================================================================

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  enabled: true,
  logResources: true,
  logErrors: true,
  retentionDays: 90,
  lastUpdated: new Date().toISOString(),
};

/**
 * Get privacy settings
 *
 * @returns Promise resolving to privacy settings
 */
export async function getPrivacySettings(): Promise<PrivacySettings> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_PRIVACY], 'readonly');
    const store = transaction.objectStore(STORE_PRIVACY);
    const request = store.get('settings');

    request.onsuccess = () => {
      const result = request.result;
      resolve(result || DEFAULT_PRIVACY_SETTINGS);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update privacy settings
 *
 * @param settings - New privacy settings
 * @returns Promise resolving to updated settings
 */
export async function updatePrivacySettings(
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const existing = await getPrivacySettings();
  const updated: PrivacySettings = {
    ...existing,
    ...settings,
    lastUpdated: new Date().toISOString(),
  };

  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_PRIVACY], 'readwrite');
    const store = transaction.objectStore(STORE_PRIVACY);
    const request = store.put({ key: 'settings', ...updated });

    request.onsuccess = () => resolve(updated);
    request.onerror = () =>
      reject(
        new StorageError('Failed to update privacy settings', {
          technicalDetails: request.error?.message,
          cause: request.error || undefined,
        })
      );
  });
}

// ============================================================================
// STORAGE STATISTICS
// ============================================================================

/**
 * Get storage statistics
 *
 * @returns Promise resolving to storage stats
 */
export async function getStorageStats(): Promise<StorageStats> {
  const database = await getDB();

  const totalCount = await countExecutions();

  // Get oldest and newest records
  let oldestRecord: string | null = null;
  let newestRecord: string | null = null;

  if (totalCount > 0) {
    const allRecords = await queryExecutions({ limit: 1, sortOrder: 'asc' });
    const newestRecords = await queryExecutions({ limit: 1, sortOrder: 'desc' });

    if (allRecords.length > 0) {
      oldestRecord = allRecords[0].timestamp;
    }
    if (newestRecords.length > 0) {
      newestRecord = newestRecords[0].timestamp;
    }
  }

  // Count unique agents
  const agentsSet = new Set<string>();
  const records = await queryExecutions({ limit: 1000 }); // Sample for efficiency
  records.forEach((record) => agentsSet.add(record.agentId));

  // Rough size estimation: average record ~300 bytes
  const estimatedSizeBytes = totalCount * 300;

  return {
    totalRecords: totalCount,
    estimatedSizeBytes,
    oldestRecord,
    newestRecord,
    agentsTracked: agentsSet.size,
  };
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

/**
 * Calculate performance statistics for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to performance stats
 */
export async function calculateAgentStats(
  agentId: string
): Promise<AgentPerformanceStats | null> {
  const records = await getAgentExecutions(agentId);

  if (records.length === 0) {
    return null;
  }

  // Sort records by timestamp
  records.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const totalExecutions = records.length;
  const successCount = records.filter((r) => r.outcome === TaskOutcome.SUCCESS).length;
  const successRate = successCount / totalExecutions;

  // Duration statistics
  const durations = records.map((r) => r.duration).sort((a, b) => a - b);
  const averageDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const medianDuration = durations[Math.floor(durations.length / 2)];
  const p95Duration = durations[Math.floor(durations.length * 0.95)];
  const p99Duration = durations[Math.floor(durations.length * 0.99)];

  // Rating statistics
  const ratings = records.filter((r) => r.rating !== undefined).map((r) => r.rating!);
  const averageRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

  // Reuse rate
  const reused = records.filter((r) => r.reused).length;
  const reuseRate = reused / totalExecutions;

  // Error distribution
  const errorDistribution: Record<ErrorType, number> = {
    [ErrorType.VALIDATION]: 0,
    [ErrorType.NOT_FOUND]: 0,
    [ErrorType.PERMISSION]: 0,
    [ErrorType.NETWORK]: 0,
    [ErrorType.TIMEOUT]: 0,
    [ErrorType.HARDWARE]: 0,
    [ErrorType.UNKNOWN]: 0,
  };

  records.forEach((record) => {
    if (record.errorType) {
      errorDistribution[record.errorType]++;
    }
  });

  // Performance by task type
  const performanceByTask: Record<TaskType, TaskPerformance> = {} as any;

  Object.values(TaskType).forEach((taskType) => {
    const taskRecords = records.filter((r) => r.taskType === taskType);

    if (taskRecords.length > 0) {
      const taskSuccessCount = taskRecords.filter(
        (r) => r.outcome === TaskOutcome.SUCCESS
      ).length;
      const taskSuccessRate = taskSuccessCount / taskRecords.length;
      const taskAverageDuration =
        taskRecords.reduce((sum, r) => sum + r.duration, 0) / taskRecords.length;
      const taskRatings = taskRecords
        .filter((r) => r.rating !== undefined)
        .map((r) => r.rating!);
      const taskAverageRating =
        taskRatings.length > 0
          ? taskRatings.reduce((sum, r) => sum + r, 0) / taskRatings.length
          : null;

      performanceByTask[taskType] = {
        taskType,
        totalExecutions: taskRecords.length,
        successRate: taskSuccessRate,
        averageDuration: taskAverageDuration,
        averageRating: taskAverageRating,
      };
    }
  });

  return {
    agentId,
    totalExecutions,
    successRate,
    averageDuration,
    medianDuration,
    p95Duration,
    p99Duration,
    averageRating,
    reuseRate,
    errorDistribution,
    performanceByTask,
    lastExecution: records[records.length - 1].timestamp,
    firstExecution: records[0].timestamp,
  };
}
