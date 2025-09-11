'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Clock,
  Activity,
  TrendingUp,
  MessageSquare,
  FileText,
  Calendar,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useClientAnalytics } from '../../hooks/useClientAnalytics';
import { EngagementMetrics } from './EngagementMetrics';
import { FeatureUsage } from './FeatureUsage';
import { CommunicationAnalytics } from './CommunicationAnalytics';
import { ClientJourney } from './ClientJourney';
import { AnalyticsOverview } from './AnalyticsOverview';

// Dynamic imports for chart components
const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);

interface ClientPortalAnalyticsProps {
  supplierId?: string;
  timeRange?: string;
  className?: string;
}

const timeRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'Last year' },
];

export function ClientPortalAnalytics({
  supplierId,
  timeRange = '30d',
  className = '',
}: ClientPortalAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [activeView, setActiveView] = useState<
    'overview' | 'engagement' | 'features' | 'communication' | 'journey'
  >('overview');
  const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);

  const { data, loading, error, refresh, exportData } = useClientAnalytics({
    supplierId,
    timeRange: selectedTimeRange,
  });

  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    setSelectedTimeRange(newTimeRange);
    setIsTimeRangeOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <h3 className="text-red-800 font-medium">Error loading analytics</h3>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Client Portal Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor client engagement and portal usage to optimize your service
            delivery
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
              data-testid="time-range-selector"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {
                  timeRangeOptions.find(
                    (option) => option.value === selectedTimeRange,
                  )?.label
                }
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isTimeRangeOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {timeRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeRangeChange(option.value)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                      selectedTimeRange === option.value
                        ? 'bg-blue-50 text-blue-700'
                        : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="refresh-button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'engagement', label: 'Engagement', icon: Activity },
            { id: 'features', label: 'Feature Usage', icon: Users },
            {
              id: 'communication',
              label: 'Communication',
              icon: MessageSquare,
            },
            { id: 'journey', label: 'Client Journey', icon: TrendingUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeView === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } transition-colors`}
              data-testid={`tab-${id}`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading analytics data...</span>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && data && (
        <div className="space-y-6">
          {activeView === 'overview' && (
            <AnalyticsOverview
              data={data}
              timeRange={selectedTimeRange}
              onExport={() => exportData('overview')}
            />
          )}

          {activeView === 'engagement' && (
            <EngagementMetrics
              data={data.engagement}
              timeRange={selectedTimeRange}
              onExport={() => exportData('engagement')}
            />
          )}

          {activeView === 'features' && (
            <FeatureUsage
              data={data.features}
              timeRange={selectedTimeRange}
              onExport={() => exportData('features')}
            />
          )}

          {activeView === 'communication' && (
            <CommunicationAnalytics
              data={data.communication}
              timeRange={selectedTimeRange}
              onExport={() => exportData('communication')}
            />
          )}

          {activeView === 'journey' && (
            <ClientJourney
              data={data.journey}
              timeRange={selectedTimeRange}
              onExport={() => exportData('journey')}
            />
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && (!data || Object.keys(data).length === 0) && (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No analytics data
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Analytics data will appear here once your clients start using the
            portal.
          </p>
        </div>
      )}
    </div>
  );
}

export default ClientPortalAnalytics;
