'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Filter,
  ArrowUpDown,
  Search,
  MoreVertical,
  Star,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import {
  MobileAnalyticsDashboardProps,
  VendorMetrics,
  TouchGesture,
  MobileNavigationState,
  AnalyticsFilters,
  MobilePerformanceMetrics,
} from '@/types/mobile-analytics';

/**
 * MobileAnalyticsDashboard - Touch-optimized vendor performance analytics
 *
 * Features:
 * - Pull-to-refresh functionality
 * - Touch-friendly vendor cards
 * - Quick action buttons with haptic feedback
 * - Offline mode support
 * - Progressive loading
 * - Responsive layout for all mobile sizes
 */
export default function MobileAnalyticsDashboard({
  vendors = [],
  selectedVendor,
  onVendorSelect,
  onRefresh,
  loading = false,
  offline = false,
  className,
}: MobileAnalyticsDashboardProps) {
  // State management
  const [navigationState, setNavigationState] = useState<MobileNavigationState>(
    {
      currentView: 'dashboard',
      selectedVendor,
      filters: {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date(),
          preset: 'month',
        },
      },
      sortBy: {
        field: 'revenue',
        direction: 'desc',
        label: 'Revenue (High to Low)',
      },
      viewMode: 'cards',
    },
  );

  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<MobilePerformanceMetrics>({
      renderTime: 0,
      chartLoadTime: 0,
      gestureResponseTime: 0,
      memoryUsage: 0,
      batteryImpact: 'low',
      networkUsage: 0,
      cacheEfficiency: 0.95,
    });

  // Refs for touch handling
  const dashboardRef = useRef<HTMLDivElement>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useRef(0);
  const isPulling = useRef(false);

  // Performance monitoring
  const renderStartTime = useRef(Date.now());

  // Filter and sort vendors
  const filteredVendors = vendors
    .filter((vendor) => {
      if (
        searchTerm &&
        !vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (
        navigationState.filters.category &&
        vendor.category !== navigationState.filters.category
      ) {
        return false;
      }
      if (
        navigationState.filters.minRating &&
        vendor.clientRating < navigationState.filters.minRating
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const { field, direction } = navigationState.sortBy;
      const multiplier = direction === 'asc' ? 1 : -1;

      if (typeof a[field] === 'number' && typeof b[field] === 'number') {
        return ((a[field] as number) - (b[field] as number)) * multiplier;
      }

      return String(a[field]).localeCompare(String(b[field])) * multiplier;
    });

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (dashboardRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    pullDistance.current = Math.max(0, currentY - startY.current);

    if (pullDistance.current > 0) {
      e.preventDefault();

      // Provide visual feedback
      if (pullToRefreshRef.current) {
        const opacity = Math.min(pullDistance.current / 100, 1);
        const scale = Math.min(0.8 + pullDistance.current / 500, 1);

        pullToRefreshRef.current.style.opacity = String(opacity);
        pullToRefreshRef.current.style.transform = `translateY(${pullDistance.current}px) scale(${scale})`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;

    isPulling.current = false;

    // Trigger refresh if pulled far enough
    if (pullDistance.current > 100) {
      setRefreshing(true);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    // Reset pull-to-refresh state
    if (pullToRefreshRef.current) {
      pullToRefreshRef.current.style.opacity = '0';
      pullToRefreshRef.current.style.transform = 'translateY(-50px) scale(0.8)';
    }

    pullDistance.current = 0;
  }, [onRefresh]);

  // Handle vendor selection with touch feedback
  const handleVendorSelect = useCallback(
    (vendorId: string) => {
      // Haptic feedback for selection
      if ('vibrate' in navigator) {
        navigator.vibrate(25);
      }

      onVendorSelect(vendorId);
      setNavigationState((prev) => ({
        ...prev,
        selectedVendor: vendorId,
        currentView: 'detail',
      }));
    },
    [onVendorSelect],
  );

  // Format currency for mobile display
  const formatCurrency = useCallback((amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(1)}K`;
    }
    return `£${amount}`;
  }, []);

  // Format rating with stars
  const renderRating = useCallback((rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              'w-3 h-3',
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300',
            )}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  }, []);

  // Calculate summary stats
  const summaryStats = {
    totalRevenue: filteredVendors.reduce((sum, v) => sum + v.revenue, 0),
    avgRating:
      filteredVendors.reduce((sum, v) => sum + v.clientRating, 0) /
        filteredVendors.length || 0,
    totalBookings: filteredVendors.reduce((sum, v) => sum + v.totalBookings, 0),
    avgResponseTime:
      filteredVendors.reduce((sum, v) => sum + v.responseTime, 0) /
        filteredVendors.length || 0,
  };

  // Performance tracking
  useEffect(() => {
    const renderTime = Date.now() - renderStartTime.current;
    setPerformanceMetrics((prev) => ({ ...prev, renderTime }));
  }, [filteredVendors]);

  return (
    <div
      ref={dashboardRef}
      className={cn(
        'mobile-analytics-dashboard relative w-full min-h-screen bg-background overflow-auto',
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="mobile-analytics-dashboard"
    >
      {/* Pull-to-refresh indicator */}
      <div
        ref={pullToRefreshRef}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-12 z-50 opacity-0 transition-all"
      >
        <div className="bg-background border rounded-full p-3 shadow-lg">
          <RefreshCw className={cn('w-6 h-6', refreshing && 'animate-spin')} />
        </div>
      </div>

      {/* Header with network status and controls */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Analytics</h1>
            {offline ? (
              <Badge
                variant="secondary"
                className="flex items-center gap-1 text-xs"
              >
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="flex items-center gap-1 text-xs"
              >
                <Wifi className="w-3 h-3" />
                Online
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="min-h-[44px] min-w-[44px] p-2" // Touch-friendly size
            >
              <Filter className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRefresh()}
              disabled={loading || refreshing}
              className="min-h-[44px] min-w-[44px] p-2"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4',
                  (loading || refreshing) && 'animate-spin',
                )}
              />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Summary stats cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summaryStats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
                <p className="text-lg font-semibold">
                  {summaryStats.avgRating.toFixed(1)}
                </p>
              </div>
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
                <p className="text-lg font-semibold">
                  {summaryStats.totalBookings}
                </p>
              </div>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-lg font-semibold">
                  {summaryStats.avgResponseTime.toFixed(1)}h
                </p>
              </div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </Card>
        </div>
      </div>

      {/* Vendor list */}
      <div className="px-4 pb-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Vendors ({filteredVendors.length})
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const currentDirection = navigationState.sortBy.direction;
              setNavigationState((prev) => ({
                ...prev,
                sortBy: {
                  ...prev.sortBy,
                  direction: currentDirection === 'asc' ? 'desc' : 'asc',
                },
              }));
            }}
            className="flex items-center gap-1 text-xs"
          >
            <ArrowUpDown className="w-3 h-3" />
            Sort
          </Button>
        </div>

        <div className="space-y-3">
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className={cn(
                'cursor-pointer transition-all duration-200 active:scale-[0.98] touch-manipulation',
                selectedVendor === vendor.id && 'ring-2 ring-primary',
              )}
              onClick={() => handleVendorSelect(vendor.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">{vendor.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {vendor.category}
                    </Badge>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[32px] min-w-[32px] p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle vendor options
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-medium">
                      {formatCurrency(vendor.revenue)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Bookings</p>
                    <p className="text-sm font-medium">
                      {vendor.totalBookings}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Response Time
                    </p>
                    <p className="text-sm font-medium">
                      {vendor.responseTime.toFixed(1)}h
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Completion</p>
                    <p className="text-sm font-medium">
                      {vendor.completionRate}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {renderRating(vendor.clientRating)}

                  <div className="flex items-center gap-1">
                    {vendor.revenue > 10000 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {vendor.revenue > 10000
                        ? 'High performer'
                        : 'Room for growth'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No vendors found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Performance overlay for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded z-50">
          <div>Render: {performanceMetrics.renderTime}ms</div>
          <div>Memory: {performanceMetrics.memoryUsage}MB</div>
          <div>
            Cache: {(performanceMetrics.cacheEfficiency * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}
