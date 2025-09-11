/**
 * Weather Cache System for Wedding Venues
 * Optimized for mobile devices and poor connectivity environments
 *
 * Features:
 * - Aggressive caching for venue locations
 * - Offline weather data storage
 * - Emergency weather alerts for outdoor weddings
 * - Performance monitoring and metrics
 */

import { createClient } from '@/lib/supabase/client';

export interface WeatherData {
  id: string;
  venue_id: string;
  latitude: number;
  longitude: number;
  current_temperature: number;
  current_conditions: string;
  current_humidity: number;
  current_wind_speed: number;
  hourly_forecast: HourlyForecast[];
  daily_forecast: DailyForecast[];
  alerts: WeatherAlert[];
  cached_at: string;
  expires_at: string;
  is_offline_cache: boolean;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  conditions: string;
  precipitation_probability: number;
  wind_speed: number;
}

export interface DailyForecast {
  date: string;
  high_temperature: number;
  low_temperature: number;
  conditions: string;
  precipitation_probability: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherAlert {
  id: string;
  type: 'severe_weather' | 'temperature_extreme' | 'precipitation' | 'wind';
  severity: 'watch' | 'warning' | 'advisory';
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  affected_areas: string[];
}

export interface WeatherCacheOptions {
  maxCacheAge: number; // milliseconds
  offlineCacheDuration: number; // milliseconds
  enableEmergencyAlerts: boolean;
  compressionEnabled: boolean;
  performanceMonitoring: boolean;
}

export interface WeatherPerformanceMetrics {
  cache_hit_rate: number;
  average_response_time: number;
  offline_requests: number;
  emergency_alerts_sent: number;
  data_compression_ratio: number;
  mobile_optimization_score: number;
}

class WeatherCache {
  private cache: Map<string, WeatherData> = new Map();
  private options: WeatherCacheOptions;
  private performanceMetrics: WeatherPerformanceMetrics;
  private supabase = createClient();

  constructor(options: Partial<WeatherCacheOptions> = {}) {
    this.options = {
      maxCacheAge: 30 * 60 * 1000, // 30 minutes default
      offlineCacheDuration: 6 * 60 * 60 * 1000, // 6 hours for offline
      enableEmergencyAlerts: true,
      compressionEnabled: true,
      performanceMonitoring: true,
      ...options,
    };

    this.performanceMetrics = {
      cache_hit_rate: 0,
      average_response_time: 0,
      offline_requests: 0,
      emergency_alerts_sent: 0,
      data_compression_ratio: 0,
      mobile_optimization_score: 100,
    };

    this.initializeOfflineStorage();
  }

  /**
   * Get weather data for a venue with mobile optimization
   */
  async getWeatherForVenue(
    venueId: string,
    latitude: number,
    longitude: number,
    forceRefresh: boolean = false,
  ): Promise<WeatherData> {
    const startTime = Date.now();
    const cacheKey = `${venueId}_${latitude}_${longitude}`;

    try {
      // Check cache first (mobile optimization)
      if (!forceRefresh) {
        const cachedData = await this.getCachedWeather(cacheKey);
        if (cachedData && !this.isCacheExpired(cachedData)) {
          this.updatePerformanceMetrics('cache_hit', Date.now() - startTime);
          return cachedData;
        }
      }

      // Fetch fresh data from API
      const weatherData = await this.fetchWeatherData(
        venueId,
        latitude,
        longitude,
      );

      // Cache the data
      await this.cacheWeatherData(cacheKey, weatherData);

      // Check for emergency weather conditions
      if (this.options.enableEmergencyAlerts) {
        await this.checkEmergencyConditions(weatherData);
      }

      this.updatePerformanceMetrics('api_fetch', Date.now() - startTime);
      return weatherData;
    } catch (error) {
      console.error('Weather fetch failed, trying offline cache:', error);

      // Fallback to offline cache for mobile users
      const offlineData = await this.getOfflineWeatherData(cacheKey);
      if (offlineData) {
        this.performanceMetrics.offline_requests++;
        return offlineData;
      }

      throw new Error(`Weather data unavailable for venue ${venueId}`);
    }
  }

  /**
   * Fetch weather data from external API
   * Optimized for mobile bandwidth constraints
   */
  private async fetchWeatherData(
    venueId: string,
    latitude: number,
    longitude: number,
  ): Promise<WeatherData> {
    // Using OpenWeatherMap API (replace with your preferred provider)
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('Weather API key not configured');
    }

    const baseUrl = 'https://api.openweathermap.org/data/2.5';

