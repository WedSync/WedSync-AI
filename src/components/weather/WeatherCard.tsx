'use client';

/**
 * Weather Card Component
 * Reusable weather condition display card for current conditions
 * Following Untitled UI patterns from SAAS-UI-STYLE-GUIDE.md
 */

import React from 'react';
import { CurrentWeather, WeatherDescription } from '@/types/weather';
import { Card } from '@/components/untitled-ui';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
  Droplets,
  AlertTriangle,
  Umbrella,
} from 'lucide-react';

interface WeatherCardProps {
  weather: CurrentWeather;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function WeatherCard({
  weather,
  size = 'md',
  showDetails = true,
  className = '',
}: WeatherCardProps) {
  const getWeatherIcon = (
    condition: string,
    iconSize: 'sm' | 'md' | 'lg' = 'md',
  ) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    };

    const iconProps = {
      className: `${sizeClasses[iconSize]} ${getWeatherIconColor(condition)}`,
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

    const mainCondition = condition.toLowerCase();
    return icons[mainCondition] || <Cloud {...iconProps} />;
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

  const getComfortLevel = (
    temp: number,
    humidity: number,
    windSpeed: number,
  ): string => {
    if (temp < 10) return 'Cold';
    if (temp > 30) return 'Hot';
    if (humidity > 80) return 'Humid';
    if (windSpeed > 20) return 'Windy';
    if (temp >= 18 && temp <= 26 && humidity < 70) return 'Comfortable';
    return 'Mild';
  };

  const getComfortColor = (comfort: string): string => {
    const colors: { [key: string]: string } = {
      Comfortable: 'text-green-600',
      Mild: 'text-blue-600',
      Cold: 'text-blue-800',
      Hot: 'text-red-600',
      Humid: 'text-orange-600',
      Windy: 'text-gray-600',
    };
    return colors[comfort] || 'text-gray-600';
  };

  const cardSizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const textSizes = {
    sm: { temp: 'text-2xl', label: 'text-xs', desc: 'text-xs' },
    md: { temp: 'text-3xl', label: 'text-sm', desc: 'text-sm' },
    lg: { temp: 'text-4xl', label: 'text-base', desc: 'text-base' },
  };

  const iconSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  };

  const mainWeatherCondition = weather.weather[0]?.main || 'Clear';
  const weatherDescription = weather.weather[0]?.description || 'Clear sky';
  const comfort = getComfortLevel(
    weather.temp,
    weather.humidity,
    weather.wind_speed * 3.6,
  ); // Convert m/s to km/h

  return (
    <Card
      className={`
      ${cardSizes[size]}
      bg-white border border-gray-200 rounded-xl
      shadow-xs hover:shadow-md transition-all duration-200
      ${className}
    `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {getWeatherIcon(mainWeatherCondition, iconSizes[size])}
            <div>
              <p className={`${textSizes[size].temp} font-bold text-gray-900`}>
                {Math.round(weather.temp)}°C
              </p>
              <p className={`${textSizes[size].label} text-gray-500`}>
                Feels like {Math.round(weather.feels_like)}°C
              </p>
            </div>
          </div>

          <p
            className={`${textSizes[size].desc} text-gray-600 capitalize mb-1`}
          >
            {weatherDescription}
          </p>

          <p
            className={`${textSizes[size].label} font-medium ${getComfortColor(comfort)}`}
          >
            {comfort} conditions
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <div>
                <p className={`${textSizes[size].label} text-gray-500`}>
                  Humidity
                </p>
                <p
                  className={`${textSizes[size].desc} font-medium text-gray-900`}
                >
                  {weather.humidity}%
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Wind className="w-4 h-4 text-gray-500" />
              <div>
                <p className={`${textSizes[size].label} text-gray-500`}>Wind</p>
                <p
                  className={`${textSizes[size].desc} font-medium text-gray-900`}
                >
                  {Math.round(weather.wind_speed * 3.6)} km/h
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <div>
                <p className={`${textSizes[size].label} text-gray-500`}>
                  Visibility
                </p>
                <p
                  className={`${textSizes[size].desc} font-medium text-gray-900`}
                >
                  {(weather.visibility / 1000).toFixed(1)} km
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <div>
                <p className={`${textSizes[size].label} text-gray-500`}>
                  UV Index
                </p>
                <p
                  className={`${textSizes[size].desc} font-medium text-gray-900`}
                >
                  {Math.round(weather.uvi)}
                </p>
              </div>
            </div>
          </div>

          {weather.wind_gust &&
            weather.wind_gust > weather.wind_speed * 1.5 && (
              <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <p className={`${textSizes[size].label} text-yellow-800`}>
                  Wind gusts up to {Math.round(weather.wind_gust * 3.6)} km/h
                </p>
              </div>
            )}
        </div>
      )}
    </Card>
  );
}

export default WeatherCard;
