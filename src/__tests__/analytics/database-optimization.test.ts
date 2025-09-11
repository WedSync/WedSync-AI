import { DatabaseOptimization } from '../../lib/analytics/database-optimization';
import { jest } from '@jest/globals';

// Helper functions to reduce nesting - EXTRACTED TO MEET 4-LEVEL LIMIT

/**
 * Creates range filter mock for query builder
 */
const createRangeFilter = () => ({ lte: jest.fn() });

/**
 * Creates query builder mock with range filtering
 */
const createQueryBuilder = () => ({
  gte: jest.fn(() => createRangeFilter()),
  single: jest.fn(),
});

/**
 * Creates select builder mock with eq filtering
 */
const createSelectBuilder = () => ({
  eq: jest.fn(() => createQueryBuilder()),
});

/**
 * Creates table builder mock with CRUD operations
 */
const createTableBuilder = () => ({
  select: jest.fn(() => createSelectBuilder()),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

/**
 * Creates storage bucket mock
 */
const createStorageBucket = () => ({
  upload: jest.fn(),
  download: jest.fn(),
});

/**
 * Creates complete Supabase client mock
 */
const createSupabaseClient = () => ({
  from: jest.fn(() => createTableBuilder()),
  rpc: jest.fn(),
  storage: {
    from: jest.fn(() => createStorageBucket()),
  },
});

// Mock Supabase client using helper functions - REDUCED NESTING TO 4 LEVELS
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createSupabaseClient()),
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    pipeline: jest.fn(() => ({ exec: jest.fn() })),
    on: jest.fn(),
    isOpen: true,
  })),
}));

