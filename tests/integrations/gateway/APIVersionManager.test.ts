import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APIVersionManager } from '../../../src/integrations/api-gateway/APIVersionManager';

describe('APIVersionManager', () => {
  let versionManager: APIVersionManager;
  const mockConfig = {
    defaultVersion: '1.0.0',
    supportedVersions: ['1.0.0', '1.1.0', '2.0.0'],
    deprecationWarningThreshold: 30, // days
    maxConcurrentVersions: 3,
    enableVersionMigration: true,
    enableBackwardCompatibility: true,
    weddingSeasonConsiderations: {
      freezeUpdatesInSeason: true,
      seasonMonths: [5, 6, 7, 8, 9, 10], // May-October
      allowCriticalUpdates: true
    }
  };

  beforeEach(() => {
    versionManager = new APIVersionManager(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Version Registration', () => {
    it('should register a new API version successfully', async () => {
      const versionSpec = {
        version: '1.2.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.2/schema',
        endpoints: [
          { path: '/vendors', method: 'GET' },
          { path: '/vendors/{id}', method: 'GET' },
          { path: '/vendors', method: 'POST' }
        ],
        deprecationDate: null,
        migrationGuide: 'https://docs.vendor.com/migration/v1.2',
        breakingChanges: [
          'Renamed field "phone" to "phoneNumber"',
          'Added required field "businessLicense"'
        ],
        backwardCompatible: false
      };

      const result = await versionManager.registerVersion(versionSpec);

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.2.0');
    });

    it('should validate version specification before registration', async () => {
      const invalidSpec = {
        version: 'invalid-version',
        apiId: '',
        schemaUrl: 'invalid-url',
        endpoints: [],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true
      };

      await expect(versionManager.registerVersion(invalidSpec)).rejects.toThrow('Invalid version specification');
    });

    it('should handle duplicate version registration', async () => {
      const versionSpec = {
        version: '1.0.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.0/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true
      };

      await versionManager.registerVersion(versionSpec);
      
      const result = await versionManager.registerVersion(versionSpec);
      expect(result.success).toBe(true);
      expect(result.message).toContain('updated');
    });
  });

  describe('Version Resolution', () => {
    beforeEach(async () => {
      // Register test versions
      const versions = [
        {
          version: '1.0.0',
          apiId: 'vendor-api',
          schemaUrl: 'https://api.vendor.com/v1.0/schema',
          endpoints: [{ path: '/vendors', method: 'GET' }],
          deprecationDate: null,
          migrationGuide: '',
          breakingChanges: [],
          backwardCompatible: true
        },
        {
          version: '1.1.0',
          apiId: 'vendor-api',
          schemaUrl: 'https://api.vendor.com/v1.1/schema',
          endpoints: [
            { path: '/vendors', method: 'GET' },
            { path: '/vendors/search', method: 'POST' }
          ],
          deprecationDate: null,
          migrationGuide: '',
          breakingChanges: [],
          backwardCompatible: true
        },
        {
          version: '2.0.0',
          apiId: 'vendor-api',
          schemaUrl: 'https://api.vendor.com/v2.0/schema',
          endpoints: [
            { path: '/v2/vendors', method: 'GET' },
            { path: '/v2/vendors/search', method: 'POST' }
          ],
          deprecationDate: null,
          migrationGuide: 'https://docs.vendor.com/migration/v2',
          breakingChanges: ['Changed base path from / to /v2/'],
          backwardCompatible: false
        }
      ];

      for (const version of versions) {
        await versionManager.registerVersion(version);
      }
    });

    it('should resolve version from explicit header', async () => {
      const request = {
        headers: { 'api-version': '1.1.0' },
        path: '/vendors',
        method: 'GET'
      };

      const resolvedVersion = await versionManager.resolveVersion('vendor-api', request);
      expect(resolvedVersion.version).toBe('1.1.0');
    });

    it('should resolve version from URL path', async () => {
      const request = {
        headers: {},
        path: '/v2/vendors',
        method: 'GET'
      };

      const resolvedVersion = await versionManager.resolveVersion('vendor-api', request);
      expect(resolvedVersion.version).toBe('2.0.0');
    });

    it('should fallback to default version when none specified', async () => {
      const request = {
        headers: {},
        path: '/vendors',
        method: 'GET'
      };

      const resolvedVersion = await versionManager.resolveVersion('vendor-api', request);
      expect(resolvedVersion.version).toBe('1.0.0'); // Default version
    });

    it('should handle unsupported version requests', async () => {
      const request = {
        headers: { 'api-version': '3.0.0' },
        path: '/vendors',
        method: 'GET'
      };

      await expect(versionManager.resolveVersion('vendor-api', request)).rejects.toThrow('Unsupported API version');
    });
  });

  describe('Compatibility Matrix', () => {
    it('should build compatibility matrix between versions', async () => {
      const matrix = await versionManager.buildCompatibilityMatrix('vendor-api');

      expect(matrix).toBeDefined();
      expect(matrix['1.0.0']).toBeDefined();
      expect(matrix['1.0.0']['1.1.0']).toBeDefined();
    });

    it('should identify backward compatible versions', async () => {
      const compatible = await versionManager.findCompatibleVersions('vendor-api', '1.1.0');

      expect(compatible).toContain('1.0.0'); // Should be backward compatible
      expect(compatible).toContain('1.1.0'); // Self-compatible
    });

    it('should identify breaking changes between versions', async () => {
      const changes = await versionManager.getBreakingChanges('vendor-api', '1.0.0', '2.0.0');

      expect(changes).toBeDefined();
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0]).toContain('Changed base path');
    });

    it('should generate migration recommendations', async () => {
      const recommendations = await versionManager.getMigrationRecommendations('vendor-api', '1.0.0', '2.0.0');

      expect(recommendations).toBeDefined();
      expect(recommendations.steps).toBeDefined();
      expect(recommendations.estimatedEffort).toBeDefined();
      expect(recommendations.riskLevel).toBeDefined();
    });
  });

  describe('Version Deprecation', () => {
    it('should mark version as deprecated', async () => {
      const deprecationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const result = await versionManager.deprecateVersion('vendor-api', '1.0.0', deprecationDate, 'Please migrate to v2.0.0');

      expect(result.success).toBe(true);
      expect(result.deprecationDate).toEqual(deprecationDate);
    });

    it('should list deprecated versions', async () => {
      const deprecationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await versionManager.deprecateVersion('vendor-api', '1.0.0', deprecationDate, 'Migration required');

      const deprecated = await versionManager.getDeprecatedVersions('vendor-api');

      expect(deprecated).toHaveLength(1);
      expect(deprecated[0].version).toBe('1.0.0');
      expect(deprecated[0].deprecationReason).toBe('Migration required');
    });

    it('should send deprecation warnings', async () => {
      const deprecationDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      await versionManager.deprecateVersion('vendor-api', '1.0.0', deprecationDate, 'End of support');

      const warnings = await versionManager.checkDeprecationWarnings('vendor-api');

      expect(warnings).toHaveLength(1);
      expect(warnings[0].version).toBe('1.0.0');
      expect(warnings[0].daysUntilDeprecation).toBeLessThan(30);
    });
  });

  describe('Usage Analytics', () => {
    it('should track version usage statistics', async () => {
      const request = {
        headers: { 'api-version': '1.1.0' },
        path: '/vendors',
        method: 'GET'
      };

      await versionManager.recordVersionUsage('vendor-api', request, '1.1.0');

      const usage = await versionManager.getVersionUsage('vendor-api', '1.1.0');
      expect(usage.requestCount).toBeGreaterThan(0);
      expect(usage.lastUsed).toBeDefined();
    });

    it('should generate usage reports', async () => {
      // Record some usage
      const requests = [
        { headers: { 'api-version': '1.0.0' }, path: '/vendors', method: 'GET' },
        { headers: { 'api-version': '1.1.0' }, path: '/vendors', method: 'GET' },
        { headers: { 'api-version': '1.1.0' }, path: '/vendors/search', method: 'POST' }
      ];

      for (const request of requests) {
        const version = request.headers['api-version'];
        await versionManager.recordVersionUsage('vendor-api', request, version);
      }

      const report = await versionManager.generateUsageReport('vendor-api');

      expect(report.totalRequests).toBe(3);
      expect(report.versionDistribution['1.0.0']).toBe(1);
      expect(report.versionDistribution['1.1.0']).toBe(2);
    });

    it('should identify unused versions for cleanup', async () => {
      // Don't record usage for some versions
      const unusedVersions = await versionManager.findUnusedVersions('vendor-api', 30); // 30 days

      expect(Array.isArray(unusedVersions)).toBe(true);
    });
  });

  describe('Wedding Season Considerations', () => {
    it('should block non-critical updates during wedding season', async () => {
      // Mock current date to be in wedding season (June)
      const mockDate = new Date(2024, 5, 15); // June 15, 2024
      vi.setSystemTime(mockDate);

      const nonCriticalUpdate = {
        version: '1.3.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.3/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true,
        critical: false
      };

      await expect(versionManager.registerVersion(nonCriticalUpdate)).rejects.toThrow('Non-critical updates blocked during wedding season');
    });

    it('should allow critical updates during wedding season', async () => {
      // Mock current date to be in wedding season (August)
      const mockDate = new Date(2024, 7, 15); // August 15, 2024
      vi.setSystemTime(mockDate);

      const criticalUpdate = {
        version: '1.3.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.3/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true,
        critical: true,
        criticalReason: 'Security vulnerability fix'
      };

      const result = await versionManager.registerVersion(criticalUpdate);
      expect(result.success).toBe(true);
    });

    it('should schedule updates for post-wedding season', async () => {
      const mockDate = new Date(2024, 6, 15); // July 15, 2024 (wedding season)
      vi.setSystemTime(mockDate);

      const scheduledUpdate = {
        version: '1.4.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.4/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true,
        scheduleForPostSeason: true
      };

      const result = await versionManager.scheduleVersion(scheduledUpdate);
      expect(result.success).toBe(true);
      expect(result.scheduledDate).toBeDefined();

      const scheduledVersions = await versionManager.getScheduledVersions('vendor-api');
      expect(scheduledVersions).toHaveLength(1);
    });
  });

  describe('Migration Support', () => {
    it('should generate migration script', async () => {
      const migrationScript = await versionManager.generateMigrationScript('vendor-api', '1.0.0', '2.0.0');

      expect(migrationScript).toBeDefined();
      expect(migrationScript.steps).toBeDefined();
      expect(migrationScript.rollbackSteps).toBeDefined();
      expect(migrationScript.testCases).toBeDefined();
    });

    it('should validate migration compatibility', async () => {
      const validation = await versionManager.validateMigration('vendor-api', '1.0.0', '2.0.0');

      expect(validation.compatible).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.blockers).toBeDefined();
    });

    it('should support gradual migration with feature flags', async () => {
      const migrationConfig = {
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        strategy: 'gradual',
        rolloutPercentage: 20, // Start with 20% of traffic
        featureFlags: {
          'new-vendor-api': false,
          'legacy-compatibility': true
        }
      };

      const result = await versionManager.startGradualMigration('vendor-api', migrationConfig);
      expect(result.success).toBe(true);
      expect(result.migrationId).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid version format', async () => {
      const invalidVersions = ['v1.0', '1.0.0.0', 'latest', '1.x.x'];

      for (const version of invalidVersions) {
        const spec = {
          version,
          apiId: 'vendor-api',
          schemaUrl: 'https://api.vendor.com/schema',
          endpoints: [],
          deprecationDate: null,
          migrationGuide: '',
          breakingChanges: [],
          backwardCompatible: true
        };

        await expect(versionManager.registerVersion(spec)).rejects.toThrow();
      }
    });

    it('should handle schema validation failures', async () => {
      const spec = {
        version: '1.5.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://invalid-schema-url.com/404',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true
      };

      const result = await versionManager.registerVersion(spec);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema validation failed');
    });

    it('should handle concurrent version registration', async () => {
      const spec = {
        version: '1.6.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.6/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true
      };

      // Simulate concurrent registration
      const promises = [
        versionManager.registerVersion(spec),
        versionManager.registerVersion(spec),
        versionManager.registerVersion(spec)
      ];

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache version resolution results', async () => {
      const request = {
        headers: { 'api-version': '1.1.0' },
        path: '/vendors',
        method: 'GET'
      };

      const start = Date.now();
      await versionManager.resolveVersion('vendor-api', request);
      const firstCallTime = Date.now() - start;

      const start2 = Date.now();
      await versionManager.resolveVersion('vendor-api', request);
      const secondCallTime = Date.now() - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime); // Should be faster due to caching
    });

    it('should invalidate cache when versions are updated', async () => {
      const request = {
        headers: { 'api-version': '1.7.0' },
        path: '/vendors',
        method: 'GET'
      };

      // This should fail initially
      await expect(versionManager.resolveVersion('vendor-api', request)).rejects.toThrow();

      // Register the version
      const spec = {
        version: '1.7.0',
        apiId: 'vendor-api',
        schemaUrl: 'https://api.vendor.com/v1.7/schema',
        endpoints: [{ path: '/vendors', method: 'GET' }],
        deprecationDate: null,
        migrationGuide: '',
        breakingChanges: [],
        backwardCompatible: true
      };
      
      await versionManager.registerVersion(spec);

      // This should now succeed (cache invalidated)
      const result = await versionManager.resolveVersion('vendor-api', request);
      expect(result.version).toBe('1.7.0');
    });
  });
});