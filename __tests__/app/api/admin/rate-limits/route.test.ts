/**
 * Unit tests for Admin Rate Limits API
 * Tests all CRUD operations and admin authentication
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/admin/rate-limits/route';
import { rateLimitService } from '@/lib/rate-limiter';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

// Mock dependencies
jest.mock('@/lib/rate-limiter');
jest.mock('@supabase/supabase-js');
jest.mock('@/lib/monitoring/structured-logger');
jest.mock('@/lib/monitoring/metrics');

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        order: jest.fn(() => ({
          ascending: jest.fn(() => ({
            limit: jest.fn()
          }))
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            ascending: jest.fn(() => ({
              limit: jest.fn()
            }))
          }))
        })),
        limit: jest.fn()
      })),
      order: jest.fn(() => ({
        ascending: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      gte: jest.fn(() => ({
        order: jest.fn(() => ({
          ascending: jest.fn(() => ({
            limit: jest.fn()
          }))
        }))
      }))
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

const mockRateLimitService = rateLimitService as jest.Mocked<typeof rateLimitService>;

describe('/api/admin/rate-limits API', () => {
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com'
  };

  const mockAdminProfile = {
    role: 'admin',
    permissions: ['rate_limit_admin'],
    organization_id: 'org-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default admin auth setup
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockAdminProfile
          })
        })
      })
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authorization header', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET'
      });

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Missing authorization header');
    });

    it('should reject requests with invalid token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: 'Invalid token'
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer invalid-token' }
      });

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Invalid token');
    });

    it('should reject requests from non-admin users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: 'user',
                permissions: []
              }
            })
          })
        })
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Insufficient permissions for rate limit administration');
    });

    it('should accept requests from super_admin users', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: 'super_admin',
                permissions: []
              }
            }),
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }),
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept requests from users with rate_limit_admin permission', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                role: 'user',
                permissions: ['rate_limit_admin', 'other_permission']
              }
            }),
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }),
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/rate-limits', () => {
    beforeEach(() => {
      // Setup mock data for GET requests
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAdminProfile
            }),
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'override-1',
                      tier: 'user',
                      identifier: 'user-123',
                      limit: 2000,
                      window_ms: 3600000,
                      active: true,
                      created_at: '2025-01-21T10:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          }),
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    {
                      event_type: 'limit_exceeded',
                      tier: 'user',
                      created_at: '2025-01-21T10:30:00Z'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
      });
    });

    it('should return rate limit overrides and analytics', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.overrides).toHaveLength(1);
      expect(body.data.recentEvents).toHaveLength(1);
      expect(body.data.statistics).toEqual({
        totalOverrides: 1,
        activeOverrides: 1,
        recentBlocks: 1,
        recentBypasses: 0
      });
    });

    it('should filter by tier when specified', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?tier=user', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      await GET(request);

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('tier', 'user');
    });

    it('should filter by identifier when specified', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?identifier=user-123', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      await GET(request);

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('identifier', 'user-123');
    });

    it('should filter active overrides when requested', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?active=true', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      await GET(request);

      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('active', true);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAdminProfile
            }),
            order: jest.fn().mockReturnValue({
              ascending: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Database error')
                })
              })
            })
          })
        })
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should record metrics', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?tier=ip', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      await GET(request);

      expect(metrics.incrementCounter).toHaveBeenCalledWith(
        'admin_api.rate_limits.get',
        1,
        expect.objectContaining({
          admin_user_id: 'admin-123',
          tier: 'ip'
        })
      );
    });
  });

  describe('POST /api/admin/rate-limits', () => {
    beforeEach(() => {
      mockRateLimitService.setOverride = jest.fn().mockResolvedValue(undefined);
    });

    it('should create rate limit override successfully', async () => {
      const overrideData = {
        tier: 'user',
        identifier: 'user-123',
        limit: 2000,
        windowMs: 3600000,
        reason: 'VIP user needs higher limits',
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(overrideData)
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.tier).toBe('user');
      expect(body.data.limit).toBe(2000);

      expect(mockRateLimitService.setOverride).toHaveBeenCalledWith(
        'user',
        'user-123',
        2000,
        3600000,
        'admin-123',
        'VIP user needs higher limits',
        expect.any(Date)
      );
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        tier: 'user',
        limit: 2000
        // Missing identifier, windowMs, reason
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(incompleteData)
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should validate tier values', async () => {
      const invalidData = {
        tier: 'invalid_tier',
        identifier: 'user-123',
        limit: 2000,
        windowMs: 3600000,
        reason: 'Test'
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid tier');
    });

    it('should validate numeric values', async () => {
      const invalidData = {
        tier: 'user',
        identifier: 'user-123',
        limit: -100, // Invalid negative limit
        windowMs: 500, // Invalid short window
        reason: 'Test'
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid limit or windowMs values');
    });

    it('should handle service errors', async () => {
      mockRateLimitService.setOverride.mockRejectedValue(new Error('Redis connection failed'));

      const validData = {
        tier: 'user',
        identifier: 'user-123',
        limit: 2000,
        windowMs: 3600000,
        reason: 'Test'
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(validData)
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/rate-limits/reset', () => {
    beforeEach(() => {
      mockRateLimitService.resetRateLimit = jest.fn().mockResolvedValue(undefined);
    });

    it('should reset rate limit successfully', async () => {
      const resetData = {
        tier: 'user',
        identifier: 'user-123',
        reason: 'User requested reset after false positive'
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits/reset', {
        method: 'PUT',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(resetData)
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.tier).toBe('user');
      expect(body.data.identifier).toBe('user-123');

      expect(mockRateLimitService.resetRateLimit).toHaveBeenCalledWith(
        'user',
        'user-123',
        'admin-123'
      );
    });

    it('should validate required fields for reset', async () => {
      const incompleteData = {
        tier: 'user'
        // Missing identifier and reason
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits/reset', {
        method: 'PUT',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(incompleteData)
      });

      const response = await PUT(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Missing required fields');
    });

    it('should validate tier for reset', async () => {
      const invalidData = {
        tier: 'invalid',
        identifier: 'user-123',
        reason: 'Test'
      };

      const request = new NextRequest('https://example.com/api/admin/rate-limits/reset', {
        method: 'PUT',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/rate-limits', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAdminProfile
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });
    });

    it('should delete override by ID', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?id=override-123', {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.overrideId).toBe('override-123');

      expect(mockSupabase.from().update).toHaveBeenCalledWith({ active: false });
    });

    it('should delete override by tier and identifier', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits?tier=user&identifier=user-123', {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.tier).toBe('user');
      expect(body.data.identifier).toBe('user-123');
    });

    it('should require either ID or tier+identifier', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain('Must provide either override ID or tier+identifier');
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAdminProfile
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: new Error('Database error')
          })
        })
      });

      const request = new NextRequest('https://example.com/api/admin/rate-limits?id=override-123', {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await DELETE(request);

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer admin-token',
          'content-type': 'application/json'
        },
        body: 'invalid json{'
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle authentication service failures', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Auth service down'));

      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should record processing time metrics', async () => {
      const request = new NextRequest('https://example.com/api/admin/rate-limits', {
        method: 'GET',
        headers: { authorization: 'Bearer admin-token' }
      });

      await GET(request);

      expect(metrics.recordHistogram).toHaveBeenCalledWith(
        'admin_api.rate_limits.get.duration',
        expect.any(Number)
      );
    });
  });
});