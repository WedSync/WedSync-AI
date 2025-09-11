'use client';

/**
 * WS-202: Supabase Realtime Integration - Mobile Responsive Optimizations
 * Responsive design enhancements for wedding industry realtime components
 * Target breakpoints: 375px (iPhone SE), 768px (iPad), 1920px (Desktop)
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RealtimeIndicator } from '@/components/ui/RealtimeIndicator';
import { RealtimeToastContainer } from '@/components/realtime/RealtimeToast';
import { RealtimeStatusPanel } from '@/components/realtime/RealtimeStatusPanel';
import { useRealtime } from '@/components/providers/RealtimeProvider';

// Mobile breakpoint detection hook
export function useResponsiveBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(
    'mobile',
  );

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) setBreakpoint('mobile');
      else if (width < 1920) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

// Mobile-optimized realtime indicator wrapper
interface MobileRealtimeIndicatorProps {
  weddingId?: string;
  position?: 'header' | 'floating' | 'inline';
  className?: string;
}

export function MobileRealtimeIndicator({
  weddingId,
  position = 'header',
  className,
}: MobileRealtimeIndicatorProps) {
  const realtime = useRealtime();
  const breakpoint = useResponsiveBreakpoint();
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-minimize on mobile when disconnected for >30s
  useEffect(() => {
    if (breakpoint !== 'mobile' || realtime.isConnected) return;

    const timer = setTimeout(() => {
      setIsMinimized(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [breakpoint, realtime.isConnected]);

  const getPositionClasses = () => {
    switch (position) {
      case 'floating':
        return cn(
          'fixed z-50',
          breakpoint === 'mobile'
            ? 'bottom-20 right-2 w-12 h-12' // Above mobile nav
            : 'bottom-4 right-4',
        );
      case 'inline':
        return 'relative';
      case 'header':
      default:
        return 'flex items-center';
    }
  };

  const getIndicatorProps = () => {
    const baseProps = {
      connected: realtime.isConnected,
      lastUpdate: realtime.lastUpdate,
      messageCount: realtime.messageCount,
      connectionQuality: realtime.connectionQuality,
      onRetry: realtime.retry,
      weddingDayMode: new Date().getDay() === 6,
    };

    switch (breakpoint) {
      case 'mobile':
        return {
          ...baseProps,
          size: position === 'floating' ? 'lg' : 'sm',
          compact: position !== 'inline',
          showTooltip: position === 'floating',
          showDetails: position === 'inline',
        };
      case 'tablet':
        return {
          ...baseProps,
          size: 'md',
          compact: false,
          showTooltip: true,
          showDetails: position === 'inline',
        };
      case 'desktop':
        return {
          ...baseProps,
          size: 'lg',
          compact: false,
          showTooltip: true,
          showDetails: true,
        };
    }
  };

  return (
    <div className={cn(getPositionClasses(), className)}>
      <RealtimeIndicator {...getIndicatorProps()} />
    </div>
  );
}

// Mobile-optimized toast container
interface MobileRealtimeToastsProps {
  weddingId?: string;
  className?: string;
}

export function MobileRealtimeToasts({
  weddingId,
  className,
}: MobileRealtimeToastsProps) {
  const breakpoint = useResponsiveBreakpoint();
  const [toasts, setToasts] = useState<any[]>([]);

  const getPosition = () => {
    switch (breakpoint) {
      case 'mobile':
        return 'top-center'; // Full width on mobile
      case 'tablet':
        return 'top-right';
      case 'desktop':
        return 'top-right';
    }
  };

  const getMaxToasts = () => {
    switch (breakpoint) {
      case 'mobile':
        return 3; // Fewer toasts on mobile
      case 'tablet':
        return 4;
      case 'desktop':
        return 5;
    }
  };

  return (
    <div className={className}>
      <RealtimeToastContainer
        toasts={toasts.slice(0, getMaxToasts())}
        position={getPosition()}
      />
    </div>
  );
}

// Mobile-optimized status panel
interface MobileRealtimeStatusPanelProps {
  weddingId: string;
  className?: string;
  onToggleExpand?: (expanded: boolean) => void;
}

export function MobileRealtimeStatusPanel({
  weddingId,
  className,
  onToggleExpand,
}: MobileRealtimeStatusPanelProps) {
  const breakpoint = useResponsiveBreakpoint();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(
    (expanded: boolean) => {
      setIsExpanded(expanded);
      onToggleExpand?.(expanded);
    },
    [onToggleExpand],
  );

  // Mobile: Show as modal overlay when expanded
  if (breakpoint === 'mobile' && isExpanded) {
    return (
      <>
        {/* Mobile overlay */}
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => handleToggleExpand(false)}
        />

        {/* Mobile status panel */}
        <div className="fixed inset-x-2 top-20 bottom-24 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
          <RealtimeStatusPanel
            weddingId={weddingId}
            className="h-full"
            maxActivities={20} // Fewer activities on mobile
            refreshInterval={3000} // Faster refresh on mobile
          />
        </div>
      </>
    );
  }

  // Tablet and desktop: Regular panel
  const getPanelProps = () => {
    switch (breakpoint) {
      case 'mobile':
        return {
          maxActivities: 10,
          maxToasts: 2,
          refreshInterval: 2000,
          className: 'w-full',
        };
      case 'tablet':
        return {
          maxActivities: 25,
          maxToasts: 4,
          refreshInterval: 4000,
          className: 'max-w-2xl mx-auto',
        };
      case 'desktop':
        return {
          maxActivities: 50,
          maxToasts: 5,
          refreshInterval: 5000,
          className: 'max-w-4xl mx-auto',
        };
    }
  };

  return (
    <div className={className}>
      <RealtimeStatusPanel weddingId={weddingId} {...getPanelProps()} />
    </div>
  );
}

// Touch-optimized realtime controls for mobile
export function MobileRealtimeControls({
  weddingId,
  className,
}: {
  weddingId: string;
  className?: string;
}) {
  const realtime = useRealtime();
  const breakpoint = useResponsiveBreakpoint();
  const [showControls, setShowControls] = useState(false);

  // Only show on mobile when connection issues
  if (breakpoint !== 'mobile' || realtime.isConnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-24 left-2 right-2 bg-red-50 border border-red-200 rounded-lg p-4 z-40',
        'shadow-lg backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-900">Connection Lost</h3>
          <p className="text-xs text-red-700 mt-1">
            Tap to reconnect to wedding updates
          </p>
        </div>

        <button
          onClick={() => realtime.retry?.()}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg active:bg-red-700 transition-colors min-h-[44px]"
        >
          Reconnect
        </button>
      </div>
    </div>
  );
}

// Wedding day mobile emergency banner
export function WeddingDayMobileBanner({
  weddingId,
  className,
}: {
  weddingId: string;
  className?: string;
}) {
  const realtime = useRealtime();
  const breakpoint = useResponsiveBreakpoint();
  const isWeddingDay = new Date().getDay() === 6;

  // Only show on mobile during wedding day with connection issues
  if (breakpoint !== 'mobile' || !isWeddingDay || realtime.isConnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-16 left-2 right-2 bg-red-600 text-white rounded-lg p-4 z-50',
        'shadow-lg animate-pulse',
        className,
      )}
    >
      <div className="text-center">
        <h2 className="text-sm font-bold mb-1">WEDDING DAY ALERT</h2>
        <p className="text-xs mb-3">
          Connection lost on your wedding day. This is critical!
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => realtime.retry?.()}
            className="flex-1 bg-white text-red-600 text-sm font-medium py-2 px-4 rounded min-h-[44px]"
          >
            Reconnect Now
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-red-800 text-white text-sm font-medium py-2 px-4 rounded min-h-[44px]"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Responsive wrapper for all realtime components
export function ResponsiveRealtimeWrapper({
  children,
  weddingId,
  className,
}: {
  children: React.ReactNode;
  weddingId?: string;
  className?: string;
}) {
  const breakpoint = useResponsiveBreakpoint();

  return (
    <div
      className={cn(
        'realtime-wrapper',
        // Mobile-first responsive classes
        breakpoint === 'mobile' && 'space-y-2 px-2',
        breakpoint === 'tablet' && 'space-y-4 px-4',
        breakpoint === 'desktop' && 'space-y-6 px-6',
        className,
      )}
    >
      {children}

      {/* Mobile-specific components */}
      {breakpoint === 'mobile' && weddingId && (
        <>
          <MobileRealtimeControls weddingId={weddingId} />
          <WeddingDayMobileBanner weddingId={weddingId} />
        </>
      )}
    </div>
  );
}

// CSS-in-JS responsive styles for realtime components
export const realtimeResponsiveStyles = `
  /* Mobile-first realtime styles */
  @media (max-width: 374px) {
    .realtime-toast {
      font-size: 0.75rem;
      padding: 0.5rem;
      min-width: calc(100vw - 1rem);
    }
    
    .realtime-indicator {
      transform: scale(0.9);
    }
    
    .realtime-status-panel .tabs-trigger {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
    }
  }
  
  /* iPhone SE and similar */
  @media (min-width: 375px) and (max-width: 667px) {
    .realtime-toast {
      max-width: calc(100vw - 1rem);
      font-size: 0.875rem;
    }
    
    .realtime-status-panel {
      padding: 1rem;
    }
    
    .realtime-activity-item {
      padding: 0.75rem;
    }
  }
  
  /* iPad portrait and similar tablets */
  @media (min-width: 768px) and (max-width: 1023px) {
    .realtime-status-panel {
      max-width: 90vw;
    }
    
    .realtime-toast {
      max-width: 400px;
    }
    
    .realtime-metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  
  /* Large desktop */
  @media (min-width: 1920px) {
    .realtime-status-panel {
      max-width: 1400px;
    }
    
    .realtime-toast {
      max-width: 450px;
    }
    
    .realtime-metrics-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
    }
    
    .realtime-activity-feed {
      columns: 2;
      column-gap: 2rem;
    }
  }
  
  /* Touch-friendly sizing for all interactive elements */
  @media (hover: none) and (pointer: coarse) {
    .realtime-button {
      min-height: 44px;
      min-width: 44px;
      padding: 0.75rem 1rem;
    }
    
    .realtime-indicator button {
      min-height: 44px;
      min-width: 44px;
    }
    
    .realtime-toast .dismiss-button {
      min-height: 44px;
      min-width: 44px;
    }
  }
  
  /* High contrast for accessibility */
  @media (prefers-contrast: high) {
    .realtime-indicator {
      border-width: 2px;
    }
    
    .realtime-toast {
      border-width: 2px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
  }
  
  /* Reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .realtime-toast {
      transition: none;
      animation: none;
    }
    
    .realtime-indicator .pulse {
      animation: none;
    }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .realtime-wrapper {
      --realtime-bg: theme(colors.gray.900);
      --realtime-text: theme(colors.gray.100);
      --realtime-border: theme(colors.gray.700);
    }
  }
`;

export default ResponsiveRealtimeWrapper;
