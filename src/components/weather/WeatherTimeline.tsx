'use client';

/**
 * Weather Timeline Component
 * Hour-by-hour wedding day weather timeline with horizontal scrolling
 * Following Untitled UI patterns from SAAS-UI-STYLE-GUIDE.md
 */

import React, { useRef, useState } from 'react';
import { HourlyWeather } from '@/types/weather';
import { Card, Badge } from '@/components/untitled-ui';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';

interface WeatherTimelineProps {
  hourlyForecast: HourlyWeather[];
  weddingDate: string;
  weddingEvents?: Array<{
    time: string;
    name: string;
    duration: number; // in hours
    priority: 'high' | 'medium' | 'low';
  }>;
  className?: string;
}

export function WeatherTimeline({
  hourlyForecast,
  weddingDate,
  weddingEvents = [],
  className = '',
}: WeatherTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  const getWeatherIcon = (condition: string) => {
    const iconProps = { className: 'w-5 h-5' };

    const icons: { [key: string]: React.ReactElement } = {
      clear: <Sun {...iconProps} className="w-5 h-5 text-yellow-500" />,
      clouds: <Cloud {...iconProps} className="w-5 h-5 text-gray-500" />,
      rain: <CloudRain {...iconProps} className="w-5 h-5 text-blue-500" />,
      drizzle: <CloudRain {...iconProps} className="w-5 h-5 text-blue-400" />,
      thunderstorm: (
        <CloudRain {...iconProps} className="w-5 h-5 text-purple-600" />
      ),
      snow: <Cloud {...iconProps} className="w-5 h-5 text-blue-200" />,
      mist: <Cloud {...iconProps} className="w-5 h-5 text-gray-400" />,
      fog: <Cloud {...iconProps} className="w-5 h-5 text-gray-400" />,
    };

    return (
      icons[condition.toLowerCase()] || (
        <Cloud {...iconProps} className="w-5 h-5 text-gray-500" />
      )
    );
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    });
  };

  const formatDetailedTime = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isWeddingDay = (timestamp: number): boolean => {
    const hourDate = new Date(timestamp * 1000);
    const weddingDateObj = new Date(weddingDate);
    return hourDate.toDateString() === weddingDateObj.toDateString();
  };

  const getEventAtTime = (timestamp: number) => {
    const hourTime = new Date(timestamp * 1000);
    return weddingEvents.find((event) => {
      const [hours, minutes] = event.time.split(':').map(Number);
      const eventTime = new Date(weddingDateObj);
      eventTime.setHours(hours, minutes, 0, 0);

      const eventEndTime = new Date(eventTime);
      eventEndTime.setHours(eventTime.getHours() + event.duration);

      return hourTime >= eventTime && hourTime < eventEndTime;
    });
  };

  const getPrecipitationColor = (pop: number): string => {
    if (pop >= 0.7) return 'bg-red-100 text-red-800 border-red-200';
    if (pop >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (pop >= 0.2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getEventPriorityColor = (priority: string): string => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return (
      colors[priority as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  const weddingDateObj = new Date(weddingDate);
  const weddingDayHourly = hourlyForecast.filter((hour) =>
    isWeddingDay(hour.dt),
  );

  // If no wedding day hourly data, show next 24 hours
  const displayHours =
    weddingDayHourly.length > 0
      ? weddingDayHourly
      : hourlyForecast.slice(0, 24);

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {weddingDayHourly.length > 0
              ? 'Wedding Day Timeline'
              : '24-Hour Forecast'}
          </h3>
          {weddingDayHourly.length > 0 && (
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {weddingDateObj.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Badge>
          )}
        </div>

        {showScrollButtons && (
          <div className="flex space-x-2">
            <button
              onClick={scrollLeft}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={scrollRight}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide"
        onScroll={handleScroll}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' },
        }}
      >
        <div
          className="flex space-x-4 pb-4"
          style={{ minWidth: `${displayHours.length * 160}px` }}
        >
          {displayHours.map((hour, index) => {
            const event = getEventAtTime(hour.dt);
            const isCurrentHour =
              new Date().getHours() === new Date(hour.dt * 1000).getHours();

            return (
              <div
                key={hour.dt}
                className={`
                  flex-shrink-0 w-36 p-4 rounded-lg border-2 transition-all duration-200
                  ${
                    isCurrentHour
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }
                `}
              >
                <div className="text-center space-y-3">
                  {/* Time */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatTime(hour.dt)}
                    </p>
                    {isCurrentHour && (
                      <p className="text-xs text-blue-600 font-medium">
                        Current
                      </p>
                    )}
                  </div>

                  {/* Weather Icon */}
                  <div className="flex justify-center">
                    {getWeatherIcon(hour.weather[0]?.main || 'clear')}
                  </div>

                  {/* Temperature */}
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(hour.temp)}°
                    </p>
                    <p className="text-xs text-gray-500">
                      Feels {Math.round(hour.feels_like)}°
                    </p>
                  </div>

                  {/* Precipitation */}
                  <div>
                    <Badge
                      className={`text-xs ${getPrecipitationColor(hour.pop)}`}
                    >
                      {Math.round(hour.pop * 100)}%
                    </Badge>
                  </div>

                  {/* Wind */}
                  <div className="flex items-center justify-center space-x-1">
                    <Wind className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-600">
                      {Math.round(hour.wind_speed * 3.6)} km/h
                    </p>
                  </div>

                  {/* Wedding Event */}
                  {event && (
                    <div className="mt-2">
                      <Badge
                        className={`text-xs ${getEventPriorityColor(event.priority)}`}
                      >
                        {event.name}
                      </Badge>
                    </div>
                  )}

                  {/* Weather Description */}
                  <div>
                    <p className="text-xs text-gray-500 capitalize leading-tight">
                      {hour.weather[0]?.description || 'Clear'}
                    </p>
                  </div>

                  {/* Additional Details for High Impact Hours */}
                  {(hour.pop > 0.5 ||
                    hour.wind_speed > 10 ||
                    Math.abs(hour.temp - 22) > 8) && (
                    <div className="space-y-1 pt-2 border-t border-gray-200">
                      {hour.pop > 0.5 && hour.rain && (
                        <div className="flex items-center justify-center space-x-1">
                          <Droplets className="w-3 h-3 text-blue-500" />
                          <p className="text-xs text-blue-600">
                            {hour.rain['1h']} mm
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        {hour.humidity}% humidity
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wedding Events Legend */}
      {weddingEvents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Wedding Events:
          </p>
          <div className="flex flex-wrap gap-2">
            {weddingEvents.map((event, index) => (
              <Badge
                key={index}
                className={`text-xs ${getEventPriorityColor(event.priority)}`}
              >
                {event.time} - {event.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {displayHours.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hourly forecast available</p>
          <p className="text-sm text-gray-400 mt-2">
            Hourly forecasts are available up to 48 hours in advance
          </p>
        </div>
      )}
    </Card>
  );
}

export default WeatherTimeline;
