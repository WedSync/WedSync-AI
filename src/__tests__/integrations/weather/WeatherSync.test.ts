/**
 * WeatherSync Test Suite
 * Tests for real-time weather data synchronization system
 * WS-220: Weather API Integration - Team C Round 1
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  WeatherSync,
  weatherSync,
} from '@/lib/integrations/weather/WeatherSync';

// Mock Supabase client
const mockSupabaseClient = {
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  })),
  from: jest.fn(() => ({
    insert: jest
      .fn()
      .mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockResolvedValue({
        data: { wedding_id: 'test-wedding', venue_id: 'test-venue' },
        error: null,
      }),
    upsert: jest.fn().mockResolvedValue({ error: null }),
  })),
};

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: () => mockSupabaseClient,
}));

// Mock fetch for weather API calls
global.fetch = jest.fn();

describe('WeatherSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WEATHER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.WEATHER_API_KEY;
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const weatherSyncInstance = new WeatherSync();
      await expect(weatherSyncInstance.initialize()).resolves.not.toThrow();
    });

    it('should warn when no API key is provided', () => {
      delete process.env.WEATHER_API_KEY;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      new WeatherSync();

      expect(consoleSpy).toHaveBeenCalledWith(
        'WEATHER_API_KEY not configured - weather integration will be limited',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Subscription Management', () => {
    it('should create a weather subscription successfully', async () => {
      const weatherSyncInstance = new WeatherSync();
      await weatherSyncInstance.initialize();

      const subscriptionId = await weatherSyncInstance.createSubscription(
        'test-wedding-id',
        'test-venue-id',
        { latitude: 51.5074, longitude: -0.1278 },
        {
          rain_alerts: true,
          wind_alerts: true,
          temperature_alerts: false,
          severe_weather_alerts: true,
          notification_threshold: 24,
        },
        {
          email: true,
          sms: false,
          in_app: true,
          webhook_url: 'https://example.com/webhook',
        },
      );

      expect(subscriptionId).toBe('test-id');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'weather_subscriptions',
      );
    });

    it('should handle subscription creation errors', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Database error') }),
      }));

      const weatherSyncInstance = new WeatherSync();
      await weatherSyncInstance.initialize();

      await expect(
        weatherSyncInstance.createSubscription(
          'test-wedding-id',
          'test-venue-id',
          { latitude: 51.5074, longitude: -0.1278 },
          {
            rain_alerts: true,
            wind_alerts: true,
            temperature_alerts: false,
            severe_weather_alerts: true,
            notification_threshold: 24,
          },
          {
            email: true,
            sms: false,
            in_app: true,
          },
        ),
      ).rejects.toThrow();
    });
  });

  describe('Weather Data Fetching', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('weather')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                name: 'London',
                sys: { country: 'GB' },
                main: {
                  temp: 20,
                  humidity: 65,
                },
                weather: [{ description: 'clear sky' }],
                wind: {
                  speed: 5,
                  deg: 180,
                },
                visibility: 10000,
              }),
          });
        } else if (url.includes('forecast')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                list: Array(5).fill({
                  dt_txt: '2024-01-01 12:00:00',
                  main: {
                    temp_max: 22,
                    temp_min: 18,
                  },
                  weather: [{ description: 'partly cloudy' }],
                  pop: 0.1,
                  wind: { speed: 3 },
                }),
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('should fetch weather data successfully', async () => {
      const weatherSyncInstance = new WeatherSync();

      // Use reflection to access private method for testing
      const fetchWeatherData = (weatherSyncInstance as any).fetchWeatherData;
      const result = await fetchWeatherData.call(weatherSyncInstance, {
        latitude: 51.5074,
        longitude: -0.1278,
      });

      expect(result).toHaveProperty('location');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('forecast');
      expect(result.current.temperature).toBe(20);
      expect(result.forecast).toHaveLength(5);
    });

    it('should handle weather API errors', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        }),
      );

      const weatherSyncInstance = new WeatherSync();
      const fetchWeatherData = (weatherSyncInstance as any).fetchWeatherData;

      await expect(
        fetchWeatherData.call(weatherSyncInstance, {
          latitude: 51.5074,
          longitude: -0.1278,
        }),
      ).rejects.toThrow('Weather API request failed');
    });
  });

  describe('Alert Generation', () => {
    it('should generate rain alerts correctly', async () => {
      const weatherSyncInstance = new WeatherSync();

      const mockWeatherData = {
        current: {
          temperature: 15,
          humidity: 80,
          conditions: 'light rain',
          wind_speed: 5,
          wind_direction: 180,
          visibility: 8,
          precipitation: 2.5,
        },
        forecast: [],
      };

      const mockSubscription = {
        id: 'test-sub',
        wedding_id: 'test-wedding',
        venue_id: 'test-venue',
        alert_preferences: {
          rain_alerts: true,
          wind_alerts: false,
          temperature_alerts: false,
          severe_weather_alerts: false,
          notification_threshold: 24,
        },
      };

      const generateWeatherAlerts = (weatherSyncInstance as any)
        .generateWeatherAlerts;
      const alerts = generateWeatherAlerts.call(
        weatherSyncInstance,
        mockWeatherData,
        mockSubscription,
      );

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveProperty('type', 'rain');
      expect(alerts[0]).toHaveProperty('severity', 'medium');
      expect(alerts[0].message).toContain('2.5mm/h');
    });

    it('should generate wind alerts for high wind speeds', async () => {
      const weatherSyncInstance = new WeatherSync();

      const mockWeatherData = {
        current: {
          temperature: 15,
          humidity: 60,
          conditions: 'windy',
          wind_speed: 25,
          wind_direction: 180,
          visibility: 10,
          precipitation: 0,
        },
        forecast: [],
      };

      const mockSubscription = {
        id: 'test-sub',
        wedding_id: 'test-wedding',
        venue_id: 'test-venue',
        alert_preferences: {
          rain_alerts: false,
          wind_alerts: true,
          temperature_alerts: false,
          severe_weather_alerts: false,
          notification_threshold: 24,
        },
      };

      const generateWeatherAlerts = (weatherSyncInstance as any)
        .generateWeatherAlerts;
      const alerts = generateWeatherAlerts.call(
        weatherSyncInstance,
        mockWeatherData,
        mockSubscription,
      );

      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toHaveProperty('type', 'high_wind');
      expect(alerts[0]).toHaveProperty('severity', 'high');
      expect(alerts[0].message).toContain('25 m/s');
    });
  });

  describe('Cleanup', () => {
    it('should disconnect and cleanup resources', async () => {
      const weatherSyncInstance = new WeatherSync();
      await weatherSyncInstance.initialize();

      await expect(weatherSyncInstance.disconnect()).resolves.not.toThrow();
    });
  });
});

// Integration tests
describe('WeatherSync Integration', () => {
  it('should export a singleton instance', () => {
    expect(weatherSync).toBeInstanceOf(WeatherSync);
  });

  it('should handle real-time data changes', async () => {
    await weatherSync.initialize();

    const handleWeatherDataChange = (weatherSync as any)
      .handleWeatherDataChange;
    expect(() => {
      handleWeatherDataChange.call(weatherSync, {
        eventType: 'INSERT',
        new: { id: 'test-data', wedding_id: 'test-wedding' },
      });
    }).not.toThrow();
  });
});
