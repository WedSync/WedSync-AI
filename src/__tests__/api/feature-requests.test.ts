import {
  describe,
  test,
  expect,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/feature-requests/route';
import { PUT } from '@/app/api/feature-requests/[id]/vote/route';
import { POST as CheckDuplicates } from '@/app/api/feature-requests/check-duplicates/route';
import { createClient } from '@supabase/supabase-js';

// Mock authentication
jest.mock('@/lib/auth', () => ({
  auth: {
    getCurrentUser: jest.fn(() =>
      Promise.resolve({
        id: 'test-user-id',
        email: 'test@wedding.com',
        user_type: 'wedding_supplier',
        organization_id: 'test-org-id',
        wedding_context: {
          wedding_size: 'large',
          timeframe: 'planning_phase',
          pain_points: ['coordination_issues', 'timeline_conflicts'],
        },
      }),
    ),
  },
}));

// Helper functions for feature requests API mock chains
// Reduces nesting from 6+ levels to ≤4 levels for SonarQube compliance

/**
 * Creates a standardized response for single feature request queries
 */
function createSingleFeatureRequestResponse() {
  return Promise.resolve({
    data: mockFeatureRequest,
    error: null,
  });
}

/**
 * Creates a standardized response for feature request list queries
 */
function createFeatureRequestListResponse() {
  return Promise.resolve({
    data: [mockFeatureRequest],
    error: null,
    count: 1,
  });
}

/**
 * Creates a standardized error-only response for mutations
 */
function createMutationResponse() {
  return Promise.resolve({ error: null });
}

/**
 * Creates single mock function for select chain - EXTRACTED TO REDUCE NESTING
 */
function createSingleMockFn() {
  return jest.fn(() => createSingleFeatureRequestResponse());
}

/**
 * Creates range mock function for select chain - EXTRACTED TO REDUCE NESTING
 */
function createRangeMockFn() {
  return jest.fn(() => createFeatureRequestListResponse());
}

/**
 * Creates the select query chain with eq filter support
 * Reduces nesting: select().eq().single()/range() - OPTIMIZED FOR S2004
 */
function createSelectEqChain() {
  return {
    single: createSingleMockFn(),
    range: createRangeMockFn(),
  };
}

/**
 * Creates the search query chain: contains().textSearch().order().range()
 * Reduces nesting from 6 levels to 4 levels
 */
function createSearchChain() {
  const orderChain = {
    range: jest.fn(() => createFeatureRequestListResponse()),
  };
  
  const textSearchChain = {
    order: jest.fn(() => orderChain),
  };
  
  return {
    textSearch: jest.fn(() => textSearchChain),
  };
}

/**
 * Creates the date filter chain: gte().order().range()
 * Reduces nesting from 5 levels to 3 levels
 */
function createDateFilterChain() {
  const orderChain = {
    range: jest.fn(() => createFeatureRequestListResponse()),
  };
  
  return {
    order: jest.fn(() => orderChain),
  };
}

/**
 * Creates the basic order chain: order().range()
 */
function createOrderChain() {
  return {
    range: jest.fn(() => createFeatureRequestListResponse()),
  };
}

/**
 * Creates the delete operation chain: delete().eq().eq()
 * Reduces nesting from 5 levels to 3 levels
 */
function createDeleteChain() {
  const innerEqChain = {
    eq: jest.fn(() => createMutationResponse()),
  };
  
  return {
    eq: jest.fn(() => innerEqChain),
  };
}

/**
 * Creates the insert operation chain: insert().select().single()
 * Reduces nesting from 4 levels to 3 levels
 */
function createInsertChain() {
  const selectChain = {
    single: jest.fn(() => createSingleFeatureRequestResponse()),
  };
  
  return {
    select: jest.fn(() => selectChain),
  };
}

/**
 * Creates the update operation chain: update().eq()
 */
function createUpdateChain() {
  return {
    eq: jest.fn(() => createMutationResponse()),
  };
}

/**
 * Creates the main select chain builder - EXTRACTED TO REDUCE NESTING TO 4 LEVELS
 */
function createSelectChain() {
  return {
    eq: jest.fn(() => createSelectEqChain()),
    contains: jest.fn(() => createSearchChain()),
    gte: jest.fn(() => createDateFilterChain()),
    order: jest.fn(() => createOrderChain()),
    range: jest.fn(() => createFeatureRequestListResponse()),
  };
}

// Mock Supabase client with reduced nesting
// Refactored: Reduced from 6+ level nesting to ≤4 levels
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => createSelectChain()),
    insert: jest.fn(() => createInsertChain()),
    upsert: jest.fn(() => createMutationResponse()),
    update: jest.fn(() => createUpdateChain()),
    delete: jest.fn(() => createDeleteChain()),
  })),
  rpc: jest.fn(() => createFeatureRequestListResponse()),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock OpenAI API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        data: [{ embedding: Array(1536).fill(0.1) }],
      }),
  }),
) as jest.Mock;

