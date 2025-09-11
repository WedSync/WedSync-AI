'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Star,
  Activity,
  DollarSign,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { RevenueMetrics } from './RevenueMetrics';
import { GrowthAnalytics } from './GrowthAnalytics';
import { SupplierMetrics } from './SupplierMetrics';
import { MarketInsights } from './MarketInsights';
import { KPIDashboard } from './KPIDashboard';
import { useExecutiveData } from './useExecutiveData';

interface ExecutiveDashboardProps {
  organizationId: string;
  className?: string;
}

export function ExecutiveDashboard({
  organizationId,
  className = '',
}: ExecutiveDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { metrics, loading, error, refreshData, lastUpdated } =
    useExecutiveData(organizationId, selectedTimeRange);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading && !metrics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={24} />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Unable to load executive metrics. Please try refreshing.
            </p>
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time business intelligence for wedding platform operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity size={16} />
            Last updated:{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Never'}
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-w-[100px]"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[
          { value: '7d', label: '7 Days' },
          { value: '30d', label: '30 Days' },
          { value: '90d', label: '90 Days' },
          { value: '1y', label: '1 Year' },
        ].map((option) => (
          <Button
            key={option.value}
            variant={selectedTimeRange === option.value ? 'default' : 'outline'}
            onClick={() => setSelectedTimeRange(option.value)}
            size="sm"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {formatPercent(metrics.revenueGrowth)} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.activeClients.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.clientGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.clientGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {formatPercent(metrics.clientGrowth)} YoY growth
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Wedding Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.weddingBookings}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.bookingGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.bookingGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {formatPercent(metrics.bookingGrowth)} from last period
              </span>
            </div>
            <Badge variant="secondary" className="mt-2">
              Load trend: {metrics.loadTrend}
            </Badge>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.uptime.toFixed(2)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.uptimeChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  metrics.uptimeChange >= 0 ? 'text-green-600' : 'text-red-600'
                }
              >
                {metrics.uptimeChange >= 0 ? '+' : ''}
                {metrics.uptimeChange.toFixed(2)}% change
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wedding Season Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Wedding Season Performance
          </CardTitle>
          <CardDescription>
            Peak wedding season load and capacity analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Peak Season Load
              </p>
              <p className="text-2xl font-bold">
                {metrics.peakSeasonLoad.toFixed(1)}x
              </p>
              <p className="text-sm text-gray-500">vs off-season bookings</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Peak Months</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {metrics.seasonalTrends.peakMonths.map((month) => (
                  <Badge key={month} variant="outline" className="text-xs">
                    {month}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Capacity Utilization
              </p>
              <p className="text-2xl font-bold">
                {(metrics.seasonalTrends.capacityUtilization * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-gray-500">during peak season</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSign size={16} />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="growth" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Growth
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Users size={16} />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <PieChart size={16} />
            Market
          </TabsTrigger>
          <TabsTrigger value="kpis" className="flex items-center gap-2">
            <Target size={16} />
            KPIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <RevenueMetrics
            metrics={metrics}
            organizationId={organizationId}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="growth">
          <GrowthAnalytics
            metrics={metrics}
            organizationId={organizationId}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierMetrics
            metrics={metrics}
            organizationId={organizationId}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="market">
          <MarketInsights
            metrics={metrics}
            organizationId={organizationId}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        <TabsContent value="kpis">
          <KPIDashboard
            metrics={metrics}
            organizationId={organizationId}
            timeRange={selectedTimeRange}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest business events and system activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.recentActivity?.slice(0, 5).map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.description}</p>
                  {activity.details && (
                    <p className="text-xs text-gray-600 mt-1">
                      {activity.details}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.type}
                </Badge>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExecutiveDashboard;
