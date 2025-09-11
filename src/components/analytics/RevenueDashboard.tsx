'use client';

import React from 'react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSearchParams } from 'next/navigation';
import {
  RevenueTrends,
  ConversionFunnel,
  VendorPerformance,
  WeddingSeasonInsights,
  ClientAcquisition,
} from './RechartsComponents';
import { JourneyOverviewCards } from './JourneyOverviewCards';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Calendar, Filter } from 'lucide-react';

// Transform analytics data for Recharts components
const transformAnalyticsData = (analytics: any) => {
  // Revenue trends data
  const revenueTrends = analytics.performance_history.map((item: any) => ({
    date: item.date,
    revenue: item.revenue,
    bookings: item.completed_instances,
    avgValue: item.revenue / Math.max(item.completed_instances, 1),
  }));

  // Conversion funnel data
  const conversionFunnel = analytics.funnel.map(
    (stage: any, index: number) => ({
      stage: stage.name,
      users: stage.value,
      conversionRate: stage.percentage,
    }),
  );

  // Mock vendor data (would come from actual API)
  const vendorData = [
    {
      name: 'Grand Ballroom',
      bookings: 45,
      revenue: 125000,
      rating: 4.8,
      category: 'venue',
    },
    {
      name: 'Garden Estate',
      bookings: 38,
      revenue: 98000,
      rating: 4.9,
      category: 'venue',
    },
    {
      name: 'City Hall',
      bookings: 32,
      revenue: 76000,
      rating: 4.7,
      category: 'venue',
    },
    {
      name: 'Beach Club',
      bookings: 28,
      revenue: 84000,
      rating: 4.6,
      category: 'venue',
    },
    {
      name: 'Mountain Lodge',
      bookings: 22,
      revenue: 65000,
      rating: 4.5,
      category: 'venue',
    },
  ];

  // Mock seasonal data
  const seasonalData = [
    {
      month: 'Jan',
      weddings: 23,
      revenue: 145000,
      popularStyles: ['Winter', 'Indoor'],
    },
    {
      month: 'Feb',
      weddings: 67,
      revenue: 425000,
      popularStyles: ['Valentine', 'Romantic'],
    },
    {
      month: 'Mar',
      weddings: 89,
      revenue: 568000,
      popularStyles: ['Spring', 'Garden'],
    },
    {
      month: 'Apr',
      weddings: 134,
      revenue: 867000,
      popularStyles: ['Outdoor', 'Floral'],
    },
    {
      month: 'May',
      weddings: 156,
      revenue: 1024000,
      popularStyles: ['Garden', 'Vintage'],
    },
    {
      month: 'Jun',
      weddings: 189,
      revenue: 1267000,
      popularStyles: ['Summer', 'Beach'],
    },
  ];

  // Mock client acquisition data
  const clientAcquisition = [
    { source: 'Social Media', clients: 45, percentage: 35 },
    { source: 'Referrals', clients: 38, percentage: 30 },
    { source: 'Website', clients: 25, percentage: 20 },
    { source: 'Events', clients: 12, percentage: 10 },
    { source: 'Other', clients: 6, percentage: 5 },
  ];

  return {
    revenueTrends,
    conversionFunnel,
    vendorData,
    seasonalData,
    clientAcquisition,
  };
};

interface RevenueDashboardProps {
  className?: string;
}

export function RevenueDashboard({ className }: RevenueDashboardProps) {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30d';
  const {
    data: analytics,
    isLoading,
    refresh,
    isRealTime,
  } = useAnalyticsData(timeframe);

  const handleExport = () => {
    // Export functionality - would implement CSV/PDF export
    console.log('Exporting analytics data...');
  };

  const handleRefresh = () => {
    refresh();
  };

  if (isLoading || !analytics) {
    return (
      <div className={className}>
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const transformedData = transformAnalyticsData(analytics);

  return (
    <div className={className}>
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Revenue Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your wedding business performance and insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRealTime && (
            <Badge variant="success" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live Updates
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mb-8">
        <JourneyOverviewCards />
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trends - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RevenueTrends
            data={transformedData.revenueTrends}
            loading={isLoading}
          />
        </div>

        {/* Client Acquisition */}
        <ClientAcquisition
          data={transformedData.clientAcquisition}
          loading={isLoading}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Conversion Funnel */}
        <ConversionFunnel
          data={transformedData.conversionFunnel}
          loading={isLoading}
        />

        {/* Vendor Performance */}
        <VendorPerformance
          data={transformedData.vendorData}
          loading={isLoading}
        />
      </div>

      {/* Wedding Season Insights - Full Width */}
      <div className="mb-8">
        <WeddingSeasonInsights
          data={transformedData.seasonalData}
          loading={isLoading}
        />
      </div>

      {/* Business Intelligence Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Business Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Peak Season
              </h4>
              <p className="text-2xl font-bold text-purple-600">June</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                189 weddings, $1.26M revenue
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Top Acquisition
              </h4>
              <p className="text-2xl font-bold text-cyan-600">Social Media</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                35% of new clients
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Avg. Booking Value
              </h4>
              <p className="text-2xl font-bold text-emerald-600">
                $
                {(
                  analytics.overview.total_revenue /
                  analytics.overview.total_instances
                ).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Per wedding client
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
