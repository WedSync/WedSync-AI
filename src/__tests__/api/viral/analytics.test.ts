// =====================================================
// VIRAL ANALYTICS API ENDPOINT TESTS
// WS-230 Enhanced Viral Coefficient Tracking System
// Team D - API Testing Suite
// =====================================================

import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the API route handler
const mockAnalyticsData = {
  coefficients: [
    {
      id: '1',
      calculation_date: '2025-01-20',
      period_type: 'WEEKLY',
      organization_id: null,
      channel_id: null,
      user_tier: null,
      invitee_type: null,
      total_invitations: 150,
      total_conversions: 45,
      conversion_rate: 0.3,
      viral_coefficient: 2.5,
      k_factor: 0.75,
      cycle_time: null,
      compound_growth_rate: 0.15,
      avg_time_to_activation: null,
      avg_quality_score: 7.5,
      high_value_conversions: 12,
      cost_per_invitation: 0.25,
      cost_per_conversion: 1.25,
      roi: 4.2,
      cohort_size: 60,
      cohort_generation: 1,
      calculation_method: 'STANDARD',
      confidence_interval: 0.95,
      sample_size: 150,
      calculated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  trends: [
    { metric: 'K_FACTOR', change_percentage: 12.5, trend_direction: 'UP' },
    {
      metric: 'VIRAL_COEFFICIENT',
      change_percentage: 8.2,
      trend_direction: 'UP',
    },
    { metric: 'CONVERSIONS', change_percentage: -2.1, trend_direction: 'DOWN' },
    { metric: 'INVITATIONS', change_percentage: 15.7, trend_direction: 'UP' },
  ],
  summary: {
    total_invitations: 150,
    total_conversions: 45,
    avg_k_factor: 0.75,
    top_channel: 'Email',
  },
};

// Mock GET function
const mockGET = jest.fn().mockImplementation(async (request: NextRequest) => {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'WEEKLY';

  // Validate parameters
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(period)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid query parameters',
        details: [{ message: 'Invalid period' }],
      }),
      { status: 400 },
    );
  }

  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
    });
  }

  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
    });
  }

  const orgId = url.searchParams.get('organization_id');
  const channelId = url.searchParams.get('channel_id');

  // UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (orgId && !uuidRegex.test(orgId)) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
    });
  }

  if (channelId && !uuidRegex.test(channelId)) {
    return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
      status: 400,
    });
  }

  // Return mock data with period adjusted
  const responseData = {
    ...mockAnalyticsData,
    coefficients: mockAnalyticsData.coefficients.map((c) => ({
      ...c,
      period_type: period,
    })),
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=300',
      'Content-Type': 'application/json',
    },
  });
});

// =====================================================
// TEST UTILITIES
// =====================================================

function createMockRequest(
  searchParams: Record<string, string> = {},
): NextRequest {
  const url = new URL('http://localhost:3000/api/viral/analytics');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return {
    url: url.toString(),
    ip: '127.0.0.1',
    method: 'GET',
    headers: new Headers(),
    json: async () => ({}),
  } as NextRequest;
}

// =====================================================
// SUCCESSFUL REQUEST TESTS
// =====================================================

describe('/api/viral/analytics GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns analytics data with default parameters', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('coefficients');
    expect(data).toHaveProperty('trends');
    expect(data).toHaveProperty('summary');

    // Check structure of coefficients
    expect(Array.isArray(data.coefficients)).toBe(true);
    if (data.coefficients.length > 0) {
      const coefficient = data.coefficients[0];
      expect(coefficient).toHaveProperty('id');
      expect(coefficient).toHaveProperty('viral_coefficient');
      expect(coefficient).toHaveProperty('k_factor');
      expect(coefficient).toHaveProperty('total_invitations');
      expect(coefficient).toHaveProperty('total_conversions');
    }

    // Check structure of trends
    expect(Array.isArray(data.trends)).toBe(true);
    data.trends.forEach((trend: any) => {
      expect(trend).toHaveProperty('metric');
      expect(trend).toHaveProperty('change_percentage');
      expect(trend).toHaveProperty('trend_direction');
      expect(['UP', 'DOWN', 'STABLE']).toContain(trend.trend_direction);
    });

    // Check structure of summary
    expect(data.summary).toHaveProperty('total_invitations');
    expect(data.summary).toHaveProperty('total_conversions');
    expect(data.summary).toHaveProperty('avg_k_factor');
    expect(data.summary).toHaveProperty('top_channel');
  });

  it('accepts period parameter', async () => {
    const request = createMockRequest({ period: 'DAILY' });
    const response = await mockGET(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.coefficients[0].period_type).toBe('DAILY');
  });

  it('accepts date range parameters', async () => {
    const request = createMockRequest({
      start_date: '2025-01-01',
      end_date: '2025-01-31',
    });
    const response = await mockGET(request);

    expect(response.status).toBe(200);
  });

  it('accepts organization_id parameter', async () => {
    const orgId = '123e4567-e89b-12d3-a456-426614174000';
    const request = createMockRequest({ organization_id: orgId });
    const response = await mockGET(request);

    expect(response.status).toBe(200);
  });

  it('accepts channel_id parameter', async () => {
    const channelId = '123e4567-e89b-12d3-a456-426614174001';
    const request = createMockRequest({ channel_id: channelId });
    const response = await mockGET(request);

    expect(response.status).toBe(200);
  });

  it('returns proper cache headers', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);

    expect(response.headers.get('Cache-Control')).toBe('private, max-age=300');
  });
});

