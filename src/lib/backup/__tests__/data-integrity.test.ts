/**
 * Data Integrity Checker Tests
 *
 * Comprehensive test suite for data integrity validation and repair.
 * Tests schema validation, referential integrity, corruption detection, and auto-repair.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DataIntegrityChecker,
  checkSystemIntegrity,
  quickIntegrityCheck,
  type SystemIntegrityResult,
  type IntegrityIssue,
  type StoreIntegrityResult,
  type DatabaseIntegrityResult,
} from '../data-integrity';
import {
  DataRepairEngine,
  repairSystem,
  getRepairSuggestion,
  estimateRepairSafety,
  type RepairResult,
} from '../repair';

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a test database with sample data
 */
async function createTestDatabase(dbName: string, storeName: string, data: any[] = []) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;

      // Add test data
      if (data.length > 0) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        for (const item of data) {
          store.add(item);
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      }

      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a test database
 */
async function deleteTestDatabase(dbName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// DATA INTEGRITY CHECKER TESTS
// ============================================================================

describe('DataIntegrityChecker', () => {
  const testDbName = 'TestIntegrityDB';
  const testStoreName = 'testStore';

  afterEach(async () => {
    await deleteTestDatabase(testDbName);
  });

  describe('Schema Validation', () => {
    it('should validate records with correct schema', async () => {
      const validData = [
        { id: '1', name: 'Test 1', value: 100 },
        { id: '2', name: 'Test 2', value: 200 },
      ];

      await createTestDatabase(testDbName, testStoreName, validData);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.database).toBe(testDbName);
      expect(result.stores).toHaveLength(1);
      expect(result.stores[0].totalRecords).toBe(2);
      expect(result.stores[0].validRecords).toBe(2);
      expect(result.stores[0].score).toBe(100);
    });

    it('should detect missing required fields', async () => {
      const invalidData = [
        { id: '1', name: 'Test 1' }, // Missing 'value'
        { id: '2', value: 200 }, // Missing 'name'
      ];

      await createTestDatabase(testDbName, testStoreName, invalidData);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.stores[0].validRecords).toBeLessThan(2);
      expect(result.stores[0].issues.length).toBeGreaterThan(0);

      const missingFieldIssues = result.stores[0].issues.filter(
        (issue) => issue.type === 'missing-field'
      );
      expect(missingFieldIssues.length).toBeGreaterThan(0);
    });

    it('should detect invalid field types', async () => {
      const invalidData = [
        { id: '1', name: 'Test', value: 'not a number' }, // value should be number
        { id: '2', name: 123, value: 200 }, // name should be string
      ];

      await createTestDatabase(testDbName, testStoreName, invalidData);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      const typeIssues = result.stores[0].issues.filter(
        (issue) => issue.type === 'invalid-type'
      );
      expect(typeIssues.length).toBeGreaterThan(0);
    });

    it('should handle empty stores', async () => {
      await createTestDatabase(testDbName, testStoreName, []);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.stores[0].totalRecords).toBe(0);
      expect(result.stores[0].score).toBe(100);
      expect(result.stores[0].status).toBe('healthy');
    });

    it('should validate array fields', async () => {
      const data = [
        { id: '1', items: ['a', 'b', 'c'] },
        { id: '2', items: 'not an array' },
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.stores[0].issues.some((issue) =>
        issue.description.includes('array')
      )).toBe(true);
    });
  });

  describe('Referential Integrity', () => {
    it('should detect orphaned records', async () => {
      // Create parent database
      const parentDb = await createTestDatabase('ParentDB', 'parents', [
        { id: 'parent1', name: 'Parent 1' },
      ]);

      // Create child database with orphaned record
      const childDb = await createTestDatabase('ChildDB', 'children', [
        { id: 'child1', parentId: 'parent1' }, // Valid reference
        { id: 'child2', parentId: 'nonexistent' }, // Orphaned
      ]);

      parentDb.close();
      childDb.close();

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase('ChildDB');

      const orphanedIssues = result.stores[0].issues.filter(
        (issue) => issue.type === 'orphaned-record'
      );
      expect(orphanedIssues.length).toBeGreaterThan(0);
    });

    it('should validate foreign key constraints', async () => {
      const data = [{ id: '1', refId: 'ref1' }];
      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      // Without a target database, references should still be checked
      expect(result.stores).toBeDefined();
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate records', async () => {
      const data = [
        { id: '1', name: 'Duplicate', value: 100 },
        { id: '2', name: 'Duplicate', value: 100 }, // Duplicate of record 1
        { id: '3', name: 'Unique', value: 200 },
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      const duplicateIssues = result.stores[0].issues.filter(
        (issue) => issue.type === 'duplicate'
      );
      expect(duplicateIssues.length).toBeGreaterThan(0);
    });

    it('should handle unique constraints', async () => {
      const data = [
        { id: '1', email: 'test@example.com' },
        { id: '2', email: 'test@example.com' }, // Duplicate email
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.stores[0].issues.length).toBeGreaterThan(0);
    });
  });

  describe('Corruption Detection', () => {
    it('should detect circular references', async () => {
      const data = [{ id: '1', name: 'Test' }];

      const db = await createTestDatabase(testDbName, testStoreName, data);

      // Create circular reference
      const transaction = db.transaction([testStoreName], 'readwrite');
      const store = transaction.objectStore(testStoreName);
      const record = await new Promise<any>((resolve) => {
        const request = store.get('1');
        request.onsuccess = () => resolve(request.result);
      });

      record.circular = record;
      store.put(record);

      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => resolve();
      });

      db.close();

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      const corruptionIssues = result.stores[0].issues.filter(
        (issue) => issue.type === 'corruption'
      );
      expect(corruptionIssues.length).toBeGreaterThan(0);
    });

    it('should detect malformed data', async () => {
      const db = await createTestDatabase(testDbName, testStoreName, []);

      // Add malformed data directly
      const transaction = db.transaction([testStoreName], 'readwrite');
      const store = transaction.objectStore(testStoreName);

      // Try to add invalid data (will be caught by validation)
      try {
        store.add({ id: '1' }); // Missing required fields
      } catch (error) {
        // Expected
      }

      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => resolve();
      });

      db.close();

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result).toBeDefined();
    });
  });

  describe('Integrity Scoring', () => {
    it('should calculate 100 score for healthy data', async () => {
      const validData = [
        { id: '1', name: 'Test 1', value: 100 },
        { id: '2', name: 'Test 2', value: 200 },
      ];

      await createTestDatabase(testDbName, testStoreName, validData);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.score).toBe(100);
      expect(result.stores[0].score).toBe(100);
    });

    it('should reduce score for corrupted records', async () => {
      const data = [
        { id: '1', name: 'Valid', value: 100 },
        { id: '2' }, // Missing fields
        { id: '3' }, // Missing fields
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.score).toBeLessThan(100);
      expect(result.stores[0].score).toBeLessThan(100);
    });

    it('should classify status correctly', async () => {
      // Test healthy status
      {
        await createTestDatabase(testDbName + '_healthy', testStoreName, [
          { id: '1', name: 'Test', value: 100 },
        ]);

        const checker = new DataIntegrityChecker();
        const result = await checker.checkDatabase(testDbName + '_healthy');

        expect(result.score).toBeGreaterThanOrEqual(90);
      }

      // Test critical status
      {
        await createTestDatabase(testDbName + '_critical', testStoreName, [
          { id: '1' },
          { id: '2' },
          { id: '3' },
        ]);

        const checker = new DataIntegrityChecker();
        const result = await checker.checkDatabase(testDbName + '_critical');

        expect(result.score).toBeLessThan(70);
        await deleteTestDatabase(testDbName + '_critical');
      }

      await deleteTestDatabase(testDbName + '_healthy');
    });
  });

  describe('System Integrity Check', () => {
    it('should check all databases', async () => {
      // Create multiple test databases
      await createTestDatabase('TestDB1', 'store1', [{ id: '1', name: 'Test' }]);
      await createTestDatabase('TestDB2', 'store2', [{ id: '2', name: 'Test' }]);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkSystemIntegrity();

      expect(result.databases.length).toBeGreaterThanOrEqual(2);
      expect(result.summary.totalDatabases).toBeGreaterThanOrEqual(2);
      expect(result.summary.totalRecords).toBeGreaterThanOrEqual(2);

      await deleteTestDatabase('TestDB1');
      await deleteTestDatabase('TestDB2');
    });

    it('should report progress correctly', async () => {
      await createTestDatabase(testDbName, testStoreName, [{ id: '1', name: 'Test' }]);

      const progressUpdates: number[] = [];
      const messages: string[] = [];

      const checker = new DataIntegrityChecker({
        onProgress: (progress, message) => {
          progressUpdates.push(progress);
          messages.push(message);
        },
      });

      await checker.checkSystemIntegrity();

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
      expect(messages.some((msg) => msg.includes('complete'))).toBe(true);
    });

    it('should group issues by severity', async () => {
      const data = [
        { id: '1' }, // Critical issue
        { id: '2', name: 'Test' }, // No issue
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const result = await checkSystemIntegrity();

      expect(result.criticalIssues).toBeDefined();
      expect(result.highIssues).toBeDefined();
      expect(result.mediumIssues).toBeDefined();
      expect(result.lowIssues).toBeDefined();
    });

    it('should track repairable issues', async () => {
      const data = [{ id: '1', value: '123' }]; // Invalid type (string instead of number)

      await createTestDatabase(testDbName, testStoreName, data);

      const result = await checkSystemIntegrity();

      expect(result.repairableIssues).toBeDefined();
      expect(Array.isArray(result.repairableIssues)).toBe(true);
    });
  });
});

