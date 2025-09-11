'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import ProgressLineChart from './ProgressLineChart';
import ProgressGaugeChart from './ProgressGaugeChart';
import { ChartMetrics } from './ChartContainer';

interface RealTimeProgressChartProps {
  chartConfigId: string;
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'gauge';
  title: string;
  description?: string;
  dataSource:
    | 'clients'
    | 'forms'
    | 'payments'
    | 'tasks'
    | 'journeys'
    | 'custom';
  refreshInterval?: number;
  className?: string;

  // Chart-specific props
  showTarget?: boolean;
  showTrend?: boolean;
  weddingDate?: string;
  milestones?: Array<{ date: string; label: string; color?: string }>;
}

interface ChartData {
  data: any[];
  metrics?: ChartMetrics;
  metadata?: Record<string, any>;
  lastUpdated?: Date;
}

const RealTimeProgressChart: React.FC<RealTimeProgressChartProps> = ({
  chartConfigId,
  chartType,
  title,
  description,
  dataSource,
  refreshInterval = 300,
  className,
  showTarget = true,
  showTrend = true,
  weddingDate,
  milestones = [],
}) => {
  const [chartData, setChartData] = useState<ChartData>({ data: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('connecting');

  const { user } = useAuth();
  const supabase = createClient();
  const subscriptionRef = useRef<any>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chart data from API
  const fetchChartData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const response = await fetch(
        `/api/progress/charts?config_id=${chartConfigId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }

      const result = await response.json();

      setChartData({
        data: result.data || [],
        metrics: result.metrics,
        metadata: result.metadata,
        lastUpdated: new Date(),
      });

      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load chart data',
      );
      setConnectionStatus('disconnected');
      toast.error('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [chartConfigId, user]);

  // Setup real-time subscription
  const setupRealtimeSubscription = useCallback(async () => {
    if (!user || !realTimeEnabled) return;

    try {
      // Subscribe to progress metrics changes
      subscriptionRef.current = supabase
        .channel(`chart_${chartConfigId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'progress_metrics',
            filter: `organization_id=eq.${user.organization_id}`,
          },
          (payload) => {
            console.log('Real-time update received:', payload);
            // Refresh data when progress metrics change
            fetchChartData();
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'progress_snapshots',
            filter: `organization_id=eq.${user.organization_id}`,
          },
          (payload) => {
            console.log('Snapshot update received:', payload);
            // Refresh data when snapshots are updated
            fetchChartData();
          },
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            toast.success('Real-time updates enabled');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('disconnected');
            toast.error('Real-time connection failed');
          }
        });

      // Update chart subscription in database
      await fetch('/api/progress/real-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chart_config_id: chartConfigId,
          connection_id: `chart_${chartConfigId}`,
          subscription_type: 'realtime',
        }),
      });
    } catch (err) {
      console.error('Error setting up real-time subscription:', err);
      setConnectionStatus('disconnected');
    }
  }, [user, realTimeEnabled, chartConfigId, supabase, fetchChartData]);

  // Cleanup subscription
  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  }, []);

  // Setup periodic refresh
  const setupPeriodicRefresh = useCallback(() => {
    if (!realTimeEnabled || !refreshInterval) return;

    refreshTimeoutRef.current = setTimeout(() => {
      fetchChartData();
      setupPeriodicRefresh(); // Reschedule
    }, refreshInterval * 1000);
  }, [realTimeEnabled, refreshInterval, fetchChartData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchChartData();
  }, [fetchChartData]);

  // Handle real-time toggle
  const handleToggleRealTime = useCallback(() => {
    setRealTimeEnabled((prev) => {
      const newValue = !prev;

      if (newValue) {
        setupRealtimeSubscription();
        setupPeriodicRefresh();
        toast.success('Real-time updates enabled');
      } else {
        cleanupSubscription();
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
        toast.info('Real-time updates disabled');
      }

      return newValue;
    });
  }, [setupRealtimeSubscription, setupPeriodicRefresh, cleanupSubscription]);

  // Handle settings
  const handleSettings = useCallback(() => {
    // Open chart configuration modal
    toast.info('Chart settings coming soon!');
  }, []);

  // Initialize chart
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Setup real-time features
  useEffect(() => {
    if (realTimeEnabled) {
      setupRealtimeSubscription();
      setupPeriodicRefresh();
    }

    return () => {
      cleanupSubscription();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [
    realTimeEnabled,
    setupRealtimeSubscription,
    setupPeriodicRefresh,
    cleanupSubscription,
  ]);

  // Handle visibility change (pause/resume when tab is hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause real-time updates when tab is hidden
        cleanupSubscription();
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = null;
        }
      } else {
        // Resume real-time updates when tab becomes visible
        if (realTimeEnabled) {
          setupRealtimeSubscription();
          setupPeriodicRefresh();
          fetchChartData(); // Refresh immediately
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [
    realTimeEnabled,
    setupRealtimeSubscription,
    setupPeriodicRefresh,
    cleanupSubscription,
    fetchChartData,
  ]);

  // Handle data point click
  const handleDataPointClick = useCallback((dataPoint: any) => {
    console.log('Data point clicked:', dataPoint);
    // Could open detailed view or drill-down
    toast.info(`Data point: ${dataPoint.label || dataPoint.date}`);
  }, []);

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      title,
      description,
      isLoading,
      error,
      onRefresh: handleRefresh,
      onSettings: handleSettings,
      realTimeEnabled,
      refreshInterval,
      lastUpdated: chartData.lastUpdated,
      className,
    };

    switch (chartType) {
      case 'line':
      case 'area':
        return (
          <ProgressLineChart
            {...commonProps}
            data={chartData.data}
            metrics={chartData.metrics}
            showTarget={showTarget}
            showTrend={showTrend}
            showArea={chartType === 'area'}
            onDataPointClick={handleDataPointClick}
            onToggleRealTime={handleToggleRealTime}
            weddingDate={weddingDate}
            milestones={milestones}
          />
        );

      case 'gauge':
        const gaugePercentage = chartData.metrics?.current || 0;
        const gaugeTarget = chartData.metrics?.target || 100;

        return (
          <ProgressGaugeChart
            {...commonProps}
            data={chartData.data}
            metrics={chartData.metrics}
            percentage={
              gaugeTarget > 0 ? (gaugePercentage / gaugeTarget) * 100 : 0
            }
            target={gaugeTarget}
            onToggleRealTime={handleToggleRealTime}
            weddingProgress={chartData.metadata?.weddingProgress}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-48 text-center">
            <div className="text-muted-foreground">
              Chart type "{chartType}" not yet implemented
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {renderChart()}

      {/* Connection status indicator */}
      {realTimeEnabled && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-800'
                : connectionStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500 animate-pulse'
                  : connectionStatus === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            {connectionStatus === 'connected'
              ? 'Live'
              : connectionStatus === 'connecting'
                ? 'Connecting'
                : 'Offline'}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeProgressChart;
export type { RealTimeProgressChartProps };
