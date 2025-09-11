'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3Icon,
  TrendingUpIcon,
  ClockIcon,
  AlertTriangleIcon,
  CameraIcon,
  MapPinIcon,
  HeartIcon,
  CalendarIcon,
  UsersIcon,
  ActivityIcon,
  ZapIcon,
  ShieldIcon,
} from 'lucide-react';
import {
  EndpointUsage,
  WeddingRelevanceLevel,
  SupplierType,
  PlanningPhase,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface APIUsageAnalyticsProps {
  endpointUsage: EndpointUsage[];
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange?: (range: '1h' | '24h' | '7d' | '30d') => void;
  onOptimizationRecommendation?: (endpoint: string) => void;
}

export default function APIUsageAnalytics({
  endpointUsage,
  timeRange,
  onTimeRangeChange,
  onOptimizationRecommendation,
}: APIUsageAnalyticsProps) {
  const [selectedRelevance, setSelectedRelevance] = useState<
    WeddingRelevanceLevel | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<
    'requests' | 'errors' | 'latency' | 'rateLimitHits'
  >('requests');

  // Calculate analytics
  const totalRequests = endpointUsage.reduce(
    (sum, usage) => sum + usage.requestCount,
    0,
  );
  const totalErrors = endpointUsage.reduce(
    (sum, usage) => sum + usage.errorCount,
    0,
  );
  const averageLatency =
    endpointUsage.length > 0
      ? endpointUsage.reduce((sum, usage) => sum + usage.averageLatency, 0) /
        endpointUsage.length
      : 0;
  const totalRateLimitHits = endpointUsage.reduce(
    (sum, usage) => sum + usage.rateLimitHits,
    0,
  );

  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = endpointUsage;

    if (selectedRelevance !== 'all') {
      filtered = filtered.filter(
        (usage) => usage.weddingIndustryRelevance === selectedRelevance,
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'requests':
          return b.requestCount - a.requestCount;
        case 'errors':
          return b.errorCount - a.errorCount;
        case 'latency':
          return b.averageLatency - a.averageLatency;
        case 'rateLimitHits':
          return b.rateLimitHits - a.rateLimitHits;
        default:
          return 0;
      }
    });
  }, [endpointUsage, selectedRelevance, sortBy]);

  // Wedding-specific analytics
  const weddingCriticalEndpoints = endpointUsage.filter(
    (usage) =>
      usage.weddingIndustryRelevance === WeddingRelevanceLevel.CRITICAL,
  );

  const supplierEndpoints = endpointUsage.filter(
    (usage) =>
      usage.endpoint.includes('supplier') || usage.endpoint.includes('vendor'),
  );

  const coupleEndpoints = endpointUsage.filter(
    (usage) =>
      usage.endpoint.includes('couple') || usage.endpoint.includes('wedding'),
  );

  // Peak season analysis
  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  const getRelevanceColor = (relevance: WeddingRelevanceLevel): string => {
    switch (relevance) {
      case WeddingRelevanceLevel.CRITICAL:
        return 'text-red-600 bg-red-100';
      case WeddingRelevanceLevel.HIGH:
        return 'text-orange-600 bg-orange-100';
      case WeddingRelevanceLevel.MEDIUM:
        return 'text-yellow-600 bg-yellow-100';
      case WeddingRelevanceLevel.LOW:
        return 'text-blue-600 bg-blue-100';
      case WeddingRelevanceLevel.ADMINISTRATIVE:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRelevanceIcon = (relevance: WeddingRelevanceLevel) => {
    switch (relevance) {
      case WeddingRelevanceLevel.CRITICAL:
        return <HeartIcon className="w-4 h-4" />;
      case WeddingRelevanceLevel.HIGH:
        return <CalendarIcon className="w-4 h-4" />;
      case WeddingRelevanceLevel.MEDIUM:
        return <CameraIcon className="w-4 h-4" />;
      case WeddingRelevanceLevel.LOW:
        return <MapPinIcon className="w-4 h-4" />;
      case WeddingRelevanceLevel.ADMINISTRATIVE:
        return <ShieldIcon className="w-4 h-4" />;
    }
  };

  const getEndpointCategory = (endpoint: string): string => {
    if (endpoint.includes('auth')) return 'Authentication';
    if (endpoint.includes('supplier') || endpoint.includes('vendor'))
      return 'Supplier Management';
    if (endpoint.includes('couple') || endpoint.includes('wedding'))
      return 'Wedding Planning';
    if (endpoint.includes('booking')) return 'Booking System';
    if (endpoint.includes('payment')) return 'Payment Processing';
    if (endpoint.includes('media') || endpoint.includes('photo'))
      return 'Media Management';
    if (endpoint.includes('admin')) return 'Administration';
    return 'General';
  };

  const getHealthStatus = (
    usage: EndpointUsage,
  ): 'healthy' | 'warning' | 'critical' => {
    const errorRate =
      usage.requestCount > 0
        ? (usage.errorCount / usage.requestCount) * 100
        : 0;
    const rateLimitRate =
      usage.requestCount > 0
        ? (usage.rateLimitHits / usage.requestCount) * 100
        : 0;

    if (errorRate > 5 || rateLimitRate > 10 || usage.averageLatency > 1000)
      return 'critical';
    if (errorRate > 2 || rateLimitRate > 5 || usage.averageLatency > 500)
      return 'warning';
    return 'healthy';
  };

  const getHealthColor = (
    status: 'healthy' | 'warning' | 'critical',
  ): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            API Usage Analytics
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor endpoint performance and wedding industry usage patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={timeRange}
            onValueChange={(value) => onTimeRangeChange?.(value as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Wedding Season Alert */}
      {isWeddingSeason && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <HeartIcon className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">
              Peak Wedding Season Active
            </span>
          </div>
          <p className="text-purple-700 text-sm mt-1">
            API usage is {seasonalMultiplier}x normal levels. Monitor critical
            wedding endpoints closely.
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalRequests.toLocaleString()}
                </p>
              </div>
              <BarChart3Icon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p
                  className={`text-2xl font-bold ${errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {errorRate.toFixed(2)}%
                </p>
              </div>
              <AlertTriangleIcon
                className={`w-8 h-8 ${errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Latency</p>
                <p
                  className={`text-2xl font-bold ${averageLatency > 500 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {averageLatency.toFixed(0)}ms
                </p>
              </div>
              <ClockIcon
                className={`w-8 h-8 ${averageLatency > 500 ? 'text-red-500' : 'text-green-500'}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Rate Limit Hits
                </p>
                <p
                  className={`text-2xl font-bold ${totalRateLimitHits > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {totalRateLimitHits}
                </p>
              </div>
              <ZapIcon
                className={`w-8 h-8 ${totalRateLimitHits > 0 ? 'text-red-500' : 'text-green-500'}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoint Details</TabsTrigger>
          <TabsTrigger value="wedding">Wedding Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Endpoints by Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints by Traffic</CardTitle>
                <CardDescription>Highest volume API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredData.slice(0, 10).map((usage, index) => {
                    const percentage =
                      totalRequests > 0
                        ? (usage.requestCount / totalRequests) * 100
                        : 0;
                    const healthStatus = getHealthStatus(usage);

                    return (
                      <div
                        key={usage.endpoint}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-500 min-w-[20px]">
                            #{index + 1}
                          </span>
                          <div
                            className={`p-2 rounded-lg ${getRelevanceColor(usage.weddingIndustryRelevance)}`}
                          >
                            {getRelevanceIcon(usage.weddingIndustryRelevance)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">
                              {usage.method} {usage.endpoint}
                            </p>
                            <p className="text-sm text-gray-600">
                              {getEndpointCategory(usage.endpoint)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {usage.requestCount.toLocaleString()}
                          </p>
                          <p
                            className={`text-sm ${getHealthColor(healthStatus)}`}
                          >
                            {healthStatus}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Endpoint Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Category</CardTitle>
                <CardDescription>
                  API usage distributed by function
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    'Wedding Planning',
                    'Supplier Management',
                    'Authentication',
                    'Payment Processing',
                    'Media Management',
                    'Booking System',
                  ].map((category) => {
                    const categoryEndpoints = endpointUsage.filter(
                      (usage) =>
                        getEndpointCategory(usage.endpoint) === category,
                    );
                    const categoryRequests = categoryEndpoints.reduce(
                      (sum, usage) => sum + usage.requestCount,
                      0,
                    );
                    const categoryPercentage =
                      totalRequests > 0
                        ? (categoryRequests / totalRequests) * 100
                        : 0;

                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {category}
                          </span>
                          <span className="text-sm text-gray-600">
                            {categoryRequests.toLocaleString()} (
                            {categoryPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={categoryPercentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Endpoint Analysis</CardTitle>
              <CardDescription>
                Comprehensive endpoint performance metrics
              </CardDescription>
              <div className="flex gap-3">
                <Select
                  value={selectedRelevance}
                  onValueChange={(value) => setSelectedRelevance(value as any)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Endpoints</SelectItem>
                    <SelectItem value="CRITICAL">Critical Only</SelectItem>
                    <SelectItem value="HIGH">High Priority</SelectItem>
                    <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                    <SelectItem value="LOW">Low Priority</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as any)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requests">Requests</SelectItem>
                    <SelectItem value="errors">Errors</SelectItem>
                    <SelectItem value="latency">Latency</SelectItem>
                    <SelectItem value="rateLimitHits">Rate Limits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Endpoint</th>
                      <th className="text-right p-3">Requests</th>
                      <th className="text-right p-3">Errors</th>
                      <th className="text-right p-3">Latency</th>
                      <th className="text-right p-3">Rate Limits</th>
                      <th className="text-center p-3">Health</th>
                      <th className="text-center p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((usage) => {
                      const errorRate =
                        usage.requestCount > 0
                          ? (usage.errorCount / usage.requestCount) * 100
                          : 0;
                      const healthStatus = getHealthStatus(usage);

                      return (
                        <tr
                          key={usage.endpoint}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {usage.method}
                              </Badge>
                              <div>
                                <p className="font-medium truncate max-w-[300px]">
                                  {usage.endpoint}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {getEndpointCategory(usage.endpoint)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {usage.requestCount.toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <div>
                              <span className="font-medium">
                                {usage.errorCount}
                              </span>
                              <span
                                className={`text-xs block ${errorRate > 5 ? 'text-red-600' : 'text-gray-500'}`}
                              >
                                {errorRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`font-medium ${usage.averageLatency > 500 ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {usage.averageLatency.toFixed(0)}ms
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`font-medium ${usage.rateLimitHits > 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
                              {usage.rateLimitHits}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                healthStatus === 'healthy'
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="capitalize"
                            >
                              {healthStatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {healthStatus !== 'healthy' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onOptimizationRecommendation?.(usage.endpoint)
                                }
                              >
                                Optimize
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wedding" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wedding Critical Endpoints */}
            <Card>
              <CardHeader>
                <CardTitle>Critical Wedding Endpoints</CardTitle>
                <CardDescription>
                  Mission-critical wedding functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weddingCriticalEndpoints.map((usage) => {
                    const healthStatus = getHealthStatus(usage);

                    return (
                      <div
                        key={usage.endpoint}
                        className="p-4 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <HeartIcon className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="font-medium text-red-900">
                                {usage.method} {usage.endpoint}
                              </p>
                              <p className="text-sm text-red-700">
                                {usage.description}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              healthStatus === 'healthy'
                                ? 'default'
                                : 'destructive'
                            }
                            className="capitalize"
                          >
                            {healthStatus}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-red-600">Requests</p>
                            <p className="font-bold">
                              {usage.requestCount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-red-600">Latency</p>
                            <p className="font-bold">
                              {usage.averageLatency.toFixed(0)}ms
                            </p>
                          </div>
                          <div>
                            <p className="text-red-600">Errors</p>
                            <p className="font-bold">{usage.errorCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Supplier vs Couple Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by User Type</CardTitle>
                <CardDescription>
                  Supplier vs couple API usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Supplier Metrics */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <UsersIcon className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">
                        Supplier Endpoints
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600">Total Requests</p>
                        <p className="text-lg font-bold text-blue-900">
                          {supplierEndpoints
                            .reduce((sum, usage) => sum + usage.requestCount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-600">Avg Latency</p>
                        <p className="text-lg font-bold text-blue-900">
                          {supplierEndpoints.length > 0
                            ? (
                                supplierEndpoints.reduce(
                                  (sum, usage) => sum + usage.averageLatency,
                                  0,
                                ) / supplierEndpoints.length
                              ).toFixed(0)
                            : 0}
                          ms
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Couple Metrics */}
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <HeartIcon className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-purple-900">
                        Couple Endpoints
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-purple-600">Total Requests</p>
                        <p className="text-lg font-bold text-purple-900">
                          {coupleEndpoints
                            .reduce((sum, usage) => sum + usage.requestCount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-purple-600">Avg Latency</p>
                        <p className="text-lg font-bold text-purple-900">
                          {coupleEndpoints.length > 0
                            ? (
                                coupleEndpoints.reduce(
                                  (sum, usage) => sum + usage.averageLatency,
                                  0,
                                ) / coupleEndpoints.length
                              ).toFixed(0)
                            : 0}
                          ms
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Seasonal Impact */}
                  {isWeddingSeason && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUpIcon className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-semibold text-yellow-900">
                          Seasonal Impact
                        </h4>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Wedding season active - API usage increased by{' '}
                        {((seasonalMultiplier - 1) * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Issues</CardTitle>
                <CardDescription>
                  Endpoints requiring optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {endpointUsage
                    .filter((usage) => getHealthStatus(usage) !== 'healthy')
                    .sort((a, b) => b.averageLatency - a.averageLatency)
                    .slice(0, 10)
                    .map((usage) => {
                      const healthStatus = getHealthStatus(usage);
                      const errorRate =
                        usage.requestCount > 0
                          ? (usage.errorCount / usage.requestCount) * 100
                          : 0;

                      return (
                        <div
                          key={usage.endpoint}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[250px]">
                                {usage.method} {usage.endpoint}
                              </p>
                              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                <span>
                                  Latency: {usage.averageLatency.toFixed(0)}ms
                                </span>
                                <span>Error Rate: {errorRate.toFixed(1)}%</span>
                                <span>Rate Limits: {usage.rateLimitHits}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  healthStatus === 'critical'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="mb-2"
                              >
                                {healthStatus}
                              </Badge>
                              <br />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onOptimizationRecommendation?.(usage.endpoint)
                                }
                              >
                                Fix
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Optimization Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  Automated performance improvement suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ZapIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">
                        Caching Opportunities
                      </span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      {
                        endpointUsage.filter((u) => u.averageLatency > 300)
                          .length
                      }{' '}
                      endpoints could benefit from caching
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <ActivityIcon className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">
                        Rate Limit Adjustments
                      </span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Consider increasing limits for{' '}
                      {endpointUsage.filter((u) => u.rateLimitHits > 10).length}{' '}
                      frequently hit endpoints
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-800">
                        Error Investigation
                      </span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      {
                        endpointUsage.filter(
                          (u) => u.errorCount / u.requestCount > 0.02,
                        ).length
                      }{' '}
                      endpoints have error rates above 2%
                    </p>
                  </div>

                  {isWeddingSeason && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <HeartIcon className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-purple-800">
                          Wedding Season Scaling
                        </span>
                      </div>
                      <p className="text-purple-700 text-sm mt-1">
                        Scale critical wedding endpoints for{' '}
                        {seasonalMultiplier}x traffic during peak season
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
