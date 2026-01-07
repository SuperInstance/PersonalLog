/**
 * Data Auto-Repair System
 *
 * Automatic repair of common data integrity issues in IndexedDB stores.
 * Includes safe repair operations with logging, rollback, and manual review flags.
 *
 * @module lib/backup/repair
 */

import type {
  IntegrityIssue,
  SystemIntegrityResult,
  DataStoreIdentifier,
} from './data-integrity';
import { StorageError, ValidationError } from '@/lib/errors';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Repair operation result
 */
export interface RepairResult {
  /** Operation success */
  success: boolean;

  /** Issues that were repaired */
  repairedIssues: IntegrityIssue[];

  /** Issues that could not be repaired */
  unrepairedIssues: IntegrityIssue[];

  /** Issues that require manual review */
  requiresManualReview: IntegrityIssue[];

  /** Records affected by repair */
  recordsAffected: number;

  /** Databases modified */
  databasesModified: string[];

  /** Repair duration (ms) */
  duration: number;

  /** Repair timestamp */
  timestamp: string;

  /** Rollback backup ID (if created) */
  rollbackBackupId?: string;

  /** Repair log */
  log: RepairLogEntry[];
}

/**
 * Repair log entry
 */
export interface RepairLogEntry {
  /** Log timestamp */
  timestamp: string;

  /** Operation type */
  operation: 'repair' | 'skip' | 'manual-review' | 'error';

  /** Issue being repaired */
  issue: IntegrityIssue;

  /** Operation result */
  result: string;

  /** Additional details */
  details?: string;
}

/**
 * Repair options
 */
export interface RepairOptions {
  /** Create backup before repair */
  createBackup?: boolean;

  /** Auto-repair all repairable issues */
  autoRepair?: boolean;

  /** Skip manual review issues */
  skipManualReview?: boolean;

  /** Dry run (don't actually repair) */
  dryRun?: boolean;

  /** Progress callback */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Repair strategy for issue type
 */
interface RepairStrategy {
  /** Issue types this strategy handles */
  issueTypes: string[];

  /** Repair function */
  repair: (
    issue: IntegrityIssue,
    db: IDBDatabase
  ) => Promise<RepairLogEntry>;

