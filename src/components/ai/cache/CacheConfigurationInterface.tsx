'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Zap,
  Clock,
  Database,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  Play,
} from 'lucide-react';

import type {
  CacheConfig,
  CacheTypeConfig,
  CacheWarmingConfig,
  WeddingOptimizationConfig,
  SupplierType,
  WeddingSeason,
  CacheType,
} from '@/types/ai-cache';

interface CacheConfigurationInterfaceProps {
  supplierId?: string;
  supplierType?: SupplierType;
  initialConfig?: CacheConfig;
}

interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}

// Cache Type Configuration Component
interface CacheTypeConfigurationProps {
  cacheType: CacheTypeConfig;
  onChange: (updated: CacheTypeConfig) => void;
}

const CacheTypeConfiguration: React.FC<CacheTypeConfigurationProps> = ({
  cacheType,
  onChange,
}) => {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-lg">
            {cacheType.type.replace('_', ' ').toUpperCase()}
          </h3>
          <Badge variant="outline" className="text-xs">
            {cacheType.maxEntries?.toLocaleString() || 0} max entries
          </Badge>
        </div>
        <Switch
          checked={cacheType.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...cacheType, enabled: checked })
          }
        />
      </div>

      <div className="text-sm text-gray-600 mb-4">
        {getWeddingContextDescription(cacheType.type)}
      </div>

      {cacheType.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                TTL Hours: {cacheType.ttlHours}
              </label>
              <Slider
                value={[cacheType.ttlHours]}
                onValueChange={([value]) =>
                  onChange({ ...cacheType, ttlHours: value })
                }
                max={720}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 hour</span>
                <span>30 days</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Max Entries: {cacheType.maxEntries.toLocaleString()}
              </label>
              <Slider
                value={[cacheType.maxEntries]}
                onValueChange={([value]) =>
                  onChange({ ...cacheType, maxEntries: value })
                }
                max={100000}
                min={100}
                step={100}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                Semantic Threshold:{' '}
                {(cacheType.semanticThreshold * 100).toFixed(0)}%
              </label>
              <Slider
                value={[cacheType.semanticThreshold * 100]}
                onValueChange={([value]) =>
                  onChange({ ...cacheType, semanticThreshold: value / 100 })
                }
                max={99}
                min={50}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                How similar queries need to be to use cached responses
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enable Warming</label>
              <Switch
                checked={cacheType.warmingEnabled}
                onCheckedChange={(checked) =>
                  onChange({ ...cacheType, warmingEnabled: checked })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Cache Warming Configuration Component
interface CacheWarmingConfigurationProps {
  config: CacheWarmingConfig;
  onChange: (updated: CacheWarmingConfig) => void;
}

const CacheWarmingConfiguration: React.FC<CacheWarmingConfigurationProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Enable Automatic Warming</label>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...config, enabled: checked })
          }
        />
      </div>

      {config.enabled && (
        <>
          <div>
            <label className="text-sm font-medium block mb-2">
              Max Concurrent Warming: {config.maxConcurrentWarming}
            </label>
            <Slider
              value={[config.maxConcurrentWarming]}
              onValueChange={([value]) =>
                onChange({ ...config, maxConcurrentWarming: value })
              }
              max={20}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Daily Schedule</h4>
            <div className="flex items-center justify-between">
              <label className="text-sm">Enable Daily Warming</label>
              <Switch
                checked={config.schedule.dailySchedule.enabled}
                onCheckedChange={(checked) =>
                  onChange({
                    ...config,
                    schedule: {
                      ...config.schedule,
                      dailySchedule: {
                        ...config.schedule.dailySchedule,
                        enabled: checked,
                      },
                    },
                  })
                }
              />
            </div>

            {config.schedule.dailySchedule.enabled && (
              <div className="grid grid-cols-3 gap-2">
                {['09:00', '13:00', '17:00'].map((time, index) => (
                  <Button
                    key={time}
                    variant={
                      config.schedule.dailySchedule.times.includes(time)
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => {
                      const times =
                        config.schedule.dailySchedule.times.includes(time)
                          ? config.schedule.dailySchedule.times.filter(
                              (t) => t !== time,
                            )
                          : [...config.schedule.dailySchedule.times, time];

                      onChange({
                        ...config,
                        schedule: {
                          ...config.schedule,
                          dailySchedule: {
                            ...config.schedule.dailySchedule,
                            times,
                          },
                        },
                      });
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Seasonal Adjustments</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">
                  Peak Season Multiplier: {config.seasonal.peakSeasonMultiplier}
                  x
                </label>
                <Slider
                  value={[config.seasonal.peakSeasonMultiplier]}
                  onValueChange={([value]) =>
                    onChange({
                      ...config,
                      seasonal: {
                        ...config.seasonal,
                        peakSeasonMultiplier: value,
                      },
                    })
                  }
                  max={5}
                  min={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">
                  Off Season Multiplier: {config.seasonal.offSeasonMultiplier}x
                </label>
                <Slider
                  value={[config.seasonal.offSeasonMultiplier]}
                  onValueChange={([value]) =>
                    onChange({
                      ...config,
                      seasonal: {
                        ...config.seasonal,
                        offSeasonMultiplier: value,
                      },
                    })
                  }
                  max={2}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Manual Warming Controls Component
interface ManualWarmingControlsProps {
  onTrigger: (strategy: string) => void;
}

const ManualWarmingControls: React.FC<ManualWarmingControlsProps> = ({
  onTrigger,
}) => {
  const warmingStrategies = [
    {
      id: 'popular',
      name: 'Popular Queries',
      description: 'Warm most frequently requested queries',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      id: 'seasonal',
      name: 'Seasonal Content',
      description: 'Warm wedding season-specific queries',
      icon: <Clock className="h-4 w-4" />,
    },
    {
      id: 'supplier_specific',
      name: 'Supplier Queries',
      description: 'Warm queries specific to your supplier type',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {warmingStrategies.map((strategy) => (
        <div
          key={strategy.id}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="flex items-center gap-3">
            {strategy.icon}
            <div>
              <div className="font-medium">{strategy.name}</div>
              <div className="text-sm text-gray-600">
                {strategy.description}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => onTrigger(strategy.id)}>
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
        </div>
      ))}
    </div>
  );
};

// Seasonal Optimization Settings Component
interface SeasonalOptimizationSettingsProps {
  settings: any;
  onChange: (settings: any) => void;
}

const SeasonalOptimizationSettings: React.FC<
  SeasonalOptimizationSettingsProps
> = ({ settings, onChange }) => {
  const seasons: WeddingSeason[] = ['peak', 'shoulder', 'off', 'holiday'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Enable Seasonal Optimization
        </label>
        <Switch
          checked={settings?.enabled || false}
          onCheckedChange={(checked) =>
            onChange({ ...settings, enabled: checked })
          }
        />
      </div>

      {settings?.enabled && (
        <div className="grid grid-cols-2 gap-6">
          {seasons.map((season) => (
            <Card key={season}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">
                  {season} Season
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1">
                    TTL Multiplier: {settings?.[season]?.ttlMultiplier || 1}x
                  </label>
                  <Slider
                    value={[settings?.[season]?.ttlMultiplier || 1]}
                    onValueChange={([value]) =>
                      onChange({
                        ...settings,
                        [season]: {
                          ...settings?.[season],
                          ttlMultiplier: value,
                        },
                      })
                    }
                    max={3}
                    min={0.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">
                    Capacity Multiplier:{' '}
                    {settings?.[season]?.capacityMultiplier || 1}x
                  </label>
                  <Slider
                    value={[settings?.[season]?.capacityMultiplier || 1]}
                    onValueChange={([value]) =>
                      onChange({
                        ...settings,
                        [season]: {
                          ...settings?.[season],
                          capacityMultiplier: value,
                        },
                      })
                    }
                    max={3}
                    min={0.5}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Vendor Specific Settings Component
interface VendorSpecificSettingsProps {
  config: CacheConfig;
  onChange: (config: CacheConfig) => void;
}

const VendorSpecificSettings: React.FC<VendorSpecificSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Enable Vendor-Specific Optimization
        </label>
        <Switch
          checked={
            config?.weddingOptimization?.supplierSpecific?.enabled || false
          }
          onCheckedChange={(checked) =>
            onChange({
              ...config,
              weddingOptimization: {
                ...config.weddingOptimization,
                supplierSpecific: {
                  ...config.weddingOptimization?.supplierSpecific,
                  enabled: checked,
                },
              },
            })
          }
        />
      </div>

      <div className="text-sm text-gray-600">
        Automatically optimize cache settings based on your supplier type and
        common query patterns.
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">
          Wedding Industry Optimization
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Photographers: Prioritize session and pricing queries</li>
          <li>• Venues: Optimize availability and capacity questions</li>
          <li>• Planners: Focus on coordination and timeline queries</li>
          <li>• Caterers: Emphasize menu and dietary requirement responses</li>
        </ul>
      </div>
    </div>
  );
};

// Wedding-Specific Optimization Component
interface WeddingSpecificOptimizationProps {
  config: CacheConfig;
  onChange: (config: CacheConfig) => void;
}

const WeddingSpecificOptimization: React.FC<
  WeddingSpecificOptimizationProps
> = ({ config, onChange }) => {
  const [seasonalSettings, setSeasonalSettings] = useState(
    config?.weddingOptimization || {},
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Wedding Optimization</CardTitle>
          <p className="text-sm text-gray-600">
            Automatically adjust cache settings based on wedding season patterns
          </p>
        </CardHeader>
        <CardContent>
          <SeasonalOptimizationSettings
            settings={seasonalSettings}
            onChange={setSeasonalSettings}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor-Specific Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorSpecificSettings config={config} onChange={onChange} />
        </CardContent>
      </Card>
    </div>
  );
};

// Main Configuration Interface Component
export default function CacheConfigurationInterface({
  supplierId,
  supplierType,
  initialConfig,
}: CacheConfigurationInterfaceProps) {
  const [config, setConfig] = useState<CacheConfig | null>(
    initialConfig || null,
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('cache-types');
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    show: false,
  });

  useEffect(() => {
    if (!initialConfig) {
      loadConfiguration();
    }
  }, [initialConfig]);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/ai/cache/config');
      if (response.ok) {
        setConfig(await response.json());
      }
    } catch (error) {
      showNotification('Failed to load configuration', 'error');
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/ai/cache/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        showNotification('Configuration saved successfully!', 'success');
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      showNotification('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const triggerCacheWarming = async (strategy: string) => {
    try {
      const response = await fetch('/api/ai/cache/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          priority: 3,
          maxQueries: 100,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(
          `Cache warming started: ${result.queriesQueued} queries queued`,
          'success',
        );
      } else {
        throw new Error('Failed to start warming');
      }
    } catch (error) {
      showNotification('Failed to start cache warming', 'error');
    }
  };

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info',
  ) => {
    setNotification({ message, type, show: true });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, show: false })),
      5000,
    );
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Notification */}
      {notification.show && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : notification.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Cache Configuration</h1>
          <p className="text-gray-600">
            Optimize your AI cache for maximum performance and cost savings
          </p>
        </div>
        <Button onClick={saveConfiguration} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="cache-types">Cache Types</TabsTrigger>
          <TabsTrigger value="warming">Cache Warming</TabsTrigger>
          <TabsTrigger value="invalidation">Invalidation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="wedding-optimization">
            Wedding Optimization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cache-types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Type Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {config.cacheTypes.map((cacheType, index) => (
                <CacheTypeConfiguration
                  key={cacheType.type}
                  cacheType={cacheType}
                  onChange={(updated) => {
                    const newConfig = { ...config };
                    newConfig.cacheTypes[index] = updated;
                    setConfig(newConfig);
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warming" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automatic Cache Warming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CacheWarmingConfiguration
                  config={config.warming}
                  onChange={(updated) =>
                    setConfig({ ...config, warming: updated })
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Warming Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <ManualWarmingControls onTrigger={triggerCacheWarming} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invalidation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Cache Invalidation Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Invalidation settings will be implemented in the next iteration.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Performance Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Performance settings will be implemented in the next iteration.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wedding-optimization" className="space-y-6">
          <WeddingSpecificOptimization config={config} onChange={setConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function for wedding context descriptions
const getWeddingContextDescription = (type: CacheType): string => {
  const descriptions: Record<CacheType, string> = {
    chatbot:
      'AI responses to client inquiries about services, pricing, and availability',
    email_templates:
      'Generated email content for client communications and vendor coordination',
    content_generation:
      'Marketing content, service descriptions, and portfolio text',
    form_generation:
      'Dynamic forms for client consultations and service bookings',
    query_responses: 'General query responses and FAQ content',
  };

  return (
    descriptions[type] ||
    'General AI-generated content for your wedding business'
  );
};
