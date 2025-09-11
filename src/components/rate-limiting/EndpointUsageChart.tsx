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
  AlertTriangleIcon,
  ClockIcon,
  ZapIcon,
  ActivityIcon,
  HeartIcon,
  CameraIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  ShieldIcon,
} from 'lucide-react';
import {
  EndpointUsage,
  WeddingRelevanceLevel,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface EndpointUsageChartProps {
  endpointData: EndpointUsage[];
  timeRange?: '1h' | '24h' | '7d' | '30d';
  maxItems?: number;
  sortBy?: 'requests' | 'errors' | 'latency' | 'rateLimitHits';
  filterBy?: WeddingRelevanceLevel | 'all';
  onEndpointClick?: (endpoint: EndpointUsage) => void;
  onOptimizeClick?: (endpoint: string) => void;
  showWeddingContext?: boolean;
  className?: string;
}

export default function EndpointUsageChart({
  endpointData,
  timeRange = '24h',
  maxItems = 10,
  sortBy: initialSortBy = 'requests',
  filterBy: initialFilterBy = 'all',
  onEndpointClick,
  onOptimizeClick,
  showWeddingContext = true,
  className = '',
}: EndpointUsageChartProps) {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [filterBy, setFilterBy] = useState(initialFilterBy);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  // Process and filter data
  const processedData = useMemo(() => {
    let filtered = endpointData;

    // Filter by wedding relevance
    if (filterBy !== 'all') {
      filtered = filtered.filter(
        (endpoint) => endpoint.weddingIndustryRelevance === filterBy,
      );
    }

    // Sort data
    filtered = filtered.sort((a, b) => {
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

    return filtered.slice(0, maxItems);
  }, [endpointData, filterBy, sortBy, maxItems]);

  // Calculate totals and metrics
  const totalRequests = endpointData.reduce(
    (sum, endpoint) => sum + endpoint.requestCount,
    0,
  );
  const totalErrors = endpointData.reduce(
    (sum, endpoint) => sum + endpoint.errorCount,
    0,
  );
  const totalRateLimitHits = endpointData.reduce(
    (sum, endpoint) => sum + endpoint.rateLimitHits,
    0,
  );
  const averageLatency =
    endpointData.length > 0
      ? endpointData.reduce(
          (sum, endpoint) => sum + endpoint.averageLatency,
          0,
        ) / endpointData.length
      : 0;

  const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

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

  const getRelevanceColor = (relevance: WeddingRelevanceLevel): string => {
    switch (relevance) {
      case WeddingRelevanceLevel.CRITICAL:
        return 'text-red-600 bg-red-100 border-red-200';
      case WeddingRelevanceLevel.HIGH:
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case WeddingRelevanceLevel.MEDIUM:
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case WeddingRelevanceLevel.LOW:
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case WeddingRelevanceLevel.ADMINISTRATIVE:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getHealthStatus = (
    endpoint: EndpointUsage,
  ): 'healthy' | 'warning' | 'critical' => {
    const endpointErrorRate =
      endpoint.requestCount > 0
        ? (endpoint.errorCount / endpoint.requestCount) * 100
        : 0;
    const rateLimitRate =
      endpoint.requestCount > 0
        ? (endpoint.rateLimitHits / endpoint.requestCount) * 100
        : 0;

    if (
      endpointErrorRate > 5 ||
      rateLimitRate > 10 ||
      endpoint.averageLatency > 1000
    )
      return 'critical';
    if (
      endpointErrorRate > 2 ||
      rateLimitRate > 5 ||
      endpoint.averageLatency > 500
    )
      return 'warning';
    return 'healthy';
  };

  const getHealthColor = (
    status: 'healthy' | 'warning' | 'critical',
  ): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEndpointCategory = (endpoint: string): string => {
    if (endpoint.includes('auth')) return 'Auth';
    if (endpoint.includes('supplier') || endpoint.includes('vendor'))
      return 'Supplier';
    if (endpoint.includes('couple') || endpoint.includes('wedding'))
      return 'Wedding';
    if (endpoint.includes('booking')) return 'Booking';
    if (endpoint.includes('payment')) return 'Payment';
    if (endpoint.includes('media') || endpoint.includes('photo'))
      return 'Media';
    if (endpoint.includes('admin')) return 'Admin';
    return 'General';
  };

  const maxRequestCount = Math.max(...processedData.map((d) => d.requestCount));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="w-5 h-5" />
              Endpoint Usage Analytics
            </CardTitle>
            <CardDescription>
              Monitor API endpoint performance and usage patterns
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              Chart
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        </div>

        {/* Wedding Season Alert */}
        {showWeddingContext && isWeddingSeason && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">
                Peak Wedding Season Active
              </span>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              API usage is {seasonalMultiplier}x normal levels. Monitor
              wedding-critical endpoints.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requests">Most Requests</SelectItem>
              <SelectItem value="errors">Most Errors</SelectItem>
              <SelectItem value="latency">Highest Latency</SelectItem>
              <SelectItem value="rateLimitHits">Most Rate Limits</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterBy}
            onValueChange={(value) => setFilterBy(value as any)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Endpoints</SelectItem>
              <SelectItem value="CRITICAL">Critical Only</SelectItem>
              <SelectItem value="HIGH">High Priority</SelectItem>
              <SelectItem value="MEDIUM">Medium Priority</SelectItem>
              <SelectItem value="LOW">Low Priority</SelectItem>
              <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {formatNumber(totalRequests)}
            </p>
            <p className="text-xs text-gray-600">Total Requests</p>
          </div>
          <div className="text-center">
            <p
              className={`text-lg font-bold ${errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}
            >
              {errorRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Error Rate</p>
          </div>
          <div className="text-center">
            <p
              className={`text-lg font-bold ${averageLatency > 500 ? 'text-red-600' : 'text-green-600'}`}
            >
              {averageLatency.toFixed(0)}ms
            </p>
            <p className="text-xs text-gray-600">Avg Latency</p>
          </div>
          <div className="text-center">
            <p
              className={`text-lg font-bold ${totalRateLimitHits > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {totalRateLimitHits}
            </p>
            <p className="text-xs text-gray-600">Rate Limit Hits</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {viewMode === 'chart' ? (
          <div className="space-y-4">
            {processedData.map((endpoint, index) => {
              const percentage =
                maxRequestCount > 0
                  ? (endpoint.requestCount / maxRequestCount) * 100
                  : 0;
              const healthStatus = getHealthStatus(endpoint);
              const endpointErrorRate =
                endpoint.requestCount > 0
                  ? (endpoint.errorCount / endpoint.requestCount) * 100
                  : 0;

              return (
                <div
                  key={`${endpoint.endpoint}-${endpoint.method}`}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEndpointClick?.(endpoint)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 min-w-[24px]">
                        #{index + 1}
                      </span>

                      <div
                        className={`p-2 rounded-lg border ${getRelevanceColor(endpoint.weddingIndustryRelevance)}`}
                      >
                        {getRelevanceIcon(endpoint.weddingIndustryRelevance)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {endpoint.method}
                          </Badge>
                          <p className="font-medium text-gray-900 truncate max-w-[300px]">
                            {endpoint.endpoint}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          {endpoint.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getEndpointCategory(endpoint.endpoint)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${getHealthColor(healthStatus)} border`}
                      >
                        {healthStatus}
                      </Badge>
                      <Badge variant="outline">
                        {endpoint.weddingIndustryRelevance}
                      </Badge>
                    </div>
                  </div>

                  {/* Usage Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Request Volume</span>
                      <span className="font-medium">
                        {formatNumber(endpoint.requestCount)}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon
                        className={`w-4 h-4 ${endpointErrorRate > 2 ? 'text-red-500' : 'text-green-500'}`}
                      />
                      <div>
                        <p className="font-medium">{endpoint.errorCount}</p>
                        <p className="text-xs text-gray-500">
                          Errors ({endpointErrorRate.toFixed(1)}%)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ClockIcon
                        className={`w-4 h-4 ${endpoint.averageLatency > 500 ? 'text-red-500' : 'text-green-500'}`}
                      />
                      <div>
                        <p className="font-medium">
                          {endpoint.averageLatency.toFixed(0)}ms
                        </p>
                        <p className="text-xs text-gray-500">Avg Latency</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ZapIcon
                        className={`w-4 h-4 ${endpoint.rateLimitHits > 0 ? 'text-red-500' : 'text-green-500'}`}
                      />
                      <div>
                        <p className="font-medium">{endpoint.rateLimitHits}</p>
                        <p className="text-xs text-gray-500">Rate Limits</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ActivityIcon className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">
                          {endpoint.weddingIndustryRelevance}
                        </p>
                        <p className="text-xs text-gray-500">Priority</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {(healthStatus !== 'healthy' ||
                    endpoint.rateLimitHits > 5) && (
                    <div className="mt-3 flex gap-2">
                      {onOptimizeClick && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOptimizeClick(endpoint.endpoint);
                          }}
                        >
                          Optimize
                        </Button>
                      )}

                      {endpoint.rateLimitHits > 10 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle increase rate limit
                          }}
                        >
                          Increase Limit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Endpoint</th>
                  <th className="text-center p-3">Requests</th>
                  <th className="text-center p-3">Errors</th>
                  <th className="text-center p-3">Latency</th>
                  <th className="text-center p-3">Rate Limits</th>
                  <th className="text-center p-3">Priority</th>
                  <th className="text-center p-3">Health</th>
                  <th className="text-center p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((endpoint, index) => {
                  const healthStatus = getHealthStatus(endpoint);
                  const endpointErrorRate =
                    endpoint.requestCount > 0
                      ? (endpoint.errorCount / endpoint.requestCount) * 100
                      : 0;

                  return (
                    <tr
                      key={`${endpoint.endpoint}-${endpoint.method}`}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 font-bold text-gray-500">
                        #{index + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {endpoint.method}
                          </Badge>
                          <div>
                            <p
                              className="font-medium truncate max-w-[200px]"
                              title={endpoint.endpoint}
                            >
                              {endpoint.endpoint}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getEndpointCategory(endpoint.endpoint)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium">
                        {formatNumber(endpoint.requestCount)}
                      </td>
                      <td className="p-3 text-center">
                        <div>
                          <span className="font-medium">
                            {endpoint.errorCount}
                          </span>
                          <span
                            className={`text-xs block ${endpointErrorRate > 2 ? 'text-red-600' : 'text-gray-500'}`}
                          >
                            {endpointErrorRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-medium ${endpoint.averageLatency > 500 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {endpoint.averageLatency.toFixed(0)}ms
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`font-medium ${endpoint.rateLimitHits > 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {endpoint.rateLimitHits}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {endpoint.weddingIndustryRelevance}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={`${getHealthColor(healthStatus)} border text-xs`}
                        >
                          {healthStatus}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {healthStatus !== 'healthy' && onOptimizeClick && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOptimizeClick(endpoint.endpoint)}
                          >
                            Fix
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Wedding Season Insights */}
        {showWeddingContext && isWeddingSeason && (
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">
                Wedding Season Insights
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-purple-800">
                  Critical Endpoints
                </p>
                <p className="text-purple-600">
                  {
                    processedData.filter(
                      (e) =>
                        e.weddingIndustryRelevance ===
                        WeddingRelevanceLevel.CRITICAL,
                    ).length
                  }{' '}
                  require extra monitoring
                </p>
              </div>
              <div>
                <p className="font-medium text-purple-800">Traffic Increase</p>
                <p className="text-purple-600">
                  {((seasonalMultiplier - 1) * 100).toFixed(0)}% above normal
                  levels
                </p>
              </div>
              <div>
                <p className="font-medium text-purple-800">Recommendation</p>
                <p className="text-purple-600">
                  Monitor supplier and wedding endpoints closely
                </p>
              </div>
            </div>
          </div>
        )}

        {processedData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <BarChart3Icon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No endpoint data found</p>
            <p className="text-sm">Adjust your filters or check back later</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
