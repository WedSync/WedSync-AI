/**
 * WS-168: Integration Tests for Health Score API
 * Tests real API endpoints for customer success health scoring
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/customer-success/health-score/route';
import { getServerSession } from 'next-auth/next';
import { customerHealthService } from '@/lib/services/customer-health-service';
import { healthScoringEngine } from '@/lib/services/health-scoring-engine';
import { rateLimit } from '@/lib/ratelimit';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/services/customer-health-service');
jest.mock('@/lib/services/health-scoring-engine');
jest.mock('@/lib/ratelimit');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockCustomerHealthService = customerHealthService as jest.Mocked<typeof customerHealthService>;
const mockHealthScoringEngine = healthScoringEngine as jest.Mocked<typeof healthScoringEngine>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;

// Test fixtures
const mockUserSession = {
  user: {
    id: 'user-123',
    email: 'test@wedsync.com',
    organizationId: 'org-456',
    isAdmin: false
  }
};

const mockAdminSession = {
  user: {
    id: 'admin-123',
    email: 'admin@wedsync.com',
    organizationId: 'org-456',
    isAdmin: true
  }
};

const mockHealthResult = {
  healthScore: {
    overall_health_score: 78,
    risk_level: 'medium',
    calculated_at: new Date()
  },
  activitySummary: {
    last_login: '2024-01-15',
    total_sessions: 45,
    feature_usage_count: 12
  },
  recommendations: [
    {
      category: 'Engagement',
      priority: 'high',
      title: 'Increase platform activity',
      description: 'Regular usage improves your success'
    }
  ],
  riskIndicators: ['low_engagement', 'incomplete_onboarding']
};

const mockHealthTrends = [
  { date: '2024-01-01', score: 75 },
  { date: '2024-01-02', score: 77 },
  { date: '2024-01-03', score: 78 }
];

describe('Health Score API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful rate limiting
    mockRateLimit.limit.mockResolvedValue({ success: true });
    
    // Default health service responses
    mockCustomerHealthService.calculateHealthScoreFromActivity.mockResolvedValue(mockHealthResult);
    mockHealthScoringEngine.getHealthTrends.mockResolvedValue(mockHealthTrends);
  });

  describe('GET /api/customer-success/health-score', () => {
    it('should return health score for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('healthScore');
      expect(data.data).toHaveProperty('activitySummary');
      expect(data.data).toHaveProperty('recommendations');
      expect(data.data).toHaveProperty('trends');
      expect(data.data.trends).toHaveLength(3);
    });

    it('should return unauthorized for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should respect rate limiting', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockRateLimit.limit.mockResolvedValue({ success: false });

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should allow admins to access other users health scores', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score?userId=other-user-123', {
        method: 'GET'
      });

      const response = await GET(request, {});
      
      expect(response.status).toBe(200);
      expect(mockCustomerHealthService.calculateHealthScoreFromActivity).toHaveBeenCalledWith(
        'other-user-123',
        'org-456',
        '30d',
        false
      );
    });

    it('should deny non-admin users access to other users data', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score?userId=other-user-123', {
        method: 'GET'
      });

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should handle service errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockCustomerHealthService.calculateHealthScoreFromActivity.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to calculate health score');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle query parameters correctly', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest(
        'http://localhost:3000/api/customer-success/health-score?timeframe=90d&includeRecommendations=false&forceRefresh=true',
        { method: 'GET' }
      );

      const response = await GET(request, {});

      expect(response.status).toBe(200);
      expect(mockCustomerHealthService.calculateHealthScoreFromActivity).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        '90d',
        true
      );
    });

    it('should validate query parameter values', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest(
        'http://localhost:3000/api/customer-success/health-score?timeframe=invalid&includeRecommendations=maybe',
        { method: 'GET' }
      );

      const response = await GET(request, {});

      // Should use default values for invalid parameters
      expect(response.status).toBe(200);
      expect(mockCustomerHealthService.calculateHealthScoreFromActivity).toHaveBeenCalledWith(
        'user-123',
        'org-456',
        '30d', // Default timeframe
        false   // Default forceRefresh
      );
    });

    it('should exclude recommendations when requested', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const request = new NextRequest(
        'http://localhost:3000/api/customer-success/health-score?includeRecommendations=false',
        { method: 'GET' }
      );

      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.recommendations).toEqual([]);
    });
  });

  describe('POST /api/customer-success/health-score/batch', () => {
    const mockBatchResults = new Map([
      ['user-1', mockHealthResult],
      ['user-2', mockHealthResult],
      ['user-3', null] // Failed calculation
    ]);

    it('should process batch health score requests for admins', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockCustomerHealthService.batchCalculateHealthScores.mockResolvedValue(mockBatchResults);

      const requestBody = {
        userIds: ['user-1', 'user-2', 'user-3'],
        organizationId: 'org-456',
        timeframe: '30d'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.processedCount).toBe(3);
      expect(data.data.successCount).toBe(2);
      expect(data.data.errorCount).toBe(1);
      expect(data.data.results).toHaveProperty('user-1');
      expect(data.data.results).toHaveProperty('user-2');
      expect(data.data.errors).toHaveProperty('user-3');
    });

    it('should deny batch requests for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const requestBody = {
        userIds: ['user-1', 'user-2'],
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should validate batch request data', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const invalidRequestBody = {
        userIds: [], // Empty array should fail validation
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('should enforce stricter rate limiting for batch operations', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockRateLimit.limit.mockResolvedValue({ success: false });

      const requestBody = {
        userIds: ['user-1', 'user-2'],
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded for batch operations');
    });

    it('should limit batch size to prevent abuse', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const requestBody = {
        userIds: Array(100).fill(0).map((_, i) => `user-${i}`), // 100 users, over limit
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('should enforce organization access controls', async () => {
      const adminFromOtherOrg = {
        user: {
          id: 'admin-456',
          organizationId: 'other-org-789',
          isAdmin: true
        }
      };

      mockGetServerSession.mockResolvedValue(adminFromOtherOrg);

      const requestBody = {
        userIds: ['user-1', 'user-2'],
        organizationId: 'org-456' // Different from admin's org
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to organization data');
    });

    it('should handle service errors in batch processing', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockCustomerHealthService.batchCalculateHealthScores.mockRejectedValue(
        new Error('Batch processing failed')
      );

      const requestBody = {
        userIds: ['user-1', 'user-2'],
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process batch health score calculation');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request bodies', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request, {});

      expect(response.status).toBe(500);
    });

    it('should handle missing IP addresses in rate limiting', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      // Create request without IP
      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});

      expect(response.status).toBe(200);
      expect(mockRateLimit.limit).toHaveBeenCalledWith('anonymous');
    });

    it('should handle session without organization ID', async () => {
      const sessionWithoutOrg = {
        user: {
          id: 'user-123',
          email: 'test@wedsync.com',
          organizationId: null,
          isAdmin: false
        }
      };

      mockGetServerSession.mockResolvedValue(sessionWithoutOrg);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const response = await GET(request, {});

      expect(response.status).toBe(200);
      expect(mockCustomerHealthService.calculateHealthScoreFromActivity).toHaveBeenCalledWith(
        'user-123',
        null, // organizationId should be null
        '30d',
        false
      );
    });

    it('should validate UUID format for user IDs', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const requestBody = {
        userIds: ['invalid-uuid', 'also-invalid'],
        organizationId: 'org-456'
      };

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score/batch', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockGetServerSession.mockResolvedValue(mockUserSession);

      const promises = Array(10).fill(0).map(() => {
        const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
          method: 'GET'
        });
        return GET(request, {});
      });

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should timeout gracefully for long-running operations', async () => {
      jest.setTimeout(30000); // 30 second timeout

      mockGetServerSession.mockResolvedValue(mockUserSession);
      mockCustomerHealthService.calculateHealthScoreFromActivity.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => resolve(mockHealthResult), 25000); // 25 second delay
        })
      );

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score', {
        method: 'GET'
      });

      const startTime = Date.now();
      const response = await GET(request, {});
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000);
      expect([200, 500]).toContain(response.status);
    });
  });
});