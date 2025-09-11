import { OpenWeatherService } from '../openweather-service';
import {
  OpenWeatherMapResponse,
  WeatherApiResponse,
  WeddingWeatherData,
  WeatherAnalytics,
} from '@/types/weather';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variable
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    OPENWEATHER_API_KEY: 'test-api-key-12345',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

const mockOpenWeatherResponse: OpenWeatherMapResponse = {
  lat: 51.5074,
  lon: -0.1278,
  timezone: 'Europe/London',
  timezone_offset: 0,
  current: {
    dt: 1718384000,
    sunrise: 1718341200,
    sunset: 1718394000,
    temp: 22.5,
    feels_like: 24.0,
    pressure: 1013,
    humidity: 65,
    dew_point: 15.8,
    uvi: 6.2,
    clouds: 30,
    visibility: 10000,
    wind_speed: 12.5,
    wind_deg: 180,
    wind_gust: 18.0,
    weather: [
      {
        id: 801,
        main: 'Clouds',
        description: 'few clouds',
        icon: '02d',
      },
    ],
  },
  hourly: [
    {
      dt: 1718384000,
      temp: 22.5,
      feels_like: 24.0,
      pressure: 1013,
      humidity: 65,
      dew_point: 15.8,
      uvi: 6.2,
      clouds: 30,
      visibility: 10000,
      wind_speed: 12.5,
      wind_deg: 180,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
      pop: 0.1,
    },
    {
      dt: 1718387600,
      temp: 24.0,
      feels_like: 25.5,
      pressure: 1012,
      humidity: 60,
      dew_point: 16.0,
      uvi: 7.5,
      clouds: 25,
      visibility: 10000,
      wind_speed: 14.0,
      wind_deg: 185,
      wind_gust: 20.0,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
      ],
      pop: 0.05,
      rain: { '1h': 0.2 },
    },
  ],
  daily: [
    {
      dt: 1718320800,
      sunrise: 1718341200,
      sunset: 1718394000,
      moonrise: 1718350000,
      moonset: 1718400000,
      moon_phase: 0.5,
      summary: 'Pleasant day with few clouds',
      temp: {
        day: 22.5,
        min: 15.0,
        max: 25.0,
        night: 18.0,
        eve: 21.0,
        morn: 16.0,
      },
      feels_like: {
        day: 24.0,
        night: 19.0,
        eve: 22.0,
        morn: 17.0,
      },
      pressure: 1013,
      humidity: 65,
      dew_point: 15.8,
      wind_speed: 12.5,
      wind_deg: 180,
      weather: [
        {
          id: 801,
          main: 'Clouds',
          description: 'few clouds',
          icon: '02d',
        },
      ],
      clouds: 30,
      pop: 0.1,
      uvi: 6.2,
    },
    {
      dt: 1718407200,
      sunrise: 1718427600,
      sunset: 1718480400,
      moonrise: 1718436400,
      moonset: 1718486400,
      moon_phase: 0.6,
      summary: 'Sunny wedding day',
      temp: {
        day: 26.0,
        min: 18.0,
        max: 28.0,
        night: 20.0,
        eve: 24.0,
        morn: 19.0,
      },
      feels_like: {
        day: 27.0,
        night: 21.0,
        eve: 25.0,
        morn: 20.0,
      },
      pressure: 1018,
      humidity: 55,
      dew_point: 16.5,
      wind_speed: 8.0,
      wind_deg: 90,
      weather: [
        {
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        },
      ],
      clouds: 10,
      pop: 0.05,
      uvi: 8.5,
    },
  ],
  alerts: [
    {
      sender_name: 'MetOffice',
      event: 'High Wind Warning',
      start: 1718400000,
      end: 1718486400,
      description: 'Strong winds expected',
      tags: ['wind', 'outdoor-events'],
    },
  ],
};

