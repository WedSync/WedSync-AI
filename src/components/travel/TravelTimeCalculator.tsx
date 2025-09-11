'use client';

import React, { useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { Button, Input, Label, Card, Badge } from '@/components/untitled-ui';
import {
  MapPin,
  Clock,
  Route,
  AlertTriangle,
  Plus,
  Trash2,
  Navigation,
  Timer,
  Car,
  Calendar,
} from 'lucide-react';
import { RouteStop, TravelTimeCalculation, TravelRoute } from '@/types/travel';
import { LocationInput } from './LocationInput';
import { RouteResults } from './RouteResults';
import { TrafficAnalysis } from './TrafficAnalysis';

interface TravelTimeCalculatorProps {
  apiKey: string;
  onRouteCalculated?: (route: TravelRoute) => void;
  onTravelTimeCalculated?: (travelTime: TravelTimeCalculation) => void;
  defaultStops?: RouteStop[];
  weddingDate?: string;
}

export function TravelTimeCalculator({
  apiKey,
  onRouteCalculated,
  onTravelTimeCalculated,
  defaultStops = [],
  weddingDate,
}: TravelTimeCalculatorProps) {
  const [stops, setStops] = useState<RouteStop[]>(
    defaultStops.length > 0
      ? defaultStops
      : [
          {
            id: 'start',
            location: { lat: 0, lng: 0 },
            name: 'Starting Location',
            type: 'pickup',
          },
          {
            id: 'end',
            location: { lat: 0, lng: 0 },
            name: 'Destination',
            type: 'destination',
          },
        ],
  );

  const [departureTime, setDepartureTime] = useState(() => {
    if (weddingDate) {
      const wedding = new Date(weddingDate);
      wedding.setHours(9, 0, 0, 0); // Default to 9 AM
      return wedding.toISOString().slice(0, 16);
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60); // Default to 1 hour from now
    return now.toISOString().slice(0, 16);
  });

  const [route, setRoute] = useState<TravelRoute | null>(null);
  const [travelTime, setTravelTime] = useState<TravelTimeCalculation | null>(
    null,
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const [options, setOptions] = useState({
    optimize: false,
    avoidTolls: false,
    avoidHighways: false,
    trafficModel: 'best_guess' as const,
  });

  const addStop = useCallback(() => {
    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      location: { lat: 0, lng: 0 },
      name: `Stop ${stops.length - 1}`,
      type: 'venue',
    };

    // Insert before the last stop (destination)
    const newStops = [...stops];
    newStops.splice(-1, 0, newStop);
    setStops(newStops);
  }, [stops]);

  const removeStop = useCallback(
    (stopId: string) => {
      if (stops.length <= 2) return; // Keep at least origin and destination
      setStops(stops.filter((stop) => stop.id !== stopId));
    },
    [stops],
  );

  const updateStop = useCallback(
    (stopId: string, updates: Partial<RouteStop>) => {
      setStops(
        stops.map((stop) =>
          stop.id === stopId ? { ...stop, ...updates } : stop,
        ),
      );
    },
    [stops],
  );

  const calculateRoute = useCallback(async () => {
    setIsCalculating(true);
    setError(null);

    try {
      // Validate all stops have locations
      const invalidStops = stops.filter(
        (stop) => stop.location.lat === 0 && stop.location.lng === 0,
      );

      if (invalidStops.length > 0) {
        throw new Error('Please set locations for all stops');
      }

      // Calculate route
      const routeResponse = await fetch('/api/travel/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops, options }),
      });

      if (!routeResponse.ok) {
        const error = await routeResponse.json();
        throw new Error(error.error || 'Failed to calculate route');
      }

      const routeData = await routeResponse.json();
      setRoute(routeData.route);
      onRouteCalculated?.(routeData.route);

      // Calculate travel time for specific departure
      const timeResponse = await fetch('/api/travel/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops,
          departureTime: new Date(departureTime).toISOString(),
          options,
        }),
      });

      if (!timeResponse.ok) {
        const error = await timeResponse.json();
        throw new Error(error.error || 'Failed to calculate travel time');
      }

      const timeData = await timeResponse.json();
      setTravelTime(timeData.travelTime);
      onTravelTimeCalculated?.(timeData.travelTime);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  }, [
    stops,
    departureTime,
    options,
    onRouteCalculated,
    onTravelTimeCalculated,
  ]);

  const optimizeRoute = useCallback(async () => {
    if (stops.length < 3) return; // Need at least origin, waypoint, destination

    setIsCalculating(true);
    setError(null);

    try {
      const origin = stops[0].location;
      const destination = stops[stops.length - 1].location;
      const waypoints = stops.slice(1, -1).map((stop) => stop.location);

      const response = await fetch('/api/travel/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          waypoints,
          options,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to optimize route');
      }

      const data = await response.json();
      setRoute(data.optimizedRoute);
      setStops(data.optimizedRoute.stops);

      if (data.timeSaved > 0) {
        setError(`Route optimized! Saved ${data.timeSaved} minutes.`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  }, [stops, options]);

  const mapCenter =
    stops.length > 0 && stops[0].location.lat !== 0
      ? stops[0].location
      : { lat: 40.7128, lng: -74.006 }; // Default to NYC

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50">
            <Route className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="display-xs font-semibold text-gray-900">
              Travel Time Calculator
            </h2>
            <p className="text-sm text-gray-500">
              Calculate accurate travel times with real-time traffic
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={optimizeRoute}
            disabled={isCalculating || stops.length < 3}
            size="sm"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Optimize Route
          </Button>
          <Button onClick={calculateRoute} disabled={isCalculating} size="sm">
            {isCalculating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Calculating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Calculate
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Departure Time */}
          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <Label className="text-sm font-semibold text-gray-700">
                Departure Time
              </Label>
            </div>
            <Input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            />
          </Card>

          {/* Route Stops */}
          <Card className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-600" />
                <Label className="text-sm font-semibold text-gray-700">
                  Route Stops
                </Label>
              </div>
              <Button variant="secondary" size="xs" onClick={addStop}>
                <Plus className="w-3 h-3 mr-2" />
                Add Stop
              </Button>
            </div>

            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div key={stop.id} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center mt-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? 'bg-green-500'
                            : index === stops.length - 1
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                      />
                      {index < stops.length - 1 && (
                        <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-1" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder={`${
                            index === 0
                              ? 'Starting location'
                              : index === stops.length - 1
                                ? 'Destination'
                                : 'Stop'
                          } name`}
                          value={stop.name}
                          onChange={(e) =>
                            updateStop(stop.id, { name: e.target.value })
                          }
                          className="text-sm"
                        />
                        {stops.length > 2 &&
                          index > 0 &&
                          index < stops.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStop(stop.id)}
                              className="text-red-500 hover:text-red-700 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                      </div>

                      <LocationInput
                        value={stop.location}
                        onChange={(location) =>
                          updateStop(stop.id, { location })
                        }
                        placeholder={`Enter ${index === 0 ? 'starting' : index === stops.length - 1 ? 'destination' : 'stop'} address`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Options */}
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Car className="w-5 h-5 text-gray-600" />
              <Label className="text-sm font-medium">Route Options</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Avoid Tolls</span>
                <input
                  type="checkbox"
                  checked={options.avoidTolls}
                  onChange={(e) =>
                    setOptions({ ...options, avoidTolls: e.target.checked })
                  }
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Avoid Highways</span>
                <input
                  type="checkbox"
                  checked={options.avoidHighways}
                  onChange={(e) =>
                    setOptions({ ...options, avoidHighways: e.target.checked })
                  }
                  className="rounded"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Traffic Model</Label>
                <select
                  value={options.trafficModel}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      trafficModel: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="best_guess">Best Guess</option>
                  <option value="optimistic">Optimistic</option>
                  <option value="pessimistic">Pessimistic</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {/* Map */}
          <Card className="p-0 overflow-hidden">
            <div className="h-64 w-full">
              <APIProvider apiKey={apiKey}>
                <Map
                  defaultCenter={mapCenter}
                  defaultZoom={10}
                  mapId="travel-calculator-map"
                  className="w-full h-full"
                >
                  {stops.map((stop, index) => (
                    <AdvancedMarker
                      key={stop.id}
                      position={stop.location}
                      onClick={() => setSelectedMarker(stop.id)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0
                            ? 'bg-green-500'
                            : index === stops.length - 1
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                        }`}
                      >
                        {index === 0
                          ? 'S'
                          : index === stops.length - 1
                            ? 'E'
                            : index}
                      </div>
                    </AdvancedMarker>
                  ))}

                  {selectedMarker && (
                    <InfoWindow
                      position={
                        stops.find((s) => s.id === selectedMarker)?.location
                      }
                      onClose={() => setSelectedMarker(null)}
                    >
                      <div className="p-2">
                        <p className="font-semibold">
                          {stops.find((s) => s.id === selectedMarker)?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {
                            stops.find((s) => s.id === selectedMarker)?.location
                              .address
                          }
                        </p>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Results */}
          {route && <RouteResults route={route} travelTime={travelTime} />}

          {/* Traffic Analysis */}
          {route && <TrafficAnalysis route={route} />}
        </div>
      </div>
    </div>
  );
}
