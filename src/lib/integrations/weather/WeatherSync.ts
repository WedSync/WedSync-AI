/**
 * WeatherSync - Real-time Weather Data Synchronization System
 * Handles weather data integration for wedding planning systems
 * WS-220: Weather API Integration - Team C Round 1
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/realtime-js';

export interface WeatherData {
  id: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    venue_name?: string;
  };
  current: {
    temperature: number;
    humidity: number;
    conditions: string;
    wind_speed: number;
    wind_direction: number;
    visibility: number;
    precipitation: number;
  };
  forecast: {
    date: string;
    high_temp: number;
    low_temp: number;
    conditions: string;
    precipitation_chance: number;
    wind_speed: number;
  }[];
  alerts: {
    id: string;
    type: 'severe_weather' | 'rain' | 'high_wind' | 'extreme_temp';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    start_time: string;
    end_time: string;
  }[];
  last_updated: string;
  wedding_id: string;
  venue_id: string;
}

export interface WeatherSubscription {
  id: string;
  wedding_id: string;
  venue_id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  alert_preferences: {
    rain_alerts: boolean;
    wind_alerts: boolean;
    temperature_alerts: boolean;
    severe_weather_alerts: boolean;
    notification_threshold: number; // hours before wedding
  };
  notification_channels: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
    webhook_url?: string;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
}

export class WeatherSync {
  private supabase;
  private weatherChannel: RealtimeChannel | null = null;
  private subscriptions: Map<string, WeatherSubscription> = new Map();
  private readonly WEATHER_API_KEY: string;

  constructor() {
    this.supabase = createSupabaseClient();
    this.WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';

    if (!this.WEATHER_API_KEY) {
      console.warn(
        'WEATHER_API_KEY not configured - weather integration will be limited',
      );
    }
  }

  /**
   * Initialize real-time weather synchronization
   */
  async initialize(): Promise<void> {
    try {
      // Set up Supabase realtime subscription for weather data
      this.weatherChannel = this.supabase
        .channel('weather_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'weather_data',
          },
          (payload) => this.handleWeatherDataChange(payload),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'weather_subscriptions',
          },
          (payload) => this.handleSubscriptionChange(payload),
        )
        .subscribe();

      // Load existing subscriptions
      await this.loadExistingSubscriptions();

      console.log('WeatherSync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WeatherSync:', error);
      throw error;
    }
  }

  /**
   * Create a new weather subscription for a wedding/venue
   */
  async createSubscription(
    weddingId: string,
    venueId: string,
    location: { latitude: number; longitude: number },
    preferences: WeatherSubscription['alert_preferences'],
    notificationChannels: WeatherSubscription['notification_channels'],
  ): Promise<string> {
    try {
      const subscription: Partial<WeatherSubscription> = {
        wedding_id: weddingId,
        venue_id: venueId,
        location,
        alert_preferences: preferences,
        notification_channels: notificationChannels,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('weather_subscriptions')
        .insert(subscription)
        .select('id')
        .single();

      if (error) throw error;

      // Start monitoring weather for this location
      await this.startWeatherMonitoring(data.id, location);

      return data.id;
    } catch (error) {
      console.error('Failed to create weather subscription:', error);
      throw error;
    }
  }

  /**
   * Start real-time weather monitoring for a location
   */
  private async startWeatherMonitoring(
    subscriptionId: string,
    location: { latitude: number; longitude: number },
  ): Promise<void> {
    try {
      // Initial weather data fetch
      const weatherData = await this.fetchWeatherData(location);

      // Store in database
      await this.storeWeatherData(subscriptionId, weatherData);

      // Set up periodic updates (every 30 minutes for real-time data)
      setInterval(
        async () => {
          try {
            const updatedWeather = await this.fetchWeatherData(location);
            await this.storeWeatherData(subscriptionId, updatedWeather);

            // Check for alerts
            await this.processWeatherAlerts(subscriptionId, updatedWeather);
          } catch (error) {
            console.error('Weather monitoring update failed:', error);
          }
        },
        30 * 60 * 1000,
      ); // 30 minutes
    } catch (error) {
      console.error('Failed to start weather monitoring:', error);
      throw error;
    }
  }

  /**
   * Fetch weather data from external API
   */
  private async fetchWeatherData(location: {
    latitude: number;
    longitude: number;
  }): Promise<Partial<WeatherData>> {
    try {
      // Using OpenWeatherMap API as example
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${this.WEATHER_API_KEY}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.latitude}&lon=${location.longitude}&appid=${this.WEATHER_API_KEY}&units=metric`;

      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentUrl),
        fetch(forecastUrl),
      ]);

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('Weather API request failed');
      }

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();

      return {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: `${currentData.name}, ${currentData.sys.country}`,
        },
        current: {
          temperature: currentData.main.temp,
          humidity: currentData.main.humidity,
          conditions: currentData.weather[0].description,
          wind_speed: currentData.wind.speed,
          wind_direction: currentData.wind.deg,
          visibility: currentData.visibility / 1000, // Convert to km
          precipitation:
            currentData.rain?.['1h'] || currentData.snow?.['1h'] || 0,
        },
        forecast: forecastData.list.slice(0, 5).map((item: any) => ({
          date: item.dt_txt,
          high_temp: item.main.temp_max,
          low_temp: item.main.temp_min,
          conditions: item.weather[0].description,
          precipitation_chance: item.pop * 100, // Convert to percentage
          wind_speed: item.wind.speed,
        })),
        alerts: [], // Would be populated from weather service alerts
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw error;
    }
  }

  /**
   * Store weather data in database
   */
  private async storeWeatherData(
    subscriptionId: string,
    weatherData: Partial<WeatherData>,
  ): Promise<void> {
    try {
      // Get subscription details
      const { data: subscription } = await this.supabase
        .from('weather_subscriptions')
        .select('wedding_id, venue_id')
        .eq('id', subscriptionId)
        .single();

      if (!subscription) throw new Error('Subscription not found');

      const fullWeatherData = {
        ...weatherData,
        wedding_id: subscription.wedding_id,
        venue_id: subscription.venue_id,
      };

      const { error } = await this.supabase
        .from('weather_data')
        .upsert(fullWeatherData, {
          onConflict: 'wedding_id,venue_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to store weather data:', error);
      throw error;
    }
  }

  /**
   * Process weather alerts and trigger notifications
   */
  private async processWeatherAlerts(
    subscriptionId: string,
    weatherData: Partial<WeatherData>,
  ): Promise<void> {
    try {
      const { data: subscription } = await this.supabase
        .from('weather_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (!subscription || !subscription.active) return;

      const alerts = this.generateWeatherAlerts(weatherData, subscription);

      if (alerts.length > 0) {
        await this.sendWeatherNotifications(subscription, alerts);
      }
    } catch (error) {
      console.error('Failed to process weather alerts:', error);
    }
  }

  /**
   * Generate weather alerts based on conditions and preferences
   */
  private generateWeatherAlerts(
    weatherData: Partial<WeatherData>,
    subscription: WeatherSubscription,
  ): WeatherData['alerts'] {
    const alerts: WeatherData['alerts'] = [];
    const { alert_preferences } = subscription;

    if (!weatherData.current || !weatherData.forecast) return alerts;

    // Rain alerts
    if (
      alert_preferences.rain_alerts &&
      weatherData.current.precipitation > 0
    ) {
      alerts.push({
        id: `rain_${Date.now()}`,
        type: 'rain',
        severity: weatherData.current.precipitation > 5 ? 'high' : 'medium',
        message: `Rain detected at venue location. Current precipitation: ${weatherData.current.precipitation}mm/h`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      });
    }

    // High wind alerts
    if (alert_preferences.wind_alerts && weatherData.current.wind_speed > 10) {
      alerts.push({
        id: `wind_${Date.now()}`,
        type: 'high_wind',
        severity: weatherData.current.wind_speed > 20 ? 'high' : 'medium',
        message: `High wind conditions at venue. Current wind speed: ${weatherData.current.wind_speed} m/s`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
      });
    }

    // Temperature alerts
    if (alert_preferences.temperature_alerts) {
      if (
        weatherData.current.temperature < 0 ||
        weatherData.current.temperature > 35
      ) {
        alerts.push({
          id: `temp_${Date.now()}`,
          type: 'extreme_temp',
          severity: 'medium',
          message: `Extreme temperature at venue: ${weatherData.current.temperature}°C`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
        });
      }
    }

    return alerts;
  }

  /**
   * Send weather notifications through configured channels
   */
  private async sendWeatherNotifications(
    subscription: WeatherSubscription,
    alerts: WeatherData['alerts'],
  ): Promise<void> {
    try {
      const { notification_channels } = subscription;

      for (const alert of alerts) {
        // In-app notification
        if (notification_channels.in_app) {
          await this.sendInAppNotification(subscription.wedding_id, alert);
        }

        // Email notification
        if (notification_channels.email) {
          await this.sendEmailNotification(subscription.wedding_id, alert);
        }

        // SMS notification
        if (notification_channels.sms) {
          await this.sendSMSNotification(subscription.wedding_id, alert);
        }

        // Webhook notification
        if (notification_channels.webhook_url) {
          await this.sendWebhookNotification(
            notification_channels.webhook_url,
            alert,
          );
        }
      }
    } catch (error) {
      console.error('Failed to send weather notifications:', error);
    }
  }

  /**
   * Handle real-time weather data changes
   */
  private handleWeatherDataChange(payload: any): void {
    console.log('Weather data changed:', payload);
    // Emit events for UI updates, additional processing, etc.
  }

  /**
   * Handle subscription changes
   */
  private handleSubscriptionChange(payload: any): void {
    console.log('Weather subscription changed:', payload);
    // Handle subscription updates, cancellations, etc.
  }

  /**
   * Load existing subscriptions from database
   */
  private async loadExistingSubscriptions(): Promise<void> {
    try {
      const { data: subscriptions, error } = await this.supabase
        .from('weather_subscriptions')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      for (const subscription of subscriptions) {
        this.subscriptions.set(subscription.id, subscription);
        await this.startWeatherMonitoring(
          subscription.id,
          subscription.location,
        );
      }
    } catch (error) {
      console.error('Failed to load existing subscriptions:', error);
    }
  }

  // Notification methods (to be implemented with actual services)
  private async sendInAppNotification(
    weddingId: string,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    // Implementation would use your notification service
    console.log('In-app notification:', { weddingId, alert });
  }

  private async sendEmailNotification(
    weddingId: string,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    // Implementation would use your email service (Resend)
    console.log('Email notification:', { weddingId, alert });
  }

  private async sendSMSNotification(
    weddingId: string,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    // Implementation would use your SMS service (Twilio)
    console.log('SMS notification:', { weddingId, alert });
  }

  private async sendWebhookNotification(
    webhookUrl: string,
    alert: WeatherData['alerts'][0],
  ): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'weather_alert',
          alert,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    if (this.weatherChannel) {
      await this.weatherChannel.unsubscribe();
      this.weatherChannel = null;
    }
    this.subscriptions.clear();
  }
}

// Export singleton instance
export const weatherSync = new WeatherSync();
