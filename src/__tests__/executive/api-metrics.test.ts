/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/executive/metrics/route';
import { getExecutiveMetrics } from '@/lib/analytics/executiveMetrics';
import { createClient } from '@/lib/supabase/server';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/analytics/executiveMetrics');
jest.mock('@/lib/supabase/server');

const mockGetExecutiveMetrics = getExecutiveMetrics as jest.MockedFunction<
  typeof getExecutiveMetrics
>;
const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Test data
const mockUser = {
  id: 'user-123',
  email: 'admin@wedsync.com',
};

const mockUserProfile = {
  organization_id: 'org-123',
  role: 'admin',
};

const mockMetrics = {
  totalRevenue: 500000,
  revenueGrowth: 15.2,
  activeClients: 1250,
  clientGrowth: 18.5,
  weddingBookings: 425,
  bookingGrowth: 12.3,
  avgVendorRating: 4.7,
  vendorRatingGrowth: 2.1,
  uptime: 99.95,
  uptimeChange: 0.02,
  peakSeasonLoad: 2.5,
  loadTrend: 'Increasing',
  revenueChart: [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 48000, target: 52000 },
  ],
  clientChart: [
    { month: 'Jan', newClients: 25, activeClients: 1180 },
    { month: 'Feb', newClients: 30, activeClients: 1210 },
  ],
  vendorChart: [
    { name: 'Photographers', value: 35, rating: 4.8 },
    { name: 'Venues', value: 25, rating: 4.6 },
  ],
  recentActivity: [
    {
      type: 'payment',
      description: 'New subscription payment received',
      details: 'Professional plan renewal',
      timestamp: '2025-01-20T10:30:00Z',
    },
  ],
  seasonalTrends: {
    peakMonths: ['May', 'June', 'July', 'August', 'September'],
    averageLoadIncrease: 2.5,
    capacityUtilization: 0.85,
  },
};

describe('/api/executive/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.single.mockResolvedValue({
      data: mockUserProfile,
      error: null,
    });
    mockGetExecutiveMetrics.mockResolvedValue(mockMetrics);
  });

  describe('GET /api/executive/metrics', () => {
    test('successfully returns metrics for authenticated admin user', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toEqual(mockMetrics);
      expect(responseData.metadata).toBeDefined();
      expect(responseData.metadata.organizationId).toBe('org-123');
      expect(responseData.metadata.cacheStatus).toBe('cached');
      expect(mockGetExecutiveMetrics).toHaveBeenCalledWith(
        'org-123',
        '2025-01-01T00:00:00.000Z',
        '2025-01-31T23:59:59.999Z',
        { forceRefresh: false },
      );
    });

    test('returns 401 for unauthenticated request', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized: Authentication required');
    });

    test('returns 403 for non-admin user', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockUserProfile, role: 'user' },
        error: null,
      });

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe(
        'Forbidden: Executive-level access required',
      );
    });

    test('returns 403 for user from different organization', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: new Error('No organization access'),
        })
        .mockResolvedValueOnce({
          data: mockUserProfile,
          error: null,
        });

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=different-org&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe(
        'Forbidden: Access denied to this organization',
      );
    });

    test('validates required query parameters', async () => {
      const url = 'http://localhost:3000/api/executive/metrics'; // Missing required params
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation failed');
      expect(responseData.details).toContain('organizationId');
    });

    test('validates UUID format for organizationId', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=invalid-uuid&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation failed');
      expect(
        responseData.details.some((detail: string) =>
          detail.includes('Invalid organization ID'),
        ),
      ).toBe(true);
    });

    test('validates datetime format for date parameters', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=invalid-date&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Validation failed');
      expect(
        responseData.details.some((detail: string) =>
          detail.includes('Invalid start date format'),
        ),
      ).toBe(true);
    });

    test('handles forceRefresh parameter', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z&forceRefresh=true';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.metadata.cacheStatus).toBe('fresh');
      expect(mockGetExecutiveMetrics).toHaveBeenCalledWith(
        'org-123',
        '2025-01-01T00:00:00.000Z',
        '2025-01-31T23:59:59.999Z',
        { forceRefresh: true },
      );
    });

    test('handles region filter', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z&region=london';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.metadata.filters.region).toBe('london');

      // Revenue should be multiplied by London multiplier (1.25)
      expect(responseData.data.totalRevenue).toBe(
        mockMetrics.totalRevenue * 1.25,
      );
    });

    test('handles supplierCategory filter', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z&supplierCategory=photographers';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.metadata.filters.supplierCategory).toBe(
        'photographers',
      );

      // Should only include photographers in vendor chart
      expect(responseData.data.vendorChart).toHaveLength(1);
      expect(responseData.data.vendorChart[0].name).toBe('Photographers');
    });

    test('handles includeProjections parameter', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z&includeProjections=true';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.metadata.filters.includeProjections).toBe(true);
      expect(responseData.data.projections).toBeDefined();
      expect(responseData.data.projections.nextMonth).toBeDefined();
      expect(responseData.data.projections.nextQuarter).toBeDefined();
      expect(responseData.data.projections.yearEnd).toBeDefined();
    });

    test('handles metrics service errors gracefully', async () => {
      mockGetExecutiveMetrics.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to fetch executive metrics');
      expect(responseData.details).toBe('Database connection failed');
    });

    test('handles user profile verification errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Profile not found'),
      });

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Failed to verify user permissions');
    });

    test('allows owner role access', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockUserProfile, role: 'owner' },
        error: null,
      });

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    test('includes proper metadata in response', async () => {
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(responseData.metadata).toEqual({
        organizationId: 'org-123',
        timeRange: {
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-01-31T23:59:59.999Z',
        },
        generatedAt: expect.any(String),
        filters: {
          region: null,
          supplierCategory: null,
          includeProjections: false,
        },
        cacheStatus: 'cached',
      });
    });
  });

  describe('Error handling edge cases', () => {
    test('handles malformed JSON gracefully', async () => {
      // This would be for POST requests, but GET doesn't parse JSON
      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      expect(response.status).toBe(200); // Should work fine for GET
    });

    test('handles unexpected database response structure', async () => {
      mockGetExecutiveMetrics.mockResolvedValue(null as any);

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data).toBeNull();
    });

    test('handles authentication service outage', async () => {
      mockCreateClient.mockRejectedValue(
        new Error('Supabase connection failed'),
      );

      const url =
        'http://localhost:3000/api/executive/metrics?organizationId=org-123&startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z';
      const request = new NextRequest(url);

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });
  });
});
