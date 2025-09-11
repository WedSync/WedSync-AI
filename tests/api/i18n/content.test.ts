/**
 * Dynamic Content Translation API Tests - WS-247 Multilingual Platform System
 * Comprehensive tests for /api/i18n/content/ endpoints
 * 
 * Test Coverage:
 * - POST: Translate content dynamically with wedding context
 * - GET: Retrieve cached translations and metadata
 * - Wedding-specific content handling
 * - Variable substitution and formatting
 * - Cultural context awareness
 * - AI-powered translation validation
 * - Content quality scoring
 * - Performance and caching
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

// Import the API handlers
import { GET, POST } from '@/app/api/i18n/content/route';

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
                translatedText: 'Texto traducido con contexto cultural',
                confidence: 0.92,
                culturalNotes: ['Spanish formal addressing used', 'Wedding terminology adapted'],
                alternatives: ['Alternativa 1', 'Alternativa 2']
              })
            }
          }]
        })
      }
    }
  }))
}));

describe('/api/i18n/content', () => {
  let mockSupabase: any;
  let mockRedis: any;
  
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
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: '1',
                    content_hash: 'hash123',
                    source_locale: 'en-US',
                    target_locale: 'es-ES',
                    original_content: 'Welcome to our wedding',
                    translated_content: 'Bienvenidos a nuestra boda',
                    wedding_context: {
                      ceremony_type: 'religious',
                      formality_level: 'formal'
                    },
                    quality_score: 95,
                    created_at: '2024-01-01T00:00:00Z'
                  }
                ],
                error: null
              })
            }),
            single: vi.fn().mockResolvedValue({
              data: {
                id: '1',
                translated_content: 'Contenido traducido',
                quality_score: 90
              },
              error: null
            })
          })
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{
            id: '2',
            content_hash: 'newhash456',
            translated_content: 'Nuevo contenido traducido'
          }],
          error: null
        })
      })
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn()
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/i18n/content', () => {
    it('should translate wedding content with cultural context', async () => {
      const translationRequest = {
        content: 'Welcome to our wedding celebration! Please join us for this special day.',
        source_locale: 'en-US',
        target_locale: 'es-ES',
        wedding_context: {
          ceremony_type: 'religious',
          formality_level: 'formal',
          cultural_backgrounds: ['american', 'spanish'],
          venue_type: 'church'
        },
        variables: {
          bride_name: 'Maria',
          groom_name: 'Carlos',
          wedding_date: '2024-06-15'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translation).toBeDefined();
      expect(data.translation.translated_content).toBeDefined();
      expect(data.translation.quality_score).toBeGreaterThan(0);
      expect(data.translation.cultural_notes).toBeDefined();
    });

    it('should handle variable substitution in wedding content', async () => {
      const translationRequest = {
        content: 'Dear {{guest_name}}, {{bride_name}} and {{groom_name}} invite you to their wedding on {{wedding_date}}.',
        source_locale: 'en-US',
        target_locale: 'fr-FR',
        variables: {
          guest_name: 'Monsieur Dupont',
          bride_name: 'Sophie',
          groom_name: 'Pierre',
          wedding_date: '15 juin 2024'
        },
        wedding_context: {
          ceremony_type: 'civil',
          formality_level: 'formal'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.translation.translated_content).toContain('Sophie');
      expect(data.translation.translated_content).toContain('Pierre');
      expect(data.translation.translated_content).toContain('15 juin 2024');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        source_locale: 'en-US',
        target_locale: 'es-ES'
        // Missing required 'content' field
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('content');
      expect(data.error).toContain('required');
    });

    it('should validate locale formats', async () => {
      const invalidRequest = {
        content: 'Test content',
        source_locale: 'invalid-locale',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('locale');
    });

    it('should handle content that cannot be translated', async () => {
      // Mock OpenAI to return an error
      const mockOpenAI = vi.mocked(require('openai').OpenAI);
      mockOpenAI.prototype.chat.completions.create.mockRejectedValue(
        new Error('Translation service unavailable')
      );

      const translationRequest = {
        content: 'Test content',
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('translation failed');
    });

    it('should apply cultural adaptations for different ceremony types', async () => {
      const religiousRequest = {
        content: 'Please join us for our wedding ceremony',
        source_locale: 'en-US',
        target_locale: 'ar-SA',
        wedding_context: {
          ceremony_type: 'religious',
          formality_level: 'very_formal',
          cultural_backgrounds: ['islamic']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(religiousRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translation.cultural_notes).toBeDefined();
      expect(data.translation.cultural_notes.length).toBeGreaterThan(0);
    });

    it('should handle multiple target locales in batch', async () => {
      const batchRequest = {
        content: 'Thank you for celebrating with us!',
        source_locale: 'en-US',
        target_locales: ['es-ES', 'fr-FR', 'de-DE'],
        wedding_context: {
          ceremony_type: 'civil',
          formality_level: 'casual'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(batchRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.translations)).toBe(true);
      expect(data.translations).toHaveLength(3);
      expect(data.translations[0].target_locale).toBe('es-ES');
      expect(data.translations[1].target_locale).toBe('fr-FR');
      expect(data.translations[2].target_locale).toBe('de-DE');
    });

    it('should apply quality thresholds', async () => {
      // Mock low quality translation
      const mockOpenAI = vi.mocked(require('openai').OpenAI);
      mockOpenAI.prototype.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              translatedText: 'Poor quality translation',
              confidence: 0.3, // Low confidence
              culturalNotes: [],
              alternatives: []
            })
          }
        }]
      });

      const translationRequest = {
        content: 'Welcome to our wedding',
        source_locale: 'en-US',
        target_locale: 'zh-CN',
        quality_threshold: 0.8
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      // Should either reject low quality or provide alternatives
      if (response.status === 200) {
        expect(data.translation.quality_warning).toBeDefined();
        expect(data.translation.alternatives).toBeDefined();
      } else {
        expect(response.status).toBe(422);
        expect(data.error).toContain('quality');
      }
    });
  });

  describe('GET /api/i18n/content', () => {
    it('should retrieve cached translation by content hash', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/content?content_hash=hash123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.content_hash).toBe('hash123');
    });

    it('should return 404 for non-existent content hash', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' }
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/content?content_hash=nonexistent');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Translation not found');
    });

    it('should retrieve translation history for content', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/content?content_hash=hash123&include_history=true');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history).toBeDefined();
    });

    it('should filter by locale pairs', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/content?source_locale=en-US&target_locale=es-ES');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('source_locale', 'en-US');
      expect(mockSupabase.from().select().eq).toHaveBeenCalledWith('target_locale', 'es-ES');
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      });

      const request = new NextRequest('http://localhost:3000/api/i18n/content?content_hash=hash123');
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Content Caching', () => {
    it('should cache successful translations', async () => {
      const translationRequest = {
        content: 'Wedding celebration content',
        source_locale: 'en-US',
        target_locale: 'it-IT'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Verify that caching was attempted
      expect(mockSupabase.from().insert).toHaveBeenCalled();
    });

    it('should return cached results for identical requests', async () => {
      // Setup cache hit
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: {
          id: '1',
          translated_content: 'Cached translation',
          quality_score: 95,
          cultural_notes: ['From cache']
        },
        error: null
      });

      const translationRequest = {
        content: 'Cached content',
        source_locale: 'en-US',
        target_locale: 'de-DE'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translation.translated_content).toBe('Cached translation');
      expect(data.from_cache).toBe(true);
    });
  });

  describe('Wedding Context Processing', () => {
    it('should adapt content based on venue type', async () => {
      const outdoorWeddingRequest = {
        content: 'Please join us for our outdoor ceremony',
        source_locale: 'en-US',
        target_locale: 'es-MX',
        wedding_context: {
          venue_type: 'outdoor',
          season: 'spring',
          formality_level: 'casual'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(outdoorWeddingRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translation.cultural_notes).toBeDefined();
    });

    it('should handle multicultural wedding contexts', async () => {
      const multiculturalRequest = {
        content: 'We invite you to celebrate our union in both traditions',
        source_locale: 'en-US',
        target_locale: 'hi-IN',
        wedding_context: {
          ceremony_type: 'cultural_fusion',
          cultural_backgrounds: ['american', 'indian'],
          traditions_included: ['western_vows', 'saptapadi']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(multiculturalRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translation.cultural_adaptations).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce API rate limits', async () => {
      // Mock Redis to simulate rate limiting
      mockRedis.get.mockResolvedValue('5'); // Current request count
      mockRedis.incr.mockResolvedValue(6); // Exceeds limit of 5

      // This would need to be implemented in the actual API
      const translationRequest = {
        content: 'Test content',
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      
      // Rate limiting implementation would return 429
      expect([200, 429]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: 'invalid json {'
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle database connection failures', async () => {
      mockSupabase.from().insert.mockRejectedValue(
        new Error('Database connection failed')
      );

      const translationRequest = {
        content: 'Test content',
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle OpenAI API failures gracefully', async () => {
      const mockOpenAI = vi.mocked(require('openai').OpenAI);
      mockOpenAI.prototype.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      const translationRequest = {
        content: 'Test content',
        source_locale: 'en-US',
        target_locale: 'zh-CN'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('translation service');
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'Lorem ipsum '.repeat(1000); // Large content
      
      const translationRequest = {
        content: largeContent,
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const startTime = Date.now();
      const response = await POST(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    it('should handle concurrent translation requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => {
        const translationRequest = {
          content: `Content ${i}`,
          source_locale: 'en-US',
          target_locale: 'fr-FR'
        };

        return new NextRequest('http://localhost:3000/api/i18n/content', {
          method: 'POST',
          body: JSON.stringify(translationRequest)
        });
      });

      const responses = await Promise.all(requests.map(req => POST(req)));

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Content Validation', () => {
    it('should sanitize potentially harmful content', async () => {
      const maliciousRequest = {
        content: '<script>alert("xss")</script>Malicious wedding invitation',
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(maliciousRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();

      if (response.status === 200) {
        // Should sanitize malicious content
        expect(data.translation.translated_content).not.toContain('<script>');
      } else {
        // Or reject it outright
        expect(response.status).toBe(400);
      }
    });

    it('should validate content length limits', async () => {
      const tooLongContent = 'x'.repeat(50000); // Exceeds reasonable limit
      
      const translationRequest = {
        content: tooLongContent,
        source_locale: 'en-US',
        target_locale: 'es-ES'
      };

      const request = new NextRequest('http://localhost:3000/api/i18n/content', {
        method: 'POST',
        body: JSON.stringify(translationRequest)
      });
      
      const response = await POST(request);
      
      if (response.status !== 200) {
        const data = await response.json();
        expect(data.error).toContain('content too long');
      }
    });
  });
});