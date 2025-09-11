'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cdnOptimizer } from '@/lib/performance/cdn-optimizer';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

interface GeographicMetrics {
  region: string;
  averageLatency: number;
  cacheHitRatio: number;
  errorRate: number;
  lastUpdated: number;
}

interface NetworkPerformanceData {
  networkType: string;
  count: number;
  averageLoadTime: number;
  errorRate: number;
}

interface VenuePerformanceData {
  venue: string;
  totalPhotos: number;
  averageLoadTime: number;
  networkTypes: string[];
}

const GeographicPerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Map<string, GeographicMetrics>>(
    new Map(),
  );
  const [networkData, setNetworkData] = useState<NetworkPerformanceData[]>([]);
  const [venueData, setVenueData] = useState<VenuePerformanceData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const { getAllMetrics } = usePerformanceMonitor('GeographicDashboard');

  // WS-173: Refresh geographic performance metrics
  const refreshMetrics = async () => {
    setIsRefreshing(true);
    try {
      const regionMetrics = await cdnOptimizer.getAllRegionMetrics();
      setMetrics(regionMetrics);

      // Process performance data
      const performanceMetrics = getAllMetrics();
      processNetworkData(performanceMetrics);
      processVenueData(performanceMetrics);
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // WS-173: Process network performance data
  const processNetworkData = (performanceMetrics: any[]) => {
    const networkMap = new Map<
      string,
      { totalTime: number; count: number; errors: number }
    >();

    performanceMetrics.forEach((metric) => {
      if (metric.name === 'weddingPhotoLoadTime' && metric.data?.networkType) {
        const networkType = metric.data.networkType;
        const existing = networkMap.get(networkType) || {
          totalTime: 0,
          count: 0,
          errors: 0,
        };

        existing.totalTime += metric.data.time;
        existing.count += 1;

        networkMap.set(networkType, existing);
      }

      if (metric.name === 'weddingPhotoLoadError' && metric.data?.networkType) {
        const networkType = metric.data.networkType;
        const existing = networkMap.get(networkType) || {
          totalTime: 0,
          count: 0,
          errors: 0,
        };
        existing.errors += 1;
        networkMap.set(networkType, existing);
      }
    });

    const networkData: NetworkPerformanceData[] = Array.from(
      networkMap.entries(),
    ).map(([networkType, data]) => ({
      networkType,
      count: data.count,
      averageLoadTime: data.count > 0 ? data.totalTime / data.count : 0,
      errorRate: data.count > 0 ? data.errors / data.count : 0,
    }));

    setNetworkData(networkData.sort((a, b) => b.count - a.count));
  };

  // WS-173: Process venue performance data
  const processVenueData = (performanceMetrics: any[]) => {
    const venueMap = new Map<
      string,
      { totalTime: number; count: number; networkTypes: Set<string> }
    >();

    performanceMetrics.forEach((metric) => {
      if (metric.name === 'weddingPhotoLoadTime' && metric.data?.venue) {
        const venue = metric.data.venue;
        const existing = venueMap.get(venue) || {
          totalTime: 0,
          count: 0,
          networkTypes: new Set(),
        };

        existing.totalTime += metric.data.time;
        existing.count += 1;

        if (metric.data.networkType) {
          existing.networkTypes.add(metric.data.networkType);
        }

        venueMap.set(venue, existing);
      }
    });

    const venueData: VenuePerformanceData[] = Array.from(
      venueMap.entries(),
    ).map(([venue, data]) => ({
      venue,
      totalPhotos: data.count,
      averageLoadTime: data.count > 0 ? data.totalTime / data.count : 0,
      networkTypes: Array.from(data.networkTypes),
    }));

    setVenueData(venueData.sort((a, b) => b.totalPhotos - a.totalPhotos));
  };

  // Initialize dashboard
  useEffect(() => {
    refreshMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // WS-173: Calculate overall performance score
  const overallScore = useMemo(() => {
    if (metrics.size === 0) return 0;

    let totalScore = 0;
    let count = 0;

    for (const [, metric] of metrics) {
      // Score based on latency (lower is better) and cache hit ratio (higher is better)
      const latencyScore = Math.max(0, 100 - metric.averageLatency / 10);
      const cacheScore = metric.cacheHitRatio * 100;
      const errorScore = Math.max(0, 100 - metric.errorRate * 100);

      const regionScore = (latencyScore + cacheScore + errorScore) / 3;
      totalScore += regionScore;
      count++;
    }

    return count > 0 ? Math.round(totalScore / count) : 0;
  }, [metrics]);

  const getLatencyBadgeColor = (latency: number) => {
    if (latency < 100) return 'bg-green-500';
    if (latency < 200) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCacheHitBadgeColor = (ratio: number) => {
    if (ratio > 0.9) return 'bg-green-500';
    if (ratio > 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Geographic Performance Dashboard
          </h2>
          <p className="text-gray-600">
            WS-173: CDN optimization and wedding venue performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {overallScore}%
            </div>
            <div className="text-sm text-gray-500">Overall Score</div>
          </div>
          <Button
            onClick={refreshMetrics}
            disabled={isRefreshing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}
          </Button>
        </div>
      </div>

      {/* Regional Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from(metrics.entries()).map(([region, metric]) => (
          <Card key={region} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {region}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Latency</span>
                  <Badge
                    className={`text-white ${getLatencyBadgeColor(metric.averageLatency)}`}
                  >
                    {Math.round(metric.averageLatency)}ms
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cache Hit</span>
                  <Badge
                    className={`text-white ${getCacheHitBadgeColor(metric.cacheHitRatio)}`}
                  >
                    {Math.round(metric.cacheHitRatio * 100)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <Badge
                    className={`text-white ${metric.errorRate < 0.1 ? 'bg-green-500' : 'bg-red-500'}`}
                  >
                    {Math.round(metric.errorRate * 100)}%
                  </Badge>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Network Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Network Type Performance</CardTitle>
          <p className="text-sm text-gray-600">
            Wedding photo loading performance by connection type
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Network Type</th>
                  <th className="text-left py-2 px-3">Photos Loaded</th>
                  <th className="text-left py-2 px-3">Avg Load Time</th>
                  <th className="text-left py-2 px-3">Error Rate</th>
                  <th className="text-left py-2 px-3">Performance</th>
                </tr>
              </thead>
              <tbody>
                {networkData.map((data, index) => (
                  <tr
                    key={data.networkType}
                    className={index % 2 === 0 ? 'bg-gray-50' : ''}
                  >
                    <td className="py-2 px-3 font-medium">
                      {data.networkType}
                    </td>
                    <td className="py-2 px-3">{data.count.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <Badge
                        className={`${getLatencyBadgeColor(data.averageLoadTime)} text-white`}
                      >
                        {Math.round(data.averageLoadTime)}ms
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      {Math.round(data.errorRate * 100)}%
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.max(10, Math.min(100, 100 - data.averageLoadTime / 50))}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Venue Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Venue Performance</CardTitle>
          <p className="text-sm text-gray-600">
            Photo loading performance by wedding venue
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Venue</th>
                  <th className="text-left py-2 px-3">Total Photos</th>
                  <th className="text-left py-2 px-3">Avg Load Time</th>
                  <th className="text-left py-2 px-3">Network Types</th>
                </tr>
              </thead>
              <tbody>
                {venueData.slice(0, 10).map((data, index) => (
                  <tr
                    key={data.venue}
                    className={index % 2 === 0 ? 'bg-gray-50' : ''}
                  >
                    <td className="py-2 px-3 font-medium">{data.venue}</td>
                    <td className="py-2 px-3">
                      {data.totalPhotos.toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        className={`${getLatencyBadgeColor(data.averageLoadTime)} text-white`}
                      >
                        {Math.round(data.averageLoadTime)}ms
                      </Badge>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {data.networkTypes.map((networkType) => (
                          <Badge
                            key={networkType}
                            variant="outline"
                            className="text-xs"
                          >
                            {networkType}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {overallScore < 80 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="font-medium text-yellow-800">
                  Performance Alert
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  Overall performance score is below 80%. Consider optimizing
                  CDN configuration.
                </div>
              </div>
            )}

            {networkData.some((data) => data.errorRate > 0.1) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="font-medium text-red-800">
                  High Error Rate Detected
                </div>
                <div className="text-sm text-red-700 mt-1">
                  Some network types are experiencing high error rates. Check
                  CDN health.
                </div>
              </div>
            )}

            {Array.from(metrics.values()).some(
              (metric) => metric.cacheHitRatio < 0.9,
            ) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-800">
                  Cache Optimization Opportunity
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Cache hit ratio is below 90% for some regions. Review caching
                  strategies.
                </div>
              </div>
            )}

            {networkData.some(
              (data) =>
                data.networkType === 'slow-2g' && data.averageLoadTime > 5000,
            ) && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="font-medium text-purple-800">
                  Slow Network Optimization
                </div>
                <div className="text-sm text-purple-700 mt-1">
                  Wedding photos are loading slowly on 2G connections. Consider
                  further compression.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeographicPerformanceDashboard;