    // Fetch current weather and forecast in parallel for performance
    const [currentResponse, forecastResponse] = await Promise.all([
      // SECURITY: URL injection risk - use proper URL construction,
      // SECURITY: URL injection risk - use proper URL construction
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Weather API request failed');
    }

    const [currentData, forecastData] = await Promise.all([
      currentResponse.json(),
      forecastResponse.json(),
    ]);

    // Transform API response to our format
    const weatherData: WeatherData = {
      id: `weather_${venueId}_${Date.now()}`,
      venue_id: venueId,
      latitude,
      longitude,
      current_temperature: Math.round(currentData.main.temp),
      current_conditions: currentData.weather[0].main,
      current_humidity: currentData.main.humidity,
      current_wind_speed: Math.round(currentData.wind.speed * 3.6), // Convert m/s to km/h
      hourly_forecast: this.transformHourlyForecast(
        forecastData.list.slice(0, 24),
      ),
      daily_forecast: this.transformDailyForecast(forecastData.list),
      alerts: await this.checkWeatherAlerts(currentData, forecastData),
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.options.maxCacheAge).toISOString(),
      is_offline_cache: false,
    };

    return weatherData;
  }

  /**
   * Transform hourly forecast data for mobile display
   */
  private transformHourlyForecast(hourlyData: any[]): HourlyForecast[] {
    return hourlyData.map((item) => ({
      time: new Date(item.dt * 1000).toISOString(),
      temperature: Math.round(item.main.temp),
      conditions: item.weather[0].main,
      precipitation_probability: Math.round((item.pop || 0) * 100),
      wind_speed: Math.round(item.wind.speed * 3.6),
    }));
  }

