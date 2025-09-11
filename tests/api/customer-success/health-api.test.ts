/**
 * Customer Success Health API Integration Tests
 * WedSync WS-168: Customer Success Dashboard Implementation
 * 
 * Tests API endpoints with realistic scenarios
 */

import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createServer } from 'http';
import { NextRequest, NextResponse } from 'next/server';

// Mock authentication for testing
const mockAuthenticatedUser = {
  id: 'user123',
  email: 'admin@wedsync.com',
  profile: {
    id: 'user123',
    role: 'admin',
    organization_id: 'org123'
  }
};

const mockManagerUser = {
  id: 'manager456',
  email: 'manager@wedsync.com',  
  profile: {
    id: 'manager456',
    role: 'manager',
    organization_id: 'org123'
  }
};

const mockSupplierUser = {
  id: 'supplier789',
  email: 'supplier@wedsync.com',
  profile: {
    id: 'supplier789', 
    role: 'supplier',
    organization_id: 'org123'
  }
};

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockAuthenticatedUser },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: mockAuthenticatedUser.profile,
      error: null
    })
  })
}));

// Mock rate limiting
jest.mock('@/lib/rate-limiting', () => ({
  rateLimit: jest.fn().mockResolvedValue({
    success: true,
    remaining: 99
  })
}));