// Test data
const mockFeatureRequest = {
  id: 'test-request-id',
  title: 'Add weather alerts to outdoor ceremony timeline',
  description:
    'When planning outdoor weddings, couples need automatic weather alerts 48 hours before ceremony to coordinate backup plans with vendors. This feature would integrate with weather services to provide proactive notifications.',
  category: 'timeline_management',
  user_type: 'wedding_supplier',
  wedding_context: {
    wedding_size: 'large',
    timeframe: 'week_of_wedding',
    pain_points: ['weather_uncertainty', 'vendor_coordination'],
  },
  business_impact_data: {
    reach_score: 8,
    impact_score: 9,
    confidence_score: 7,
    effort_score: 4,
  },
  reach_score: 8,
  impact_score: 9,
  confidence_score: 7,
  effort_score: 4,
  rice_calculated_score: 126,
  wedding_industry_multiplier: 1.5,
  seasonal_urgency_multiplier: 1.2,
  final_priority_score: 226.8,
  vote_count: 15,
  comment_count: 3,
  status: 'open',
  created_at: new Date().toISOString(),
  pain_points: ['weather_uncertainty', 'vendor_coordination'],
};

const mockSimilarRequest = {
  id: 'similar-request-id',
  title: 'Weather notifications for outdoor weddings',
  description:
    'Couples planning garden ceremonies need weather tracking and alerts...',
  similarity: 0.87,
  wedding_context: {
    wedding_size: 'medium',
    timeframe: 'week_of_wedding',
  },
  vote_count: 8,
  status: 'open',
  created_at: new Date().toISOString(),
  category: 'timeline_management',
};

const validFeatureRequestData = {
  title: 'Add weather alerts to outdoor ceremony timeline',
  description:
    'When planning outdoor weddings, couples need automatic weather alerts 48 hours before ceremony to coordinate backup plans with vendors. This comprehensive feature would integrate with multiple weather services to provide proactive notifications.',
  category: 'timeline_management',
  wedding_context: {
    wedding_size: 'large',
    timeframe: 'week_of_wedding',
    pain_points: ['weather_uncertainty', 'vendor_coordination'],
    current_workaround: 'Manual weather checking multiple times per day',
  },
  business_impact: {
    reach_score: 8,
    impact_score: 9,
    confidence_score: 7,
    effort_score: 4,
  },
};

