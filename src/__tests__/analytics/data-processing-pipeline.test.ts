import { DataProcessingPipeline } from '../../lib/analytics/data-processing-pipeline';
import { jest } from '@jest/globals';

// Mock Redis for streaming
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    xAdd: jest.fn(),
    xRead: jest.fn(),
    xGroupCreate: jest.fn(),
    xGroupReadGroup: jest.fn(),
    xAck: jest.fn(),
    pipeline: jest.fn(() => ({ exec: jest.fn() })),
    on: jest.fn(),
    isOpen: true,
  })),
}));

describe('DataProcessingPipeline', () => {
  let pipeline: DataProcessingPipeline;
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new DataProcessingPipeline();
  });

  afterEach(async () => {
    await pipeline.stop();
  });

  describe('Pipeline Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(pipeline).toBeDefined();
      expect(pipeline['config']).toEqual({
        processing: {
          batchSize: 1000,
          maxConcurrency: 10,
          timeoutMs: 30000,
          retryAttempts: 3,
        },
        streaming: {
          streamName: 'wedsync:analytics:events',
          consumerGroup: 'analytics-processors',
          consumerName: expect.any(String),
        },
        wedding: {
          priorityVendors: ['photographer', 'videographer', 'venue'],
          peakSeasonMultiplier: 2.0,
          criticalEventTypes: [
            'booking_confirmed',
            'wedding_day',
            'payment_received',
          ],
        },
      });
    });

    test('should start pipeline services successfully', async () => {
      const result = await pipeline.start();

      expect(result.success).toBe(true);
      expect(result.servicesStarted).toContain('event-processor');
      expect(result.servicesStarted).toContain('anomaly-detector');
      expect(result.servicesStarted).toContain('quality-monitor');
      expect(pipeline.isRunning()).toBe(true);
    });

    test('should handle initialization failures gracefully', async () => {
      // Mock Redis connection failure
      const mockRedisClient = pipeline['redisClient'];
      mockRedisClient.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection failed'));

      const result = await pipeline.start();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fallbackMode).toBe(true);
    });
  });

  describe('High-Volume Event Processing', () => {
    test('should process events at 10,000+ events/sec rate', async () => {
      await pipeline.start();

      // Generate 10,000 test events
      const events = Array.from({ length: 10000 }, (_, i) => ({
        id: `event_${i}`,
        organization_id: mockOrganizationId,
        event_type: 'high_volume_test',
        event_name: `test_event_${i}`,
        timestamp: Date.now(),
        data: { index: i, batch: 'performance_test' },
      }));

      const startTime = Date.now();
      const results = await pipeline.processBatch(events);
      const processingTime = Date.now() - startTime;
      const eventsPerSecond = 10000 / (processingTime / 1000);

      expect(results.processedCount).toBe(10000);
      expect(results.errorCount).toBe(0);
      expect(eventsPerSecond).toBeGreaterThan(10000); // Must exceed 10,000 events/sec
      expect(results.averageProcessingTimeMs).toBeLessThan(100);
    });

    test('should handle concurrent processing streams', async () => {
      await pipeline.start();

      // Create multiple concurrent processing streams
      const streams = Array.from({ length: 5 }, (_, i) =>
        pipeline.processStream(`stream_${i}`, {
          batchSize: 100,
          maxConcurrency: 5,
        }),
      );

      const results = await Promise.all(streams);

      expect(results.length).toBe(5);
      expect(results.every((r) => r.success)).toBe(true);
      expect(pipeline.getActiveStreams()).toBe(5);
    });

    test('should maintain processing order for wedding-critical events', async () => {
      await pipeline.start();

      const criticalEvents = [
        {
          id: 'wedding_booking_1',
          organization_id: mockOrganizationId,
          event_type: 'booking_confirmed',
          priority: 'critical',
          wedding_date: '2024-06-15',
          sequence: 1,
        },
        {
          id: 'payment_received_1',
          organization_id: mockOrganizationId,
          event_type: 'payment_received',
          priority: 'critical',
          wedding_date: '2024-06-15',
          sequence: 2,
        },
        {
          id: 'contract_signed_1',
          organization_id: mockOrganizationId,
          event_type: 'contract_signed',
          priority: 'critical',
          wedding_date: '2024-06-15',
          sequence: 3,
        },
      ];

      const result = await pipeline.processOrderedEvents(criticalEvents);

      expect(result.success).toBe(true);
      expect(result.processedInOrder).toBe(true);
      expect(result.processingSequence).toEqual([1, 2, 3]);
    });
  });

  describe('Real-Time Streaming', () => {
    test('should stream events to Redis streams', async () => {
      await pipeline.start();

      const event = {
        organization_id: mockOrganizationId,
        event_type: 'user_action',
        event_name: 'form_submission',
        data: { form_id: 'contact_form' },
      };

      const streamResult = await pipeline.streamEvent(event);

      expect(streamResult.success).toBe(true);
      expect(streamResult.streamId).toBeDefined();
      expect(streamResult.messageId).toMatch(/^\d+-\d+$/); // Redis stream message ID format
    });

    test('should consume events from Redis streams', async () => {
      await pipeline.start();

      // Mock stream data
      const mockStreamData = [
        ['1234567890-0', { event_type: 'test', data: 'test_data' }],
      ];

      pipeline['redisClient'].xGroupReadGroup = jest
        .fn()
        .mockResolvedValue([['wedsync:analytics:events', mockStreamData]]);

      const consumed = await pipeline.consumeStream(
        'wedsync:analytics:events',
        {
          group: 'analytics-processors',
          consumer: 'consumer-1',
          count: 10,
        },
      );

      expect(consumed.length).toBe(1);
      expect(consumed[0].id).toBe('1234567890-0');
      expect(consumed[0].fields.event_type).toBe('test');
    });

    test('should handle stream consumer group failures', async () => {
      await pipeline.start();

      // Mock consumer group failure
      pipeline['redisClient'].xGroupReadGroup = jest
        .fn()
        .mockRejectedValue(
          new Error(
            'NOGROUP No such key wedsync:analytics:events or consumer group analytics-processors',
          ),
        );

      const result = await pipeline.consumeStream('wedsync:analytics:events', {
        group: 'analytics-processors',
        consumer: 'consumer-1',
      });

      expect(result).toEqual([]);
      // Should automatically create consumer group
      expect(pipeline['redisClient'].xGroupCreate).toHaveBeenCalled();
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect unusual event patterns', async () => {
      await pipeline.start();

      // Generate normal events
      const normalEvents = Array.from({ length: 1000 }, (_, i) => ({
        organization_id: mockOrganizationId,
        event_type: 'normal_event',
        value: 100 + Math.random() * 20, // Normal range: 100-120
        timestamp: Date.now() + i * 1000,
      }));

      // Add anomalous events
      const anomalousEvents = [
        {
          organization_id: mockOrganizationId,
          event_type: 'normal_event',
          value: 500, // Anomalously high
          timestamp: Date.now() + 500 * 1000,
        },
        {
          organization_id: mockOrganizationId,
          event_type: 'normal_event',
          value: 10, // Anomalously low
          timestamp: Date.now() + 600 * 1000,
        },
      ];

      const allEvents = [...normalEvents, ...anomalousEvents];
      const anomalies = await pipeline.detectAnomalies(allEvents, {
        algorithm: 'statistical',
        sensitivity: 0.95,
        windowSize: 100,
      });

      expect(anomalies.length).toBe(2);
      expect(anomalies.some((a) => a.value === 500)).toBe(true);
      expect(anomalies.some((a) => a.value === 10)).toBe(true);
      expect(anomalies.every((a) => a.anomalyScore > 0.95)).toBe(true);
    });

    test('should detect wedding-specific anomalies', async () => {
      await pipeline.start();

      const weddingEvents = [
        {
          organization_id: mockOrganizationId,
          event_type: 'booking_inquiry',
          wedding_date: '2024-02-29', // Leap year, unusual date
          guest_count: 1000, // Unusually large wedding
          budget: 100000, // Very high budget
          vendor_type: 'photographer',
        },
        {
          organization_id: mockOrganizationId,
          event_type: 'booking_inquiry',
          wedding_date: '2024-12-25', // Christmas Day - unusual
          guest_count: -5, // Invalid guest count
          budget: -1000, // Negative budget
          vendor_type: 'photographer',
        },
      ];

      const anomalies = await pipeline.detectWeddingAnomalies(weddingEvents, {
        checkDateValidity: true,
        validateBusinessRules: true,
        seasonalContext: true,
      });

      expect(anomalies.length).toBe(2);
      expect(anomalies[0].reasons).toContain('unusual_wedding_date');
      expect(anomalies[0].reasons).toContain('exceptionally_large_wedding');
      expect(anomalies[1].reasons).toContain('invalid_guest_count');
      expect(anomalies[1].reasons).toContain('invalid_budget');
    });

    test('should handle seasonal anomaly adjustments', async () => {
      await pipeline.start();

      // Summer events (peak season - higher volume expected)
      const summerEvents = Array.from({ length: 1000 }, (_, i) => ({
        organization_id: mockOrganizationId,
        event_type: 'booking_inquiry',
        timestamp: new Date('2024-07-15').getTime() + i * 3600000,
        wedding_date: '2024-07-15',
        vendor_type: 'photographer',
      }));

      // Winter events (off-season - lower volume expected)
      const winterEvents = Array.from({ length: 100 }, (_, i) => ({
        organization_id: mockOrganizationId,
        event_type: 'booking_inquiry',
        timestamp: new Date('2024-01-15').getTime() + i * 3600000,
        wedding_date: '2024-01-15',
        vendor_type: 'photographer',
      }));

      const summerAnomalies = await pipeline.detectAnomalies(summerEvents, {
        seasonalAdjustment: true,
        season: 'summer',
      });

      const winterAnomalies = await pipeline.detectAnomalies(winterEvents, {
        seasonalAdjustment: true,
        season: 'winter',
      });

      // Summer should have fewer anomalies (high volume expected)
      // Winter should have fewer anomalies (low volume expected)
      expect(summerAnomalies.length).toBeLessThan(winterAnomalies.length);
    });
  });

  describe('Data Quality Assessment', () => {
    test('should assess data completeness', async () => {
      const testData = [
        {
          id: '1',
          name: 'Complete Record',
          email: 'test@example.com',
          wedding_date: '2024-06-15',
        },
        { id: '2', name: 'Missing Email', wedding_date: '2024-06-16' }, // Missing email
        { id: '3', email: 'test2@example.com', wedding_date: '2024-06-17' }, // Missing name
        { id: '4', name: 'Missing Date', email: 'test3@example.com' }, // Missing wedding_date
      ];

      const quality = await pipeline.assessDataQuality(testData, {
        requiredFields: ['id', 'name', 'email', 'wedding_date'],
        completenessThreshold: 0.8,
      });

      expect(quality.completenessScore).toBe(0.25); // Only 1/4 records complete
      expect(quality.missingFields).toEqual({
        name: 1,
        email: 1,
        wedding_date: 1,
      });
      expect(quality.passesThreshold).toBe(false);
      expect(quality.recommendations).toContain('improve_data_collection');
    });

    test('should validate wedding data accuracy', async () => {
      const weddingData = [
        {
          wedding_date: '2024-06-15',
          guest_count: 150,
          budget: 15000,
          vendor_type: 'photographer',
          venue_type: 'outdoor',
        },
        {
          wedding_date: '2024-13-45', // Invalid date
          guest_count: -10, // Invalid count
          budget: 'expensive', // Invalid type
          vendor_type: 'invalid_vendor', // Invalid vendor
          venue_type: 'underwater', // Unusual but valid
        },
      ];

      const accuracy = await pipeline.assessWeddingDataAccuracy(weddingData, {
        validateDates: true,
        validateBusinessRules: true,
        validateVendorTypes: true,
      });

      expect(accuracy.accuracyScore).toBe(0.5); // 1/2 records accurate
      expect(accuracy.invalidRecords).toBe(1);
      expect(accuracy.validationErrors).toContain('invalid_wedding_date');
      expect(accuracy.validationErrors).toContain('invalid_guest_count');
      expect(accuracy.validationErrors).toContain('invalid_budget_format');
      expect(accuracy.validationErrors).toContain('invalid_vendor_type');
    });

    test('should check data consistency across records', async () => {
      const inconsistentData = [
        { client_id: 'client_1', wedding_date: '2024-06-15', venue: 'Venue A' },
        { client_id: 'client_1', wedding_date: '2024-06-16', venue: 'Venue A' }, // Different date, same client
        { client_id: 'client_1', wedding_date: '2024-06-15', venue: 'Venue B' }, // Same date, different venue
      ];

      const consistency = await pipeline.assessDataConsistency(
        inconsistentData,
        {
          groupByFields: ['client_id'],
          checkFields: ['wedding_date', 'venue'],
          toleranceLevel: 'strict',
        },
      );

      expect(consistency.consistencyScore).toBeLessThan(1.0);
      expect(consistency.inconsistencies.length).toBeGreaterThan(0);
      expect(consistency.conflictingRecords).toBe(3);
      expect(consistency.affectedClients).toContain('client_1');
    });

    test('should assess data timeliness', async () => {
      const timedData = [
        {
          id: '1',
          created_at: new Date().toISOString(),
          event_type: 'current',
        },
        {
          id: '2',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          event_type: 'yesterday',
        }, // 1 day old
        {
          id: '3',
          created_at: new Date(Date.now() - 604800000).toISOString(),
          event_type: 'week_old',
        }, // 1 week old
        {
          id: '4',
          created_at: new Date(Date.now() - 2592000000).toISOString(),
          event_type: 'month_old',
        }, // 1 month old
      ];

      const timeliness = await pipeline.assessDataTimeliness(timedData, {
        freshnessThreshold: '7days',
        timeField: 'created_at',
      });

      expect(timeliness.avgAge).toBeDefined();
      expect(timeliness.staleRecords).toBe(1); // Only the month-old record
      expect(timeliness.timelinessScore).toBeBetween(0.5, 1.0);
      expect(timeliness.withinThreshold).toBe(3);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle processing failures gracefully', async () => {
      await pipeline.start();

      // Mock processing failure
      const failingEvents = [
        { id: 'good_event', data: 'valid' },
        { id: 'bad_event', data: null }, // This will cause processing error
        { id: 'another_good_event', data: 'valid' },
      ];

      const result = await pipeline.processBatch(failingEvents, {
        continueOnError: true,
        logErrors: true,
      });

      expect(result.processedCount).toBe(2); // 2 good events processed
      expect(result.errorCount).toBe(1); // 1 bad event failed
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].eventId).toBe('bad_event');
    });

    test('should implement retry logic with exponential backoff', async () => {
      await pipeline.start();

      let attemptCount = 0;
      const flakyProcessor = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await pipeline.processWithRetry(
        { id: 'retry_test', data: 'test' },
        flakyProcessor,
        {
          maxRetries: 3,
          backoffMs: 100,
          backoffMultiplier: 2,
        },
      );

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
      expect(flakyProcessor).toHaveBeenCalledTimes(3);
    });

    test('should handle memory pressure during high-volume processing', async () => {
      await pipeline.start();

      // Monitor memory usage during processing
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large batch
      const largeEvents = Array.from({ length: 50000 }, (_, i) => ({
        id: `large_event_${i}`,
        organization_id: mockOrganizationId,
        data: 'x'.repeat(1000), // 1KB per event = 50MB total
      }));

      const result = await pipeline.processBatch(largeEvents, {
        memoryLimit: 100 * 1024 * 1024, // 100MB limit
        chunkSize: 1000,
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.success).toBe(true);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Should stay under 100MB
      expect(result.chunksProcessed).toBe(50); // 50000 events / 1000 chunk size
    });

    test('should recover from Redis connection failures', async () => {
      await pipeline.start();

      // Simulate Redis disconnection
      pipeline['redisClient'].isOpen = false;
      pipeline['redisClient'].xAdd = jest
        .fn()
        .mockRejectedValue(new Error('Connection lost'));

      const event = {
        organization_id: mockOrganizationId,
        event_type: 'test_event',
        data: { test: true },
      };

      const result = await pipeline.streamEvent(event);

      expect(result.success).toBe(true); // Should fallback gracefully
      expect(result.fallbackMode).toBe(true);
      expect(result.fallbackStorage).toBe('memory'); // Should use memory buffer
    });
  });

  describe('Performance Monitoring', () => {
    test('should track processing metrics', async () => {
      await pipeline.start();

      const events = Array.from({ length: 1000 }, (_, i) => ({
        id: `metric_event_${i}`,
        organization_id: mockOrganizationId,
        event_type: 'metric_test',
      }));

      await pipeline.processBatch(events);
      const metrics = pipeline.getProcessingMetrics();

      expect(metrics.totalProcessed).toBeGreaterThanOrEqual(1000);
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.throughputPerSecond).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeBetween(0, 1);
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
    });

    test('should maintain SLA metrics for wedding operations', async () => {
      await pipeline.start();

      const weddingCriticalEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `wedding_critical_${i}`,
        organization_id: mockOrganizationId,
        event_type: 'booking_confirmed',
        priority: 'critical',
        wedding_date: '2024-06-15',
      }));

      await pipeline.processBatch(weddingCriticalEvents);
      const slaMetrics = pipeline.getWeddingSLA();

      expect(slaMetrics.criticalEventLatency).toBeLessThan(100); // <100ms for critical events
      expect(slaMetrics.weddingDayUptime).toBeGreaterThan(0.999); // 99.9% uptime SLA
      expect(slaMetrics.dataIntegrityScore).toBeGreaterThan(0.99); // 99% data integrity
      expect(slaMetrics.errorRate).toBeLessThan(0.001); // <0.1% error rate
    });
  });
});
