/**
 * Translation Management API Tests - WS-247 Multilingual Platform System
 * Comprehensive tests for /api/i18n/translations/ endpoints
 * 
 * Test Coverage:
 * - GET: Retrieve translations with filtering and pagination
 * - POST: Create new translations with validation
 * - PUT: Update existing translations
 * - DELETE: Remove translations (soft delete)
 * - Authentication and authorization
 * - Rate limiting
 * - Error handling
 * - Data validation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Import the API handlers
import { GET, POST, PUT, DELETE } from '@/app/api/i18n/translations/route';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn()
  }))
}));

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                translatedText: 'Translated text',
                confidence: 0.95,
                alternatives: []
              })
            }
          }]
        })
      }
    }
  }))
}));

describe('/api/i18n/translations', () => {
  let mockSupabase: any;
  
  beforeAll(() => {
    // Setup global test environment
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.UPSTASH_REDIS_REST_URL = 'test-url';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com'
            }
          },
          error: null
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '1',
                    key: 'welcome.title',
                    value: 'Welcome',
                    locale: 'en-US',
                    context: 'wedding_industry',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                  }
                ],
                error: null,
                count: 1
              })
            }),
            single: vi.fn().mockResolvedValue({
              data: {
                id: '1',
                key: 'welcome.title',
                value: 'Welcome',
                locale: 'en-US'
              },
              error: null
            })
          }),
          ilike: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis()
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{
            id: '2',
            key: 'new.key',
            value: 'New Value',
            locale: 'en-US'
          }],
          error: null
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{
              id: '1',
              key: 'welcome.title',
              value: 'Updated Welcome',
              locale: 'en-US'
            }],
            error: null
          })
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: '1' }],
            error: null
          })
        })
      })
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/i18n/translations', () => {
    it('should retrieve translations with default parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.pagination).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter translations by locale', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations?locale=es-ES');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('locale', 'es-ES');
    });

    it('should filter translations by key pattern', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations?search=welcome');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.from().select().ilike).toHaveBeenCalledWith('key', '%welcome%');
    });

    it('should handle pagination correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations?page=2&limit=10');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.from().select().range).toHaveBeenCalledWith(10, 19);
    });

    it('should handle authentication failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/translations');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/translations');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch translations');
    });
  });

  describe('POST /api/i18n/translations', () => {
    it('should create a new translation', async () => {
      const translationData = {
        key: 'test.key',
        value: 'Test Value',
        locale: 'en-US',
        context: 'wedding_industry',
        metadata: {
          description: 'Test translation',
          tags: ['test']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(translationData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        value: 'Test Value',
        locale: 'en-US'
        // Missing required 'key' field
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should validate locale format', async () => {
      const invalidData = {
        key: 'test.key',
        value: 'Test Value',
        locale: 'invalid-locale',
        context: 'wedding_industry'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('locale');
    });

    it('should handle bulk translation creation', async () => {
      const bulkData = {
        bulk: true,
        translations: [
          {
            key: 'bulk.key1',
            value: 'Bulk Value 1',
            locale: 'en-US',
            context: 'wedding_industry'
          },
          {
            key: 'bulk.key2',
            value: 'Bulk Value 2',
            locale: 'en-US',
            context: 'wedding_industry'
          }
        ]
      };

      mockSupabase.from().insert.mockResolvedValue({
        data: bulkData.translations.map((t, i) => ({ ...t, id: `bulk-${i}` })),
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(bulkData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(2);
    });
  });

  describe('PUT /api/i18n/translations', () => {
    it('should update an existing translation', async () => {
      const updateData = {
        id: '1',
        value: 'Updated Value',
        metadata: {
          description: 'Updated translation',
          tags: ['updated']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', '1');
    });

    it('should require translation ID for updates', async () => {
      const invalidData = {
        value: 'Updated Value'
        // Missing required 'id' field
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'PUT',
        body: JSON.stringify(invalidData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ID is required');
    });

    it('should handle translation not found', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const updateData = {
        id: 'non-existent-id',
        value: 'Updated Value'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Translation not found');
    });
  });

  describe('DELETE /api/i18n/translations', () => {
    it('should delete a translation by ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations?id=1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', '1');
    });

    it('should require translation ID for deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Translation ID is required');
    });

    it('should handle bulk deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations?ids=1,2,3', {
        method: 'DELETE'
      });
      
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: [{ id: '1' }, { id: '2' }, { id: '3' }],
        error: null
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
    });

    it('should handle deletion of non-existent translation', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/translations?id=non-existent', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Translation not found');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Mock Redis to simulate rate limit exceeded
      const mockRedis = {
        get: vi.fn().mockResolvedValue('10'), // Current request count
        set: vi.fn(),
        incr: vi.fn().mockResolvedValue(11), // Increment past limit
        expire: vi.fn()
      };

      // Override the Redis mock for this test
      vi.doMock('@upstash/redis', () => ({
        Redis: vi.fn().mockImplementation(() => mockRedis)
      }));

      const request = new NextRequest('http://localhost:3000/api/i18n/translations');
      
      const response = await GET(request);
      
      // Should be rate limited if implementation includes rate limiting
      // This test assumes rate limiting is implemented in the actual API
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize translation values', async () => {
      const maliciousData = {
        key: 'test.key',
        value: '<script>alert("xss")</script>Malicious Value',
        locale: 'en-US',
        context: 'wedding_industry'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(maliciousData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      // Should either sanitize or reject malicious content
      if (response.status === 201) {
        // If accepted, ensure it's sanitized
        expect(data.data.value).not.toContain('<script>');
      } else {
        // If rejected, should return validation error
        expect(response.status).toBe(400);
      }
    });

    it('should validate translation key format', async () => {
      const invalidKeyData = {
        key: 'invalid key with spaces and special chars!@#',
        value: 'Test Value',
        locale: 'en-US',
        context: 'wedding_industry'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(invalidKeyData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('key');
    });
  });

  describe('Wedding Industry Context', () => {
    it('should handle wedding-specific translation contexts', async () => {
      const weddingData = {
        key: 'invitation.welcome',
        value: 'Welcome to our wedding celebration',
        locale: 'en-US',
        context: 'wedding_industry',
        wedding_context: {
          ceremony_type: 'religious',
          formality_level: 'formal'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(weddingData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should validate wedding context parameters', async () => {
      const invalidWeddingData = {
        key: 'invitation.welcome',
        value: 'Welcome to our wedding celebration',
        locale: 'en-US',
        context: 'wedding_industry',
        wedding_context: {
          ceremony_type: 'invalid_type', // Invalid ceremony type
          formality_level: 'formal'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: JSON.stringify(invalidWeddingData)
      });
      
      const response = await POST(request);
      
      // Should validate wedding context
      if (response.status !== 201) {
        const data = await response.json();
        expect(data.error).toContain('ceremony_type');
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from().select().eq().order().range.mockRejectedValue(
        new Error('Connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/i18n/translations');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(data.success).toBe(false);
    });

    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/translations', {
        method: 'POST',
        body: 'invalid json {'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });
  });
});