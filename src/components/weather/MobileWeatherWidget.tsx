'use client';

/**
 * Mobile Weather Widget Component
 * Compact mobile weather display optimized for small screens and touch interfaces
 * Following Untitled UI patterns from SAAS-UI-STYLE-GUIDE.md
 */

import React, { useState } from 'react';
import {
  CurrentWeather,
  DailyWeather,
  WeatherNotification,
} from '@/types/weather';
import { Card, Badge } from '@/components/untitled-ui';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface MobileWeatherWidgetProps {
  currentWeather: CurrentWeather;
  todayForecast?: DailyWeather;
  tomorrowForecast?: DailyWeather;
  alerts?: WeatherNotification[];
  venue?: {
    name: string;
    address: string;
  };
  weddingDate?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  lastUpdated?: string;
  className?: string;
}

export function MobileWeatherWidget({
  currentWeather,
  todayForecast,
  tomorrowForecast,
  alerts = [],
  venue,
  weddingDate,
  onRefresh,
  isLoading = false,
  lastUpdated,
  className = '',
}: MobileWeatherWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getWeatherIcon = (condition: string, size: 'sm' | 'md' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
    };

    const iconProps = {
      className: `${sizeClasses[size]} ${getWeatherIconColor(condition)}`,
    };

    const icons: { [key: string]: React.ReactElement } = {
      clear: <Sun {...iconProps} />,
      clouds: <Cloud {...iconProps} />,
      rain: <CloudRain {...iconProps} />,
      drizzle: <CloudRain {...iconProps} />,
      thunderstorm: <AlertTriangle {...iconProps} />,
      snow: <Cloud {...iconProps} />,
      mist: <Cloud {...iconProps} />,
      fog: <Cloud {...iconProps} />,
    };

    return icons[condition.toLowerCase()] || <Cloud {...iconProps} />;
  };

  const getWeatherIconColor = (condition: string): string => {
    const colors: { [key: string]: string } = {
      clear: 'text-yellow-500',
      clouds: 'text-gray-500',
      rain: 'text-blue-500',
      drizzle: 'text-blue-400',
      thunderstorm: 'text-purple-600',
      snow: 'text-blue-200',
      mist: 'text-gray-400',
      fog: 'text-gray-400',
    };
    return colors[condition.toLowerCase()] || 'text-gray-500';
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getAlertSeverityColor = (severity: string): string => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      error: 'bg-orange-100 text-orange-800 border-orange-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return (
      colors[severity as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter(
    (alert) => alert.severity === 'critical',
  );

  const mainWeatherCondition = currentWeather.weather[0]?.main || 'Clear';
  const weatherDescription =
    currentWeather.weather[0]?.description || 'Clear sky';

  const isWeddingToday =
    weddingDate &&
    new Date(weddingDate).toDateString() === new Date().toDateString();

  return (
    <Card
      className={`
      ${className}
      bg-white border border-gray-200 rounded-lg
      shadow-xs
      touch-manipulation
    `}
    >
      {/* Compact Header - Always Visible */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getWeatherIcon(mainWeatherCondition)}
            <div>
              <p className="text-xl font-bold text-gray-900">
                {Math.round(currentWeather.temp)}°
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {weatherDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {criticalAlerts.length > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {criticalAlerts.length}
              </Badge>
            )}

            {isWeddingToday && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                Wedding Day!
              </Badge>
            )}

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        {!isExpanded && (
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Droplets className="w-3 h-3" />
              <span>{currentWeather.humidity}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <Wind className="w-3 h-3" />
              <span>{Math.round(currentWeather.wind_speed * 3.6)} km/h</span>
            </div>
            {todayForecast && (
              <span className="text-blue-600">
                {Math.round(todayForecast.pop * 100)}% rain
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Location & Date */}
          {(venue || weddingDate) && (
            <div className="space-y-2">
              {venue && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {venue.name}
                    </p>
                    <p className="text-xs text-gray-500">{venue.address}</p>
                  </div>
                </div>
              )}

              {weddingDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Wedding:{' '}
                    {new Date(weddingDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Conditions Detail */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Feels like</p>
              <p className="font-medium text-gray-900">
                {Math.round(currentWeather.feels_like)}°C
              </p>
            </div>
            <div>
              <p className="text-gray-500">Humidity</p>
              <p className="font-medium text-gray-900">
                {currentWeather.humidity}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Wind</p>
              <p className="font-medium text-gray-900">
                {Math.round(currentWeather.wind_speed * 3.6)} km/h
                {currentWeather.wind_gust &&
                  currentWeather.wind_gust >
                    currentWeather.wind_speed * 1.3 && (
                    <span className="text-orange-600 text-xs ml-1">
                      (gusts {Math.round(currentWeather.wind_gust * 3.6)})
                    </span>
                  )}
              </p>
            </div>
            <div>
              <p className="text-gray-500">UV Index</p>
              <p
                className={`font-medium ${
                  currentWeather.uvi >= 8
                    ? 'text-red-600'
                    : currentWeather.uvi >= 6
                      ? 'text-orange-600'
                      : currentWeather.uvi >= 3
                        ? 'text-yellow-600'
                        : 'text-green-600'
                }`}
              >
                {Math.round(currentWeather.uvi)}
              </p>
            </div>
          </div>

          {/* Sun Times */}
          <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
            <div className="text-center">
              <p className="text-gray-500">Sunrise</p>
              <p className="font-medium text-gray-900">
                {formatTime(currentWeather.sunrise)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Sunset</p>
              <p className="font-medium text-gray-900">
                {formatTime(currentWeather.sunset)}
              </p>
            </div>
          </div>

          {/* Forecast Preview */}
          {(todayForecast || tomorrowForecast) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">Forecast</p>
              <div className="space-y-2">
                {todayForecast && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {getWeatherIcon(
                        todayForecast.weather[0]?.main || 'clear',
                        'sm',
                      )}
                      <span className="text-sm text-gray-700">Today</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {Math.round(todayForecast.temp.max)}°/
                        {Math.round(todayForecast.temp.min)}°
                      </span>
                      <span className="text-blue-600">
                        {Math.round(todayForecast.pop * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {tomorrowForecast && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {getWeatherIcon(
                        tomorrowForecast.weather[0]?.main || 'clear',
                        'sm',
                      )}
                      <span className="text-sm text-gray-700">Tomorrow</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {Math.round(tomorrowForecast.temp.max)}°/
                        {Math.round(tomorrowForecast.temp.min)}°
                      </span>
                      <span className="text-blue-600">
                        {Math.round(tomorrowForecast.pop * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Alerts Preview */}
          {unacknowledgedAlerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Active Alerts ({unacknowledgedAlerts.length})
              </p>
              <div className="space-y-2">
                {unacknowledgedAlerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded text-xs ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1">{alert.message}</p>
                  </div>
                ))}
                {unacknowledgedAlerts.length > 2 && (
                  <p className="text-xs text-gray-500 text-center">
                    +{unacknowledgedAlerts.length - 2} more alerts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              {lastUpdated && (
                <p className="text-xs text-gray-500">
                  Updated {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>

            {onRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isLoading}
                className={`
                  flex items-center space-x-1 px-3 py-1.5 text-xs font-medium
                  rounded-md transition-all duration-200
                  ${
                    isLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  }
                `}
              >
                <RefreshCw
                  className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default MobileWeatherWidget;
