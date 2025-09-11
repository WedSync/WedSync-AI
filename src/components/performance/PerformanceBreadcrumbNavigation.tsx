'use client';

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HomeIcon,
  ChevronRightIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

// Breadcrumb item interface
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
  performanceMetrics?: {
    renderTime?: number;
    critical?: boolean;
  };
}

// Navigation configuration based on original prompt requirements
const NAVIGATION_CONFIG = {
  dashboard: {
    label: 'Dashboard',
    icon: <HomeIcon className="w-4 h-4" />,
    href: '/dashboard',
  },
  helpers: {
    label: 'Helpers',
    icon: <UsersIcon className="w-4 h-4" />,
    href: '/helpers',
  },
  schedules: {
    label: 'Schedules',
    icon: <CalendarIcon className="w-4 h-4" />,
    href: '/helpers/schedules',
  },
  performance: {
    label: 'Performance',
    icon: <ChartBarIcon className="w-4 h-4" />,
    href: '/performance',
  },
  settings: {
    label: 'Settings',
    icon: <CogIcon className="w-4 h-4" />,
    href: '/settings',
  },
};

// Performance-optimized breadcrumb component
interface PerformanceBreadcrumbProps {
  items: BreadcrumbItem[];
  showPerformanceMetrics?: boolean;
  mobileOptimized?: boolean;
  className?: string;
  onNavigate?: (href: string) => void;
}

export const PerformanceBreadcrumb = memo<PerformanceBreadcrumbProps>(
  ({
    items,
    showPerformanceMetrics = false,
    mobileOptimized = true,
    className,
    onNavigate,
  }) => {
    const { recordMetric } = usePerformanceMonitor();
    const [isMobile, setIsMobile] = useState(false);
    const [renderTime, setRenderTime] = useState<number>(0);

    // Detect mobile viewport
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Measure render performance
    useEffect(() => {
      const startTime = performance.now();

      const measureRender = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        setRenderTime(duration);
        recordMetric('breadcrumb_render_time', duration);
      };

      requestAnimationFrame(measureRender);
    }, [items, recordMetric]);

    // Handle navigation with performance tracking
    const handleNavigate = useCallback(
      (href: string, event?: React.MouseEvent) => {
        const startTime = performance.now();

        recordMetric('breadcrumb_navigation_start', startTime);

        if (onNavigate) {
          event?.preventDefault();
          onNavigate(href);
        }

        // Track navigation performance
        setTimeout(() => {
          const endTime = performance.now();
          recordMetric('breadcrumb_navigation_complete', endTime - startTime);
        }, 0);
      },
      [onNavigate, recordMetric],
    );

    // Optimize breadcrumb items for mobile
    const optimizedItems = useMemo(() => {
      if (!mobileOptimized || !isMobile) return items;

      // On mobile, show only last 2 items + home
      if (items.length > 3) {
        const homeItem = items[0];
        const lastTwoItems = items.slice(-2);
        return [
          homeItem,
          { label: '...', href: undefined, icon: null },
          ...lastTwoItems,
        ];
      }

      return items;
    }, [items, isMobile, mobileOptimized]);

    // Render breadcrumb item
    const renderBreadcrumbItem = useCallback(
      (item: BreadcrumbItem, index: number, isLast: boolean) => {
        const content = (
          <div className="flex items-center gap-2">
            {item.icon}
            <span
              className={cn(
                'font-medium',
                isLast ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
                isMobile && 'text-sm',
              )}
            >
              {item.label}
            </span>

            {/* Performance metrics badge */}
            {showPerformanceMetrics && item.performanceMetrics && (
              <Badge
                variant={
                  item.performanceMetrics.critical ? 'destructive' : 'secondary'
                }
                className="text-xs ml-2"
              >
                {item.performanceMetrics.renderTime?.toFixed(1)}ms
              </Badge>
            )}
          </div>
        );

        if (item.href && !isLast) {
          return (
            <Link
              key={`${item.label}-${index}`}
              href={item.href}
              onClick={(e) => handleNavigate(item.href!, e)}
              className={cn(
                'transition-colors duration-150 hover:bg-gray-50 rounded px-2 py-1',
                isMobile && 'px-1 py-0.5',
              )}
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={`${item.label}-${index}`}
            className={cn(isMobile && 'px-1')}
          >
            {content}
          </div>
        );
      },
      [handleNavigate, showPerformanceMetrics, isMobile],
    );

    return (
      <nav
        className={cn(
          'flex items-center space-x-2 text-sm',
          isMobile && 'space-x-1',
          className,
        )}
        aria-label="Breadcrumb"
        style={{
          // Performance optimization
          contain: 'layout style paint',
          willChange: isMobile ? 'auto' : 'transform',
        }}
      >
        {/* Performance indicator */}
        {process.env.NODE_ENV === 'development' && showPerformanceMetrics && (
          <Badge
            variant="outline"
            className="text-xs mr-2"
            title={`Breadcrumb render time: ${renderTime.toFixed(2)}ms`}
          >
            {renderTime.toFixed(1)}ms
          </Badge>
        )}

        {optimizedItems.map((item, index) => {
          const isLast = index === optimizedItems.length - 1;

          return (
            <React.Fragment key={`fragment-${index}`}>
              {renderBreadcrumbItem(item, index, isLast)}

              {!isLast && (
                <ChevronRightIcon
                  className={cn(
                    'text-gray-400 flex-shrink-0',
                    isMobile ? 'w-3 h-3' : 'w-4 h-4',
                  )}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Mobile back button */}
        {isMobile && items.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-4 p-1"
            onClick={() => {
              const parentItem = items[items.length - 2];
              if (parentItem?.href) {
                handleNavigate(parentItem.href);
              }
            }}
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
        )}
      </nav>
    );
  },
);

// Hook for managing breadcrumb state with performance optimization
export function useBreadcrumbNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [navigationHistory, setNavigationHistory] = useState<BreadcrumbItem[]>(
    [],
  );

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = useCallback((path: string): BreadcrumbItem[] => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard (as per original prompt)
    breadcrumbs.push({
      label: NAVIGATION_CONFIG.dashboard.label,
      href: NAVIGATION_CONFIG.dashboard.href,
      icon: NAVIGATION_CONFIG.dashboard.icon,
    });

    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Map segments to navigation config
      let config = NAVIGATION_CONFIG[segment as keyof typeof NAVIGATION_CONFIG];

      if (!config) {
        // Dynamic segments (like helper names, schedule details)
        config = {
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          icon:
            index === 0 ? (
              <UsersIcon className="w-4 h-4" />
            ) : (
              <CalendarIcon className="w-4 h-4" />
            ),
          href: isLast ? undefined : currentPath,
        };
      }

      breadcrumbs.push({
        label: config.label,
        href: isLast ? undefined : config.href || currentPath,
        icon: config.icon,
        current: isLast,
      });
    });

    return breadcrumbs;
  }, []);

  // Current breadcrumbs based on pathname
  const currentBreadcrumbs = useMemo(() => {
    return generateBreadcrumbs(pathname);
  }, [pathname, generateBreadcrumbs]);

  // Navigate with breadcrumb context
  const navigateWithBreadcrumb = useCallback(
    (href: string) => {
      const newBreadcrumbs = generateBreadcrumbs(href);
      setNavigationHistory((prev) => [...prev.slice(-9), ...newBreadcrumbs]); // Keep last 10
      router.push(href);
    },
    [generateBreadcrumbs, router],
  );

  return {
    currentBreadcrumbs,
    navigationHistory,
    navigateWithBreadcrumb,
    generateBreadcrumbs,
  };
}

