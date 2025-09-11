'use client';

/**
 * WS-254: Mobile-Responsive Dietary Interface
 * Optimized wrapper for dietary management on mobile devices
 * Features: Touch optimization, auto-save, offline support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  AlertTriangle,
  ChefHat,
  Plus,
  Menu,
  Home,
  Settings,
  Wifi,
  WifiOff,
  Save,
  Clock,
} from 'lucide-react';

// Mobile-optimized styles
const mobileStyles = {
  // Touch-friendly button sizes (minimum 48x48px)
  touchButton: 'min-h-[48px] min-w-[48px] text-base',

  // Mobile-first grid layouts
  responsiveGrid:
    'grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',

  // Mobile navigation (fixed bottom for thumb reach)
  mobileNav:
    'fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 safe-area-pb z-50 sm:static sm:border-0 sm:shadow-none sm:p-0 sm:bg-transparent',

  // Mobile-optimized forms (account for bottom nav)
  mobileForm: 'space-y-4 px-4 pb-24 sm:pb-4 sm:px-0',

  // Responsive text sizes
  responsiveHeading: 'text-xl sm:text-2xl lg:text-3xl',
  responsiveBody: 'text-sm sm:text-base',

  // Mobile card spacing
  mobileCard: 'mx-4 sm:mx-0 mb-4',

  // Touch-optimized inputs
  touchInput: 'min-h-[48px] text-base px-4',

  // Mobile-safe z-indexes
  mobileModal: 'z-50',
  mobileOverlay: 'z-40',
};

interface MobileDietaryInterfaceProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  weddingId?: string;
  autoSaveEnabled?: boolean;
  offlineMode?: boolean;
}

export function MobileDietaryInterface({
  children,
  activeTab = 'requirements',
  onTabChange,
  weddingId,
  autoSaveEnabled = true,
  offlineMode = false,
}: MobileDietaryInterfaceProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait',
  );

  // Detect mobile device and orientation
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768;
      setIsMobile(isMobileDevice);

      // Check orientation
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkMobile, 100); // Delay to get accurate dimensions after rotation
    });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save functionality for poor signal areas
  const autoSave = useCallback(async () => {
    if (!autoSaveEnabled || !pendingChanges || !isOnline) {
      return;
    }

    try {
      // Save any pending form data to localStorage as backup
      const formData = {
        weddingId,
        timestamp: new Date().toISOString(),
        activeTab,
        // Additional form state would be passed down from parent components
      };

      localStorage.setItem(
        `dietary_autosave_${weddingId}`,
        JSON.stringify(formData),
      );
      setLastSaved(new Date());
      setPendingChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [autoSaveEnabled, pendingChanges, isOnline, weddingId, activeTab]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveEnabled && isMobile) {
      const interval = setInterval(autoSave, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoSave, autoSaveEnabled, isMobile]);

  // Navigation tabs for mobile
  const navigationTabs = [
    { id: 'requirements', label: 'Requirements', icon: Activity },
    { id: 'menu', label: 'Menu', icon: ChefHat },
    { id: 'analysis', label: 'Analysis', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange?.(tabId);
    setPendingChanges(true); // Mark as having changes when switching tabs
  };

  // Mobile-specific UI patterns
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 relative">
        {/* Offline/Online indicator */}
        <div className="sticky top-0 z-30 bg-white border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span
                className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Auto-save indicator */}
            {autoSaveEnabled && (
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                {pendingChanges ? (
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Saving...
                  </div>
                ) : lastSaved ? (
                  <div className="flex items-center">
                    <Save className="h-3 w-3 mr-1" />
                    Saved {lastSaved.toLocaleTimeString()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Mobile-optimized content */}
        <div className="pb-20">
          {' '}
          {/* Space for bottom navigation */}
          <div className={mobileStyles.mobileForm}>{children}</div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className={mobileStyles.mobileNav}>
          <div className="grid grid-cols-4 gap-1">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={`${mobileStyles.touchButton} flex flex-col items-center p-2 h-auto`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Orientation change notification */}
        <AnimatePresence>
          {orientation === 'landscape' && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-16 left-4 right-4 z-40 bg-blue-100 border border-blue-200 rounded-lg p-3"
            >
              <div className="text-sm text-blue-800">
                <strong>Landscape Mode:</strong> Swipe left/right to navigate
                between sections
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop/tablet view - render normally
  return (
    <div className="min-w-0">
      {' '}
      {/* Prevent flex overflow issues */}
      {children}
    </div>
  );
}

// Mobile-optimized component wrappers
export function MobileDietaryCard({
  children,
  className = '',
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card className={`${mobileStyles.mobileCard} ${className}`} {...props}>
      {children}
    </Card>
  );
}

export function MobileTouchButton({
  children,
  className = '',
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={`${mobileStyles.touchButton} ${className}`} {...props}>
      {children}
    </Button>
  );
}

// Mobile-specific dietary requirement component
export function MobileDietaryRequirementCard({
  requirement,
  onEdit,
  onDelete,
}: {
  requirement: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);

  const severityColors = {
    1: 'bg-green-100 text-green-800',
    2: 'bg-blue-100 text-blue-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-orange-100 text-orange-800',
    5: 'bg-red-100 text-red-800',
  };

  return (
    <MobileDietaryCard>
      <CardContent className="p-4">
        <div
          className="space-y-3"
          onTouchStart={() => setShowActions(!showActions)} // Touch to reveal actions
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {requirement.guest_name}
            </h3>
            <Badge
              className={
                severityColors[
                  requirement.severity as keyof typeof severityColors
                ]
              }
            >
              Level {requirement.severity}
            </Badge>
          </div>

          <div>
            <Badge variant="outline" className="capitalize mb-2">
              {requirement.category}
            </Badge>
            <p className="text-sm text-gray-600">{requirement.notes}</p>
          </div>

          {requirement.emergency_contact && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Emergency: {requirement.emergency_contact}
            </div>
          )}

          {requirement.verified ? (
            <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600">
              ⚠ Unverified
            </Badge>
          )}

          {/* Touch-revealed actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2"
              >
                <MobileTouchButton
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(requirement.id)}
                >
                  Edit
                </MobileTouchButton>
                <MobileTouchButton
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 border-red-200"
                  onClick={() => onDelete(requirement.id)}
                >
                  Delete
                </MobileTouchButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </MobileDietaryCard>
  );
}

// Utility hook for mobile-specific behaviors
export function useMobileOptimization() {
  const [isMobile, setIsMobile] = useState(false);
  const [touchDevice, setTouchDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setTouchDevice('ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return {
    isMobile,
    touchDevice,
    // Mobile-optimized class names
    classes: {
      container: isMobile ? 'px-4 pb-20' : 'px-0 pb-0',
      grid: isMobile
        ? 'grid-cols-1 gap-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
      button: isMobile ? mobileStyles.touchButton : '',
      text: isMobile ? 'text-base' : 'text-sm',
      spacing: isMobile ? 'space-y-4' : 'space-y-6',
    },
  };
}
