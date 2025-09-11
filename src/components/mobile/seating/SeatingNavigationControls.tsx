'use client';

import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Map,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SeatingNavigationControlsProps } from '@/types/mobile-seating';

/**
 * SeatingNavigationControls - WS-154 Mobile Navigation Component
 *
 * Touch-optimized navigation controls for mobile seating interface:
 * - 44px minimum touch targets (accessibility)
 * - One-handed operation support
 * - Zoom in/out with visual feedback
 * - Reset view functionality
 * - Mini-map toggle
 * - Zoom level indicator
 * - Touch-friendly spacing
 */
export const SeatingNavigationControls: React.FC<
  SeatingNavigationControlsProps
> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleMinimap,
  currentZoom = 1,
  minZoom = 0.3,
  maxZoom = 3.0,
  showMinimap = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<string>('');

  // Calculate zoom percentage for display
  const zoomPercentage = Math.round(currentZoom * 100);

  // Check if zoom buttons should be disabled
  const canZoomIn = currentZoom < maxZoom;
  const canZoomOut = currentZoom > minZoom;

  const handleZoomIn = () => {
    if (canZoomIn) {
      onZoomIn();
      setLastInteraction('zoom_in');

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  };

  const handleZoomOut = () => {
    if (canZoomOut) {
      onZoomOut();
      setLastInteraction('zoom_out');

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  };

  const handleResetView = () => {
    onResetView();
    setLastInteraction('reset');

    // Stronger haptic feedback for reset
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  const handleToggleMinimap = () => {
    onToggleMinimap?.();
    setLastInteraction('minimap');
  };

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
    setLastInteraction('expand');
  };

  return (
    <div className={`fixed bottom-4 right-4 z-30 ${className}`}>
      {/* Main control panel */}
      <div
        className={`
        flex flex-col space-y-2 transition-all duration-200 ease-in-out
        ${isExpanded ? 'opacity-100' : 'opacity-90'}
      `}
      >
        {/* Expanded controls */}
        {isExpanded && (
          <div className="flex flex-col space-y-2 mb-2">
            {/* Zoom level indicator */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-center">
              <div className="text-xs text-gray-600 mb-1">Zoom</div>
              <Badge
                variant="outline"
                className={`text-sm font-medium ${
                  zoomPercentage === 100
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : zoomPercentage > 100
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
              >
                {zoomPercentage}%
              </Badge>
            </div>

            {/* Minimap toggle */}
            {onToggleMinimap && (
              <Button
                variant={showMinimap ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleMinimap}
                className={`
                  w-12 h-12 p-0 bg-white shadow-lg border border-gray-200 touch-manipulation
                  ${showMinimap ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'hover:bg-gray-50'}
                `}
                aria-label={showMinimap ? 'Hide minimap' : 'Show minimap'}
              >
                <Map className="w-5 h-5" />
              </Button>
            )}

            {/* Settings/More options */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLastInteraction('settings')}
              className="w-12 h-12 p-0 bg-white shadow-lg border border-gray-200 hover:bg-gray-50 touch-manipulation"
              aria-label="More options"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Core navigation controls */}
        <div className="flex flex-col space-y-2">
          {/* Zoom In */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            className={`
              w-12 h-12 p-0 bg-white shadow-lg border border-gray-200 touch-manipulation
              transition-all duration-150
              ${canZoomIn ? 'hover:bg-gray-50 active:scale-95' : 'opacity-50 cursor-not-allowed'}
              ${lastInteraction === 'zoom_in' ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
            `}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </Button>

          {/* Zoom Out */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            className={`
              w-12 h-12 p-0 bg-white shadow-lg border border-gray-200 touch-manipulation
              transition-all duration-150
              ${canZoomOut ? 'hover:bg-gray-50 active:scale-95' : 'opacity-50 cursor-not-allowed'}
              ${lastInteraction === 'zoom_out' ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
            `}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </Button>

          {/* Reset View */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className={`
              w-12 h-12 p-0 bg-white shadow-lg border border-gray-200 hover:bg-gray-50 
              touch-manipulation transition-all duration-150 active:scale-95
              ${lastInteraction === 'reset' ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
            `}
            aria-label="Reset view"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>

          {/* Expand/Collapse Toggle */}
          <Button
            variant={isExpanded ? 'default' : 'outline'}
            size="sm"
            onClick={handleExpandToggle}
            className={`
              w-12 h-12 p-0 shadow-lg border border-gray-200 touch-manipulation
              transition-all duration-150 active:scale-95
              ${
                isExpanded
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50'
              }
            `}
            aria-label={isExpanded ? 'Hide controls' : 'Show more controls'}
          >
            <Maximize
              className={`w-5 h-5 transition-transform duration-200 ${
                isExpanded ? 'rotate-45' : 'rotate-0'
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Touch target enhancement - invisible expanded area for better thumb reach */}
      <div
        className="absolute inset-0 -m-2 pointer-events-none"
        aria-hidden="true"
      />

      {/* Accessibility announcements */}
      <div className="sr-only" aria-live="polite">
        {lastInteraction === 'zoom_in' && `Zoomed in to ${zoomPercentage}%`}
        {lastInteraction === 'zoom_out' && `Zoomed out to ${zoomPercentage}%`}
        {lastInteraction === 'reset' && 'View reset to default'}
        {lastInteraction === 'minimap' &&
          `Minimap ${showMinimap ? 'shown' : 'hidden'}`}
      </div>
    </div>
  );
};
