import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataWarehouseManager } from '@/lib/integrations/analytics/data-warehouse-manager';

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

// Mock cloud provider responses
const mockSnowflakeResponse = {
  account: 'abc123.us-east-1',
  warehouse: 'WEDDING_ANALYTICS_WH',
  database: 'WEDSYNC_PROD',
  schemas: ['PUBLIC', 'WEDDING_DATA', 'VENDOR_ANALYTICS'],
  tables: [
    { name: 'WEDDING_BOOKINGS', schema: 'WEDDING_DATA', rows: 15000 },
    { name: 'VENDOR_PERFORMANCE', schema: 'VENDOR_ANALYTICS', rows: 8500 },
    { name: 'SEASONAL_TRENDS', schema: 'WEDDING_DATA', rows: 2400 },
  ],
};

const mockBigQueryResponse = {
  projectId: 'wedsync-analytics-prod',
  datasets: [
    { id: 'wedding_data', location: 'US' },
    { id: 'vendor_analytics', location: 'US' },
  ],
  tables: [
    { tableId: 'wedding_bookings', numRows: '15000' },
    { tableId: 'vendor_performance', numRows: '8500' },
  ],
};

const mockRedshiftResponse = {
  clusterId: 'wedsync-redshift-prod',
  nodeType: 'ra3.xlplus',
  numberOfNodes: 2,
  databases: [
    {
      name: 'wedsync_prod',
      schemas: ['public', 'wedding_data', 'vendor_analytics'],
    },
  ],
};

