'use client';

/**
 * Weather Data Hook
 * Provides real-time weather data for wedding planning with caching and state management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  WeddingWeatherData,
  WeatherAnalytics,
  WeatherNotification,
  WeatherApiResponse,
} from '@/types/weather';

interface UseWeatherDataProps {
  weddingId: string;
  venue: {
    name: string;
    lat: number;
    lon: number;
    address: string;
  };
  weddingDate: string;
  isOutdoor?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface WeatherDataState {
  weatherData: WeddingWeatherData | null;
  analytics: WeatherAnalytics | null;
  alerts: WeatherNotification[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface UseWeatherDataReturn extends WeatherDataState {
  refetch: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  markAllAlertsRead: () => Promise<void>;
  clearError: () => void;
}

export function useWeatherData({
  weddingId,
  venue,
  weddingDate,
  isOutdoor = true,
  autoRefresh = true,
  refreshInterval = 30 * 60 * 1000, // 30 minutes
}: UseWeatherDataProps): UseWeatherDataReturn {
  const [state, setState] = useState<WeatherDataState>({
    weatherData: null,
    analytics: null,
    alerts: [],
    loading: false,
    error: null,
    lastUpdated: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const fetchWeatherData = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { lat, lon } = venue;

      // Fetch wedding weather data
      const weatherResponse = await fetch('/api/placeholder');

      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }

      const weatherResult: WeatherApiResponse<WeddingWeatherData> =
        await weatherResponse.json();

      if (!weatherResult.success) {
        throw new Error(weatherResult.error || 'Failed to fetch weather data');
      }

      // Fetch weather analytics
      const analyticsResponse = await fetch('/api/placeholder');

      let analyticsResult: WeatherApiResponse<WeatherAnalytics> | null = null;
      if (analyticsResponse.ok) {
        analyticsResult = await analyticsResponse.json();
      }

      // Fetch weather alerts
      const alertsResponse = await fetch('/api/placeholder');
      let alertsResult: WeatherApiResponse<WeatherNotification[]> | null = null;
      if (alertsResponse.ok) {
        alertsResult = await alertsResponse.json();
      }

      setState((prev) => ({
        ...prev,
        weatherData: weatherResult.data || null,
        analytics: (analyticsResult?.success && analyticsResult.data) || null,
        alerts: (alertsResult?.success && alertsResult.data) || [],
        loading: false,
        lastUpdated: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Weather data fetch error:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch weather data',
      }));
    }
  }, [weddingId, venue, weddingDate, isOutdoor]);

  const acknowledgeAlert = useCallback(
    async (alertId: string): Promise<void> => {
      try {
        const response = await fetch('/api/weather/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'acknowledge',
            weddingId,
            notificationId: alertId,
            userId: 'current-user', // In production, this would come from auth context
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to acknowledge alert: ${response.status}`);
        }

        const result: WeatherApiResponse<WeatherNotification[]> =
          await response.json();

        if (result.success && result.data) {
          setState((prev) => ({ ...prev, alerts: result.data || [] }));
        }
      } catch (error) {
        console.error('Error acknowledging alert:', error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to acknowledge alert',
        }));
      }
    },
    [weddingId],
  );

  const markAllAlertsRead = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/weather/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAllRead',
          weddingId,
          userId: 'current-user',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark alerts as read: ${response.status}`);
      }

      const result: WeatherApiResponse<WeatherNotification[]> =
        await response.json();

      if (result.success && result.data) {
        setState((prev) => ({ ...prev, alerts: result.data || [] }));
      }
    } catch (error) {
      console.error('Error marking alerts as read:', error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to mark alerts as read',
      }));
    }
  }, [weddingId]);

  // Initial data fetch
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchWeatherData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchWeatherData]);

  // Refetch function for manual refresh
  const refetch = useCallback(async (): Promise<void> => {
    await fetchWeatherData();
  }, [fetchWeatherData]);

  return {
    weatherData: state.weatherData,
    analytics: state.analytics,
    alerts: state.alerts,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refetch,
    acknowledgeAlert,
    markAllAlertsRead,
    clearError,
  };
}

export default useWeatherData;
