'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
  ClockIcon,
  PaintBrushIcon,
  ViewColumnsIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { 
  enableScreenshotMode, 
  disableScreenshotMode, 
  isScreenshotMode as checkScreenshotMode,
  formatDemoTime,
  useScreenshotMode
} from '@/lib/demo/screenshot-helpers';
import { DEMO_FROZEN_TIME, SCREENSHOT_MODE } from '@/lib/demo/config';

interface ScreenshotModeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ScreenshotModeToggle({ className = '', compact = false }: ScreenshotModeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const { getDemoTime, formatDemoTime: formatTime } = useScreenshotMode();

  useEffect(() => {
    setMounted(true);
    setIsActive(checkScreenshotMode());
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  const handleToggle = () => {
    if (isActive) {
      disableScreenshotMode();
      setIsActive(false);
    } else {
      enableScreenshotMode();
      setIsActive(true);
    }
  };

  const modifications = SCREENSHOT_MODE.modifications;

  if (compact) {
    return (
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className={className}
      >
        {isActive ? (
          <EyeSlashIcon className="h-4 w-4 mr-2" />
        ) : (
          <CameraIcon className="h-4 w-4 mr-2" />
        )}
        Screenshot Mode
        {isActive && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">ON</Badge>}
      </Button>
    );
  }

  return (
    <Card className={`${className} ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
              <CameraIcon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Screenshot Mode</h3>
              <p className="text-xs text-gray-500">Optimize UI for captures</p>
            </div>
          </div>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggle}
          >
            {isActive ? (
              <>
                <EyeSlashIcon className="h-4 w-4 mr-1" />
                Disable
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4 mr-1" />
                Enable
              </>
            )}
          </Button>
        </div>

        {isActive && (
          <div className="space-y-2">
            {/* Status indicator */}
            <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
              <SparklesIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Screenshot mode active
              </span>
            </div>

            {/* Current time display */}
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
              <ClockIcon className="h-4 w-4 text-blue-600" />
              <div>
                <span className="text-sm text-blue-700">
                  Time: {formatTime('datetime')}
                </span>
                {modifications.freezeTime && (
                  <div className="text-xs text-blue-600 mt-1">
                    🔒 Frozen at: {DEMO_FROZEN_TIME.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Active modifications */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 mb-2">Active Modifications:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {modifications.hideDebugBanners && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Debug hidden</span>
                  </div>
                )}
                {modifications.useLightTheme && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Light theme</span>
                  </div>
                )}
                {modifications.expandPanels && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Panels expanded</span>
                  </div>
                )}
                {modifications.hideTooltips && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Tooltips hidden</span>
                  </div>
                )}
                {modifications.freezeTime && (
                  <div className="flex items-center space-x-1 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Time frozen</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  const url = new URL(window.location);
                  url.searchParams.set(SCREENSHOT_MODE.queryParam, SCREENSHOT_MODE.enableValue);
                  navigator.clipboard.writeText(url.toString());
                }}
              >
                Copy URL
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => window.print()}
              >
                Print Page
              </Button>
            </div>
          </div>
        )}

        {!isActive && (
          <div className="text-xs text-gray-500 mt-2">
            Enable to optimize UI for screenshots and presentations
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScreenshotModeToggle;