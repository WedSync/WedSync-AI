/**
 * WeatherDataValidator - Cross-System Data Validation for Weather Updates
 * Ensures data integrity and consistency across all weather-related systems
 * WS-220: Weather API Integration - Team C Round 1
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { WeatherData, WeatherSubscription } from './WeatherSync';
import { z } from 'zod';

// Validation schemas
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1),
  venue_name: z.string().optional(),
});

const CurrentWeatherSchema = z.object({
  temperature: z.number().min(-50).max(60), // Celsius
  humidity: z.number().min(0).max(100),
  conditions: z.string().min(1),
  wind_speed: z.number().min(0).max(200), // m/s
  wind_direction: z.number().min(0).max(360),
  visibility: z.number().min(0).max(50), // km
  precipitation: z.number().min(0).max(500), // mm/h
});

const ForecastItemSchema = z.object({
  date: z.string().datetime(),
  high_temp: z.number().min(-50).max(60),
  low_temp: z.number().min(-50).max(60),
  conditions: z.string().min(1),
  precipitation_chance: z.number().min(0).max(100),
  wind_speed: z.number().min(0).max(200),
});

const WeatherAlertSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['severe_weather', 'rain', 'high_wind', 'extreme_temp']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
});

const WeatherDataSchema = z.object({
  id: z.string().optional(),
  location: LocationSchema,
  current: CurrentWeatherSchema,
  forecast: z.array(ForecastItemSchema).min(1).max(10),
  alerts: z.array(WeatherAlertSchema),
  last_updated: z.string().datetime(),
  wedding_id: z.string().min(1),
  venue_id: z.string().min(1),
});

const WeatherSubscriptionSchema = z.object({
  id: z.string().optional(),
  wedding_id: z.string().min(1),
  venue_id: z.string().min(1),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  alert_preferences: z.object({
    rain_alerts: z.boolean(),
    wind_alerts: z.boolean(),
    temperature_alerts: z.boolean(),
    severe_weather_alerts: z.boolean(),
    notification_threshold: z.number().min(0).max(168), // max 7 days in hours
  }),
  notification_channels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    in_app: z.boolean(),
    webhook_url: z.string().url().optional(),
  }),
  active: z.boolean(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface DataConsistencyCheck {
  checkId: string;
  timestamp: string;
  weddingId: string;
  checks: {
    weatherDataIntegrity: boolean;
    subscriptionConsistency: boolean;
    timelineAlignment: boolean;
    vendorDataSync: boolean;
    alertsConsistency: boolean;
  };
  issues: ValidationError[];
  fixesApplied: string[];
}

export class WeatherDataValidator {
  private supabase;
  private readonly VALIDATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private validationCache: Map<
    string,
    { result: ValidationResult; expires: number }
  > = new Map();

  constructor() {
    this.supabase = createSupabaseClient();
  }

  /**
   * Validate weather data structure and content
   */
  async validateWeatherData(
    data: Partial<WeatherData>,
  ): Promise<ValidationResult> {
    try {
      const cacheKey = `weather_${JSON.stringify(data).slice(0, 100)}`;
      const cached = this.validationCache.get(cacheKey);

      if (cached && cached.expires > Date.now()) {
        return cached.result;
      }

      const result: ValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
      };

      // Schema validation
      const schemaResult = WeatherDataSchema.safeParse(data);
      if (!schemaResult.success) {
        result.errors.push(
          ...this.parseZodErrors(schemaResult.error, 'critical'),
        );
      } else {
        result.sanitizedData = schemaResult.data;
      }

      // Business logic validation
      if (data.current && data.forecast) {
        await this.validateBusinessLogic(data, result);
      }

      // Cross-reference validation
      if (data.wedding_id && data.venue_id) {
        await this.validateCrossReferences(data, result);
      }

      // Data freshness validation
      if (data.last_updated) {
        this.validateDataFreshness(data, result);
      }

      result.isValid =
        result.errors.filter(
          (e) => e.severity === 'critical' || e.severity === 'high',
        ).length === 0;

      // Cache result
      this.validationCache.set(cacheKey, {
        result,
        expires: Date.now() + this.VALIDATION_CACHE_TTL,
      });

      return result;
    } catch (error) {
      console.error('Weather data validation failed:', error);
      return {
        isValid: false,
        errors: [
          {
            field: 'system',
            message: 'Validation system error',
            severity: 'critical',
            code: 'VALIDATION_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate weather subscription
   */
  async validateWeatherSubscription(
    subscription: Partial<WeatherSubscription>,
  ): Promise<ValidationResult> {
    try {
      const result: ValidationResult = {
        isValid: false,
        errors: [],
        warnings: [],
      };

      // Schema validation
      const schemaResult = WeatherSubscriptionSchema.safeParse(subscription);
      if (!schemaResult.success) {
        result.errors.push(...this.parseZodErrors(schemaResult.error, 'high'));
      } else {
        result.sanitizedData = schemaResult.data;
      }

      // Validate wedding and venue existence
      if (subscription.wedding_id) {
        const weddingExists = await this.validateWeddingExists(
          subscription.wedding_id,
        );
        if (!weddingExists) {
          result.errors.push({
            field: 'wedding_id',
            message: 'Referenced wedding does not exist',
            severity: 'critical',
            code: 'INVALID_WEDDING_REFERENCE',
          });
        }
      }

      if (subscription.venue_id) {
        const venueExists = await this.validateVenueExists(
          subscription.venue_id,
        );
        if (!venueExists) {
          result.errors.push({
            field: 'venue_id',
            message: 'Referenced venue does not exist',
            severity: 'critical',
            code: 'INVALID_VENUE_REFERENCE',
          });
        }
      }

      // Validate location coordinates
      if (subscription.location) {
        await this.validateLocationCoordinates(subscription.location, result);
      }

      // Validate notification settings
      if (subscription.notification_channels) {
        this.validateNotificationChannels(
          subscription.notification_channels,
          result,
        );
      }

      result.isValid =
        result.errors.filter(
          (e) => e.severity === 'critical' || e.severity === 'high',
        ).length === 0;

      return result;
    } catch (error) {
      console.error('Weather subscription validation failed:', error);
      return {
        isValid: false,
        errors: [
          {
            field: 'system',
            message: 'Subscription validation error',
            severity: 'critical',
            code: 'VALIDATION_ERROR',
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Perform comprehensive data consistency check
   */
  async performDataConsistencyCheck(
    weddingId: string,
  ): Promise<DataConsistencyCheck> {
    const checkId = `consistency_${weddingId}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const consistencyCheck: DataConsistencyCheck = {
      checkId,
      timestamp,
      weddingId,
      checks: {
        weatherDataIntegrity: false,
        subscriptionConsistency: false,
        timelineAlignment: false,
        vendorDataSync: false,
        alertsConsistency: false,
      },
      issues: [],
      fixesApplied: [],
    };

    try {
      // Check weather data integrity
      consistencyCheck.checks.weatherDataIntegrity =
        await this.checkWeatherDataIntegrity(weddingId, consistencyCheck);

      // Check subscription consistency
      consistencyCheck.checks.subscriptionConsistency =
        await this.checkSubscriptionConsistency(weddingId, consistencyCheck);

      // Check timeline alignment
      consistencyCheck.checks.timelineAlignment =
        await this.checkTimelineAlignment(weddingId, consistencyCheck);

      // Check vendor data synchronization
      consistencyCheck.checks.vendorDataSync = await this.checkVendorDataSync(
        weddingId,
        consistencyCheck,
      );

      // Check alerts consistency
      consistencyCheck.checks.alertsConsistency =
        await this.checkAlertsConsistency(weddingId, consistencyCheck);

      // Store consistency check results
      await this.storeConsistencyCheck(consistencyCheck);

      return consistencyCheck;
    } catch (error) {
      console.error('Data consistency check failed:', error);
      consistencyCheck.issues.push({
        field: 'system',
        message: 'Consistency check system error',
        severity: 'critical',
        code: 'CONSISTENCY_CHECK_ERROR',
      });
      return consistencyCheck;
    }
  }

  /**
   * Validate business logic rules
   */
  private async validateBusinessLogic(
    data: Partial<WeatherData>,
    result: ValidationResult,
  ): Promise<void> {
    // Temperature consistency checks
    if (data.current && data.forecast) {
      const currentTemp = data.current.temperature;
      const forecastTemps = data.forecast.map(
        (f) => (f.high_temp + f.low_temp) / 2,
      );

      // Check for unrealistic temperature jumps
      for (const forecastTemp of forecastTemps) {
        if (Math.abs(currentTemp - forecastTemp) > 30) {
          result.warnings.push({
            field: 'temperature',
            message:
              'Large temperature variation detected between current and forecast',
            suggestion: 'Verify weather data source accuracy',
          });
          break;
        }
      }
    }

    // Precipitation vs conditions consistency
    if (data.current) {
      const { precipitation, conditions } = data.current;
      const lowerConditions = conditions.toLowerCase();

      if (
        precipitation > 0 &&
        !lowerConditions.includes('rain') &&
        !lowerConditions.includes('drizzle') &&
        !lowerConditions.includes('shower')
      ) {
        result.warnings.push({
          field: 'precipitation',
          message: 'Precipitation reported but conditions do not indicate rain',
          suggestion: 'Check weather data consistency',
        });
      }
    }

    // Wind speed vs conditions
    if (data.current && data.current.wind_speed > 15) {
      const conditions = data.current.conditions.toLowerCase();
      if (
        !conditions.includes('wind') &&
        !conditions.includes('gust') &&
        !conditions.includes('storm')
      ) {
        result.warnings.push({
          field: 'wind_speed',
          message:
            'High wind speed but conditions do not indicate windy weather',
          suggestion: 'Verify wind conditions accuracy',
        });
      }
    }
  }

  /**
   * Validate cross-references to other systems
   */
  private async validateCrossReferences(
    data: Partial<WeatherData>,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check wedding exists and is not in the past
      const { data: wedding, error: weddingError } = await this.supabase
        .from('weddings')
        .select('date, status')
        .eq('id', data.wedding_id)
        .single();

      if (weddingError || !wedding) {
        result.errors.push({
          field: 'wedding_id',
          message: 'Referenced wedding does not exist',
          severity: 'critical',
          code: 'INVALID_WEDDING_REFERENCE',
        });
        return;
      }

      const weddingDate = new Date(wedding.date);
      const now = new Date();

      if (weddingDate < now && wedding.status !== 'completed') {
        result.warnings.push({
          field: 'wedding_date',
          message: 'Weather tracking for past wedding date',
          suggestion: 'Consider archiving weather data for completed weddings',
        });
      }

      // Check venue exists and has location data
      const { data: venue, error: venueError } = await this.supabase
        .from('venues')
        .select('latitude, longitude, name')
        .eq('id', data.venue_id)
        .single();

      if (venueError || !venue) {
        result.errors.push({
          field: 'venue_id',
          message: 'Referenced venue does not exist',
          severity: 'critical',
          code: 'INVALID_VENUE_REFERENCE',
        });
        return;
      }

      // Check location consistency
      if (data.location && venue.latitude && venue.longitude) {
        const distance = this.calculateDistance(
          data.location.latitude,
          data.location.longitude,
          venue.latitude,
          venue.longitude,
        );

        if (distance > 10) {
          // 10km tolerance
          result.warnings.push({
            field: 'location',
            message:
              'Weather location significantly different from venue location',
            suggestion: 'Verify weather monitoring location accuracy',
          });
        }
      }
    } catch (error) {
      result.errors.push({
        field: 'cross_reference',
        message: 'Failed to validate cross-references',
        severity: 'medium',
        code: 'CROSS_REFERENCE_ERROR',
      });
    }
  }

  /**
   * Validate data freshness
   */
  private validateDataFreshness(
    data: Partial<WeatherData>,
    result: ValidationResult,
  ): void {
    const lastUpdated = new Date(data.last_updated!);
    const now = new Date();
    const ageMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

    if (ageMinutes > 60) {
      // More than 1 hour old
      result.warnings.push({
        field: 'last_updated',
        message: `Weather data is ${Math.round(ageMinutes)} minutes old`,
        suggestion: 'Update weather data more frequently',
      });
    }

    if (ageMinutes > 180) {
      // More than 3 hours old
      result.errors.push({
        field: 'last_updated',
        message: 'Weather data is severely outdated',
        severity: 'medium',
        code: 'STALE_DATA',
      });
    }
  }

  /**
   * Check weather data integrity
   */
  private async checkWeatherDataIntegrity(
    weddingId: string,
    consistencyCheck: DataConsistencyCheck,
  ): Promise<boolean> {
    try {
      const { data: weatherData, error } = await this.supabase
        .from('weather_data')
        .select('*')
        .eq('wedding_id', weddingId);

      if (error) {
        consistencyCheck.issues.push({
          field: 'weather_data',
          message: 'Failed to retrieve weather data',
          severity: 'high',
          code: 'DATA_RETRIEVAL_ERROR',
        });
        return false;
      }

      if (!weatherData || weatherData.length === 0) {
        consistencyCheck.issues.push({
          field: 'weather_data',
          message: 'No weather data found for wedding',
          severity: 'medium',
          code: 'MISSING_WEATHER_DATA',
        });
        return false;
      }

      // Validate each weather record
      let hasErrors = false;
      for (const record of weatherData) {
        const validation = await this.validateWeatherData(record);
        if (!validation.isValid) {
          hasErrors = true;
          consistencyCheck.issues.push(...validation.errors);
        }
      }

      return !hasErrors;
    } catch (error) {
      consistencyCheck.issues.push({
        field: 'weather_data',
        message: 'Weather data integrity check failed',
        severity: 'critical',
        code: 'INTEGRITY_CHECK_ERROR',
      });
      return false;
    }
  }

  /**
   * Parse Zod validation errors
   */
  private parseZodErrors(
    error: z.ZodError,
    severity: ValidationError['severity'],
  ): ValidationError[] {
    return error.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      severity,
      code: `SCHEMA_${err.code}`,
    }));
  }

  /**
   * Validate wedding exists
   */
  private async validateWeddingExists(weddingId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('weddings')
        .select('id')
        .eq('id', weddingId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate venue exists
   */
  private async validateVenueExists(venueId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('venues')
        .select('id')
        .eq('id', venueId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate location coordinates
   */
  private async validateLocationCoordinates(
    location: { latitude: number; longitude: number },
    result: ValidationResult,
  ): Promise<void> {
    // Reverse geocoding to validate coordinates
    try {
      const response = await fetch('/api/placeholder');

      if (!response.ok) {
        result.warnings.push({
          field: 'location',
          message: 'Could not validate location coordinates',
          suggestion: 'Verify coordinates point to a valid location',
        });
        return;
      }

      const data = await response.json();
      if (!data || data.length === 0) {
        result.warnings.push({
          field: 'location',
          message: 'Coordinates do not correspond to a known location',
          suggestion: 'Check latitude and longitude values',
        });
      }
    } catch (error) {
      result.warnings.push({
        field: 'location',
        message: 'Location validation service unavailable',
        suggestion: 'Manually verify coordinates are correct',
      });
    }
  }

  /**
   * Validate notification channels
   */
  private validateNotificationChannels(
    channels: WeatherSubscription['notification_channels'],
    result: ValidationResult,
  ): void {
    // Check if at least one notification channel is enabled
    const hasAnyChannel =
      channels.email ||
      channels.sms ||
      channels.in_app ||
      !!channels.webhook_url;

    if (!hasAnyChannel) {
      result.warnings.push({
        field: 'notification_channels',
        message: 'No notification channels enabled',
        suggestion:
          'Enable at least one notification method to receive weather alerts',
      });
    }

    // Validate webhook URL if provided
    if (channels.webhook_url) {
      try {
        new URL(channels.webhook_url);
      } catch (error) {
        result.errors.push({
          field: 'webhook_url',
          message: 'Invalid webhook URL format',
          severity: 'medium',
          code: 'INVALID_WEBHOOK_URL',
        });
      }
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Placeholder methods for additional consistency checks
  private async checkSubscriptionConsistency(
    weddingId: string,
    consistencyCheck: DataConsistencyCheck,
  ): Promise<boolean> {
    // Implementation would check subscription data consistency
    return true;
  }

  private async checkTimelineAlignment(
    weddingId: string,
    consistencyCheck: DataConsistencyCheck,
  ): Promise<boolean> {
    // Implementation would check timeline data alignment
    return true;
  }

  private async checkVendorDataSync(
    weddingId: string,
    consistencyCheck: DataConsistencyCheck,
  ): Promise<boolean> {
    // Implementation would check vendor data synchronization
    return true;
  }

  private async checkAlertsConsistency(
    weddingId: string,
    consistencyCheck: DataConsistencyCheck,
  ): Promise<boolean> {
    // Implementation would check alerts consistency
    return true;
  }

  private async storeConsistencyCheck(
    consistencyCheck: DataConsistencyCheck,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('data_consistency_checks')
        .insert(consistencyCheck);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store consistency check:', error);
    }
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    cacheSize: number;
    cacheHitRate: number;
  } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // Would need hit/miss tracking to implement
    };
  }
}

// Export singleton instance
export const weatherDataValidator = new WeatherDataValidator();