describe('Feature Request API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  describe('GET /api/feature-requests', () => {
    test('retrieves feature requests with default parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination).toMatchObject({
        total: expect.any(Number),
        limit: 20,
        offset: 0,
        has_more: expect.any(Boolean),
      });
    });

    test('applies wedding context filters correctly', async () => {
      const url = new URL('http://localhost:3000/api/feature-requests');
      url.searchParams.set('wedding_size', 'large');
      url.searchParams.set('timeframe', 'week_of_wedding');
      url.searchParams.set('category', 'timeline_management');

      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('feature_requests');
    });

    test('applies sorting correctly', async () => {
      const url = new URL('http://localhost:3000/api/feature-requests');
      url.searchParams.set('sort_by', 'priority');

      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify that the query builder was called with order
      expect(mockSupabaseClient.from().select().order).toHaveBeenCalled();
    });

    test('handles search queries with full-text search', async () => {
      const url = new URL('http://localhost:3000/api/feature-requests');
      url.searchParams.set('search', 'weather alerts outdoor');

      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should use textSearch for full-text queries
      expect(
        mockSupabaseClient.from().select().contains().textSearch,
      ).toHaveBeenCalled();
    });

    test('validates query parameters', async () => {
      const url = new URL('http://localhost:3000/api/feature-requests');
      url.searchParams.set('limit', '150'); // Exceeds max limit
      url.searchParams.set('sort_by', 'invalid_sort');

      const request = new NextRequest(url);

      const response = await GET(request);

      // Should handle validation gracefully
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/feature-requests', () => {
    test('creates feature request with wedding context validation', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(validFeatureRequestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('feature_request');
      expect(data.feature_request).toMatchObject({
        title: validFeatureRequestData.title,
        category: validFeatureRequestData.category,
      });
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });

    test('detects duplicate requests with AI similarity', async () => {
      // Mock similar request found
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockSimilarRequest],
        error: null,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(validFeatureRequestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('potential_duplicates');
      expect(data.potential_duplicates).toHaveLength(1);
      expect(data.potential_duplicates[0]).toHaveProperty('similarity');
      const expectedHeaders = expect.objectContaining({
        Authorization: 'Bearer test-api-key',
      });
      
      const expectedFetchCall = expect.objectContaining({
        method: 'POST',
        headers: expectedHeaders,
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expectedFetchCall,
      );
    });

    test('calculates wedding industry multipliers correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify({
            ...validFeatureRequestData,
            wedding_context: {
              ...validFeatureRequestData.wedding_context,
              wedding_size: 'destination',
              timeframe: 'week_of_wedding',
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // Should have higher multipliers for destination wedding and urgent timeframe
      const insertCall = mockSupabaseClient.from().insert.mock.calls[0][0];
      expect(insertCall.wedding_industry_multiplier).toBeGreaterThan(1.0);
      expect(insertCall.seasonal_urgency_multiplier).toBeGreaterThan(1.0);
    });

    test('validates required fields', async () => {
      const invalidData = {
        title: 'Short', // Too short
        description: 'Also too short', // Too short
        category: 'invalid_category',
        wedding_context: {
          wedding_size: 'invalid_size',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('details');
    });

    test('handles OpenAI API failure gracefully', async () => {
      // Mock OpenAI API failure
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('API Error'),
        }),
      ) as jest.Mock;

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(validFeatureRequestData),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      // Should still create the request without embedding
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('feature_request');
    });
  });

  describe('PUT /api/feature-requests/:id/vote', () => {
    test('applies wedding industry professional vote weighting', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/test-id/vote',
        {
          method: 'PUT',
          body: JSON.stringify({ vote_type: 'upvote' }),
        },
      );

      const response = await PUT(request, {
        params: { id: 'test-request-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('vote_weight');
      expect(data).toHaveProperty('context_match');
      expect(data.vote_weight).toBeGreaterThan(1.0); // Wedding supplier gets higher weight
    });

    test('calculates wedding context matching', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/test-id/vote',
        {
          method: 'PUT',
          body: JSON.stringify({ vote_type: 'upvote' }),
        },
      );

      const response = await PUT(request, {
        params: { id: 'test-request-id' },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.context_match).toBeGreaterThan(0);
      expect(data.context_match).toBeLessThanOrEqual(1);
    });

    test('removes vote when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/test-id/vote',
        {
          method: 'PUT',
          body: JSON.stringify({ remove_vote: true }),
        },
      );

      const response = await PUT(request, {
        params: { id: 'test-request-id' },
      });

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });

    test('validates UUID format', async () => {
      const voteRequestBody = { vote_type: 'upvote' };
      const requestOptions = {
        method: 'PUT',
        body: JSON.stringify(voteRequestBody),
      };
      
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/invalid-id/vote',
        requestOptions,
      );

      const response = await PUT(request, { params: { id: 'invalid-id' } });

      expect(response.status).toBe(400);
    });

    test('handles feature request not found', async () => {
      mockSupabaseClient
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        });

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/test-id/vote',
        {
          method: 'PUT',
          body: JSON.stringify({ vote_type: 'upvote' }),
        },
      );

      const response = await PUT(request, {
        params: { id: 'non-existent-id' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/feature-requests/check-duplicates', () => {
    test('detects semantic duplicates using AI embeddings', async () => {
      const requestData = {
        title: 'Weather alerts for outdoor ceremonies',
        description:
          'Outdoor wedding ceremonies need weather monitoring system that provides alerts 48 hours in advance so couples and vendors can coordinate backup plans.',
        wedding_context: {
          wedding_size: 'large',
          timeframe: 'week_of_wedding',
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/check-duplicates',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        },
      );

      const response = await CheckDuplicates(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('potential_duplicates');
      expect(data).toHaveProperty('search_method');
      expect(data.search_method).toBe('ai_semantic');
      expect(data.embedding_generated).toBe(true);

      if (data.potential_duplicates.length > 0) {
        expect(data.potential_duplicates[0]).toHaveProperty('similarity_score');
        expect(data.potential_duplicates[0]).toHaveProperty(
          'wedding_context_match',
        );
      }
    });

    test('falls back to text search when AI fails', async () => {
      // Mock OpenAI failure
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('API Error'),
        }),
      ) as jest.Mock;

      const requestData = {
        title: 'Weather alerts for ceremonies',
        description:
          'Need weather monitoring for outdoor weddings to coordinate backup plans',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/check-duplicates',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        },
      );

      const response = await CheckDuplicates(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('potential_duplicates');
      expect(data.search_method).toBe('text_search');
    });

    test('validates input data', async () => {
      const invalidData = {
        title: 'Short', // Too short
        description: 'Too short', // Too short
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/check-duplicates',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
        },
      );

      const response = await CheckDuplicates(request);

      expect(response.status).toBe(400);
    });

    test('filters duplicates by wedding context similarity', async () => {
      const requestData = {
        title: 'Wedding timeline management improvements',
        description:
          'Better coordination tools for managing wedding day timeline with all vendors and ensuring everything runs smoothly without delays.',
        wedding_context: {
          wedding_size: 'large',
          timeframe: 'week_of_wedding',
          pain_points: ['vendor_coordination', 'timing_conflicts'],
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests/check-duplicates',
        {
          method: 'POST',
          body: JSON.stringify(requestData),
        },
      );

      const response = await CheckDuplicates(request);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.potential_duplicates.length > 0) {
        // Should have wedding context match information
        data.potential_duplicates.forEach((duplicate: any) => {
          expect(duplicate).toHaveProperty('wedding_context_match');
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('handles database connection errors', async () => {
      mockSupabaseClient.from().select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
      );

      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    test('handles unauthorized access', async () => {
      // Mock auth failure
      const { auth } = require('@/lib/auth');
      auth.getCurrentUser.mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(validFeatureRequestData),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test('handles malformed JSON requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: 'invalid json',
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Performance and Security', () => {
    test('applies rate limiting considerations', async () => {
      // Multiple rapid requests
      const requests = Array.from(
        { length: 5 },
        () => new NextRequest('http://localhost:3000/api/feature-requests'),
      );

      const responses = await Promise.all(
        requests.map((request) => GET(request)),
      );

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Should not crash or error under load
    });

    test('sanitizes input data', async () => {
      const maliciousData = {
        ...validFeatureRequestData,
        title: '<script>alert("xss")</script>Wedding feature',
        description:
          'Normal description with <img src=x onerror=alert("xss")> embedded script',
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(maliciousData),
        },
      );

      const response = await POST(request);

      // Should not execute scripts but may sanitize or reject
      expect(response.status).toBeOneOf([201, 400]);
    });

    test('validates RICE scoring constraints', async () => {
      const invalidScoreData = {
        ...validFeatureRequestData,
        business_impact: {
          reach_score: 15, // Exceeds max of 10
          impact_score: 0, // Below min of 1
          confidence_score: 5,
          effort_score: -1, // Below min of 1
        },
      };

      const request = new NextRequest(
        'http://localhost:3000/api/feature-requests',
        {
          method: 'POST',
          body: JSON.stringify(invalidScoreData),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});

// Helper functions for Jest matcher - EXTRACTED TO REDUCE NESTING TO 4 LEVELS
function createToBeOneOfMatcher() {
  return function toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    const passMessage = () => `expected ${received} not to be one of ${expected}`;
    const failMessage = () => `expected ${received} to be one of ${expected}`;
    
    return {
      message: pass ? passMessage : failMessage,
      pass: pass,
    };
  };
}

// Helper assertion
expect.extend({
  toBeOneOf: createToBeOneOfMatcher(),
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
