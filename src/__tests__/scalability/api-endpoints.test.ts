import {
  describe,
  it,
  expect,
  beforeEach,
  jest,
  afterEach,
} from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as metricsRealtimeGET } from '@/app/api/scalability/metrics/realtime/route';
import { POST as scaleActionPOST } from '@/app/api/scalability/actions/scale/route';
import { GET as statusGET } from '@/app/api/scalability/status/route';
import { POST as predictionPOST } from '@/app/api/scalability/predictions/route';

// Mock the scalability services
jest.mock('@/lib/scalability/backend/intelligent-auto-scaling-engine');
jest.mock('@/lib/scalability/backend/wedding-load-predictor');
jest.mock('@/lib/scalability/backend/real-time-performance-monitor');
jest.mock('@/lib/scalability/security/rbac-manager');

describe('Scalability API Endpoints', () => {
  let mockAuthUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated user
    mockAuthUser = {
      id: 'user-123',
      email: 'admin@wedsync.com',
      roles: ['scalability_admin'],
      permissions: [
        'scalability:read',
        'scalability:write',
        'scalability:execute',
      ],
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('/api/scalability/metrics/realtime', () => {
    it('should return real-time metrics for authenticated admin', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/metrics/realtime',
      );

      // Mock authentication
      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await metricsRealtimeGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.timestamp).toBeDefined();
      expect(typeof data.metrics.cpuUtilization).toBe('number');
      expect(typeof data.metrics.memoryUtilization).toBe('number');
      expect(typeof data.metrics.requestsPerSecond).toBe('number');
    });

    it('should include wedding context when available', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/metrics/realtime?includeWeddingContext=true',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock wedding context
      const mockWeddingContext = {
        activeWeddings: 3,
        upcomingWeddings: 5,
        weddingDayActive: true,
        peakHoursActive: false,
      };

      jest
        .spyOn(
          require('@/lib/scalability/backend/wedding-load-predictor'),
          'WeddingLoadPredictor',
        )
        .mockImplementation(() => ({
          getWeddingContext: jest.fn().mockResolvedValue(mockWeddingContext),
        }));

      // Act
      const response = await metricsRealtimeGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.weddingContext).toBeDefined();
      expect(data.weddingContext.activeWeddings).toBe(3);
      expect(data.weddingContext.weddingDayActive).toBe(true);
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/metrics/realtime',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(null);

      // Act
      const response = await metricsRealtimeGET(request);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 for users without scalability permissions', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/metrics/realtime',
      );

      const unauthorizedUser = {
        id: 'user-456',
        email: 'user@wedsync.com',
        roles: ['basic_user'],
        permissions: ['user:read'],
      };

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(unauthorizedUser);

      // Act
      const response = await metricsRealtimeGET(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should handle performance monitor errors gracefully', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/metrics/realtime',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock monitor failure
      jest
        .spyOn(
          require('@/lib/scalability/backend/real-time-performance-monitor'),
          'RealTimePerformanceMonitor',
        )
        .mockImplementation(() => ({
          collectCurrentMetrics: jest
            .fn()
            .mockRejectedValue(new Error('Monitor service unavailable')),
        }));

      // Act
      const response = await metricsRealtimeGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.error).toContain('Monitor service unavailable');
      expect(data.fallbackMode).toBe(true);
    });
  });

  describe('/api/scalability/actions/scale', () => {
    it('should execute scaling action for authorized admin', async () => {
      // Arrange
      const scalingRequest = {
        action: 'scale_up',
        services: ['api', 'database'],
        reason: 'wedding_day_preparation',
        targetCapacity: {
          cpuCores: 32,
          memoryGB: 128,
          databaseConnections: 200,
        },
        urgency: 'high',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/actions/scale',
        {
          method: 'POST',
          body: JSON.stringify(scalingRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock successful scaling execution
      const mockScalingResult = {
        success: true,
        executionId: 'exec-789',
        decisionsExecuted: 2,
        executionTimeMs: 15000,
        resourcesScaled: ['api-servers', 'database-pool'],
        estimatedCost: { hourly: 15.5, monthly: 465.0 },
      };

      jest
        .spyOn(
          require('@/lib/scalability/backend/intelligent-auto-scaling-engine'),
          'IntelligentAutoScalingEngine',
        )
        .mockImplementation(() => ({
          executeManualScaling: jest.fn().mockResolvedValue(mockScalingResult),
        }));

      // Act
      const response = await scaleActionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.executionId).toBe('exec-789');
      expect(data.decisionsExecuted).toBe(2);
      expect(data.executionTimeMs).toBeLessThan(30000);
    });

    it('should validate scaling request parameters', async () => {
      // Arrange
      const invalidRequest = {
        action: 'invalid_action', // Invalid action
        services: [], // Empty services array
        reason: '', // Empty reason
        urgency: 'super_urgent', // Invalid urgency level
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/actions/scale',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await scaleActionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
      expect(data.validationErrors).toBeDefined();
      expect(data.validationErrors.action).toBeDefined();
      expect(data.validationErrors.services).toBeDefined();
    });

    it('should enforce RBAC permissions for scaling actions', async () => {
      // Arrange
      const scalingRequest = {
        action: 'emergency_scale',
        services: ['api', 'database', 'storage'],
        reason: 'wedding_day_emergency',
        urgency: 'critical',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/actions/scale',
        {
          method: 'POST',
          body: JSON.stringify(scalingRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      // User without emergency scaling permissions
      const limitedUser = {
        id: 'user-456',
        email: 'operator@wedsync.com',
        roles: ['scalability_operator'],
        permissions: ['scalability:read', 'scalability:scale_standard'],
      };

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(limitedUser);

      // Act
      const response = await scaleActionPOST(request);

      // Assert
      expect(response.status).toBe(403);
    });

    it('should handle wedding day emergency scaling with priority', async () => {
      // Arrange
      const emergencyRequest = {
        action: 'emergency_scale',
        services: ['api', 'database', 'realtime', 'media'],
        reason: 'wedding_day_traffic_spike',
        urgency: 'critical',
        weddingDayMode: true,
        affectedWeddings: ['wedding-123', 'wedding-456'],
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/actions/scale',
        {
          method: 'POST',
          body: JSON.stringify(emergencyRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      // Admin user with emergency permissions
      const emergencyAdmin = {
        id: 'admin-emergency',
        email: 'emergency@wedsync.com',
        roles: ['scalability_admin', 'wedding_emergency_responder'],
        permissions: ['scalability:emergency', 'scalability:wedding_priority'],
      };

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(emergencyAdmin);

      // Mock emergency scaling result
      const emergencyResult = {
        success: true,
        executionId: 'emergency-exec-123',
        emergencyScalingActivated: true,
        decisionsExecuted: 6,
        executionTimeMs: 8000, // Faster execution for emergencies
        resourcesScaled: ['api-servers', 'database-pool', 'media-processors'],
        weddingDayPriority: true,
        estimatedCost: { hourly: 45.0, emergency_premium: 15.0 },
      };

      jest
        .spyOn(
          require('@/lib/scalability/backend/intelligent-auto-scaling-engine'),
          'IntelligentAutoScalingEngine',
        )
        .mockImplementation(() => ({
          executeEmergencyScaling: jest.fn().mockResolvedValue(emergencyResult),
        }));

      // Act
      const response = await scaleActionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.emergencyScalingActivated).toBe(true);
      expect(data.weddingDayPriority).toBe(true);
      expect(data.executionTimeMs).toBeLessThan(10000); // Emergency scaling should be faster
    });

    it('should rate limit scaling requests', async () => {
      // Arrange
      const scalingRequest = {
        action: 'scale_up',
        services: ['api'],
        reason: 'load_test',
        urgency: 'low',
      };

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act - Make multiple rapid requests
      const requests = Array(6)
        .fill(null)
        .map(() =>
          scaleActionPOST(
            new NextRequest(
              'http://localhost:3000/api/scalability/actions/scale',
              {
                method: 'POST',
                body: JSON.stringify(scalingRequest),
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          ),
        );

      const responses = await Promise.all(requests);

      // Assert
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('/api/scalability/status', () => {
    it('should return comprehensive system status', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/status',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock system status
      const mockSystemStatus = {
        overallHealth: 'healthy',
        services: {
          api: { status: 'healthy', responseTime: 150, uptime: '99.9%' },
          database: { status: 'healthy', responseTime: 45, uptime: '99.8%' },
          auth: { status: 'healthy', responseTime: 85, uptime: '99.95%' },
        },
        currentCapacity: {
          cpuCores: 16,
          memoryGB: 64,
          databaseConnections: 100,
        },
        utilizationMetrics: {
          cpu: 55,
          memory: 68,
          database: 72,
        },
        activeScalingOperations: [],
        lastScalingEvent: {
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          action: 'scale_down',
          reason: 'off_peak_optimization',
        },
      };

      // Act
      const response = await statusGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.overallHealth).toBeDefined();
      expect(data.services).toBeDefined();
      expect(data.services.api.status).toBe('healthy');
      expect(data.currentCapacity).toBeDefined();
      expect(data.utilizationMetrics).toBeDefined();
    });

    it('should include wedding context in status', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/status?includeWeddingContext=true',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await statusGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.weddingContext).toBeDefined();
      expect(data.weddingContext.activeWeddings).toBeDefined();
      expect(data.weddingContext.upcomingWeddings).toBeDefined();
      expect(data.weddingContext.weddingDayMode).toBeDefined();
    });

    it('should show degraded status when services are unhealthy', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/status',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock degraded system
      jest
        .spyOn(
          require('@/lib/scalability/backend/real-time-performance-monitor'),
          'RealTimePerformanceMonitor',
        )
        .mockImplementation(() => ({
          getSystemStatus: jest.fn().mockResolvedValue({
            overallHealth: 'degraded',
            services: {
              api: { status: 'healthy', responseTime: 180 },
              database: { status: 'degraded', responseTime: 850, errors: 25 },
              auth: { status: 'healthy', responseTime: 90 },
            },
          }),
        }));

      // Act
      const response = await statusGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.overallHealth).toBe('degraded');
      expect(data.services.database.status).toBe('degraded');
      expect(data.alerts).toBeDefined();
    });
  });

  describe('/api/scalability/predictions', () => {
    it('should generate capacity predictions for upcoming period', async () => {
      // Arrange
      const predictionRequest = {
        timeHorizonHours: 24,
        includeWeddingContext: true,
        includeCostEstimates: true,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/predictions',
        {
          method: 'POST',
          body: JSON.stringify(predictionRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock prediction result
      const mockPrediction = {
        timeRange: {
          startTime: new Date(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        predictedLoad: {
          requestsPerSecond: 3500,
          concurrentUsers: 1200,
          databaseLoad: 85,
        },
        recommendedCapacity: {
          cpuCores: 24,
          memoryGB: 96,
          databaseConnections: 150,
        },
        confidence: 0.87,
        upcomingWeddings: 7,
        peakPeriods: [
          {
            start: new Date(Date.now() + 8 * 60 * 60 * 1000),
            duration: 4,
            intensity: 'high',
          },
        ],
        estimatedCosts: {
          currentCapacity: { hourly: 12.5, monthly: 375.0 },
          recommendedCapacity: { hourly: 18.75, monthly: 562.5 },
        },
      };

      jest
        .spyOn(
          require('@/lib/scalability/backend/wedding-load-predictor'),
          'WeddingLoadPredictor',
        )
        .mockImplementation(() => ({
          generateCapacityForecast: jest.fn().mockResolvedValue(mockPrediction),
        }));

      // Act
      const response = await predictionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.predictedLoad).toBeDefined();
      expect(data.recommendedCapacity).toBeDefined();
      expect(data.confidence).toBeGreaterThan(0.8);
      expect(data.upcomingWeddings).toBe(7);
      expect(data.estimatedCosts).toBeDefined();
    });

    it('should validate prediction request parameters', async () => {
      // Arrange
      const invalidRequest = {
        timeHorizonHours: 200, // Too long
        invalidParameter: 'test',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/predictions',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await predictionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.validationErrors).toBeDefined();
      expect(data.validationErrors.timeHorizonHours).toBeDefined();
    });

    it('should provide wedding-specific predictions', async () => {
      // Arrange
      const weddingPredictionRequest = {
        timeHorizonHours: 12,
        focusWeddingId: 'wedding-123',
        includeWeddingContext: true,
        detailLevel: 'high',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/scalability/predictions',
        {
          method: 'POST',
          body: JSON.stringify(weddingPredictionRequest),
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await predictionPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.weddingSpecific).toBe(true);
      expect(data.focusWedding).toBeDefined();
      expect(data.focusWedding.id).toBe('wedding-123');
      expect(data.weddingImpactAnalysis).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/actions/scale',
        {
          method: 'POST',
          body: 'invalid json{',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await scaleActionPOST(request);

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle service timeouts gracefully', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/status',
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Mock timeout
      jest
        .spyOn(
          require('@/lib/scalability/backend/real-time-performance-monitor'),
          'RealTimePerformanceMonitor',
        )
        .mockImplementation(() => ({
          getSystemStatus: jest
            .fn()
            .mockImplementation(
              () =>
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Service timeout')), 100),
                ),
            ),
        }));

      // Act
      const response = await statusGET(request);

      // Assert
      expect(response.status).toBe(503);
    });

    it('should implement proper CORS headers', async () => {
      // Arrange
      const request = new NextRequest(
        'http://localhost:3000/api/scalability/status',
        {
          headers: { Origin: 'http://localhost:3000' },
        },
      );

      jest
        .spyOn(require('@/lib/auth'), 'getAuthenticatedUser')
        .mockResolvedValue(mockAuthUser);

      // Act
      const response = await statusGET(request);

      // Assert
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(
        response.headers.get('Access-Control-Allow-Methods'),
      ).toBeDefined();
    });
  });
});
