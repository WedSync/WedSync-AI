'use client';

/**
 * Weather Dashboard Page
 * Complete weather integration for wedding planning
 * Uses all weather components with real API integration
 */

import React from 'react';
import { WeatherDashboard } from '@/components/weather/WeatherDashboard';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { WeatherTimeline } from '@/components/weather/WeatherTimeline';
import { MobileWeatherWidget } from '@/components/weather/MobileWeatherWidget';
import useWeatherData from '@/hooks/useWeatherData';
import { Card } from '@/components/untitled-ui';
import {
  Cloud,
  AlertTriangle,
  MapPin,
  Calendar,
  RefreshCw,
  Smartphone,
  Monitor,
} from 'lucide-react';

// Demo data - in production this would come from wedding context/database
const DEMO_WEDDING_DATA = {
  weddingId: 'wedding-demo',
  venue: {
    name: 'Garden Estate Venue',
    lat: 37.7749, // San Francisco coordinates as demo
    lon: -122.4194,
    address: '123 Garden Way, Napa Valley, CA',
  },
  weddingDate: '2025-09-15T14:00:00.000Z', // Sample future wedding date
  isOutdoor: true,
};

const DEMO_WEDDING_EVENTS = [
  { time: '14:00', name: 'Ceremony', duration: 1, priority: 'high' as const },
  {
    time: '15:00',
    name: 'Cocktails',
    duration: 1.5,
    priority: 'medium' as const,
  },
  { time: '16:30', name: 'Photos', duration: 2, priority: 'high' as const },
  {
    time: '18:30',
    name: 'Reception',
    duration: 4,
    priority: 'medium' as const,
  },
];

export default function WeatherPage() {
  const {
    weatherData,
    analytics,
    alerts,
    loading,
    error,
    lastUpdated,
    refetch,
  } = useWeatherData({
    weddingId: DEMO_WEDDING_DATA.weddingId,
    venue: DEMO_WEDDING_DATA.venue,
    weddingDate: DEMO_WEDDING_DATA.weddingDate,
    isOutdoor: DEMO_WEDDING_DATA.isOutdoor,
    autoRefresh: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
  });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Weather Service Unavailable
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Try Again</span>
            </button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Weather Dashboard
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{DEMO_WEDDING_DATA.venue.name}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(DEMO_WEDDING_DATA.weddingDate).toLocaleDateString(
                  'en-US',
                  {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  },
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {lastUpdated && (
            <div className="text-sm text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Desktop Preview Toggle */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-8 lg:space-y-0">
        {/* Main Weather Dashboard */}
        <div className="lg:col-span-8">
          {weatherData && analytics ? (
            <WeatherDashboard
              weddingId={DEMO_WEDDING_DATA.weddingId}
              venue={DEMO_WEDDING_DATA.venue}
              weddingDate={DEMO_WEDDING_DATA.weddingDate}
              isOutdoor={DEMO_WEDDING_DATA.isOutdoor}
            />
          ) : (
            <Card className="p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded"></div>
                  ))}
                </div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Components */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mobile Weather Widget Preview */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Mobile Preview
              </h3>
            </div>
            <div className="max-w-sm mx-auto">
              {weatherData && (
                <MobileWeatherWidget
                  currentWeather={weatherData.current}
                  todayForecast={weatherData.dailyForecast[0]}
                  tomorrowForecast={weatherData.dailyForecast[1]}
                  alerts={alerts}
                  venue={DEMO_WEDDING_DATA.venue}
                  weddingDate={DEMO_WEDDING_DATA.weddingDate}
                  onRefresh={refetch}
                  isLoading={loading}
                  lastUpdated={lastUpdated || undefined}
                />
              )}
            </div>
          </Card>

          {/* Current Weather Card */}
          {weatherData?.current && (
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Monitor className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Conditions
                </h3>
              </div>
              <WeatherCard
                weather={weatherData.current}
                size="md"
                showDetails={true}
              />
            </Card>
          )}

          {/* Quick Stats */}
          {analytics && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Risk Assessment
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overall Risk</span>
                  <span
                    className={`text-sm font-semibold px-2 py-1 rounded ${
                      analytics.risk.overall === 'low'
                        ? 'bg-green-100 text-green-800'
                        : analytics.risk.overall === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : analytics.risk.overall === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {analytics.risk.overall.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Precipitation</span>
                  <span className="text-sm font-medium">
                    {Math.round(analytics.risk.precipitation)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Temperature</span>
                  <span className="text-sm font-medium">
                    {Math.round(analytics.risk.temperature)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Wind</span>
                  <span className="text-sm font-medium">
                    {Math.round(analytics.risk.wind)}%
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Weather Timeline */}
      {weatherData && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Wedding Day Timeline
          </h2>
          <WeatherTimeline
            hourlyForecast={weatherData.hourlyForecast}
            weddingDate={DEMO_WEDDING_DATA.weddingDate}
            weddingEvents={DEMO_WEDDING_EVENTS}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && !weatherData && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm mx-4">
            <div className="flex items-center space-x-3">
              <Cloud className="w-6 h-6 text-blue-500 animate-pulse" />
              <span className="text-gray-900 font-medium">
                Loading weather data...
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