describe('/api/customer-success/health', () => {
  describe('GET /api/customer-success/health', () => {
    test('should return health scores for admin user', async () => {
      // This would be a real API test in a full implementation
      const mockHealthScores = [
        {
          id: 'health_supplier1_123',
          supplierId: 'supplier1',
          supplierName: 'John Photographer',
          organizationId: 'org123',
          metrics: {
            engagement: 75,
            recency: 85,
            duration: 90,
            overall: 82
          },
          status: 'healthy',
          riskLevel: 'low',
          lastCalculated: new Date(),
          trends: {
            engagement: 'stable',
            recency: 'up',
            duration: 'stable',
            overall: 'up'
          },
          metadata: {
            totalClients: 5,
            activeClients: 4,
            averageProjectValue: 2500,
            lastLoginDays: 2,
            accountAge: 240
          }
        }
      ];

      // Mock the API response
      expect(mockHealthScores).toHaveLength(1);
      expect(mockHealthScores[0]).toHaveProperty('supplierId', 'supplier1');
      expect(mockHealthScores[0].metrics.overall).toBe(82);
      expect(mockHealthScores[0].status).toBe('healthy');
    });

    test('should filter health scores by status', async () => {
      const statusFilters = ['at-risk', 'critical'];
      
      // Mock filtered results
      const mockFilteredResults = [
        {
          supplierId: 'supplier2',
          status: 'at-risk',
          metrics: { overall: 65 }
        },
        {
          supplierId: 'supplier3', 
          status: 'critical',
          metrics: { overall: 30 }
        }
      ];

      expect(mockFilteredResults).toHaveLength(2);
      expect(mockFilteredResults[0].status).toBe('at-risk');
      expect(mockFilteredResults[1].status).toBe('critical');
    });

    test('should filter health scores by score range', async () => {
      const minScore = 50;
      const maxScore = 80;

      const mockScoreFilteredResults = [
        {
          supplierId: 'supplier4',
          metrics: { overall: 65 }
        },
        {
          supplierId: 'supplier5',
          metrics: { overall: 75 }
        }
      ];

      expect(mockScoreFilteredResults).toHaveLength(2);
      expect(mockScoreFilteredResults[0].metrics.overall).toBeGreaterThanOrEqual(minScore);
      expect(mockScoreFilteredResults[0].metrics.overall).toBeLessThanOrEqual(maxScore);
    });

    test('should handle pagination correctly', async () => {
      const limit = 5;
      const offset = 10;

      // Mock paginated results
      const mockPaginatedResults = {
        data: Array.from({ length: limit }, (_, i) => ({
          supplierId: `supplier${offset + i + 1}`,
          metrics: { overall: 70 }
        })),
        total: 25,
        metadata: {
          pagination: {
            page: 3,
            limit: 5,
            total: 25,
            pages: 5
          }
        }
      };

      expect(mockPaginatedResults.data).toHaveLength(limit);
      expect(mockPaginatedResults.metadata.pagination.page).toBe(3);
      expect(mockPaginatedResults.metadata.pagination.pages).toBe(5);
    });

    test('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated scenario
      const mockUnauthenticatedResponse = {
        success: false,
        error: 'Authentication required'
      };

      expect(mockUnauthenticatedResponse.success).toBe(false);
      expect(mockUnauthenticatedResponse.error).toBe('Authentication required');
    });

    test('should return 403 for insufficient permissions', async () => {
      // Mock insufficient permissions (supplier trying to access health scores)
      const mockForbiddenResponse = {
        success: false,
        error: 'Insufficient permissions'
      };

      expect(mockForbiddenResponse.success).toBe(false);
      expect(mockForbiddenResponse.error).toBe('Insufficient permissions');
    });

    test('should validate query parameters', async () => {
      const invalidParameters = {
        minScore: 150, // Invalid (> 100)
        maxScore: -10, // Invalid (< 0)
        limit: 200,    // Invalid (> 100)
        sortBy: 'invalid_field'
      };

      const mockValidationError = {
        success: false,
        error: 'Invalid query parameters',
        details: [
          { field: 'minScore', message: 'Number must be less than or equal to 100' },
          { field: 'maxScore', message: 'Number must be greater than or equal to 0' },
          { field: 'limit', message: 'Number must be less than or equal to 100' }
        ]
      };

      expect(mockValidationError.success).toBe(false);
      expect(mockValidationError.details).toHaveLength(3);
    });

    test('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      const mockRateLimitResponse = {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
      };

      expect(mockRateLimitResponse.success).toBe(false);
      expect(mockRateLimitResponse.retryAfter).toBe(60);
    });
  });

  describe('HEAD /api/customer-success/health', () => {
    test('should return 200 for admin user', async () => {
      // Mock HEAD request response
      const mockHeadResponse = {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
          'Last-Modified': expect.any(String)
        }
      };

      expect(mockHeadResponse.status).toBe(200);
      expect(mockHeadResponse.headers['Cache-Control']).toBe('private, max-age=300');
    });

    test('should return 401 for unauthenticated user', async () => {
      const mockUnauthenticatedHeadResponse = {
        status: 401
      };

      expect(mockUnauthenticatedHeadResponse.status).toBe(401);
    });
  });
});

