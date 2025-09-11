import { NextRequest } from 'next/server';
import { jest } from '@jest/globals';
import { POST, GET } from '@/app/api/wedme/knowledge/voice-search/route';

// Mock the rate limiter
jest.mock('@/lib/rate-limiter', () => ({
  rateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

describe('/api/wedme/knowledge/voice-search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns service health information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'ok',
        service: 'voice-search',
        version: '1.0.0',
        supportedLanguages: ['en-US'],
        features: [
          'wedding-terminology',
          'context-enhancement',
          'timeline-awareness',
        ],
      });
    });
  });

  describe('POST', () => {
    const createMockRequest = (body: any) => {
      return new NextRequest(
        'http://localhost:3000/api/wedme/knowledge/voice-search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
    };

    it('processes basic wedding query successfully', async () => {
      const request = createMockRequest({
        query: 'how to choose a venue',
        originalQuery: 'how to choose a venue',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toBeDefined();
      expect(data.suggestions).toBeDefined();
      expect(data.enhancedQuery).toContain('wedding');
      expect(data.enhancedQuery).toContain('venue');
      expect(data.originalQuery).toBe('how to choose a venue');
      expect(data.voiceResponse).toBeDefined();
      expect(data.searchInfo).toEqual({
        totalResults: expect.any(Number),
        searchTime: expect.any(Number),
        category: expect.any(String),
      });
    });

    it('enhances wedding terminology correctly', async () => {
      const request = createMockRequest({
        query: 'where to have my party',
        originalQuery: 'where to have my party',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhancedQuery).toContain('wedding');
      expect(data.enhancedQuery).toContain('venue'); // 'where' should map to venue terms
    });

    it('maps spoken terms to wedding terminology', async () => {
      const testCases = [
        { query: 'photographer pictures', expectedTerms: ['photography'] },
        { query: 'food and dinner', expectedTerms: ['catering'] },
        { query: 'music and dancing', expectedTerms: ['music'] },
        { query: 'flowers and bouquet', expectedTerms: ['flowers'] },
        { query: 'dress and outfit', expectedTerms: ['dress'] },
        { query: 'guest list invitations', expectedTerms: ['guests'] },
      ];

      for (const testCase of testCases) {
        const request = createMockRequest({
          query: testCase.query,
          originalQuery: testCase.query,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);

        // Check that wedding terms are added to the enhanced query
        for (const term of testCase.expectedTerms) {
          expect(data.enhancedQuery).toContain(term);
        }
      }
    });

    it('categorizes queries correctly', async () => {
      const testCases = [
        { query: 'wedding venue location', expectedCategory: 'venue' },
        { query: 'photography tips', expectedCategory: 'photography' },
        { query: 'catering menu', expectedCategory: 'catering' },
        { query: 'budget planning', expectedCategory: 'budget' },
        { query: 'timeline schedule', expectedCategory: 'timeline' },
      ];

      for (const testCase of testCases) {
        const request = createMockRequest({
          query: testCase.query,
          originalQuery: testCase.query,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.searchInfo.category).toBe(testCase.expectedCategory);
      }
    });

    it('returns appropriate suggestions based on category', async () => {
      const request = createMockRequest({
        query: 'wedding venue tips',
        originalQuery: 'wedding venue tips',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toContain(
        'What questions should I ask when touring venues?',
      );
      expect(data.suggestions).toContain(
        'How far in advance should I book my venue?',
      );
      expect(data.suggestions).toContain(
        "What's the average cost of a wedding venue?",
      );
    });

    it('generates contextual voice responses', async () => {
      const request = createMockRequest({
        query: 'photography planning',
        originalQuery: 'photography planning',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.voiceResponse).toContain('photography planning');
      expect(typeof data.voiceResponse).toBe('string');
      expect(data.voiceResponse.length).toBeGreaterThan(20); // Should be a meaningful response
    });

    it('handles empty query with appropriate response', async () => {
      const request = createMockRequest({
        query: '',
        originalQuery: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required and must be a string');
    });

    it('handles non-string query', async () => {
      const request = createMockRequest({
        query: 123,
        originalQuery: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required and must be a string');
    });

    it('handles missing query parameter', async () => {
      const request = createMockRequest({
        originalQuery: 'test',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required and must be a string');
    });

    it('returns fallback response for no matching articles', async () => {
      const request = createMockRequest({
        query: 'completely unrelated nonsense query xyz123',
        originalQuery: 'completely unrelated nonsense query xyz123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles).toHaveLength(0);
      expect(data.voiceResponse).toContain("couldn't find specific articles");
      expect(data.suggestions).toEqual([
        'How do I choose a venue?',
        "What's a good wedding budget?",
        'When should I book my photographer?',
      ]);
    });

    it('searches articles with relevance scoring', async () => {
      const request = createMockRequest({
        query: 'wedding venue selection tips',
        originalQuery: 'wedding venue selection tips',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles.length).toBeGreaterThan(0);

      // Articles should be sorted by relevance score (highest first)
      if (data.articles.length > 1) {
        for (let i = 0; i < data.articles.length - 1; i++) {
          expect(data.articles[i].relevanceScore).toBeGreaterThanOrEqual(
            data.articles[i + 1].relevanceScore,
          );
        }
      }
    });

    it('limits results to specified number', async () => {
      const request = createMockRequest({
        query: 'wedding planning guide',
        originalQuery: 'wedding planning guide',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.articles.length).toBeLessThanOrEqual(5); // Default limit is 5
    });

    it('adds wedding context when not present', async () => {
      const request = createMockRequest({
        query: 'venue selection tips',
        originalQuery: 'venue selection tips',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhancedQuery).toContain('wedding');
    });

    it('preserves wedding context when already present', async () => {
      const request = createMockRequest({
        query: 'wedding venue selection tips',
        originalQuery: 'wedding venue selection tips',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.enhancedQuery).toContain('wedding venue selection tips');
      // Should not duplicate "wedding"
      expect((data.enhancedQuery.match(/wedding/g) || []).length).toBe(1);
    });

    it('handles rate limiting', async () => {
      const { rateLimit } = require('@/lib/rate-limiter');
      rateLimit.mockResolvedValueOnce({
        success: false,
        message: 'Too many voice search requests, please try again later',
      });

      const request = createMockRequest({
        query: 'wedding planning',
        originalQuery: 'wedding planning',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe(
        'Too many voice search requests, please try again later',
      );
    });

    it('handles internal server errors gracefully', async () => {
      // Mock JSON parsing to throw an error
      const request = new NextRequest(
        'http://localhost:3000/api/wedme/knowledge/voice-search',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json{',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Voice search failed');
      expect(data.articles).toEqual([]);
      expect(data.suggestions).toEqual([
        'How do I choose a venue?',
        "What's a good wedding budget?",
        'When should I book my photographer?',
      ]);
    });

    it('processes originalQuery when provided', async () => {
      const request = createMockRequest({
        query: 'how to choose a venue',
        originalQuery: 'how do I pick a place for my wedding',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.originalQuery).toBe('how do I pick a place for my wedding');
      expect(data.voiceResponse).toContain(
        'how do I pick a place for my wedding',
      );
    });

    it('falls back to query when originalQuery is missing', async () => {
      const request = createMockRequest({
        query: 'how to choose a venue',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.originalQuery).toBe('how to choose a venue');
    });

    it('includes helpful percentage in voice responses', async () => {
      const request = createMockRequest({
        query: 'wedding venue guide',
        originalQuery: 'wedding venue guide',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.articles.length > 0) {
        expect(data.voiceResponse).toMatch(/\d+% helpful/);
      }
    });

    it('handles multiple article results appropriately', async () => {
      const request = createMockRequest({
        query: 'wedding planning',
        originalQuery: 'wedding planning',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.articles.length > 1) {
        expect(data.voiceResponse).toContain(
          `found ${data.articles.length} helpful articles`,
        );
      }
    });
  });
});