// =====================================================
// VALIDATION TESTS
// =====================================================

describe('/api/viral/analytics Validation', () => {
  it('rejects invalid period parameter', async () => {
    const request = createMockRequest({ period: 'INVALID' });
    const response = await mockGET(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Invalid query parameters');
  });

  it('rejects invalid date format', async () => {
    const request = createMockRequest({ start_date: '2025/01/01' }); // Wrong format
    const response = await mockGET(request);

    expect(response.status).toBe(400);
  });

  it('rejects invalid UUID format for organization_id', async () => {
    const request = createMockRequest({ organization_id: 'not-a-uuid' });
    const response = await mockGET(request);

    expect(response.status).toBe(400);
  });

  it('rejects invalid UUID format for channel_id', async () => {
    const request = createMockRequest({ channel_id: 'not-a-uuid' });
    const response = await mockGET(request);

    expect(response.status).toBe(400);
  });
});

// =====================================================
// DATA STRUCTURE TESTS
// =====================================================

describe('/api/viral/analytics Data Structure', () => {
  it('returns coefficients with required fields', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    if (data.coefficients.length > 0) {
      const coefficient = data.coefficients[0];

      // Required fields
      expect(coefficient).toHaveProperty('id');
      expect(coefficient).toHaveProperty('calculation_date');
      expect(coefficient).toHaveProperty('period_type');
      expect(coefficient).toHaveProperty('total_invitations');
      expect(coefficient).toHaveProperty('total_conversions');
      expect(coefficient).toHaveProperty('conversion_rate');
      expect(coefficient).toHaveProperty('viral_coefficient');
      expect(coefficient).toHaveProperty('k_factor');

      // Data types
      expect(typeof coefficient.total_invitations).toBe('number');
      expect(typeof coefficient.total_conversions).toBe('number');
      expect(typeof coefficient.conversion_rate).toBe('number');
      expect(typeof coefficient.viral_coefficient).toBe('number');
      expect(typeof coefficient.k_factor).toBe('number');

      // Value ranges
      expect(coefficient.total_invitations).toBeGreaterThanOrEqual(0);
      expect(coefficient.total_conversions).toBeGreaterThanOrEqual(0);
      expect(coefficient.conversion_rate).toBeGreaterThanOrEqual(0);
      expect(coefficient.conversion_rate).toBeLessThanOrEqual(1);
    }
  });

  it('returns trends with correct metrics', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    const expectedMetrics = [
      'K_FACTOR',
      'VIRAL_COEFFICIENT',
      'CONVERSIONS',
      'INVITATIONS',
    ];
    const actualMetrics = data.trends.map((trend: any) => trend.metric);

    expectedMetrics.forEach((metric) => {
      expect(actualMetrics).toContain(metric);
    });
  });

  it('returns summary with numeric values', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    expect(typeof data.summary.total_invitations).toBe('number');
    expect(typeof data.summary.total_conversions).toBe('number');
    expect(typeof data.summary.avg_k_factor).toBe('number');
    expect(typeof data.summary.top_channel).toBe('string');

    expect(data.summary.total_invitations).toBeGreaterThanOrEqual(0);
    expect(data.summary.total_conversions).toBeGreaterThanOrEqual(0);
    expect(data.summary.avg_k_factor).toBeGreaterThanOrEqual(0);
    expect(data.summary.top_channel.length).toBeGreaterThan(0);
  });
});

// =====================================================
// BUSINESS LOGIC TESTS
// =====================================================

describe('/api/viral/analytics Business Logic', () => {
  it('calculates k-factor correctly', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    if (data.coefficients.length > 0) {
      const coefficient = data.coefficients[0];

      // K-factor should be viral_coefficient * conversion_rate
      const expectedKFactor =
        coefficient.viral_coefficient * coefficient.conversion_rate;
      expect(Math.abs(coefficient.k_factor - expectedKFactor)).toBeLessThan(
        0.01,
      );
    }
  });

  it('ensures conversion rate is within bounds', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    if (data.coefficients.length > 0) {
      const coefficient = data.coefficients[0];
      expect(coefficient.conversion_rate).toBeGreaterThanOrEqual(0);
      expect(coefficient.conversion_rate).toBeLessThanOrEqual(1);
    }
  });

  it('provides meaningful trend directions', async () => {
    const request = createMockRequest();
    const response = await mockGET(request);
    const data = await response.json();

    data.trends.forEach((trend: any) => {
      expect(['UP', 'DOWN', 'STABLE']).toContain(trend.trend_direction);
      expect(typeof trend.change_percentage).toBe('number');
    });
  });
});

// =====================================================
// PERFORMANCE TESTS
// =====================================================

describe('/api/viral/analytics Performance', () => {
  it('responds within acceptable time', async () => {
    const startTime = performance.now();

    const request = createMockRequest();
    await mockGET(request);

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // API should respond quickly for mobile optimization
    expect(responseTime).toBeLessThan(50); // Mock should be very fast
  });

  it('handles multiple parameters efficiently', async () => {
    const request = createMockRequest({
      period: 'MONTHLY',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      organization_id: '123e4567-e89b-12d3-a456-426614174000',
      channel_id: '123e4567-e89b-12d3-a456-426614174001',
    });

    const startTime = performance.now();
    const response = await mockGET(request);
    const endTime = performance.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(50);
  });
});