describe('DatabaseOptimization', () => {
  let dbOptimizer: DatabaseOptimization;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    dbOptimizer = new DatabaseOptimization();
  });

  afterEach(async () => {
    await dbOptimizer.cleanup();
  });

  describe('Query Performance Optimization', () => {
    test('should achieve >60% query performance improvement', async () => {
      const testQuery = {
        sql: `
          SELECT ae.*, wi.wedding_season, wi.average_wedding_size
          FROM analytics_events ae
          LEFT JOIN wedding_intelligence_data wi ON ae.organization_id = wi.organization_id
          WHERE ae.organization_id = $1
          AND ae.created_at >= $2
          AND ae.event_type = $3
          ORDER BY ae.created_at DESC
          LIMIT 100
        `,
        params: [
          mockOrganizationId,
          new Date('2024-01-01'),
          'booking_confirmed',
        ],
      };

      // Measure baseline performance
      const baselineStart = Date.now();
      await dbOptimizer.executeQuery(testQuery.sql, testQuery.params);
      const baselineTime = Date.now() - baselineStart;

      // Apply optimizations
      const optimized = await dbOptimizer.optimizeQuery(testQuery.sql, {
        addIndexHints: true,
        enableMaterializedViews: true,
        useQueryPlan: true,
        cacheResults: true,
      });

      // Measure optimized performance
      const optimizedStart = Date.now();
      await dbOptimizer.executeOptimizedQuery(
        optimized.sql,
        testQuery.params,
        optimized.hints,
      );
      const optimizedTime = Date.now() - optimizedStart;

      const improvement = (baselineTime - optimizedTime) / baselineTime;

      expect(improvement).toBeGreaterThan(0.6); // >60% improvement requirement
      expect(optimized.estimatedSpeedup).toBeGreaterThan(1.6);
      expect(optimized.indexesUsed).toBeInstanceOf(Array);
      expect(optimized.cacheStrategy).toBeDefined();
    });

    test('should optimize wedding-specific query patterns', async () => {
      const weddingQueries = [
        {
          name: 'seasonal_bookings',
          sql: `
            SELECT
              DATE_TRUNC('month', wedding_date) as month,
              COUNT(*) as bookings,
              AVG(booking_value) as avg_value
            FROM analytics_events
            WHERE event_type = 'booking_confirmed'
            AND wedding_date >= $1 AND wedding_date <= $2
            GROUP BY DATE_TRUNC('month', wedding_date)
            ORDER BY month
          `,
          weddingContext: 'seasonal_analysis',
        },
        {
          name: 'vendor_performance',
          sql: `
            SELECT
              vendor_type,
              COUNT(*) as total_inquiries,
              SUM(CASE WHEN event_type = 'booking_confirmed' THEN 1 ELSE 0 END) as bookings,
              AVG(response_time_hours) as avg_response_time
            FROM analytics_events
            WHERE organization_id = $1
            GROUP BY vendor_type
          `,
          weddingContext: 'vendor_optimization',
        },
      ];

      for (const query of weddingQueries) {
        const optimization = await dbOptimizer.optimizeWeddingQuery(query.sql, {
          weddingContext: query.weddingContext,
          seasonalIndexes: true,
          vendorTypePartitioning: true,
          weddingDateOptimization: true,
        });

        expect(optimization.success).toBe(true);
        expect(optimization.weddingOptimizations).toContain(
          'seasonal_indexing',
        );
        expect(optimization.estimatedSpeedup).toBeGreaterThan(2.0);
        expect(optimization.recommendedIndexes).toBeInstanceOf(Array);
      }
    });

    test('should handle complex aggregation queries efficiently', async () => {
      const complexQuery = `
        WITH monthly_metrics AS (
          SELECT
            DATE_TRUNC('month', created_at) as month,
            event_type,
            vendor_type,
            COUNT(*) as event_count,
            AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
          FROM analytics_events
          WHERE organization_id = $1
          AND created_at >= $2
          GROUP BY DATE_TRUNC('month', created_at), event_type, vendor_type
        ),
        seasonal_analysis AS (
          SELECT
            month,
            SUM(event_count) as total_events,
            AVG(avg_processing_time) as overall_processing_time,
            COUNT(DISTINCT vendor_type) as vendor_count
          FROM monthly_metrics
          GROUP BY month
        )
        SELECT * FROM seasonal_analysis ORDER BY month DESC
      `;

      const optimization = await dbOptimizer.optimizeComplexQuery(
        complexQuery,
        {
          materializeCommonSubqueries: true,
          useColumnStore: true,
          enableParallelProcessing: true,
          temporalPartitioning: true,
        },
      );

      expect(optimization.success).toBe(true);
      expect(optimization.materializedViews.length).toBeGreaterThan(0);
      expect(optimization.parallelizationPlan).toBeDefined();
      expect(optimization.estimatedSpeedup).toBeGreaterThan(3.0); // Complex queries should see bigger improvements
      expect(optimization.memoryUsageReduction).toBeGreaterThan(0.3);
    });
  });

  describe('Multi-Layer Caching Strategy', () => {
    test('should implement application layer caching', async () => {
      const cacheKey = 'wedding_metrics:seasonal:2024';
      const testData = {
        totalBookings: 1500,
        averageValue: 2800,
        peakMonth: 'July',
        conversionRate: 0.68,
      };

      // Test cache set
      await dbOptimizer.setApplicationCache(cacheKey, testData, 300); // 5 min TTL

      // Test cache get
      const cached = await dbOptimizer.getApplicationCache(cacheKey);
      expect(cached).toEqual(testData);

      // Test cache expiry
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stillCached = await dbOptimizer.getApplicationCache(cacheKey);
      expect(stillCached).toEqual(testData); // Should still be there

      // Test cache invalidation
      await dbOptimizer.invalidateCache(cacheKey);
      const afterInvalidation = await dbOptimizer.getApplicationCache(cacheKey);
      expect(afterInvalidation).toBeNull();
    });

    test('should implement Redis distributed caching', async () => {
      const distributedKey = 'analytics:distributed:org:' + mockOrganizationId;
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: Math.random() * 1000,
        timestamp: Date.now(),
      }));

      // Test distributed cache with compression
      await dbOptimizer.setDistributedCache(distributedKey, largeDataset, {
        ttl: 600,
        compress: true,
        serialize: 'json',
      });

      const retrieved = await dbOptimizer.getDistributedCache(distributedKey);
      expect(retrieved).toHaveLength(1000);
      expect(retrieved[0]).toHaveProperty('id');
      expect(retrieved[0]).toHaveProperty('value');
      expect(retrieved[0]).toHaveProperty('timestamp');

      // Test cache hit performance
      const hitStart = Date.now();
      await dbOptimizer.getDistributedCache(distributedKey);
      const hitTime = Date.now() - hitStart;

      expect(hitTime).toBeLessThan(50); // <50ms cache hit
    });

    test('should implement intelligent cache warming', async () => {
      const warmingStrategies = [
        {
          name: 'seasonal_metrics',
          query:
            'SELECT * FROM analytics_wedding_seasons WHERE organization_id = $1',
          schedule: '0 0 * * *', // Daily
          priority: 'high',
        },
        {
          name: 'realtime_dashboard',
          query:
            'SELECT * FROM analytics_dashboard_realtime WHERE organization_id = $1',
          schedule: '*/5 * * * *', // Every 5 minutes
          priority: 'critical',
        },
      ];

      const warmingResult = await dbOptimizer.warmCache(warmingStrategies, {
        organizationId: mockOrganizationId,
        precomputeVariations: true,
        estimateUsage: true,
      });

      expect(warmingResult.success).toBe(true);
      expect(warmingResult.warmedCaches.length).toBe(2);
      expect(warmingResult.estimatedHitRate).toBeGreaterThan(0.8); // >80% hit rate expected
      expect(warmingResult.cacheSize).toBeDefined();
      expect(warmingResult.nextWarmingSchedule).toBeDefined();
    });

    test('should implement cache hierarchy with fallback', async () => {
      const hierarchyKey = 'hierarchy:test:metrics';
      const testMetrics = { activeUsers: 150, revenue: 45000 };

      // Test cache hierarchy: L1 (app) -> L2 (Redis) -> L3 (database)
      const cacheResult = await dbOptimizer.getCachedWithHierarchy(
        hierarchyKey,
        {
          l1Enabled: true,
          l2Enabled: true,
          fallbackToDatabase: true,
          fallbackQuery:
            'SELECT COUNT(*) as activeUsers FROM analytics_realtime_connections',
          fallbackParams: [mockOrganizationId],
        },
      );

      expect(cacheResult.success).toBe(true);
      expect(cacheResult.data).toBeDefined();
      expect(cacheResult.cacheLevel).toMatch(/^(L1|L2|database)$/);
      expect(cacheResult.responseTime).toBeLessThan(200);

      // Test cache promotion (lower levels should be populated)
      if (cacheResult.cacheLevel === 'database') {
        const l2Check = await dbOptimizer.getDistributedCache(hierarchyKey);
        expect(l2Check).toBeDefined(); // Should be promoted to L2
      }
    });
  });

  describe('Materialized View Management', () => {
    test('should create and manage wedding analytics materialized views', async () => {
      const viewDefinitions = [
        {
          name: 'mv_wedding_seasonal_summary',
          sql: `
            SELECT
              organization_id,
              EXTRACT(YEAR FROM wedding_date) as year,
              EXTRACT(MONTH FROM wedding_date) as month,
              vendor_type,
              COUNT(*) as booking_count,
              AVG(booking_value) as avg_booking_value,
              SUM(booking_value) as total_revenue
            FROM analytics_events
            WHERE event_type = 'booking_confirmed'
            AND wedding_date IS NOT NULL
            GROUP BY organization_id, EXTRACT(YEAR FROM wedding_date), EXTRACT(MONTH FROM wedding_date), vendor_type
          `,
          refreshSchedule: 'hourly',
          indexes: [
            'organization_id, year, month',
            'vendor_type, organization_id',
          ],
        },
      ];

      const mvResult = await dbOptimizer.createMaterializedViews(
        viewDefinitions,
        {
          createIndexes: true,
          enableRefreshMonitoring: true,
          trackUsage: true,
        },
      );

      expect(mvResult.success).toBe(true);
      expect(mvResult.viewsCreated.length).toBe(1);
      expect(mvResult.indexesCreated.length).toBe(2);
      expect(mvResult.refreshJobs.length).toBe(1);

      // Test materialized view refresh
      const refreshResult = await dbOptimizer.refreshMaterializedView(
        'mv_wedding_seasonal_summary',
        {
          concurrently: true,
          trackPerformance: true,
        },
      );

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.refreshTime).toBeLessThan(5000); // <5 seconds
      expect(refreshResult.rowsUpdated).toBeGreaterThanOrEqual(0);
    });

    test('should optimize materialized view refresh schedules', async () => {
      const usagePatterns = {
        mv_realtime_dashboard: { queriesPerHour: 3600, lastAccess: Date.now() },
        mv_monthly_reports: {
          queriesPerHour: 10,
          lastAccess: Date.now() - 86400000,
        },
        mv_seasonal_analysis: {
          queriesPerHour: 50,
          lastAccess: Date.now() - 3600000,
        },
      };

      const optimization = await dbOptimizer.optimizeRefreshSchedules(
        usagePatterns,
        {
          considerDataFreshness: true,
          balanceResourceUsage: true,
          prioritizeHighUsage: true,
        },
      );

      expect(optimization.success).toBe(true);
      expect(optimization.scheduleChanges.length).toBeGreaterThan(0);
      expect(optimization.estimatedResourceSavings).toBeGreaterThan(0.2); // >20% resource savings

      // High usage views should have frequent refresh
      const realtimeSched = optimization.newSchedules['mv_realtime_dashboard'];
      expect(realtimeSched.intervalMinutes).toBeLessThanOrEqual(5);

      // Low usage views should have less frequent refresh
      const reportsSched = optimization.newSchedules['mv_monthly_reports'];
      expect(reportsSched.intervalMinutes).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Database Schema Optimization', () => {
    test('should analyze and optimize table schemas for wedding data', async () => {
      const schemaAnalysis = await dbOptimizer.analyzeSchemaOptimization({
        tables: [
          'analytics_events',
          'wedding_intelligence_data',
          'predictive_analytics_predictions',
        ],
        analyzeIndexUsage: true,
        checkConstraints: true,
        validateDataTypes: true,
        assessPartitioning: true,
      });

      expect(schemaAnalysis.success).toBe(true);
      expect(schemaAnalysis.tableAnalyses.length).toBe(3);
      expect(schemaAnalysis.indexRecommendations).toBeInstanceOf(Array);
      expect(schemaAnalysis.partitioningRecommendations).toBeInstanceOf(Array);
      expect(schemaAnalysis.dataTypeOptimizations).toBeInstanceOf(Array);

      // Should identify wedding-specific optimizations
      expect(
        schemaAnalysis.weddingOptimizations.seasonalPartitioning,
      ).toBeDefined();
      expect(
        schemaAnalysis.weddingOptimizations.vendorTypeIndexes,
      ).toBeDefined();
      expect(
        schemaAnalysis.weddingOptimizations.dateRangeOptimization,
      ).toBeDefined();
    });

    test('should implement automated index recommendations', async () => {
      const queryLogs = [
        {
          sql: 'SELECT * FROM analytics_events WHERE organization_id = ? AND wedding_date >= ?',
          frequency: 1000,
        },
        {
          sql: 'SELECT * FROM analytics_events WHERE vendor_type = ? AND created_at >= ?',
          frequency: 500,
        },
        {
          sql: 'SELECT * FROM wedding_intelligence_data WHERE wedding_season = ?',
          frequency: 200,
        },
      ];

      const indexRecommendations =
        await dbOptimizer.generateIndexRecommendations(queryLogs, {
          minFrequency: 10,
          considerCompositeIndexes: true,
          analyzeSelectivity: true,
          estimateSpaceImpact: true,
        });

      expect(indexRecommendations.success).toBe(true);
      expect(indexRecommendations.recommendedIndexes.length).toBeGreaterThan(0);
      expect(indexRecommendations.estimatedSpaceIncrease).toBeLessThan(0.3); // <30% space increase
      expect(indexRecommendations.estimatedQuerySpeedup).toBeGreaterThan(2.0);

      // Should recommend composite indexes for common query patterns
      const compositeIndexes = indexRecommendations.recommendedIndexes.filter(
        (idx) => idx.columns.length > 1,
      );
      expect(compositeIndexes.length).toBeGreaterThan(0);
    });

    test('should optimize data partitioning strategies', async () => {
      const partitioningPlan = await dbOptimizer.optimizePartitioning(
        'analytics_events',
        {
          strategy: 'temporal',
          partitionColumn: 'created_at',
          partitionInterval: 'monthly',
          retentionPolicy: '24months',
          weddingSeasonAware: true,
        },
      );

      expect(partitioningPlan.success).toBe(true);
      expect(partitioningPlan.partitionStrategy).toBe(
        'temporal_with_seasonal_awareness',
      );
      expect(partitioningPlan.estimatedQuerySpeedup).toBeGreaterThan(3.0);
      expect(partitioningPlan.estimatedStorageSavings).toBeGreaterThan(0.4); // >40% storage savings
      expect(partitioningPlan.partitionCount).toBeGreaterThan(12); // At least 12 monthly partitions

      // Should consider wedding seasonality for partition sizing
      expect(
        partitioningPlan.seasonalOptimizations.peakSeasonPartitions,
      ).toBeDefined();
      expect(
        partitioningPlan.seasonalOptimizations.offSeasonPartitions,
      ).toBeDefined();
    });
  });

  describe('Performance Monitoring and Alerting', () => {
    test('should monitor query performance in real-time', async () => {
      const monitoringConfig = {
        slowQueryThreshold: 1000, // 1 second
        highFrequencyThreshold: 100, // 100 queries/minute
        memoryUsageThreshold: 0.8, // 80%
        lockWaitTimeThreshold: 5000, // 5 seconds
        weddingCriticalQueries: ['booking_confirmation', 'payment_processing'],
      };

      const monitoring =
        await dbOptimizer.startPerformanceMonitoring(monitoringConfig);

      expect(monitoring.success).toBe(true);
      expect(monitoring.monitoringId).toBeDefined();
      expect(monitoring.alertChannels).toContain('email');
      expect(monitoring.alertChannels).toContain('slack');

      // Simulate performance metrics collection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const metrics = await dbOptimizer.getPerformanceMetrics(
        monitoring.monitoringId,
      );
      expect(metrics.averageQueryTime).toBeGreaterThanOrEqual(0);
      expect(metrics.slowQueries).toBeInstanceOf(Array);
      expect(metrics.lockWaitEvents).toBeInstanceOf(Array);
      expect(metrics.memoryUsage).toBeBetween(0, 1);
    });

    test('should implement wedding day priority monitoring', async () => {
      const weddingDayConfig = {
        weddingDate: '2024-06-15',
        organizationId: mockOrganizationId,
        priorityLevel: 'critical',
        monitoringInterval: 30, // seconds
        alertThresholds: {
          responseTime: 200, // 200ms
          errorRate: 0.001, // 0.1%
          availability: 0.999, // 99.9%
        },
      };

      const weddingMonitoring =
        await dbOptimizer.enableWeddingDayMonitoring(weddingDayConfig);

      expect(weddingMonitoring.success).toBe(true);
      expect(weddingMonitoring.priority).toBe('critical');
      expect(weddingMonitoring.escalationPath).toBeDefined();
      expect(weddingMonitoring.automaticFailover).toBe(true);
      expect(weddingMonitoring.dedicatedResources).toBe(true);

      // Test alert generation
      const alertTest = await dbOptimizer.simulateWeddingDayAlert({
        alertType: 'high_response_time',
        value: 500, // 500ms response time
        threshold: 200,
      });

      expect(alertTest.alertTriggered).toBe(true);
      expect(alertTest.escalationLevel).toBe('immediate');
      expect(alertTest.automaticActions.length).toBeGreaterThan(0);
    });

    test('should provide automated performance recommendations', async () => {
      const performanceData = {
        slowQueries: [
          {
            sql: 'SELECT * FROM large_table WHERE unindexed_column = ?',
            avgTime: 5000,
            frequency: 100,
          },
          {
            sql: 'SELECT COUNT(*) FROM analytics_events',
            avgTime: 2000,
            frequency: 200,
          },
        ],
        resourceUsage: {
          cpu: 0.85,
          memory: 0.9,
          storage: 0.75,
          connections: 0.6,
        },
        lockingIssues: [
          {
            table: 'analytics_events',
            lockType: 'row_exclusive',
            waitTime: 3000,
          },
        ],
      };

      const recommendations =
        await dbOptimizer.generatePerformanceRecommendations(performanceData, {
          prioritizeByImpact: true,
          includeImplementationGuide: true,
          estimateROI: true,
        });

      expect(recommendations.success).toBe(true);
      expect(recommendations.recommendations.length).toBeGreaterThan(0);
      expect(recommendations.totalEstimatedSpeedup).toBeGreaterThan(1.5);
      expect(recommendations.implementationEffort).toMatch(
        /^(low|medium|high)$/,
      );

      // Should include specific wedding-context recommendations
      const weddingRecs = recommendations.recommendations.filter(
        (r) => r.category === 'wedding_optimization',
      );
      expect(weddingRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      const mockSupabase = dbOptimizer['supabaseClient'];
      mockSupabase.from = jest.fn().mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const query = 'SELECT * FROM analytics_events WHERE id = $1';
      const result = await dbOptimizer.executeQueryWithFallback(
        query,
        ['test-id'],
        {
          maxRetries: 3,
          fallbackToCache: true,
          gracefulDegradation: true,
        },
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackMethod).toMatch(
        /^(cache|readonly_replica|degraded_service)$/,
      );
      expect(result.data).toBeDefined();
    });

    test('should implement automatic failover for critical queries', async () => {
      const criticalQuery = {
        sql: 'SELECT booking_status FROM analytics_events WHERE wedding_date = CURRENT_DATE',
        type: 'wedding_critical',
        maxLatency: 100,
      };

      const failoverResult = await dbOptimizer.executeCriticalQuery(
        criticalQuery,
        {
          primaryDatabase: 'main',
          fallbackDatabases: ['replica1', 'replica2'],
          automaticFailover: true,
          notifyOnFailover: true,
        },
      );

      expect(failoverResult.success).toBe(true);
      expect(failoverResult.executionTime).toBeLessThan(100);
      expect(failoverResult.databaseUsed).toBeDefined();

      if (failoverResult.failoverOccurred) {
        expect(failoverResult.failoverReason).toBeDefined();
        expect(failoverResult.notificationSent).toBe(true);
      }
    });

    test('should validate data integrity after optimization operations', async () => {
      const integrityCheck = await dbOptimizer.validateDataIntegrity({
        tables: ['analytics_events', 'wedding_intelligence_data'],
        checks: [
          'referential_integrity',
          'data_consistency',
          'constraint_violations',
        ],
        sampleSize: 1000,
        repairMinorIssues: true,
      });

      expect(integrityCheck.success).toBe(true);
      expect(integrityCheck.overallIntegrityScore).toBeGreaterThan(0.99); // >99% integrity
      expect(integrityCheck.issuesFound).toBeInstanceOf(Array);
      expect(integrityCheck.issuesRepaired).toBeInstanceOf(Array);

      // Critical wedding data should have perfect integrity
      const weddingDataCheck = integrityCheck.tableChecks.find(
        (t) => t.tableName === 'wedding_intelligence_data',
      );
      expect(weddingDataCheck.integrityScore).toBe(1.0); // Perfect integrity for wedding data
    });
  });
});
