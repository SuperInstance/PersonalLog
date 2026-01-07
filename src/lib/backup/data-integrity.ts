/**
 * Data Integrity Checker - System-Wide Validation
 *
 * Comprehensive integrity validation for all IndexedDB databases in PersonalLog.
 * Detects corruption, orphaned records, referential integrity issues, and data anomalies.
 *
 * @module lib/backup/data-integrity
 */

import { StorageError, NotFoundError } from '@/lib/errors';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Integrity issue severity
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Data store identifier
 */
export interface DataStoreIdentifier {
  /** Database name */
  database: string;

  /** Store name */
  store: string;
}

/**
 * Integrity issue detected
 */
export interface IntegrityIssue {
  /** Unique issue ID */
  id: string;

  /** Issue type */
  type: 'missing-field' | 'invalid-type' | 'invalid-value' | 'orphaned-record' |
        'referential-integrity' | 'corruption' | 'duplicate' | 'data-anomaly' |
        'constraint-violation' | 'inconsistency';

  /** Issue severity */
  severity: IssueSeverity;

  /** Affected data store */
  store: DataStoreIdentifier;

  /** Record ID (if applicable) */
  recordId?: string;

  /** Field name (if applicable) */
  field?: string;

  /** Issue description */
  description: string;

  /** Expected value/type */
  expected?: string;

  /** Actual value/type */
  actual?: string;

  /** Can this issue be auto-repaired */
  repairable: boolean;

  /** Repair action (if repairable) */
  repairAction?: string;

  /** Related issue IDs */
  relatedIssues?: string[];
}

/**
 * Store-specific integrity result
 */
export interface StoreIntegrityResult {
  /** Store identifier */
  store: DataStoreIdentifier;

  /** Total records */
  totalRecords: number;

  /** Valid records */
  validRecords: number;

  /** Issues found */
  issues: IntegrityIssue[];

  /** Integrity score (0-100) */
  score: number;

  /** Status */
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Database-specific integrity result
 */
export interface DatabaseIntegrityResult {
  /** Database name */
  database: string;

  /** Store results */
  stores: StoreIntegrityResult[];

  /** Overall database score */
  score: number;

  /** Total issues */
  totalIssues: number;

  /** Issues by severity */
  issuesBySeverity: Record<IssueSeverity, number>;
}

/**
 * Complete system integrity check result
 */
export interface SystemIntegrityResult {
  /** Overall system integrity score (0-100) */
  score: number;

  /** Overall status */
  status: 'healthy' | 'warning' | 'critical';

  /** Database results */
  databases: DatabaseIntegrityResult[];

  /** All issues grouped by severity */
  criticalIssues: IntegrityIssue[];
  highIssues: IntegrityIssue[];
  mediumIssues: IntegrityIssue[];
  lowIssues: IntegrityIssue[];

  /** Total issues across all databases */
  totalIssues: number;

  /** Issues that can be auto-repaired */
  repairableIssues: IntegrityIssue[];

  /** Check timestamp */
  timestamp: string;

  /** Check duration (ms) */
  duration: number;

  /** Summary statistics */
  summary: {
    totalDatabases: number;
    totalStores: number;
    totalRecords: number;
    validRecords: number;
    corruptedRecords: number;
  };
}

/**
 * Schema validation rule
 */
export interface ValidationRule {
  /** Field name */
  field: string;

  /** Expected type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'any';

  /** Required flag */
  required: boolean;

  /** Validation function */
  validate?: (value: unknown) => boolean;

  /** Error message if validation fails */
  errorMessage?: string;
}

/**
 * Store schema definition
 */
export interface StoreSchema {
  /** Store name */
  name: string;

  /** Primary key path */
  keyPath: string;

  /** Validation rules */
  rules: ValidationRule[];

