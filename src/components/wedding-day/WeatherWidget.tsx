'use client';

import { useState, useEffect } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { WeatherCondition } from '@/types/wedding-day';

const weatherIcons = {
  clear: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudRain,
  snow: CloudSnow,
  fog: Cloud,
};

const weatherColors = {
  clear: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cloudy: 'bg-gray-100 text-gray-800 border-gray-200',
  rain: 'bg-blue-100 text-blue-800 border-blue-200',
  storm: 'bg-purple-100 text-purple-800 border-purple-200',
  snow: 'bg-blue-100 text-blue-800 border-blue-200',
  fog: 'bg-gray-100 text-gray-800 border-gray-200',
};

interface WeatherWidgetProps {
  weather?: WeatherCondition;
  venue: {
    name: string;
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  className?: string;
}

export function WeatherWidget({
  weather,
  venue,
  className,
}: WeatherWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshWeather = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would call your weather API
      // For demo purposes, we'll simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to update weather');
    } finally {
      setIsLoading(false);
    }
  };

  if (!weather) {
    return (
      <div className={cn('bg-white rounded-lg shadow p-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-gray-900">Weather</h3>
          <button
            onClick={refreshWeather}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Cloud className="w-12 h-12 mb-3 text-gray-300" />
          <p className="text-sm">Weather data unavailable</p>
          <button
            onClick={refreshWeather}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Try to load weather
          </button>
        </div>
      </div>
    );
  }

  const WeatherIcon = weatherIcons[weather.condition];
  const isOutdoorConcern =
    weather.condition === 'rain' ||
    weather.condition === 'storm' ||
    weather.precipitation > 30 ||
    weather.windSpeed > 25;

  return (
    <div className={cn('bg-white rounded-lg shadow', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WeatherIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Weather</h3>
          </div>

          <button
            onClick={refreshWeather}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh weather"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
          <MapPin className="w-3 h-3" />
          <span>{venue.name}</span>
        </div>
      </div>

      {/* Weather Alert */}
      {isOutdoorConcern && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Outdoor Event Alert</p>
              <p className="text-yellow-700">
                {weather.condition === 'rain' || weather.condition === 'storm'
                  ? `${weather.precipitation}% chance of rain`
                  : `High winds: ${weather.windSpeed} mph`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Current Conditions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                weatherColors[weather.condition],
              )}
            >
              <WeatherIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {weather.temperature}°F
              </div>
              <div className="text-sm text-gray-600 capitalize">
                {weather.condition}
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {lastUpdated
                ? `Updated ${format(lastUpdated, 'HH:mm')}`
                : `As of ${format(new Date(weather.timestamp), 'HH:mm')}`}
            </div>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Humidity */}
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {weather.humidity}%
              </div>
              <div className="text-xs text-gray-600">Humidity</div>
            </div>
          </div>

          {/* Wind */}
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {weather.windSpeed} mph
              </div>
              <div className="text-xs text-gray-600">Wind</div>
            </div>
          </div>

          {/* Precipitation */}
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {weather.precipitation}%
              </div>
              <div className="text-xs text-gray-600">Rain Chance</div>
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {weather.visibility} mi
              </div>
              <div className="text-xs text-gray-600">Visibility</div>
            </div>
          </div>
        </div>

        {/* Hourly Forecast */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Today's Forecast
            </h4>

            <div className="space-y-2">
              {weather.forecast.slice(0, 4).map((forecast, index) => {
                const ForecastIcon =
                  weatherIcons[
                    forecast.condition as keyof typeof weatherIcons
                  ] || Cloud;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <ForecastIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">
                        {format(new Date(forecast.time), 'HH:mm')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-gray-600">
                        {forecast.temperature}°F
                      </span>
                      {forecast.precipitation > 0 && (
                        <span className="text-blue-600">
                          {forecast.precipitation}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weather Recommendations */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Recommendations
          </h4>

          <div className="space-y-1 text-xs text-gray-600">
            {weather.condition === 'rain' || weather.precipitation > 30 ? (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                <span>Consider backup indoor plans</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full" />
                <span>Good conditions for outdoor events</span>
              </div>
            )}

            {weather.windSpeed > 20 && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-yellow-500 rounded-full" />
                <span>Secure loose decorations due to wind</span>
              </div>
            )}

            {weather.temperature < 50 && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                <span>Consider providing blankets for guests</span>
              </div>
            )}

            {weather.temperature > 85 && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-red-500 rounded-full" />
                <span>Ensure adequate shade and hydration</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-t border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