  /**
   * Transform daily forecast data
   */
  private transformDailyForecast(forecastData: any[]): DailyForecast[] {
    // Group by day and calculate daily aggregates
    const dailyGroups = new Map<string, any[]>();

    forecastData.forEach((item) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyGroups.has(date)) {
        dailyGroups.set(date, []);
      }
      dailyGroups.get(date)!.push(item);
    });

    return Array.from(dailyGroups.entries())
      .slice(0, 7) // Limit to 7 days for mobile
      .map(([date, items]) => {
        const temps = items.map((item) => item.main.temp);
        const conditions = items[Math.floor(items.length / 2)].weather[0].main;
        const precipProbs = items.map((item) => item.pop || 0);

        return {
          date: new Date(date).toISOString().split('T')[0],
          high_temperature: Math.round(Math.max(...temps)),
          low_temperature: Math.round(Math.min(...temps)),
          conditions,
          precipitation_probability: Math.round(Math.max(...precipProbs) * 100),
          sunrise: new Date(
            items[0].sys?.sunrise * 1000 || Date.now(),
          ).toISOString(),
          sunset: new Date(
            items[0].sys?.sunset * 1000 || Date.now(),
          ).toISOString(),
        };
      });
  }

  /**
   * Check for weather alerts that affect outdoor weddings
   */
  private async checkWeatherAlerts(
    currentData: any,
    forecastData: any,
  ): Promise<WeatherAlert[]> {
    const alerts: WeatherAlert[] = [];

    // Temperature extremes (outdoor ceremony concerns)
    if (currentData.main.temp > 35 || currentData.main.temp < 0) {
      alerts.push({
        id: `temp_${Date.now()}`,
        type: 'temperature_extreme',
        severity: 'advisory',
        title:
          currentData.main.temp > 35
            ? 'Extreme Heat Warning'
            : 'Freezing Temperature Alert',
        description: `Current temperature: ${Math.round(currentData.main.temp)}°C. Consider indoor alternatives or additional guest comfort measures.`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        affected_areas: [
          'outdoor_ceremony',
          'reception_area',
          'photo_locations',
        ],
      });
    }

    // High precipitation probability
    const maxPrecipitation = Math.max(
      ...forecastData.list.slice(0, 12).map((item: any) => item.pop || 0),
    );
    if (maxPrecipitation > 0.7) {
      alerts.push({
        id: `precip_${Date.now()}`,
        type: 'precipitation',
        severity: maxPrecipitation > 0.9 ? 'warning' : 'watch',
        title: 'High Precipitation Probability',
        description: `${Math.round(maxPrecipitation * 100)}% chance of precipitation in the next 12 hours. Consider backup indoor options.`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        affected_areas: ['outdoor_ceremony', 'cocktail_hour', 'photo_session'],
      });
    }

    // High wind speeds
    if (currentData.wind.speed > 10) {
      // > 36 km/h
      alerts.push({
        id: `wind_${Date.now()}`,
        type: 'wind',
        severity: currentData.wind.speed > 15 ? 'warning' : 'advisory',
        title: 'High Wind Advisory',
        description: `Wind speeds of ${Math.round(currentData.wind.speed * 3.6)} km/h. Secure decorations and consider wind-resistant arrangements.`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        affected_areas: ['outdoor_ceremony', 'decorations', 'tent_setup'],
      });
    }

    return alerts;
  }

  /**
   * Cache weather data with compression for mobile storage efficiency
   */
  private async cacheWeatherData(
    cacheKey: string,
    weatherData: WeatherData,
  ): Promise<void> {
    try {
      // Memory cache for immediate access
      this.cache.set(cacheKey, weatherData);

      // Compress data for storage if enabled
      const dataToStore = this.options.compressionEnabled
        ? await this.compressWeatherData(weatherData)
        : weatherData;

      // Store in Supabase for persistence
      await this.supabase.from('weather_cache').upsert({
        cache_key: cacheKey,
        venue_id: weatherData.venue_id,
        weather_data: dataToStore,
        cached_at: weatherData.cached_at,
        expires_at: weatherData.expires_at,
      });

      // Also store in IndexedDB for offline access
      await this.storeOfflineWeatherData(cacheKey, weatherData);
    } catch (error) {
      console.error('Failed to cache weather data:', error);
    }
  }

  /**
   * Get cached weather data from memory or storage
   */
  private async getCachedWeather(
    cacheKey: string,
  ): Promise<WeatherData | null> {
    // Check memory cache first
    const memoryCache = this.cache.get(cacheKey);
    if (memoryCache && !this.isCacheExpired(memoryCache)) {
      return memoryCache;
    }

    try {
      // Check Supabase cache
      const { data, error } = await this.supabase
        .from('weather_cache')
        .select('weather_data, expires_at')
        .eq('cache_key', cacheKey)
        .single();

      if (!error && data && !this.isCacheExpired(data.weather_data)) {
        // Decompress if needed
        const weatherData = this.options.compressionEnabled
          ? await this.decompressWeatherData(data.weather_data)
          : data.weather_data;

        // Update memory cache
        this.cache.set(cacheKey, weatherData);
        return weatherData;
      }
    } catch (error) {
      console.error('Failed to get cached weather:', error);
    }

    return null;
  }

  /**
   * Check if cached data has expired
   */
  private isCacheExpired(weatherData: WeatherData): boolean {
    return new Date(weatherData.expires_at) < new Date();
  }

  /**
   * Initialize offline storage using IndexedDB
   */
  private async initializeOfflineStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const dbName = 'WedsyncWeatherCache';
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('weather_data')) {
          const store = db.createObjectStore('weather_data', {
            keyPath: 'cache_key',
          });
          store.createIndex('venue_id', 'venue_id', { unique: false });
          store.createIndex('expires_at', 'expires_at', { unique: false });
        }
      };
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  /**
   * Store weather data offline using IndexedDB
   */
  private async storeOfflineWeatherData(
    cacheKey: string,
    weatherData: WeatherData,
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const dbName = 'WedsyncWeatherCache';
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['weather_data'], 'readwrite');
        const store = transaction.objectStore('weather_data');

        const offlineData = {
          ...weatherData,
          cache_key: cacheKey,
          is_offline_cache: true,
          expires_at: new Date(
            Date.now() + this.options.offlineCacheDuration,
          ).toISOString(),
        };

        store.put(offlineData);
      };
    } catch (error) {
      console.error('Failed to store offline weather data:', error);
    }
  }

  /**
   * Get offline weather data from IndexedDB
   */
  private async getOfflineWeatherData(
    cacheKey: string,
  ): Promise<WeatherData | null> {
    if (typeof window === 'undefined') return null;

    return new Promise((resolve) => {
      try {
        const dbName = 'WedsyncWeatherCache';
        const request = indexedDB.open(dbName, 1);

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['weather_data'], 'readonly');
          const store = transaction.objectStore('weather_data');
          const getRequest = store.get(cacheKey);

          getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data && !this.isCacheExpired(data)) {
              resolve(data);
            } else {
              resolve(null);
            }
          };

          getRequest.onerror = () => resolve(null);
        };

        request.onerror = () => resolve(null);
      } catch (error) {
        console.error('Failed to get offline weather data:', error);
        resolve(null);
      }
    });
  }

  /**
   * Compress weather data for storage efficiency
   */
  private async compressWeatherData(weatherData: WeatherData): Promise<any> {
    // Implement compression logic (e.g., remove redundant data, compact numbers)
    const compressed = {
      ...weatherData,
      // Round numbers to reduce precision
      current_temperature: Math.round(weatherData.current_temperature),
      current_humidity: Math.round(weatherData.current_humidity),
      current_wind_speed: Math.round(weatherData.current_wind_speed),
      // Limit forecast data for mobile
      hourly_forecast: weatherData.hourly_forecast.slice(0, 12),
      daily_forecast: weatherData.daily_forecast.slice(0, 5),
    };

    return compressed;
  }

  /**
   * Decompress weather data
   */
  private async decompressWeatherData(
    compressedData: any,
  ): Promise<WeatherData> {
    // Implement decompression logic
    return compressedData as WeatherData;
  }

  /**
   * Check for emergency weather conditions and trigger alerts
   */
  private async checkEmergencyConditions(
    weatherData: WeatherData,
  ): Promise<void> {
    const emergencyAlerts = weatherData.alerts.filter(
      (alert) => alert.severity === 'warning' || alert.severity === 'watch',
    );

    if (emergencyAlerts.length > 0) {
      for (const alert of emergencyAlerts) {
        await this.sendEmergencyAlert(weatherData.venue_id, alert);
      }
      this.performanceMetrics.emergency_alerts_sent += emergencyAlerts.length;
    }
  }

  /**
   * Send emergency weather alert to wedding stakeholders
   */
  private async sendEmergencyAlert(
    venueId: string,
    alert: WeatherAlert,
  ): Promise<void> {
    try {
      // Get upcoming weddings for this venue
      const { data: weddings, error } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          wedding_date,
          couple_id,
          vendors:wedding_vendors(
            supplier_id,
            suppliers(id, email, phone, organization_id)
          )
        `,
        )
        .eq('venue_id', venueId)
        .gte('wedding_date', new Date().toISOString())
        .lte('wedding_date', alert.end_time);

      if (error || !weddings?.length) return;

      // Send alerts to each affected wedding
      for (const wedding of weddings) {
        await this.supabase.from('weather_alerts').insert({
          wedding_id: wedding.id,
          venue_id: venueId,
          alert_type: alert.type,
          alert_severity: alert.severity,
          alert_title: alert.title,
          alert_description: alert.description,
          affected_areas: alert.affected_areas,
          start_time: alert.start_time,
          end_time: alert.end_time,
          sent_at: new Date().toISOString(),
        });

        // TODO: Send push notifications, emails, SMS based on user preferences
      }
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
    }
  }

  /**
   * Update performance metrics for monitoring
   */
  private updatePerformanceMetrics(
    operation: 'cache_hit' | 'api_fetch',
    responseTime: number,
  ): void {
    if (!this.options.performanceMonitoring) return;

    // Update average response time
    this.performanceMetrics.average_response_time =
      (this.performanceMetrics.average_response_time + responseTime) / 2;

    // Update cache hit rate
    if (operation === 'cache_hit') {
      // Implement cache hit rate calculation
      this.performanceMetrics.cache_hit_rate = Math.min(
        this.performanceMetrics.cache_hit_rate + 0.1,
        1.0,
      );
    }

    // Calculate mobile optimization score based on performance
    this.performanceMetrics.mobile_optimization_score = Math.max(
      100 - this.performanceMetrics.average_response_time / 100,
      0,
    );
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): WeatherPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = new Date().toISOString();

    // Clear memory cache
    for (const [key, data] of this.cache.entries()) {
      if (this.isCacheExpired(data)) {
        this.cache.delete(key);
      }
    }

    // Clear Supabase cache
    await this.supabase.from('weather_cache').delete().lt('expires_at', now);

    // Clear IndexedDB cache
    if (typeof window !== 'undefined') {
      try {
        const dbName = 'WedsyncWeatherCache';
        const request = indexedDB.open(dbName, 1);

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          const transaction = db.transaction(['weather_data'], 'readwrite');
          const store = transaction.objectStore('weather_data');
          const index = store.index('expires_at');
          const range = IDBKeyRange.upperBound(now, true);

          index.openKeyCursor(range).onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              store.delete(cursor.primaryKey);
              cursor.continue();
            }
          };
        };
      } catch (error) {
        console.error('Failed to clear expired IndexedDB cache:', error);
      }
    }
  }

  /**
   * Preload weather data for upcoming weddings
   */
  async preloadUpcomingWeddings(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Get upcoming weddings
      const { data: weddings, error } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          venue_id,
          venues(latitude, longitude)
        `,
        )
        .gte('wedding_date', tomorrow.toISOString())
        .lte('wedding_date', nextWeek.toISOString());

      if (error || !weddings) return;

      // Preload weather data for each venue
      const preloadPromises = weddings
        .map((wedding) => {
          if (wedding.venues?.latitude && wedding.venues?.longitude) {
            return this.getWeatherForVenue(
              wedding.venue_id,
              wedding.venues.latitude,
              wedding.venues.longitude,
            );
          }
        })
        .filter(Boolean);

      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.error('Failed to preload weather data:', error);
    }
  }
}

export default WeatherCache;
export { WeatherCache };
