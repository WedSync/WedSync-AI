import axios, { AxiosResponse, AxiosError } from 'axios';
import { BaseIntegrationService } from './BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  WeatherConfig,
  WeatherData,
  WeatherAlert,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface OpenWeatherResponse {
  coord: { lon: number; lat: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
}

interface WeatherForecastResponse {
  list: Array<{
    dt: number;
    main: {
      temp_min: number;
      temp_max: number;
    };
    weather: Array<{
      main: string;
      description: string;
    }>;
    pop: number; // Probability of precipitation
  }>;
}

interface GeocodeResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
  }>;
}

export class WeatherIntegrationService extends BaseIntegrationService {
  protected serviceName = 'weather-service';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(config: WeatherConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/weather', {
        params: {
          q: 'London',
          appid: this.credentials.apiKey,
          units: 'metric',
        },
      });
      return response.success;
    } catch (error) {
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    // Weather API typically uses API keys, not refreshable tokens
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options: any = {},
  ): Promise<IntegrationResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    this.logRequest(method, endpoint, options.params);

    try {
      const response: AxiosResponse = await axios({
        url,
        method,
        params: {
          appid: this.credentials.apiKey,
          ...options.params,
        },
        timeout: this.config.timeout,
      });

      this.logResponse(method, endpoint, response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);

      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          throw new IntegrationError(
            'Invalid API key',
            'INVALID_API_KEY',
            ErrorCategory.AUTHENTICATION,
            sanitizedError,
          );
        }

        if (error.response?.status === 429) {
          throw new IntegrationError(
            'Weather API rate limit exceeded',
            'RATE_LIMIT_EXCEEDED',
            ErrorCategory.RATE_LIMIT,
            sanitizedError,
          );
        }
      }

      throw new IntegrationError(
        'Weather API request failed',
        'API_REQUEST_FAILED',
        ErrorCategory.EXTERNAL_API,
        sanitizedError,
      );
    }
  }

  // Weather Data Methods
  async getCurrentWeather(
    location: string,
  ): Promise<IntegrationResponse<WeatherData>> {
    const cacheKey = `current:${location}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      const response = await this.makeRequestWithRetry('/weather', {
        params: {
          q: location,
          units: 'metric',
        },
      });

      if (response.success) {
        const weatherData = this.transformWeatherResponse(
          response.data,
          location,
        );
        this.setCachedData(cacheKey, weatherData);

        return {
          success: true,
          data: weatherData,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getWeatherByCoordinates(
    lat: number,
    lng: number,
  ): Promise<IntegrationResponse<WeatherData>> {
    const cacheKey = `coords:${lat}:${lng}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      const response = await this.makeRequestWithRetry('/weather', {
        params: {
          lat,
          lon: lng,
          units: 'metric',
        },
      });

      if (response.success) {
        const weatherData = this.transformWeatherResponse(
          response.data,
          `${lat},${lng}`,
        );
        this.setCachedData(cacheKey, weatherData);

        return {
          success: true,
          data: weatherData,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getWeatherForecast(
    location: string,
    days: number = 5,
  ): Promise<IntegrationResponse<WeatherData>> {
    if (days < 1 || days > 5) {
      throw new Error('Forecast days must be between 1 and 5');
    }

    const cacheKey = `forecast:${location}:${days}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      const response = await this.makeRequestWithRetry('/forecast', {
        params: {
          q: location,
          units: 'metric',
          cnt: days * 8, // 8 forecasts per day (every 3 hours)
        },
      });

      if (response.success) {
        const weatherData = this.transformForecastResponse(
          response.data,
          location,
        );
        this.setCachedData(cacheKey, weatherData);

        return {
          success: true,
          data: weatherData,
        };
      }

      return response;
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async geocodeLocation(
    address: string,
  ): Promise<IntegrationResponse<{ lat: number; lng: number }>> {
    const cacheKey = `geocode:${address}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    try {
      // Use Google Geocoding API or OpenWeatherMap's geocoding
      const response = await this.makeRequestWithRetry('/geo/1.0/direct', {
        params: {
          q: address,
          limit: 1,
        },
      });

      if (response.success && response.data.length > 0) {
        const location = {
          lat: response.data[0].lat,
          lng: response.data[0].lon,
        };

        this.setCachedData(cacheKey, location);

        return {
          success: true,
          data: location,
        };
      }

      return {
        success: false,
        error: 'Location not found',
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  async getWeatherAlerts(
    lat: number,
    lng: number,
  ): Promise<IntegrationResponse<WeatherAlert[]>> {
    try {
      const response = await this.makeRequestWithRetry('/onecall', {
        params: {
          lat,
          lon: lng,
          exclude: 'minutely,hourly,daily',
          units: 'metric',
        },
      });

      if (response.success && response.data.alerts) {
        const alerts = response.data.alerts.map((alert: any) =>
          this.transformWeatherAlert(alert),
        );

        return {
          success: true,
          data: alerts,
        };
      }

      return {
        success: true,
        data: [],
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  // Weather monitoring for events
  async monitorWeatherForEvent(
    eventLocation: string,
    eventDate: Date,
    alertThresholds: {
      minTemp?: number;
      maxTemp?: number;
      maxWindSpeed?: number;
      maxPrecipitation?: number;
    } = {},
  ): Promise<
    IntegrationResponse<{ alerts: WeatherAlert[]; forecast: WeatherData }>
  > {
    try {
      // Get coordinates for location
      const geocodeResult = await this.geocodeLocation(eventLocation);

      if (!geocodeResult.success) {
        return {
          success: false,
          error: 'Could not geocode event location',
        };
      }

      const { lat, lng } = geocodeResult.data;

      // Get weather forecast
      const forecastResult = await this.getWeatherForecast(eventLocation);

      if (!forecastResult.success) {
        return forecastResult;
      }

      // Check for weather alerts
      const alertsResult = await this.getWeatherAlerts(lat, lng);
      const existingAlerts = alertsResult.success ? alertsResult.data : [];

      // Generate custom alerts based on thresholds
      const customAlerts = this.generateCustomAlerts(
        forecastResult.data,
        eventDate,
        alertThresholds,
      );

      return {
        success: true,
        data: {
          alerts: [...existingAlerts, ...customAlerts],
          forecast: forecastResult.data,
        },
      };
    } catch (error) {
      const categorized = this.categorizeError(error);
      return {
        success: false,
        error: categorized.userMessage,
      };
    }
  }

  // Cache Management
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Data Transformation Methods
  private transformWeatherResponse(
    response: OpenWeatherResponse,
    location: string,
  ): WeatherData {
    const currentWeather = response.weather[0];

    return {
      location: response.name || location,
      current: {
        temperature: Math.round(response.main.temp),
        condition: currentWeather.main.toLowerCase(),
        humidity: response.main.humidity,
        windSpeed: Math.round(response.wind.speed * 3.6), // Convert m/s to km/h
        description: currentWeather.description,
      },
      forecast: [], // Will be filled by forecast request
    };
  }

  private transformForecastResponse(
    response: WeatherForecastResponse,
    location: string,
  ): WeatherData {
    // Group forecasts by day
    const dailyForecasts = new Map<string, any>();

    response.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toDateString();

      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, {
          date: new Date(item.dt * 1000).toISOString().split('T')[0],
          high: item.main.temp_max,
          low: item.main.temp_min,
          condition: item.weather[0].main.toLowerCase(),
          precipitation: Math.round(item.pop * 100),
          description: item.weather[0].description,
        });
      } else {
        const existing = dailyForecasts.get(date);
        existing.high = Math.max(existing.high, item.main.temp_max);
        existing.low = Math.min(existing.low, item.main.temp_min);
        existing.precipitation = Math.max(
          existing.precipitation,
          Math.round(item.pop * 100),
        );
      }
    });

    return {
      location,
      current: {
        temperature: 0,
        condition: 'unknown',
        humidity: 0,
        windSpeed: 0,
        description: '',
      },
      forecast: Array.from(dailyForecasts.values()).map((forecast) => ({
        ...forecast,
        high: Math.round(forecast.high),
        low: Math.round(forecast.low),
      })),
    };
  }

  private transformWeatherAlert(alert: any): WeatherAlert {
    return {
      id: alert.uuid || `alert-${Date.now()}`,
      type: this.determineAlertType(alert.event),
      severity: this.determineAlertSeverity(alert.severity),
      title: alert.event,
      description: alert.description,
      startTime: new Date(alert.start * 1000),
      endTime: alert.end ? new Date(alert.end * 1000) : undefined,
      areas: alert.areas || [],
    };
  }

  private determineAlertType(event: string): WeatherAlert['type'] {
    const eventLower = event.toLowerCase();

    if (eventLower.includes('wind')) return 'high_wind';
    if (eventLower.includes('rain') || eventLower.includes('snow'))
      return 'precipitation';
    if (
      eventLower.includes('temperature') ||
      eventLower.includes('heat') ||
      eventLower.includes('cold')
    )
      return 'temperature';

    return 'severe_weather';
  }

  private determineAlertSeverity(severity: string): WeatherAlert['severity'] {
    const severityLower = severity?.toLowerCase() || 'moderate';

    if (severityLower.includes('extreme')) return 'extreme';
    if (severityLower.includes('severe')) return 'severe';
    if (severityLower.includes('moderate')) return 'moderate';

    return 'minor';
  }

  private generateCustomAlerts(
    weatherData: WeatherData,
    eventDate: Date,
    thresholds: any,
  ): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    const eventDateStr = eventDate.toISOString().split('T')[0];

    // Find forecast for event date
    const eventForecast = weatherData.forecast.find(
      (f) => f.date === eventDateStr,
    );

    if (!eventForecast) return alerts;

    // Check temperature thresholds
    if (thresholds.minTemp && eventForecast.low < thresholds.minTemp) {
      alerts.push({
        id: `temp-low-${Date.now()}`,
        type: 'temperature',
        severity: 'moderate',
        title: 'Low Temperature Alert',
        description: `Temperature expected to drop to ${eventForecast.low}°C, below threshold of ${thresholds.minTemp}°C`,
        startTime: eventDate,
        areas: [weatherData.location],
      });
    }

    if (thresholds.maxTemp && eventForecast.high > thresholds.maxTemp) {
      alerts.push({
        id: `temp-high-${Date.now()}`,
        type: 'temperature',
        severity: 'moderate',
        title: 'High Temperature Alert',
        description: `Temperature expected to reach ${eventForecast.high}°C, above threshold of ${thresholds.maxTemp}°C`,
        startTime: eventDate,
        areas: [weatherData.location],
      });
    }

    // Check precipitation threshold
    if (
      thresholds.maxPrecipitation &&
      eventForecast.precipitation > thresholds.maxPrecipitation
    ) {
      alerts.push({
        id: `precip-${Date.now()}`,
        type: 'precipitation',
        severity: 'moderate',
        title: 'Precipitation Alert',
        description: `${eventForecast.precipitation}% chance of precipitation expected, above threshold of ${thresholds.maxPrecipitation}%`,
        startTime: eventDate,
        areas: [weatherData.location],
      });
    }

    return alerts;
  }
}
