/**
 * Legacy Data Adapter Tests for WS-175 Encryption Integration
 * Comprehensive test coverage for legacy data migration to encrypted format
 */

// Vitest globals enabled - no imports needed for test functions
import { vi } from 'vitest';
import {
  LegacyDataAdapter,
  createLegacyDataAdapter,
  type MigrationPlan,
  type MigrationProgress,
  type BackupInfo,
  type ValidationResult
} from '@/lib/integrations/encryption/legacy-data-adapter';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  rpc: vi.fn()
};

// Mock createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

describe('Legacy Data Adapter - Migration Planning', () => {
  let adapter: LegacyDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LegacyDataAdapter(
      'https://test.supabase.co',
      'test-service-key'
    );
  });

  describe('createMigrationPlan', () => {
    it('should create comprehensive migration plan for all tables', async () => {
      // Mock table counts
      const mockCounts = {
        user_profiles: 150,
        organizations: 25,
        clients: 100,
        guests: 500,
        vendors: 75,
        payments: 200,
        tasks: 300
      };

      mockSupabase.select.mockImplementation(function() {
        const tableName = this.tableName || 'unknown';
        return Promise.resolve({
          count: mockCounts[tableName] || 0,
          error: null
        });
      });

      // Mock from method to set table context
      mockSupabase.from.mockImplementation((tableName) => {
        mockSupabase.tableName = tableName;
        return mockSupabase;
      });

      const plan = await adapter.createMigrationPlan();

      expect(plan).toBeDefined();
      expect(plan.id).toContain('migration_');
      expect(plan.tables.length).toBeGreaterThan(0);
      expect(plan.totalRecords).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.dependencies).toBeDefined();
      expect(plan.createdAt).toBeInstanceOf(Date);
    });

    it('should prioritize tables correctly', async () => {
      // Mock table counts
      mockSupabase.select.mockResolvedValue({
        count: 100,
        error: null
      });

      const plan = await adapter.createMigrationPlan();

      // Priority 1 tables should come first
      const priority1Tables = plan.tables.filter(t => t.priority === 1);
      const firstTable = plan.tables[0];
      
      expect(priority1Tables.length).toBeGreaterThan(0);
      expect(firstTable.priority).toBe(1);
    });

    it('should calculate appropriate batch sizes', async () => {
      mockSupabase.select.mockResolvedValue({
        count: 1000,
        error: null
      });

      const plan = await adapter.createMigrationPlan();

      plan.tables.forEach(table => {
        expect(table.batchSize).toBeGreaterThan(0);
        expect(table.batchSize).toBeLessThanOrEqual(100);
      });
    });

    it('should handle empty tables gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        count: 0,
        error: null
      });

      const plan = await adapter.createMigrationPlan();

      expect(plan.tables.length).toBe(0);
      expect(plan.totalRecords).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        count: null,
        error: { message: 'Database connection failed' }
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

      const plan = await adapter.createMigrationPlan();

      expect(plan.tables.length).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Table Dependencies', () => {
    beforeEach(() => {
      mockSupabase.select.mockResolvedValue({
        count: 100,
        error: null
      });
    });

    it('should respect table dependencies in migration order', async () => {
      const plan = await adapter.createMigrationPlan();

      // Find dependent tables
      const organizationsTable = plan.tables.find(t => t.tableName === 'organizations');
      const clientsTable = plan.tables.find(t => t.tableName === 'clients');
      const guestsTable = plan.tables.find(t => t.tableName === 'guests');

      if (organizationsTable && clientsTable && guestsTable) {
        const orgIndex = plan.tables.indexOf(organizationsTable);
        const clientIndex = plan.tables.indexOf(clientsTable);
        const guestIndex = plan.tables.indexOf(guestsTable);

        // Organizations should come before clients
        expect(orgIndex).toBeLessThan(clientIndex);
        // Clients should come before guests
        expect(clientIndex).toBeLessThan(guestIndex);
      }
    });

    it('should identify all dependencies correctly', async () => {
      const plan = await adapter.createMigrationPlan();

      // Check that dependencies are properly identified
      const clientsTable = plan.tables.find(t => t.tableName === 'clients');
      const guestsTable = plan.tables.find(t => t.tableName === 'guests');

      expect(clientsTable?.dependencies).toContain('organizations');
      expect(guestsTable?.dependencies).toContain('clients');
    });
  });
});

