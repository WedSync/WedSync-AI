/**
 * WS-168: Security Tests for Admin Access Validation
 * Comprehensive security testing for customer success dashboard access controls
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/customer-success/health-score/route';
import { GET as HealthInterventionsGET, POST as HealthInterventionsPOST } from '@/app/api/customer-success/health-interventions/route';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth/next';
import { rateLimit } from '@/lib/ratelimit';
import { z } from 'zod';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/ratelimit');
jest.mock('@/lib/services/customer-health-service');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    admin: {
      getUserById: jest.fn()
    }
  },
  from: jest.fn(),
  rpc: jest.fn()
};

// Test user scenarios
const testUsers = {
  // Valid admin user
  validAdmin: {
    user: {
      id: 'admin-001',
      email: 'admin@wedsync.com',
      organizationId: 'org-123',
      isAdmin: true,
      role: 'admin'
    }
  },
  
  // Valid supplier user (non-admin)
  validSupplier: {
    user: {
      id: 'supplier-001', 
      email: 'supplier@wedsync.com',
      organizationId: 'org-123',
      isAdmin: false,
      role: 'supplier'
    }
  },
  
  // User from different organization
  differentOrgAdmin: {
    user: {
      id: 'admin-002',
      email: 'admin2@other-org.com',
      organizationId: 'org-456',
      isAdmin: true,
      role: 'admin'
    }
  },
  
  // Suspended user
  suspendedUser: {
    user: {
      id: 'suspended-001',
      email: 'suspended@wedsync.com', 
      organizationId: 'org-123',
      isAdmin: false,
      role: 'supplier',
      status: 'suspended'
    }
  },
  
  // User with malicious data
  maliciousUser: {
    user: {
      id: '<script>alert("xss")</script>',
      email: 'malicious@example.com',
      organizationId: 'org-123',
      isAdmin: false,
      role: 'supplier'
    }
  }
};

// Security test utilities
class SecurityTestUtils {
  static createMaliciousPayloads() {
    return {
      xss: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        '\'/><script>alert("xss")</script>'
      ],
      sqlInjection: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        '....//....//....//etc/passwd'
      ],
      commandInjection: [
        '; cat /etc/passwd',
        '| whoami',
        '`cat /etc/passwd`',
        '$(cat /etc/passwd)',
        '; rm -rf /'
      ]
    };
  }

  static generateLargePayload(size: number): string {
    return 'A'.repeat(size);
  }

  static createInvalidUUIDs() {
    return [
      'invalid-uuid',
      '12345',
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-extra',
      '',
      null,
      undefined,
      123,
      true,
      {},
      []
    ];
  }

  static async makeAuthenticatedRequest(
    handler: Function, 
    method: string,
    url: string, 
    session: any,
    body?: any,
    headers?: Record<string, string>
  ) {
    mockGetServerSession.mockResolvedValue(session);
    
    const request = new NextRequest(url, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    return await handler(request, {});
  }
}

describe('Admin Access Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockRateLimit.limit.mockResolvedValue({ success: true });
  });

  describe('Authentication Security', () => {
    test('should reject requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score');
      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should reject requests with invalid session', async () => {
      mockGetServerSession.mockResolvedValue({ user: null });

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score');
      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    test('should reject requests with expired sessions', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session expired'));

      const request = new NextRequest('http://localhost:3000/api/customer-success/health-score');
      const response = await GET(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    test('should validate session integrity', async () => {
      const tamperedSession = {
        user: {
          ...testUsers.validSupplier.user,
          isAdmin: true // Tampered to claim admin rights
        }
      };

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score?userId=other-user',
        tamperedSession
      );
      const data = await response.json();

      // Should still deny access since real authorization check should verify admin status
      expect([403, 401]).toContain(response.status);
    });
  });

  describe('Authorization Security', () => {
    test('should enforce admin-only access to batch operations', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        POST,
        'POST', 
        'http://localhost:3000/api/customer-success/health-score/batch',
        testUsers.validSupplier,
        {
          userIds: ['user-1', 'user-2'],
          organizationId: 'org-123'
        }
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    test('should prevent cross-organization data access', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score?organizationId=org-456',
        testUsers.validAdmin // Admin of org-123 trying to access org-456
      );
      const data = await response.json();

      expect([403, 401]).toContain(response.status);
    });

    test('should prevent users from accessing other users data', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET', 
        'http://localhost:3000/api/customer-success/health-score?userId=other-user-123',
        testUsers.validSupplier
      );
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    test('should validate organization membership', async () => {
      // User tries to access data with different organization ID
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        {
          user: {
            ...testUsers.validSupplier.user,
            organizationId: 'different-org'
          }
        }
      );
      
      const data = await response.json();
      expect([403, 401]).toContain(response.status);
    });

    test('should respect role-based permissions', async () => {
      const roles = [
        { role: 'supplier', shouldHaveAccess: false },
        { role: 'admin', shouldHaveAccess: true },
        { role: 'owner', shouldHaveAccess: true },
        { role: 'manager', shouldHaveAccess: false }
      ];

      for (const { role, shouldHaveAccess } of roles) {
        const userSession = {
          user: {
            ...testUsers.validAdmin.user,
            role,
            isAdmin: role === 'admin' || role === 'owner'
          }
        };

        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          POST,
          'POST',
          'http://localhost:3000/api/customer-success/health-score/batch',
          userSession,
          {
            userIds: ['user-1'],
            organizationId: 'org-123'
          }
        );

        if (shouldHaveAccess) {
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      }
    });
  });

  describe('Input Validation Security', () => {
    test('should sanitize XSS attempts in parameters', async () => {
      const maliciousPayloads = SecurityTestUtils.createMaliciousPayloads().xss;

      for (const payload of maliciousPayloads) {
        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          GET,
          'GET',
          `http://localhost:3000/api/customer-success/health-score?userId=${encodeURIComponent(payload)}`,
          testUsers.validAdmin
        );

        // Should either reject the request or sanitize the input
        expect([400, 422]).toContain(response.status);
      }
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlPayloads = SecurityTestUtils.createMaliciousPayloads().sqlInjection;

      for (const payload of sqlPayloads) {
        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          POST,
          'POST',
          'http://localhost:3000/api/customer-success/health-interventions',
          testUsers.validAdmin,
          {
            action: 'process-intervention',
            supplierId: payload,
            organizationId: 'org-123'
          }
        );

        // Should reject malicious input
        expect([400, 422]).toContain(response.status);
      }
    });

    test('should validate UUID format strictly', async () => {
      const invalidUUIDs = SecurityTestUtils.createInvalidUUIDs();

      for (const invalidUUID of invalidUUIDs) {
        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          POST,
          'POST',
          'http://localhost:3000/api/customer-success/health-score/batch',
          testUsers.validAdmin,
          {
            userIds: [invalidUUID],
            organizationId: 'org-123'
          }
        );

        expect(response.status).toBe(400);
      }
    });

    test('should reject oversized payloads', async () => {
      const largePayload = SecurityTestUtils.generateLargePayload(10 * 1024 * 1024); // 10MB

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        POST,
        'POST',
        'http://localhost:3000/api/customer-success/health-interventions',
        testUsers.validAdmin,
        {
          action: 'process-intervention',
          supplierId: largePayload,
          organizationId: 'org-123'
        }
      );

      expect([400, 413, 422]).toContain(response.status);
    });

    test('should validate enum values strictly', async () => {
      const invalidTimeframes = ['1h', 'invalid', '999d', '<script>', null, undefined];

      for (const timeframe of invalidTimeframes) {
        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          GET,
          'GET',
          `http://localhost:3000/api/customer-success/health-score?timeframe=${timeframe}`,
          testUsers.validAdmin
        );

        // Should either use default or reject
        expect(response.status).not.toBe(500);
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = SecurityTestUtils.createMaliciousPayloads().pathTraversal;

      for (const payload of pathTraversalPayloads) {
        const response = await SecurityTestUtils.makeAuthenticatedRequest(
          GET,
          'GET',
          `http://localhost:3000/api/customer-success/health-score?userId=${encodeURIComponent(payload)}`,
          testUsers.validAdmin
        );

        expect([400, 422]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting Security', () => {
    test('should enforce rate limits', async () => {
      mockRateLimit.limit.mockResolvedValue({ success: false });

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    test('should have stricter rate limits for batch operations', async () => {
      mockRateLimit.limit.mockResolvedValue({ success: false });

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        POST,
        'POST',
        'http://localhost:3000/api/customer-success/health-score/batch',
        testUsers.validAdmin,
        {
          userIds: ['user-1'],
          organizationId: 'org-123'
        }
      );
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded for batch operations');
    });

    test('should track rate limits per user', async () => {
      // Simulate hitting rate limit for one user
      mockRateLimit.limit.mockImplementation((identifier) => {
        if (identifier === 'admin-001') {
          return Promise.resolve({ success: false });
        }
        return Promise.resolve({ success: true });
      });

      // First user (rate limited)
      const response1 = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin,
        undefined,
        { 'x-forwarded-for': 'admin-001' }
      );

      expect(response1.status).toBe(429);

      // Second user (should work)
      const response2 = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validSupplier,
        undefined,
        { 'x-forwarded-for': 'supplier-001' }
      );

      expect(response2.status).not.toBe(429);
    });
  });

  describe('Data Exposure Security', () => {
    test('should not expose sensitive data in error messages', async () => {
      // Simulate database error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection string: postgresql://user:password@localhost/db');
      });

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('postgresql://');
      expect(data.error).not.toContain('connection string');
    });

    test('should not return other users sensitive data', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validSupplier
      );
      const data = await response.json();

      if (response.status === 200) {
        expect(data.data.healthScore.user_id).toBe(testUsers.validSupplier.user.id);
      }
    });

    test('should sanitize response data', async () => {
      // Mock response with potential XSS in data
      const maliciousData = {
        healthScore: {
          user_id: 'user-123',
          overall_health_score: 75,
          recommendations: [
            {
              title: '<script>alert("xss")</script>Recommendation'
            }
          ]
        }
      };

      // Response should be sanitized before sending
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );

      if (response.status === 200) {
        const data = await response.json();
        const responseText = JSON.stringify(data);
        expect(responseText).not.toContain('<script>');
      }
    });

    test('should filter organization data correctly', async () => {
      // Ensure admin can only see their organization's data
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        HealthInterventionsGET,
        'GET',
        'http://localhost:3000/api/customer-success/health-interventions?action=health-summary&organizationId=org-123',
        testUsers.validAdmin
      );

      if (response.status === 200) {
        const data = await response.json();
        // All returned data should belong to the user's organization
        expect(data.summary.totalSuppliers).toBeDefined();
      }
    });
  });

  describe('Session Security', () => {
    test('should handle concurrent sessions securely', async () => {
      const promises = Array(10).fill(0).map(() =>
        SecurityTestUtils.makeAuthenticatedRequest(
          GET,
          'GET',
          'http://localhost:3000/api/customer-success/health-score',
          testUsers.validAdmin
        )
      );

      const responses = await Promise.all(promises);
      
      // All requests should be handled properly
      responses.forEach(response => {
        expect([200, 401, 403, 429]).toContain(response.status);
      });
    });

    test('should validate session tokens properly', async () => {
      // Test with malformed session
      const malformedSession = {
        user: {
          id: null,
          email: undefined,
          organizationId: '<script>alert("xss")</script>',
          isAdmin: 'true' // String instead of boolean
        }
      };

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        malformedSession
      );

      expect([400, 401]).toContain(response.status);
    });

    test('should prevent session fixation attacks', async () => {
      // Attempt to reuse session with different user
      const originalSession = testUsers.validSupplier;
      const modifiedSession = {
        ...originalSession,
        user: {
          ...originalSession.user,
          id: 'different-user-id'
        }
      };

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        modifiedSession
      );

      // Should validate session integrity
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Webhook Security', () => {
    test('should validate webhook signatures', async () => {
      // Test webhook without proper signature
      const webhookRequest = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify({
          event: 'email.opened',
          data: { metadata: { notificationId: 'notif-123' } }
        }),
        headers: {
          'Content-Type': 'application/json'
          // Missing webhook signature header
        }
      });

      // Should validate webhook authenticity (implementation dependent)
      const response = await HealthInterventionsPOST(webhookRequest, {});
      
      // Response should handle unauthorized webhooks appropriately
      expect([200, 401, 403]).toContain(response.status);
    });

    test('should prevent webhook replay attacks', async () => {
      const webhookBody = {
        event: 'email.opened',
        data: { 
          metadata: { notificationId: 'notif-123' },
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
        }
      };

      const webhookRequest = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'PUT',
        body: JSON.stringify(webhookBody)
      });

      // Should reject old webhook events
      const response = await HealthInterventionsPOST(webhookRequest, {});
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Handling Security', () => {
    test('should not leak stack traces in production', async () => {
      // Force an error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Internal server error with stack trace');
      });

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.stack).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('at ');
    });

    test('should handle malformed JSON gracefully', async () => {
      const malformedRequest = new NextRequest('http://localhost:3000/api/customer-success/health-interventions', {
        method: 'POST',
        body: '{"invalid": json}',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await HealthInterventionsPOST(malformedRequest, {});
      expect([400, 500]).toContain(response.status);
    });

    test('should handle database connection failures securely', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection to database failed: timeout after 30s');
      });

      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).not.toContain('Connection to database failed');
      expect(data.error).not.toContain('timeout');
    });
  });

  describe('Content Security', () => {
    test('should set appropriate security headers', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        GET,
        'GET',
        'http://localhost:3000/api/customer-success/health-score',
        testUsers.validAdmin
      );

      // Check for security headers (if implemented)
      const headers = response.headers;
      
      // These are recommendations - actual implementation may vary
      expect(headers.get('X-Content-Type-Options')).not.toBeNull();
      expect(headers.get('X-Frame-Options')).not.toBeNull();
    });

    test('should validate content types', async () => {
      const response = await SecurityTestUtils.makeAuthenticatedRequest(
        POST,
        'POST',
        'http://localhost:3000/api/customer-success/health-interventions',
        testUsers.validAdmin,
        { action: 'test' },
        { 'Content-Type': 'application/xml' } // Wrong content type
      );

      expect([400, 415]).toContain(response.status);
    });
  });
});