  /** Can this repair be automatically applied */
  autoRepairable: boolean;
}

// ============================================================================
// DATA REPAIR ENGINE
// ============================================================================

/**
 * DataRepairEngine handles automatic repair of data integrity issues.
 *
 * Features:
 * - Safe repair operations
 * - Pre-repair backups
 * - Rollback support
 * - Repair logging
 * - Manual review flags
 * - Dry-run mode
 *
 * @example
 * ```typescript
 * const engine = new DataRepairEngine()
 * const result = await engine.repairSystem(integrityResult, {
 *   createBackup: true,
 *   autoRepair: true
 * })
 * console.log(`Repaired ${result.repairedIssues.length} issues`)
 * ```
 */
export class DataRepairEngine {
  private strategies: Map<string, RepairStrategy[]> = new Map();
  private progressCallback?: (progress: number, message: string) => void;

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Repair all issues in system integrity result
   *
   * @param integrityResult - Integrity check result
   * @param options - Repair options
   * @returns Repair result
   */
  async repairSystem(
    integrityResult: SystemIntegrityResult,
    options: RepairOptions = {}
  ): Promise<RepairResult> {
    const startTime = Date.now();
    this.progressCallback = options.onProgress;

    this.reportProgress(0, 'Preparing repair operation...');

    const result: RepairResult = {
      success: false,
      repairedIssues: [],
      unrepairedIssues: [],
      requiresManualReview: [],
      recordsAffected: 0,
      databasesModified: [],
      duration: 0,
      timestamp: new Date().toISOString(),
      log: [],
    };

    try {
      // Group issues by store for efficient batch processing
      const issuesByStore = this.groupIssuesByStore(integrityResult);

      this.reportProgress(10, `Processing ${integrityResult.repairableIssues.length} repairable issues`);

      // Create backup if requested
      if (options.createBackup && !options.dryRun) {
        this.reportProgress(15, 'Creating pre-repair backup...');
        try {
          const backupId = await this.createPreRepairBackup();
          result.rollbackBackupId = backupId;
          result.log.push({
            timestamp: new Date().toISOString(),
            operation: 'repair',
            issue: integrityResult.repairableIssues[0] || {} as IntegrityIssue,
            result: 'Backup created',
            details: `Pre-repair backup ID: ${backupId}`,
          });
        } catch (error) {
          console.error('[Repair] Failed to create backup:', error);
          // Continue without backup
        }
      }

      // Process each store
      const storeEntries = Array.from(issuesByStore.entries());
      let completedStores = 0;
      const totalStores = storeEntries.length;

      for (const [storeKey, issues] of storeEntries) {
        const [dbName, storeName] = storeKey.split('|');

        this.reportProgress(
          20 + (completedStores / totalStores) * 70,
          `Repairing store: ${dbName}.${storeName} (${issues.length} issues)`
        );

        try {
          const db = await this.openDatabase(dbName);
          if (!db) {
            // Database doesn't exist
            result.unrepairedIssues.push(...issues);
            for (const issue of issues) {
              result.log.push({
                timestamp: new Date().toISOString(),
                operation: 'error',
                issue,
                result: 'Failed to open database',
              });
            }
            completedStores++;
            continue;
          }

          // Repair issues in this store
          for (const issue of issues) {
            const logEntry = await this.repairIssue(issue, db, options);
            result.log.push(logEntry);

            if (logEntry.operation === 'repair') {
              result.repairedIssues.push(issue);
              result.recordsAffected++;
            } else if (logEntry.operation === 'manual-review') {
              result.requiresManualReview.push(issue);
            } else if (logEntry.operation === 'error') {
              result.unrepairedIssues.push(issue);
            }
          }

          // Track modified databases
          if (!result.databasesModified.includes(dbName)) {
            result.databasesModified.push(dbName);
          }

          db.close();
        } catch (error) {
          console.error(`[Repair] Failed to repair store ${storeKey}:`, error);
          result.unrepairedIssues.push(...issues);
        }

        completedStores++;
      }

      // Add unrepairable issues
      const unrepairableIssues = [
        ...integrityResult.criticalIssues.filter(i => !i.repairable),
        ...integrityResult.highIssues.filter(i => !i.repairable),
      ];
      result.unrepairedIssues.push(...unrepairableIssues);

      this.reportProgress(95, 'Finalizing repair operation...');

      // Determine success
      result.success =
        result.repairedIssues.length > 0 ||
        (result.requiresManualReview.length > 0 && result.unrepairedIssues.length === 0);

      result.duration = Date.now() - startTime;

      this.reportProgress(
        100,
        `Repair complete: ${result.repairedIssues.length} repaired, ` +
        `${result.requiresManualReview.length} require manual review, ` +
        `${result.unrepairedIssues.length} could not be repaired`
      );

      console.log(
        `[Repair] Operation complete: ${result.success ? 'success' : 'partial'}, ` +
        `${result.recordsAffected} records affected`
      );

      return result;
    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.log.push({
        timestamp: new Date().toISOString(),
        operation: 'error',
        issue: {} as IntegrityIssue,
        result: 'Repair operation failed',
        details: error instanceof Error ? error.message : String(error),
      });
      return result;
    }
  }

  /**
   * Get repair suggestions for an issue
   *
   * @param issue - Integrity issue
   * @returns Repair suggestion or null if not repairable
   */
  getRepairSuggestion(issue: IntegrityIssue): string | null {
    if (!issue.repairable) {
      return null;
    }

    switch (issue.type) {
      case 'missing-field':
        return `Add missing field '${issue.field}' with appropriate value`;
      case 'invalid-type':
        return `Convert field '${issue.field}' from ${issue.actual} to ${issue.expected}`;
      case 'orphaned-record':
        return `Remove orphaned record or restore missing referenced record`;
      case 'duplicate':
        return `Merge duplicate records or remove older copy`;
      case 'invalid-value':
        return `Update field '${issue.field}' to valid value`;
      default:
        return issue.repairAction || 'Manual review required';
    }
  }

