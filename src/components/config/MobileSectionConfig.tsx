'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smartphone,
  Tablet,
  Monitor,
  Eye,
  EyeOff,
  Move,
  RotateCw,
  Zap,
  Touch,
  Gesture,
  Settings,
  Layout,
  Palette,
  TestTube,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  X,
  Maximize2,
  Minimize2,
  Hand,
  MousePointer,
  Vibrate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Extended mobile configuration interface
export interface MobileSectionConfiguration {
  // Basic visibility settings
  visibility: {
    hidden: boolean;
    collapsible: boolean;
    priorityOrder: number;
    autoHide: {
      enabled: boolean;
      conditions: Array<{
        type: 'idle' | 'interaction' | 'time' | 'battery';
        value: number;
        unit: 'seconds' | 'minutes' | 'percent';
      }>;
    };
  };

  // Responsive breakpoints
  breakpoints: {
    mobile: {
      enabled: boolean;
      maxWidth: number;
      layout: 'stack' | 'grid' | 'carousel' | 'accordion';
      columns: number;
    };
    tablet: {
      enabled: boolean;
      minWidth: number;
      maxWidth: number;
      layout: 'stack' | 'grid' | 'carousel' | 'sidebar';
      columns: number;
    };
    portrait: {
      layout: 'compact' | 'expanded' | 'minimal';
      headerStyle: 'fixed' | 'scroll' | 'hidden';
    };
    landscape: {
      layout: 'sidebar' | 'tabs' | 'overlay';
      splitView: boolean;
    };
  };

  // Touch and gesture settings
  gestures: {
    enabled: boolean;
    swipeActions: {
      left: 'dismiss' | 'expand' | 'next' | 'custom' | 'none';
      right: 'dismiss' | 'expand' | 'previous' | 'custom' | 'none';
      up: 'collapse' | 'refresh' | 'custom' | 'none';
      down: 'expand' | 'refresh' | 'custom' | 'none';
    };
    longPressActions: {
      enabled: boolean;
      duration: number; // milliseconds
      action: 'context_menu' | 'quick_edit' | 'custom' | 'none';
    };
    pinchZoom: {
      enabled: boolean;
      minScale: number;
      maxScale: number;
    };
    doubleTap: {
      enabled: boolean;
      action: 'zoom' | 'toggle' | 'quick_action' | 'none';
    };
  };

  // Performance and loading
  performance: {
    lazyLoading: boolean;
    virtualScrolling: boolean;
    imageOptimization: {
      enabled: boolean;
      quality: number; // 1-100
      format: 'webp' | 'avif' | 'auto';
      sizes: string[];
    };
    prefetchNextSection: boolean;
    cacheStrategy: 'memory' | 'disk' | 'network' | 'hybrid';
    maxMemoryUsage: number; // MB
  };

  // Animation and transitions
  animations: {
    enabled: boolean;
    enterAnimation: 'fade' | 'slide' | 'scale' | 'bounce' | 'none';
    exitAnimation: 'fade' | 'slide' | 'scale' | 'bounce' | 'none';
    duration: number; // milliseconds
    easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
    reducedMotion: boolean; // Respect user preferences
    parallaxEffect: {
      enabled: boolean;
      intensity: number; // 0-1
    };
  };

  // Accessibility
  accessibility: {
    focusManagement: boolean;
    screenReaderSupport: boolean;
    highContrast: boolean;
    largeText: boolean;
    tapTargetSize: number; // minimum 44px recommended
    voiceOver: {
      enabled: boolean;
      customDescriptions: Record<string, string>;
    };
    colorBlindness: {
      enabled: boolean;
      type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none';
    };
  };

  // Offline behavior
  offline: {
    enabled: boolean;
    cacheContent: boolean;
    fallbackContent: string;
    syncStrategy: 'immediate' | 'background' | 'manual';
    conflictResolution: 'server_wins' | 'client_wins' | 'manual';
  };

  // Device-specific settings
  deviceSettings: {
    hapticFeedback: {
      enabled: boolean;
      intensity: 'light' | 'medium' | 'heavy';
      patterns: {
        tap: boolean;
        success: boolean;
        error: boolean;
        warning: boolean;
      };
    };
    notificationStyle: 'toast' | 'banner' | 'modal' | 'none';
    batteryOptimization: {
      enabled: boolean;
      reducedAnimations: boolean;
      lowerRefreshRate: boolean;
      dimBacklight: boolean;
    };
  };
}