// Complete navigation integration component
interface NavigationIntegrationProps {
  className?: string;
  enablePerformanceMonitoring?: boolean;
  children?: React.ReactNode;
}

export const NavigationIntegration: React.FC<NavigationIntegrationProps> = memo(
  ({ className, enablePerformanceMonitoring = true, children }) => {
    const { currentBreadcrumbs, navigateWithBreadcrumb } =
      useBreadcrumbNavigation();
    const [viewport, setViewport] = useState<'mobile' | 'desktop'>('desktop');

    // Detect viewport changes
    useEffect(() => {
      const handleResize = () => {
        setViewport(window.innerWidth < 768 ? 'mobile' : 'desktop');
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <div className={cn('space-y-4', className)}>
        {/* Navigation Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <PerformanceBreadcrumb
              items={currentBreadcrumbs}
              showPerformanceMetrics={enablePerformanceMonitoring}
              mobileOptimized={true}
              onNavigate={navigateWithBreadcrumb}
            />

            {/* Viewport indicator */}
            <div className="flex items-center gap-2">
              {enablePerformanceMonitoring && (
                <Badge variant="outline" className="text-xs">
                  {viewport}
                </Badge>
              )}

              {viewport === 'mobile' ? (
                <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ComputerDesktopIcon className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {children}

        {/* Navigation Context for Wedding Workflows */}
        <div className="text-xs text-gray-500 px-4">
          <p>Navigation optimized for wedding management workflows</p>
          {enablePerformanceMonitoring && (
            <p>Performance monitoring: {viewport} viewport detected</p>
          )}
        </div>
      </div>
    );
  },
);

// Export all components
PerformanceBreadcrumb.displayName = 'PerformanceBreadcrumb';
NavigationIntegration.displayName = 'NavigationIntegration';