  /**
   * Estimate repair safety
   *
   * @param issue - Integrity issue
   * @returns Safety level
   */
  estimateRepairSafety(issue: IntegrityIssue): 'safe' | 'caution' | 'dangerous' {
    if (!issue.repairable) {
      return 'dangerous';
    }

    switch (issue.type) {
      case 'missing-field':
      case 'invalid-value':
        return 'safe';
      case 'orphaned-record':
      case 'duplicate':
        return 'caution';
      case 'corruption':
      case 'referential-integrity':
        return 'dangerous';
      default:
        return 'caution';
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  /**
   * Initialize repair strategies
   */
  private initializeStrategies(): void {
    // Missing field repair
    this.addStrategy({
      issueTypes: ['missing-field'],
      repair: async (issue, db) => {
        if (!issue.field || !issue.recordId) {
          return {
            timestamp: new Date().toISOString(),
            operation: 'error',
            issue,
            result: 'Missing field or record ID',
          };
        }

        // Can't auto-repair missing fields without knowing correct value
        return {
          timestamp: new Date().toISOString(),
          operation: 'manual-review',
          issue,
          result: 'Requires manual intervention',
          details: `Field '${issue.field}' needs to be added with appropriate value`,
        };
      },
      autoRepairable: false,
    });

    // Invalid type repair (basic conversions)
    this.addStrategy({
      issueTypes: ['invalid-type'],
      repair: async (issue, db) => {
        if (!issue.field || !issue.recordId || !issue.store) {
          return {
            timestamp: new Date().toISOString(),
            operation: 'error',
            issue,
            result: 'Missing field or record ID',
          };
        }

        try {
          const transaction = db.transaction([issue.store.store], 'readwrite');
          const store = transaction.objectStore(issue.store.store);
          const request = store.get(issue.recordId);

          const record = await new Promise<any>((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });

          if (!record) {
            return {
              timestamp: new Date().toISOString(),
              operation: 'error',
              issue,
              result: 'Record not found',
            };
          }

          // Attempt type conversion
          const convertedValue = this.convertType(record[issue.field!], issue.expected!);
          record[issue.field!] = convertedValue;

          const updateRequest = store.put(record);

          await new Promise<void>((resolve, reject) => {
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          });

          return {
            timestamp: new Date().toISOString(),
            operation: 'repair',
            issue,
            result: 'Type converted successfully',
            details: `Converted ${issue.actual} to ${issue.expected}`,
          };
        } catch (error) {
          return {
            timestamp: new Date().toISOString(),
            operation: 'error',
            issue,
            result: 'Type conversion failed',
            details: error instanceof Error ? error.message : String(error),
          };
        }
      },
      autoRepairable: true,
    });

    // Orphaned record repair (delete orphan)
    this.addStrategy({
      issueTypes: ['orphaned-record'],
      repair: async (issue, db) => {
        if (!issue.recordId || !issue.store) {
          return {
            timestamp: new Date().toISOString(),
            operation: 'error',
            issue,
            result: 'Missing record ID',
          };
        }

        try {
          const transaction = db.transaction([issue.store.store], 'readwrite');
          const store = transaction.objectStore(issue.store.store);
          const request = store.delete(issue.recordId);

          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });

          return {
            timestamp: new Date().toISOString(),
            operation: 'repair',
            issue,
            result: 'Orphaned record deleted',
            details: `Deleted record ${issue.recordId}`,
          };
        } catch (error) {
          return {
            timestamp: new Date().toISOString(),
            operation: 'error',
            issue,
            result: 'Failed to delete orphaned record',
            details: error instanceof Error ? error.message : String(error),
          };
        }
      },
      autoRepairable: false, // Too dangerous to auto-delete
    });
  }