describe('OpenWeatherService', () => {
  let service: OpenWeatherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenWeatherService();

    // Clear internal cache before each test
    service.clearCache();
  });

  describe('constructor', () => {
    it('initializes with API key from environment', () => {
      expect(() => new OpenWeatherService()).not.toThrow();
    });

    it('throws error when API key is missing', () => {
      const originalKey = process.env.OPENWEATHER_API_KEY;
      delete process.env.OPENWEATHER_API_KEY;

      expect(() => new OpenWeatherService()).toThrow(
        'OpenWeatherMap API key not configured',
      );

      process.env.OPENWEATHER_API_KEY = originalKey;
    });
  });

  describe('getCurrentWeather', () => {
    const lat = 51.5074;
    const lon = -0.1278;

    it('successfully fetches current weather data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOpenWeatherResponse);
      expect(result.cacheHit).toBe(false);
      expect(result.source).toBe('openweathermap');
      expect(result.timestamp).toBeDefined();
    });

    it('returns cached data when available', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      // First call
      await service.getCurrentWeather(lat, lon);

      // Second call should return cached data
      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(true);
      expect(result.cacheHit).toBe(true);
      expect(result.source).toBe('cache');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        'OpenWeatherMap API error: 401 Unauthorized',
      );
      expect(result.cacheHit).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching weather data:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('constructs correct API URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      await service.getCurrentWeather(lat, lon);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=test-api-key-12345&units=metric&exclude=minutely`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    });
  });

  describe('getWeatherForecast', () => {
    const lat = 51.5074;
    const lon = -0.1278;

    it('successfully fetches weather forecast', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      const result = await service.getWeatherForecast(lat, lon, 7);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOpenWeatherResponse);
      expect(result.cacheHit).toBe(false);
      expect(result.source).toBe('openweathermap');
    });

    it('limits daily forecast to requested number of days', async () => {
      const responseWithMoreDays = {
        ...mockOpenWeatherResponse,
        daily: [
          ...mockOpenWeatherResponse.daily!,
          ...Array(10).fill(mockOpenWeatherResponse.daily![0]),
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => responseWithMoreDays,
      });

      const result = await service.getWeatherForecast(lat, lon, 2);

      expect(result.success).toBe(true);
      expect(result.data?.daily).toHaveLength(2);
    });

    it('uses default 8 days when days parameter not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      await service.getWeatherForecast(lat, lon);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=test-api-key-12345&units=metric`,
      );
    });

    it('returns cached forecast data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      // First call
      await service.getWeatherForecast(lat, lon, 7);

      // Second call should return cached data
      const result = await service.getWeatherForecast(lat, lon, 7);

      expect(result.cacheHit).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWeatherForWeddingDate', () => {
    const lat = 51.5074;
    const lon = -0.1278;
    const weddingDate = '2024-06-15T14:00:00Z';

    it('successfully processes weather for wedding date', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      const result = await service.getWeatherForWeddingDate(
        lat,
        lon,
        weddingDate,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.weddingDate).toBe(weddingDate);
      expect(result.data?.venue).toEqual({
        name: '',
        lat,
        lon,
        address: '',
      });
    });

    it('filters hourly forecast to wedding day only', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      const result = await service.getWeatherForWeddingDate(
        lat,
        lon,
        weddingDate,
      );

      expect(result.success).toBe(true);

      // All hourly forecasts should be for the wedding day
      result.data?.hourlyForecast.forEach((hour) => {
        const hourDate = new Date(hour.dt * 1000);
        const weddingDateObj = new Date(weddingDate);
        expect(hourDate.toDateString()).toBe(weddingDateObj.toDateString());
      });
    });

    it('includes default weather settings', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      const result = await service.getWeatherForWeddingDate(
        lat,
        lon,
        weddingDate,
      );

      expect(result.success).toBe(true);
      expect(result.data?.settings).toEqual({
        alertThresholds: {
          precipitation: 0.7,
          windSpeed: 25,
          temperature: { min: 10, max: 35 },
          visibility: 1000,
          uvIndex: 8,
        },
        notifications: {
          email: true,
          sms: true,
          push: true,
          webNotifications: true,
        },
        checkFrequency: 'every6h',
        leadTime: {
          minHours: 24,
          maxDays: 14,
        },
        autoTriggerBackups: false,
      });
    });

    it('handles failed weather data fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.getWeatherForWeddingDate(
        lat,
        lon,
        weddingDate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch weather data');
    });
  });

  describe('analyzeWeatherRisk', () => {
    const lat = 51.5074;
    const lon = -0.1278;
    const weddingDate = '2024-06-15T14:00:00Z';

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });
    });

    it('successfully analyzes weather risk', async () => {
      const result = await service.analyzeWeatherRisk(
        lat,
        lon,
        weddingDate,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.risk).toBeDefined();
      expect(result.data?.risk.overall).toMatch(/^(low|medium|high|extreme)$/);
      expect(result.data?.recommendations).toBeDefined();
      expect(result.data?.optimalScheduling).toBeDefined();
    });

    it('calculates risk scores correctly for outdoor wedding', async () => {
      const result = await service.analyzeWeatherRisk(
        lat,
        lon,
        weddingDate,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data?.risk.precipitation).toBeGreaterThanOrEqual(0);
      expect(result.data?.risk.precipitation).toBeLessThanOrEqual(100);
      expect(result.data?.risk.temperature).toBeGreaterThanOrEqual(0);
      expect(result.data?.risk.temperature).toBeLessThanOrEqual(100);
      expect(result.data?.risk.wind).toBeGreaterThanOrEqual(0);
      expect(result.data?.risk.wind).toBeLessThanOrEqual(100);
      expect(result.data?.risk.visibility).toBeGreaterThanOrEqual(0);
      expect(result.data?.risk.visibility).toBeLessThanOrEqual(100);
    });

    it('calculates risk scores correctly for indoor wedding', async () => {
      const result = await service.analyzeWeatherRisk(
        lat,
        lon,
        weddingDate,
        false,
      );

      expect(result.success).toBe(true);
      // Indoor weddings should have different risk weighting
      expect(result.data?.risk).toBeDefined();
    });

    it('includes optimal scheduling recommendations', async () => {
      const result = await service.analyzeWeatherRisk(
        lat,
        lon,
        weddingDate,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data?.optimalScheduling).toEqual({
        ceremony: '14:00',
        photography: ['10:00', '16:00'],
        reception: '18:00',
      });
    });

    it('handles missing wedding day forecast', async () => {
      const responseWithoutWeddingDay = {
        ...mockOpenWeatherResponse,
        daily: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => responseWithoutWeddingDay,
      });

      const result = await service.analyzeWeatherRisk(
        lat,
        lon,
        weddingDate,
        true,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No forecast available for wedding date');
    });
  });

  describe('risk calculation methods', () => {
    beforeEach(() => {
      // Access private methods through type assertion
      service = service as any;
    });

    describe('calculatePrecipitationRisk', () => {
      it('calculates risk based on probability of precipitation', () => {
        const risk1 = (service as any).calculatePrecipitationRisk(0.2, 0);
        expect(risk1).toBe(20); // 20% chance = 20 risk

        const risk2 = (service as any).calculatePrecipitationRisk(0.8, 0);
        expect(risk2).toBe(80); // 80% chance = 80 risk
      });

      it('calculates risk based on rain amount', () => {
        const risk = (service as any).calculatePrecipitationRisk(0.1, 5);
        expect(risk).toBe(50); // 5mm rain = 50 risk (higher than 10% chance)
      });

      it('uses maximum of pop and rain risk', () => {
        const risk = (service as any).calculatePrecipitationRisk(0.7, 2);
        expect(risk).toBe(70); // 70% > 20 (2mm rain)
      });

      it('caps rain risk at 100', () => {
        const risk = (service as any).calculatePrecipitationRisk(0.1, 15);
        expect(risk).toBe(100); // 15mm would be 150, but capped at 100
      });
    });

    describe('calculateTemperatureRisk', () => {
      it('returns high risk for extreme temperatures', () => {
        expect((service as any).calculateTemperatureRisk(-5)).toBe(100);
        expect((service as any).calculateTemperatureRisk(45)).toBe(100);
      });

      it('returns medium-high risk for uncomfortable temperatures', () => {
        expect((service as any).calculateTemperatureRisk(2)).toBe(80);
        expect((service as any).calculateTemperatureRisk(38)).toBe(80);
      });

      it('returns low risk for comfortable temperatures', () => {
        expect((service as any).calculateTemperatureRisk(20)).toBe(20);
        expect((service as any).calculateTemperatureRisk(22)).toBe(20);
      });

      it('returns graduated risk for borderline temperatures', () => {
        expect((service as any).calculateTemperatureRisk(8)).toBe(60);
        expect((service as any).calculateTemperatureRisk(32)).toBe(60);
        expect((service as any).calculateTemperatureRisk(12)).toBe(40);
        expect((service as any).calculateTemperatureRisk(28)).toBe(40);
      });
    });

    describe('calculateWindRisk', () => {
      it('returns high risk for dangerous wind speeds', () => {
        expect((service as any).calculateWindRisk(55)).toBe(100);
        expect((service as any).calculateWindRisk(45)).toBe(80);
      });

      it('returns medium risk for strong winds', () => {
        expect((service as any).calculateWindRisk(35)).toBe(60);
        expect((service as any).calculateWindRisk(25)).toBe(40);
      });

      it('returns low risk for light winds', () => {
        expect((service as any).calculateWindRisk(15)).toBe(20);
        expect((service as any).calculateWindRisk(5)).toBe(20);
      });
    });

    describe('calculateVisibilityRisk', () => {
      it('returns high risk for poor visibility', () => {
        expect((service as any).calculateVisibilityRisk(500)).toBe(100);
        expect((service as any).calculateVisibilityRisk(3000)).toBe(60);
      });

      it('returns medium risk for reduced visibility', () => {
        expect((service as any).calculateVisibilityRisk(7000)).toBe(30);
      });

      it('returns low risk for good visibility', () => {
        expect((service as any).calculateVisibilityRisk(15000)).toBe(10);
        expect((service as any).calculateVisibilityRisk(10000)).toBe(10);
      });
    });

    describe('calculateOverallRisk', () => {
      it('calculates weighted risk for outdoor wedding', () => {
        const risk = (service as any).calculateOverallRisk(
          80,
          20,
          60,
          10,
          true,
        );
        // outdoor weights: precipitation: 0.4, temperature: 0.2, wind: 0.3, visibility: 0.1
        // 80*0.4 + 20*0.2 + 60*0.3 + 10*0.1 = 32 + 4 + 18 + 1 = 55
        expect(risk).toBe('medium');
      });

      it('calculates weighted risk for indoor wedding', () => {
        const risk = (service as any).calculateOverallRisk(
          80,
          60,
          30,
          80,
          false,
        );
        // indoor weights: precipitation: 0.2, temperature: 0.3, wind: 0.1, visibility: 0.4
        // 80*0.2 + 60*0.3 + 30*0.1 + 80*0.4 = 16 + 18 + 3 + 32 = 69
        expect(risk).toBe('high');
      });

      it('returns correct risk levels', () => {
        expect(
          (service as any).calculateOverallRisk(100, 100, 100, 100, true),
        ).toBe('extreme');
        expect(
          (service as any).calculateOverallRisk(80, 80, 80, 80, true),
        ).toBe('extreme');
        expect(
          (service as any).calculateOverallRisk(60, 60, 60, 60, true),
        ).toBe('high');
        expect(
          (service as any).calculateOverallRisk(40, 40, 40, 40, true),
        ).toBe('medium');
        expect(
          (service as any).calculateOverallRisk(20, 20, 20, 20, true),
        ).toBe('low');
      });
    });
  });

  describe('caching system', () => {
    const lat = 51.5074;
    const lon = -0.1278;

    it('caches data with correct expiry', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      await service.getCurrentWeather(lat, lon);

      const stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('expires cached data after cache duration', async () => {
      jest.useFakeTimers();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      // First call
      await service.getCurrentWeather(lat, lon);

      // Fast-forward past cache expiry (1 hour + 1 minute)
      jest.advanceTimersByTime(61 * 60 * 1000);

      // Second call should fetch new data
      await service.getCurrentWeather(lat, lon);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('tracks cache hits correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      // First call - cache miss
      await service.getCurrentWeather(lat, lon);

      // Second call - cache hit
      await service.getCurrentWeather(lat, lon);

      // Third call - another cache hit
      await service.getCurrentWeather(lat, lon);

      const stats = service.getCacheStats();
      expect(stats.totalHits).toBe(2);
    });

    it('clears cache correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      await service.getCurrentWeather(lat, lon);

      let stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(1);

      service.clearCache();

      stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('uses different cache keys for different parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockOpenWeatherResponse,
      });

      await service.getCurrentWeather(lat, lon);
      await service.getCurrentWeather(lat + 0.1, lon);
      await service.getWeatherForecast(lat, lon, 7);

      const stats = service.getCacheStats();
      expect(stats.totalEntries).toBe(3);
    });
  });

  describe('error handling', () => {
    const lat = 51.5074;
    const lon = -0.1278;

    it('handles malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');

      consoleSpy.mockRestore();
    });

    it('handles fetch rejections', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');

      consoleSpy.mockRestore();
    });

    it('handles unknown errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('String error');

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.getCurrentWeather(lat, lon);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');

      consoleSpy.mockRestore();
    });
  });
});