describe('Legacy Data Adapter - Data Migration', () => {
  let adapter: LegacyDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LegacyDataAdapter(
      'https://test.supabase.co',
      'test-service-key'
    );
  });

  describe('migrateTableToEncrypted', () => {
    it('should successfully migrate a table with encrypted fields', async () => {
      // Mock backup creation
      mockSupabase.select.mockResolvedValueOnce({
        count: 100,
        error: null
      });

      // Mock record fetching
      const mockRecords = [
        { id: '1', email: 'user1@example.com', phone: '+1234567890' },
        { id: '2', email: 'user2@example.com', phone: '+1234567891' }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRecords,
        error: null
      });

      // Mock update operations
      mockSupabase.update.mockResolvedValue({
        error: null
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const progress = await adapter.migrateTableToEncrypted(
        'user_profiles',
        ['email', 'phone'],
        2 // Small batch size for testing
      );

      expect(progress.status).toBe('completed');
      expect(progress.processedRecords).toBe(2);
      expect(progress.totalRecords).toBe(100);
      expect(progress.errors.length).toBe(0);
      expect(progress.completedAt).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle individual record encryption failures gracefully', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        count: 2,
        error: null
      });

      // Mock records with one that will fail encryption
      const mockRecords = [
        { id: '1', email: 'valid@example.com' },
        { id: '2', email: 'invalid-email-data' }
      ];

      mockSupabase.select.mockResolvedValueOnce({
        data: mockRecords,
        error: null
      });

      // Mock update to fail for one record
      mockSupabase.update
        .mockResolvedValueOnce({ error: null }) // First record succeeds
        .mockResolvedValueOnce({ error: { message: 'Update failed' } }); // Second fails

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const progress = await adapter.migrateTableToEncrypted(
        'user_profiles',
        ['email'],
        1
      );

      expect(progress.status).toBe('completed'); // Should complete despite individual failures
      expect(progress.errors.length).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle batch processing correctly', async () => {
      const totalRecords = 5;
      const batchSize = 2;

      mockSupabase.select.mockResolvedValueOnce({
        count: totalRecords,
        error: null
      });

      // Mock batch fetches
      const batches = [
        [{ id: '1', email: 'user1@example.com' }, { id: '2', email: 'user2@example.com' }],
        [{ id: '3', email: 'user3@example.com' }, { id: '4', email: 'user4@example.com' }],
        [{ id: '5', email: 'user5@example.com' }]
      ];

      let batchIndex = 0;
      mockSupabase.range.mockImplementation(() => {
        return Promise.resolve({
          data: batches[batchIndex++] || [],
          error: null
        });
      });

      mockSupabase.update.mockResolvedValue({ error: null });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const progress = await adapter.migrateTableToEncrypted(
        'user_profiles',
        ['email'],
        batchSize
      );

      expect(progress.status).toBe('completed');
      expect(progress.totalBatches).toBe(Math.ceil(totalRecords / batchSize));
      expect(progress.processedRecords).toBe(totalRecords);

      consoleSpy.mockRestore();
    });

    it('should perform automatic rollback on critical failures', async () => {
      mockSupabase.select.mockResolvedValueOnce({
        count: 10,
        error: null
      });

      // Mock critical failure (connection error)
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'connection timeout' }
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation();

      const progress = await adapter.migrateTableToEncrypted(
        'user_profiles',
        ['email']
      );

      expect(progress.status).toBe('rolled_back');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Attempting automatic rollback')
      );

      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Backup and Recovery', () => {
    it('should create backup before migration', async () => {
      mockSupabase.select.mockResolvedValue({
        count: 100,
        error: null
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const backup = await adapter.backupOriginalData('user_profiles');

      expect(backup.tableName).toBe('user_profiles');
      expect(backup.backupTableName).toContain('user_profiles_backup_');
      expect(backup.recordCount).toBe(100);
      expect(backup.checksum).toBeDefined();
      expect(backup.createdAt).toBeInstanceOf(Date);

      consoleSpy.mockRestore();
    });

    it('should handle backup failures gracefully', async () => {
      mockSupabase.select.mockResolvedValue({
        count: null,
        error: { message: 'Permission denied' }
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation();

      await expect(adapter.backupOriginalData('user_profiles'))
        .rejects.toThrow();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should successfully rollback failed migration', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      const logSpy = vi.spyOn(console, 'log').mockImplementation();

      const rollbackResult = await adapter.rollbackMigration('user_profiles');

      expect(rollbackResult).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rolling back migration')
      );

      consoleSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('Migration Validation', () => {
    it('should validate successful migration integrity', async () => {
      const encryptedRecords = [
        {
          id: '1',
          email: {
            encrypted_value: Buffer.from('user1@example.com').toString('base64'),
            algorithm: 'AES-256-GCM',
            iv: 'test-iv',
            auth_tag: 'test-tag',
            encrypted_at: '2025-01-20T10:00:00.000Z',
            schema_version: 1
          }
        },
        {
          id: '2',
          email: {
            encrypted_value: Buffer.from('user2@example.com').toString('base64'),
            algorithm: 'AES-256-GCM',
            iv: 'test-iv',
            auth_tag: 'test-tag',
            encrypted_at: '2025-01-20T10:00:00.000Z',
            schema_version: 1
          }
        }
      ];

      mockSupabase.select.mockResolvedValue({
        data: encryptedRecords,
        count: 2,
        error: null
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const validation = await adapter.validateMigrationIntegrity(
        'user_profiles',
        ['email']
      );

      expect(validation.isValid).toBe(true);
      expect(validation.totalRecords).toBe(2);
      expect(validation.encryptedRecords).toBe(2);
      expect(validation.failedRecords.length).toBe(0);
      expect(validation.integrityErrors.length).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should detect corrupted encrypted data', async () => {
      const corruptedRecords = [
        {
          id: '1',
          email: {
            encrypted_value: 'valid-data',
            algorithm: 'AES-256-GCM',
            iv: 'test-iv',
            auth_tag: 'test-tag',
            encrypted_at: '2025-01-20T10:00:00.000Z',
            schema_version: 1
          }
        },
        {
          id: '2',
          email: 'plain-text-email@example.com' // Not encrypted!
        }
      ];

      mockSupabase.select.mockResolvedValue({
        data: corruptedRecords,
        count: 2,
        error: null
      });

      const validation = await adapter.validateMigrationIntegrity(
        'user_profiles',
        ['email']
      );

      expect(validation.isValid).toBe(false);
      expect(validation.totalRecords).toBe(2);
      expect(validation.encryptedRecords).toBe(1);
      expect(validation.failedRecords.length).toBeGreaterThan(0);
    });

    it('should handle validation query failures', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        count: null,
        error: { message: 'Query failed' }
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation();

      const validation = await adapter.validateMigrationIntegrity(
        'user_profiles',
        ['email']
      );

      expect(validation.isValid).toBe(false);
      expect(validation.integrityErrors.length).toBeGreaterThan(0);
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});

describe('Legacy Data Adapter - Performance and Edge Cases', () => {
  let adapter: LegacyDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LegacyDataAdapter(
      'https://test.supabase.co',
      'test-service-key'
    );
  });

  describe('Batch Size Calculation', () => {
    it('should calculate optimal batch sizes for different table sizes', async () => {
      const testCases = [
        { recordCount: 100, fieldCount: 2, expectedRange: [10, 100] },
        { recordCount: 10000, fieldCount: 5, expectedRange: [10, 50] },
        { recordCount: 50, fieldCount: 1, expectedRange: [50, 100] }
      ];

      // Access private method via any cast for testing
      const adapterAny = adapter as any;

      testCases.forEach(({ recordCount, fieldCount, expectedRange }) => {
        const batchSize = adapterAny.calculateOptimalBatchSize(recordCount, fieldCount);
        
        expect(batchSize).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(batchSize).toBeLessThanOrEqual(expectedRange[1]);
        expect(batchSize).toBeGreaterThan(0);
      });
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate realistic migration durations', async () => {
      const adapterAny = adapter as any;

      const duration1 = adapterAny.estimateMigrationDuration(1000, 5);
      const duration2 = adapterAny.estimateMigrationDuration(10000, 10);

      expect(duration1).toBeGreaterThan(0);
      expect(duration2).toBeGreaterThan(duration1); // More records = longer duration
      expect(typeof duration1).toBe('number');
    });
  });

  describe('Error Classification', () => {
    it('should correctly identify critical errors', async () => {
      const adapterAny = adapter as any;

      const criticalErrors = [
        new Error('connection timeout'),
        new Error('permission denied'),
        new Error('foreign key constraint violation'),
        { message: 'database connection failed' }
      ];

      const nonCriticalErrors = [
        new Error('validation failed'),
        new Error('invalid data format'),
        { message: 'record not found' }
      ];

      criticalErrors.forEach(error => {
        expect(adapterAny.isCriticalError(error)).toBe(true);
      });

      nonCriticalErrors.forEach(error => {
        expect(adapterAny.isCriticalError(error)).toBe(false);
      });
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle large datasets with proper memory management', async () => {
      const largeRecordCount = 10000;
      const batchSize = 100;

      mockSupabase.select.mockResolvedValueOnce({
        count: largeRecordCount,
        error: null
      });

      // Mock batch processing
      let processedBatches = 0;
      mockSupabase.range.mockImplementation(() => {
        processedBatches++;
        const batchRecords = Array.from({ length: Math.min(batchSize, 10) }, (_, i) => ({
          id: `${processedBatches}-${i}`,
          email: `user${processedBatches}-${i}@example.com`
        }));
        
        return Promise.resolve({
          data: batchRecords,
          error: null
        });
      });

      mockSupabase.update.mockResolvedValue({ error: null });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const progress = await adapter.migrateTableToEncrypted(
        'large_table',
        ['email'],
        batchSize
      );

      expect(progress.status).toBe('completed');
      expect(progress.totalBatches).toBe(Math.ceil(largeRecordCount / batchSize));
      expect(processedBatches).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple migration operations safely', async () => {
      const tables = ['table1', 'table2', 'table3'];
      
      mockSupabase.select.mockResolvedValue({
        count: 10,
        error: null
      });

      const mockRecords = [
        { id: '1', email: 'test1@example.com' },
        { id: '2', email: 'test2@example.com' }
      ];

      mockSupabase.range.mockResolvedValue({
        data: mockRecords,
        error: null
      });

      mockSupabase.update.mockResolvedValue({ error: null });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      const migrations = tables.map(table => 
        adapter.migrateTableToEncrypted(table, ['email'], 2)
      );

      const results = await Promise.all(migrations);

      results.forEach(result => {
        expect(result.status).toBe('completed');
        expect(result.processedRecords).toBeGreaterThan(0);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should include proper delays between batches', async () => {
      const adapterAny = adapter as any;
      const delaySpy = vi.spyOn(adapterAny, 'delay').mockResolvedValue(undefined);

      mockSupabase.select.mockResolvedValue({
        count: 10,
        error: null
      });

      mockSupabase.range.mockResolvedValue({
        data: [{ id: '1', email: 'test@example.com' }],
        error: null
      });

      mockSupabase.update.mockResolvedValue({ error: null });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      await adapter.migrateTableToEncrypted('test_table', ['email'], 1);

      expect(delaySpy).toHaveBeenCalled();

      delaySpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });
});

describe('Legacy Data Adapter - Factory and Utilities', () => {
  it('should create adapter via factory function', () => {
    const adapter = createLegacyDataAdapter(
      'https://test.supabase.co',
      'test-service-key'
    );

    expect(adapter).toBeInstanceOf(LegacyDataAdapter);
    expect(adapter.createMigrationPlan).toBeDefined();
    expect(adapter.migrateTableToEncrypted).toBeDefined();
  });

  it('should handle invalid connection parameters gracefully', () => {
    expect(() => {
      new LegacyDataAdapter('', '');
    }).not.toThrow();
  });
});

describe('Legacy Data Adapter - Integration Scenarios', () => {
  let adapter: LegacyDataAdapter;

  beforeEach(() => {
    adapter = new LegacyDataAdapter(
      'https://test.supabase.co',
      'test-service-key'
    );
  });

  it('should handle complete migration workflow', async () => {
    // Setup mock data
    mockSupabase.select
      .mockResolvedValueOnce({ count: 5, error: null }) // Table count
      .mockResolvedValueOnce({ count: 5, error: null }) // Migration count
      .mockResolvedValueOnce({ // Record fetch
        data: [
          { id: '1', email: 'user1@example.com' },
          { id: '2', email: 'user2@example.com' }
        ],
        error: null
      })
      .mockResolvedValueOnce({ // Validation fetch
        data: [
          {
            id: '1',
            email: {
              encrypted_value: 'encrypted-data-1',
              algorithm: 'AES-256-GCM',
              iv: 'iv1',
              auth_tag: 'tag1',
              encrypted_at: '2025-01-20T10:00:00.000Z',
              schema_version: 1
            }
          }
        ],
        count: 1,
        error: null
      });

    mockSupabase.update.mockResolvedValue({ error: null });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

    // 1. Create migration plan
    const plan = await adapter.createMigrationPlan();
    expect(plan.tables.length).toBeGreaterThan(0);

    // 2. Migrate first table
    const firstTable = plan.tables[0];
    const migration = await adapter.migrateTableToEncrypted(
      firstTable.tableName,
      firstTable.encryptedFields,
      firstTable.batchSize
    );

    expect(migration.status).toBe('completed');

    // 3. Validate migration
    const validation = await adapter.validateMigrationIntegrity(
      firstTable.tableName,
      firstTable.encryptedFields
    );

    expect(validation.isValid).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should handle partial migration failure and recovery', async () => {
    mockSupabase.select
      .mockResolvedValueOnce({ count: 2, error: null })
      .mockResolvedValueOnce({
        data: [
          { id: '1', email: 'user1@example.com' },
          { id: '2', email: 'user2@example.com' }
        ],
        error: null
      });

    // First update succeeds, second fails
    mockSupabase.update
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Update failed' } });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

    const migration = await adapter.migrateTableToEncrypted(
      'test_table',
      ['email'],
      1
    );

    expect(migration.status).toBe('completed');
    expect(migration.errors.length).toBeGreaterThan(0);
    expect(migration.processedRecords).toBe(1); // Only successful record

    consoleSpy.mockRestore();
    warnSpy.mockRestore();
  });
});