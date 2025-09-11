'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  TrendingUp,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import {
  MobilePerformanceChartsProps,
  VendorMetrics,
  TouchGesture,
  MobileChartConfig,
} from '@/types/mobile-analytics';

/**
 * MobilePerformanceCharts - Responsive data visualization with touch gestures
 *
 * Features:
 * - Touch gestures: pinch-to-zoom, tap to select, swipe between charts
 * - Responsive charts that adapt to screen orientation
 * - Chart type switching optimized for mobile
 * - Data point interaction with haptic feedback
 * - Performance optimization for mobile rendering
 */
export default function MobilePerformanceCharts({
  data = [],
  chartType = 'line',
  metric,
  height = 300,
  touchEnabled = true,
  onDataPointClick,
  className,
}: MobilePerformanceChartsProps) {
  // State management
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);
  const [isGesturing, setIsGesturing] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait',
  );

  // Refs for touch handling
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef({
    isZooming: false,
    isPanning: false,
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 },
    startZoom: 1,
    startPan: { x: 0, y: 0 },
  });

  // Chart configuration
  const chartConfig: MobileChartConfig = useMemo(
    () => ({
      width: 0, // Will be calculated dynamically
      height,
      touchEnabled,
      zoomEnabled: true,
      panEnabled: true,
      responsive: true,
      orientation,
      touchArea: {
        minSize: 44, // Minimum touch target size
        padding: 8,
      },
    }),
    [height, touchEnabled, orientation],
  );

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data.length) return [];

    return data.map((vendor, index) => ({
      name:
        vendor.name.length > 12
          ? vendor.name.substring(0, 12) + '...'
          : vendor.name,
      fullName: vendor.name,
      revenue: vendor.revenue,
      bookings: vendor.totalBookings,
      rating: vendor.clientRating,
      responseTime: vendor.responseTime,
      completionRate: vendor.completionRate,
      category: vendor.category,
      index,
    }));
  }, [data]);

  // Color palette for charts
  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#00ff00',
    '#0088fe',
    '#00c49f',
    '#ffbb28',
    '#ff8042',
    '#8dd1e1',
  ];

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const newOrientation =
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      setOrientation(newOrientation);
    };

    window.addEventListener('resize', handleOrientationChange);
    handleOrientationChange(); // Initial check

    return () => window.removeEventListener('resize', handleOrientationChange);
  }, []);

  // Touch gesture handlers
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!touchEnabled) return;

      const touches = e.touches;
      setIsGesturing(true);

      if (touches.length === 2) {
        // Pinch gesture
        gestureRef.current.isZooming = true;
        gestureRef.current.lastDistance = getTouchDistance(touches);
        gestureRef.current.lastCenter = getTouchCenter(touches);
        gestureRef.current.startZoom = zoomLevel;
      } else if (touches.length === 1) {
        // Pan gesture
        gestureRef.current.isPanning = true;
        gestureRef.current.lastCenter = getTouchCenter(touches);
        gestureRef.current.startPan = panOffset;
      }
    },
    [touchEnabled, zoomLevel, panOffset],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchEnabled || !isGesturing) return;

      const touches = e.touches;

      if (touches.length === 2 && gestureRef.current.isZooming) {
        e.preventDefault(); // Prevent default zoom behavior

        const distance = getTouchDistance(touches);
        const scale = distance / gestureRef.current.lastDistance;

        const newZoom = Math.max(
          0.5,
          Math.min(5, gestureRef.current.startZoom * scale),
        );
        setZoomLevel(newZoom);

        // Haptic feedback for zoom milestones
        if (
          Math.abs(newZoom - Math.round(newZoom)) < 0.1 &&
          'vibrate' in navigator
        ) {
          navigator.vibrate(25);
        }
      } else if (touches.length === 1 && gestureRef.current.isPanning) {
        const center = getTouchCenter(touches);
        const deltaX = center.x - gestureRef.current.lastCenter.x;
        const deltaY = center.y - gestureRef.current.lastCenter.y;

        setPanOffset({
          x: gestureRef.current.startPan.x + deltaX,
          y: gestureRef.current.startPan.y + deltaY,
        });
      }
    },
    [touchEnabled, isGesturing],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchEnabled) return;

      setIsGesturing(false);
      gestureRef.current.isZooming = false;
      gestureRef.current.isPanning = false;

      // Single tap to select data point
      if (e.changedTouches.length === 1 && !gestureRef.current.isZooming) {
        const touch = e.changedTouches[0];
        const rect = chartContainerRef.current?.getBoundingClientRect();

        if (rect) {
          const relativeX = (touch.clientX - rect.left) / rect.width;
          const dataIndex = Math.floor(relativeX * chartData.length);

          if (dataIndex >= 0 && dataIndex < chartData.length) {
            const dataPoint = chartData[dataIndex];
            setSelectedDataPoint(dataPoint);

            // Haptic feedback for selection
            if ('vibrate' in navigator) {
              navigator.vibrate(50);
            }

            onDataPointClick?.(dataPoint);
          }
        }
      }
    },
    [touchEnabled, chartData, onDataPointClick],
  );

  // Chart type switching
  const handleChartTypeChange = useCallback((type: typeof currentChartType) => {
    setCurrentChartType(type);

    // Haptic feedback for type change
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }, []);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setSelectedDataPoint(null);
  }, []);

  // Custom tooltip for mobile
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg max-w-48">
          <p className="font-medium text-sm mb-2">
            {payload[0]?.payload?.fullName || label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs mb-1"
            >
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium ml-2">
                {typeof entry.value === 'number' &&
                entry.name.toLowerCase().includes('revenue')
                  ? `£${entry.value.toLocaleString()}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    switch (currentChartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              fontSize={12}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis fontSize={12} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={String(metric)}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              fontSize={12}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis fontSize={12} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={String(metric)}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              fontSize={12}
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis fontSize={12} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={String(metric)}
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData.slice(0, 8)} // Limit to 8 slices for mobile
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={Math.min(height * 0.35, 120)}
              fill="#8884d8"
              dataKey={String(metric)}
            >
              {chartData.slice(0, 8).map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('mobile-performance-charts w-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Performance Analytics</CardTitle>

          <div className="flex items-center gap-1">
            <Button
              variant={zoomLevel > 1 ? 'default' : 'ghost'}
              size="sm"
              onClick={resetView}
              className="min-h-[36px] min-w-[36px] p-2"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chart type selector */}
        <div className="flex items-center gap-2 mt-2">
          {[
            { type: 'line' as const, icon: TrendingUp, label: 'Line' },
            { type: 'area' as const, icon: Activity, label: 'Area' },
            { type: 'bar' as const, icon: BarChart3, label: 'Bar' },
            { type: 'pie' as const, icon: PieChartIcon, label: 'Pie' },
          ].map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant={currentChartType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleChartTypeChange(type)}
              className="min-h-[36px] flex items-center gap-1 px-3"
            >
              <Icon className="w-3 h-3" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>

        {/* Zoom level indicator */}
        {zoomLevel !== 1 && (
          <Badge variant="secondary" className="w-fit text-xs">
            Zoom: {zoomLevel.toFixed(1)}x
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        <div
          ref={chartContainerRef}
          className="relative touch-manipulation select-none"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center',
            transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Selected data point info */}
        {selectedDataPoint && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">
              {selectedDataPoint.fullName}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Revenue:</span>
                <span className="ml-1 font-medium">
                  £{selectedDataPoint.revenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Rating:</span>
                <span className="ml-1 font-medium">
                  {selectedDataPoint.rating.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Bookings:</span>
                <span className="ml-1 font-medium">
                  {selectedDataPoint.bookings}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Response:</span>
                <span className="ml-1 font-medium">
                  {selectedDataPoint.responseTime.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Touch instructions */}
        {touchEnabled && (
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Tap to select • Pinch to zoom • Drag to pan
            </p>
          </div>
        )}

        {/* No data message */}
        {chartData.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No data available</h3>
            <p className="text-sm text-muted-foreground">
              Add vendors to see performance analytics
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
