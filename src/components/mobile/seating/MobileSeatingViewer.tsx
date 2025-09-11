'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TouchTableCard } from './TouchTableCard';
import { SeatingNavigationControls } from './SeatingNavigationControls';
import { ConflictMobileBanner } from './ConflictMobileBanner';
import { GuestAssignmentModal } from './GuestAssignmentModal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Alert } from '@/components/ui/alert';
import { WifiOff, RefreshCw } from 'lucide-react';
import type {
  MobileSeatingViewerProps,
  SeatingTable,
  Guest,
  ConflictFlag,
  TouchGesture,
  GestureHandlers,
  ViewportBounds,
  MobileViewportSettings,
} from '@/types/mobile-seating';

/**
 * MobileSeatingViewer - WS-154 Core Mobile Component
 *
 * Touch-optimized seating interface with:
 * - Pinch-to-zoom functionality
 * - Pan gesture support
 * - Double-tap to focus
 * - Touch-friendly table selection
 * - Offline support with sync
 */
export const MobileSeatingViewer: React.FC<MobileSeatingViewerProps> = ({
  arrangement,
  onTableSelect,
  onGuestAssign,
  isOffline = false,
  className = '',
}) => {
  // Viewport and zoom state
  const [viewport, setViewport] = useState<ViewportBounds>({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight - 200, // Account for dashboard
  });

  const [scale, setScale] = useState(1);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Touch interaction state
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Viewport settings
  const viewportSettings: MobileViewportSettings = {
    minZoom: 0.3,
    maxZoom: 3.0,
    initialZoom: 1,
    centerPoint: { x: 0, y: 0 },
  };

  // Mock data - replace with real API calls
  const mockTables: SeatingTable[] = [
    {
      id: 'table-1',
      name: 'Head Table',
      shape: 'rectangle',
      capacity: 8,
      position: { x: 300, y: 100 },
      rotation: 0,
      guests: [],
    },
    {
      id: 'table-2',
      name: 'Family Table',
      shape: 'round',
      capacity: 10,
      position: { x: 100, y: 250 },
      rotation: 0,
      guests: [],
    },
    {
      id: 'table-3',
      name: 'Friends Table',
      shape: 'round',
      capacity: 8,
      position: { x: 500, y: 250 },
      rotation: 0,
      guests: [],
    },
  ];

  const mockGuests: Guest[] = [
    {
      id: 'guest-1',
      firstName: 'John',
      lastName: 'Smith',
      category: 'family',
      rsvpStatus: 'attending',
      dietaryRestrictions: [],
    },
    {
      id: 'guest-2',
      firstName: 'Sarah',
      lastName: 'Johnson',
      category: 'friends',
      rsvpStatus: 'attending',
      dietaryRestrictions: [],
    },
  ];

  // Load data on mount
  useEffect(() => {
    loadSeatingData();
  }, []);

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => {
      setViewport((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight - 200,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadSeatingData = async () => {
    try {
      setIsLoading(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation, fetch from API
      // const response = await fetch(`/api/seating/${arrangement?.id}`);
      // const data = await response.json();

      setConflicts([
        {
          type: 'dietary',
          severity: 'medium',
          message: 'Table 2 has guests with conflicting dietary needs',
        },
      ]);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load seating data:', error);
      setIsLoading(false);
    }
  };

  // Touch event handlers
  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2),
    );
  };

  const getTouchCenter = (touches: TouchList): { x: number; y: number } => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }

    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 2) {
        // Pinch gesture start
        const distance = getTouchDistance(touches);
        setTouchStartDistance(distance);
        setTouchStartScale(scale);
        setIsPanning(false);
      } else if (touches.length === 1) {
        // Pan gesture start or tap
        const touch = touches[0];
        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
        setIsPanning(false);

        // Double-tap detection
        const now = Date.now();
        if (now - lastTouchTime < 300) {
          handleDoubleTap(touch.clientX, touch.clientY);
        }
        setLastTouchTime(now);
      }
    },
    [scale, lastTouchTime],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault(); // Prevent scrolling

      const touches = e.touches;

      if (touches.length === 2) {
        // Pinch zoom
        const distance = getTouchDistance(touches);
        const scaleChange = distance / touchStartDistance;
        const newScale = Math.min(
          Math.max(touchStartScale * scaleChange, viewportSettings.minZoom),
          viewportSettings.maxZoom,
        );
        setScale(newScale);
      } else if (touches.length === 1 && isPanning) {
        // Pan gesture
        const touch = touches[0];
        const deltaX = touch.clientX - lastPanPoint.x;
        const deltaY = touch.clientY - lastPanPoint.y;

        setViewport((prev) => ({
          ...prev,
          x: prev.x - deltaX / scale,
          y: prev.y - deltaY / scale,
        }));

        setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      } else if (touches.length === 1) {
        // Check if we should start panning
        const touch = touches[0];
        const deltaX = Math.abs(touch.clientX - lastPanPoint.x);
        const deltaY = Math.abs(touch.clientY - lastPanPoint.y);

        if (deltaX > 10 || deltaY > 10) {
          setIsPanning(true);
        }
      }
    },
    [
      touchStartDistance,
      touchStartScale,
      isPanning,
      lastPanPoint,
      scale,
      viewportSettings,
    ],
  );

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setTouchStartDistance(0);
  }, []);

  const handleDoubleTap = (x: number, y: number) => {
    if (scale > 1) {
      // Zoom out to fit
      setScale(1);
      setViewport((prev) => ({ ...prev, x: 0, y: 0 }));
    } else {
      // Zoom in on tap location
      const newScale = 2;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = (x - rect.left - rect.width / 2) / scale;
        const centerY = (y - rect.top - rect.height / 2) / scale;

        setScale(newScale);
        setViewport((prev) => ({
          ...prev,
          x: prev.x - centerX * (newScale - 1),
          y: prev.y - centerY * (newScale - 1),
        }));
      }
    }
  };

  // Navigation controls handlers
  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.2, viewportSettings.maxZoom);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.2, viewportSettings.minZoom);
    setScale(newScale);
  };

  const handleResetView = () => {
    setScale(1);
    setViewport((prev) => ({ ...prev, x: 0, y: 0 }));
  };

  // Table interaction handlers
  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    onTableSelect?.(tableId);
  };

  const handleGuestAssignRequest = (tableId: string) => {
    setSelectedTableId(tableId);
    setIsGuestModalOpen(true);
  };

  const handleGuestAssignment = (guestIds: string[], tableId: string) => {
    // In real implementation, make API call
    guestIds.forEach((guestId) => {
      onGuestAssign?.(guestId, tableId);
    });

    setIsGuestModalOpen(false);
    setSelectedTableId(null);
  };

  const handleConflictDismiss = (conflictId: string) => {
    setConflicts((prev) =>
      prev.filter((_, index) => index.toString() !== conflictId),
    );
  };

  // Gesture handlers for table cards
  const tableGestureHandlers: GestureHandlers = {
    onTap: handleTableSelect,
    onLongPress: handleGuestAssignRequest,
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative h-full ${className}`}>
        <LoadingSkeleton variant="seating" />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full overflow-hidden bg-gray-100 ${className}`}
      ref={containerRef}
    >
      {/* Offline indicator */}
      {isOffline && (
        <div className="absolute top-2 left-2 right-2 z-50">
          <Alert className="flex items-center space-x-2 bg-yellow-50 border-yellow-200">
            <WifiOff className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Working offline - changes will sync when connected
            </span>
            <RefreshCw className="w-4 h-4 text-yellow-600 ml-auto" />
          </Alert>
        </div>
      )}

      {/* Conflict notifications */}
      {conflicts.length > 0 && (
        <div className="absolute top-16 left-2 right-2 z-40">
          <ConflictMobileBanner
            conflicts={conflicts}
            onDismiss={handleConflictDismiss}
          />
        </div>
      )}

      {/* Touch-enabled seating area */}
      <div
        className="w-full h-full cursor-move"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <div
          ref={contentRef}
          className="relative origin-top-left transition-transform"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${scale})`,
            width: 800,
            height: 600,
          }}
        >
          {/* Venue background */}
          <div className="absolute inset-0 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
            <div className="absolute top-4 left-4 text-sm text-gray-500">
              Wedding Reception Hall
            </div>
          </div>

          {/* Render tables */}
          {mockTables.map((table) => (
            <div
              key={table.id}
              style={{
                position: 'absolute',
                left: table.position.x,
                top: table.position.y,
                transform: `rotate(${table.rotation}deg)`,
              }}
            >
              <TouchTableCard
                table={table}
                isSelected={selectedTableId === table.id}
                onSelect={handleTableSelect}
                onGuestAssign={handleGuestAssignRequest}
                gestureHandlers={tableGestureHandlers}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="absolute bottom-4 right-4 z-30">
        <SeatingNavigationControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          currentZoom={scale}
          minZoom={viewportSettings.minZoom}
          maxZoom={viewportSettings.maxZoom}
        />
      </div>

      {/* Guest assignment modal */}
      <GuestAssignmentModal
        isOpen={isGuestModalOpen}
        onClose={() => {
          setIsGuestModalOpen(false);
          setSelectedTableId(null);
        }}
        selectedTable={mockTables.find((t) => t.id === selectedTableId)}
        availableGuests={mockGuests}
        onAssignGuests={handleGuestAssignment}
      />
    </div>
  );
};
