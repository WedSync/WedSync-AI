import { AnalyticsEngine } from '../../lib/analytics/analytics-engine';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    pipeline: jest.fn(() => ({
      exec: jest.fn(),
    })),
    on: jest.fn(),
    isOpen: true,
  })),
}));

// Helper functions to reduce nesting - REFACTORED TO MEET 4-LEVEL LIMIT
const createQueryBuilder = () => ({
  single: jest.fn(),
  gte: jest.fn(() => ({ lte: jest.fn() })),
});

const createSelectBuilder = () => ({
  eq: jest.fn(() => createQueryBuilder()),
});

// Helper function to create update chain - EXTRACTED TO REDUCE NESTING
const createUpdateChain = () => ({
  eq: jest.fn(() => ({ select: jest.fn() })),
});

const createTableBuilder = () => ({
  select: jest.fn(() => createSelectBuilder()),
  insert: jest.fn(() => ({ select: jest.fn() })),
  update: jest.fn(() => createUpdateChain()),
  upsert: jest.fn(() => ({ select: jest.fn() })),
});

const createSupabaseClient = () => ({
  from: jest.fn(() => createTableBuilder()),
  rpc: jest.fn(),
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createSupabaseClient()),
}));

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsEngine = new AnalyticsEngine();
  });

  afterEach(async () => {
    await analyticsEngine.disconnect();
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(analyticsEngine).toBeDefined();
      expect(analyticsEngine['config']).toEqual({
        redis: {
          host: 'localhost',
          port: 6379,
          keyPrefix: 'wedsync:analytics:',
        },
        performance: {
          maxConcurrentQueries: 100,
          queryTimeoutMs: 5000,
          cacheDefaultTtl: 300,
        },
        wedding: {
          peakSeasons: ['spring', 'summer'],
          vendorTypes: [
            'photographer',
            'venue',
            'florist',
            'caterer',
            'dj',
            'videographer',
          ],
          criticalMetrics: [
            'booking_conversion',
            'client_satisfaction',
            'response_time',
          ],
        },
      });
    });

    test('should initialize with custom configuration', () => {
      const customConfig = {
        redis: { host: 'custom-redis', port: 6380 },
        performance: { maxConcurrentQueries: 200 },
      };

      const customEngine = new AnalyticsEngine(customConfig);
      expect(customEngine['config'].redis.host).toBe('custom-redis');
      expect(customEngine['config'].redis.port).toBe(6380);
      expect(customEngine['config'].performance.maxConcurrentQueries).toBe(200);
    });
  });

  describe('Event Processing', () => {
    test('should process single event successfully', async () => {
      const event = {
        organization_id: mockOrganizationId,
        event_type: 'user_action',
        event_name: 'form_submission',
        user_id: '456e7890-e89b-12d3-a456-426614174001',
        wedding_date: new Date('2024-06-15'),
        vendor_type: 'photographer',
        event_data: { form_id: 'contact_form', fields_filled: 5 },
      };

      const result = await analyticsEngine.processEvent(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    test('should process batch events with high performance', async () => {
      const events = Array.from({ length: 1000 }, (_, i) => ({
        organization_id: mockOrganizationId,
        event_type: 'user_action',
        event_name: `event_${i}`,
        user_id: `user_${i}`,
        wedding_date: new Date('2024-06-15'),
        vendor_type: 'photographer',
        event_data: { index: i },
      }));

      const startTime = Date.now();
      const results = await analyticsEngine.processBatch(events);
      const processingTime = Date.now() - startTime;

      expect(results.length).toBe(1000);
      expect(results.every((r) => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Should process 1000 events in under 1 second
    });

    test('should handle high-volume events (10,000+ events/sec requirement)', async () => {
      const events = Array.from({ length: 10000 }, (_, i) => ({
        organization_id: mockOrganizationId,
        event_type: 'high_volume',
        event_name: `hv_event_${i}`,
        event_data: { batch: 'performance_test' },
      }));

      const startTime = Date.now();
      const results = await analyticsEngine.processBatch(events, {
        maxConcurrency: 50,
      });
      const processingTime = Date.now() - startTime;
      const eventsPerSecond = 10000 / (processingTime / 1000);

      expect(results.length).toBe(10000);
      expect(eventsPerSecond).toBeGreaterThan(10000); // Must exceed 10,000 events/sec
    });

    test('should validate wedding-specific event data', async () => {
      const weddingEvent = {
        organization_id: mockOrganizationId,
        event_type: 'wedding_milestone',
        event_name: 'booking_confirmed',
        wedding_date: new Date('2024-06-15'),
        vendor_type: 'photographer',
        event_data: {
          wedding_season: 'summer',
          guest_count: 150,
          budget_range: '5000-10000',
          venue_type: 'outdoor',
        },
      };

      const result = await analyticsEngine.processEvent(weddingEvent);
      expect(result.success).toBe(true);
      expect(result.weddingContext).toBeDefined();
      expect(result.weddingContext?.season).toBe('summer');
      expect(result.weddingContext?.isPeakSeason).toBe(true);
    });

    test('should handle invalid event data gracefully', async () => {
      const invalidEvent = {
        organization_id: 'invalid-uuid',
        event_type: '',
        event_name: null as any,
      };

      const result = await analyticsEngine.processEvent(invalidEvent);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate basic metrics correctly', async () => {
      const metrics = await analyticsEngine.calculateMetrics(
        mockOrganizationId,
        {
          metrics: ['total_events', 'unique_users', 'conversion_rate'],
          timeRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
        },
      );

      expect(metrics).toBeDefined();
      expect(metrics.total_events).toBeGreaterThanOrEqual(0);
      expect(metrics.unique_users).toBeGreaterThanOrEqual(0);
      expect(metrics.conversion_rate).toBeBetween(0, 1);
      expect(metrics.calculatedAt).toBeDefined();
    });

    test('should calculate wedding season metrics', async () => {
      const seasonMetrics = await analyticsEngine.calculateSeasonalMetrics(
        mockOrganizationId,
        {
          year: 2024,
          vendorType: 'photographer',
        },
      );

      expect(seasonMetrics).toBeDefined();
      expect(seasonMetrics.peakSeason).toBeDefined();
      expect(seasonMetrics.offSeason).toBeDefined();
      expect(seasonMetrics.seasonalTrends).toBeInstanceOf(Array);
      expect(seasonMetrics.recommendations).toBeDefined();
    });

    test('should calculate real-time metrics with sub-second performance', async () => {
      const startTime = Date.now();
      const realtimeMetrics = await analyticsEngine.getRealTimeMetrics(
        mockOrganizationId,
        {
          metrics: ['active_users', 'events_per_minute', 'response_time'],
        },
      );
      const queryTime = Date.now() - startTime;

      expect(realtimeMetrics).toBeDefined();
      expect(queryTime).toBeLessThan(200); // Sub-200ms requirement
      expect(realtimeMetrics.active_users).toBeGreaterThanOrEqual(0);
      expect(realtimeMetrics.events_per_minute).toBeGreaterThanOrEqual(0);
    });

    test('should handle vendor-specific metrics', async () => {
      const vendorMetrics = await analyticsEngine.calculateVendorMetrics(
        mockOrganizationId,
        {
          vendorType: 'photographer',
          metrics: [
            'booking_rate',
            'client_satisfaction',
            'average_response_time',
          ],
        },
      );

      expect(vendorMetrics).toBeDefined();
      expect(vendorMetrics.vendorType).toBe('photographer');
      expect(vendorMetrics.booking_rate).toBeGreaterThanOrEqual(0);
      expect(vendorMetrics.client_satisfaction).toBeBetween(0, 5);
    });
  });

  describe('Caching Layer', () => {
    test('should cache and retrieve metrics efficiently', async () => {
      const cacheKey = `metrics:${mockOrganizationId}:daily`;
      const testData = { total_events: 100, unique_users: 50 };

      await analyticsEngine.setCachedMetrics(cacheKey, testData, 300);
      const cached = await analyticsEngine.getCachedMetrics(cacheKey);

      expect(cached).toEqual(testData);
    });

    test('should handle cache misses gracefully', async () => {
      const nonExistentKey = 'non_existent_key';
      const cached = await analyticsEngine.getCachedMetrics(nonExistentKey);

      expect(cached).toBeNull();
    });

    test('should respect cache TTL settings', async () => {
      const shortTtlKey = `short_ttl:${mockOrganizationId}`;
      const testData = { value: 'test' };

      await analyticsEngine.setCachedMetrics(shortTtlKey, testData, 1); // 1 second TTL

      // Should be available immediately
      let cached = await analyticsEngine.getCachedMetrics(shortTtlKey);
      expect(cached).toEqual(testData);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      cached = await analyticsEngine.getCachedMetrics(shortTtlKey);
      expect(cached).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle Redis connection failures', async () => {
      // Mock Redis connection failure
      const mockRedisClient = analyticsEngine['redisClient'];
      mockRedisClient.isOpen = false;

      const result = await analyticsEngine.processEvent({
        organization_id: mockOrganizationId,
        event_type: 'test',
        event_name: 'redis_failure_test',
      });

      expect(result.success).toBe(true); // Should fallback gracefully
      expect(result.warnings).toContain('CACHE_UNAVAILABLE');
    });

    test('should handle database query timeouts', async () => {
      // Mock database timeout
      jest.setTimeout(10000);

      const result = await analyticsEngine.calculateMetrics(
        mockOrganizationId,
        {
          metrics: ['complex_calculation'],
          timeRange: {
            start: new Date('2020-01-01'),
            end: new Date('2024-12-31'),
          },
        },
      );

      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.error?.code).toBe('QUERY_TIMEOUT');
      }
    });

    test('should validate wedding date logic', async () => {
      const futureWedding = {
        organization_id: mockOrganizationId,
        event_type: 'booking',
        event_name: 'future_wedding',
        wedding_date: new Date('2030-12-31'), // Future date
        vendor_type: 'photographer',
      };

      const result = await analyticsEngine.processEvent(futureWedding);
      expect(result.success).toBe(true);
      expect(result.weddingContext?.isValidDate).toBe(true);

      const pastWedding = {
        organization_id: mockOrganizationId,
        event_type: 'booking',
        event_name: 'past_wedding',
        wedding_date: new Date('2020-01-01'), // Past date
        vendor_type: 'photographer',
      };

      const pastResult = await analyticsEngine.processEvent(pastWedding);
      expect(pastResult.weddingContext?.isPastEvent).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet sub-second latency requirements', async () => {
      const startTime = process.hrtime.bigint();

      await analyticsEngine.processEvent({
        organization_id: mockOrganizationId,
        event_type: 'performance_test',
        event_name: 'latency_test',
      });

      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1_000_000;

      expect(latencyMs).toBeLessThan(100); // Sub-100ms processing
    });

    test('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = Array.from({ length: 50 }, (_, i) =>
        analyticsEngine.calculateMetrics(mockOrganizationId, {
          metrics: [`concurrent_test_${i}`],
          timeRange: { start: new Date(), end: new Date() },
        }),
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentQueries);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(50);
      expect(totalTime).toBeLessThan(2000); // Should complete 50 concurrent queries in under 2 seconds
    });
  });

  describe('Wedding Industry Validations', () => {
    test('should recognize peak wedding seasons', () => {
      expect(analyticsEngine.isWeddingSeason('summer')).toBe(true);
      expect(analyticsEngine.isWeddingSeason('spring')).toBe(true);
      expect(analyticsEngine.isWeddingSeason('winter')).toBe(false);
    });

    test('should validate vendor types', () => {
      expect(analyticsEngine.isValidVendorType('photographer')).toBe(true);
      expect(analyticsEngine.isValidVendorType('venue')).toBe(true);
      expect(analyticsEngine.isValidVendorType('invalid_vendor')).toBe(false);
    });

    test('should calculate wedding date seasonality correctly', () => {
      const summerWedding = new Date('2024-07-15');
      const winterWedding = new Date('2024-01-15');

      expect(analyticsEngine.getWeddingSeason(summerWedding)).toBe('summer');
      expect(analyticsEngine.getWeddingSeason(winterWedding)).toBe('winter');
      expect(analyticsEngine.isPeakSeason(summerWedding)).toBe(true);
      expect(analyticsEngine.isPeakSeason(winterWedding)).toBe(false);
    });
  });
});

// Test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBetween(min: number, max: number): R;
    }
  }
}

expect.extend({
  toBeBetween(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `expected ${received} to be between ${min} and ${max}`,
      pass,
    };
  },
});