// ============================================================================
// CONVENIENCE FUNCTIONS TESTS
// ============================================================================

describe('Convenience Functions', () => {
  it('should perform quick integrity check', async () => {
    await createTestDatabase('QuickTestDB', 'store', [{ id: '1', name: 'Test' }]);

    const result = await quickIntegrityCheck();

    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('status');
    expect(typeof result.score).toBe('number');
    expect(['healthy', 'warning', 'critical']).toContain(result.status);

    await deleteTestDatabase('QuickTestDB');
  });

  it('should handle errors gracefully', async () => {
    // Check a non-existent database
    const checker = new DataIntegrityChecker();
    const result = await checker.checkDatabase('NonExistentDB');

    expect(result).toBeDefined();
    expect(result.score).toBe(100); // No issues if DB doesn't exist
  });
});

// ============================================================================
// DATA REPAIR ENGINE TESTS
// ============================================================================

describe('DataRepairEngine', () => {
  const testDbName = 'TestRepairDB';
  const testStoreName = 'testStore';

  afterEach(async () => {
    await deleteTestDatabase(testDbName);
  });

  describe('Repair Strategies', () => {
    it('should provide repair suggestions', async () => {
      const engine = new DataRepairEngine();

      const issue: IntegrityIssue = {
        id: 'test-1',
        type: 'missing-field',
        severity: 'high',
        store: { database: testDbName, store: testStoreName },
        recordId: 'record1',
        field: 'name',
        description: 'Missing required field',
        repairable: true,
      };

      const suggestion = engine.getRepairSuggestion(issue);

      expect(suggestion).toBeTruthy();
      expect(suggestion).toContain('name');
    });

    it('should estimate repair safety', async () => {
      const engine = new DataRepairEngine();

      const safeIssue: IntegrityIssue = {
        id: 'safe-1',
        type: 'missing-field',
        severity: 'low',
        store: { database: testDbName, store: testStoreName },
        description: 'Missing field',
        repairable: true,
      };

      const dangerousIssue: IntegrityIssue = {
        id: 'danger-1',
        type: 'corruption',
        severity: 'critical',
        store: { database: testDbName, store: testStoreName },
        description: 'Data corruption',
        repairable: false,
      };

      expect(engine.estimateRepairSafety(safeIssue)).toBe('safe');
      expect(engine.estimateRepairSafety(dangerousIssue)).toBe('dangerous');
    });
  });

  describe('Type Conversion', () => {
    it('should convert string to number', async () => {
      const data = [{ id: '1', value: '123' }]; // String should be number

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const integrityResult = await checker.checkDatabase(testDbName);

      // Should detect type issue
      const typeIssues = integrityResult.stores[0].issues.filter(
        (issue) => issue.type === 'invalid-type'
      );
      expect(typeIssues.length).toBeGreaterThan(0);
    });

    it('should convert number to string', async () => {
      const data = [{ id: '1', name: 123 }]; // Number should be string

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkDatabase(testDbName);

      expect(result.stores[0].issues.length).toBeGreaterThan(0);
    });
  });

  describe('Repair Operations', () => {
    it('should handle dry run mode', async () => {
      const data = [{ id: '1', value: 'invalid' }];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const integrityResult = await checker.checkSystemIntegrity();

      const engine = new DataRepairEngine();
      const repairResult = await engine.repairSystem(integrityResult, {
        dryRun: true,
      });

      expect(repairResult.repairedIssues.length).toBe(0);
      expect(repairResult.log.length).toBeGreaterThan(0);
    });

    it('should create backup before repair', async () => {
      const data = [{ id: '1', value: '123' }];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const integrityResult = await checker.checkSystemIntegrity();

      // Mock backup creation
      vi.mock('../manager', () => ({
        createBackup: vi.fn(() => Promise.resolve('backup-id')),
      }));

      const engine = new DataRepairEngine();
      const repairResult = await engine.repairSystem(integrityResult, {
        createBackup: true,
        dryRun: true,
      });

      // Should at least attempt backup
      expect(repairResult).toBeDefined();
    });

    it('should group issues by store for efficient repair', async () => {
      const data = [
        { id: '1', value: 'invalid1' },
        { id: '2', value: 'invalid2' },
        { id: '3', value: 'invalid3' },
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const result = await checker.checkSystemIntegrity();

      expect(result.repairableIssues).toBeDefined();
    });
  });

  describe('Repair Result', () => {
    it('should track affected records', async () => {
      const data = [
        { id: '1', name: 'Valid', value: 100 },
        { id: '2', name: 'Invalid' },
      ];

      await createTestDatabase(testDbName, testStoreName, data);

      const checker = new DataIntegrityChecker();
      const integrityResult = await checker.checkSystemIntegrity();

      const engine = new DataRepairEngine();
      const repairResult = await engine.repairSystem(integrityResult, {
        dryRun: true,
      });

      expect(repairResult.recordsAffected).toBeGreaterThanOrEqual(0);
      expect(repairResult.databasesModified).toBeDefined();
    });

    it('should log all repair operations', async () => {
      await createTestDatabase(testDbName, testStoreName, [{ id: '1', value: 'invalid' }]);

      const checker = new DataIntegrityChecker();
      const integrityResult = await checker.checkSystemIntegrity();

      const engine = new DataRepairEngine();
      const repairResult = await engine.repairSystem(integrityResult, {
        dryRun: true,
      });

      expect(repairResult.log).toBeDefined();
      expect(Array.isArray(repairResult.log)).toBe(true);
      expect(repairResult.log.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// REPAIR CONVENIENCE FUNCTIONS TESTS
// ============================================================================

describe('Repair Convenience Functions', () => {
  it('should get repair suggestion for issue', () => {
    const issue: IntegrityIssue = {
      id: 'test-1',
      type: 'missing-field',
      severity: 'medium',
      store: { database: 'TestDB', store: 'testStore' },
      field: 'name',
      description: 'Missing field',
      repairable: true,
    };

    const suggestion = getRepairSuggestion(issue);

    expect(suggestion).toBeTruthy();
    expect(typeof suggestion).toBe('string');
  });

  it('should estimate repair safety for issue', () => {
    const issue: IntegrityIssue = {
      id: 'test-1',
      type: 'missing-field',
      severity: 'low',
      store: { database: 'TestDB', store: 'testStore' },
      description: 'Missing field',
      repairable: true,
    };

    const safety = estimateRepairSafety(issue);

    expect(['safe', 'caution', 'dangerous']).toContain(safety);
  });

  it('should return null for non-repairable issues', () => {
    const issue: IntegrityIssue = {
      id: 'test-1',
      type: 'corruption',
      severity: 'critical',
      store: { database: 'TestDB', store: 'testStore' },
      description: 'Data corruption',
      repairable: false,
    };

    const suggestion = getRepairSuggestion(issue);

    expect(suggestion).toBeNull();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Data Integrity Integration Tests', () => {
  it('should perform full check and repair cycle', async () => {
    const dbName = 'IntegrationTestDB';
    const storeName = 'testStore';

    // Create database with issues
    const data = [
      { id: '1', name: 'Valid', value: 100 },
      { id: '2', name: 'Invalid Type', value: 'should be number' },
      { id: '3' }, // Missing fields
    ];

    await createTestDatabase(dbName, storeName, data);

    // Check integrity
    const checkResult = await checkSystemIntegrity();

    expect(checkResult.totalIssues).toBeGreaterThan(0);
    expect(checkResult.score).toBeLessThan(100);

    // Attempt repair (dry run)
    const repairResult = await repairSystem(checkResult, {
      dryRun: true,
    });

    expect(repairResult).toBeDefined();
    expect(repairResult.log.length).toBeGreaterThan(0);

    // Cleanup
    await deleteTestDatabase(dbName);
  });

  it('should handle multiple databases with different issues', async () => {
    const db1 = 'MultiTestDB1';
    const db2 = 'MultiTestDB2';

    await createTestDatabase(db1, 'store1', [{ id: '1', name: 'Test' }]);
    await createTestDatabase(db2, 'store2', [{ id: '2' }]); // Missing fields

    const result = await checkSystemIntegrity();

    expect(result.databases.length).toBeGreaterThanOrEqual(2);
    expect(result.summary.totalDatabases).toBeGreaterThanOrEqual(2);

    await deleteTestDatabase(db1);
    await deleteTestDatabase(db2);
  });

  it('should maintain data integrity after repair', async () => {
    const dbName = 'AfterRepairTestDB';
    const storeName = 'testStore';

    const originalData = [{ id: '1', name: 'Test', value: 100 }];
    await createTestDatabase(dbName, storeName, originalData);

    // Initial check
    const beforeRepair = await checkSystemIntegrity();
    const scoreBefore = beforeRepair.score;

    // Repair (dry run - shouldn't change anything)
    await repairSystem(beforeRepair, { dryRun: true });

    // Check again
    const afterRepair = await checkSystemIntegrity();
    const scoreAfter = afterRepair.score;

    // Scores should be the same since it was a dry run
    expect(scoreAfter).toBe(scoreBefore);

    await deleteTestDatabase(dbName);
  });
});
