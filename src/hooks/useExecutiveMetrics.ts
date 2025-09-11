'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface DateRange {
  start: string;
  end: string;
}

interface ExecutiveMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  activeClients: number;
  clientGrowth: number;
  weddingBookings: number;
  bookingGrowth: number;
  avgVendorRating: number;
  vendorRatingGrowth: number;
  uptime: number;
  uptimeChange: number;
  peakSeasonLoad: number;
  loadTrend: string;
  revenueChart: Array<{ month: string; revenue: number; target: number }>;
  clientChart: Array<{
    month: string;
    newClients: number;
    activeClients: number;
  }>;
  timelineChart: Array<{ month: string; bookings: number; capacity: number }>;
  vendorChart: Array<{ name: string; value: number; rating: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    details: string;
    timestamp: string;
  }>;
  seasonalTrends: {
    peakMonths: string[];
    averageLoadIncrease: number;
    capacityUtilization: number;
  };
}

interface UseExecutiveMetricsReturn {
  data: ExecutiveMetrics | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  refresh: () => void;
}

const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

export function useExecutiveMetrics(
  dateRange: DateRange,
  refreshTrigger: number = 0,
): UseExecutiveMetricsReturn {
  const [data, setData] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnected(false);
  }, []);

  // Refresh function for manual updates
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
        refresh: 'true',
      });

      const response = await fetch(`/api/analytics/executive?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metrics = await response.json();
      setData(metrics);
      setError(null);
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to refresh metrics',
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    cleanup();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      const eventSource = new EventSource(
        `/api/analytics/executive?${params}`,
        {
          withCredentials: true,
        },
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Executive metrics SSE connection opened');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const metrics = JSON.parse(event.data);
          setData(metrics);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
          setError('Invalid data received from server');
        }
      };

      eventSource.addEventListener('heartbeat', (event) => {
        console.log('SSE heartbeat:', event.data);
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const errorData = JSON.parse((event as MessageEvent).data);
          setError(errorData.error || 'Server error occurred');
        } catch {
          // Not a JSON error event, handle as connection error
          console.error('SSE error event');
        }
      });

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setConnected(false);

        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed');

          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            console.log(
              `Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, RECONNECT_INTERVAL * reconnectAttemptsRef.current);
          } else {
            setError('Connection lost. Please refresh the page.');
            setLoading(false);
          }
        }
      };
    } catch (err) {
      console.error('Error creating SSE connection:', err);
      setError('Failed to establish connection');
      setLoading(false);
      setConnected(false);
    }
  }, [dateRange, cleanup]);

  // Effect to handle connection and reconnection
  useEffect(() => {
    connect();

    return cleanup;
  }, [connect, cleanup, refreshTrigger]);

  // Effect to handle date range changes
  useEffect(() => {
    if (connected) {
      // Reconnect with new date range
      connect();
    }
  }, [dateRange.start, dateRange.end]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !connected &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        console.log('Page became visible, attempting to reconnect...');
        connect();
      } else if (document.visibilityState === 'hidden') {
        console.log('Page became hidden, cleaning up connections...');
        cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connected, connect, cleanup]);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network connection restored, attempting to reconnect...');
      if (!connected && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        connect();
      }
    };

    const handleOffline = () => {
      console.log('Network connection lost');
      setError('Network connection lost');
      setConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connected, connect]);

  return {
    data,
    loading,
    error,
    connected,
    refresh,
  };
}

// Hook for one-time data fetch (without SSE)
export function useExecutiveMetricsOnce(
  dateRange: DateRange,
  refreshTrigger: number = 0,
) {
  const [data, setData] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
      });

      const response = await fetch(`/api/analytics/executive?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metrics = await response.json();
      setData(metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
  };
}
