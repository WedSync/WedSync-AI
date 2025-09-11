/**
 * WS-223 Content Management System API Tests
 * Team B - Comprehensive tests for main content CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET, POST, PUT, DELETE } from '@/app/api/content/route';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((content) => content), // Simple pass-through for tests
}));

describe('/api/content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/content', () => {
    it('should fetch content with pagination', async () => {
      const mockContent = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Article',
          content_type: 'article',
          status: 'published',
          organization_id: 'org-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockContent,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock count query
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 1,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content?organization_id=org-123&page=1&limit=20',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toHaveLength(1);
      expect(data.data.pagination.page).toBe(1);
    });

    it('should apply search filters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest(
        'http://localhost/api/content?organization_id=org-123&search=wedding&content_type=article',
      );
      await GET(request);

      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('should return 400 without organization_id', async () => {
      const request = new NextRequest('http://localhost/api/content');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Organization ID is required');
    });
  });

  describe('POST /api/content', () => {
    it('should create new content successfully', async () => {
      const mockContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'New Article',
        content_type: 'article',
        rich_content: '<p>Test content</p>',
        organization_id: 'org-123',
        status: 'draft',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock version creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({
          error: null,
        }),
      });

      const requestBody = {
        title: 'New Article',
        content_type: 'article',
        rich_content: '<p>Test content</p>',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content.title).toBe('New Article');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        // Missing title
        content_type: 'article',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should sanitize rich content', async () => {
      const DOMPurify = require('isomorphic-dompurify');
      DOMPurify.sanitize.mockImplementation((content) =>
        content.replace(/<script[^>]*>.*?<\/script>/gi, ''),
      );

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: '123', title: 'Test' },
              error: null,
            }),
          }),
        }),
      });

      const requestBody = {
        title: 'Test Article',
        content_type: 'article',
        rich_content: '<p>Safe content</p><script>alert("xss")</script>',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(DOMPurify.sanitize).toHaveBeenCalledWith(requestBody.rich_content);
    });
  });

  describe('PUT /api/content', () => {
    it('should update existing content', async () => {
      const mockCurrentContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: 'org-123',
        version: 1,
        title: 'Original Title',
        rich_content: '<p>Original content</p>',
      };

      const mockUpdatedContent = {
        ...mockCurrentContent,
        title: 'Updated Title',
        version: 2,
      };

      // Mock fetch current content
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedContent,
                error: null,
              }),
            }),
          }),
        }),
      });

      const requestBody = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content.title).toBe('Updated Title');
    });

    it('should return 404 for non-existent content', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const requestBody = {
        id: 'non-existent-id',
        title: 'Updated Title',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(404);
    });

    it('should prevent unauthorized updates', async () => {
      const mockCurrentContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: 'different-org',
        version: 1,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCurrentContent,
              error: null,
            }),
          }),
        }),
      });

      const requestBody = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Title',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(request);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/content', () => {
    it('should soft delete content', async () => {
      const mockContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: 'org-123',
      };

      // Mock ownership check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      // Mock soft delete
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content?id=123e4567-e89b-12d3-a456-426614174000&organization_id=org-123',
      );
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Content deleted successfully');
    });

    it('should return 400 without required parameters', async () => {
      const request = new NextRequest('http://localhost/api/content');
      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });

    it('should prevent unauthorized deletion', async () => {
      const mockContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: 'different-org',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content?id=123e4567-e89b-12d3-a456-426614174000&organization_id=org-123',
      );
      const response = await DELETE(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' },
              }),
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content?organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch content');
    });

    it('should handle malformed JSON in POST', async () => {
      const request = new NextRequest('http://localhost/api/content', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Content metadata extraction', () => {
    it('should extract word count and reading time', async () => {
      const mockContent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Article',
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      });

      const longContent = 'word '.repeat(200); // 200 words
      const requestBody = {
        title: 'Test Article',
        content_type: 'article',
        plain_content: longContent,
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      // Verify that metadata was calculated
      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.metadata.word_count).toBe(200);
      expect(insertCall.metadata.reading_time_minutes).toBe(1); // 200 words / 200 wpm = 1 minute
    });
  });
});
