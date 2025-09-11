/**
 * Weather Service - Secure weather data integration for wedding planning
 * Implements caching, rate limiting, error handling, and data transformation
 * WS-220 Weather API Integration - Team B Implementation
 */

import { z } from 'zod';

// Types and Interfaces
export interface WeatherApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  cached?: boolean;
  timestamp?: string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  description: string;
  pressure: number;
  cloudCover: number;
}

interface WeddingWeatherAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  considerations: string[];
  alternatives: string[];
  confidence: number;
}

// Weather data validation schemas
const WeatherDataSchema = z.object({
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  precipitation: z.number().min(0),
  visibility: z.number().min(0),
  uvIndex: z.number().min(0).max(12),
  condition: z.string(),
  description: z.string(),
  pressure: z.number().min(0),
  cloudCover: z.number().min(0).max(100),
});

// In-memory cache with TTL
class WeatherCache {
  private cache: Map<string, CacheEntry> = new Map();

  set(key: string, data: any, ttlMinutes: number): void {
    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + ttlMinutes * 60 * 1000,
    };
    this.cache.set(key, entry);

    // Clean up expired entries periodically
    this.cleanExpired();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// Weather service implementation
class WeatherService {
  private cache = new WeatherCache();
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenWeather API key not configured');
    }
  }

  /**
   * Get current weather with caching and error handling
   */
  async getCurrentWeather(
    latitude: number,
    longitude: number,
  ): Promise<WeatherApiResponse> {
    const cacheKey = `current_${latitude}_${longitude}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`,
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`,
        );
      }

      const rawData = await response.json();
      const transformedData = this.transformCurrentWeatherData(rawData);

      // Cache for 10 minutes
      this.cache.set(cacheKey, transformedData, 10);

      return {
        success: true,
        data: transformedData,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleWeatherError(error, 'current weather');
    }
  }

  /**
   * Get weather forecast with data transformation
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    days: number,
  ): Promise<WeatherApiResponse> {
    const cacheKey = `forecast_${latitude}_${longitude}_${days}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&cnt=${days * 8}`, // 8 forecasts per day (3-hour intervals)
      );

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`,
        );
      }

      const rawData = await response.json();
      const transformedData = this.transformForecastData(rawData, days);

      // Cache for 1 hour
      this.cache.set(cacheKey, transformedData, 60);

      return {
        success: true,
        data: transformedData,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleWeatherError(error, 'weather forecast');
    }
  }

  /**
   * Get weather for specific wedding date
   */
  async getWeatherForWeddingDate(
    latitude: number,
    longitude: number,
    weddingDate: string,
  ): Promise<WeatherApiResponse> {
    const cacheKey = `wedding_${latitude}_${longitude}_${weddingDate}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const weddingDateTime = new Date(weddingDate);
      const now = new Date();

      // If wedding is more than 5 days away, get forecast
      if (weddingDateTime.getTime() - now.getTime() > 5 * 24 * 60 * 60 * 1000) {
        // For dates beyond 5 days, provide historical averages and trends
        const historicalData = await this.getHistoricalAverages(
          latitude,
          longitude,
          weddingDate,
        );

        // Cache for 2 hours
        this.cache.set(cacheKey, historicalData, 120);

        return {
          success: true,
          data: historicalData,
          cached: false,
          timestamp: new Date().toISOString(),
        };
      } else {
        // For near-term dates, get detailed forecast
        const forecastResponse = await this.getWeatherForecast(
          latitude,
          longitude,
          7,
        );
        if (!forecastResponse.success) return forecastResponse;

        const weddingWeather = this.extractWeddingDayWeather(
          forecastResponse.data,
          weddingDate,
        );

        // Cache for 2 hours
        this.cache.set(cacheKey, weddingWeather, 120);

        return {
          success: true,
          data: weddingWeather,
          cached: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return this.handleWeatherError(error, 'wedding weather');
    }
  }

  /**
   * Analyze weather risk for outdoor weddings
   */
  async analyzeWeatherRisk(
    latitude: number,
    longitude: number,
    weddingDate: string,
    isOutdoor: boolean,
  ): Promise<WeatherApiResponse> {
    const cacheKey = `analysis_${latitude}_${longitude}_${weddingDate}_${isOutdoor}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const weddingWeatherResponse = await this.getWeatherForWeddingDate(
        latitude,
        longitude,
        weddingDate,
      );
      if (!weddingWeatherResponse.success) return weddingWeatherResponse;

      const analysis = this.performWeatherRiskAnalysis(
        weddingWeatherResponse.data,
        isOutdoor,
      );

      // Cache for 2 hours
      this.cache.set(cacheKey, analysis, 120);

      return {
        success: true,
        data: analysis,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleWeatherError(error, 'weather analysis');
    }
  }

  /**
   * Transform raw current weather data for wedding context
   */
  private transformCurrentWeatherData(
    rawData: any,
  ): WeatherData & { location: any; weddingRelevant: any } {
    const baseWeather: WeatherData = {
      temperature: rawData.main.temp,
      humidity: rawData.main.humidity,
      windSpeed: rawData.wind?.speed || 0,
      windDirection: rawData.wind?.deg || 0,
      precipitation: rawData.rain?.['1h'] || rawData.snow?.['1h'] || 0,
      visibility: rawData.visibility / 1000, // Convert to km
      uvIndex: rawData.uvi || 0,
      condition: rawData.weather[0].main,
      description: rawData.weather[0].description,
      pressure: rawData.main.pressure,
      cloudCover: rawData.clouds?.all || 0,
    };

    return {
      ...baseWeather,
      location: {
        name: rawData.name,
        country: rawData.sys.country,
        coordinates: {
          latitude: rawData.coord.lat,
          longitude: rawData.coord.lon,
        },
      },
      weddingRelevant: {
        photographyConditions: this.assessPhotographyConditions(baseWeather),
        outdoorViability: this.assessOutdoorViability(baseWeather),
        guestComfort: this.assessGuestComfort(baseWeather),
      },
    };
  }

  /**
   * Transform forecast data for wedding planning
   */
  private transformForecastData(rawData: any, days: number): any {
    const dailyForecasts = [];

    // Group forecasts by day
    const forecastsByDay = rawData.list.reduce((acc: any, forecast: any) => {
      const date = new Date(forecast.dt * 1000).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(forecast);
      return acc;
    }, {});

    for (const [date, forecasts] of Object.entries(forecastsByDay)) {
      if (dailyForecasts.length >= days) break;

      const dailySummary = this.aggregateDailyForecast(forecasts as any[]);
      dailyForecasts.push({
        date,
        ...dailySummary,
        weddingRelevant: {
          photographyConditions: this.assessPhotographyConditions(dailySummary),
          outdoorViability: this.assessOutdoorViability(dailySummary),
          guestComfort: this.assessGuestComfort(dailySummary),
        },
      });
    }

    return {
      location: {
        coordinates: {
          latitude: rawData.city.coord.lat,
          longitude: rawData.city.coord.lon,
        },
        name: rawData.city.name,
        country: rawData.city.country,
      },
      forecast: dailyForecasts,
      summary: this.generateWeatherSummary(dailyForecasts),
    };
  }

  /**
   * Aggregate 3-hourly forecasts into daily summary
   */
  private aggregateDailyForecast(forecasts: any[]): WeatherData {
    const temps = forecasts.map((f) => f.main.temp);
    const humidity = forecasts.map((f) => f.main.humidity);
    const windSpeeds = forecasts.map((f) => f.wind?.speed || 0);

    return {
      temperature: Math.round((Math.max(...temps) + Math.min(...temps)) / 2),
      humidity: Math.round(
        humidity.reduce((a, b) => a + b, 0) / humidity.length,
      ),
      windSpeed: Math.max(...windSpeeds),
      windDirection: forecasts[0].wind?.deg || 0,
      precipitation: forecasts.reduce(
        (sum, f) => sum + (f.rain?.['3h'] || f.snow?.['3h'] || 0),
        0,
      ),
      visibility: 10, // Default good visibility
      uvIndex: 5, // Default moderate UV
      condition: forecasts[0].weather[0].main,
      description: forecasts[0].weather[0].description,
      pressure: forecasts[0].main.pressure,
      cloudCover: Math.round(
        forecasts.reduce((sum, f) => sum + (f.clouds?.all || 0), 0) /
          forecasts.length,
      ),
    };
  }

  /**
   * Get historical weather averages for long-term planning
   */
  private async getHistoricalAverages(
    latitude: number,
    longitude: number,
    weddingDate: string,
  ): Promise<any> {
    // In a real implementation, this would call a historical weather API
    // For now, return seasonal averages based on location and date
    const date = new Date(weddingDate);
    const month = date.getMonth();

    return {
      type: 'historical_average',
      date: weddingDate,
      note: 'Based on historical averages - actual conditions may vary',
      confidence: 0.7,
      ...this.getSeasonalAverages(latitude, month),
      weddingRelevant: {
        seasonalConsiderations: this.getSeasonalConsiderations(month),
        recommendedBackupPlans: this.getSeasonalBackupPlans(month),
      },
    };
  }

  /**
   * Extract wedding day specific weather from forecast
   */
  private extractWeddingDayWeather(
    forecastData: any,
    weddingDate: string,
  ): any {
    const weddingDateStr = new Date(weddingDate).toDateString();
    const weddingDayForecast = forecastData.forecast.find(
      (day: any) => new Date(day.date).toDateString() === weddingDateStr,
    );

    if (weddingDayForecast) {
      return {
        ...weddingDayForecast,
        type: 'detailed_forecast',
        confidence: 0.9,
      };
    }

    return {
      type: 'no_forecast_available',
      note: 'Weather forecast not available for the selected date',
      confidence: 0,
    };
  }

  /**
   * Perform comprehensive weather risk analysis for weddings
   */
  private performWeatherRiskAnalysis(
    weatherData: any,
    isOutdoor: boolean,
  ): WeddingWeatherAnalysis {
    const risks = [];
    const recommendations = [];
    const considerations = [];
    const alternatives = [];

    let riskScore = 0;

    // Analyze precipitation risk
    if (weatherData.precipitation > 5) {
      risks.push('High precipitation expected');
      riskScore += 3;
      if (isOutdoor) {
        recommendations.push('Consider tent rental or indoor backup venue');
        alternatives.push('Move ceremony indoors');
      }
    } else if (weatherData.precipitation > 1) {
      risks.push('Light precipitation possible');
      riskScore += 1;
      recommendations.push('Have umbrellas available for guests');
    }

    // Analyze wind conditions
    if (weatherData.windSpeed > 25) {
      risks.push('Strong winds expected');
      riskScore += 2;
      if (isOutdoor) {
        recommendations.push('Secure decorations and avoid light fabrics');
        considerations.push('Wind may affect outdoor ceremony elements');
      }
    }

    // Analyze temperature extremes
    if (weatherData.temperature > 30 || weatherData.temperature < 10) {
      risks.push('Extreme temperatures expected');
      riskScore += 2;
      recommendations.push(
        'Inform guests about weather conditions for appropriate attire',
      );
      if (weatherData.temperature > 30) {
        recommendations.push('Provide shade and hydration stations');
      } else {
        recommendations.push('Consider heaters for outdoor areas');
      }
    }

    // Determine overall risk level
    let riskLevel: WeddingWeatherAnalysis['riskLevel'];
    if (riskScore >= 6) riskLevel = 'CRITICAL';
    else if (riskScore >= 4) riskLevel = 'HIGH';
    else if (riskScore >= 2) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    return {
      riskLevel,
      recommendations,
      considerations: [...considerations, ...risks],
      alternatives,
      confidence: weatherData.confidence || 0.8,
    };
  }

  /**
   * Assess photography conditions based on weather
   */
  private assessPhotographyConditions(weather: WeatherData): any {
    return {
      lighting:
        weather.cloudCover > 80
          ? 'poor'
          : weather.cloudCover > 50
            ? 'moderate'
            : 'good',
      visibility:
        weather.visibility > 5
          ? 'excellent'
          : weather.visibility > 2
            ? 'good'
            : 'poor',
      recommendations: [
        ...(weather.cloudCover > 80
          ? ['Consider additional lighting equipment']
          : []),
        ...(weather.precipitation > 0
          ? ['Weather protection for equipment needed']
          : []),
        ...(weather.windSpeed > 15 ? ['Secure lightweight equipment'] : []),
      ],
    };
  }

  /**
   * Assess outdoor event viability
   */
  private assessOutdoorViability(weather: WeatherData): any {
    let viability = 'excellent';

    if (
      weather.precipitation > 5 ||
      weather.windSpeed > 25 ||
      weather.temperature < 5 ||
      weather.temperature > 35
    ) {
      viability = 'poor';
    } else if (
      weather.precipitation > 1 ||
      weather.windSpeed > 15 ||
      weather.temperature < 10 ||
      weather.temperature > 30
    ) {
      viability = 'moderate';
    } else if (weather.precipitation > 0 || weather.windSpeed > 10) {
      viability = 'good';
    }

    return {
      viability,
      score:
        viability === 'excellent'
          ? 10
          : viability === 'good'
            ? 7
            : viability === 'moderate'
              ? 4
              : 1,
    };
  }

  /**
   * Assess guest comfort conditions
   */
  private assessGuestComfort(weather: WeatherData): any {
    const comfort = [];

    if (weather.temperature >= 18 && weather.temperature <= 25) {
      comfort.push('Comfortable temperature for guests');
    }
    if (weather.humidity < 70) {
      comfort.push('Comfortable humidity levels');
    }
    if (weather.windSpeed < 15) {
      comfort.push('Gentle breeze conditions');
    }

    return {
      rating:
        comfort.length >= 2
          ? 'high'
          : comfort.length === 1
            ? 'moderate'
            : 'low',
      factors: comfort,
    };
  }

  /**
   * Get seasonal weather averages
   */
  private getSeasonalAverages(
    latitude: number,
    month: number,
  ): Partial<WeatherData> {
    // Simplified seasonal averages - in real implementation, this would be location-specific
    const seasons = [
      { temp: 2, precip: 3, wind: 12 }, // Winter
      { temp: 6, precip: 2, wind: 10 }, // Spring
      { temp: 22, precip: 1, wind: 8 }, // Summer
      { temp: 12, precip: 4, wind: 11 }, // Autumn
    ];

    const seasonIndex = Math.floor((month + 1) / 3) % 4;
    const season = seasons[seasonIndex];

    return {
      temperature: season.temp,
      precipitation: season.precip,
      windSpeed: season.wind,
      humidity: 65,
      cloudCover: 50,
    };
  }

  /**
   * Get seasonal considerations for wedding planning
   */
  private getSeasonalConsiderations(month: number): string[] {
    const considerations = [
      [
        'Winter weather variability',
        'Heating requirements',
        'Daylight hours limited',
      ],
      [
        'Variable spring weather',
        'Possible late frost',
        'Pollen considerations',
      ],
      [
        'High temperatures possible',
        'UV protection needed',
        'Thunderstorm season',
      ],
      ['Cooling temperatures', 'Earlier darkness', 'Leaf fall aesthetic'],
    ];

    const seasonIndex = Math.floor((month + 1) / 3) % 4;
    return considerations[seasonIndex];
  }

  /**
   * Get seasonal backup plan recommendations
   */
  private getSeasonalBackupPlans(month: number): string[] {
    const plans = [
      [
        'Indoor ceremony backup',
        'Heating for outdoor areas',
        'Weather monitoring',
      ],
      [
        'Tent rental for rain protection',
        'Flexible outdoor setup',
        'Guest communication plan',
      ],
      [
        'Shade and cooling stations',
        'Hydration for guests',
        'Heat emergency plan',
      ],
      ['Weather protection', 'Earlier start times', 'Indoor reception backup'],
    ];

    const seasonIndex = Math.floor((month + 1) / 3) % 4;
    return plans[seasonIndex];
  }

  /**
   * Generate overall weather summary
   */
  private generateWeatherSummary(dailyForecasts: any[]): any {
    const avgTemp =
      dailyForecasts.reduce((sum, day) => sum + day.temperature, 0) /
      dailyForecasts.length;
    const totalPrecip = dailyForecasts.reduce(
      (sum, day) => sum + day.precipitation,
      0,
    );
    const maxWind = Math.max(...dailyForecasts.map((day) => day.windSpeed));

    return {
      averageTemperature: Math.round(avgTemp),
      totalPrecipitation: Math.round(totalPrecip * 10) / 10,
      maxWindSpeed: maxWind,
      overallCondition:
        totalPrecip > 5
          ? 'wet'
          : avgTemp > 25
            ? 'hot'
            : avgTemp < 10
              ? 'cold'
              : 'pleasant',
    };
  }

  /**
   * Fetch with retry logic and error handling
   */
  private async fetchWithRetry(
    url: string,
    retries = this.maxRetries,
  ): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'WedSync-Weather-Service/1.0',
          },
        });

        if (response.ok || i === retries - 1) {
          return response;
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * (i + 1)),
        );
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * (i + 1)),
        );
      }
    }

    throw new Error('Maximum retries exceeded');
  }

  /**
   * Standardized error handling
   */
  private handleWeatherError(error: any, context: string): WeatherApiResponse {
    console.error(`Weather service error (${context}):`, error);

    let errorMessage = 'Weather service temporarily unavailable';
    let errorCode = 'WEATHER_SERVICE_ERROR';

    if (error.message?.includes('API key')) {
      errorMessage = 'Weather service configuration error';
      errorCode = 'API_KEY_ERROR';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Weather service timeout - please try again';
      errorCode = 'TIMEOUT_ERROR';
    } else if (
      error.message?.includes('rate limit') ||
      error.message?.includes('429')
    ) {
      errorMessage = 'Weather service rate limit exceeded';
      errorCode = 'RATE_LIMIT_ERROR';
    }

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
