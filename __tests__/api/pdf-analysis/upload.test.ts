/**
 * PDF Analysis Upload API Tests
 * WS-242: AI PDF Analysis System - Upload Endpoint Testing
 */

import { POST } from '@/app/api/pdf-analysis/upload/route';
import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      remove: jest.fn(),
      getPublicUrl: jest.fn()
    }))
  }
};

(createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);

describe('/api/pdf-analysis/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/pdf-analysis/upload', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };

    const mockOrganization = {
      organization_id: 'org-123'
    };

    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockOrganization,
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { id: 'analysis-123' },
              error: null
            }))
          }))
        }))
      });
    });

    it('should upload PDF file successfully', async () => {
      // Create mock PDF file
      const pdfContent = new Uint8Array([37, 80, 68, 70]); // PDF header bytes
      const mockFile = new File([pdfContent], 'test-form.pdf', {
        type: 'application/pdf'
      });

      // Mock form data
      const formData = new FormData();
      formData.append('file', mockFile);
      formData.append('extractionType', 'client_form');
      formData.append('priority', 'normal');
      formData.append('organizationId', 'org-123');

      // Mock storage upload success
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'org-123/test-form.pdf' },
        error: null
      });

      mockSupabase.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-form.pdf' }
      });

      // Create request
      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result).toEqual({
        success: true,
        job: expect.objectContaining({
          id: expect.any(String),
          fileName: 'test-form.pdf',
          status: 'pending'
        }),
        message: 'PDF uploaded successfully and processing started'
      });

      // Verify storage upload was called
      expect(mockSupabase.storage.from().upload).toHaveBeenCalledWith(
        expect.stringContaining('test-form.pdf'),
        mockFile,
        expect.objectContaining({
          cacheControl: '3600',
          upsert: false
        })
      );
    });

    it('should reject non-PDF files', async () => {
      const textFile = new File(['test content'], 'test.txt', {
        type: 'text/plain'
      });

      const formData = new FormData();
      formData.append('file', textFile);

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('PDF files');
    });

    it('should reject files larger than 10MB', async () => {
      // Create large file (11MB)
      const largeContent = new Uint8Array(11 * 1024 * 1024);
      const largeFile = new File([largeContent], 'large.pdf', {
        type: 'application/pdf'
      });

      const formData = new FormData();
      formData.append('file', largeFile);

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('10MB');
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Authentication required');
    });

    it('should require valid organization access', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'No organization found' }
            }))
          }))
        }))
      });

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(403);
      expect(result.error).toBe('Organization access denied');
    });

    it('should validate required form fields', async () => {
      const formData = new FormData();
      // Missing required fields

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('required');
    });

    it('should handle rate limiting', async () => {
      // This would require implementing rate limiting logic
      // For now, we'll test that the rate limit headers are set

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('extractionType', 'client_form');
      formData.append('organizationId', 'org-123');

      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'test.pdf' },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);

      // Check rate limit headers are present
      expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
      expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
    });

    it('should handle storage upload failures', async () => {
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage full' }
      });

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('extractionType', 'client_form');
      formData.append('organizationId', 'org-123');

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('File upload failed');
    });

    it('should handle database insertion failures', async () => {
      mockSupabase.storage.from().upload.mockResolvedValue({
        data: { path: 'test.pdf' },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockOrganization,
              error: null
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: { message: 'Database error' }
            }))
          }))
        }))
      });

      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('extractionType', 'client_form');
      formData.append('organizationId', 'org-123');

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to create analysis record');

      // Should clean up uploaded file
      expect(mockSupabase.storage.from().remove).toHaveBeenCalled();
    });

    it('should validate extraction type', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('extractionType', 'invalid_type');
      formData.append('organizationId', 'org-123');

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should validate priority levels', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.pdf', { type: 'application/pdf' }));
      formData.append('extractionType', 'client_form');
      formData.append('priority', 'invalid_priority');
      formData.append('organizationId', 'org-123');

      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/pdf-analysis/upload', () => {
    it('should return health check information', async () => {
      const request = new NextRequest('http://localhost:3000/api/pdf-analysis/upload', {
        method: 'GET'
      });

      const { GET } = await import('@/app/api/pdf-analysis/upload/route');
      const response = await GET(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        service: 'PDF Analysis Upload',
        status: 'healthy',
        timestamp: expect.any(String),
        limits: {
          maxFileSize: '10MB',
          allowedTypes: ['application/pdf'],
          rateLimit: '100 requests per hour'
        }
      });
    });
  });
});