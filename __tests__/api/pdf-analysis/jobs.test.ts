/**
 * PDF Analysis Jobs API Tests
 * WS-242: AI PDF Analysis System - Jobs Management Testing
 */

import { GET, POST, PATCH } from '@/app/api/pdf-analysis/jobs/route';
import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

// Mock repository
jest.mock('@/lib/repositories/pdfAnalysisRepository');

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
};

const mockRepository = {
  getJobs: jest.fn(),
  getJobsWithDetails: jest.fn(),
  getJobsSummary: jest.fn(),
  bulkDeleteJobs: jest.fn(),
  bulkRetryJobs: jest.fn(),
  bulkUpdateJobsPriority: jest.fn(),
  bulkUpdateJobs: jest.fn()
};

(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock the repository import
jest.mock('@/lib/repositories/pdfAnalysisRepository', () => ({
  createPDFAnalysisRepository: () => mockRepository
}));

describe('/api/pdf-analysis/jobs', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockOrganizations = [
    { organization_id: 'org-123', organization: { id: 'org-123', name: 'Test Org' } },
    { organization_id: 'org-456', organization: { id: 'org-456', name: 'Another Org' } }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: mockOrganizations,
          error: null
        })),
        single: jest.fn(() => ({
          data: { role: 'admin' },
          error: null
        }))
      }))
    });
  });

  describe('GET /api/pdf-analysis/jobs', () => {
    const mockJobs = {
      jobs: [
        {
          id: 'job-1',
          file_name: 'wedding-form-1.pdf',
          status: 'completed',
          extraction_type: 'client_form',
          priority: 'normal',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'job-2', 
          file_name: 'contract-2.pdf',
          status: 'processing',
          extraction_type: 'contract',
          priority: 'high',
          created_at: '2024-01-02T00:00:00Z'
        }
      ],
      page: 1,
      total: 25,
      totalPages: 2
    };

    const mockSummary = {
      totalJobs: 25,
      pendingJobs: 3,
      processingJobs: 2,
      completedJobs: 18,
      failedJobs: 2,
      successRate: 0.9,
      averageProcessingTime: 145,
      totalCost: 2850
    };

    beforeEach(() => {
      mockRepository.getJobs.mockResolvedValue(mockJobs);
      mockRepository.getJobsSummary.mockResolvedValue(mockSummary);
    });

    it('should return paginated jobs list', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?page=1&limit=20');
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        success: true,
        data: {
          jobs: expect.arrayContaining([
            expect.objectContaining({
              id: 'job-1',
              file_name: 'wedding-form-1.pdf'
            })
          ]),
          pagination: {
            page: 1,
            limit: 20,
            total: 25,
            totalPages: 2,
            hasNext: true,
            hasPrevious: false
          },
          summary: expect.objectContaining({
            totalJobs: 25,
            successRate: 0.9
          }),
          meta: expect.objectContaining({
            includeFields: false,
            sortBy: 'created_at'
          })
        }
      });
    });

    it('should support filtering by status', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?status=completed,processing');
      const request = new NextRequest(url);

      await GET(request);

      expect(mockRepository.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['completed', 'processing']
        }),
        1,
        20
      );
    });

    it('should support filtering by extraction type', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?extractionType=client_form');
      const request = new NextRequest(url);

      await GET(request);

      expect(mockRepository.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          extractionType: ['client_form']
        }),
        1,
        20
      );
    });

    it('should support date range filtering', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z');
      const request = new NextRequest(url);

      await GET(request);

      expect(mockRepository.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-01-31T23:59:59Z'
        }),
        1,
        20
      );
    });

    it('should support search functionality', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?search=wedding');
      const request = new NextRequest(url);

      await GET(request);

      expect(mockRepository.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'wedding'
        }),
        1,
        20
      );
    });

    it('should use detailed query when additional data requested', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?includeFields=true&includeCosts=true');
      const request = new NextRequest(url);

      mockRepository.getJobsWithDetails.mockResolvedValue(mockJobs);

      await GET(request);

      expect(mockRepository.getJobsWithDetails).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        expect.objectContaining({
          includeFields: true,
          includeCosts: true,
          includeProgress: false
        })
      );
    });

    it('should validate query parameters', async () => {
      const url = new URL('http://localhost:3000/api/pdf-analysis/jobs?page=0&limit=150');
      const request = new NextRequest(url);

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe('INVALID_PARAMS');
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs');

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    it('should require organization access', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: [],
            error: null
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs');

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe('No organization access');
    });
  });

  describe('POST /api/pdf-analysis/jobs', () => {
    const mockOrgMember = {
      role: 'admin'
    };

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockOrgMember,
              error: null
            }))
          }))
        }))
      });
    });

    it('should bulk delete jobs', async () => {
      const requestBody = {
        action: 'bulk_delete',
        jobIds: ['job-1', 'job-2', 'job-3'],
        organizationId: 'org-123'
      };

      mockRepository.bulkDeleteJobs.mockResolvedValue(3);

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        success: true,
        message: '3 jobs deleted',
        deletedCount: 3
      });

      expect(mockRepository.bulkDeleteJobs).toHaveBeenCalledWith(
        ['job-1', 'job-2', 'job-3'],
        'org-123'
      );
    });

    it('should bulk retry failed jobs', async () => {
      const requestBody = {
        action: 'bulk_retry',
        jobIds: ['job-1', 'job-2'],
        organizationId: 'org-123'
      };

      const retriedJobs = [
        { id: 'job-1', status: 'pending' },
        { id: 'job-2', status: 'pending' }
      ];

      mockRepository.bulkRetryJobs.mockResolvedValue(retriedJobs);

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        success: true,
        message: '2 jobs queued for retry',
        retriedJobs
      });
    });

    it('should bulk update job priorities', async () => {
      const requestBody = {
        action: 'bulk_priority_update',
        jobIds: ['job-1', 'job-2'],
        organizationId: 'org-123',
        data: { priority: 'high' }
      };

      const updatedJobs = [
        { id: 'job-1', priority: 'high' },
        { id: 'job-2', priority: 'high' }
      ];

      mockRepository.bulkUpdateJobsPriority.mockResolvedValue(updatedJobs);

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        success: true,
        message: '2 jobs priority updated',
        updatedJobs
      });
    });

    it('should validate required fields for bulk operations', async () => {
      const requestBody = {
        action: 'bulk_delete',
        // Missing jobIds
        organizationId: 'org-123'
      };

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('Job IDs required');
    });

    it('should validate organization access for bulk operations', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Access denied' }
            }))
          }))
        }))
      });

      const requestBody = {
        action: 'bulk_delete',
        jobIds: ['job-1'],
        organizationId: 'org-123'
      };

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe('Organization access denied');
    });

    it('should reject invalid actions', async () => {
      const requestBody = {
        action: 'invalid_action',
        jobIds: ['job-1'],
        organizationId: 'org-123'
      };

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Invalid action');
    });
  });

  describe('PATCH /api/pdf-analysis/jobs', () => {
    it('should bulk update job metadata', async () => {
      const requestBody = {
        jobIds: ['job-1', 'job-2'],
        organizationId: 'org-123',
        updates: {
          priority: 'high',
          metadata: { updated: true }
        }
      };

      const updatedJobs = [
        { id: 'job-1', priority: 'high' },
        { id: 'job-2', priority: 'high' }
      ];

      mockRepository.bulkUpdateJobs.mockResolvedValue(updatedJobs);

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { role: 'admin' },
              error: null
            }))
          }))
        }))
      });

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PATCH(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        success: true,
        message: '2 jobs updated',
        updatedJobs
      });

      expect(mockRepository.bulkUpdateJobs).toHaveBeenCalledWith(
        ['job-1', 'job-2'],
        'org-123',
        requestBody.updates
      );
    });

    it('should validate required fields for bulk updates', async () => {
      const requestBody = {
        // Missing jobIds
        organizationId: 'org-123',
        updates: { priority: 'high' }
      };

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PATCH(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe('Job IDs required');
    });

    it('should require authentication for bulk updates', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const requestBody = {
        jobIds: ['job-1'],
        organizationId: 'org-123',
        updates: { priority: 'high' }
      };

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await PATCH(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.getJobs.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs');

      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to fetch jobs');
      expect(result.code).toBe('FETCH_ERROR');
    });

    it('should include detailed error messages in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockRepository.getJobs.mockRejectedValue(new Error('Specific database error'));

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/jobs');

      const response = await GET(request);
      const result = await response.json();

      expect(result.message).toBe('Specific database error');

      process.env.NODE_ENV = originalEnv;
    });
  });
});