interface MobileSectionConfigProps {
  sectionId: string;
  sectionTitle: string;
  config: MobileSectionConfiguration;
  onConfigChange: (config: MobileSectionConfiguration) => void;
  previewMode?: boolean;
}

// Device preview frames
const DeviceFrames = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  mobileLarge: { width: 414, height: 896, name: 'iPhone 12' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  tabletLarge: { width: 834, height: 1194, name: 'iPad Pro' },
};

export default function MobileSectionConfig({
  sectionId,
  sectionTitle,
  config,
  onConfigChange,
  previewMode = false,
}: MobileSectionConfigProps) {
  const [activeTab, setActiveTab] = useState('visibility');
  const [previewDevice, setPreviewDevice] =
    useState<keyof typeof DeviceFrames>('mobile');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // Helper to update nested config
  const updateConfig = (path: string, value: any) => {
    const pathArray = path.split('.');
    const newConfig = { ...config };
    let current = newConfig as any;

    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }
    current[pathArray[pathArray.length - 1]] = value;

    onConfigChange(newConfig);
  };

  // Toggle expanded sections
  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  // Test gesture simulation
  const simulateGesture = (gesture: string) => {
    // Simulate haptic feedback if enabled
    if (
      config.deviceSettings.hapticFeedback.enabled &&
      'vibrate' in navigator
    ) {
      navigator.vibrate(50);
    }
    console.log(`Simulating gesture: ${gesture}`);
  };

  return (
    <div className="space-y-6">
      {/* Header with Preview Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Configuration - {sectionTitle}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Advanced mobile-specific settings and optimizations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Device Selector */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {Object.entries(DeviceFrames).map(([key, device]) => (
              <Button
                key={key}
                variant={previewDevice === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() =>
                  setPreviewDevice(key as keyof typeof DeviceFrames)
                }
                className="h-8 px-2"
              >
                {key === 'mobile' || key === 'mobileLarge' ? (
                  <Smartphone className="h-3 w-3" />
                ) : (
                  <Tablet className="h-3 w-3" />
                )}
              </Button>
            ))}
          </div>

          <Button
            variant={isPreviewOpen ? 'default' : 'outline'}
            onClick={() => setIsPreviewOpen(!isPreviewOpen)}
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewOpen ? 'Hide' : 'Show'} Preview
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="visibility" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Visibility
              </TabsTrigger>
              <TabsTrigger value="gestures" className="text-xs">
                <Touch className="h-3 w-3 mr-1" />
                Gestures
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="device" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Device
              </TabsTrigger>
            </TabsList>

            {/* Visibility & Layout Tab */}
            <TabsContent value="visibility" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Basic Visibility</h4>
                  <Badge
                    variant={
                      config.visibility.hidden ? 'destructive' : 'default'
                    }
                  >
                    {config.visibility.hidden ? 'Hidden' : 'Visible'}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Hide on Mobile</p>
                      <p className="text-xs text-gray-600">
                        Completely hide this section on mobile devices
                      </p>
                    </div>
                    <Switch
                      checked={config.visibility.hidden}
                      onCheckedChange={(checked) =>
                        updateConfig('visibility.hidden', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Collapsible</p>
                      <p className="text-xs text-gray-600">
                        Allow users to expand/collapse section
                      </p>
                    </div>
                    <Switch
                      checked={config.visibility.collapsible}
                      onCheckedChange={(checked) =>
                        updateConfig('visibility.collapsible', checked)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Priority Order
                    </label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[config.visibility.priorityOrder]}
                        onValueChange={([value]) =>
                          updateConfig('visibility.priorityOrder', value)
                        }
                        max={100}
                        min={0}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8">
                        {config.visibility.priorityOrder}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Lower numbers appear first
                    </p>
                  </div>
                </div>
              </Card>

              {/* Responsive Breakpoints */}
              <Card className="p-4">
                <button
                  onClick={() => toggleSection('breakpoints')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h4 className="font-medium">Responsive Breakpoints</h4>
                  {expandedSections.includes('breakpoints') ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {expandedSections.includes('breakpoints') && (
                  <div className="mt-4 space-y-4">
                    {/* Mobile Settings */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          Mobile (≤{config.breakpoints.mobile.maxWidth}px)
                        </span>
                        <Switch
                          checked={config.breakpoints.mobile.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig('breakpoints.mobile.enabled', checked)
                          }
                          size="sm"
                        />
                      </div>

                      {config.breakpoints.mobile.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium">
                                Layout
                              </label>
                              <select
                                className="w-full px-2 py-1 text-xs border rounded"
                                value={config.breakpoints.mobile.layout}
                                onChange={(e) =>
                                  updateConfig(
                                    'breakpoints.mobile.layout',
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="stack">Stack</option>
                                <option value="grid">Grid</option>
                                <option value="carousel">Carousel</option>
                                <option value="accordion">Accordion</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium">
                                Columns
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="3"
                                value={config.breakpoints.mobile.columns}
                                onChange={(e) =>
                                  updateConfig(
                                    'breakpoints.mobile.columns',
                                    parseInt(e.target.value),
                                  )
                                }
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tablet Settings */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Tablet className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          Tablet ({config.breakpoints.tablet.minWidth}px -{' '}
                          {config.breakpoints.tablet.maxWidth}px)
                        </span>
                        <Switch
                          checked={config.breakpoints.tablet.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig('breakpoints.tablet.enabled', checked)
                          }
                          size="sm"
                        />
                      </div>

                      {config.breakpoints.tablet.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium">
                                Layout
                              </label>
                              <select
                                className="w-full px-2 py-1 text-xs border rounded"
                                value={config.breakpoints.tablet.layout}
                                onChange={(e) =>
                                  updateConfig(
                                    'breakpoints.tablet.layout',
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="stack">Stack</option>
                                <option value="grid">Grid</option>
                                <option value="carousel">Carousel</option>
                                <option value="sidebar">Sidebar</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium">
                                Columns
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="4"
                                value={config.breakpoints.tablet.columns}
                                onChange={(e) =>
                                  updateConfig(
                                    'breakpoints.tablet.columns',
                                    parseInt(e.target.value),
                                  )
                                }
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Gestures Tab */}
            <TabsContent value="gestures" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Touch Gestures</h4>
                  <Switch
                    checked={config.gestures.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig('gestures.enabled', checked)
                    }
                  />
                </div>

                {config.gestures.enabled && (
                  <div className="space-y-4">
                    {/* Swipe Actions */}
                    <div className="border rounded-lg p-3">
                      <h5 className="font-medium text-sm mb-3">
                        Swipe Actions
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(config.gestures.swipeActions).map(
                          ([direction, action]) => (
                            <div key={direction}>
                              <label className="text-xs font-medium capitalize">
                                {direction} Swipe
                              </label>
                              <select
                                className="w-full px-2 py-1 text-xs border rounded mt-1"
                                value={action}
                                onChange={(e) =>
                                  updateConfig(
                                    `gestures.swipeActions.${direction}`,
                                    e.target.value,
                                  )
                                }
                              >
                                <option value="none">None</option>
                                <option value="dismiss">Dismiss</option>
                                <option value="expand">Expand</option>
                                <option value="collapse">Collapse</option>
                                <option value="refresh">Refresh</option>
                                <option value="next">Next</option>
                                <option value="previous">Previous</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Gesture Test Buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => simulateGesture('swipe-left')}
                          className="text-xs"
                        >
                          <Hand className="h-3 w-3 mr-1" />
                          Test Left
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => simulateGesture('swipe-right')}
                          className="text-xs"
                        >
                          <Hand className="h-3 w-3 mr-1" />
                          Test Right
                        </Button>
                      </div>
                    </div>

                    {/* Long Press */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-sm">Long Press</h5>
                        <Switch
                          checked={config.gestures.longPressActions.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig(
                              'gestures.longPressActions.enabled',
                              checked,
                            )
                          }
                          size="sm"
                        />
                      </div>

                      {config.gestures.longPressActions.enabled && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium">
                              Duration (ms)
                            </label>
                            <Input
                              type="number"
                              min="300"
                              max="2000"
                              step="100"
                              value={config.gestures.longPressActions.duration}
                              onChange={(e) =>
                                updateConfig(
                                  'gestures.longPressActions.duration',
                                  parseInt(e.target.value),
                                )
                              }
                              className="text-xs h-8"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium">
                              Action
                            </label>
                            <select
                              className="w-full px-2 py-1 text-xs border rounded"
                              value={config.gestures.longPressActions.action}
                              onChange={(e) =>
                                updateConfig(
                                  'gestures.longPressActions.action',
                                  e.target.value,
                                )
                              }
                            >
                              <option value="none">None</option>
                              <option value="context_menu">Context Menu</option>
                              <option value="quick_edit">Quick Edit</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pinch Zoom */}
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-sm">Pinch Zoom</h5>
                        <Switch
                          checked={config.gestures.pinchZoom.enabled}
                          onCheckedChange={(checked) =>
                            updateConfig('gestures.pinchZoom.enabled', checked)
                          }
                          size="sm"
                        />
                      </div>

                      {config.gestures.pinchZoom.enabled && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium">
                              Min Scale
                            </label>
                            <Slider
                              value={[config.gestures.pinchZoom.minScale]}
                              onValueChange={([value]) =>
                                updateConfig(
                                  'gestures.pinchZoom.minScale',
                                  value,
                                )
                              }
                              min={0.1}
                              max={1}
                              step={0.1}
                              className="mt-1"
                            />
                            <span className="text-xs text-gray-600">
                              {config.gestures.pinchZoom.minScale}x
                            </span>
                          </div>
                          <div>
                            <label className="text-xs font-medium">
                              Max Scale
                            </label>
                            <Slider
                              value={[config.gestures.pinchZoom.maxScale]}
                              onValueChange={([value]) =>
                                updateConfig(
                                  'gestures.pinchZoom.maxScale',
                                  value,
                                )
                              }
                              min={1}
                              max={5}
                              step={0.5}
                              className="mt-1"
                            />
                            <span className="text-xs text-gray-600">
                              {config.gestures.pinchZoom.maxScale}x
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-4">Loading & Performance</h4>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Lazy Loading</p>
                      <p className="text-xs text-gray-600">
                        Load content only when visible
                      </p>
                    </div>
                    <Switch
                      checked={config.performance.lazyLoading}
                      onCheckedChange={(checked) =>
                        updateConfig('performance.lazyLoading', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Virtual Scrolling</p>
                      <p className="text-xs text-gray-600">
                        Optimize for large lists
                      </p>
                    </div>
                    <Switch
                      checked={config.performance.virtualScrolling}
                      onCheckedChange={(checked) =>
                        updateConfig('performance.virtualScrolling', checked)
                      }
                    />
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">
                        Image Optimization
                      </h5>
                      <Switch
                        checked={config.performance.imageOptimization.enabled}
                        onCheckedChange={(checked) =>
                          updateConfig(
                            'performance.imageOptimization.enabled',
                            checked,
                          )
                        }
                        size="sm"
                      />
                    </div>

                    {config.performance.imageOptimization.enabled && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium">Quality</label>
                          <Slider
                            value={[
                              config.performance.imageOptimization.quality,
                            ]}
                            onValueChange={([value]) =>
                              updateConfig(
                                'performance.imageOptimization.quality',
                                value,
                              )
                            }
                            min={10}
                            max={100}
                            step={10}
                            className="mt-1"
                          />
                          <span className="text-xs text-gray-600">
                            {config.performance.imageOptimization.quality}%
                          </span>
                        </div>
                        <div>
                          <label className="text-xs font-medium">Format</label>
                          <select
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={config.performance.imageOptimization.format}
                            onChange={(e) =>
                              updateConfig(
                                'performance.imageOptimization.format',
                                e.target.value,
                              )
                            }
                          >
                            <option value="auto">Auto</option>
                            <option value="webp">WebP</option>
                            <option value="avif">AVIF</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Max Memory Usage (MB)
                    </label>
                    <Input
                      type="number"
                      min="16"
                      max="512"
                      value={config.performance.maxMemoryUsage}
                      onChange={(e) =>
                        updateConfig(
                          'performance.maxMemoryUsage',
                          parseInt(e.target.value),
                        )
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </Card>

              {/* Animations */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Animations</h4>
                  <Switch
                    checked={config.animations.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig('animations.enabled', checked)
                    }
                  />
                </div>

                {config.animations.enabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium">
                          Enter Animation
                        </label>
                        <select
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={config.animations.enterAnimation}
                          onChange={(e) =>
                            updateConfig(
                              'animations.enterAnimation',
                              e.target.value,
                            )
                          }
                        >
                          <option value="none">None</option>
                          <option value="fade">Fade</option>
                          <option value="slide">Slide</option>
                          <option value="scale">Scale</option>
                          <option value="bounce">Bounce</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          Exit Animation
                        </label>
                        <select
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={config.animations.exitAnimation}
                          onChange={(e) =>
                            updateConfig(
                              'animations.exitAnimation',
                              e.target.value,
                            )
                          }
                        >
                          <option value="none">None</option>
                          <option value="fade">Fade</option>
                          <option value="slide">Slide</option>
                          <option value="scale">Scale</option>
                          <option value="bounce">Bounce</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium">
                        Duration (ms)
                      </label>
                      <Slider
                        value={[config.animations.duration]}
                        onValueChange={([value]) =>
                          updateConfig('animations.duration', value)
                        }
                        min={100}
                        max={1000}
                        step={50}
                        className="mt-1"
                      />
                      <span className="text-xs text-gray-600">
                        {config.animations.duration}ms
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          Respect Reduced Motion
                        </p>
                        <p className="text-xs text-gray-600">
                          Honor user's accessibility preferences
                        </p>
                      </div>
                      <Switch
                        checked={config.animations.reducedMotion}
                        onCheckedChange={(checked) =>
                          updateConfig('animations.reducedMotion', checked)
                        }
                      />
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Device Tab */}
            <TabsContent value="device" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Haptic Feedback</h4>
                  <Switch
                    checked={config.deviceSettings.hapticFeedback.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        'deviceSettings.hapticFeedback.enabled',
                        checked,
                      )
                    }
                  />
                </div>

                {config.deviceSettings.hapticFeedback.enabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium">Intensity</label>
                      <select
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={config.deviceSettings.hapticFeedback.intensity}
                        onChange={(e) =>
                          updateConfig(
                            'deviceSettings.hapticFeedback.intensity',
                            e.target.value,
                          )
                        }
                      >
                        <option value="light">Light</option>
                        <option value="medium">Medium</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>

                    <div className="border rounded-lg p-2">
                      <p className="text-xs font-medium mb-2">
                        Feedback Patterns
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(
                          config.deviceSettings.hapticFeedback.patterns,
                        ).map(([pattern, enabled]) => (
                          <div
                            key={pattern}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs capitalize">
                              {pattern}
                            </span>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                updateConfig(
                                  `deviceSettings.hapticFeedback.patterns.${pattern}`,
                                  checked,
                                )
                              }
                              size="sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => simulateGesture('haptic')}
                      className="w-full"
                    >
                      <Vibrate className="h-3 w-3 mr-1" />
                      Test Haptic Feedback
                    </Button>
                  </div>
                )}
              </Card>

              {/* Battery Optimization */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Battery Optimization</h4>
                  <Switch
                    checked={config.deviceSettings.batteryOptimization.enabled}
                    onCheckedChange={(checked) =>
                      updateConfig(
                        'deviceSettings.batteryOptimization.enabled',
                        checked,
                      )
                    }
                  />
                </div>

                {config.deviceSettings.batteryOptimization.enabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">
                        Reduce animations when battery low
                      </span>
                      <Switch
                        checked={
                          config.deviceSettings.batteryOptimization
                            .reducedAnimations
                        }
                        onCheckedChange={(checked) =>
                          updateConfig(
                            'deviceSettings.batteryOptimization.reducedAnimations',
                            checked,
                          )
                        }
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Lower refresh rate</span>
                      <Switch
                        checked={
                          config.deviceSettings.batteryOptimization
                            .lowerRefreshRate
                        }
                        onCheckedChange={(checked) =>
                          updateConfig(
                            'deviceSettings.batteryOptimization.lowerRefreshRate',
                            checked,
                          )
                        }
                        size="sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Dim backlight</span>
                      <Switch
                        checked={
                          config.deviceSettings.batteryOptimization.dimBacklight
                        }
                        onCheckedChange={(checked) =>
                          updateConfig(
                            'deviceSettings.batteryOptimization.dimBacklight',
                            checked,
                          )
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Accessibility */}
              <Card className="p-4">
                <h4 className="font-medium mb-4">Accessibility</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Screen reader support</span>
                    <Switch
                      checked={config.accessibility.screenReaderSupport}
                      onCheckedChange={(checked) =>
                        updateConfig(
                          'accessibility.screenReaderSupport',
                          checked,
                        )
                      }
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">High contrast mode</span>
                    <Switch
                      checked={config.accessibility.highContrast}
                      onCheckedChange={(checked) =>
                        updateConfig('accessibility.highContrast', checked)
                      }
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Large text support</span>
                    <Switch
                      checked={config.accessibility.largeText}
                      onCheckedChange={(checked) =>
                        updateConfig('accessibility.largeText', checked)
                      }
                      size="sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">
                      Minimum tap target size (px)
                    </label>
                    <Input
                      type="number"
                      min="24"
                      max="72"
                      value={config.accessibility.tapTargetSize}
                      onChange={(e) =>
                        updateConfig(
                          'accessibility.tapTargetSize',
                          parseInt(e.target.value),
                        )
                      }
                      className="text-xs h-8 mt-1"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Recommended: 44px minimum
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        {isPreviewOpen && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Live Preview</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {DeviceFrames[previewDevice].name} (
                    {DeviceFrames[previewDevice].width}×
                    {DeviceFrames[previewDevice].height})
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPreviewDevice(
                        previewDevice === 'mobile' ? 'tablet' : 'mobile',
                      )
                    }
                  >
                    <RotateCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Device Preview Frame */}
              <div className="flex justify-center">
                <div
                  className="border-2 border-gray-300 rounded-lg bg-gray-100 p-2 shadow-lg"
                  style={{
                    width: Math.min(DeviceFrames[previewDevice].width / 2, 300),
                    height: Math.min(
                      DeviceFrames[previewDevice].height / 2,
                      400,
                    ),
                  }}
                >
                  <div
                    ref={previewRef}
                    className={cn(
                      'bg-white rounded border h-full overflow-hidden',
                      config.visibility.hidden && 'opacity-50',
                      config.animations.enabled &&
                        'transition-all duration-300',
                    )}
                  >
                    {/* Mock Section Content */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm">{sectionTitle}</h5>
                        {config.visibility.collapsible && (
                          <Button size="sm" variant="ghost">
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded"></div>
                        <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                      </div>

                      {config.breakpoints.mobile.layout === 'grid' && (
                        <div
                          className={cn(
                            'grid gap-2 mt-3',
                            config.breakpoints.mobile.columns === 1 &&
                              'grid-cols-1',
                            config.breakpoints.mobile.columns === 2 &&
                              'grid-cols-2',
                            config.breakpoints.mobile.columns === 3 &&
                              'grid-cols-3',
                          )}
                        >
                          {Array.from({
                            length: config.breakpoints.mobile.columns * 2,
                          }).map((_, i) => (
                            <div
                              key={i}
                              className="h-8 bg-gray-100 rounded"
                            ></div>
                          ))}
                        </div>
                      )}

                      {config.breakpoints.mobile.layout === 'carousel' && (
                        <div className="flex gap-2 mt-3 overflow-hidden">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-16 w-20 bg-gray-100 rounded flex-shrink-0"
                            ></div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gesture Overlay */}
                    {config.gestures.enabled && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-1 rounded">
                          Touch
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Controls */}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulateGesture('preview-tap')}
                  className="flex-1"
                >
                  <MousePointer className="h-3 w-3 mr-1" />
                  Tap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulateGesture('preview-swipe')}
                  className="flex-1"
                >
                  <Hand className="h-3 w-3 mr-1" />
                  Swipe
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => simulateGesture('preview-long-press')}
                  className="flex-1"
                >
                  <Touch className="h-3 w-3 mr-1" />
                  Long Press
                </Button>
              </div>
            </Card>

            {/* Configuration Summary */}
            <Card className="p-4">
              <h4 className="font-medium mb-3">Configuration Summary</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Visibility:</span>
                  <Badge
                    variant={
                      config.visibility.hidden ? 'destructive' : 'default'
                    }
                    className="text-xs"
                  >
                    {config.visibility.hidden ? 'Hidden' : 'Visible'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Gestures:</span>
                  <Badge
                    variant={config.gestures.enabled ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {config.gestures.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Animations:</span>
                  <Badge
                    variant={
                      config.animations.enabled ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {config.animations.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Performance:</span>
                  <Badge
                    variant={
                      config.performance.lazyLoading ? 'default' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {config.performance.lazyLoading ? 'Optimized' : 'Standard'}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
