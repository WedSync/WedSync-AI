'use client';

// WS-211 Responsive Preview for Mobile Templates
// Multi-device preview system for wedding vendor client dashboards

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCw,
  Maximize2,
  Minimize2,
  Eye,
  Share2,
  Download,
  Settings,
  Wifi,
  Battery,
  Signal,
  Clock,
  Volume2,
  ZoomIn,
  ZoomOut,
  Refresh,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Device presets for accurate preview
interface DevicePreset {
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  width: number;
  height: number;
  pixelRatio: number;
  userAgent: string;
  icon: React.ElementType;
}

interface MobileTemplate {
  id: string;
  name: string;
  description: string;
  category: 'photographer' | 'venue' | 'caterer' | 'florist' | 'general';
  viewport: 'mobile' | 'tablet' | 'desktop';
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl?: string;
  };
  widgets: any[];
  grid: {
    columns: number;
    rows: number;
    gap: number;
  };
  createdAt: string;
  lastModified: string;
  isPublished: boolean;
}

interface ResponsivePreviewProps {
  template: MobileTemplate;
  onTemplateUpdate?: (template: MobileTemplate) => void;
  className?: string;
  showControls?: boolean;
  showDeviceFrame?: boolean;
  allowDeviceRotation?: boolean;
  allowZoom?: boolean;
}

// Popular device presets
const devicePresets: DevicePreset[] = [
  {
    name: 'iPhone 15 Pro',
    type: 'mobile',
    width: 393,
    height: 852,
    pixelRatio: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: Smartphone,
  },
  {
    name: 'iPhone SE',
    type: 'mobile',
    width: 375,
    height: 667,
    pixelRatio: 2,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: Smartphone,
  },
  {
    name: 'Samsung Galaxy S24',
    type: 'mobile',
    width: 384,
    height: 854,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-G981B) AppleWebKit/537.36',
    icon: Smartphone,
  },
  {
    name: 'iPad Pro 12.9"',
    type: 'tablet',
    width: 1024,
    height: 1366,
    pixelRatio: 2,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: Tablet,
  },
  {
    name: 'iPad Air',
    type: 'tablet',
    width: 820,
    height: 1180,
    pixelRatio: 2,
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: Tablet,
  },
  {
    name: 'Desktop 1920x1080',
    type: 'desktop',
    width: 1920,
    height: 1080,
    pixelRatio: 1,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    icon: Monitor,
  },
];