  /** Foreign key references (referential integrity) */
  foreignKeys?: {
    /** Field that references another record */
    field: string;

    /** Target database */
    targetDatabase: string;

    /** Target store */
    targetStore: string;

    /** Target field (usually keyPath) */
    targetField: string;

    /** Is this reference required */
    required: boolean;
  }[];

  /** Unique constraints */
  uniqueConstraints?: string[][];
}

// ============================================================================
// DATABASE SCHEMA DEFINITIONS
// ============================================================================

/**
 * Schema definitions for all PersonalLog IndexedDB databases
 */
const DATABASE_SCHEMAS: Record<string, StoreSchema[]> = {
  // Plugin Storage
  PersonalLogPlugins: [
    {
      name: 'manifests',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'name', type: 'string', required: true },
        { field: 'version', type: 'string', required: true },
        { field: 'description', type: 'string', required: true },
        { field: 'author', type: 'object', required: true },
        { field: 'permissions', type: 'array', required: true },
        { field: 'type', type: 'array', required: true },
      ],
      uniqueConstraints: [['id'], ['name']]
    },
    {
      name: 'states',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'state', type: 'string', required: true },
        { field: 'enabled', type: 'boolean', required: true },
        { field: 'installedAt', type: 'number', required: true },
        { field: 'updatedAt', type: 'number', required: true },
      ],
      foreignKeys: [
        {
          field: 'id',
          targetDatabase: 'PersonalLogPlugins',
          targetStore: 'manifests',
          targetField: 'id',
          required: true
        }
      ]
    },
    {
      name: 'permissions',
      keyPath: 'pluginId',
      rules: [
        { field: 'pluginId', type: 'string', required: true },
        { field: 'granted', type: 'array', required: true },
        { field: 'denied', type: 'array', required: true },
        { field: 'lastUpdated', type: 'number', required: true },
      ],
      foreignKeys: [
        {
          field: 'pluginId',
          targetDatabase: 'PersonalLogPlugins',
          targetStore: 'manifests',
          targetField: 'id',
          required: true
        }
      ]
    },
    {
      name: 'plugin-files',
      keyPath: 'id',
      rules: [
        { field: 'pluginId', type: 'string', required: true },
        { field: 'name', type: 'string', required: true },
        { field: 'path', type: 'string', required: true },
        { field: 'content', type: 'string', required: true },
        { field: 'size', type: 'number', required: true },
        { field: 'lastModified', type: 'number', required: true },
      ],
      foreignKeys: [
        {
          field: 'pluginId',
          targetDatabase: 'PersonalLogPlugins',
          targetStore: 'manifests',
          targetField: 'id',
          required: true
        }
      ]
    },
    {
      name: 'plugin-versions',
      keyPath: 'id',
      rules: [
        { field: 'pluginId', type: 'string', required: true },
        { field: 'version', type: 'string', required: true },
        { field: 'installedAt', type: 'number', required: true },
        { field: 'active', type: 'boolean', required: true },
      ],
      foreignKeys: [
        {
          field: 'pluginId',
          targetDatabase: 'PersonalLogPlugins',
          targetStore: 'manifests',
          targetField: 'id',
          required: true
        }
      ]
    },
    {
      name: 'installation-logs',
      keyPath: 'id',
      rules: [
        { field: 'pluginId', type: 'string', required: true },
        { field: 'operation', type: 'string', required: true },
        { field: 'status', type: 'string', required: true },
        { field: 'timestamp', type: 'number', required: true },
      ]
    }
  ],

  // Backup Storage
  PersonalLogBackups: [
    {
      name: 'backups',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'timestamp', type: 'string', required: true },
        { field: 'type', type: 'string', required: true },
        { field: 'status', type: 'string', required: true },
        { field: 'size', type: 'number', required: true },
        { field: 'checksum', type: 'string', required: true },
        { field: 'data', type: 'object', required: true },
      ]
    }
  ],

  // Analytics Storage
  PersonalLogAnalytics: [
    {
      name: 'events',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'type', type: 'string', required: true },
        { field: 'category', type: 'string', required: true },
        { field: 'timestamp', type: 'string', required: true },
      ]
    }
  ],

  // JEPA Emotion Storage
  PersonalLogJEPA: [
    {
      name: 'emotions',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'timestamp', type: 'number', required: true },
        { field: 'emotion', type: 'object', required: true },
      ]
    }
  ],

  // Knowledge Vector Store
  PersonalLogKnowledge: [
    {
      name: 'entries',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'type', type: 'string', required: true },
        { field: 'sourceId', type: 'string', required: true },
        { field: 'content', type: 'string', required: true },
        { field: 'metadata', type: 'object', required: true },
      ]
    },
    {
      name: 'embeddings',
      keyPath: 'textHash',
      rules: [
        { field: 'textHash', type: 'string', required: true },
        { field: 'embedding', type: 'array', required: true },
      ]
    }
  ],

  // Marketplace Storage
  PersonalLogMarketplace: [
    {
      name: 'agents',
      keyPath: 'id',
      rules: [
        { field: 'id', type: 'string', required: true },
        { field: 'name', type: 'string', required: true },
        { field: 'description', type: 'string', required: true },
        { field: 'category', type: 'string', required: true },
      ]
    },
    {
      name: 'ratings',
      keyPath: 'id',
      rules: [
        { field: 'agentId', type: 'string', required: true },
        { field: 'userId', type: 'string', required: true },
        { field: 'rating', type: 'number', required: true },
        { field: 'timestamp', type: 'number', required: true },
      ],
      foreignKeys: [
        {
          field: 'agentId',
          targetDatabase: 'PersonalLogMarketplace',
          targetStore: 'agents',
          targetField: 'id',
          required: true
        }
      ]
    }
  ]
};

