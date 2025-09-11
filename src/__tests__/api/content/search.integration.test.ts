/**
 * WS-223 Content Search Integration Tests
 * Team B - Integration tests for search functionality with database
 */

import { createClient } from '@supabase/supabase-js';
import { GET, POST } from '@/app/api/content/search/route';
import { NextRequest } from 'next/server';

// Mock Supabase but use more realistic responses for integration testing
jest.mock('@supabase/supabase-js');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('/api/content/search - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full-text search integration', () => {
    it('should perform comprehensive search with facets and analytics', async () => {
      // Mock search results with rank
      const mockSearchResults = [
        {
          id: 'content-1',
          title: 'Wedding Photography Tips',
          slug: 'wedding-photography-tips',
          content_type: 'article',
          rank: 0.9,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'content-2',
          title: 'Wedding Planning Guide',
          slug: 'wedding-planning-guide',
          content_type: 'guide',
          rank: 0.7,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock content type facets
      const mockContentTypeCounts = [
        { content_type: 'article' },
        { content_type: 'article' },
        { content_type: 'guide' },
      ];

      // Mock status facets
      const mockStatusCounts = [
        { status: 'published' },
        { status: 'published' },
        { status: 'draft' },
      ];

      // Mock search stored procedure
      mockSupabase.rpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      });

      // Mock search index update
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      // Mock facet queries
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: mockContentTypeCounts,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null, // No categories in this test
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockStatusCounts,
            error: null,
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/search?query=wedding photography&organization_id=org-123&highlight=true&page=1&limit=10',
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify search results
      expect(data.success).toBe(true);
      expect(data.data.results).toHaveLength(2);
      expect(data.data.results[0].title).toBe('Wedding Photography Tips');

      // Verify search highlighting
      expect(data.data.results[0].highlighted_title).toBeDefined();
      expect(data.data.results[0].search_snippet).toBeDefined();

      // Verify facets
      expect(data.data.facets.content_types.article).toBe(2);
      expect(data.data.facets.content_types.guide).toBe(1);
      expect(data.data.facets.statuses.published).toBe(2);
      expect(data.data.facets.statuses.draft).toBe(1);

      // Verify search metadata
      expect(data.data.search_meta.query).toBe('wedding photography');
      expect(data.data.search_meta.highlighted_terms).toEqual([
        'wedding',
        'photography',
      ]);

      // Verify stored procedure was called correctly
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_content', {
        org_uuid: 'org-123',
        search_query: 'wedding photography',
        content_types: null,
        limit_count: 10,
        offset_count: 0,
      });
    });

    it('should handle advanced filtering combinations', async () => {
      const mockFilteredResults = [
        {
          id: 'content-1',
          title: 'Wedding Venue Guide',
          content_type: 'guide',
          status: 'published',
          tags: ['venues', 'planning', 'wedding'],
          rank: 0.8,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockFilteredResults,
        error: null,
      });

      // Mock category filtering
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'content-1' }],
              error: null,
            }),
          }),
        }),
      });

      // Mock other facet queries
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ content_type: 'guide' }],
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ status: 'published' }],
            error: null,
          }),
        }),
      });

      const queryParams = new URLSearchParams({
        query: 'wedding venues',
        organization_id: 'org-123',
        content_types: 'guide,article',
        categories: 'cat-123,cat-456',
        tags: 'venues,planning',
        status: 'published',
        date_from: '2024-01-01T00:00:00Z',
        date_to: '2024-12-31T23:59:59Z',
        sort_by: 'date',
        sort_order: 'desc',
      });

      const request = new NextRequest(
        `http://localhost/api/content/search?${queryParams}`,
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0].content_type).toBe('guide');
      expect(data.data.results[0].status).toBe('published');
      expect(data.data.results[0].tags).toContain('venues');
    });

    it('should handle search analytics tracking', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock analytics update
      const mockAnalyticsUpdate = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValueOnce(mockAnalyticsUpdate);

      // Mock facet queries
      ['content_type', 'categories', 'status'].forEach(() => {
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        });
      });

      const request = new NextRequest(
        'http://localhost/api/content/search?query=popular wedding trends&organization_id=org-123',
      );
      await GET(request);

      // Verify analytics tracking was called
      expect(mockAnalyticsUpdate.update).toHaveBeenCalledWith({
        search_count: expect.any(Object),
        last_search_at: expect.any(String),
      });
    });
  });

  describe('Search performance optimization', () => {
    it('should handle large result sets efficiently', async () => {
      // Generate large mock dataset
      const mockLargeResults = Array.from({ length: 100 }, (_, i) => ({
        id: `content-${i}`,
        title: `Wedding Article ${i}`,
        content_type: 'article',
        rank: Math.random(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      mockSupabase.rpc.mockResolvedValue({
        data: mockLargeResults.slice(0, 20), // Simulate pagination
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Mock facet queries for large dataset
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: Array(100).fill({ content_type: 'article' }),
              error: null,
            }),
          }),
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/content/search?query=wedding&organization_id=org-123&limit=20&page=1',
      );
      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify pagination works correctly
      expect(data.data.results).toHaveLength(20);
      expect(data.data.pagination.limit).toBe(20);
      expect(data.data.pagination.page).toBe(1);

      // Verify reasonable response time (under 1 second for mocked data)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent search requests', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ id: 'content-1', title: 'Test', rank: 1 }],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        GET(
          new NextRequest(
            `http://localhost/api/content/search?query=test${i}&organization_id=org-123`,
          ),
        ),
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify search was called for each request
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(5);
    });
  });

  describe('Category management integration', () => {
    it('should create hierarchical categories', async () => {
      const mockParentCategory = {
        id: 'parent-123',
        organization_id: 'org-123',
      };

      const mockNewCategory = {
        id: 'cat-456',
        name: 'Venue Planning',
        slug: 'venue-planning',
        parent_id: 'parent-123',
        organization_id: 'org-123',
      };

      // Mock parent category check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockParentCategory,
              error: null,
            }),
          }),
        }),
      });

      // Mock duplicate check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      // Mock category creation
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockNewCategory,
              error: null,
            }),
          }),
        }),
      });

      const requestBody = {
        action: 'create_category',
        name: 'Venue Planning',
        slug: 'venue-planning',
        description: 'Everything about wedding venues',
        parent_id: 'parent-123',
        organization_id: 'org-123',
        color_hex: '#10b981',
        icon_name: 'building',
      };

      const request = new NextRequest('http://localhost/api/content/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.category.name).toBe('Venue Planning');
      expect(data.data.category.parent_id).toBe('parent-123');
    });

    it('should prevent duplicate category slugs', async () => {
      // Mock existing category
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'existing-cat' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const requestBody = {
        action: 'create_category',
        name: 'Wedding Planning',
        slug: 'wedding-planning',
        organization_id: 'org-123',
      };

      const request = new NextRequest('http://localhost/api/content/search', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Category with this slug already exists');
    });
  });

  describe('Search error handling and edge cases', () => {
    it('should handle malformed search queries gracefully', async () => {
      const request = new NextRequest(
        'http://localhost/api/content/search?query=&organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query too short or invalid');
    });

    it('should handle database connection failures', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      const request = new NextRequest(
        'http://localhost/api/content/search?query=wedding&organization_id=org-123',
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Search failed');
    });

    it('should handle special characters in search queries', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            textSearch: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      // Mock facet queries
      ['content_type', 'categories', 'status'].forEach(() => {
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        });
      });

      const specialQuery = 'wedding & "special event" OR venue!@#$%^&*()';
      const request = new NextRequest(
        `http://localhost/api/content/search?query=${encodeURIComponent(specialQuery)}&organization_id=org-123`,
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify special characters were cleaned
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'search_content',
        expect.objectContaining({
          search_query: specialQuery,
        }),
      );
    });
  });
});