export function ResponsivePreview({
  template,
  onTemplateUpdate,
  className,
  showControls = true,
  showDeviceFrame = true,
  allowDeviceRotation = true,
  allowZoom = true,
}: ResponsivePreviewProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(
    devicePresets[0],
  );
  const [isLandscape, setIsLandscape] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [previewMode, setPreviewMode] = useState<'interactive' | 'static'>(
    'interactive',
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingState, setLoadingState] = useState<
    'loading' | 'loaded' | 'error'
  >('loaded');

  const previewRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Get current device dimensions
  const currentWidth = isLandscape
    ? selectedDevice.height
    : selectedDevice.width;
  const currentHeight = isLandscape
    ? selectedDevice.width
    : selectedDevice.height;
  const actualWidth = (currentWidth * zoom[0]) / 100;
  const actualHeight = (currentHeight * zoom[0]) / 100;

  // Handle device change
  const handleDeviceChange = (deviceName: string) => {
    const device = devicePresets.find((d) => d.name === deviceName);
    if (device) {
      setSelectedDevice(device);
      setIsLandscape(false); // Reset to portrait when changing device
    }
  };

  // Handle orientation change
  const handleOrientationChange = () => {
    if (allowDeviceRotation) {
      setIsLandscape(!isLandscape);
    }
  };

  // Handle zoom change
  const handleZoomChange = (value: number[]) => {
    if (allowZoom) {
      setZoom(value);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Refresh preview
  const refreshPreview = () => {
    setLoadingState('loading');
    setTimeout(() => setLoadingState('loaded'), 1000);
  };

  // Generate preview URL (in real app, this would generate actual preview)
  const generatePreviewUrl = () => {
    return `/api/templates/${template.id}/preview?device=${selectedDevice.name}&orientation=${isLandscape ? 'landscape' : 'portrait'}`;
  };

  // Share preview
  const sharePreview = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${template.name} - Mobile Preview`,
          text: `Check out this mobile template preview for ${template.category} vendors`,
          url: generatePreviewUrl(),
        });
      } catch (error) {
        console.log('Sharing failed:', error);
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(generatePreviewUrl());
    }
  };

  // Export preview as image
  const exportPreview = () => {
    // In real implementation, this would capture the preview and download as image
    console.log('Exporting preview as image...');
  };

  // Generate mock template HTML for preview
  const generateTemplateHTML = () => {
    return `
    <!DOCTYPE html>
    <html lang="en" style="font-family: ${template.branding.fontFamily}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: ${template.branding.fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, ${template.branding.primaryColor}15, ${template.branding.secondaryColor}15);
          min-height: 100vh;
          padding: 16px;
        }
        .template-container {
          max-width: 100%;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .template-header {
          background: linear-gradient(135deg, ${template.branding.primaryColor}, ${template.branding.secondaryColor});
          color: white;
          padding: 24px;
          text-align: center;
        }
        .template-grid {
          display: grid;
          grid-template-columns: repeat(${template.grid.columns}, 1fr);
          gap: ${template.grid.gap}px;
          padding: 20px;
        }
        .widget {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
        }
        .widget:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }
        .widget-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .widget-icon {
          width: 20px;
          height: 20px;
          background: ${template.branding.accentColor};
          border-radius: 4px;
        }
        .widget-title {
          font-weight: 600;
          color: #1e293b;
        }
        .widget-content {
          color: #64748b;
          font-size: 14px;
        }
        @media (max-width: 640px) {
          .template-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 16px;
          }
          .template-header {
            padding: 20px 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="template-container">
        <div class="template-header">
          <h1>${template.name}</h1>
          <p style="opacity: 0.9; margin-top: 8px;">${template.description}</p>
        </div>
        <div class="template-grid">
          ${template.widgets
            .map(
              (widget, index) => `
            <div class="widget" style="grid-area: ${widget.position?.row + 1 || Math.floor(index / template.grid.columns) + 1} / ${widget.position?.col + 1 || (index % template.grid.columns) + 1};">
              <div class="widget-header">
                <div class="widget-icon"></div>
                <div class="widget-title">${widget.title}</div>
              </div>
              <div class="widget-content">
                ${widget.type} widget with custom ${template.category} branding
              </div>
            </div>
          `,
            )
            .join('')}
          ${
            template.widgets.length === 0
              ? `
            <div class="widget">
              <div class="widget-header">
                <div class="widget-icon"></div>
                <div class="widget-title">Sample Widget</div>
              </div>
              <div class="widget-content">
                This is how widgets will appear in your client dashboard
              </div>
            </div>
            <div class="widget">
              <div class="widget-header">
                <div class="widget-icon"></div>
                <div class="widget-title">Another Widget</div>
              </div>
              <div class="widget-content">
                Customizable for ${template.category} specific needs
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </body>
    </html>
    `;
  };

  useEffect(() => {
    if (frameRef.current && loadingState === 'loaded') {
      const html = generateTemplateHTML();
      const doc = frameRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [template, selectedDevice, isLandscape, loadingState]);

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-gray-50',
        isFullscreen && 'fixed inset-0 z-50',
        className,
      )}
    >
      {/* Controls Header */}
      {showControls && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Device Selection */}
              <Select
                value={selectedDevice.name}
                onValueChange={handleDeviceChange}
              >
                <SelectTrigger className="w-48">
                  <div className="flex items-center gap-2">
                    <selectedDevice.icon className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {devicePresets.map((device) => (
                    <SelectItem key={device.name} value={device.name}>
                      <div className="flex items-center gap-2">
                        <device.icon className="h-4 w-4" />
                        <span>{device.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {device.width}×{device.height}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Orientation Toggle */}
              {allowDeviceRotation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOrientationChange}
                  className="flex items-center gap-2"
                >
                  <RotateCw className="h-4 w-4" />
                  {isLandscape ? 'Landscape' : 'Portrait'}
                </Button>
              )}

              {/* Zoom Control */}
              {allowZoom && (
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-gray-500" />
                  <Slider
                    value={zoom}
                    onValueChange={handleZoomChange}
                    max={200}
                    min={25}
                    step={25}
                    className="w-24"
                  />
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 w-12">{zoom[0]}%</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Preview Mode Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Interactive
                </label>
                <Switch
                  checked={previewMode === 'interactive'}
                  onCheckedChange={(checked) =>
                    setPreviewMode(checked ? 'interactive' : 'static')
                  }
                />
              </div>

              {/* Device Frame Toggle */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Frame
                </label>
                <Switch
                  checked={showDeviceFrame}
                  onCheckedChange={setShowDeviceFrame}
                />
              </div>

              <div className="w-px h-6 bg-gray-300" />

              {/* Action Buttons */}
              <Button variant="outline" size="sm" onClick={refreshPreview}>
                <Refresh className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={sharePreview}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportPreview}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-8 flex items-center justify-center">
        <div className="relative">
          {/* Device Frame */}
          {showDeviceFrame && (
            <div
              className={cn(
                'relative bg-gray-900 rounded-3xl p-6 shadow-2xl',
                selectedDevice.type === 'mobile' && 'rounded-3xl p-4',
                selectedDevice.type === 'tablet' && 'rounded-2xl p-8',
                selectedDevice.type === 'desktop' && 'rounded-lg p-2',
              )}
              style={{
                width:
                  actualWidth +
                  (selectedDevice.type === 'mobile'
                    ? 32
                    : selectedDevice.type === 'tablet'
                      ? 64
                      : 16),
                height:
                  actualHeight +
                  (selectedDevice.type === 'mobile'
                    ? 80
                    : selectedDevice.type === 'tablet'
                      ? 96
                      : 40),
              }}
            >
              {/* Status Bar for Mobile/Tablet */}
              {showStatusBar && selectedDevice.type !== 'desktop' && (
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>9:41</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <Battery className="h-3 w-3" />
                  </div>
                </div>
              )}

              {/* Home Indicator for iPhone */}
              {selectedDevice.name.includes('iPhone') &&
                selectedDevice.name !== 'iPhone SE' && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white opacity-40 rounded-full" />
                )}
            </div>
          )}

          {/* Preview Content */}
          <div
            className={cn(
              'bg-white shadow-xl rounded-lg overflow-hidden',
              showDeviceFrame && 'absolute',
              showDeviceFrame &&
                selectedDevice.type === 'mobile' &&
                'top-8 left-4',
              showDeviceFrame &&
                selectedDevice.type === 'tablet' &&
                'top-12 left-8',
              showDeviceFrame &&
                selectedDevice.type === 'desktop' &&
                'top-2 left-2',
            )}
            style={{
              width: actualWidth,
              height: actualHeight,
              ...(showDeviceFrame ? {} : { position: 'relative' }),
            }}
          >
            {loadingState === 'loading' ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-sm text-gray-600">Loading preview...</p>
                </div>
              </div>
            ) : (
              <iframe
                ref={frameRef}
                className="w-full h-full border-0"
                title="Template Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            )}

            {/* Safe Area Overlay */}
            {showSafeArea && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full border-4 border-dashed border-red-400 opacity-50" />
              </div>
            )}
          </div>

          {/* Device Info Badge */}
          <div className="absolute -bottom-8 left-0 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {currentWidth} × {currentHeight}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {selectedDevice.pixelRatio}x DPR
            </Badge>
            {zoom[0] !== 100 && (
              <Badge variant="outline" className="text-xs">
                {zoom[0]}% zoom
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Template Info Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Template: {template.name}</span>
            <span>Category: {template.category}</span>
            <span>Widgets: {template.widgets.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Last updated:{' '}
              {new Date(template.lastModified).toLocaleDateString()}
            </span>
            <Badge variant={template.isPublished ? 'default' : 'secondary'}>
              {template.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResponsivePreview;
