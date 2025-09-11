'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RefreshCw,
  Settings,
  Download,
  Share2,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartMetrics {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  metrics?: ChartMetrics;
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'gauge';
  refreshInterval?: number;
  onRefresh?: () => void;
  onSettings?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  realTimeEnabled?: boolean;
  onToggleRealTime?: () => void;
  lastUpdated?: Date;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  metrics,
  chartType,
  refreshInterval = 300,
  onRefresh,
  onSettings,
  onShare,
  onExport,
  className,
  isExpanded = false,
  onToggleExpanded,
  realTimeEnabled = false,
  onToggleRealTime,
  lastUpdated,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextRefresh, setNextRefresh] = useState<number>(refreshInterval);

  // Auto-refresh countdown
  useEffect(() => {
    if (!realTimeEnabled || !refreshInterval) return;

    const interval = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1) {
          onRefresh?.();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [realTimeEnabled, refreshInterval, onRefresh]);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh?.();
      setNextRefresh(refreshInterval);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card
      className={cn(
        'relative transition-all duration-200 hover:shadow-lg',
        isExpanded ? 'col-span-2 row-span-2' : '',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold truncate">
            {title}
          </CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Metrics Badge */}
          {metrics && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className={cn(
                      'flex items-center gap-1 px-2 py-1',
                      getTrendColor(metrics.trend),
                    )}
                  >
                    {getTrendIcon(metrics.trend)}
                    <span className="font-medium">
                      {metrics.changePercentage >= 0 ? '+' : ''}
                      {metrics.changePercentage.toFixed(1)}%
                    </span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <div>
                      Current: {metrics.current.toLocaleString()}
                      {metrics.unit}
                    </div>
                    <div>
                      Previous: {metrics.previous.toLocaleString()}
                      {metrics.unit}
                    </div>
                    <div>
                      Change: {metrics.change >= 0 ? '+' : ''}
                      {metrics.change.toLocaleString()}
                      {metrics.unit}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Real-time indicator */}
          {realTimeEnabled && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>{formatTime(nextRefresh)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Auto-refresh in {formatTime(nextRefresh)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {onToggleRealTime && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleRealTime}
                className="h-8 w-8 p-0"
              >
                {realTimeEnabled ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw
                className={cn(
                  'w-4 h-4',
                  (isRefreshing || isLoading) && 'animate-spin',
                )}
              />
            </Button>

            {onToggleExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            )}

            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSettings}
                className="h-8 w-8 p-0"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}

            {onShare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className="h-8 w-8 p-0"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}

            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-8 w-8 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {error ? (
          <div className="flex items-center justify-center h-48 text-center">
            <div className="text-red-500 space-y-2">
              <div className="text-sm font-medium">Error loading chart</div>
              <div className="text-xs text-muted-foreground">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn('w-3 h-3 mr-1', isRefreshing && 'animate-spin')}
                />
                Retry
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="space-y-3 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <div className="text-sm text-muted-foreground">
                Loading chart data...
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            {children}

            {/* Last updated indicator */}
            {lastUpdated && (
              <div className="absolute top-0 right-0 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Wedding day priority indicator */}
      {title.toLowerCase().includes('wedding') && (
        <div className="absolute top-0 left-0 w-3 h-3 bg-pink-500 rounded-br-md" />
      )}
    </Card>
  );
};

export default ChartContainer;
export type { ChartContainerProps, ChartMetrics };
