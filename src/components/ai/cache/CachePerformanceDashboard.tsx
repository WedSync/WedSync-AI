'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Clock,
  Database,
  Zap,
  DollarSign,
  Activity,
  Settings,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type {
  CachePerformanceDashboardProps,
  CacheStats,
  CachePerformance,
  SeasonalData,
  SupplierType,
  TimeRange,
  CacheTypeStats,
  PopularQuery,
} from '@/types/ai-cache';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
}) => {
  const options: { value: TimeRange; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
};

// Cache Type Performance Row Component
interface CacheTypePerformanceRowProps {
  cacheType: CacheTypeStats;
  supplierType: SupplierType;
}

const CacheTypePerformanceRow: React.FC<CacheTypePerformanceRowProps> = ({
  cacheType,
  supplierType,
}) => {
  const getSupplierSpecificInsights = (
    type: string,
    supplierType: SupplierType,
  ): string => {
    const insights: Record<SupplierType, Record<string, string>> = {
      photographer: {
        chatbot: 'Client photo session inquiries',
        email_templates: 'Wedding day timeline emails',
        content_generation: 'Portfolio descriptions',
      },
      wedding_planner: {
        chatbot: 'Vendor coordination questions',
        email_templates: 'Client update communications',
        content_generation: 'Timeline planning content',
      },
      venue: {
        chatbot: 'Availability and pricing queries',
        email_templates: 'Event coordination emails',
        content_generation: 'Venue description content',
      },
      catering: {
        chatbot: 'Menu and dietary inquiries',
        email_templates: 'Catering coordination emails',
        content_generation: 'Menu descriptions',
      },
      florist: {
        chatbot: 'Arrangement and seasonal inquiries',
        email_templates: 'Delivery coordination emails',
        content_generation: 'Floral arrangement descriptions',
      },
      band: {
        chatbot: 'Music and availability inquiries',
        email_templates: 'Performance logistics emails',
        content_generation: 'Repertoire descriptions',
      },
      dj: {
        chatbot: 'Equipment and music inquiries',
        email_templates: 'Setup coordination emails',
        content_generation: 'Service descriptions',
      },
      decorator: {
        chatbot: 'Design and theme inquiries',
        email_templates: 'Setup coordination emails',
        content_generation: 'Design concept descriptions',
      },
    };

    return insights[supplierType]?.[type] || 'General AI responses';
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                cacheType.hitRate >= 80
                  ? 'bg-green-500'
                  : cacheType.hitRate >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="font-medium">
              {cacheType.type.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <Badge
            variant={
              cacheType.hitRate >= 80
                ? 'default'
                : cacheType.hitRate >= 60
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {cacheType.hitRate.toFixed(1)}% hit rate
          </Badge>
        </div>
        <div className="text-right">
          <div className="font-medium text-green-600">
            £{cacheType.savingsThisMonth.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {cacheType.entries} entries
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {getSupplierSpecificInsights(cacheType.type, supplierType)}
      </div>

      <Progress value={cacheType.hitRate} className="h-2" />

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Quality:</span>
          <span className="ml-1 font-medium">
            {cacheType.avgQuality.toFixed(1)}/5
          </span>
        </div>
        <div>
          <span className="text-gray-500">Cached:</span>
          <span className="ml-1 font-medium text-green-600">
            {Math.round(cacheType.responseTimes.cached)}ms
          </span>
        </div>
        <div>
          <span className="text-gray-500">Generated:</span>
          <span className="ml-1 font-medium text-gray-400">
            {Math.round(cacheType.responseTimes.generated)}ms
          </span>
        </div>
      </div>
    </div>
  );
};

// Popular Query Row Component
interface PopularQueryRowProps {
  query: PopularQuery;
  rank: number;
  supplierType: SupplierType;
}

const PopularQueryRow: React.FC<PopularQueryRowProps> = ({
  query,
  rank,
  supplierType,
}) => {
  const getWeddingContextIcon = (queryText: string): string => {
    if (queryText.includes('pricing') || queryText.includes('cost'))
      return '💰';
    if (queryText.includes('timeline') || queryText.includes('schedule'))
      return '📅';
    if (queryText.includes('photo') || queryText.includes('picture'))
      return '📸';
    if (queryText.includes('venue') || queryText.includes('location'))
      return '🏛️';
    if (queryText.includes('guest') || queryText.includes('people'))
      return '👥';
    return '💭';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
          {rank}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{getWeddingContextIcon(query.text)}</span>
          <span className="font-medium text-sm">
            {query.text.substring(0, 60)}...
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline" className="text-xs">
          {query.hitCount} hits
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {(query.avgConfidence * 100).toFixed(0)}% confidence
        </Badge>
        <div className="text-green-600 font-medium">
          £{query.savings.toFixed(2)} saved
        </div>
      </div>
    </div>
  );
};

// Seasonal Insights Display Component
interface SeasonalInsightsDisplayProps {
  currentSeason: string | undefined;
  seasonalData: SeasonalData | null;
  supplierType: SupplierType;
}

const SeasonalInsightsDisplay: React.FC<SeasonalInsightsDisplayProps> = ({
  currentSeason,
  seasonalData,
  supplierType,
}) => {
  if (!seasonalData || !currentSeason) {
    return (
      <div className="text-center py-4 text-gray-500">
        No seasonal data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">Current Season</span>
        <Badge variant={currentSeason === 'peak' ? 'default' : 'secondary'}>
          {currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)}{' '}
          Season
        </Badge>
      </div>

      <div className="text-sm text-gray-600">
        Seasonal multiplier: {seasonalData.seasonalMultiplier}x query volume
      </div>

      <div className="space-y-2">
        {seasonalData.recommendations
          .filter((rec) => rec.supplierTypes.includes(supplierType))
          .slice(0, 3)
          .map((rec, index) => (
            <div key={index} className="p-2 bg-blue-50 rounded text-sm">
              <div className="font-medium text-blue-800">{rec.title}</div>
              <div className="text-blue-600">{rec.description}</div>
            </div>
          ))}
      </div>
    </div>
  );
};

// Cache Optimization Recommendations Component
interface CacheOptimizationRecommendationsProps {
  stats: CacheStats | null;
  performance: CachePerformance | null;
  supplierType: SupplierType;
}

const CacheOptimizationRecommendations: React.FC<
  CacheOptimizationRecommendationsProps
> = ({ stats, performance, supplierType }) => {
  if (!stats || !performance) {
    return <div>No recommendations available</div>;
  }

  const recommendations = [];

  // Hit rate recommendation
  if (stats.overall.hitRate < 70) {
    recommendations.push({
      title: 'Improve Cache Hit Rate',
      description:
        'Your hit rate is below optimal. Consider warming popular queries.',
      priority: 'high' as const,
      action:
        'Enable automatic cache warming for your most common client questions.',
    });
  }

  // Response time recommendation
  if (stats.overall.averageResponseTime > 200) {
    recommendations.push({
      title: 'Optimize Response Times',
      description:
        'Response times can be improved with better cache configuration.',
      priority: 'medium' as const,
      action: 'Adjust semantic thresholds and enable more aggressive caching.',
    });
  }

  // Storage optimization
  const storageUsedMB =
    parseFloat(stats.overall.storageUsed.replace('MB', '')) || 0;
  if (storageUsedMB > 800) {
    recommendations.push({
      title: 'Optimize Storage Usage',
      description:
        'Cache storage is getting full. Consider cleanup strategies.',
      priority: 'medium' as const,
      action: 'Enable automatic cleanup of low-quality or old cache entries.',
    });
  }

  return (
    <div className="space-y-4">
      {recommendations.length === 0 ? (
        <div className="flex items-center gap-2 text-green-700">
          <Zap className="h-4 w-4" />
          <span>
            Your cache is performing optimally! No recommendations at this time.
          </span>
        </div>
      ) : (
        recommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high'
                ? 'border-red-400 bg-red-50'
                : rec.priority === 'medium'
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-blue-400 bg-blue-50'
            }`}
          >
            <div className="font-medium text-gray-800">{rec.title}</div>
            <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
            <div className="text-sm font-medium mt-2">{rec.action}</div>
          </div>
        ))
      )}
    </div>
  );
};

// Main Dashboard Component
export default function CachePerformanceDashboard({
  supplierId,
  supplierType,
}: CachePerformanceDashboardProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [performance, setPerformance] = useState<CachePerformance | null>(null);
  const [seasonal, setSeasonal] = useState<SeasonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  useEffect(() => {
    loadCacheData();
  }, [supplierId, timeRange]);

  const loadCacheData = async () => {
    try {
      const [statsRes, performanceRes, seasonalRes] = await Promise.all([
        fetch(
          `/api/ai/cache/stats?supplier_id=${supplierId}&range=${timeRange}`,
        ),
        fetch(
          `/api/ai/cache/performance?supplier_id=${supplierId}&range=${timeRange}`,
        ),
        fetch(`/api/ai/cache/seasonal?supplier_id=${supplierId}`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (performanceRes.ok) setPerformance(await performanceRes.json());
      if (seasonalRes.ok) setSeasonal(await seasonalRes.json());
    } catch (error) {
      console.error('Error loading cache data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
          <span>Loading AI cache performance...</span>
        </div>
      </div>
    );
  }

  const hitRate = stats?.overall.hitRate || 0;
  const monthlySavings = stats?.overall.monthlySavings || 0;
  const avgResponseTime = performance?.averageResponseTime || 0;

  return (
    <div className="space-y-6">
      {/* Header with key metrics and controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Cache Performance</h1>
          <p className="text-gray-600 mt-1">
            Optimize AI costs and response times for your{' '}
            {supplierType.replace('_', ' ')} business
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/dashboard/ai/cache/config', '_blank')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Cache
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-green-700">
              {hitRate.toFixed(1)}%
            </div>
            <Progress value={hitRate} className="mt-2 h-2" />
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {hitRate >= 80
                ? 'Excellent'
                : hitRate >= 65
                  ? 'Good'
                  : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Savings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-blue-700">
              £{monthlySavings.toFixed(2)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              vs £{(monthlySavings / (hitRate / 100)).toFixed(2)} without
              caching
            </p>
            <div className="mt-2 text-xs text-gray-600">
              {stats?.overall.totalQueries.toLocaleString()} queries this month
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-purple-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-purple-700">
              {avgResponseTime}ms
            </div>
            <p className="text-xs text-purple-600 mt-1">
              {avgResponseTime < 100
                ? '⚡ Lightning fast'
                : avgResponseTime < 300
                  ? '🚀 Very fast'
                  : '🐌 Could be faster'}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              vs {(avgResponseTime * 8).toFixed(0)}ms without cache
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100 opacity-50" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-orange-700">
              {stats?.overall.storageUsed || '0MB'}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              {stats?.overall.cacheEntries.toLocaleString() || 0} entries
            </p>
            <Progress
              value={
                (parseFloat(stats?.overall.storageUsed || '0') / 1000) * 100
              }
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Cache Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance?.metrics || []}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                  className="text-xs"
                />
                <YAxis
                  yAxisId="percentage"
                  domain={[0, 100]}
                  className="text-xs"
                />
                <YAxis yAxisId="time" orientation="right" className="text-xs" />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'hitRate'
                      ? `${value.toFixed(1)}%`
                      : name === 'responseTime'
                        ? `${Math.round(value)}ms`
                        : name === 'savings'
                          ? `£${value.toFixed(2)}`
                          : value.toFixed(2),
                    name === 'hitRate'
                      ? 'Hit Rate'
                      : name === 'responseTime'
                        ? 'Response Time'
                        : name === 'savings'
                          ? 'Hourly Savings'
                          : 'Quality Score',
                  ]}
                />
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="hitRate"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  name="hitRate"
                />
                <Line
                  yAxisId="time"
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="responseTime"
                />
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="savings"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="savings"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cache Types Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Cache Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byType.map((cacheType) => (
                <CacheTypePerformanceRow
                  key={cacheType.type}
                  cacheType={cacheType}
                  supplierType={supplierType}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seasonal Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SeasonalInsightsDisplay
                currentSeason={seasonal?.currentSeason}
                seasonalData={seasonal}
                supplierType={supplierType}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Cached Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Most Cached Queries</CardTitle>
          <p className="text-sm text-gray-600">
            Your most frequently cached AI responses - optimize these for
            maximum savings
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performance?.topQueries.slice(0, 8).map((query, index) => (
              <PopularQueryRow
                key={index}
                query={query}
                rank={index + 1}
                supplierType={supplierType}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CacheOptimizationRecommendations
            stats={stats}
            performance={performance}
            supplierType={supplierType}
          />
        </CardContent>
      </Card>
    </div>
  );
}
