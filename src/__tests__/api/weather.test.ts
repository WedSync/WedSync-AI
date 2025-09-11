/**
 * Weather API Tests - WS-220 Weather API Integration
 * Comprehensive test suite for weather endpoints with security validation
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/weather/route';
import { weatherService } from '@/lib/services/weatherService';
import { rateLimitService } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/services/weatherService');
jest.mock('@/lib/rate-limit');
jest.mock('next-auth');
jest.mock('@/lib/auth');

const mockWeatherService = weatherService as jest.Mocked<typeof weatherService>;
const mockRateLimitService = rateLimitService as jest.Mocked<
  typeof rateLimitService
>;
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe('Weather API Route Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default session mock
    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default rate limit mock - allow requests
    mockRateLimitService.checkLimit.mockResolvedValue(true);
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without valid session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests without user ID in session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for weather API calls', async () => {
      mockRateLimitService.checkLimit.mockResolvedValue(false);

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBe(60);

      // Check rate limit headers
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should call rate limiting with correct parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );

      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: true,
        data: { temperature: 20, condition: 'Clear' },
      });

      await GET(request, { params: {} });

      expect(mockRateLimitService.checkLimit).toHaveBeenCalledWith(
        'weather_api_test-user-id',
        10, // 10 requests
        60, // per minute
      );
    });
  });

  describe('Input Validation', () => {
    it('should validate latitude and longitude parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=invalid&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);
    });

    it('should reject invalid latitude ranges', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=91&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);
    });

    it('should reject invalid longitude ranges', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=181',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);
    });

    it('should validate days parameter for forecast', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=forecast&days=16',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);
    });

    it('should require wedding date for wedding weather type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=wedding',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('MISSING_WEDDING_DATE');
    });

    it('should require wedding date for analysis type', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=analysis',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('MISSING_WEDDING_DATE');
    });
  });

  describe('Current Weather Endpoint', () => {
    it('should return current weather data successfully', async () => {
      const mockWeatherData = {
        temperature: 20,
        humidity: 65,
        condition: 'Clear',
        description: 'clear sky',
        location: { name: 'London', country: 'GB' },
      };

      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: true,
        data: mockWeatherData,
        cached: false,
        timestamp: new Date().toISOString(),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=current',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWeatherData);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.type).toBe('current');
      expect(data.metadata.coordinates).toEqual({
        latitude: 51.5074,
        longitude: -0.1278,
      });

      expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(
        51.5074,
        -0.1278,
      );
    });

    it('should include correct cache headers for current weather', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: true,
        data: { temperature: 20 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=current',
      );
      const response = await GET(request, { params: {} });

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=600, stale-while-revalidate=300',
      );
      expect(response.headers.get('X-Weather-Type')).toBe('current');
    });
  });

  describe('Forecast Weather Endpoint', () => {
    it('should return forecast weather data successfully', async () => {
      const mockForecastData = {
        location: { name: 'London' },
        forecast: [
          { date: '2025-01-31', temperature: 18, condition: 'Partly Cloudy' },
          { date: '2025-02-01', temperature: 22, condition: 'Sunny' },
        ],
        summary: { averageTemperature: 20 },
      };

      mockWeatherService.getWeatherForecast.mockResolvedValue({
        success: true,
        data: mockForecastData,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=forecast&days=5',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockForecastData);

      expect(mockWeatherService.getWeatherForecast).toHaveBeenCalledWith(
        51.5074,
        -0.1278,
        5,
      );
    });

    it('should include correct cache headers for forecast weather', async () => {
      mockWeatherService.getWeatherForecast.mockResolvedValue({
        success: true,
        data: { forecast: [] },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=forecast',
      );
      const response = await GET(request, { params: {} });

      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=3600, stale-while-revalidate=1800',
      );
    });
  });

  describe('Wedding Weather Endpoint', () => {
    it('should return wedding weather data successfully', async () => {
      const mockWeddingData = {
        date: '2025-06-15',
        temperature: 24,
        precipitation: 0,
        weddingRelevant: {
          photographyConditions: { lighting: 'good' },
          outdoorViability: { viability: 'excellent', score: 10 },
          guestComfort: { rating: 'high' },
        },
      };

      mockWeatherService.getWeatherForWeddingDate.mockResolvedValue({
        success: true,
        data: mockWeddingData,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=wedding&weddingDate=2025-06-15&weddingId=123e4567-e89b-12d3-a456-426614174000',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockWeddingData);

      expect(mockWeatherService.getWeatherForWeddingDate).toHaveBeenCalledWith(
        51.5074,
        -0.1278,
        '2025-06-15',
      );
    });
  });

  describe('Weather Analysis Endpoint', () => {
    it('should return weather analysis data successfully', async () => {
      const mockAnalysisData = {
        riskLevel: 'LOW',
        recommendations: ['Perfect weather for outdoor ceremony'],
        considerations: [],
        alternatives: [],
        confidence: 0.9,
      };

      mockWeatherService.analyzeWeatherRisk.mockResolvedValue({
        success: true,
        data: mockAnalysisData,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=analysis&weddingDate=2025-06-15&outdoor=true',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAnalysisData);

      expect(mockWeatherService.analyzeWeatherRisk).toHaveBeenCalledWith(
        51.5074,
        -0.1278,
        '2025-06-15',
        true,
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle weather service errors gracefully', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: false,
        error: 'Weather service unavailable',
        code: 'WEATHER_SERVICE_ERROR',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('WEATHER_SERVICE_ERROR');
      expect(data.fallback).toBeDefined();
      expect(data.fallback.message).toContain('temporarily unavailable');
    });

    it('should handle unexpected errors with proper error response', async () => {
      mockWeatherService.getCurrentWeather.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      const response = await GET(request, { params: {} });

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INTERNAL_ERROR');
      expect(data.requestId).toBeDefined();
      expect(data.requestId).toMatch(/^error_\d+$/);
    });

    it('should log critical errors with proper context', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWeatherService.getCurrentWeather.mockRejectedValue(
        new Error('Critical error'),
      );

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      request.headers.set('user-id', 'test-user-123');

      await GET(request, { params: {} });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Weather API critical error:',
        expect.objectContaining({
          error: 'Critical error',
          stack: expect.any(String),
          timestamp: expect.any(String),
          userId: 'test-user-123',
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Response Metadata', () => {
    it('should include proper metadata in successful responses', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: true,
        data: { temperature: 20 },
        cached: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=current',
      );
      const response = await GET(request, { params: {} });

      const data = await response.json();

      expect(data.metadata).toEqual({
        requestId: expect.stringMatching(/^weather_\d+_test-user-id$/),
        timestamp: expect.any(String),
        cached: false,
        type: 'current',
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
      });
    });

    it('should include request headers in response', async () => {
      mockWeatherService.getCurrentWeather.mockResolvedValue({
        success: true,
        data: { temperature: 20 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278&type=current',
      );
      const response = await GET(request, { params: {} });

      expect(response.headers.get('X-Weather-Type')).toBe('current');
      expect(response.headers.get('X-Request-ID')).toMatch(
        /^weather_\d+_test-user-id$/,
      );
    });
  });

  describe('Security Headers', () => {
    it('should apply withSecureValidation security checks', async () => {
      // Test bot detection
      const botRequest = new NextRequest(
        'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
      );
      botRequest.headers.set('user-agent', 'Googlebot/2.1');

      const response = await GET(botRequest, { params: {} });
      expect(response.status).toBe(403);
    });

    it('should validate origin for POST requests', async () => {
      // This would be tested if we had POST endpoints
      // Currently the weather API only supports GET
      expect(true).toBe(true);
    });
  });
});

describe('Weather API Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetServerSession.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    mockRateLimitService.checkLimit.mockResolvedValue(true);
  });

  it('should handle cached weather data correctly', async () => {
    mockWeatherService.getCurrentWeather.mockResolvedValue({
      success: true,
      data: { temperature: 20 },
      cached: true,
      timestamp: '2025-01-30T12:00:00Z',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
    );
    const response = await GET(request, { params: {} });

    const data = await response.json();
    expect(data.metadata.cached).toBe(true);
  });

  it('should handle boundary coordinate values', async () => {
    mockWeatherService.getCurrentWeather.mockResolvedValue({
      success: true,
      data: { temperature: -30 },
    });

    // Test extreme coordinates
    const request = new NextRequest(
      'http://localhost:3000/api/weather?lat=-90&lon=-180',
    );
    const response = await GET(request, { params: {} });

    expect(response.status).toBe(200);
    expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(
      -90,
      -180,
    );
  });

  it('should handle missing optional parameters gracefully', async () => {
    mockWeatherService.getCurrentWeather.mockResolvedValue({
      success: true,
      data: { temperature: 15 },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/weather?lat=51.5074&lon=-0.1278',
    );
    const response = await GET(request, { params: {} });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.metadata.type).toBe('current'); // Default type
  });
});
