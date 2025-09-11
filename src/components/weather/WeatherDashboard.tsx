'use client';

/**
 * Weather Dashboard Component
 * Displays comprehensive weather information for wedding planning
 */

import React, { useState, useEffect } from 'react';
import {
  WeatherAnalytics,
  WeddingWeatherData,
  WeatherNotification,
} from '@/types/weather';
import { Card, Badge, Button } from '@/components/untitled-ui';
import {
  Cloud,
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
  AlertTriangle,
  Calendar,
  MapPin,
  Umbrella,
} from 'lucide-react';
import { WeatherForecastWidget } from './WeatherForecastWidget';
import { WeatherAlertsPanel } from './WeatherAlertsPanel';

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

const Alert = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}
  >
    {children}
  </div>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm text-yellow-800">{children}</div>
);

interface WeatherDashboardProps {
  weddingId: string;
  venue: {
    name: string;
    lat: number;
    lon: number;
    address: string;
  };
  weddingDate: string;
  isOutdoor?: boolean;
}

export function WeatherDashboard({
  weddingId,
  venue,
  weddingDate,
  isOutdoor = true,
}: WeatherDashboardProps) {
  const [weatherData, setWeatherData] = useState<WeddingWeatherData | null>(
    null,
  );
  const [analytics, setAnalytics] = useState<WeatherAnalytics | null>(null);
  const [alerts, setAlerts] = useState<WeatherNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadWeatherData();
    const interval = setInterval(loadWeatherData, 60 * 60 * 1000); // Update every hour
    return () => clearInterval(interval);
  }, [weddingId, venue.lat, venue.lon, weddingDate]);

  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load weather data
      const weatherResponse = await fetch(
        `/api/weather?type=wedding&lat=${venue.lat}&lon=${venue.lon}&weddingDate=${weddingDate}&weddingId=${weddingId}`,
      );
      const weatherResult = await weatherResponse.json();

      if (!weatherResult.success) {
        throw new Error(weatherResult.error || 'Failed to fetch weather data');
      }

      // Load analytics
      const analyticsResponse = await fetch(
        `/api/weather?type=analysis&lat=${venue.lat}&lon=${venue.lon}&weddingDate=${weddingDate}&outdoor=${isOutdoor}`,
      );
      const analyticsResult = await analyticsResponse.json();

      // Load alerts
      const alertsResponse = await fetch(
        `/api/weather/alerts?weddingId=${weddingId}`,
      );
      const alertsResult = await alertsResponse.json();

      setWeatherData({
        ...weatherResult.data,
        weddingId,
        venue,
        isOutdoor,
      });

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      }

      if (alertsResult.success) {
        setAlerts(alertsResult.data);
      }

      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const icons = {
      clear: <Sun className="w-6 h-6 text-yellow-500" />,
      clouds: <Cloud className="w-6 h-6 text-gray-500" />,
      rain: <CloudRain className="w-6 h-6 text-blue-500" />,
      storm: <AlertTriangle className="w-6 h-6 text-red-500" />,
    };
    return (
      icons[condition as keyof typeof icons] || (
        <Cloud className="w-6 h-6 text-gray-500" />
      )
    );
  };

  const getRiskBadgeColor = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      extreme: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      colors[risk as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 border-gray-200'
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load weather data: {error}
          <Button
            onClick={loadWeatherData}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!weatherData || !analytics) {
    return (
      <Alert>
        <AlertDescription>No weather data available</AlertDescription>
      </Alert>
    );
  }

  const currentWeather = weatherData.current;
  const weddingDayForecast = weatherData.dailyForecast.find((day) => {
    const dayDate = new Date(day.dt * 1000);
    const weddingDateObj = new Date(weddingDate);
    return dayDate.toDateString() === weddingDateObj.toDateString();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Weather Dashboard
          </h2>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            {venue.name}
            <Calendar className="w-4 h-4 ml-4 mr-1" />
            {new Date(weddingDate).toLocaleDateString()}
          </div>
        </div>
        <div className="text-right">
          <Badge className={getRiskBadgeColor(analytics.risk.overall)}>
            {analytics.risk.overall.toUpperCase()} RISK
          </Badge>
          <div className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated}
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(
        (alert) => !alert.acknowledged && alert.severity === 'critical',
      ).length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Critical weather alert! Check the alerts tab for details.
          </AlertDescription>
        </Alert>
      )}

      <div className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            active={activeTab === 'forecast'}
            onClick={() => setActiveTab('forecast')}
          >
            Forecast
          </TabsTrigger>
          <TabsTrigger
            active={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts ({alerts.filter((a) => !a.acknowledged).length})
          </TabsTrigger>
          <TabsTrigger
            active={activeTab === 'recommendations'}
            onClick={() => setActiveTab('recommendations')}
          >
            Recommendations
          </TabsTrigger>
        </TabsList>

        {activeTab === 'overview' && (
          <div className="space-y-6 mt-6">
            {/* Current Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Current</p>
                    <p className="text-3xl font-bold">
                      {Math.round(currentWeather.temp)}°C
                    </p>
                    <p className="text-sm text-gray-500">
                      Feels like {Math.round(currentWeather.feels_like)}°C
                    </p>
                  </div>
                  {getWeatherIcon(
                    currentWeather.weather[0]?.main?.toLowerCase(),
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Precipitation
                    </p>
                    <p className="text-3xl font-bold">
                      {weddingDayForecast
                        ? Math.round(weddingDayForecast.pop * 100)
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-gray-500">Chance of rain</p>
                  </div>
                  <Umbrella className="w-6 h-6 text-blue-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Wind Speed
                    </p>
                    <p className="text-3xl font-bold">
                      {Math.round(currentWeather.wind_speed)} km/h
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentWeather.wind_gust
                        ? `Gusts ${Math.round(currentWeather.wind_gust)} km/h`
                        : 'Steady'}
                    </p>
                  </div>
                  <Wind className="w-6 h-6 text-gray-500" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Visibility
                    </p>
                    <p className="text-3xl font-bold">
                      {(currentWeather.visibility / 1000).toFixed(1)} km
                    </p>
                    <p className="text-sm text-gray-500">
                      Humidity {currentWeather.humidity}%
                    </p>
                  </div>
                  <Eye className="w-6 h-6 text-gray-500" />
                </div>
              </Card>
            </div>

            {/* Risk Assessment */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Weather Risk Assessment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Precipitation Risk</p>
                  <div
                    className={`text-2xl font-bold ${analytics.risk.precipitation > 70 ? 'text-red-600' : analytics.risk.precipitation > 40 ? 'text-orange-500' : 'text-green-600'}`}
                  >
                    {Math.round(analytics.risk.precipitation)}%
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Temperature Risk</p>
                  <div
                    className={`text-2xl font-bold ${analytics.risk.temperature > 70 ? 'text-red-600' : analytics.risk.temperature > 40 ? 'text-orange-500' : 'text-green-600'}`}
                  >
                    {Math.round(analytics.risk.temperature)}%
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Wind Risk</p>
                  <div
                    className={`text-2xl font-bold ${analytics.risk.wind > 70 ? 'text-red-600' : analytics.risk.wind > 40 ? 'text-orange-500' : 'text-green-600'}`}
                  >
                    {Math.round(analytics.risk.wind)}%
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Visibility Risk</p>
                  <div
                    className={`text-2xl font-bold ${analytics.risk.visibility > 70 ? 'text-red-600' : analytics.risk.visibility > 40 ? 'text-orange-500' : 'text-green-600'}`}
                  >
                    {Math.round(analytics.risk.visibility)}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Optimal Scheduling */}
            {isOutdoor && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Optimal Schedule Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">
                      Ceremony
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {analytics.optimalScheduling.ceremony}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">
                      Photography
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {analytics.optimalScheduling.photography.join(' & ')}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500">
                      Reception
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {analytics.optimalScheduling.reception}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="mt-6">
            <WeatherForecastWidget
              dailyForecast={weatherData.dailyForecast}
              hourlyForecast={weatherData.hourlyForecast}
              weddingDate={weddingDate}
            />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="mt-6">
            <WeatherAlertsPanel
              alerts={alerts}
              weddingId={weddingId}
              onAlertsUpdated={setAlerts}
            />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="mt-6">
            <div className="space-y-4">
              {analytics.recommendations.map((recommendation, index) => (
                <Card key={index} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">
                          {recommendation.title}
                        </h4>
                        <Badge
                          className={getRiskBadgeColor(recommendation.priority)}
                        >
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">
                        {recommendation.description}
                      </p>
                      {recommendation.estimatedCost && (
                        <p className="text-sm text-gray-500">
                          Estimated cost: ${recommendation.estimatedCost}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {analytics.recommendations.length === 0 && (
                <Card className="p-6 text-center">
                  <p className="text-gray-500">
                    No specific recommendations at this time.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Weather conditions appear favorable for your wedding.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
