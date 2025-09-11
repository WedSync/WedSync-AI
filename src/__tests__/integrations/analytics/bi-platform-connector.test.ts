import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BIPlatformConnector } from '@/lib/integrations/analytics/bi-platform-connector';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ error: null })),
    update: vi.fn(() => ({ error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        data: [],
        error: null,
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase,
}));

// Mock external platform APIs
const mockTableauResponse = {
  workbooks: [
    { id: '1', name: 'Wedding Analytics Dashboard', projectId: 'default' },
    { id: '2', name: 'Seasonal Performance Report', projectId: 'default' },
  ],
  datasources: [
    { id: 'ds1', name: 'Wedding Bookings', type: 'excel-direct' },
    { id: 'ds2', name: 'Vendor Performance', type: 'sqlserver' },
  ],
};

const mockPowerBIResponse = {
  datasets: [{ id: 'dataset1', name: 'Wedding Data Warehouse', tables: [] }],
  reports: [
    { id: 'report1', name: 'Wedding Vendor Analytics', datasetId: 'dataset1' },
  ],
};

describe('BIPlatformConnector', () => {
  let connector: BIPlatformConnector;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    weddingOptimized: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new BIPlatformConnector(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeInstanceOf(BIPlatformConnector);
      expect((connector as any).organizationId).toBe(mockConfig.organizationId);
      expect((connector as any).weddingOptimized).toBe(true);
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new BIPlatformConnector({
            organizationId: 'invalid-uuid',
            weddingOptimized: false,
          }),
      ).toThrow('Invalid organization ID format');
    });
  });

  describe('connectToPlatform', () => {
    it('should successfully connect to Tableau platform', async () => {
      // Mock successful API response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              token: 'tableau-auth-token-123',
              site: { id: 'site123', contentUrl: 'default' },
            }),
        }),
      ) as any;

      const result = await connector.connectToPlatform('tableau', {
        serverUrl: 'https://tableau.company.com',
        username: 'analyst@company.com',
        password: 'secure-password',
        siteName: 'default',
      });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.platform).toBe('tableau');
      expect(result.capabilities).toContain('dashboard_creation');
      expect(result.weddingOptimizations).toContain('seasonal_analysis');
    });

    it('should successfully connect to Power BI platform', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'powerbi-token-456',
              token_type: 'Bearer',
            }),
        }),
      ) as any;

      const result = await connector.connectToPlatform('powerbi', {
        clientId: 'powerbi-client-id',
        clientSecret: 'powerbi-secret',
        tenantId: 'tenant-123',
      });

      expect(result.success).toBe(true);
      expect(result.platform).toBe('powerbi');
      expect(result.capabilities).toContain('real_time_dashboards');
    });

    it('should handle authentication failures gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        }),
      ) as any;

      const result = await connector.connectToPlatform('tableau', {
        serverUrl: 'https://tableau.company.com',
        username: 'wrong@company.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should validate required credentials for each platform', async () => {
      await expect(connector.connectToPlatform('tableau', {})).rejects.toThrow(
        'Missing required credentials',
      );

      await expect(
        connector.connectToPlatform('powerbi', { clientId: 'test' }),
      ).rejects.toThrow('Missing required credentials');
    });
  });

  describe('syncPlatformData', () => {
    beforeEach(() => {
      // Mock successful connection
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTableauResponse),
        });
    });

    it('should sync Tableau data with wedding optimization', async () => {
      const result = await connector.syncPlatformData('tableau', {
        syncType: 'incremental',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(result.weddingOptimizations).toBeDefined();
      expect(result.weddingOptimizations.seasonalAnalysis).toBe(true);
      expect(result.platformSpecific.workbooksCount).toBe(2);
    });

    it('should handle incremental sync correctly', async () => {
      const result = await connector.syncPlatformData('tableau', {
        syncType: 'incremental',
        lastSyncTimestamp: '2024-06-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.syncType).toBe('incremental');
    });

    it('should perform full sync when requested', async () => {
      const result = await connector.syncPlatformData('powerbi', {
        syncType: 'full',
      });

      expect(result.success).toBe(true);
      expect(result.syncType).toBe('full');
    });

    it('should handle API rate limits with exponential backoff', async () => {
      // Mock rate limit response
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '30' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTableauResponse),
        });

      const result = await connector.syncPlatformData('tableau', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3); // Initial auth + retry after rate limit
    });
  });

  describe('createWeddingDashboard', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'dashboard-123',
              name: 'Wedding Performance Dashboard',
              url: 'https://tableau.company.com/views/wedding-dashboard',
            }),
        }),
      ) as any;
    });

    it('should create wedding-optimized dashboard with all required components', async () => {
      const result = await connector.createWeddingDashboard('tableau', {
        dashboardName: 'Seasonal Wedding Analytics',
        dataConnections: ['wedding_bookings', 'vendor_performance'],
        weddingSpecificMetrics: [
          'seasonal_booking_trends',
          'vendor_performance_by_category',
          'client_satisfaction_scores',
          'revenue_by_wedding_size',
        ],
        visualizations: [
          'seasonal_heatmap',
          'vendor_comparison_chart',
          'booking_funnel',
          'revenue_trends',
        ],
        refreshSchedule: {
          frequency: 'daily',
          time: '06:00',
        },
      });

      expect(result.success).toBe(true);
      expect(result.dashboardId).toBe('dashboard-123');
      expect(result.weddingComponents).toBeDefined();
      expect(result.weddingComponents.seasonalAnalysis).toBe(true);
      expect(result.weddingComponents.vendorMetrics).toBe(true);
      expect(result.embedUrl).toContain('wedding-dashboard');
    });

    it('should handle dashboard creation failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Invalid data source' }),
        }),
      ) as any;

      const result = await connector.createWeddingDashboard('powerbi', {
        dashboardName: 'Test Dashboard',
        dataConnections: ['invalid_source'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dashboard creation failed');
    });
  });

  describe('Wedding-specific optimizations', () => {
    it('should apply peak season analysis filters', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ...mockTableauResponse,
              seasonalFilters: [
                'may',
                'june',
                'july',
                'august',
                'september',
                'october',
              ],
            }),
        }),
      ) as any;

      const result = await connector.syncPlatformData('tableau', {
        syncType: 'incremental',
        weddingSeasonFocus: 'peak_season',
      });

      expect(result.weddingOptimizations.seasonalFiltering).toBe(true);
      expect(result.weddingOptimizations.peakSeasonFocus).toBe(true);
    });

    it('should calculate vendor performance metrics', async () => {
      const result = await connector.syncPlatformData('powerbi', {
        syncType: 'incremental',
        includeVendorMetrics: true,
      });

      expect(result.weddingOptimizations.vendorAnalytics).toBe(true);
      expect(result.vendorMetrics).toBeDefined();
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network timeout')),
      ) as any;

      const result = await connector.syncPlatformData('tableau', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should validate sync parameters', async () => {
      await expect(
        connector.syncPlatformData('invalid_platform' as any, {
          syncType: 'incremental',
        }),
      ).rejects.toThrow('Unsupported platform');

      await expect(
        connector.syncPlatformData('tableau', {
          syncType: 'invalid_type' as any,
        }),
      ).rejects.toThrow('Invalid sync type');
    });

    it('should maintain connection state across multiple operations', async () => {
      // First successful connection
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ access_token: 'token123' }),
        }),
      ) as any;

      await connector.connectToPlatform('powerbi', {
        clientId: 'test',
        clientSecret: 'test',
        tenantId: 'test',
      });

      // Subsequent operations should reuse connection
      const result1 = await connector.syncPlatformData('powerbi', {
        syncType: 'incremental',
      });
      const result2 = await connector.syncPlatformData('powerbi', {
        syncType: 'incremental',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataResponse = {
        workbooks: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: `workbook-${i}`,
            name: `Dashboard ${i}`,
            projectId: 'default',
          })),
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(largeDataResponse),
        }),
      ) as any;

      const startTime = Date.now();
      const result = await connector.syncPlatformData('tableau', {
        syncType: 'full',
        batchSize: 100,
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should implement proper batching for large syncs', async () => {
      const result = await connector.syncPlatformData('tableau', {
        syncType: 'full',
        batchSize: 50,
      });

      expect(result.batchingUsed).toBe(true);
      expect(result.batchSize).toBe(50);
    });
  });
});