// ============================================================================
// DATA INTEGRITY CHECKER
// ============================================================================

/**
 * DataIntegrityChecker performs comprehensive integrity checks on all IndexedDB databases.
 *
 * Features:
 * - Schema validation
 * - Referential integrity checks
 * - Orphaned record detection
 * - Data anomaly detection
 * - Corruption detection
 * - Integrity scoring (0-100)
 * - Auto-repair suggestions
 *
 * @example
 * ```typescript
 * const checker = new DataIntegrityChecker()
 * const result = await checker.checkSystemIntegrity()
 * console.log(`System integrity: ${result.score}/100`)
 * ```
 */
export class DataIntegrityChecker {
  private progressCallback?: (progress: number, message: string) => void;

  constructor(options?: {
    onProgress?: (progress: number, message: string) => void;
  }) {
    this.progressCallback = options?.onProgress;
  }

  /**
   * Perform comprehensive system integrity check
   *
   * @returns Complete system integrity result
   */
  async checkSystemIntegrity(): Promise<SystemIntegrityResult> {
    const startTime = Date.now();
    this.reportProgress(0, 'Starting integrity check...');

    const result: SystemIntegrityResult = {
      score: 100,
      status: 'healthy',
      databases: [],
      criticalIssues: [],
      highIssues: [],
      mediumIssues: [],
      lowIssues: [],
      totalIssues: 0,
      repairableIssues: [],
      timestamp: new Date().toISOString(),
      duration: 0,
      summary: {
        totalDatabases: 0,
        totalStores: 0,
        totalRecords: 0,
        validRecords: 0,
        corruptedRecords: 0,
      },
    };

    try {
      // Get all available databases
      const databases = await this.getAllDatabases();

      this.reportProgress(10, `Found ${databases.length} databases to check`);

      result.summary.totalDatabases = databases.length;
      let completedDatabases = 0;

      // Check each database
      for (const dbName of databases) {
        this.reportProgress(
          10 + (completedDatabases / databases.length) * 80,
          `Checking database: ${dbName}`
        );

        const dbResult = await this.checkDatabase(dbName);
        result.databases.push(dbResult);

        // Collect issues
        for (const store of dbResult.stores) {
          for (const issue of store.issues) {
            result.totalIssues++;
            this.addIssueToLists(result, issue);

            if (issue.repairable) {
              result.repairableIssues.push(issue);
            }
          }

          result.summary.totalRecords += store.totalRecords;
          result.summary.validRecords += store.validRecords;
        }

        completedDatabases++;
      }

      this.reportProgress(90, 'Calculating overall integrity score...');

      // Calculate overall score
      this.calculateOverallScore(result);

      result.summary.totalStores = result.databases.reduce(
        (sum, db) => sum + db.stores.length,
        0
      );

      result.summary.corruptedRecords =
        result.summary.totalRecords - result.summary.validRecords;

      result.duration = Date.now() - startTime;

      this.reportProgress(100, `Integrity check complete: ${result.score}/100`);

      console.log(
        `[Data Integrity] System check complete: ${result.status} (${result.score}/100), ` +
        `${result.totalIssues} issues found`
      );

      return result;
    } catch (error) {
      result.status = 'critical';
      result.score = 0;
      result.duration = Date.now() - startTime;

      result.criticalIssues.push({
        id: `error-${Date.now()}`,
        type: 'corruption',
        severity: 'critical',
        store: { database: 'system', store: 'all' },
        description: `Integrity check failed: ${error instanceof Error ? error.message : String(error)}`,
        repairable: false,
      });

      return result;
    }
  }

