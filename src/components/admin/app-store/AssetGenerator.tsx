'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'windows' | 'web';
}

interface GeneratedAsset {
  id: string;
  type: 'screenshot' | 'icon';
  platform: string;
  size: string;
  url: string;
  status: 'generating' | 'complete' | 'error';
}

interface AssetGeneratorProps {
  targetStore: 'microsoft' | 'google_play' | 'apple';
  assetType: 'screenshots' | 'icons' | 'metadata';
  onGenerationComplete: (assets: GeneratedAsset[]) => void;
}

const DEVICE_PRESETS: DevicePreset[] = [
  // iOS Devices
  {
    name: 'iPhone 15 Pro Max',
    width: 1290,
    height: 2796,
    deviceType: 'mobile',
    platform: 'ios',
  },
  {
    name: 'iPhone 15',
    width: 1179,
    height: 2556,
    deviceType: 'mobile',
    platform: 'ios',
  },
  {
    name: 'iPad Pro 12.9"',
    width: 2048,
    height: 2732,
    deviceType: 'tablet',
    platform: 'ios',
  },

  // Android Devices
  {
    name: 'Pixel 8 Pro',
    width: 1080,
    height: 2400,
    deviceType: 'mobile',
    platform: 'android',
  },
  {
    name: 'Samsung Galaxy S24',
    width: 1080,
    height: 2340,
    deviceType: 'mobile',
    platform: 'android',
  },
  {
    name: 'Android Tablet 10"',
    width: 1200,
    height: 1920,
    deviceType: 'tablet',
    platform: 'android',
  },

  // Desktop/Web
  {
    name: 'Desktop 1920x1080',
    width: 1920,
    height: 1080,
    deviceType: 'desktop',
    platform: 'web',
  },
  {
    name: 'Desktop 1366x768',
    width: 1366,
    height: 768,
    deviceType: 'desktop',
    platform: 'windows',
  },
];

const ICON_SIZES = {
  microsoft: ['44x44', '150x150', '310x150', '310x310'],
  google_play: ['512x512'],
  apple: ['1024x1024'],
};

export function AssetGenerator({
  targetStore,
  assetType,
  onGenerationComplete,
}: AssetGeneratorProps) {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [generatingAssets, setGeneratingAssets] = useState<GeneratedAsset[]>(
    [],
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDeviceToggle = useCallback((deviceName: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceName)
        ? prev.filter((d) => d !== deviceName)
        : [...prev, deviceName],
    );
  }, []);

  const handleGenerateScreenshots = useCallback(async () => {
    if (selectedDevices.length === 0) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    const assets: GeneratedAsset[] = selectedDevices.map((deviceName) => ({
      id: `${deviceName}-${Date.now()}`,
      type: 'screenshot',
      platform: targetStore,
      size:
        DEVICE_PRESETS.find((d) => d.name === deviceName)?.width +
          'x' +
          DEVICE_PRESETS.find((d) => d.name === deviceName)?.height || '',
      url: '',
      status: 'generating',
    }));

    setGeneratingAssets(assets);

    // Simulate screenshot generation process
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const device = DEVICE_PRESETS.find((d) => d.name === selectedDevices[i]);

      try {
        // Call screenshot generation API
        const response = await fetch('/api/app-store/generate-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetStore,
            device,
            pages: ['dashboard', 'vendor-list', 'budget', 'timeline', 'photos'],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          asset.url = result.url;
          asset.status = 'complete';
        } else {
          asset.status = 'error';
        }
      } catch (error) {
        console.error('Screenshot generation failed:', error);
        asset.status = 'error';
      }

      setGenerationProgress(((i + 1) / assets.length) * 100);
      setGeneratingAssets([...assets]);
    }

    setIsGenerating(false);
    onGenerationComplete(assets);
  }, [selectedDevices, targetStore, onGenerationComplete]);

  const handleGenerateIcons = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const iconSizes = ICON_SIZES[targetStore] || [];
    const assets: GeneratedAsset[] = iconSizes.map((size) => ({
      id: `icon-${size}-${Date.now()}`,
      type: 'icon',
      platform: targetStore,
      size,
      url: '',
      status: 'generating',
    }));

    setGeneratingAssets(assets);

    // Simulate icon generation process
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];

      try {
        const response = await fetch('/api/app-store/generate-icon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetStore,
            size: asset.size,
            format: 'png',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          asset.url = result.url;
          asset.status = 'complete';
        } else {
          asset.status = 'error';
        }
      } catch (error) {
        console.error('Icon generation failed:', error);
        asset.status = 'error';
      }

      setGenerationProgress(((i + 1) / assets.length) * 100);
      setGeneratingAssets([...assets]);
    }

    setIsGenerating(false);
    onGenerationComplete(assets);
  }, [targetStore, onGenerationComplete]);

  const getStatusColor = (status: GeneratedAsset['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusText = (status: GeneratedAsset['status']) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Generating...';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Asset Generator</h2>
        <Badge variant="outline" className="text-sm">
          {targetStore === 'microsoft'
            ? 'Microsoft Store'
            : targetStore === 'google_play'
              ? 'Google Play'
              : 'Apple App Store'}
        </Badge>
      </div>

      <Tabs value={assetType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="icons">Icons</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="screenshots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Screenshot Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Select Device Presets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DEVICE_PRESETS.filter((device) => {
                    // Filter devices based on target store
                    if (targetStore === 'microsoft')
                      return (
                        device.platform === 'windows' ||
                        device.platform === 'web'
                      );
                    if (targetStore === 'google_play')
                      return device.platform === 'android';
                    if (targetStore === 'apple')
                      return device.platform === 'ios';
                    return true;
                  }).map((device) => (
                    <div
                      key={device.name}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDevices.includes(device.name)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDeviceToggle(device.name)}
                    >
                      <div className="font-medium text-sm">{device.name}</div>
                      <div className="text-xs text-gray-500">
                        {device.width} × {device.height}
                      </div>
                      <Badge size="sm" variant="secondary" className="mt-1">
                        {device.deviceType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerateScreenshots}
                disabled={selectedDevices.length === 0 || isGenerating}
                className="w-full"
              >
                {isGenerating
                  ? 'Generating Screenshots...'
                  : `Generate Screenshots (${selectedDevices.length})`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="icons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Icon Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">Required Icon Sizes</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ICON_SIZES[targetStore]?.map((size) => (
                    <div
                      key={size}
                      className="p-3 border rounded-lg text-center"
                    >
                      <div className="font-medium text-sm">{size}</div>
                      <div className="text-xs text-gray-500">PNG Format</div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerateIcons}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating Icons...' : 'Generate All Icons'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadata Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Metadata optimization tools will be available here. Integration
                with keyword research and A/B testing framework.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generation Progress */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generation Progress</span>
                <span className="text-sm text-gray-500">
                  {Math.round(generationProgress)}%
                </span>
              </div>
              <Progress value={generationProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Assets */}
      {generatingAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generatingAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getStatusColor(asset.status)}`}
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {asset.type === 'screenshot'
                          ? `Screenshot - ${asset.size}`
                          : `Icon - ${asset.size}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {asset.platform}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm">
                    {getStatusText(asset.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
