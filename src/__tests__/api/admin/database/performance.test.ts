/**
 * Database Performance API Tests
 * Integration tests for the database performance monitoring API endpoints
 */

import { GET, POST } from '@/app/api/admin/database/performance/route';
import { databasePerformanceMonitor } from '@/lib/database/performance-monitor';
import { databaseAutoTuner } from '@/lib/database/auto-tuner';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/database/performance-monitor');
jest.mock('@/lib/database/auto-tuner');
jest.mock('@/lib/security/withSecureValidation');

const mockDatabasePerformanceMonitor =
  databasePerformanceMonitor as jest.Mocked<typeof databasePerformanceMonitor>;
const mockDatabaseAutoTuner = databaseAutoTuner as jest.Mocked<
  typeof databaseAutoTuner
>;

// Mock withSecureValidation to bypass auth for testing
jest.mock('@/lib/security/withSecureValidation', () => ({
  withSecureValidation: jest.fn((request: any, config: any, handler: any) =>
    handler(),
  ),
}));

// Test Data Builders - Reduce mock object nesting
function createMockPerformanceMetrics() {
  return {
    queryCount: 150,
    avgResponseTime: 250,
    slowQueries: [
      {
        query: 'SELECT * FROM bookings WHERE wedding_date = ?',
        table: 'bookings',
        executionTime: 1500,
        timestamp: new Date(),
        rowsAffected: 100,
        planCost: 1200,
      },
    ],
    connectionHealth: {
      activeConnections: 25,
      maxConnections: 100,
      utilization: 25,
      avgConnectionAge: 30000,
      status: 'healthy',
    },
    indexEfficiency: [
      {
        tableName: 'bookings',
        indexName: 'idx_bookings_date',
        usage: 1000,
        efficiency: 85,
        size: '10 MB',
        recommendation: 'keep',
      },
    ],
    tableStats: [
      {
        tableName: 'bookings',
        rowCount: 50000,
        size: '100 MB',
        lastUpdated: new Date(),
        queryFrequency: 75,
        averageResponseTime: 300,
      },
    ],
    optimizationOpportunities: [
      {
        type: 'index',
        severity: 'medium',
        table: 'bookings',
        description: 'Consider adding composite index',
        recommendation: 'Add index on (wedding_date, venue_id)',
        estimatedImpact: 'Reduce query time by 40%',
        effort: 'low',
      },
    ],
  };
}

function createMockTuningReport() {
  return {
    period: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    actionsApplied: 3,
    totalImprovement: 35.5,
    successRate: 100,
    recommendations: [
      {
        priority: 'medium',
        category: 'performance',
        description: 'Consider index optimization',
        action: 'Review slow queries and add appropriate indexes',
        estimatedImpact: '30-50% performance improvement',
        requiresDowntime: false,
      },
    ],
  };
}

function createExcellentMetrics() {
  return {
    queryCount: 50,
    avgResponseTime: 50, // Very fast
    slowQueries: [], // No slow queries
    connectionHealth: {
      activeConnections: 10,
      maxConnections: 100,
      utilization: 10, // Low utilization
      avgConnectionAge: 30000,
      status: 'healthy',
    },
    indexEfficiency: [
      {
        tableName: 'bookings',
        indexName: 'idx_test',
        usage: 1000,
        efficiency: 95, // High efficiency
        size: '5 MB',
        recommendation: 'keep',
      },
    ],
    tableStats: [],
    optimizationOpportunities: [], // No issues
  };
}

function createMockAppliedAction() {
  return {
    id: 'action_1',
    type: 'create_index',
    table: 'bookings',
    description: 'Created index on wedding_date',
    sql: 'CREATE INDEX idx_test ON bookings (wedding_date);',
    status: 'applied',
    appliedAt: new Date(),
    impact: {
      beforeMetrics: {} as any,
      improvement: 45,
      success: true,
    },
  };
}

function createTuningConfig() {
  return {
    enabled: true,
    aggressiveness: 'moderate',
    autoApplyIndexes: true,
    performanceThreshold: 1500,
  };
}

function createFullTuningConfig() {
  return {
    enabled: true,
    aggressiveness: 'moderate',
    autoApplyIndexes: true,
    autoApplyQueryOptimizations: false,
    maxIndexesPerTable: 10,
    performanceThreshold: 1500,
    monitoringInterval: 30,
    backupBeforeChanges: true,
  };
}

// Request Builders
function createGETRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/database/performance');
}