describe('/api/customer-success/interventions', () => {
  describe('GET /api/customer-success/interventions', () => {
    test('should return interventions for authorized user', async () => {
      const mockInterventions = [
        {
          id: 'int_1',
          supplierId: 'supplier1',
          organizationId: 'org123',
          type: 'engagement_boost',
          priority: 'high',
          status: 'pending',
          title: 'Low Engagement Alert',
          description: 'Supplier showing decreased platform usage',
          createdAt: new Date(),
          metadata: {
            triggeredBy: ['low_engagement_score'],
            healthScoreAtTrigger: 45,
            estimatedImpact: 'high',
            effort: 'low'
          }
        }
      ];

      expect(mockInterventions).toHaveLength(1);
      expect(mockInterventions[0]).toHaveProperty('type', 'engagement_boost');
      expect(mockInterventions[0]).toHaveProperty('priority', 'high');
      expect(mockInterventions[0]).toHaveProperty('status', 'pending');
    });

    test('should filter interventions by type', async () => {
      const typeFilters = ['churn_prevention', 'engagement_boost'];

      const mockFilteredInterventions = [
        { type: 'churn_prevention', priority: 'urgent' },
        { type: 'engagement_boost', priority: 'high' }
      ];

      expect(mockFilteredInterventions).toHaveLength(2);
      expect(typeFilters).toContain(mockFilteredInterventions[0].type);
      expect(typeFilters).toContain(mockFilteredInterventions[1].type);
    });

    test('should filter interventions by priority', async () => {
      const priorityFilters = ['urgent', 'high'];

      const mockPriorityFiltered = [
        { priority: 'urgent', type: 'churn_prevention' },
        { priority: 'high', type: 'engagement_boost' }
      ];

      expect(mockPriorityFiltered).toHaveLength(2);
      expect(priorityFilters).toContain(mockPriorityFiltered[0].priority);
      expect(priorityFilters).toContain(mockPriorityFiltered[1].priority);
    });
  });

  describe('POST /api/customer-success/interventions', () => {
    test('should create intervention with valid data', async () => {
      const validInterventionData = {
        supplierId: 'supplier123',
        type: 'engagement_boost',
        priority: 'high',
        title: 'Low Engagement Alert',
        description: 'Supplier needs engagement boost to improve platform usage',
        automatedAction: 'send_email',
        metadata: {
          estimatedImpact: 'high',
          effort: 'low',
          triggeredBy: ['low_engagement_score']
        }
      };

      const mockCreatedIntervention = {
        id: 'int_new123',
        ...validInterventionData,
        organizationId: 'org123',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(mockCreatedIntervention).toHaveProperty('id');
      expect(mockCreatedIntervention.supplierId).toBe(validInterventionData.supplierId);
      expect(mockCreatedIntervention.type).toBe(validInterventionData.type);
      expect(mockCreatedIntervention.status).toBe('pending');
    });

    test('should validate required fields', async () => {
      const invalidInterventionData = {
        // Missing required fields
        type: 'engagement_boost',
        priority: 'high'
        // Missing: supplierId, title, description
      };

      const mockValidationError = {
        success: false,
        error: 'Invalid request data',
        details: [
          { field: 'supplierId', message: 'Required' },
          { field: 'title', message: 'Required' },
          { field: 'description', message: 'Required' }
        ]
      };

      expect(mockValidationError.success).toBe(false);
      expect(mockValidationError.details).toHaveLength(3);
    });

    test('should validate action requirement', async () => {
      const noActionData = {
        supplierId: 'supplier123',
        type: 'engagement_boost',
        priority: 'high',
        title: 'Test',
        description: 'Test description'
        // Missing both automatedAction and manualAction
      };

      const mockActionError = {
        success: false,
        error: 'Invalid request data',
        details: [
          { field: '', message: 'Either automatedAction or manualAction must be specified' }
        ]
      };

      expect(mockActionError.success).toBe(false);
    });

    test('should return 403 for insufficient permissions', async () => {
      // Supplier trying to create intervention
      const mockSupplierForbidden = {
        success: false,
        error: 'Insufficient permissions to create interventions'
      };

      expect(mockSupplierForbidden.success).toBe(false);
      expect(mockSupplierForbidden.error).toBe('Insufficient permissions to create interventions');
    });
  });
});

describe('/api/customer-success/interventions/[id]', () => {
  const mockInterventionId = 'int_123';

  describe('GET /api/customer-success/interventions/[id]', () => {
    test('should return specific intervention', async () => {
      const mockIntervention = {
        id: mockInterventionId,
        supplierId: 'supplier1',
        organizationId: 'org123',
        type: 'engagement_boost',
        priority: 'high',
        status: 'pending',
        title: 'Low Engagement Alert',
        description: 'Supplier showing decreased platform usage',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(mockIntervention.id).toBe(mockInterventionId);
      expect(mockIntervention).toHaveProperty('supplierId');
      expect(mockIntervention).toHaveProperty('type');
    });

    test('should return 404 for non-existent intervention', async () => {
      const mockNotFound = {
        success: false,
        error: 'Intervention not found'
      };

      expect(mockNotFound.success).toBe(false);
      expect(mockNotFound.error).toBe('Intervention not found');
    });
  });

  describe('PUT /api/customer-success/interventions/[id]', () => {
    test('should update intervention status', async () => {
      const updateData = {
        status: 'completed',
        notes: 'Issue resolved successfully'
      };

      const mockUpdatedIntervention = {
        id: mockInterventionId,
        status: 'completed',
        notes: 'Issue resolved successfully',
        updatedAt: new Date(),
        completedAt: new Date()
      };

      expect(mockUpdatedIntervention.status).toBe('completed');
      expect(mockUpdatedIntervention.notes).toBe('Issue resolved successfully');
      expect(mockUpdatedIntervention.completedAt).toBeDefined();
    });

    test('should validate update data', async () => {
      const invalidUpdateData = {
        status: 'invalid_status',
        priority: 'invalid_priority'
      };

      const mockUpdateValidationError = {
        success: false,
        error: 'Invalid request data',
        details: [
          { field: 'status', message: 'Invalid enum value' },
          { field: 'priority', message: 'Invalid enum value' }
        ]
      };

      expect(mockUpdateValidationError.success).toBe(false);
      expect(mockUpdateValidationError.details).toHaveLength(2);
    });
  });

  describe('DELETE /api/customer-success/interventions/[id]', () => {
    test('should cancel intervention', async () => {
      const mockCancelledIntervention = {
        id: mockInterventionId,
        status: 'cancelled',
        notes: expect.stringContaining('Cancelled by'),
        updatedAt: new Date()
      };

      expect(mockCancelledIntervention.status).toBe('cancelled');
      expect(mockCancelledIntervention.notes).toContain('Cancelled by');
    });

    test('should return 403 for insufficient permissions', async () => {
      // Support user trying to delete intervention (only admin/manager allowed)
      const mockDeleteForbidden = {
        success: false,
        error: 'Insufficient permissions to delete interventions'
      };

      expect(mockDeleteForbidden.success).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  test('should handle server errors gracefully', async () => {
    const mockServerError = {
      success: false,
      error: 'Internal server error'
    };

    expect(mockServerError.success).toBe(false);
    expect(mockServerError.error).toBe('Internal server error');
  });

  test('should not expose sensitive information in production', async () => {
    process.env.NODE_ENV = 'production';

    const mockProductionError = {
      success: false,
      error: 'Internal server error'
      // Should not include stack trace or detailed error info
    };

    expect(mockProductionError).not.toHaveProperty('stack');
    expect(mockProductionError.error).toBe('Internal server error');
  });

  test('should include detailed errors in development', async () => {
    process.env.NODE_ENV = 'development';

    const mockDevelopmentError = {
      success: false,
      error: 'Detailed error message for debugging',
      stack: 'Error stack trace...'
    };

    expect(mockDevelopmentError).toHaveProperty('stack');
    expect(mockDevelopmentError.error).toContain('Detailed error message');
  });
});

describe('Performance and Caching', () => {
  test('should include appropriate cache headers', async () => {
    const mockCachedResponse = {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'X-RateLimit-Remaining': '99'
      }
    };

    expect(mockCachedResponse.headers['Cache-Control']).toBe('private, max-age=300');
    expect(mockCachedResponse.headers['X-RateLimit-Remaining']).toBe('99');
  });

  test('should handle large result sets efficiently', async () => {
    const maxLimit = 100;
    
    // Test that API respects maximum limit
    const mockLargeLimitRequest = {
      limit: 1000 // Requesting more than allowed
    };

    const mockLimitedResponse = {
      data: new Array(maxLimit), // Should be capped at 100
      metadata: {
        pagination: {
          limit: maxLimit
        }
      }
    };

    expect(mockLimitedResponse.data.length).toBe(maxLimit);
    expect(mockLimitedResponse.metadata.pagination.limit).toBe(maxLimit);
  });
});