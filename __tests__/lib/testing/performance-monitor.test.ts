/**
 * WS-180 Performance Testing Framework - Performance Monitor Tests
 * Team B - Round 1 Implementation
 * 
 * Comprehensive test suite for the PerformanceMonitor class
 * covering wedding-specific scenarios and edge cases.
 */

import { PerformanceMonitor, PerformanceTestResults, PerformanceThresholds } from '@/lib/testing/performance-monitor';
import { PerformanceBaselineManager } from '@/lib/testing/performance-baseline-manager';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/testing/performance-baseline-manager');

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

const mockBaselineManager = {
  getBaseline: jest.fn(),
  establishBaseline: jest.fn(),
  updateBaseline: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
  (PerformanceBaselineManager as jest.Mock).mockImplementation(() => mockBaselineManager);
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  
  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
  });

  describe('recordTestResults', () => {
    const mockTestResults: PerformanceTestResults = {
      testId: 'test-123',
      testType: 'load',
      testScenario: 'guest_list_import',
      userType: 'couple',
      weddingSizeCategory: 'medium',
      environment: 'staging',
      avgResponseTime: 1200,
      p95ResponseTime: 2500,
      p99ResponseTime: 4000,
      errorRate: 0.005,
      throughputRps: 25,
      weddingSeason: true,
      concurrentUsers: 50,
      totalRequests: 1000,
      failedRequests: 5,
      metrics: {
        http_req_duration: {
          avg: 1200,
          med: 1100,
          min: 200,
          max: 5000,
          p90: 2000,
          p95: 2500,
          p99: 4000
        },
        http_req_failed: 0.005,
        http_reqs: 1000,
        iterations: 500,
        vus: 50,
        vus_max: 50
      },
      testConfiguration: {
        duration: '10m',
        virtualUsers: 50,
        thresholds: {},
        scenarios: []
      },
      startTime: new Date('2025-01-20T10:00:00Z'),
      endTime: new Date('2025-01-20T10:10:00Z'),
      duration: 600000
    };

    it('should successfully record test results with good performance', async () => {
      // Mock successful database operations
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'test-run-123' },
        error: null
      });

      // Mock baseline operations
      mockBaselineManager.getBaseline.mockResolvedValue({
        id: 'baseline-123',
        average_value: 1500,
        percentile_95: 3000
      });

      mockBaselineManager.updateBaseline.mockResolvedValue({
        updated: true,
        improvementDetected: true
      });

      const result = await performanceMonitor.recordTestResults(mockTestResults);

      expect(result.success).toBe(true);
      expect(result.performanceScore).toBeGreaterThan(70); // Good performance
      expect(result.thresholdsPassed).toBe(true);
      expect(result.testRunId).toBe('test-run-123');

      // Verify database insert was called
      expect(mockSupabase.from).toHaveBeenCalledWith('performance_test_runs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          test_type: 'load',
          test_scenario: 'guest_list_import',
          status: 'completed',
          performance_score: expect.any(Number)
        })
      );
    });

    it('should detect performance regression and trigger alerts', async () => {
      const poorTestResults = {
        ...mockTestResults,
        avgResponseTime: 5000, // Much slower than baseline
        p95ResponseTime: 8000,
        errorRate: 0.05 // Higher error rate
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'test-run-124' },
        error: null
      });

      // Mock baseline that shows regression
      mockBaselineManager.getBaseline.mockResolvedValue({
        id: 'baseline-123',
        average_value: 1200, // Much better baseline
        percentile_95: 2500
      });

      const result = await performanceMonitor.recordTestResults(poorTestResults);

      expect(result.success).toBe(true);
      expect(result.performanceScore).toBeLessThan(50); // Poor performance
      expect(result.thresholdsPassed).toBe(false);
      expect(result.regressionAnalysis.hasRegression).toBe(true);
      expect(result.regressionAnalysis.regressionSeverity).toBeOneOf(['high', 'critical']);
    });

    it('should handle wedding season adjustments', async () => {
      const peakSeasonResults = {
        ...mockTestResults,
        weddingSeason: true,
        avgResponseTime: 1800 // Slightly slower during peak season
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'test-run-125' },
        error: null
      });

      mockBaselineManager.getBaseline.mockResolvedValue(null); // No existing baseline

      const result = await performanceMonitor.recordTestResults(peakSeasonResults);

      expect(result.success).toBe(true);
      expect(result.regressionAnalysis.recommendations).toContain(
        expect.stringMatching(/baseline established/i)
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await performanceMonitor.recordTestResults(mockTestResults);

      expect(result.success).toBe(false);
      expect(result.performanceScore).toBe(0);
      expect(result.testRunId).toBe('');
    });
  });

  describe('validatePerformanceThresholds', () => {
    it('should pass all thresholds for guest list import scenario', async () => {
      const goodResults: PerformanceTestResults = {
        testId: 'test-123',
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        avgResponseTime: 1200, // Under 1500ms threshold
        p95ResponseTime: 2500, // Under 3000ms threshold
        p99ResponseTime: 4000, // Under 5000ms threshold
        errorRate: 0.005, // Under 1% threshold
        throughputRps: 25, // Above 20 RPS threshold
        weddingSeason: false,
        concurrentUsers: 50,
        totalRequests: 1000,
        failedRequests: 5,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 50, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const result = await performanceMonitor.validatePerformanceThresholds(goodResults);
      expect(result).toBe(true);
    });

    it('should fail thresholds for poor performance', async () => {
      const poorResults: PerformanceTestResults = {
        testId: 'test-124',
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        avgResponseTime: 2000, // Over 1500ms threshold
        p95ResponseTime: 4000, // Over 3000ms threshold
        p99ResponseTime: 6000, // Over 5000ms threshold
        errorRate: 0.02, // Over 1% threshold
        throughputRps: 15, // Under 20 RPS threshold
        weddingSeason: false,
        concurrentUsers: 50,
        totalRequests: 1000,
        failedRequests: 20,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 50, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const result = await performanceMonitor.validatePerformanceThresholds(poorResults);
      expect(result).toBe(false);
    });

    it('should use correct thresholds for photo upload scenario', async () => {
      const photoResults: PerformanceTestResults = {
        testId: 'test-125',
        testType: 'load',
        testScenario: 'photo_upload',
        userType: 'couple',
        weddingSizeCategory: 'large',
        environment: 'staging',
        avgResponseTime: 2500, // Within 3000ms threshold for photos
        p95ResponseTime: 5000, // Within 6000ms threshold for photos
        p99ResponseTime: 8000, // Within 10000ms threshold for photos
        errorRate: 0.015, // Within 2% threshold for photos
        throughputRps: 12, // Above 10 RPS threshold for photos
        weddingSeason: true,
        concurrentUsers: 30,
        totalRequests: 500,
        failedRequests: 8,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 30, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const result = await performanceMonitor.validatePerformanceThresholds(photoResults);
      expect(result).toBe(true);
    });
  });

  describe('getTestStatus', () => {
    it('should return test status for existing test', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'test-123',
          name: 'Load Test',
          status: 'running',
          start_time: '2025-01-20T10:00:00Z',
          end_time: null,
          duration_ms: null,
          notes: null
        },
        error: null
      });

      const status = await performanceMonitor.getTestStatus('test-123');

      expect(status).toEqual({
        testId: 'test-123',
        status: 'running',
        progress: 50,
        currentPhase: 'Executing performance test',
        logs: [],
        estimatedCompletion: expect.any(Date)
      });
    });

    it('should return null for non-existent test', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Not found')
      });

      const status = await performanceMonitor.getTestStatus('non-existent');
      expect(status).toBeNull();
    });

    it('should handle completed test status', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'test-123',
          name: 'Load Test',
          status: 'completed',
          start_time: '2025-01-20T10:00:00Z',
          end_time: '2025-01-20T10:10:00Z',
          duration_ms: 600000,
          notes: 'Test completed successfully'
        },
        error: null
      });

      const status = await performanceMonitor.getTestStatus('test-123');

      expect(status?.status).toBe('completed');
      expect(status?.progress).toBe(100);
      expect(status?.currentPhase).toBe('Test completed');
    });
  });

  describe('cancelTest', () => {
    it('should successfully cancel a test', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValueOnce({ error: null });

      const result = await performanceMonitor.cancelTest('test-123');
      expect(result).toBe(true);

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'cancelled',
        end_time: expect.any(String)
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-123');
    });

    it('should handle database errors when cancelling', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockRejectedValueOnce(new Error('Database error'));

      const result = await performanceMonitor.cancelTest('test-123');
      expect(result).toBe(false);
    });
  });

  describe('getTestHistory', () => {
    it('should return filtered test history', async () => {
      const mockHistory = [
        {
          id: 'test-1',
          name: 'Load Test 1',
          test_type: 'load',
          test_scenario: 'guest_list_import',
          status: 'completed',
          created_at: '2025-01-20T10:00:00Z'
        },
        {
          id: 'test-2',
          name: 'Load Test 2',
          test_type: 'load',
          test_scenario: 'guest_list_import',
          status: 'failed',
          created_at: '2025-01-20T09:00:00Z'
        }
      ];

      mockSupabase.single.mockResolvedValueOnce({
        data: mockHistory,
        error: null
      });

      const history = await performanceMonitor.getTestHistory('load', 'guest_list_import', 'staging', 10);

      expect(history).toEqual(mockHistory);
      expect(mockSupabase.eq).toHaveBeenCalledWith('test_type', 'load');
      expect(mockSupabase.eq).toHaveBeenCalledWith('test_scenario', 'guest_list_import');
      expect(mockSupabase.eq).toHaveBeenCalledWith('environment', 'staging');
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
    });

    it('should return empty array on database error', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database error'));

      const history = await performanceMonitor.getTestHistory();
      expect(history).toEqual([]);
    });
  });

  describe('calculatePerformanceScore', () => {
    it('should calculate high score for excellent performance', () => {
      const excellentResults: PerformanceTestResults = {
        testId: 'test-123',
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        avgResponseTime: 800, // Much better than 1500ms threshold
        p95ResponseTime: 1500, // Much better than 3000ms threshold
        p99ResponseTime: 2000, // Much better than 5000ms threshold
        errorRate: 0.001, // Much better than 1% threshold
        throughputRps: 40, // Much better than 20 RPS threshold
        weddingSeason: false,
        concurrentUsers: 50,
        totalRequests: 1000,
        failedRequests: 1,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 50, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const monitor = new PerformanceMonitor();
      // @ts-ignore - accessing private method for testing
      const score = monitor.calculatePerformanceScore(excellentResults);

      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate low score for poor performance', () => {
      const poorResults: PerformanceTestResults = {
        testId: 'test-124',
        testType: 'load',
        testScenario: 'guest_list_import',
        userType: 'couple',
        weddingSizeCategory: 'medium',
        environment: 'staging',
        avgResponseTime: 3000, // Much worse than 1500ms threshold
        p95ResponseTime: 6000, // Much worse than 3000ms threshold
        p99ResponseTime: 10000, // Much worse than 5000ms threshold
        errorRate: 0.05, // Much worse than 1% threshold
        throughputRps: 10, // Much worse than 20 RPS threshold
        weddingSeason: false,
        concurrentUsers: 50,
        totalRequests: 1000,
        failedRequests: 50,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 50, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const monitor = new PerformanceMonitor();
      // @ts-ignore - accessing private method for testing
      const score = monitor.calculatePerformanceScore(poorResults);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(30);
    });
  });

  describe('wedding-specific scenarios', () => {
    it('should handle RSVP collection scenario with tight thresholds', async () => {
      const rsvpResults: PerformanceTestResults = {
        testId: 'test-rsvp',
        testType: 'load',
        testScenario: 'rsvp_collection',
        userType: 'guest',
        weddingSizeCategory: 'large',
        environment: 'production',
        avgResponseTime: 600, // Well within 800ms threshold
        p95ResponseTime: 1200, // Well within 1500ms threshold
        p99ResponseTime: 2000, // Well within 2500ms threshold
        errorRate: 0.002, // Well within 0.5% threshold
        throughputRps: 60, // Above 50 RPS threshold
        weddingSeason: true,
        concurrentUsers: 100,
        totalRequests: 2000,
        failedRequests: 4,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 100, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'test-run-rsvp' },
        error: null
      });

      mockBaselineManager.getBaseline.mockResolvedValue(null);

      const result = await performanceMonitor.recordTestResults(rsvpResults);

      expect(result.success).toBe(true);
      expect(result.thresholdsPassed).toBe(true);
      expect(result.performanceScore).toBeGreaterThan(85); // Excellent for RSVP
    });

    it('should handle real-time notifications with ultra-fast requirements', async () => {
      const notificationResults: PerformanceTestResults = {
        testId: 'test-notifications',
        testType: 'load',
        testScenario: 'realtime_notifications',
        userType: 'supplier',
        weddingSizeCategory: 'medium',
        environment: 'production',
        avgResponseTime: 150, // Well within 200ms threshold
        p95ResponseTime: 400, // Well within 500ms threshold
        p99ResponseTime: 800, // Well within 1000ms threshold
        errorRate: 0.003, // Well within 0.5% threshold
        throughputRps: 120, // Above 100 RPS threshold
        weddingSeason: false,
        concurrentUsers: 200,
        totalRequests: 5000,
        failedRequests: 15,
        metrics: {},
        testConfiguration: { duration: '5m', virtualUsers: 200, thresholds: {}, scenarios: [] },
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000
      };

      const result = await performanceMonitor.validatePerformanceThresholds(notificationResults);
      expect(result).toBe(true);
    });
  });
});

// Custom Jest matcher for flexible assertions
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of [${expected.join(', ')}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of [${expected.join(', ')}]`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}