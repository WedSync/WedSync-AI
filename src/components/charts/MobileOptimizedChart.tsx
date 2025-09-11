'use client';

import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from 'react';
import { ResponsiveContainer } from 'recharts';
import { useInView } from 'react-intersection-observer';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';

// Chart performance settings for mobile optimization
const MOBILE_PERFORMANCE_CONFIG = {
  // Reduce data points on smaller screens
  maxDataPoints: {
    mobile: 50,
    tablet: 100,
    desktop: 500,
  },
  // Animation durations optimized for different screen sizes
  animationDuration: {
    mobile: 300,
    tablet: 500,
    desktop: 1000,
  },
  // Chart heights for different viewports
  chartHeight: {
    mobile: 200,
    tablet: 300,
    desktop: 400,
  },
  // Touch target sizes
  touchTargets: {
    mobile: 44,
    tablet: 32,
    desktop: 24,
  },
};

interface MobileOptimizedChartProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  data: any[];
  loading?: boolean;
  error?: string;
  className?: string;
  actions?: React.ReactNode;
  chartType?: 'line' | 'bar' | 'area' | 'pie';
  onDataExport?: (data: any[]) => void;
  onRefresh?: () => void;
  lazy?: boolean;
  cacheKey?: string;
  performanceMode?: 'standard' | 'optimized' | 'maximum';
}

export const MobileOptimizedChart: React.FC<MobileOptimizedChartProps> = ({
  title,
  description,
  children,
  data,
  loading = false,
  error,
  className,
  actions,
  chartType = 'line',
  onDataExport,
  onRefresh,
  lazy = true,
  cacheKey,
  performanceMode = 'optimized',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lastInteraction, setLastInteraction] = useState<number>(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop',
  );

  // Lazy loading with intersection observer
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    skip: !lazy,
    triggerOnce: true,
  });

  // Device detection
  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      if (width < 768) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // Optimized data based on device and performance mode
  const optimizedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxPoints = MOBILE_PERFORMANCE_CONFIG.maxDataPoints[deviceType];

    if (performanceMode === 'maximum' && data.length > maxPoints) {
      // Intelligent data sampling for maximum performance
      const step = Math.ceil(data.length / maxPoints);
      return data.filter((_, index) => index % step === 0);
    }

    if (performanceMode === 'optimized' && data.length > maxPoints * 2) {
      // Reduce to 75% of max for smooth performance
      const step = Math.ceil(data.length / (maxPoints * 0.75));
      return data.filter((_, index) => index % step === 0);
    }

    return data;
  }, [data, deviceType, performanceMode]);

  // Chart height based on device and fullscreen state
  const chartHeight = useMemo(() => {
    if (isFullscreen) return window.innerHeight - 200;
    return MOBILE_PERFORMANCE_CONFIG.chartHeight[deviceType] * zoomLevel;
  }, [deviceType, isFullscreen, zoomLevel]);

  // Animation duration based on device
  const animationDuration = useMemo(() => {
    return MOBILE_PERFORMANCE_CONFIG.animationDuration[deviceType];
  }, [deviceType]);

  // Touch gesture handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (deviceType === 'mobile') {
        setLastInteraction(Date.now());
      }
    },
    [deviceType],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (deviceType === 'mobile') {
        const interactionDuration = Date.now() - lastInteraction;
        // Long press detection for context menu
        if (interactionDuration > 500) {
          e.preventDefault();
          // Could trigger context menu or additional actions
        }
      }
    },
    [deviceType, lastInteraction],
  );

  // Chart controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleExport = useCallback(() => {
    if (onDataExport) {
      onDataExport(optimizedData);
    }
  }, [onDataExport, optimizedData]);

  // Chart icon based on type
  const ChartIcon = useMemo(() => {
    switch (chartType) {
      case 'line':
        return LineChart;
      case 'bar':
        return BarChart3;
      case 'pie':
        return PieChart;
      default:
        return TrendingUp;
    }
  }, [chartType]);

  // Don't render if lazy loading and not in view
  if (lazy && !inView) {
    return (
      <div
        ref={inViewRef}
        className="h-64 flex items-center justify-center bg-gray-50 rounded-lg"
      >
        <div className="text-center space-y-2">
          <ChartIcon className="h-8 w-8 mx-auto text-gray-400" />
          <p className="text-sm text-gray-500">Chart will load when visible</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <ChartIcon className="h-5 w-5" />
            {title} - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="mt-3"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const chartContent = (
    <Card
      className={cn(
        'chart-container transition-all duration-300',
        isFullscreen && 'fixed inset-4 z-50 shadow-2xl',
        className,
      )}
      ref={chartContainerRef}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1 min-w-0 flex-1">
          <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ChartIcon className="h-5 w-5 text-purple-600" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 ml-4">
          {/* Mobile-optimized controls */}
          {deviceType === 'mobile' ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              {onDataExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFullscreen}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              {onDataExport && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExport}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          )}
          {actions}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ height: chartHeight }}
          >
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-purple-600" />
              <p className="text-sm text-gray-500">Loading chart data...</p>
            </div>
          </div>
        ) : optimizedData.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ height: chartHeight }}
          >
            <div className="text-center space-y-2">
              <ChartIcon className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-500">No data available</p>
            </div>
          </div>
        ) : (
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="select-none"
            style={{
              height: chartHeight,
              touchAction: deviceType === 'mobile' ? 'pan-y' : 'auto',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {React.cloneElement(children as React.ReactElement, {
                data: optimizedData,
                animationDuration,
                isAnimationActive: performanceMode !== 'maximum',
              })}
            </ResponsiveContainer>
          </div>
        )}

        {/* Performance indicators for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-400 space-x-4">
            <span>Device: {deviceType}</span>
            <span>Data Points: {optimizedData.length}</span>
            <span>Performance: {performanceMode}</span>
            {cacheKey && <span>Cache: {cacheKey}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return <div ref={lazy ? inViewRef : undefined}>{chartContent}</div>;
};

export default MobileOptimizedChart;