describe('DataWarehouseManager', () => {
  let manager: DataWarehouseManager;
  const mockConfig = {
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    multiCloudEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DataWarehouseManager(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(manager).toBeInstanceOf(DataWarehouseManager);
      expect((manager as any).organizationId).toBe(mockConfig.organizationId);
      expect((manager as any).multiCloudEnabled).toBe(true);
    });

    it('should throw error for invalid organization ID', () => {
      expect(
        () =>
          new DataWarehouseManager({
            organizationId: 'invalid-uuid',
            multiCloudEnabled: false,
          }),
      ).toThrow('Invalid organization ID format');
    });

    it('should initialize with default single-cloud configuration', () => {
      const singleCloudManager = new DataWarehouseManager({
        organizationId: mockConfig.organizationId,
      });
      expect((singleCloudManager as any).multiCloudEnabled).toBe(false);
    });
  });

  describe('connectToWarehouse', () => {
    it('should successfully connect to Snowflake', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              token: 'snowflake-session-token',
              validityInSeconds: 3600,
            }),
        }),
      ) as any;

      const result = await manager.connectToWarehouse('snowflake', {
        account: 'abc123.us-east-1',
        username: 'analytics_user',
        password: 'secure_password',
        warehouse: 'WEDDING_ANALYTICS_WH',
        database: 'WEDSYNC_PROD',
      });

      expect(result.success).toBe(true);
      expect(result.connectionId).toBeDefined();
      expect(result.warehouse).toBe('snowflake');
      expect(result.capabilities).toContain('column_store');
      expect(result.capabilities).toContain('auto_scaling');
      expect(result.weddingOptimizations).toContain('seasonal_partitioning');
    });

    it('should successfully connect to BigQuery', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'bigquery-oauth-token',
              token_type: 'Bearer',
              expires_in: 3600,
            }),
        }),
      ) as any;

      const result = await manager.connectToWarehouse('bigquery', {
        projectId: 'wedsync-analytics-prod',
        keyFile: '/path/to/service-account.json',
        location: 'US',
      });

      expect(result.success).toBe(true);
      expect(result.warehouse).toBe('bigquery');
      expect(result.capabilities).toContain('serverless');
      expect(result.capabilities).toContain('machine_learning');
    });

    it('should successfully connect to Redshift', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: 'available',
              endpoint:
                'wedsync-redshift-prod.abc123.us-east-1.redshift.amazonaws.com',
            }),
        }),
      ) as any;

      const result = await manager.connectToWarehouse('redshift', {
        host: 'wedsync-redshift-prod.abc123.us-east-1.redshift.amazonaws.com',
        port: 5439,
        database: 'wedsync_prod',
        username: 'analytics_user',
        password: 'secure_password',
      });

      expect(result.success).toBe(true);
      expect(result.warehouse).toBe('redshift');
      expect(result.capabilities).toContain('columnar_storage');
    });

    it('should handle authentication failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        }),
      ) as any;

      const result = await manager.connectToWarehouse('snowflake', {
        account: 'test',
        username: 'wrong_user',
        password: 'wrong_password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('should validate required connection parameters', async () => {
      await expect(manager.connectToWarehouse('snowflake', {})).rejects.toThrow(
        'Missing required connection parameters',
      );

      await expect(
        manager.connectToWarehouse('bigquery', { projectId: 'test' }),
      ).rejects.toThrow('Missing required connection parameters');
    });
  });

  describe('syncWarehouse', () => {
    beforeEach(() => {
      // Mock successful connection and data sync
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'auth-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSnowflakeResponse),
        });
    });

    it('should perform incremental sync with wedding optimization', async () => {
      const result = await manager.syncWarehouse('snowflake', {
        syncType: 'incremental',
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
        weddingSeasonOptimization: true,
      });

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBeGreaterThan(0);
      expect(result.weddingOptimizations).toBeDefined();
      expect(result.weddingOptimizations.seasonalPartitioning).toBe(true);
      expect(result.warehouseMetrics.tablesProcessed).toBe(3);
    });

    it('should handle full warehouse sync', async () => {
      const result = await manager.syncWarehouse('bigquery', {
        syncType: 'full',
        includeSchemaMapping: true,
      });

      expect(result.success).toBe(true);
      expect(result.syncType).toBe('full');
      expect(result.schemaMapping).toBeDefined();
    });

    it('should implement wedding-specific partitioning strategies', async () => {
      const result = await manager.syncWarehouse('snowflake', {
        syncType: 'incremental',
        partitionStrategy: 'wedding_season',
        optimizeForQueries: ['seasonal_analysis', 'vendor_performance'],
      });

      expect(result.weddingOptimizations.partitioning).toBe(true);
      expect(result.weddingOptimizations.queryOptimization).toContain(
        'seasonal_analysis',
      );
    });

    it('should handle multi-cloud synchronization', async () => {
      if (manager.multiCloudEnabled) {
        const result = await manager.syncMultiCloud(['snowflake', 'bigquery'], {
          syncType: 'incremental',
          crossCloudValidation: true,
        });

        expect(result.success).toBe(true);
        expect(result.cloudsProcessed).toBe(2);
        expect(result.dataConsistency.crossCloudValidation).toBe(true);
      }
    });
  });

  describe('createWeddingDataMart', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              schema: 'WEDDING_MART',
              tables: [
                'DIM_WEDDING_DATE',
                'DIM_VENDOR',
                'DIM_CLIENT',
                'FACT_BOOKING',
                'FACT_PERFORMANCE',
              ],
              views: [
                'V_SEASONAL_PERFORMANCE',
                'V_VENDOR_RANKINGS',
                'V_CLIENT_JOURNEY',
              ],
            }),
        }),
      ) as any;
    });

    it('should create comprehensive wedding data mart', async () => {
      const result = await manager.createWeddingDataMart('snowflake', {
        martName: 'WEDDING_ANALYTICS_MART',
        includeDimensions: [
          'wedding_date',
          'vendor',
          'client',
          'venue',
          'service_category',
        ],
        includeFacts: [
          'bookings',
          'performance_metrics',
          'financial_transactions',
          'client_interactions',
        ],
        aggregationLevels: ['daily', 'weekly', 'monthly', 'seasonal'],
        weddingSpecificMetrics: [
          'seasonal_booking_patterns',
          'vendor_performance_scores',
          'client_satisfaction_ratings',
          'revenue_per_wedding',
        ],
      });

      expect(result.success).toBe(true);
      expect(result.martId).toBeDefined();
      expect(result.dimensions.length).toBe(5);
      expect(result.facts.length).toBe(4);
      expect(result.weddingOptimizations.seasonalAggregations).toBe(true);
    });

    it('should implement proper indexing for wedding queries', async () => {
      const result = await manager.createWeddingDataMart('bigquery', {
        martName: 'wedding_analytics',
        optimizeForQueries: [
          'seasonal_trend_analysis',
          'vendor_comparison',
          'booking_funnel_analysis',
        ],
      });

      expect(result.indexingStrategy).toBeDefined();
      expect(result.indexingStrategy.weddingSeasonIndex).toBe(true);
      expect(result.indexingStrategy.vendorCategoryIndex).toBe(true);
    });
  });

  describe('Wedding-specific optimizations', () => {
    it('should implement seasonal data partitioning', async () => {
      const result = await manager.implementSeasonalPartitioning('snowflake', {
        tables: ['WEDDING_BOOKINGS', 'VENDOR_PERFORMANCE'],
        partitionBy: 'wedding_month',
        retentionPolicy: '7_years',
      });

      expect(result.success).toBe(true);
      expect(result.partitioningStrategy.seasonal).toBe(true);
      expect(result.partitions.peakSeason.length).toBeGreaterThan(0);
      expect(result.partitions.offSeason.length).toBeGreaterThan(0);
    });

    it('should calculate wedding industry KPIs', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              kpis: {
                averageBookingValue: 2850,
                seasonalVariation: 0.45,
                vendorRetentionRate: 0.89,
                clientSatisfactionScore: 4.7,
                bookingConversionRate: 0.23,
              },
            }),
        }),
      ) as any;

      const result = await manager.calculateWeddingKPIs('bigquery', {
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
        },
        includeSeasonalAnalysis: true,
        vendorCategories: ['photographer', 'venue', 'catering'],
      });

      expect(result.success).toBe(true);
      expect(result.kpis.averageBookingValue).toBe(2850);
      expect(result.kpis.seasonalVariation).toBe(0.45);
      expect(result.seasonalBreakdown).toBeDefined();
    });
  });

  describe('Performance and cost optimization', () => {
    it('should implement auto-scaling for peak wedding season', async () => {
      const result = await manager.configureAutoScaling('snowflake', {
        scalingPolicy: 'wedding_season_aware',
        peakSeasonMonths: [
          'may',
          'june',
          'july',
          'august',
          'september',
          'october',
        ],
        minCapacity: 1,
        maxCapacity: 10,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3,
      });

      expect(result.success).toBe(true);
      expect(result.scalingPolicy.weddingSeasonAware).toBe(true);
      expect(result.peakSeasonConfiguration).toBeDefined();
    });

    it('should monitor and optimize warehouse costs', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              currentCost: 1250.75,
              projectedMonthlyCost: 2100.5,
              costOptimizations: [
                'reduce_off_season_capacity',
                'implement_result_caching',
                'optimize_clustering_keys',
              ],
            }),
        }),
      ) as any;

      const result = await manager.analyzeCosts('redshift', {
        period: '30_days',
        includeOptimizations: true,
      });

      expect(result.success).toBe(true);
      expect(result.currentCost).toBe(1250.75);
      expect(result.optimizations.length).toBe(3);
    });

    it('should implement query result caching for common wedding analytics', async () => {
      const result = await manager.configureCaching('bigquery', {
        cachingStrategy: 'wedding_optimized',
        cacheCommonQueries: [
          'seasonal_booking_trends',
          'vendor_performance_rankings',
          'client_satisfaction_metrics',
        ],
        cacheDuration: '4_hours',
        invalidationTriggers: ['new_booking', 'vendor_update'],
      });

      expect(result.success).toBe(true);
      expect(result.cachingEnabled).toBe(true);
      expect(result.weddingOptimizedQueries.length).toBe(3);
    });
  });

  describe('Data quality and monitoring', () => {
    it('should implement comprehensive data quality checks', async () => {
      const result = await manager.setupDataQualityMonitoring('snowflake', {
        qualityRules: [
          'wedding_date_validation',
          'booking_amount_positive',
          'vendor_category_enumeration',
          'client_email_format',
        ],
        alertThresholds: {
          dataFreshness: '2_hours',
          qualityScore: 0.95,
          completeness: 0.98,
        },
      });

      expect(result.success).toBe(true);
      expect(result.qualityMonitoring.enabled).toBe(true);
      expect(result.weddingSpecificRules.length).toBe(4);
    });

    it('should detect and alert on data anomalies', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              anomalies: [
                {
                  type: 'seasonal_deviation',
                  severity: 'medium',
                  description:
                    'Booking volume 30% below historical average for May',
                  affectedTables: ['WEDDING_BOOKINGS'],
                },
              ],
            }),
        }),
      ) as any;

      const result = await manager.detectAnomalies('bigquery', {
        analysisType: 'seasonal_patterns',
        sensitivityLevel: 'medium',
      });

      expect(result.success).toBe(true);
      expect(result.anomalies.length).toBe(1);
      expect(result.anomalies[0].type).toBe('seasonal_deviation');
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle warehouse connection timeouts', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Connection timeout')),
      ) as any;

      const result = await manager.syncWarehouse('snowflake', {
        syncType: 'incremental',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    it('should implement retry logic with exponential backoff', async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () =>
              Promise.resolve({ error: 'Service temporarily unavailable' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSnowflakeResponse),
        });
      }) as any;

      const result = await manager.syncWarehouse('snowflake', {
        syncType: 'incremental',
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
        },
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should validate sync parameters thoroughly', async () => {
      await expect(
        manager.syncWarehouse('invalid_warehouse' as any, {
          syncType: 'incremental',
        }),
      ).rejects.toThrow('Unsupported warehouse platform');

      await expect(
        manager.syncWarehouse('snowflake', {
          syncType: 'invalid_type' as any,
        }),
      ).rejects.toThrow('Invalid sync type');
    });
  });
});