  /**
   * Check a specific database
   *
   * @param dbName - Database name
   * @returns Database integrity result
   */
  async checkDatabase(dbName: string): Promise<DatabaseIntegrityResult> {
    const result: DatabaseIntegrityResult = {
      database: dbName,
      stores: [],
      score: 100,
      totalIssues: 0,
      issuesBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    };

    try {
      const db = await this.openDatabase(dbName);
      if (!db) {
        // Database doesn't exist or can't be opened
        return result;
      }

      const schemas = DATABASE_SCHEMAS[dbName] || [];
      const storeNames = Array.from(db.objectStoreNames);

      // Check each store
      for (const storeName of storeNames) {
        const schema = schemas.find(s => s.name === storeName);
        const storeResult = await this.checkStore(db, dbName, storeName, schema);
        result.stores.push(storeResult);

        // Count issues by severity
        for (const issue of storeResult.issues) {
          result.totalIssues++;
          result.issuesBySeverity[issue.severity]++;
        }
      }

      // Calculate database score
      this.calculateDatabaseScore(result);

      db.close();
    } catch (error) {
      console.error(`[Data Integrity] Failed to check database ${dbName}:`, error);
    }

    return result;
  }

  /**
   * Check a specific store
   *
   * @param db - Database connection
   * @param dbName - Database name
   * @param storeName - Store name
   * @param schema - Store schema (if available)
   * @returns Store integrity result
   */
  private async checkStore(
    db: IDBDatabase,
    dbName: string,
    storeName: string,
    schema?: StoreSchema
  ): Promise<StoreIntegrityResult> {
    const result: StoreIntegrityResult = {
      store: { database: dbName, store: storeName },
      totalRecords: 0,
      validRecords: 0,
      issues: [],
      score: 100,
      status: 'healthy',
    };

    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      // Get all records
      const records = await this.getAllRecords(store);

      result.totalRecords = records.length;

      // Check each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;
        const recordId = this.getRecordId(record, schema?.keyPath || 'id');

        let recordIsValid = true;

        // Schema validation
        if (schema) {
          const schemaIssues = this.validateRecord(record, recordId, schema);
          result.issues.push(...schemaIssues);
          if (schemaIssues.length > 0) {
            recordIsValid = false;
          }
        } else {
          // Basic validation without schema
          const basicIssues = this.validateBasicRecord(record, recordId, dbName, storeName);
          result.issues.push(...basicIssues);
          if (basicIssues.length > 0) {
            recordIsValid = false;
          }
        }

        // Check for circular references
        try {
          JSON.stringify(record);
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('circular')) {
            result.issues.push({
              id: `circular-${dbName}-${storeName}-${recordId}`,
              type: 'corruption',
              severity: 'critical',
              store: { database: dbName, store: storeName },
              recordId,
              description: 'Circular reference detected in record',
              repairable: false,
            });
            recordIsValid = false;
          }
        }