function createPOSTRequest(action: string, config?: any): NextRequest {
  const body: any = { action };
  if (config) body.config = config;
  
  return new NextRequest('http://localhost/api/admin/database/performance', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Response Validators - Extract complex expectation nesting
function validateSuccessfulPerformanceResponse(data: any) {
  expect(data).toMatchObject({
    success: true,
    data: {
      performance: expect.any(Object),
      tuning: expect.any(Object),
      recentActions: expect.any(Array),
    },
  });
}

function validateOverallHealthScore(data: any) {
  const health = data.data.summary.overallHealth;
  expect(health).toHaveProperty('score');
  expect(health).toHaveProperty('status');
  expect(health).toHaveProperty('factors');
  expect(typeof health.score).toBe('number');
  expect(typeof health.status).toBe('string');
  expect(Array.isArray(health.factors)).toBe(true);
}

function validateErrorResponse(data: any, expectedError: string) {
  expect(data).toMatchObject({
    success: false,
    error: expectedError,
  });
}

function validateActionResponse(data: any, expectedMessage: string) {
  expect(data).toMatchObject({
    success: true,
    message: expectedMessage,
  });
}

function validateConfigResponse(data: any, expectedMessage: string, configChecks: any) {
  expect(data).toMatchObject({
    success: true,
    message: expectedMessage,
    config: expect.objectContaining(configChecks),
  });
}

// Mock Setup Helpers
function setupSuccessfulMocks() {
  const metrics = createMockPerformanceMetrics();
  const tuningReport = createMockTuningReport();
  const appliedAction = createMockAppliedAction();

  mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue(metrics);
  mockDatabaseAutoTuner.generateTuningReport.mockResolvedValue(tuningReport);
  mockDatabaseAutoTuner.getAppliedActions.mockReturnValue([appliedAction]);
}

function setupExcellentMetricsMocks() {
  const excellentMetrics = createExcellentMetrics();
  
  mockDatabasePerformanceMonitor.getDatabaseMetrics.mockResolvedValue(excellentMetrics);
  mockDatabaseAutoTuner.generateTuningReport.mockResolvedValue({
    period: { start: new Date(), end: new Date() },
    actionsApplied: 0,
    totalImprovement: 0,
    successRate: 100,
    recommendations: [],
  });
  mockDatabaseAutoTuner.getAppliedActions.mockReturnValue([]);
}

describe('/api/admin/database/performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/database/performance', () => {
    test('should return comprehensive database performance metrics', async () => {
      setupSuccessfulMocks();

      const request = createGETRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateSuccessfulPerformanceResponse(data);
      validateOverallHealthScore(data);
      
      expect(data.data.summary.activeOptimizations).toBe(1);
      expect(data.data.summary.pendingIssues).toBe(1);
    });

    test('should handle database performance monitoring errors', async () => {
      mockDatabasePerformanceMonitor.getDatabaseMetrics.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const request = createGETRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      validateErrorResponse(data, 'Failed to fetch performance metrics');
      expect(data.details).toBe('Database connection failed');
    });

    test('should calculate overall health score correctly', async () => {
      setupExcellentMetricsMocks();

      const request = createGETRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.summary.overallHealth.score).toBeGreaterThan(85);
      expect(data.data.summary.overallHealth.status).toBe('excellent');
    });
  });

  describe('POST /api/admin/database/performance', () => {
    test('should start database monitoring', async () => {
      mockDatabasePerformanceMonitor.startMonitoring.mockImplementation(() => {});

      const request = createPOSTRequest('start_monitoring', { interval: 60000 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateActionResponse(data, 'Database monitoring started');
      expect(mockDatabasePerformanceMonitor.startMonitoring).toHaveBeenCalledWith(60000);
    });

    test('should stop database monitoring', async () => {
      mockDatabasePerformanceMonitor.stopMonitoring.mockImplementation(() => {});

      const request = createPOSTRequest('stop_monitoring');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateActionResponse(data, 'Database monitoring stopped');
      expect(mockDatabasePerformanceMonitor.stopMonitoring).toHaveBeenCalled();
    });

    test('should start auto-tuning with configuration', async () => {
      const tuningConfig = createTuningConfig();
      
      mockDatabaseAutoTuner.startAutoTuning.mockResolvedValue();
      mockDatabaseAutoTuner.getConfig.mockReturnValue(createFullTuningConfig());

      const request = createPOSTRequest('start_auto_tuning', tuningConfig);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateConfigResponse(data, 'Auto-tuning started', {
        enabled: true,
        aggressiveness: 'moderate',
      });
      expect(mockDatabaseAutoTuner.startAutoTuning).toHaveBeenCalledWith(tuningConfig);
    });

    test('should stop auto-tuning', async () => {
      mockDatabaseAutoTuner.stopAutoTuning.mockImplementation(() => {});

      const request = createPOSTRequest('stop_auto_tuning');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateActionResponse(data, 'Auto-tuning stopped');
      expect(mockDatabaseAutoTuner.stopAutoTuning).toHaveBeenCalled();
    });

    test('should trigger manual tuning cycle', async () => {
      mockDatabaseAutoTuner.performTuningCycle.mockResolvedValue();

      const request = createPOSTRequest('trigger_tuning_cycle');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateActionResponse(data, 'Tuning cycle completed');
      expect(mockDatabaseAutoTuner.performTuningCycle).toHaveBeenCalled();
    });

    test('should update tuning configuration', async () => {
      const configUpdates = {
        aggressiveness: 'aggressive',
        performanceThreshold: 500,
      };

      mockDatabaseAutoTuner.updateConfig.mockImplementation(() => {});
      mockDatabaseAutoTuner.getConfig.mockReturnValue({
        ...createFullTuningConfig(),
        aggressiveness: 'aggressive',
        performanceThreshold: 500,
      });

      const request = createPOSTRequest('update_config', configUpdates);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      validateConfigResponse(data, 'Configuration updated', {
        aggressiveness: 'aggressive',
        performanceThreshold: 500,
      });
      expect(mockDatabaseAutoTuner.updateConfig).toHaveBeenCalledWith(configUpdates);
    });

    test('should handle invalid action', async () => {
      const request = createPOSTRequest('invalid_action');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      validateErrorResponse(data, 'Invalid action');
      expect(data.availableActions).toEqual(expect.arrayContaining([
        'start_monitoring',
        'stop_monitoring',
        'start_auto_tuning',
        'stop_auto_tuning',
        'trigger_tuning_cycle',
        'update_config',
      ]));
    });

    test('should handle auto-tuning errors', async () => {
      mockDatabaseAutoTuner.startAutoTuning.mockRejectedValue(
        new Error('Configuration validation failed'),
      );

      const request = createPOSTRequest('start_auto_tuning', { enabled: true });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      validateErrorResponse(data, 'Failed to process action');
      expect(data.details).toBe('Configuration validation failed');
    });

    test('should handle malformed JSON request body', async () => {
      const request = new NextRequest('http://localhost/api/admin/database/performance', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      validateErrorResponse(data, 'Failed to process action');
    });
  });
});
