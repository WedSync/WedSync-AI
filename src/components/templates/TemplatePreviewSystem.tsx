'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  Sun,
  Moon,
  Mail,
  Printer,
  Eye,
  RefreshCw,
  Download,
  Share2,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface TemplateComponent {
  id: string;
  type: string;
  name: string;
  content: any;
  styles: any;
  settings: any;
}

interface PreviewOptions {
  device: 'desktop' | 'tablet' | 'mobile';
  theme: 'light' | 'dark';
  emailClient: 'gmail' | 'outlook' | 'apple' | 'generic';
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
}

interface TemplatePreviewSystemProps {
  components: TemplateComponent[];
  templateTitle: string;
  onComponentSelect?: (componentId: string) => void;
  selectedComponent?: string | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function TemplatePreviewSystem({
  components,
  templateTitle,
  onComponentSelect,
  selectedComponent,
  isFullscreen = false,
  onToggleFullscreen,
}: TemplatePreviewSystemProps) {
  const [previewOptions, setPreviewOptions] = useState<PreviewOptions>({
    device: 'desktop',
    theme: 'light',
    emailClient: 'generic',
    zoom: 100,
    showGrid: false,
    showRulers: false,
  });

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Device dimensions
  const getDeviceDimensions = () => {
    switch (previewOptions.device) {
      case 'mobile':
        return { width: 375, height: 667, name: 'iPhone 8' };
      case 'tablet':
        return { width: 768, height: 1024, name: 'iPad' };
      case 'desktop':
      default:
        return { width: 1200, height: 800, name: 'Desktop' };
    }
  };

  // Email client styles
  const getEmailClientStyles = () => {
    const baseStyles = {
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1.4',
      color: previewOptions.theme === 'dark' ? '#ffffff' : '#000000',
      backgroundColor: previewOptions.theme === 'dark' ? '#1f1f1f' : '#ffffff',
    };

    switch (previewOptions.emailClient) {
      case 'gmail':
        return {
          ...baseStyles,
          fontFamily: 'Roboto, Arial, sans-serif',
          fontSize: '14px',
        };
      case 'outlook':
        return {
          ...baseStyles,
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '14px',
        };
      case 'apple':
        return {
          ...baseStyles,
          fontFamily: '-apple-system, BlinkMacSystemFont, Arial, sans-serif',
          fontSize: '15px',
        };
      default:
        return baseStyles;
    }
  };

  const updatePreviewOption = <K extends keyof PreviewOptions>(
    key: K,
    value: PreviewOptions[K],
  ) => {
    setPreviewOptions((prev) => ({ ...prev, [key]: value }));
  };

  const refreshPreview = () => {
    setIsPreviewLoading(true);
    setPreviewError(null);

    // Simulate preview refresh
    setTimeout(() => {
      setIsPreviewLoading(false);
    }, 500);
  };

  const exportPreview = (format: 'png' | 'pdf' | 'html') => {
    // Implementation would depend on specific export requirements
    console.log(`Exporting preview as ${format}`);
  };

  const sharePreview = () => {
    // Generate shareable link
    console.log('Generating shareable preview link');
  };

  const dimensions = getDeviceDimensions();
  const emailStyles = getEmailClientStyles();

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-50',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full',
      )}
    >
      {/* Preview Controls Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Live Preview
              </Badge>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium text-gray-700">
                {templateTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Device Selection */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                size="sm"
                variant={
                  previewOptions.device === 'desktop' ? 'default' : 'ghost'
                }
                onClick={() => updatePreviewOption('device', 'desktop')}
                className="flex items-center gap-2 px-3"
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </Button>
              <Button
                size="sm"
                variant={
                  previewOptions.device === 'tablet' ? 'default' : 'ghost'
                }
                onClick={() => updatePreviewOption('device', 'tablet')}
                className="flex items-center gap-2 px-3"
              >
                <Tablet className="w-4 h-4" />
                Tablet
              </Button>
              <Button
                size="sm"
                variant={
                  previewOptions.device === 'mobile' ? 'default' : 'ghost'
                }
                onClick={() => updatePreviewOption('device', 'mobile')}
                className="flex items-center gap-2 px-3"
              >
                <Smartphone className="w-4 h-4" />
                Mobile
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Theme Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updatePreviewOption(
                  'theme',
                  previewOptions.theme === 'light' ? 'dark' : 'light',
                )
              }
              className="flex items-center gap-2"
            >
              {previewOptions.theme === 'light' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              {previewOptions.theme === 'light' ? 'Light' : 'Dark'}
            </Button>

            {/* Email Client Selection */}
            <select
              value={previewOptions.emailClient}
              onChange={(e) =>
                updatePreviewOption('emailClient', e.target.value as any)
              }
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value="generic">Generic Email</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="apple">Apple Mail</option>
            </select>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Control */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updatePreviewOption(
                    'zoom',
                    Math.max(25, previewOptions.zoom - 25),
                  )
                }
                disabled={previewOptions.zoom <= 25}
              >
                -
              </Button>
              <span className="text-sm min-w-[3rem] text-center">
                {previewOptions.zoom}%
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updatePreviewOption(
                    'zoom',
                    Math.min(200, previewOptions.zoom + 25),
                  )
                }
                disabled={previewOptions.zoom >= 200}
              >
                +
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Actions */}
            <Button
              size="sm"
              variant="outline"
              onClick={refreshPreview}
              disabled={isPreviewLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={cn('w-4 h-4', isPreviewLoading && 'animate-spin')}
              />
              Refresh
            </Button>

            {onToggleFullscreen && (
              <Button
                size="sm"
                variant="outline"
                onClick={onToggleFullscreen}
                className="flex items-center gap-2"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex">
        {/* Preview Tabs */}
        <Tabs defaultValue="live" className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4">
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="live" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="print" className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Code
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 p-6 bg-gray-100">
            <TabsContent value="live" className="h-full">
              <LivePreview
                components={components}
                dimensions={dimensions}
                styles={emailStyles}
                zoom={previewOptions.zoom}
                showGrid={previewOptions.showGrid}
                onComponentSelect={onComponentSelect}
                selectedComponent={selectedComponent}
                ref={previewRef}
              />
            </TabsContent>

            <TabsContent value="email" className="h-full">
              <EmailClientPreview
                components={components}
                emailClient={previewOptions.emailClient}
                theme={previewOptions.theme}
                dimensions={dimensions}
              />
            </TabsContent>

            <TabsContent value="print" className="h-full">
              <PrintPreview components={components} dimensions={dimensions} />
            </TabsContent>

            <TabsContent value="code" className="h-full">
              <CodePreview
                components={components}
                emailClient={previewOptions.emailClient}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Preview Settings Sidebar */}
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Preview Settings
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Show Grid</label>
                  <input
                    type="checkbox"
                    checked={previewOptions.showGrid}
                    onChange={(e) =>
                      updatePreviewOption('showGrid', e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Show Rulers</label>
                  <input
                    type="checkbox"
                    checked={previewOptions.showRulers}
                    onChange={(e) =>
                      updatePreviewOption('showRulers', e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Export Options
              </h4>

              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportPreview('png')}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as PNG
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportPreview('pdf')}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as PDF
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportPreview('html')}
                  className="w-full justify-start"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export HTML
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={sharePreview}
                  className="w-full justify-start"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Preview
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Device Info
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Device: {dimensions.name}</div>
                <div>
                  Resolution: {dimensions.width} × {dimensions.height}
                </div>
                <div>Zoom: {previewOptions.zoom}%</div>
                <div>Theme: {previewOptions.theme}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live Preview Component
const LivePreview = React.forwardRef<
  HTMLDivElement,
  {
    components: TemplateComponent[];
    dimensions: { width: number; height: number; name: string };
    styles: any;
    zoom: number;
    showGrid: boolean;
    onComponentSelect?: (componentId: string) => void;
    selectedComponent?: string | null;
  }
>(
  (
    {
      components,
      dimensions,
      styles,
      zoom,
      showGrid,
      onComponentSelect,
      selectedComponent,
    },
    ref,
  ) => {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="bg-white shadow-lg border border-gray-300 relative overflow-auto"
          style={{
            width: (dimensions.width * zoom) / 100,
            height: (dimensions.height * zoom) / 100,
            minHeight: '400px',
          }}
        >
          {showGrid && (
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          )}

          <div
            ref={ref}
            className="p-4 space-y-4"
            style={{
              ...styles,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (zoom / 100)}%`,
              height: `${100 / (zoom / 100)}%`,
            }}
          >
            {components.map((component) => (
              <div
                key={component.id}
                onClick={() => onComponentSelect?.(component.id)}
                className={cn(
                  'border-2 border-transparent cursor-pointer transition-all rounded',
                  selectedComponent === component.id &&
                    'border-blue-500 bg-blue-50',
                )}
              >
                <TemplateComponentRenderer component={component} />
              </div>
            ))}

            {components.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No components added yet</p>
                <p className="text-xs mt-1">
                  Add components to see the preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

LivePreview.displayName = 'LivePreview';

// Email Client Preview Component
function EmailClientPreview({
  components,
  emailClient,
  theme,
  dimensions,
}: {
  components: TemplateComponent[];
  emailClient: string;
  theme: string;
  dimensions: { width: number; height: number; name: string };
}) {
  const clientStyles = {
    gmail: 'bg-white border-b border-red-200',
    outlook: 'bg-blue-50 border-b border-blue-200',
    apple: 'bg-gray-50 border-b border-gray-200',
    generic: 'bg-white border-b border-gray-200',
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div
        className="bg-white shadow-xl border border-gray-300 overflow-hidden"
        style={{
          width: Math.min(800, dimensions.width),
          height: Math.min(600, dimensions.height),
        }}
      >
        {/* Email Client Header */}
        <div
          className={cn(
            'p-3 text-sm',
            clientStyles[emailClient as keyof typeof clientStyles] ||
              clientStyles.generic,
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-medium">Wedding Template Preview</span>
            </div>
            <div className="text-xs text-gray-500">
              {emailClient.charAt(0).toUpperCase() + emailClient.slice(1)}{' '}
              Client
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div
          className="p-6 space-y-4 overflow-auto"
          style={{ maxHeight: 'calc(100% - 60px)' }}
        >
          {components.map((component) => (
            <TemplateComponentRenderer
              key={component.id}
              component={component}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Print Preview Component
function PrintPreview({
  components,
  dimensions,
}: {
  components: TemplateComponent[];
  dimensions: { width: number; height: number; name: string };
}) {
  return (
    <div className="h-full flex items-center justify-center bg-gray-200 p-8">
      <div
        className="bg-white shadow-2xl border border-gray-300"
        style={{
          width: '210mm', // A4 width
          minHeight: '297mm', // A4 height
          maxWidth: '100%',
          padding: '20mm',
        }}
      >
        <div className="space-y-6">
          {components.map((component) => (
            <TemplateComponentRenderer
              key={component.id}
              component={component}
              printMode
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Code Preview Component
function CodePreview({
  components,
  emailClient,
}: {
  components: TemplateComponent[];
  emailClient: string;
}) {
  const generateHTML = () => {
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wedding Email Template</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .component { margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
`;

    components.forEach((component) => {
      html += `        <div class="component" data-component-type="${component.type}">
            <!-- ${component.name} -->
            ${generateComponentHTML(component)}
        </div>
`;
    });

    html += `    </div>
</body>
</html>`;

    return html;
  };

  const generateComponentHTML = (component: TemplateComponent) => {
    // Simplified HTML generation for each component type
    switch (component.type) {
      case 'text':
        return `<p>${component.content.text || 'Sample text'}</p>`;
      case 'rsvp':
        return `<div>
                <h3>${component.content.title || 'RSVP'}</h3>
                <form>
                    <label><input type="radio" name="attending" value="yes"> Yes, I will attend</label><br>
                    <label><input type="radio" name="attending" value="no"> Sorry, I cannot attend</label>
                </form>
            </div>`;
      default:
        return `<div>Component: ${component.type}</div>`;
    }
  };

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-medium">Generated HTML Code</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(generateHTML());
          }}
        >
          Copy Code
        </Button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto h-full">
        <pre>{generateHTML()}</pre>
      </div>
    </div>
  );
}

// Basic Template Component Renderer
function TemplateComponentRenderer({
  component,
  printMode = false,
}: {
  component: TemplateComponent;
  printMode?: boolean;
}) {
  const style = {
    ...component.styles,
    color: component.styles.textColor,
    backgroundColor: component.styles.backgroundColor,
    fontSize: component.styles.fontSize,
    textAlign: component.styles.textAlign,
    padding: component.styles.padding,
    margin: printMode ? '0 0 1em 0' : component.styles.margin,
  };

  switch (component.type) {
    case 'text':
      return (
        <div style={style}>
          {component.content.text || 'Sample text content'}
        </div>
      );
    case 'rsvp':
      return (
        <div style={style}>
          <h3>{component.content.title || 'RSVP'}</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input type="radio" name={`rsvp-${component.id}`} />
              <span>Yes, I will attend</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="radio" name={`rsvp-${component.id}`} />
              <span>Sorry, I cannot attend</span>
            </label>
          </div>
        </div>
      );
    case 'timeline':
      return (
        <div style={style}>
          <h3>{component.content.title || 'Timeline'}</h3>
          <div className="space-y-2">
            {component.content.events?.map((event: any, index: number) => (
              <div key={index} className="flex space-x-4">
                <span className="font-medium text-blue-600">{event.time}</span>
                <span>{event.event}</span>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div style={style} className="border border-gray-200 p-4 rounded">
          Component: {component.type}
        </div>
      );
  }
}
