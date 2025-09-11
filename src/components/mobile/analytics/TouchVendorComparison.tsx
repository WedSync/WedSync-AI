'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Users,
  Award,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  MoreHorizontal,
} from 'lucide-react';
import {
  TouchVendorComparisonProps,
  VendorMetrics,
  ComparisonMetric,
  TouchGesture,
} from '@/types/mobile-analytics';

/**
 * TouchVendorComparison - Mobile vendor comparison with swipe navigation
 *
 * Features:
 * - Swipe left/right to navigate between vendors
 * - Touch-optimized comparison metrics
 * - Quick action buttons with haptic feedback
 * - Side-by-side comparison mode
 * - Performance indicators and trends
 * - Contact actions (call, email, message)
 */
export default function TouchVendorComparison({
  vendors = [],
  metrics = [],
  onVendorSwipe,
  onMetricTap,
  className,
}: TouchVendorComparisonProps) {
  // State management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<'single' | 'sideBySide'>(
    'single',
  );
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'revenue',
    'rating',
    'bookings',
  ]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for swipe handling
  const containerRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    isDragging: false,
    threshold: 50, // minimum distance for swipe
    maxVerticalThreshold: 100, // max vertical movement to still count as horizontal swipe
  });

  // Get current vendor(s)
  const currentVendor = vendors[currentIndex];
  const nextVendor = vendors[currentIndex + 1];
  const hasNext = currentIndex < vendors.length - 1;
  const hasPrev = currentIndex > 0;

  // Default comparison metrics if none provided
  const defaultMetrics: ComparisonMetric[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      type: 'currency',
      format: (value) => `£${value.toLocaleString()}`,
      mobileFormat: (value) =>
        value >= 1000 ? `£${(value / 1000).toFixed(1)}K` : `£${value}`,
    },
    {
      key: 'clientRating',
      label: 'Rating',
      type: 'rating',
      format: (value) => `${value.toFixed(1)} stars`,
      mobileFormat: (value) => `${value.toFixed(1)}★`,
    },
    {
      key: 'totalBookings',
      label: 'Bookings',
      type: 'number',
      format: (value) => `${value} bookings`,
      mobileFormat: (value) => `${value}`,
    },
    {
      key: 'responseTime',
      label: 'Response Time',
      type: 'time',
      format: (value) => `${value.toFixed(1)} hours`,
      mobileFormat: (value) => `${value.toFixed(1)}h`,
    },
    {
      key: 'completionRate',
      label: 'Completion Rate',
      type: 'percentage',
      format: (value) => `${value}%`,
      mobileFormat: (value) => `${value}%`,
    },
  ];

  const comparisonMetrics = metrics.length > 0 ? metrics : defaultMetrics;

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    swipeRef.current = {
      ...swipeRef.current,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current.isDragging) return;

    const touch = e.touches[0];
    swipeRef.current.currentX = touch.clientX;

    const deltaX = touch.clientX - swipeRef.current.startX;
    const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

    // If vertical movement is too much, cancel horizontal swipe
    if (deltaY > swipeRef.current.maxVerticalThreshold) {
      swipeRef.current.isDragging = false;
      return;
    }

    // Provide visual feedback during swipe
    if (containerRef.current && Math.abs(deltaX) > 10) {
      e.preventDefault(); // Prevent scrolling
      const opacity = Math.max(0.7, 1 - Math.abs(deltaX) / 200);
      containerRef.current.style.transform = `translateX(${deltaX * 0.5}px)`;
      containerRef.current.style.opacity = String(opacity);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!swipeRef.current.isDragging) return;

      const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
      const deltaY = Math.abs(
        e.changedTouches[0].clientY - swipeRef.current.startY,
      );

      // Reset visual state
      if (containerRef.current) {
        containerRef.current.style.transform = '';
        containerRef.current.style.opacity = '1';
      }

      // Check if swipe meets criteria
      if (
        Math.abs(deltaX) > swipeRef.current.threshold &&
        deltaY < swipeRef.current.maxVerticalThreshold
      ) {
        const direction = deltaX > 0 ? 'right' : 'left';

        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        // Handle swipe direction
        if (direction === 'left' && hasNext) {
          setCurrentIndex((prev) => prev + 1);
          onVendorSwipe?.(direction, currentVendor);
        } else if (direction === 'right' && hasPrev) {
          setCurrentIndex((prev) => prev - 1);
          onVendorSwipe?.(direction, currentVendor);
        }
      }

      swipeRef.current.isDragging = false;
    },
    [currentVendor, hasNext, hasPrev, onVendorSwipe],
  );

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (hasPrev && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex((prev) => prev - 1);

      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }

      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [hasPrev, isAnimating]);

  const goToNext = useCallback(() => {
    if (hasNext && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex((prev) => prev + 1);

      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }

      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [hasNext, isAnimating]);

  // Handle metric tap
  const handleMetricClick = useCallback(
    (metric: ComparisonMetric, vendor: VendorMetrics) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }
      onMetricTap?.(metric, vendor);
    },
    [onMetricTap],
  );

  // Format metric value
  const formatMetricValue = useCallback(
    (value: any, metric: ComparisonMetric, mobile = true) => {
      const formatter = mobile ? metric.mobileFormat : metric.format;

      if (typeof value === 'number') {
        return formatter(value);
      }

      return String(value);
    },
    [],
  );

  // Get metric comparison (better/worse/same)
  const getMetricComparison = useCallback(
    (value1: number, value2: number, type: ComparisonMetric['type']) => {
      if (value1 === value2) return 'same';

      // For time-based metrics, lower is better
      if (type === 'time') {
        return value1 < value2 ? 'better' : 'worse';
      }

      // For others, higher is better
      return value1 > value2 ? 'better' : 'worse';
    },
    [],
  );

  // Render vendor card
  const renderVendorCard = useCallback(
    (vendor: VendorMetrics, isComparison = false) => {
      return (
        <Card
          className={cn(
            'h-full transition-all duration-300',
            isComparison && 'border-primary/50',
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg leading-tight mb-2">
                  {vendor.name}
                </CardTitle>
                <Badge variant="outline" className="text-xs capitalize mb-2">
                  {vendor.category}
                </Badge>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < Math.floor(vendor.clientRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300',
                      )}
                    />
                  ))}
                  <span className="text-sm font-medium ml-1">
                    {vendor.clientRating.toFixed(1)}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="min-h-[32px] min-w-[32px] p-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              {comparisonMetrics.slice(0, 4).map((metric) => {
                const value = vendor[
                  metric.key as keyof VendorMetrics
                ] as number;
                const comparisonVendor = isComparison
                  ? currentVendor
                  : nextVendor;
                let comparison = 'same';

                if (comparisonVendor && comparisonVendor.id !== vendor.id) {
                  const compValue = comparisonVendor[
                    metric.key as keyof VendorMetrics
                  ] as number;
                  comparison = getMetricComparison(
                    value,
                    compValue,
                    metric.type,
                  );
                }

                return (
                  <div
                    key={metric.key}
                    className="p-3 rounded-lg bg-muted/50 cursor-pointer transition-colors active:bg-muted"
                    onClick={() => handleMetricClick(metric, vendor)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {metric.label}
                      </span>
                      {comparisonMode === 'sideBySide' &&
                        comparison !== 'same' && (
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              comparison === 'better'
                                ? 'bg-green-500'
                                : 'bg-red-500',
                            )}
                          />
                        )}
                    </div>
                    <div className="font-medium text-sm">
                      {formatMetricValue(value, metric, true)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 min-h-[40px]"
              >
                <Phone className="w-3 h-3" />
                <span className="text-xs">Call</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 min-h-[40px]"
              >
                <Mail className="w-3 h-3" />
                <span className="text-xs">Email</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 min-h-[40px]"
              >
                <MessageSquare className="w-3 h-3" />
                <span className="text-xs">Message</span>
              </Button>
            </div>

            {/* Performance trend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                {vendor.revenue > 10000 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs font-medium">
                  {vendor.revenue > 10000
                    ? 'Strong performer'
                    : 'Growth opportunity'}
                </span>
              </div>

              <Badge
                variant={vendor.completionRate > 80 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {vendor.completionRate}% completion
              </Badge>
            </div>
          </CardContent>
        </Card>
      );
    },
    [
      comparisonMetrics,
      currentVendor,
      nextVendor,
      comparisonMode,
      formatMetricValue,
      getMetricComparison,
      handleMetricClick,
    ],
  );

  if (!currentVendor) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium mb-1">No vendors to compare</h3>
        <p className="text-sm text-muted-foreground">
          Add vendors to see performance comparisons
        </p>
      </div>
    );
  }

  return (
    <div className={cn('touch-vendor-comparison w-full', className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Vendor Comparison</h2>
          <Badge variant="outline" className="text-xs">
            {currentIndex + 1} of {vendors.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setComparisonMode(
                comparisonMode === 'single' ? 'sideBySide' : 'single',
              )
            }
            className="text-xs"
          >
            {comparisonMode === 'single' ? 'Compare' : 'Single'}
          </Button>
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          disabled={!hasPrev || isAnimating}
          className="min-h-[40px] min-w-[40px] p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1">
            {vendors.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30',
                )}
              />
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          disabled={!hasNext || isAnimating}
          className="min-h-[40px] min-w-[40px] p-2"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Vendor comparison content */}
      <div
        ref={containerRef}
        className="relative touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {comparisonMode === 'single' ? (
          <div
            className={cn(
              'transition-all duration-300',
              isAnimating && 'opacity-50',
            )}
          >
            {renderVendorCard(currentVendor)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-center">Current</h3>
              {renderVendorCard(currentVendor)}
            </div>

            {nextVendor && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-center">
                  Compare with
                </h3>
                {renderVendorCard(nextVendor, true)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swipe hint */}
      <div className="text-center mt-4">
        <p className="text-xs text-muted-foreground">
          Swipe left/right to navigate • Tap metrics for details
        </p>
      </div>
    </div>
  );
}
