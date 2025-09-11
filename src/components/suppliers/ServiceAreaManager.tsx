/**
 * WS-116: Service Area Manager Component
 * Allow suppliers to configure and manage their service areas
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Settings,
  Target,
  Globe,
  AlertCircle,
  Check,
  X,
  Plus,
  Minus,
  Eye,
  Save,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ServiceAreaConfig,
  ServiceAreaAnalysis,
  LocationServiceCheck,
  serviceRadiusCalculator,
} from '@/lib/services/service-radius-calculator';

interface ServiceAreaManagerProps {
  supplierId: string;
  initialConfig?: Partial<ServiceAreaConfig>;
  onConfigChange?: (config: ServiceAreaConfig) => void;
  onSave?: (config: ServiceAreaConfig) => Promise<void>;
  className?: string;
}

interface LocationTest {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  result?: LocationServiceCheck;
  testing: boolean;
}

export default function ServiceAreaManager({
  supplierId,
  initialConfig = {},
  onConfigChange,
  onSave,
  className = '',
}: ServiceAreaManagerProps) {
  const [config, setConfig] = useState<ServiceAreaConfig>({
    supplierId,
    baseLocation: initialConfig.baseLocation || {
      latitude: 0,
      longitude: 0,
      address: '',
    },
    serviceType: initialConfig.serviceType || 'radius',
    radiusKm: initialConfig.radiusKm || 50,
    travelTimeMaxMinutes: initialConfig.travelTimeMaxMinutes || 120,
    additionalTravelCost: initialConfig.additionalTravelCost || 0,
    minimumBookingValue: initialConfig.minimumBookingValue || 0,
    nationwideCoverage: initialConfig.nationwideCoverage || false,
    internationalCoverage: initialConfig.internationalCoverage || false,
    notes: initialConfig.notes || '',
  });

  const [analysis, setAnalysis] = useState<ServiceAreaAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Location testing
  const [locationTests, setLocationTests] = useState<LocationTest[]>([]);
  const [testAddress, setTestAddress] = useState('');

  // Form state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load analysis when component mounts
  useEffect(() => {
    if (
      supplierId &&
      config.baseLocation.latitude &&
      config.baseLocation.longitude
    ) {
      loadAnalysis();
    }
  }, [supplierId]);

  // Track changes
  useEffect(() => {
    setHasUnsavedChanges(true);
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const analysisResult =
        await serviceRadiusCalculator.analyzeServiceArea(supplierId);
      setAnalysis(analysisResult);
    } catch (error: any) {
      console.warn('Could not load service area analysis:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = useCallback(
    (updates: Partial<ServiceAreaConfig>) => {
      setConfig((prev) => ({ ...prev, ...updates }));
      setError(null);
      setSuccess(false);
    },
    [],
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate configuration
      if (!config.baseLocation.latitude || !config.baseLocation.longitude) {
        throw new Error('Base location is required');
      }

      if (
        config.serviceType === 'radius' &&
        (!config.radiusKm || config.radiusKm < 1)
      ) {
        throw new Error('Valid service radius is required');
      }

      // Save configuration
      if (onSave) {
        await onSave(config);
      } else {
        await serviceRadiusCalculator.updateServiceArea(config);
      }

      setSuccess(true);
      setHasUnsavedChanges(false);

      // Reload analysis
      if (config.baseLocation.latitude && config.baseLocation.longitude) {
        await loadAnalysis();
      }
    } catch (error: any) {
      console.error('Error saving service area:', error);
      setError(error.message || 'Failed to save service area configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestLocation = async () => {
    if (!testAddress.trim()) return;

    const testId = Date.now().toString();
    const newTest: LocationTest = {
      id: testId,
      address: testAddress,
      latitude: 0, // Would normally geocode first
      longitude: 0,
      testing: true,
    };

    setLocationTests((prev) => [...prev, newTest]);

    try {
      // First geocode the address (simplified - would use Google Maps API)
      const geocodeResponse = await fetch(
        `/api/geocode?address=${encodeURIComponent(testAddress)}`,
      );
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData.success || !geocodeData.results?.[0]) {
        throw new Error('Could not find location');
      }

      const location = geocodeData.results[0].geometry.location;

      // Test service coverage
      const result = await serviceRadiusCalculator.checkLocationService(
        supplierId,
        location.lat,
        location.lng,
        true, // Include routing
      );

      // Update test result
      setLocationTests((prev) =>
        prev.map((test) =>
          test.id === testId
            ? {
                ...test,
                latitude: location.lat,
                longitude: location.lng,
                result,
                testing: false,
              }
            : test,
        ),
      );
    } catch (error: any) {
      setLocationTests((prev) =>
        prev.map((test) =>
          test.id === testId
            ? {
                ...test,
                result: {
                  isServed: false,
                  distance: 0,
                  serviceLevel: 'not_served',
                  notes: `Error: ${error.message}`,
                },
                testing: false,
              }
            : test,
        ),
      );
    }

    setTestAddress('');
  };

  const removeLocationTest = (testId: string) => {
    setLocationTests((prev) => prev.filter((test) => test.id !== testId));
  };

  const resetConfiguration = () => {
    setConfig({
      supplierId,
      baseLocation: initialConfig.baseLocation || {
        latitude: 0,
        longitude: 0,
        address: '',
      },
      serviceType: initialConfig.serviceType || 'radius',
      radiusKm: initialConfig.radiusKm || 50,
      travelTimeMaxMinutes: initialConfig.travelTimeMaxMinutes || 120,
      additionalTravelCost: initialConfig.additionalTravelCost || 0,
      minimumBookingValue: initialConfig.minimumBookingValue || 0,
      nationwideCoverage: initialConfig.nationwideCoverage || false,
      internationalCoverage: initialConfig.internationalCoverage || false,
      notes: initialConfig.notes || '',
    });
    setHasUnsavedChanges(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Service Area Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="configuration" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="testing">Location Testing</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="configuration" className="space-y-6">
              {/* Error/Success Messages */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Service area configuration saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Base Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Base Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Input
                      id="address"
                      value={config.baseLocation.address}
                      onChange={(e) =>
                        handleConfigUpdate({
                          baseLocation: {
                            ...config.baseLocation,
                            address: e.target.value,
                          },
                        })
                      }
                      placeholder="Enter your business address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={config.baseLocation.latitude}
                        onChange={(e) =>
                          handleConfigUpdate({
                            baseLocation: {
                              ...config.baseLocation,
                              latitude: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="51.5074"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={config.baseLocation.longitude}
                        onChange={(e) =>
                          handleConfigUpdate({
                            baseLocation: {
                              ...config.baseLocation,
                              longitude: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="-0.1278"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Type */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Service Coverage Type</h3>
                <Select
                  value={config.serviceType}
                  onValueChange={(value: any) =>
                    handleConfigUpdate({ serviceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radius">
                      Radius-based (circular area)
                    </SelectItem>
                    <SelectItem value="regions">
                      Specific regions/cities
                    </SelectItem>
                    <SelectItem value="nationwide">
                      Nationwide coverage
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Radius Configuration */}
              {config.serviceType === 'radius' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Service Radius</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Service Radius: {config.radiusKm} km</Label>
                      <Slider
                        value={[config.radiusKm || 50]}
                        onValueChange={(value) =>
                          handleConfigUpdate({ radiusKm: value[0] })
                        }
                        max={200}
                        min={5}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>5 km</span>
                        <span>200 km</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Maximum Travel Time: {config.travelTimeMaxMinutes}{' '}
                        minutes
                      </Label>
                      <Slider
                        value={[config.travelTimeMaxMinutes || 120]}
                        onValueChange={(value) =>
                          handleConfigUpdate({ travelTimeMaxMinutes: value[0] })
                        }
                        max={300}
                        min={30}
                        step={15}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>30 mins</span>
                        <span>5 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coverage Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Coverage Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Nationwide Coverage</Label>
                      <p className="text-sm text-gray-600">
                        Serve clients anywhere in the country
                      </p>
                    </div>
                    <Switch
                      checked={config.nationwideCoverage}
                      onCheckedChange={(checked) =>
                        handleConfigUpdate({ nationwideCoverage: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>International Coverage</Label>
                      <p className="text-sm text-gray-600">
                        Serve international clients
                      </p>
                    </div>
                    <Switch
                      checked={config.internationalCoverage}
                      onCheckedChange={(checked) =>
                        handleConfigUpdate({ internationalCoverage: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Travel Costs & Minimums
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travel-cost">
                      Additional Travel Cost (per km)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        £
                      </span>
                      <Input
                        id="travel-cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={config.additionalTravelCost}
                        onChange={(e) =>
                          handleConfigUpdate({
                            additionalTravelCost:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="pl-8"
                        placeholder="0.50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimum-booking">
                      Minimum Booking Value
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        £
                      </span>
                      <Input
                        id="minimum-booking"
                        type="number"
                        step="1"
                        min="0"
                        value={config.minimumBookingValue}
                        onChange={(e) =>
                          handleConfigUpdate({
                            minimumBookingValue:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="pl-8"
                        placeholder="500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={config.notes}
                  onChange={(e) =>
                    handleConfigUpdate({ notes: e.target.value })
                  }
                  placeholder="Any special terms, conditions, or notes about your service area..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-6 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetConfiguration}
                  disabled={saving}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Test Service Coverage</h3>
                <p className="text-sm text-gray-600">
                  Test whether specific locations are within your service area.
                </p>

                <div className="flex gap-2">
                  <Input
                    value={testAddress}
                    onChange={(e) => setTestAddress(e.target.value)}
                    placeholder="Enter address, city, or postcode to test..."
                    onKeyDown={(e) => e.key === 'Enter' && handleTestLocation()}
                  />
                  <Button
                    onClick={handleTestLocation}
                    disabled={!testAddress.trim()}
                  >
                    Test Location
                  </Button>
                </div>

                {locationTests.length > 0 && (
                  <div className="space-y-2">
                    {locationTests.map((test) => (
                      <Card key={test.id}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{test.address}</div>
                              {test.testing ? (
                                <div className="text-sm text-gray-600">
                                  Testing...
                                </div>
                              ) : test.result ? (
                                <div className="space-y-1 mt-2">
                                  <div className="flex items-center gap-2">
                                    {test.result.isServed ? (
                                      <Badge className="bg-green-100 text-green-800">
                                        <Check className="h-3 w-3 mr-1" />
                                        Served
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <X className="h-3 w-3 mr-1" />
                                        Not Served
                                      </Badge>
                                    )}
                                    <span className="text-sm text-gray-600">
                                      {test.result.distance.toFixed(1)} km away
                                    </span>
                                    {test.result.travelTime && (
                                      <span className="text-sm text-gray-600">
                                        • {test.result.travelTime} min drive
                                      </span>
                                    )}
                                  </div>
                                  {test.result.notes && (
                                    <p className="text-xs text-gray-500">
                                      {test.result.notes}
                                    </p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLocationTest(test.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">
                    Loading analysis...
                  </p>
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">
                    Service Area Analysis
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="py-4">
                        <div className="text-2xl font-bold">
                          {analysis.totalArea.toFixed(0)} km²
                        </div>
                        <div className="text-sm text-gray-600">
                          Coverage Area
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="text-2xl font-bold">
                          {analysis.populationCovered.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          Population Covered
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="py-4">
                        <div className="text-2xl font-bold">
                          {analysis.competitorCount}
                        </div>
                        <div className="text-sm text-gray-600">Competitors</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Market Potential</h4>
                      <Badge
                        className={
                          analysis.marketPotential === 'high'
                            ? 'bg-green-100 text-green-800'
                            : analysis.marketPotential === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }
                      >
                        {analysis.marketPotential.toUpperCase()}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Cities Covered</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.citiesCovered
                          .slice(0, 10)
                          .map((city, index) => (
                            <Badge key={index} variant="outline">
                              {city}
                            </Badge>
                          ))}
                        {analysis.citiesCovered.length > 10 && (
                          <Badge variant="outline">
                            +{analysis.citiesCovered.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <div className="space-y-2">
                          {analysis.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Analysis Available
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Save your service area configuration to see analysis and
                    insights.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
