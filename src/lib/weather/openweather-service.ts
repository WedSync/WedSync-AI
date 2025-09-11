/**
 * OpenWeatherMap API Service
 * Provides weather data integration for wedding planning
 */

import {
  OpenWeatherMapResponse,
  WeatherApiResponse,
  WeatherCacheEntry,
  WeatherAnalytics,
  WeatherHistoryPattern,
  WeddingWeatherData,
} from '@/types/weather';

export class OpenWeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/3.0/onecall';
  private cache = new Map<string, WeatherCacheEntry>();
  private cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenWeatherMap API key not configured');
    }
  }

  async getCurrentWeather(
    lat: number,
    lon: number,
  ): Promise<WeatherApiResponse<OpenWeatherMapResponse>> {
    try {
      const cacheKey = `current_${lat}_${lon}`;
      const cachedData = this.getCachedData(cacheKey);

      if (cachedData) {
        return {
          success: true,
          data: cachedData.data,
          timestamp: new Date().toISOString(),
          cacheHit: true,
          source: 'cache',
        };
      }

      const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&exclude=minutely`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenWeatherMapResponse = await response.json();

      // Cache the response
      this.setCachedData(cacheKey, data);

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    }
  }

  async getWeatherForecast(
    lat: number,
    lon: number,
    days: number = 8,
  ): Promise<WeatherApiResponse<OpenWeatherMapResponse>> {
    try {
      const cacheKey = `forecast_${lat}_${lon}_${days}`;
      const cachedData = this.getCachedData(cacheKey);

      if (cachedData) {
        return {
          success: true,
          data: cachedData.data,
          timestamp: new Date().toISOString(),
          cacheHit: true,
          source: 'cache',
        };
      }

      const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenWeatherMapResponse = await response.json();

      // Limit daily forecast to requested days
      if (data.daily && data.daily.length > days) {
        data.daily = data.daily.slice(0, days);
      }

      this.setCachedData(cacheKey, data);

      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    }
  }

  async getWeatherForWeddingDate(
    lat: number,
    lon: number,
    weddingDate: string,
  ): Promise<WeatherApiResponse<WeddingWeatherData>> {
    try {
      const weatherResponse = await this.getWeatherForecast(lat, lon, 14);

      if (!weatherResponse.success || !weatherResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch weather data',
          timestamp: new Date().toISOString(),
          cacheHit: false,
          source: 'openweathermap',
        };
      }

      const weddingDateTime = new Date(weddingDate);
      const weddingTimestamp = Math.floor(weddingDateTime.getTime() / 1000);

      // Find the daily forecast for the wedding date
      const weddingDayForecast = weatherResponse.data.daily?.find((day) => {
        const dayDate = new Date(day.dt * 1000);
        const weddingDateObj = new Date(weddingDate);
        return dayDate.toDateString() === weddingDateObj.toDateString();
      });

      // Get hourly forecast for wedding day
      const weddingDayHourly =
        weatherResponse.data.hourly?.filter((hour) => {
          const hourDate = new Date(hour.dt * 1000);
          const weddingDateObj = new Date(weddingDate);
          return hourDate.toDateString() === weddingDateObj.toDateString();
        }) || [];

      const weddingWeatherData: WeddingWeatherData = {
        id: `weather_${lat}_${lon}_${weddingDate}`,
        weddingId: '', // Will be set by the caller
        venue: {
          name: '', // Will be set by the caller
          lat,
          lon,
          address: '', // Will be set by the caller
        },
        current: weatherResponse.data.current,
        hourlyForecast: weddingDayHourly,
        dailyForecast: weatherResponse.data.daily || [],
        alerts: weatherResponse.data.alerts || [],
        weddingDate,
        isOutdoor: true, // Will be set by the caller
        weatherDependentEvents: [], // Will be set by the caller
        backupPlans: [], // Will be set by the caller
        settings: {
          alertThresholds: {
            precipitation: 0.7, // 70% chance
            windSpeed: 25, // km/h
            temperature: { min: 10, max: 35 }, // Celsius
            visibility: 1000, // meters
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
        },
        lastUpdated: new Date().toISOString(),
        cacheExpiry: new Date(Date.now() + this.cacheDuration).toISOString(),
      };

      return {
        success: true,
        data: weddingWeatherData,
        timestamp: new Date().toISOString(),
        cacheHit: weatherResponse.cacheHit,
        source: weatherResponse.source,
      };
    } catch (error) {
      console.error('Error processing wedding weather data:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    }
  }

  async analyzeWeatherRisk(
    lat: number,
    lon: number,
    weddingDate: string,
    isOutdoor: boolean = true,
  ): Promise<WeatherApiResponse<WeatherAnalytics>> {
    try {
      const weatherResponse = await this.getWeatherForWeddingDate(
        lat,
        lon,
        weddingDate,
      );

      if (!weatherResponse.success || !weatherResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch weather data for analysis',
          timestamp: new Date().toISOString(),
          cacheHit: false,
          source: 'openweathermap',
        };
      }

      const data = weatherResponse.data;
      const weddingDayForecast = data.dailyForecast.find((day) => {
        const dayDate = new Date(day.dt * 1000);
        const weddingDateObj = new Date(weddingDate);
        return dayDate.toDateString() === weddingDateObj.toDateString();
      });

      if (!weddingDayForecast) {
        throw new Error('No forecast available for wedding date');
      }

      // Calculate risk scores
      const precipitationRisk = this.calculatePrecipitationRisk(
        weddingDayForecast.pop,
        weddingDayForecast.rain || 0,
      );
      const temperatureRisk = this.calculateTemperatureRisk(
        weddingDayForecast.temp.day,
      );
      const windRisk = this.calculateWindRisk(weddingDayForecast.wind_speed);
      const visibilityRisk = this.calculateVisibilityRisk(
        data.current.visibility,
      );

      const overallRisk = this.calculateOverallRisk(
        precipitationRisk,
        temperatureRisk,
        windRisk,
        visibilityRisk,
        isOutdoor,
      );

      const analytics: WeatherAnalytics = {
        weddingId: data.weddingId,
        venue: {
          name: data.venue.name,
          coordinates: { lat: data.venue.lat, lon: data.venue.lon },
        },
        weddingDate,
        risk: {
          overall: overallRisk,
          precipitation: precipitationRisk,
          temperature: temperatureRisk,
          wind: windRisk,
          visibility: visibilityRisk,
        },
        recommendations: this.generateRecommendations(
          weddingDayForecast,
          data.alerts,
        ),
        optimalScheduling: this.calculateOptimalScheduling(data.hourlyForecast),
        historicalContext: await this.getHistoricalPattern(
          lat,
          lon,
          new Date(weddingDate),
        ),
        confidence: 0.85,
      };

      return {
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
        cacheHit: weatherResponse.cacheHit,
        source: weatherResponse.source,
      };
    } catch (error) {
      console.error('Error analyzing weather risk:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        source: 'openweathermap',
      };
    }
  }

  private getCachedData(key: string): WeatherCacheEntry | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = new Date();
    const expiry = new Date(cached.expiry);

    if (now > expiry) {
      this.cache.delete(key);
      return null;
    }

    cached.hits++;
    cached.lastAccessed = now.toISOString();
    return cached;
  }

  private setCachedData(key: string, data: OpenWeatherMapResponse): void {
    const now = new Date();
    const expiry = new Date(now.getTime() + this.cacheDuration);

    this.cache.set(key, {
      key,
      data,
      timestamp: now.toISOString(),
      expiry: expiry.toISOString(),
      hits: 0,
      lastAccessed: now.toISOString(),
    });
  }

  private calculatePrecipitationRisk(pop: number, rain: number): number {
    const popRisk = pop * 100;
    const rainRisk = Math.min(rain * 10, 100);
    return Math.max(popRisk, rainRisk);
  }

  private calculateTemperatureRisk(temp: number): number {
    if (temp < 0 || temp > 40) return 100;
    if (temp < 5 || temp > 35) return 80;
    if (temp < 10 || temp > 30) return 60;
    if (temp < 15 || temp > 25) return 40;
    return 20;
  }

  private calculateWindRisk(windSpeed: number): number {
    if (windSpeed > 50) return 100;
    if (windSpeed > 40) return 80;
    if (windSpeed > 30) return 60;
    if (windSpeed > 20) return 40;
    return 20;
  }

  private calculateVisibilityRisk(visibility: number): number {
    if (visibility < 1000) return 100;
    if (visibility < 5000) return 60;
    if (visibility < 10000) return 30;
    return 10;
  }

  private calculateOverallRisk(
    precipitation: number,
    temperature: number,
    wind: number,
    visibility: number,
    isOutdoor: boolean,
  ): 'low' | 'medium' | 'high' | 'extreme' {
    const weights = isOutdoor
      ? { precipitation: 0.4, temperature: 0.2, wind: 0.3, visibility: 0.1 }
      : { precipitation: 0.2, temperature: 0.3, wind: 0.1, visibility: 0.4 };

    const weightedScore =
      precipitation * weights.precipitation +
      temperature * weights.temperature +
      wind * weights.wind +
      visibility * weights.visibility;

    if (weightedScore >= 80) return 'extreme';
    if (weightedScore >= 60) return 'high';
    if (weightedScore >= 40) return 'medium';
    return 'low';
  }

  private generateRecommendations(forecast: any, alerts: any[]) {
    // Implementation for generating weather-based recommendations
    return [];
  }

  private calculateOptimalScheduling(hourlyForecast: any[]) {
    // Implementation for calculating optimal scheduling based on hourly forecast
    return {
      ceremony: '14:00',
      photography: ['10:00', '16:00'],
      reception: '18:00',
    };
  }

  private async getHistoricalPattern(
    lat: number,
    lon: number,
    date: Date,
  ): Promise<WeatherHistoryPattern> {
    // Implementation for historical weather pattern analysis
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
      historicalData: {
        avgTemp: 20,
        avgHumidity: 65,
        avgPrecipitation: 0.2,
        avgWindSpeed: 15,
        commonConditions: ['clear', 'partly cloudy'],
        extremeEvents: [],
      },
      confidence: 0.8,
      yearsOfData: 10,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      totalHits: 0,
      oldestEntry: null as string | null,
      newestEntry: null as string | null,
    };

    for (const entry of this.cache.values()) {
      stats.totalHits += entry.hits;
      if (!stats.oldestEntry || entry.timestamp < stats.oldestEntry) {
        stats.oldestEntry = entry.timestamp;
      }
      if (!stats.newestEntry || entry.timestamp > stats.newestEntry) {
        stats.newestEntry = entry.timestamp;
      }
    }

    return stats;
  }
}