  /**
   * Add repair strategy
   */
  private addStrategy(strategy: RepairStrategy): void {
    for (const issueType of strategy.issueTypes) {
      if (!this.strategies.has(issueType)) {
        this.strategies.set(issueType, []);
      }
      this.strategies.get(issueType)!.push(strategy);
    }
  }

  /**
   * Repair a single issue
   */
  private async repairIssue(
    issue: IntegrityIssue,
    db: IDBDatabase,
    options: RepairOptions
  ): Promise<RepairLogEntry> {
    // Check if repairable
    if (!issue.repairable) {
      return {
        timestamp: new Date().toISOString(),
        operation: 'skip',
        issue,
        result: 'Issue not repairable',
      };
    }

    // Get repair strategy
    const strategies = this.strategies.get(issue.type);
    if (!strategies || strategies.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        operation: 'manual-review',
        issue,
        result: 'No repair strategy available',
      };
    }

    const strategy = strategies[0]; // Use first matching strategy

    // Check if auto-repair is allowed
    if (!strategy.autoRepairable && !options.autoRepair) {
      return {
        timestamp: new Date().toISOString(),
        operation: 'manual-review',
        issue,
        result: 'Requires manual approval',
        details: this.getRepairSuggestion(issue) || undefined,
      };
    }

    // Perform repair (or dry run)
    if (options.dryRun) {
      return {
        timestamp: new Date().toISOString(),
        operation: 'skip',
        issue,
        result: 'Dry run - would repair',
        details: this.getRepairSuggestion(issue) || undefined,
      };
    }

    try {
      return await strategy.repair(issue, db);
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        operation: 'error',
        issue,
        result: 'Repair failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Group issues by store for efficient processing
   */
  private groupIssuesByStore(integrityResult: SystemIntegrityResult): Map<string, IntegrityIssue[]> {
    const groups = new Map<string, IntegrityIssue[]>();

    const allIssues = [
      ...integrityResult.criticalIssues,
      ...integrityResult.highIssues,
      ...integrityResult.mediumIssues,
      ...integrityResult.lowIssues,
    ];

    for (const issue of allIssues) {
      if (!issue.repairable) continue;

      const key = `${issue.store.database}|${issue.store.store}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(issue);
    }

    return groups;
  }

  /**
   * Open a database
   */
  private async openDatabase(dbName: string): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(dbName);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Create pre-repair backup
   */
  private async createPreRepairBackup(): Promise<string> {
    const backupId = `pre-repair-${Date.now()}`;

    // Import backup manager dynamically to avoid circular dependencies
    try {
      const { createBackup } = await import('./manager');
      await createBackup({
        name: `Pre-Repair Backup ${new Date().toISOString()}`,
        isAutomatic: true,
      });
    } catch (error) {
      console.error('[Repair] Failed to create backup:', error);
      throw new StorageError('Failed to create pre-repair backup', {
        technicalDetails: error instanceof Error ? error.message : String(error),
      });
    }

    return backupId;
  }

  /**
   * Convert value to target type
   */
  private convertType(value: unknown, targetType: string): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return { value };
          }
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Report progress
   */
  private reportProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Repair all issues in system
 */
export async function repairSystem(
  integrityResult: SystemIntegrityResult,
  options?: RepairOptions
): Promise<RepairResult> {
  const engine = new DataRepairEngine();
  return await engine.repairSystem(integrityResult, options);
}

/**
 * Get repair suggestion for an issue
 */
export function getRepairSuggestion(issue: IntegrityIssue): string | null {
  const engine = new DataRepairEngine();
  return engine.getRepairSuggestion(issue);
}

/**
 * Estimate repair safety
 */
export function estimateRepairSafety(issue: IntegrityIssue): 'safe' | 'caution' | 'dangerous' {
  const engine = new DataRepairEngine();
  return engine.estimateRepairSafety(issue);
}
