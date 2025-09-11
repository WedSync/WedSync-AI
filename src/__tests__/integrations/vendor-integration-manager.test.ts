/**
 * WS-342 Real-Time Wedding Collaboration - Vendor Integration Manager Tests
 * Team C: Integration & System Architecture
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { VendorIntegrationManager } from '@/lib/integrations/vendor-integration-manager';
import { createSupabaseClient } from '@/lib/supabase';
import type { VendorSystemConfig } from '@/lib/integrations/types/integration';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createSupabaseClient: jest.fn(),
}));

// Mock adapters
jest.mock('@/lib/integrations/adapters/photography/tave-adapter');
jest.mock('@/lib/integrations/real-time-sync-orchestrator');
jest.mock('@/lib/integrations/conflict-resolver');

describe('VendorIntegrationManager', () => {
  let vendorManager: VendorIntegrationManager;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: {
                  id: 'test-integration-id',
                  system_type: 'photography_crm',
                  status: 'active',
                },
                error: null,
              }),
            ),
          })),
        })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: { id: 'test-wedding' },
                error: null,
              }),
            ),
          })),
        })),
        upsert: jest.fn(() => Promise.resolve({ error: null })),
      })),
    };

    (createSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    vendorManager = new VendorIntegrationManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectVendorSystem', () => {
    it('should successfully connect a Tave integration', async () => {
      const config: VendorSystemConfig = {
        systemType: 'photography_crm',
        credentials: {
          system: 'tave',
          apiKey: 'test-api-key',
          studioId: 'test-studio',
        },
        configuration: {
          syncFrequency: 300,
        },
      };

      const result = await vendorManager.connectVendorSystem(config);

      expect(result.success).toBe(true);
      expect(result.integrationId).toBe('test-integration-id');
      expect(mockSupabase.from).toHaveBeenCalledWith('vendor_integrations');
    });

    it('should handle unsupported system types', async () => {
      const config: VendorSystemConfig = {
        systemType: 'photography_crm',
        credentials: {
          system: 'unsupported_system',
          apiKey: 'test-key',
        },
        configuration: {},
      };

      const result = await vendorManager.connectVendorSystem(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection test failed');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: new Error('Database error'),
              }),
            ),
          })),
        })),
      }));

      const config: VendorSystemConfig = {
        systemType: 'photography_crm',
        credentials: {
          system: 'tave',
          apiKey: 'test-key',
          studioId: 'test-studio',
        },
        configuration: {},
      };

      const result = await vendorManager.connectVendorSystem(config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save integration');
    });
  });

  describe('syncVendorData', () => {
    beforeEach(() => {
      // Mock successful adapter response
      const mockAdapter = {
        fetchData: jest.fn(() =>
          Promise.resolve({
            systemId: 'tave',
            dataType: 'jobs',
            records: [{ id: 'job1', name: 'Test Wedding' }],
            lastModified: new Date(),
            version: '1.0',
          }),
        ),
        testConnection: jest.fn(() =>
          Promise.resolve({
            success: true,
            capabilities: { supportedDataTypes: ['jobs'] },
          }),
        ),
      };

      // Mock the adapter creation
      vendorManager.getAdapter = jest.fn(() => mockAdapter);
    });

    it('should successfully sync vendor data', async () => {
      const result = await vendorManager.syncVendorData('test-vendor', 'jobs');

      expect(result.success).toBe(true);
      expect(result.syncedRecords).toBe(1);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle missing adapter', async () => {
      vendorManager.getAdapter = jest.fn(() => undefined);

      const result = await vendorManager.syncVendorData(
        'missing-vendor',
        'jobs',
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('No adapter found');
    });

    it('should handle sync errors', async () => {
      const mockAdapter = {
        fetchData: jest.fn(() => Promise.reject(new Error('API Error'))),
      };

      vendorManager.getAdapter = jest.fn(() => mockAdapter);

      const result = await vendorManager.syncVendorData('test-vendor', 'jobs');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].retryable).toBe(true);
    });
  });

  describe('broadcastToVendorSystems', () => {
    it('should broadcast events to all wedding integrations', async () => {
      // Mock wedding integrations
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: [
                {
                  vendor_integration_id: 'integration-1',
                  system_type: 'photography_crm',
                },
                {
                  vendor_integration_id: 'integration-2',
                  system_type: 'venue_management',
                },
              ],
            }),
          ),
        })),
      }));

      // Mock adapters
      const mockAdapter = {
        pushData: jest.fn(() => Promise.resolve({ success: true })),
      };

      vendorManager.getAdapter = jest.fn(() => mockAdapter);

      const event = {
        id: 'test-event',
        weddingId: 'test-wedding',
        eventType: 'wedding_timeline_update' as const,
        data: { timeline: 'updated' },
        priority: 'normal' as const,
        timestamp: new Date(),
        initiatedBy: 'test-user',
        affectedSystems: [],
      };

      const results = await vendorManager.broadcastToVendorSystems(event);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle broadcast failures gracefully', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: [
                {
                  vendor_integration_id: 'integration-1',
                  system_type: 'photography_crm',
                },
              ],
            }),
          ),
        })),
      }));

      const mockAdapter = {
        pushData: jest.fn(() => Promise.reject(new Error('Push failed'))),
      };

      vendorManager.getAdapter = jest.fn(() => mockAdapter);

      const event = {
        id: 'test-event',
        weddingId: 'test-wedding',
        eventType: 'wedding_timeline_update' as const,
        data: { timeline: 'updated' },
        priority: 'normal' as const,
        timestamp: new Date(),
        initiatedBy: 'test-user',
        affectedSystems: [],
      };

      const results = await vendorManager.broadcastToVendorSystems(event);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].deliveryStatus).toBe('failed');
    });
  });

  describe('getWeddingIntegrationStatus', () => {
    it('should return comprehensive wedding integration status', async () => {
      // Mock database responses
      mockSupabase.from = jest.fn((table) => {
        if (table === 'wedding_vendor_integrations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: 'integration-1',
                      system_type: 'photography_crm',
                      status: 'active',
                      vendor_integrations: {
                        capabilities: { syncSupport: true },
                      },
                    },
                  ],
                }),
              ),
            })),
          };
        }

        if (table === 'integration_sync_log') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    single: jest.fn(() =>
                      Promise.resolve({
                        data: {
                          status: 'completed',
                          synced_at: new Date().toISOString(),
                        },
                      }),
                    ),
                  })),
                })),
              })),
            })),
          };
        }

        if (table === 'integration_conflicts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() =>
                Promise.resolve({
                  data: [],
                }),
              ),
            })),
          };
        }

        return {
          select: jest.fn(() => Promise.resolve({ data: [] })),
        };
      });

      const status =
        await vendorManager.getWeddingIntegrationStatus('test-wedding');

      expect(status.integrations).toHaveLength(1);
      expect(status.syncStatus).toBe('completed');
      expect(status.lastSync).toBeDefined();
      expect(status.conflicts).toHaveLength(0);
    });
  });

  describe('trackVendorActivity', () => {
    it('should track vendor activity successfully', async () => {
      const activity = {
        vendorId: 'test-vendor',
        weddingId: 'test-wedding',
        activityType: 'status_update',
        data: { status: 'confirmed' },
        timestamp: new Date(),
      };

      await vendorManager.trackVendorActivity('test-vendor', activity);

      expect(mockSupabase.from).toHaveBeenCalledWith('vendor_activities');
    });

    it('should handle tracking errors gracefully', async () => {
      mockSupabase.from = jest.fn(() => ({
        insert: jest.fn(() => Promise.reject(new Error('Database error'))),
      }));

      const activity = {
        vendorId: 'test-vendor',
        weddingId: 'test-wedding',
        activityType: 'status_update',
        data: { status: 'confirmed' },
        timestamp: new Date(),
      };

      // Should not throw
      await expect(
        vendorManager.trackVendorActivity('test-vendor', activity),
      ).resolves.toBeUndefined();
    });
  });
});

// Performance tests
describe('VendorIntegrationManager Performance', () => {
  let vendorManager: VendorIntegrationManager;

  beforeEach(() => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
    };

    (createSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);
    vendorManager = new VendorIntegrationManager();
  });

  it('should handle concurrent sync operations efficiently', async () => {
    const mockAdapter = {
      fetchData: jest.fn(() =>
        Promise.resolve({
          systemId: 'test',
          dataType: 'jobs',
          records: [],
          lastModified: new Date(),
          version: '1.0',
        }),
      ),
    };

    vendorManager.getAdapter = jest.fn(() => mockAdapter);

    const startTime = Date.now();

    // Run 10 concurrent sync operations
    const syncPromises = Array.from({ length: 10 }, (_, i) =>
      vendorManager.syncVendorData(`vendor-${i}`, 'jobs'),
    );

    const results = await Promise.all(syncPromises);

    const duration = Date.now() - startTime;

    // Should complete within reasonable time (2 seconds for 10 operations)
    expect(duration).toBeLessThan(2000);
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should limit API calls within rate limits', async () => {
    const mockAdapter = {
      fetchData: jest.fn(() =>
        Promise.resolve({
          systemId: 'test',
          dataType: 'jobs',
          records: [],
          lastModified: new Date(),
          version: '1.0',
        }),
      ),
    };

    vendorManager.getAdapter = jest.fn(() => mockAdapter);

    // Simulate rate-limited operations
    const operations = Array.from({ length: 100 }, (_, i) =>
      vendorManager.syncVendorData('test-vendor', 'jobs'),
    );

    const startTime = Date.now();
    await Promise.all(operations);
    const duration = Date.now() - startTime;

    // Should respect rate limits and not overwhelm the system
    expect(mockAdapter.fetchData).toHaveBeenCalledTimes(100);
    expect(duration).toBeGreaterThan(100); // Some delay for rate limiting
  });
});
