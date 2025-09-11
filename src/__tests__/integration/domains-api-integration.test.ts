/**
 * Domains API Integration Tests (WS-222)
 * Tests the complete integration between domain API routes and UI components
 */

import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/domains/route';
import { Domain, DomainTableRow, CreateDomainRequest } from '@/types/domains';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    insert: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
  })),
};

// Mock Supabase auth helpers
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabaseClient,
}));

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({})),
}));

// Mock domain validation
jest.mock('@/lib/domains/validation', () => ({
  validateDomainForm: jest.fn(() => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),
}));

describe('Domains API Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
  };

  const mockProfile = {
    organization_id: 'org-123',
    role: 'owner',
  };

  const mockDomain: Domain = {
    id: 'domain-123',
    organization_id: 'org-123',
    domain_name: 'example.com',
    subdomain: 'photos',
    full_domain: 'photos.example.com',
    status: 'active',
    is_primary: true,
    is_wildcard: false,
    target_cname: 'wedsync.com',
    notes: 'Test domain',
    configuration: {},
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
    created_by: 'user-123',
    verified_at: '2025-01-01T10:30:00Z',
    last_checked_at: '2025-01-01T15:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Setup default profile response
    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });
  });

  describe('GET /api/domains', () => {
    it('successfully fetches domains with metrics', async () => {
      const mockDomainsData = [
        {
          ...mockDomain,
          dns_records: [{ count: 3 }],
          ssl_certificates: [
            { status: 'active', expires_at: '2025-12-01T00:00:00Z' },
          ],
          domain_alerts: [
            { id: 'alert-1', is_resolved: false, severity: 'warning' },
          ],
          domain_health_checks: [
            {
              status: 'healthy',
              response_time_ms: 120,
              checked_at: '2025-01-01T15:00:00Z',
            },
          ],
        },
      ];

      // Mock domains query
      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: mockDomainsData,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains).toHaveLength(1);
      expect(data.metrics).toEqual({
        total_domains: 1,
        verified_domains: 0,
        active_domains: 1,
        pending_verifications: 0,
        expiring_certificates: 0,
        critical_alerts: 1,
        average_response_time: 120,
      });
      expect(data.domains[0]).toMatchObject({
        id: 'domain-123',
        domain_name: 'example.com',
        health_status: 'healthy',
        unresolved_alerts_count: 1,
        response_time_ms: 120,
      });
    });

    it('applies search filters correctly', async () => {
      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest(
        'http://localhost:3000/api/domains?search=example&status=active,verified',
      );
      const response = await GET(request);

      expect(mockDomainsQuery.in).toHaveBeenCalledWith('status', [
        'active',
        'verified',
      ]);
      expect(mockDomainsQuery.or).toHaveBeenCalledWith(
        expect.stringContaining('domain_name.ilike.%example%'),
      );
    });

    it('applies pagination correctly', async () => {
      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 50,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest(
        'http://localhost:3000/api/domains?page=2&per_page=20',
      );
      await GET(request);

      expect(mockDomainsQuery.range).toHaveBeenCalledWith(20, 39); // page 2, 20 items per page
    });

    it('applies sorting correctly', async () => {
      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest(
        'http://localhost:3000/api/domains?sort=domain_name:asc',
      );
      await GET(request);

      expect(mockDomainsQuery.order).toHaveBeenCalledWith('domain_name', {
        ascending: true,
      });
    });

    it('returns 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('returns 404 when organization not found', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Organization not found');
    });

    it('handles database errors gracefully', async () => {
      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
          count: 0,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch domains');
    });

    it('calculates SSL expiry days correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

      const mockDomainsData = [
        {
          ...mockDomain,
          dns_records: [],
          ssl_certificates: [
            { status: 'active', expires_at: futureDate.toISOString() },
          ],
          domain_alerts: [],
          domain_health_checks: [],
        },
      ];

      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: mockDomainsData,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(data.domains[0].days_until_ssl_expiry).toBe(15);
      expect(data.metrics.expiring_certificates).toBe(1); // Should count as expiring (< 30 days)
    });
  });

  describe('POST /api/domains', () => {
    const mockCreateRequest: CreateDomainRequest = {
      domain_name: 'newdomain.com',
      subdomain: 'www',
      is_primary: false,
      target_cname: 'wedsync.com',
      notes: 'New test domain',
    };

    it('successfully creates a new domain', async () => {
      const createdDomain = {
        ...mockDomain,
        ...mockCreateRequest,
        id: 'new-domain-123',
      };

      // Mock domain creation
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdDomain,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValueOnce(mockInsertQuery); // For domain creation
      mockSupabaseClient.from.mockReturnValueOnce(mockInsertQuery); // For DNS records
      mockSupabaseClient.from.mockReturnValueOnce(mockInsertQuery); // For verification

      const { req } = createMocks({
        method: 'POST',
        body: mockCreateRequest,
      });

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(mockCreateRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject(createdDomain);
    });

    it('validates domain form data', async () => {
      const { validateDomainForm } = require('@/lib/domains/validation');
      validateDomainForm.mockReturnValue({
        isValid: false,
        errors: ['Domain name is required'],
        warnings: [],
      });

      const invalidRequest = { ...mockCreateRequest, domain_name: '' };

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(invalidRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Domain name is required');
    });

    it('prevents creating multiple primary domains', async () => {
      // Mock existing primary domain
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: { id: 'existing-primary' },
        error: null,
      });

      const primaryRequest = { ...mockCreateRequest, is_primary: true };

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(primaryRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Organization already has a primary domain');
    });

    it('requires admin permissions', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: { ...mockProfile, role: 'user' }, // Non-admin role
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(mockCreateRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('creates DNS records for CNAME setup', async () => {
      const createdDomain = { ...mockDomain, id: 'new-domain-123' };

      const mockDomainInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdDomain,
          error: null,
        }),
      };

      const mockDnsInsert = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const mockVerificationInsert = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockDomainInsert) // Domain creation
        .mockReturnValueOnce(mockDnsInsert) // DNS records
        .mockReturnValueOnce(mockVerificationInsert); // Verification

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(mockCreateRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockDnsInsert.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          domain_id: 'new-domain-123',
          record_type: 'CNAME',
          name: 'www',
          value: 'wedsync.com',
          ttl: 3600,
        }),
      ]);
    });

    it('creates A records for IP setup', async () => {
      const ipRequest = {
        ...mockCreateRequest,
        subdomain: undefined, // Root domain
        target_cname: undefined,
        custom_ip_address: '192.168.1.1',
      };

      const createdDomain = { ...mockDomain, id: 'new-domain-123' };

      const mockDomainInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdDomain,
          error: null,
        }),
      };

      const mockDnsInsert = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const mockVerificationInsert = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockDomainInsert)
        .mockReturnValueOnce(mockDnsInsert)
        .mockReturnValueOnce(mockVerificationInsert);

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(ipRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockDnsInsert.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          domain_id: 'new-domain-123',
          record_type: 'A',
          name: '@',
          value: '192.168.1.1',
        }),
      ]);
    });

    it('starts domain verification process', async () => {
      const createdDomain = { ...mockDomain, id: 'new-domain-123' };

      const mockDomainInsert = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdDomain,
          error: null,
        }),
      };

      const mockVerificationInsert = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabaseClient.from
        .mockReturnValueOnce(mockDomainInsert)
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }) // DNS
        .mockReturnValueOnce(mockVerificationInsert);

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(mockCreateRequest),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockVerificationInsert.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          domain_id: 'new-domain-123',
          verification_method: 'dns_txt',
          verification_token: expect.any(String),
          created_by: 'user-123',
        }),
      );
    });

    it('handles database errors during creation', async () => {
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertQuery);

      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: JSON.stringify(mockCreateRequest),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create domain');
    });
  });

  describe('API Error Handling', () => {
    it('handles malformed JSON in POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/domains', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('handles unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Business Logic Integration', () => {
    it('correctly identifies expiring SSL certificates', async () => {
      const nearExpiryDate = new Date();
      nearExpiryDate.setDate(nearExpiryDate.getDate() + 20); // 20 days from now

      const farExpiryDate = new Date();
      farExpiryDate.setDate(farExpiryDate.getDate() + 60); // 60 days from now

      const mockDomainsData = [
        {
          ...mockDomain,
          id: 'domain-1',
          dns_records: [],
          ssl_certificates: [
            { status: 'active', expires_at: nearExpiryDate.toISOString() },
          ],
          domain_alerts: [],
          domain_health_checks: [],
        },
        {
          ...mockDomain,
          id: 'domain-2',
          dns_records: [],
          ssl_certificates: [
            { status: 'active', expires_at: farExpiryDate.toISOString() },
          ],
          domain_alerts: [],
          domain_health_checks: [],
        },
      ];

      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: mockDomainsData,
          error: null,
          count: 2,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.expiring_certificates).toBe(1); // Only one expires within 30 days
      expect(data.domains[0].days_until_ssl_expiry).toBe(20);
      expect(data.domains[1].days_until_ssl_expiry).toBe(60);
    });

    it('correctly counts unresolved alerts', async () => {
      const mockDomainsData = [
        {
          ...mockDomain,
          dns_records: [],
          ssl_certificates: [],
          domain_alerts: [
            { id: 'alert-1', is_resolved: false, severity: 'error' },
            { id: 'alert-2', is_resolved: true, severity: 'warning' },
            { id: 'alert-3', is_resolved: false, severity: 'info' },
          ],
          domain_health_checks: [],
        },
      ];

      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: mockDomainsData,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(data.domains[0].unresolved_alerts_count).toBe(2); // Two unresolved alerts
      expect(data.metrics.critical_alerts).toBe(2);
    });

    it('gets latest health check data', async () => {
      const oldCheck = {
        status: 'unhealthy',
        response_time_ms: 5000,
        checked_at: '2025-01-01T10:00:00Z',
      };

      const newCheck = {
        status: 'healthy',
        response_time_ms: 120,
        checked_at: '2025-01-01T15:00:00Z',
      };

      const mockDomainsData = [
        {
          ...mockDomain,
          dns_records: [],
          ssl_certificates: [],
          domain_alerts: [],
          domain_health_checks: [oldCheck, newCheck], // Unsorted
        },
      ];

      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: mockDomainsData,
          error: null,
          count: 1,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const request = new NextRequest('http://localhost:3000/api/domains');
      const response = await GET(request);
      const data = await response.json();

      expect(data.domains[0].health_status).toBe('healthy'); // Should use latest check
      expect(data.domains[0].response_time_ms).toBe(120);
    });
  });

  describe('Performance Integration', () => {
    it('handles large result sets efficiently', async () => {
      // Create mock data for 1000 domains
      const largeDomainSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDomain,
        id: `domain-${i}`,
        domain_name: `domain${i}.com`,
        dns_records: [],
        ssl_certificates: [],
        domain_alerts: [],
        domain_health_checks: [],
      }));

      const mockDomainsQuery = {
        ...mockSupabaseClient.from(),
        range: jest.fn().mockResolvedValue({
          data: largeDomainSet,
          error: null,
          count: 1000,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockDomainsQuery);

      const startTime = Date.now();

      const request = new NextRequest(
        'http://localhost:3000/api/domains?per_page=1000',
      );
      const response = await GET(request);
      const data = await response.json();

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(data.domains).toHaveLength(1000);
      expect(processingTime).toBeLessThan(2000); // Should process within 2 seconds
    });
  });
});