        if (recordIsValid) {
          result.validRecords++;
        }
      }

      // Check referential integrity
      if (schema?.foreignKeys) {
        const refIssues = await this.checkReferentialIntegrity(
          records,
          schema.foreignKeys,
          dbName,
          storeName
        );
        result.issues.push(...refIssues);
      }

      // Check unique constraints
      if (schema?.uniqueConstraints) {
        const uniqueIssues = this.checkUniqueConstraints(
          records,
          schema.uniqueConstraints,
          dbName,
          storeName
        );
        result.issues.push(...uniqueIssues);
      }

      // Calculate store score
      this.calculateStoreScore(result);
    } catch (error) {
      result.issues.push({
        id: `store-error-${dbName}-${storeName}`,
        type: 'corruption',
        severity: 'high',
        store: { database: dbName, store: storeName },
        description: `Failed to read store: ${error instanceof Error ? error.message : String(error)}`,
        repairable: false,
      });
      result.score = 0;
    }

    return result;
  }

  /**
   * Validate a record against schema rules
   */
  private validateRecord(
    record: Record<string, unknown>,
    recordId: string,
    schema: StoreSchema
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const rule of schema.rules) {
      const value = record[rule.field];

      // Check required fields
      if (rule.required && value === undefined) {
        issues.push({
          id: `missing-${schema.name}-${recordId}-${rule.field}`,
          type: 'missing-field',
          severity: 'high',
          store: { database: '', store: schema.name },
          recordId,
          field: rule.field,
          description: rule.errorMessage || `Missing required field: ${rule.field}`,
          expected: rule.type,
          actual: 'undefined',
          repairable: false,
        });
        continue;
      }

      // Skip type check if value is undefined and not required
      if (value === undefined) {
        continue;
      }

      // Type validation
      const actualType = this.getValueType(value);
      if (rule.type !== 'any' && actualType !== rule.type) {
        issues.push({
          id: `type-${schema.name}-${recordId}-${rule.field}`,
          type: 'invalid-type',
          severity: 'medium',
          store: { database: '', store: schema.name },
          recordId,
          field: rule.field,
          description: `Invalid type for field ${rule.field}`,
          expected: rule.type,
          actual: actualType,
          repairable: false,
        });
        continue;
      }

      // Custom validation
      if (rule.validate && !rule.validate(value)) {
        issues.push({
          id: `validation-${schema.name}-${recordId}-${rule.field}`,
          type: 'invalid-value',
          severity: 'low',
          store: { database: '', store: schema.name },
          recordId,
          field: rule.field,
          description: rule.errorMessage || `Validation failed for field ${rule.field}`,
          repairable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Basic record validation without schema
   */
  private validateBasicRecord(
    record: Record<string, unknown>,
    recordId: string,
    dbName: string,
    storeName: string
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    // Basic structure check
    if (!record || typeof record !== 'object') {
      issues.push({
        id: `invalid-${dbName}-${storeName}-${recordId}`,
        type: 'corruption',
        severity: 'critical',
        store: { database: dbName, store: storeName },
        recordId,
        description: 'Record is not a valid object',
        repairable: false,
      });
    }

    return issues;
  }

  /**
   * Check referential integrity
   */
  private async checkReferentialIntegrity(
    records: unknown[],
    foreignKeys: StoreSchema['foreignKeys'],
    dbName: string,
    storeName: string
  ): Promise<IntegrityIssue[]> {
    const issues: IntegrityIssue[] = [];

    if (!foreignKeys || foreignKeys.length === 0) {
      return issues;
    }

    for (const fk of foreignKeys) {
      // Build set of valid target IDs
      const targetIds = new Set<string>();

      try {
        const targetDb = await this.openDatabase(fk.targetDatabase);
        if (targetDb) {
          const transaction = targetDb.transaction([fk.targetStore], 'readonly');
          const targetStore = transaction.objectStore(fk.targetStore);
          const targetRecords = await this.getAllRecords(targetStore);

          for (const record of targetRecords) {
            const id = (record as Record<string, unknown>)[fk.targetField];
            if (id) {
              targetIds.add(String(id));
            }
          }

          targetDb.close();
        }
      } catch (error) {
        console.error(`Failed to check foreign key to ${fk.targetDatabase}.${fk.targetStore}:`, error);
        continue;
      }

      // Check each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;
        const recordId = this.getRecordId(record, 'id');
        const fieldValue = record[fk.field];

        if (fieldValue === undefined || fieldValue === null) {
          if (fk.required) {
            issues.push({
              id: `fk-missing-${dbName}-${storeName}-${recordId}-${fk.field}`,
              type: 'referential-integrity',
              severity: 'high',
              store: { database: dbName, store: storeName },
              recordId,
              field: fk.field,
              description: `Missing required foreign key reference`,
              expected: `Valid reference to ${fk.targetDatabase}.${fk.targetStore}`,
              actual: 'null',
              repairable: false,
            });
          }
        } else if (!targetIds.has(String(fieldValue))) {
          issues.push({
            id: `fk-orphan-${dbName}-${storeName}-${recordId}-${fk.field}`,
            type: 'orphaned-record',
            severity: fk.required ? 'high' : 'medium',
            store: { database: dbName, store: storeName },
            recordId,
            field: fk.field,
            description: `Orphaned record: reference to non-existent target`,
            expected: `Valid ID in ${fk.targetDatabase}.${fk.targetStore}`,
            actual: String(fieldValue),
            repairable: false,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check unique constraints
   */
  private checkUniqueConstraints(
    records: unknown[],
    uniqueConstraints: string[][],
    dbName: string,
    storeName: string
  ): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const constraint of uniqueConstraints) {
      const valueMap = new Map<string, number[]>();

      // Group records by constraint value
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as Record<string, unknown>;
        const recordId = this.getRecordId(record, 'id');

        const keyValue = constraint
          .map(field => String(record[field] || ''))
          .join('|');

        if (!valueMap.has(keyValue)) {
          valueMap.set(keyValue, []);
        }
        valueMap.get(keyValue)!.push(i);
      }

      // Find duplicates
      valueMap.forEach((indices, keyValue) => {
        if (indices.length > 1) {
          for (const idx of indices) {
            const record = records[idx] as Record<string, unknown>;
            const recordId = this.getRecordId(record, 'id');

            issues.push({
              id: `dup-${dbName}-${storeName}-${recordId}-${keyValue}`,
              type: 'duplicate',
              severity: 'medium',
              store: { database: dbName, store: storeName },
              recordId,
              field: constraint.join(', '),
              description: `Duplicate record found for unique constraint`,
              repairable: false,
              relatedIssues: indices
                .filter(i => i !== idx)
                .map(i => this.getRecordId(records[i] as Record<string, unknown>, 'id'))
                .map(id => `dup-${dbName}-${storeName}-${id}-${keyValue}`)
            });
          }
        }
      });
    }

    return issues;
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get all available IndexedDB databases
   */
  private async getAllDatabases(): Promise<string[]> {
    const databases: string[] = [];

    // Get databases from schema definitions
    for (const dbName of Object.keys(DATABASE_SCHEMAS)) {
      databases.push(dbName);
    }

    // Try to detect additional databases
    if ('databases' in indexedDB) {
      try {
        const dbs = await (indexedDB as any).databases();
        for (const db of dbs) {
          if (db.name && !databases.includes(db.name)) {
            databases.push(db.name);
          }
        }
      } catch (error) {
        // databases() might not be supported in all browsers
        console.warn('indexedDB.databases() not supported');
      }
    }

    return databases;
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
   * Get all records from a store
   */
  private async getAllRecords(store: IDBObjectStore): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get record ID
   */
  private getRecordId(record: Record<string, unknown>, keyPath: string): string {
    return String(record[keyPath] || `unknown-${Date.now()}`);
  }

  /**
   * Get value type
   */
  private getValueType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    const type = typeof value;
    if (type === 'object' && value instanceof Date) return 'date';
    return type;
  }

  /**
   * Calculate store integrity score
   */
  private calculateStoreScore(result: StoreIntegrityResult): void {
    if (result.totalRecords === 0) {
      result.score = 100;
      result.status = 'healthy';
      return;
    }

    const corruptionRatio = result.issues.length / result.totalRecords;

    if (result.issues.length === 0) {
      result.score = 100;
      result.status = 'healthy';
    } else {
      const criticalCount = result.issues.filter(i => i.severity === 'critical').length;
      const highCount = result.issues.filter(i => i.severity === 'high').length;

      if (criticalCount > 0 || highCount > result.totalRecords / 2) {
        result.status = 'critical';
        result.score = Math.max(0, 100 - (corruptionRatio * 100));
      } else if (highCount > 0 || result.issues.length > result.totalRecords / 4) {
        result.status = 'warning';
        result.score = Math.max(50, 100 - (corruptionRatio * 50));
      } else {
        result.status = 'warning';
        result.score = Math.max(70, 100 - (corruptionRatio * 30));
      }
    }
  }

  /**
   * Calculate database integrity score
   */
  private calculateDatabaseScore(result: DatabaseIntegrityResult): void {
    if (result.stores.length === 0) {
      result.score = 100;
      return;
    }

    const avgScore = result.stores.reduce((sum, store) => sum + store.score, 0) / result.stores.length;
    result.score = Math.round(avgScore);
  }

  /**
   * Calculate overall system integrity score
   */
  private calculateOverallScore(result: SystemIntegrityResult): void {
    if (result.databases.length === 0) {
      result.score = 100;
      result.status = 'healthy';
      return;
    }

    const dbScores = result.databases.map(db => db.score);
    const avgScore = dbScores.reduce((sum, score) => sum + score, 0) / dbScores.length;

    // Penalize critical issues
    const criticalPenalty = result.criticalIssues.length * 10;
    const highPenalty = result.highIssues.length * 5;

    result.score = Math.max(0, Math.min(100, avgScore - criticalPenalty - highPenalty));

    // Determine status
    if (result.criticalIssues.length > 0 || result.score < 50) {
      result.status = 'critical';
    } else if (result.highIssues.length > 0 || result.score < 70) {
      result.status = 'warning';
    } else {
      result.status = 'healthy';
    }
  }

  /**
   * Add issue to appropriate severity list
   */
  private addIssueToLists(result: SystemIntegrityResult, issue: IntegrityIssue): void {
    switch (issue.severity) {
      case 'critical':
        result.criticalIssues.push(issue);
        break;
      case 'high':
        result.highIssues.push(issue);
        break;
      case 'medium':
        result.mediumIssues.push(issue);
        break;
      case 'low':
        result.lowIssues.push(issue);
        break;
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
 * Perform comprehensive system integrity check
 */
export async function checkSystemIntegrity(options?: {
  onProgress?: (progress: number, message: string) => void;
}): Promise<SystemIntegrityResult> {
  const checker = new DataIntegrityChecker(options);
  return await checker.checkSystemIntegrity();
}

/**
 * Quick integrity check (returns only score and status)
 */
export async function quickIntegrityCheck(): Promise<{
  score: number;
  status: 'healthy' | 'warning' | 'critical';
}> {
  const checker = new DataIntegrityChecker();
  const result = await checker.checkSystemIntegrity();
  return {
    score: result.score,
    status: result.status,
  };
}
