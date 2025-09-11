'use client';

import React from 'react';
import { Card, Badge, Button } from '@/components/untitled-ui';
import {
  Clock,
  MapPin,
  Route,
  AlertCircle,
  CheckCircle,
  Navigation,
  Car,
  Timer,
  Calendar,
  Download,
  Share2,
} from 'lucide-react';
import { TravelRoute, TravelTimeCalculation } from '@/types/travel';

interface RouteResultsProps {
  route: TravelRoute;
  travelTime?: TravelTimeCalculation | null;
}

export function RouteResults({ route, travelTime }: RouteResultsProps) {
  const totalTimeMinutes = Math.ceil(route.totalDurationInTraffic / 60);
  const trafficDelayMinutes = Math.ceil(
    (route.totalDurationInTraffic - route.totalDuration) / 60,
  );
  const totalDistanceKm = (route.totalDistance / 1000).toFixed(1);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrafficSeverityColor = (severity: string) => {
    switch (severity) {
      case 'light':
        return 'text-green-600 bg-green-50';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50';
      case 'heavy':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const exportRoute = () => {
    const routeData = {
      route,
      travelTime,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(routeData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${route.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareRoute = async () => {
    const shareText = `Wedding Day Route: ${route.name}
Total Time: ${totalTimeMinutes} minutes
Distance: ${totalDistanceKm} km
Buffer Time: ${route.bufferTime} minutes`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wedding Day Route',
          text: shareText,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        alert('Route details copied to clipboard!');
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      alert('Route details copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
              <Route className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Route Summary
              </h3>
              <p className="text-sm text-gray-500">{route.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="xs" onClick={shareRoute}>
              <Share2 className="w-3 h-3 mr-2" />
              Share
            </Button>
            <Button variant="secondary" size="xs" onClick={exportRoute}>
              <Download className="w-3 h-3 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-primary-50 mb-3">
              <Timer className="w-6 h-6 text-primary-600" />
            </div>
            <p className="display-xs font-bold text-gray-900 mb-1">
              {totalTimeMinutes}m
            </p>
            <p className="text-xs font-medium text-gray-500">Total Time</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-success-50 mb-3">
              <Navigation className="w-6 h-6 text-success-600" />
            </div>
            <p className="display-xs font-bold text-gray-900 mb-1">
              {totalDistanceKm}
            </p>
            <p className="text-xs font-medium text-gray-500">Kilometers</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-warning-50 mb-3">
              <Clock className="w-6 h-6 text-warning-600" />
            </div>
            <p className="display-xs font-bold text-gray-900 mb-1">
              {route.bufferTime}m
            </p>
            <p className="text-xs font-medium text-gray-500">Buffer Time</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-error-50 mb-3">
              <Car className="w-6 h-6 text-error-600" />
            </div>
            <p className="display-xs font-bold text-gray-900 mb-1">
              +{trafficDelayMinutes}m
            </p>
            <p className="text-xs font-medium text-gray-500">Traffic Delay</p>
          </div>
        </div>

        {travelTime && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Departure:{' '}
                  {new Date(travelTime.departureTime).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Confidence:
                </span>
                <Badge
                  className={`text-xs ${getConfidenceColor(travelTime.confidence)}`}
                >
                  {travelTime.confidence.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Route Segments */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h4 className="font-medium text-gray-900 dark:text-white">
            Route Segments
          </h4>
        </div>

        <div className="space-y-3">
          {route.segments.map((segment, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    index === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
                {index < route.segments.length - 1 && (
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600 mt-1" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {route.stops[index].name} → {route.stops[index + 1].name}
                  </p>
                  <Badge
                    className={`text-xs ${getTrafficSeverityColor(segment.traffic.severity)}`}
                  >
                    {segment.traffic.severity} traffic
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {formatTime(segment.durationInTraffic)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {(segment.distance / 1000).toFixed(1)} km
                  </span>
                  {segment.traffic.currentDelay > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3 h-3" />+
                      {segment.traffic.currentDelay}m delay
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Warnings */}
      {travelTime?.warnings && travelTime.warnings.length > 0 && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Travel Warnings
              </h4>
              <ul className="space-y-1">
                {travelTime.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-sm text-yellow-700 dark:text-yellow-300"
                  >
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Recommendations
            </h4>
            <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>
                • Allow {route.bufferTime} minutes extra for unexpected delays
              </li>
              <li>• Check traffic conditions 30 minutes before departure</li>
              {trafficDelayMinutes > 15 && (
                <li>
                  • Consider leaving 15-30 minutes earlier due to heavy traffic
                </li>
              )}
              <li>• Have backup routes ready in case of road closures</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
