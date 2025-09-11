/**
 * Weather Service Tests - WS-220 Weather API Integration
 * Comprehensive test suite for weather service data transformation and caching
 */

import { weatherService } from '@/lib/services/weatherService';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('WeatherService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the cache before each test
    (weatherService as any).cache.clear();

    // Mock environment variable
    process.env.OPENWEATHER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.OPENWEATHER_API_KEY;
  });

  describe('getCurrentWeather', () => {
    it('should fetch and transform current weather data', async () => {
      const mockApiResponse = {
        main: {
          temp: 20.5,
          humidity: 65,
          pressure: 1013,
        },
        weather: [
          {
            main: 'Clear',
            description: 'clear sky',
          },
        ],
        wind: {
          speed: 3.5,
          deg: 180,
        },
        clouds: {
          all: 10,
        },
        visibility: 10000,
        name: 'London',
        sys: {
          country: 'GB',
        },
        coord: {
          lat: 51.5074,
          lon: -0.1278,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(true);
      expect(result.cached).toBe(false);
      expect(result.data).toEqual({
        temperature: 20.5,
        humidity: 65,
        windSpeed: 3.5,
        windDirection: 180,
        precipitation: 0,
        visibility: 10,
        uvIndex: 0,
        condition: 'Clear',
        description: 'clear sky',
        pressure: 1013,
        cloudCover: 10,
        location: {
          name: 'London',
          country: 'GB',
          coordinates: {
            latitude: 51.5074,
            longitude: -0.1278,
          },
        },
        weddingRelevant: {
          photographyConditions: expect.objectContaining({
            lighting: expect.any(String),
            visibility: expect.any(String),
            recommendations: expect.any(Array),
          }),
          outdoorViability: expect.objectContaining({
            viability: expect.any(String),
            score: expect.any(Number),
          }),
          guestComfort: expect.objectContaining({
            rating: expect.any(String),
            factors: expect.any(Array),
          }),
        },
      });

      // Verify API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather?lat=51.5074&lon=-0.1278&appid=test-api-key&units=metric',
        expect.objectContaining({
          headers: {
            'User-Agent': 'WedSync-Weather-Service/1.0',
          },
        }),
      );
    });

    it('should return cached data on subsequent requests', async () => {
      const mockApiResponse = {
        main: { temp: 20, humidity: 65, pressure: 1013 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 3, deg: 180 },
        clouds: { all: 10 },
        visibility: 10000,
        name: 'London',
        sys: { country: 'GB' },
        coord: { lat: 51.5074, lon: -0.1278 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // First request - should fetch from API
      const result1 = await weatherService.getCurrentWeather(51.5074, -0.1278);
      expect(result1.cached).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const result2 = await weatherService.getCurrentWeather(51.5074, -0.1278);
      expect(result2.cached).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Weather service temporarily unavailable');
      expect(result.code).toBe('WEATHER_SERVICE_ERROR');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Weather service temporarily unavailable');
      expect(result.code).toBe('WEATHER_SERVICE_ERROR');
    });

    it('should retry failed requests', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            main: { temp: 20, humidity: 65, pressure: 1013 },
            weather: [{ main: 'Clear', description: 'clear sky' }],
            wind: { speed: 3, deg: 180 },
            clouds: { all: 10 },
            visibility: 10000,
            name: 'London',
            sys: { country: 'GB' },
            coord: { lat: 51.5074, lon: -0.1278 },
          }),
        } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getWeatherForecast', () => {
    it('should fetch and transform forecast data', async () => {
      const mockForecastResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000),
            main: { temp: 18, humidity: 70, pressure: 1010 },
            weather: [{ main: 'Clouds', description: 'few clouds' }],
            wind: { speed: 5, deg: 200 },
            clouds: { all: 20 },
          },
          {
            dt: Math.floor(Date.now() / 1000) + 10800, // 3 hours later
            main: { temp: 22, humidity: 60, pressure: 1015 },
            weather: [{ main: 'Clear', description: 'clear sky' }],
            wind: { speed: 3, deg: 180 },
            clouds: { all: 5 },
          },
        ],
        city: {
          name: 'London',
          country: 'GB',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastResponse,
      } as Response);

      const result = await weatherService.getWeatherForecast(
        51.5074,
        -0.1278,
        3,
      );

      expect(result.success).toBe(true);
      expect(result.data.location.name).toBe('London');
      expect(result.data.forecast).toHaveLength(1); // One day from the mock data
      expect(result.data.forecast[0]).toMatchObject({
        date: expect.any(String),
        temperature: expect.any(Number),
        humidity: expect.any(Number),
        weddingRelevant: expect.any(Object),
      });
      expect(result.data.summary).toMatchObject({
        averageTemperature: expect.any(Number),
        totalPrecipitation: expect.any(Number),
        maxWindSpeed: expect.any(Number),
        overallCondition: expect.any(String),
      });
    });
  });

  describe('getWeatherForWeddingDate', () => {
    it('should return detailed forecast for near-term wedding dates', async () => {
      const weddingDate = new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 2 days from now

      const mockForecastResponse = {
        list: [
          {
            dt: Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60, // 2 days from now
            main: { temp: 25, humidity: 50, pressure: 1020 },
            weather: [{ main: 'Clear', description: 'clear sky' }],
            wind: { speed: 2, deg: 90 },
            clouds: { all: 0 },
          },
        ],
        city: {
          name: 'London',
          country: 'GB',
          coord: { lat: 51.5074, lon: -0.1278 },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastResponse,
      } as Response);

      const result = await weatherService.getWeatherForWeddingDate(
        51.5074,
        -0.1278,
        weddingDate,
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('detailed_forecast');
      expect(result.data.confidence).toBe(0.9);
    });

    it('should return historical averages for far-future wedding dates', async () => {
      const weddingDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 30 days from now

      const result = await weatherService.getWeatherForWeddingDate(
        51.5074,
        -0.1278,
        weddingDate,
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('historical_average');
      expect(result.data.confidence).toBe(0.7);
      expect(result.data.weddingRelevant.seasonalConsiderations).toBeInstanceOf(
        Array,
      );
      expect(result.data.weddingRelevant.recommendedBackupPlans).toBeInstanceOf(
        Array,
      );
    });
  });

  describe('analyzeWeatherRisk', () => {
    it('should analyze weather risk for outdoor weddings', async () => {
      const weddingDate = new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Mock the wedding weather data
      jest
        .spyOn(weatherService, 'getWeatherForWeddingDate')
        .mockResolvedValueOnce({
          success: true,
          data: {
            temperature: 25,
            precipitation: 0,
            windSpeed: 5,
            humidity: 60,
            confidence: 0.9,
          },
        });

      const result = await weatherService.analyzeWeatherRisk(
        51.5074,
        -0.1278,
        weddingDate,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        riskLevel: expect.stringMatching(/^(LOW|MEDIUM|HIGH|CRITICAL)$/),
        recommendations: expect.any(Array),
        considerations: expect.any(Array),
        alternatives: expect.any(Array),
        confidence: expect.any(Number),
      });
    });

    it('should identify high-risk weather conditions', async () => {
      const weddingDate = new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Mock severe weather conditions
      jest
        .spyOn(weatherService, 'getWeatherForWeddingDate')
        .mockResolvedValueOnce({
          success: true,
          data: {
            temperature: 35, // Hot
            precipitation: 10, // Heavy rain
            windSpeed: 30, // Strong winds
            humidity: 90,
            confidence: 0.8,
          },
        });

      const result = await weatherService.analyzeWeatherRisk(
        51.5074,
        -0.1278,
        weddingDate,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data.riskLevel).toBe('CRITICAL');
      expect(result.data.recommendations.length).toBeGreaterThan(0);
      expect(result.data.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('Data Transformation', () => {
    it('should assess photography conditions correctly', async () => {
      const mockApiResponse = {
        main: { temp: 20, humidity: 65, pressure: 1013 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 5, deg: 180 },
        clouds: { all: 20 }, // Low cloud cover = good lighting
        visibility: 15000, // Excellent visibility
        name: 'London',
        sys: { country: 'GB' },
        coord: { lat: 51.5074, lon: -0.1278 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.data.weddingRelevant.photographyConditions).toEqual({
        lighting: 'good',
        visibility: 'excellent',
        recommendations: [],
      });
    });

    it('should assess outdoor viability correctly', async () => {
      const mockApiResponse = {
        main: { temp: 22, humidity: 60, pressure: 1013 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 8, deg: 180 }, // Moderate wind
        clouds: { all: 0 },
        visibility: 10000,
        rain: undefined, // No precipitation
        name: 'London',
        sys: { country: 'GB' },
        coord: { lat: 51.5074, lon: -0.1278 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.data.weddingRelevant.outdoorViability).toEqual({
        viability: 'excellent',
        score: 10,
      });
    });

    it('should assess guest comfort correctly', async () => {
      const mockApiResponse = {
        main: { temp: 23, humidity: 55, pressure: 1013 }, // Comfortable conditions
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 8, deg: 180 }, // Gentle breeze
        clouds: { all: 10 },
        visibility: 10000,
        name: 'London',
        sys: { country: 'GB' },
        coord: { lat: 51.5074, lon: -0.1278 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.data.weddingRelevant.guestComfort.rating).toBe('high');
      expect(result.data.weddingRelevant.guestComfort.factors).toEqual([
        'Comfortable temperature for guests',
        'Comfortable humidity levels',
        'Gentle breeze conditions',
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API key errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized - Invalid API key',
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(false);
      expect(result.code).toBe('API_KEY_ERROR');
      expect(result.error).toBe('Weather service configuration error');
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(false);
      expect(result.code).toBe('TIMEOUT_ERROR');
      expect(result.error).toBe('Weather service timeout - please try again');
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);

      expect(result.success).toBe(false);
      expect(result.code).toBe('RATE_LIMIT_ERROR');
      expect(result.error).toBe('Weather service rate limit exceeded');
    });
  });

  describe('Caching Mechanism', () => {
    it('should cache data with correct TTL for current weather', async () => {
      const mockApiResponse = {
        main: { temp: 20, humidity: 65, pressure: 1013 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 3, deg: 180 },
        clouds: { all: 10 },
        visibility: 10000,
        name: 'London',
        sys: { country: 'GB' },
        coord: { lat: 51.5074, lon: -0.1278 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // First call
      await weatherService.getCurrentWeather(51.5074, -0.1278);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call within cache TTL
      const result = await weatherService.getCurrentWeather(51.5074, -0.1278);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only one API call
      expect(result.cached).toBe(true);
    });

    it('should use different cache keys for different coordinates', async () => {
      const mockApiResponse = {
        main: { temp: 20, humidity: 65, pressure: 1013 },
        weather: [{ main: 'Clear', description: 'clear sky' }],
        wind: { speed: 3, deg: 180 },
        clouds: { all: 10 },
        visibility: 10000,
        name: 'Test City',
        sys: { country: 'GB' },
        coord: { lat: 50, lon: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      // Different coordinates should result in separate API calls
      await weatherService.getCurrentWeather(51.5074, -0.1278);
      await weatherService.getCurrentWeather(52.5074, -0.1278);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Missing API Key Handling', () => {
    it('should warn when API key is not configured', () => {
      delete process.env.OPENWEATHER_API_KEY;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create a new service instance without API key
      const weatherServiceNoKey = new (weatherService.constructor as any)();

      expect(consoleSpy).toHaveBeenCalledWith(
        'OpenWeather API key not configured',
      );

      consoleSpy.mockRestore();
    });
  });
});
