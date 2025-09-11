'use client';

/**
 * Weather Forecast Widget
 * Displays detailed hourly and daily weather forecasts
 */

import React, { useState } from 'react';
import { DailyWeather, HourlyWeather } from '@/types/weather';
import { Card, Badge } from '@/components/untitled-ui';

// Custom Tab Components using Untitled UI styles
const TabsList = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex space-x-1 bg-gray-50 p-1 rounded-lg ${className}`}>
    {children}
  </div>
);

const TabsTrigger = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`
      flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
      ${
        active
          ? 'bg-white text-gray-900 shadow-xs'
          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
      }
    `}
  >
    {children}
  </button>
);
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  Moon,
  Thermometer,
} from 'lucide-react';

interface WeatherForecastWidgetProps {
  dailyForecast: DailyWeather[];
  hourlyForecast: HourlyWeather[];
  weddingDate: string;
}

export function WeatherForecastWidget({
  dailyForecast,
  hourlyForecast,
  weddingDate,
}: WeatherForecastWidgetProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('daily');

  const getWeatherIcon = (
    condition: string,
    size: 'sm' | 'md' | 'lg' = 'md',
  ) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
    };

    const iconProps = {
      className: `${sizeClasses[size]} ${getWeatherIconColor(condition)}`,
    };

    const icons: { [key: string]: React.ReactElement } = {
      clear: <Sun {...iconProps} />,
      clouds: <Cloud {...iconProps} />,
      rain: <CloudRain {...iconProps} />,
      drizzle: <CloudRain {...iconProps} />,
      thunderstorm: <CloudRain {...iconProps} />,
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

  const getPrecipitationColor = (pop: number): string => {
    if (pop >= 0.7) return 'text-red-600 bg-red-50';
    if (pop >= 0.4) return 'text-orange-600 bg-orange-50';
    if (pop >= 0.2) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isWeddingDay = (timestamp: number): boolean => {
    const dayDate = new Date(timestamp * 1000);
    const weddingDateObj = new Date(weddingDate);
    return dayDate.toDateString() === weddingDateObj.toDateString();
  };

  const getWeddingDayHourly = (): HourlyWeather[] => {
    return hourlyForecast.filter((hour) => isWeddingDay(hour.dt));
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger
            active={activeTab === 'daily'}
            onClick={() => setActiveTab('daily')}
          >
            14-Day Forecast
          </TabsTrigger>
          <TabsTrigger
            active={activeTab === 'hourly'}
            onClick={() => setActiveTab('hourly')}
          >
            Wedding Day Hourly
          </TabsTrigger>
        </TabsList>

        {activeTab === 'daily' && (
          <div className="space-y-4 mt-6">
            <div className="grid gap-3">
              {dailyForecast.map((day, index) => (
                <Card
                  key={day.dt}
                  className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                    isWeddingDay(day.dt)
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : selectedDay === index
                        ? 'ring-1 ring-gray-300 bg-gray-50'
                        : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDay(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm font-medium">
                          {formatDate(day.dt)}
                        </p>
                        {isWeddingDay(day.dt) && (
                          <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">
                            Wedding Day
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {getWeatherIcon(day.weather[0]?.main || 'clear', 'lg')}
                        <div>
                          <p className="font-medium">
                            {day.weather[0]?.description || 'No description'}
                          </p>
                          <p className="text-sm text-gray-500">{day.summary}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">High/Low</p>
                        <p className="font-semibold">
                          {Math.round(day.temp.max)}° /{' '}
                          {Math.round(day.temp.min)}°
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500">Rain</p>
                        <div
                          className={`px-2 py-1 rounded text-sm font-medium ${getPrecipitationColor(day.pop)}`}
                        >
                          {Math.round(day.pop * 100)}%
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500">Wind</p>
                        <div className="flex items-center">
                          <Wind className="w-4 h-4 mr-1 text-gray-400" />
                          <p className="font-medium">
                            {Math.round(day.wind_speed)} km/h
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-gray-500">UV Index</p>
                        <div
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            day.uvi >= 8
                              ? 'text-red-600 bg-red-50'
                              : day.uvi >= 6
                                ? 'text-orange-600 bg-orange-50'
                                : day.uvi >= 3
                                  ? 'text-yellow-600 bg-yellow-50'
                                  : 'text-green-600 bg-green-50'
                          }`}
                        >
                          {Math.round(day.uvi)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded details for selected day */}
                  {selectedDay === index && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Sunrise className="w-4 h-4 mr-2 text-orange-400" />
                          <div>
                            <p className="text-gray-500">Sunrise</p>
                            <p className="font-medium">
                              {formatTime(day.sunrise)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Sunset className="w-4 h-4 mr-2 text-orange-600" />
                          <div>
                            <p className="text-gray-500">Sunset</p>
                            <p className="font-medium">
                              {formatTime(day.sunset)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Droplets className="w-4 h-4 mr-2 text-blue-400" />
                          <div>
                            <p className="text-gray-500">Humidity</p>
                            <p className="font-medium">{day.humidity}%</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <Moon className="w-4 h-4 mr-2 text-gray-400" />
                          <div>
                            <p className="text-gray-500">Moon Phase</p>
                            <p className="font-medium">
                              {Math.round(day.moon_phase * 100)}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Morning</p>
                          <p className="font-medium">
                            {Math.round(day.temp.morn)}°
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Day</p>
                          <p className="font-medium">
                            {Math.round(day.temp.day)}°
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Evening</p>
                          <p className="font-medium">
                            {Math.round(day.temp.eve)}°
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Night</p>
                          <p className="font-medium">
                            {Math.round(day.temp.night)}°
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hourly' && (
          <div className="space-y-4 mt-6">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">
                Wedding Day Hourly Forecast -{' '}
                {new Date(weddingDate).toLocaleDateString()}
              </h3>

              <div className="grid gap-3">
                {getWeddingDayHourly().length > 0 ? (
                  getWeddingDayHourly().map((hour) => (
                    <div
                      key={hour.dt}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-center min-w-[60px]">
                          <p className="font-medium">{formatTime(hour.dt)}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getWeatherIcon(hour.weather[0]?.main || 'clear')}
                          <div>
                            <p className="font-medium">
                              {hour.weather[0]?.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <Thermometer className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                          <p className="font-semibold">
                            {Math.round(hour.temp)}°
                          </p>
                          <p className="text-xs text-gray-500">
                            Feels {Math.round(hour.feels_like)}°
                          </p>
                        </div>

                        <div className="text-center">
                          <CloudRain className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                          <p
                            className={`font-semibold ${getPrecipitationColor(hour.pop).split(' ')[0]}`}
                          >
                            {Math.round(hour.pop * 100)}%
                          </p>
                          {hour.rain && (
                            <p className="text-xs text-gray-500">
                              {hour.rain['1h']}mm
                            </p>
                          )}
                        </div>

                        <div className="text-center">
                          <Wind className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                          <p className="font-semibold">
                            {Math.round(hour.wind_speed)} km/h
                          </p>
                          {hour.wind_gust && (
                            <p className="text-xs text-gray-500">
                              Gusts {Math.round(hour.wind_gust)} km/h
                            </p>
                          )}
                        </div>

                        <div className="text-center">
                          <Eye className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                          <p className="font-semibold">
                            {(hour.visibility / 1000).toFixed(1)} km
                          </p>
                          <p className="text-xs text-gray-500">
                            {hour.humidity}% humidity
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Hourly forecast not available for the selected wedding
                      date.
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Hourly forecasts are available up to 48 hours in advance.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
