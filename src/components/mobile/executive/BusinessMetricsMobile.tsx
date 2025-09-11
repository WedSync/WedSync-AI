'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCcw } from 'lucide-react';
import { RevenueWidget } from './widgets/RevenueWidget';
import { ClientMetricsWidget } from './widgets/ClientMetricsWidget';
import { PerformanceWidget } from './widgets/PerformanceWidget';

interface BusinessMetrics {
  revenue: {
    current: number;
    previous: number;
    growth: number;
    trend: 'up' | 'down' | 'stable';
    chartData: { labels: string[]; values: number[] };
    forecast?: number;
  };
  clients: {
    total: number;
    active: number;
    new: number;
    churned: number;
    satisfaction: number;
    engagement: { labels: string[]; values: number[] };
  };
  performance: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    throughput: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    alerts: number;
  };
}

export function BusinessMetricsMobile() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  const mockMetrics: BusinessMetrics = {
    revenue: {
      current: 125400,
      previous: 118200,
      growth: 6.1,
      trend: 'up',
      chartData: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [95000, 102000, 108000, 115000, 118200, 125400],
      },
      forecast: 132000,
    },
    clients: {
      total: 1247,
      active: 1098,
      new: 89,
      churned: 23,
      satisfaction: 4.7,
      engagement: {
        labels: ['Highly Active', 'Active', 'Low', 'Inactive'],
        values: [340, 450, 220, 237],
      },
    },
    performance: {
      uptime: 99.2,
      responseTime: 245,
      errorRate: 0.8,
      throughput: 1520,
      status: 'excellent',
      alerts: 2,
    },
  };

  const fetchMetrics = async () => {
    try {
      setError(null);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Failed to load metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading business metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Executive Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time business intelligence
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg
              bg-blue-600 text-white text-sm font-medium
              ${refreshing ? 'opacity-50' : 'hover:bg-blue-700'}
              transition-colors duration-200
              min-h-[44px] min-w-[44px]
            `}
          >
            <RefreshCcw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {refreshing ? 'Syncing...' : 'Refresh'}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-red-600 text-sm underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Revenue Widget - Large */}
            <RevenueWidget
              data={metrics?.revenue!}
              size="large"
              loading={loading}
              error={error}
              onTap={() => console.log('Navigate to revenue details')}
            />

            {/* Client Metrics Widget - Medium */}
            <ClientMetricsWidget
              data={metrics?.clients!}
              size="medium"
              loading={loading}
              error={error}
              onTap={() => console.log('Navigate to client details')}
            />

            {/* Performance Widget - Medium */}
            <PerformanceWidget
              data={metrics?.performance!}
              size="medium"
              loading={loading}
              error={error}
              onTap={() => console.log('Navigate to performance details')}
            />

            {/* Additional small widgets can be added here */}
          </div>
        )}
      </div>

      {/* Last Updated */}
      <div className="px-4 pb-6">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </p>
          {refreshing && (
            <p className="text-xs text-blue-600 mt-1">Syncing with server...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BusinessMetricsMobile;
