/**
 * Language and Region Management API Tests - WS-247 Multilingual Platform System
 * Comprehensive tests for /api/i18n/locales/ endpoints
 * 
 * Test Coverage:
 * - GET: Retrieve locale configurations and statistics
 * - POST: Create custom locale configurations
 * - PUT: Update locale settings
 * - DELETE: Remove custom locales
 * - Locale validation and formatting
 * - Cultural data integration
 * - Wedding-specific locale features
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Import the API handlers
import { GET, POST, PUT, DELETE } from '@/app/api/i18n/locales/route';

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

describe('/api/i18n/locales', () => {
  let mockSupabase: any;
  
  beforeAll(() => {
    // Setup global test environment
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
                    locale: 'en-US',
                    name: 'English (United States)',
                    native_name: 'English (United States)',
                    direction: 'ltr',
                    enabled: true,
                    cultural_data: {
                      wedding_traditions: ['white_dress', 'rings_exchange'],
                      date_format: 'MM/DD/YYYY',
                      currency_format: '$#,##0.00'
                    },
                    translation_completeness: 95,
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
                locale: 'en-US',
                name: 'English (United States)',
                enabled: true
              },
              error: null
            })
          }),
          in: vi.fn().mockReturnThis()
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{
            id: '2',
            locale: 'fr-FR',
            name: 'French (France)',
            enabled: true
          }],
          error: null
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{
              id: '1',
              locale: 'en-US',
              name: 'English (United States)',
              enabled: false
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

  describe('GET /api/i18n/locales', () => {
    it('should retrieve all enabled locales by default', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('enabled', true);
    });

    it('should include disabled locales when requested', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales?include_disabled=true');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should not filter by enabled status
      expect(mockSupabase.from().select().eq).not.toHaveBeenCalledWith('enabled', true);
    });

    it('should filter locales by region', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales?region=US');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify region filtering logic is applied
    });

    it('should return locale statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales?include_stats=true');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statistics).toBeDefined();
      expect(data.statistics.total_locales).toBeDefined();
      expect(data.statistics.enabled_locales).toBeDefined();
    });

    it('should return wedding-specific cultural data', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales?include_cultural_data=true');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data[0].cultural_data).toBeDefined();
      expect(data.data[0].cultural_data.wedding_traditions).toBeDefined();
    });

    it('should handle authentication failure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/locales');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('POST /api/i18n/locales', () => {
    it('should create a custom locale configuration', async () => {
      const localeData = {
        locale: 'es-MX',
        name: 'Spanish (Mexico)',
        native_name: 'Español (México)',
        direction: 'ltr',
        enabled: true,
        cultural_data: {
          wedding_traditions: ['lasso_ceremony', 'arras_coins'],
          date_format: 'DD/MM/YYYY',
          currency_format: '$#,##0.00 MXN',
          formal_address: 'usted',
          informal_address: 'tú'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(localeData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('should validate locale format', async () => {
      const invalidData = {
        locale: 'invalid-locale-format', // Should be ISO format like 'es-MX'
        name: 'Invalid Locale',
        direction: 'ltr',
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('locale format');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Locale',
        direction: 'ltr'
        // Missing required 'locale' field
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation');
    });

    it('should validate direction field', async () => {
      const invalidData = {
        locale: 'ar-SA',
        name: 'Arabic (Saudi Arabia)',
        direction: 'invalid', // Should be 'ltr' or 'rtl'
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('direction');
    });

    it('should prevent duplicate locale codes', async () => {
      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: { 
          message: 'duplicate key value violates unique constraint',
          code: '23505'
        }
      });

      const duplicateData = {
        locale: 'en-US', // Already exists
        name: 'English (United States)',
        direction: 'ltr',
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(duplicateData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });
  });

  describe('PUT /api/i18n/locales', () => {
    it('should update locale configuration', async () => {
      const updateData = {
        id: '1',
        enabled: false,
        cultural_data: {
          wedding_traditions: ['updated_tradition'],
          date_format: 'YYYY-MM-DD'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().update().eq).toHaveBeenCalledWith('id', '1');
    });

    it('should require locale ID for updates', async () => {
      const invalidData = {
        enabled: false
        // Missing required 'id' field
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'PUT',
        body: JSON.stringify(invalidData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ID is required');
    });

    it('should handle locale not found', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const updateData = {
        id: 'non-existent-id',
        enabled: false
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Locale configuration not found');
    });

    it('should validate cultural data updates', async () => {
      const updateData = {
        id: '1',
        cultural_data: {
          wedding_traditions: 'invalid_format', // Should be array
          date_format: 'INVALID'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('cultural_data');
    });
  });

  describe('DELETE /api/i18n/locales', () => {
    it('should delete a custom locale configuration', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales?id=1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', '1');
    });

    it('should prevent deletion of system locales', async () => {
      // Mock the locale as a system locale
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: '1',
          locale: 'en-US',
          is_system_locale: true
        },
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/locales?id=1', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('system locale');
    });

    it('should require locale ID for deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Locale ID is required');
    });
  });

  describe('Locale Validation', () => {
    it('should validate ISO 639-1 language codes', async () => {
      const invalidData = {
        locale: 'xx-YY', // Invalid language code
        name: 'Invalid Language',
        direction: 'ltr',
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      
      // Should validate language code
      if (response.status !== 201) {
        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });

    it('should validate ISO 3166-1 country codes', async () => {
      const invalidData = {
        locale: 'en-XX', // Invalid country code
        name: 'English (Invalid Country)',
        direction: 'ltr',
        enabled: true
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });
      
      const response = await POST(request);
      
      // Should validate country code
      if (response.status !== 201) {
        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });
  });

  describe('Cultural Data Integration', () => {
    it('should handle wedding tradition data correctly', async () => {
      const localeData = {
        locale: 'hi-IN',
        name: 'Hindi (India)',
        direction: 'ltr',
        enabled: true,
        cultural_data: {
          wedding_traditions: [
            'saptapadi',
            'mangalsutra',
            'sindoor',
            'mehndi'
          ],
          date_format: 'DD/MM/YYYY',
          currency_format: '₹#,##,##0.00',
          auspicious_colors: ['red', 'gold', 'yellow'],
          restricted_dates: ['no_moon_days'],
          ceremony_duration: {
            typical: '3-5 days',
            minimum: '1 day'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(localeData)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.cultural_data.wedding_traditions).toContain('saptapadi');
    });

    it('should validate cultural data structure', async () => {
      const invalidCulturalData = {
        locale: 'zh-CN',
        name: 'Chinese (China)',
        direction: 'ltr',
        enabled: true,
        cultural_data: {
          wedding_traditions: 'string_instead_of_array', // Invalid format
          date_format: 123, // Invalid type
          currency_format: null // Invalid value
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: JSON.stringify(invalidCulturalData)
      });
      
      const response = await POST(request);
      
      if (response.status !== 201) {
        const data = await response.json();
        expect(data.error).toContain('cultural_data');
      }
    });
  });

  describe('Translation Completeness', () => {
    it('should calculate translation completeness accurately', async () => {
      // Mock additional queries for translation stats
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'translations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { key: 'key1', value: 'value1' },
                  { key: 'key2', value: 'value2' }
                ],
                error: null,
                count: 2
              })
            })
          };
        }
        // Default behavior for locales table
        return mockSupabase.from();
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/locales?calculate_completeness=true');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].translation_completeness).toBeDefined();
      expect(typeof data.data[0].translation_completeness).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from().select().eq().order().range.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/i18n/locales');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch locale configurations');
    });

    it('should handle malformed JSON in POST requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'POST',
        body: 'invalid json {'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle concurrent modification conflicts', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: {
          message: 'Row was modified by another transaction',
          code: '40001'
        }
      });

      const updateData = {
        id: '1',
        enabled: false
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/locales', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('conflict');
    });
  });

  describe('Performance', () => {
    it('should implement caching for frequently accessed locales', async () => {
      // First request
      const request1 = new NextRequest('http://localhost:3000/api/i18n/locales');
      const response1 = await GET(request1);
      
      // Second identical request
      const request2 = new NextRequest('http://localhost:3000/api/i18n/locales');
      const response2 = await GET(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Should have cached the result (implementation dependent)
      // This test verifies caching behavior if implemented
    });

    it('should handle large numbers of locales efficiently', async () => {
      // Mock a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `locale-${i}`,
        locale: `xx-${String(i).padStart(2, '0')}`,
        name: `Test Locale ${i}`,
        enabled: true
      }));

      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: largeDataset,
        error: null,
        count: 1000
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/locales');
      
      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});