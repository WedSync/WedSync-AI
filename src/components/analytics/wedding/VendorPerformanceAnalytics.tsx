'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';

const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const RadarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.RadarChart })),
  { ssr: false },
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const Radar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Radar })),
  { ssr: false },
);
const PolarGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PolarGrid })),
  { ssr: false },
);
const PolarAngleAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PolarAngleAxis })),
  { ssr: false },
);
const PolarRadiusAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PolarRadiusAxis })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
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
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);

import {
  VendorPerformanceAnalytics,
  VendorPerformance,
  VendorCategory,
} from '@/lib/analytics/wedding-metrics';

interface VendorPerformanceAnalyticsProps {
  weddingId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface VendorAnalyticsData {
  analytics: VendorPerformanceAnalytics[];
  individual_vendors: VendorPerformance[];
}

const VENDOR_CATEGORY_COLORS: Record<VendorCategory, string> = {
  catering: '#FF6B6B',
  photography: '#4ECDC4',
  videography: '#45B7D1',
  florals: '#96CEB4',
  venue: '#FFEAA7',
  music: '#DDA0DD',
  transportation: '#FFB347',
  attire: '#F8BBD0',
  beauty: '#FFCCCB',
  decorations: '#C5E1A5',
  entertainment: '#FFAB91',
  planning: '#81C784',
  other: '#B0BEC5',
};

const VendorPerformanceAnalyticsComponent: React.FC<
  VendorPerformanceAnalyticsProps
> = ({ weddingId, autoRefresh = true, refreshInterval = 30 }) => {
  const [data, setData] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    VendorCategory | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<
    'reliability' | 'rating' | 'cost_variance'
  >('reliability');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch vendor analytics data
  const fetchVendorAnalytics = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const [analyticsResponse, vendorsResponse] = await Promise.all([
          fetch(`/api/analytics/wedding/${weddingId}?type=vendors`),
          fetch(`/api/vendors/${weddingId}/performance`),
        ]);

        if (!analyticsResponse.ok || !vendorsResponse.ok) {
          throw new Error('Failed to fetch vendor analytics');
        }

        const [analyticsResult, vendorsResult] = await Promise.all([
          analyticsResponse.json(),
          vendorsResponse.json(),
        ]);

        setData({
          analytics: analyticsResult.data,
          individual_vendors: vendorsResult.data || [],
        });

        setLastUpdated(analyticsResult.timestamp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [weddingId],
  );

  // Auto-refresh functionality
  useEffect(() => {
    fetchVendorAnalytics();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(
        () => fetchVendorAnalytics(false),
        refreshInterval * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchVendorAnalytics, autoRefresh, refreshInterval]);

  // Filter and sort vendor data
  const filteredVendors = useMemo(() => {
    if (!data?.individual_vendors) return [];

    let filtered = data.individual_vendors;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (vendor) => vendor.vendor_category === selectedCategory,
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reliability':
          return b.reliability_score - a.reliability_score;
        case 'rating':
          return b.quality_rating - a.quality_rating;
        case 'cost_variance':
          return a.cost_variance - b.cost_variance;
        default:
          return 0;
      }
    });
  }, [data?.individual_vendors, selectedCategory, sortBy]);

  // Chart data transformations
  const performanceByCategory = useMemo(() => {
    if (!data?.analytics) return [];

    return data.analytics.map((analytics) => ({
      category: analytics.vendor_category,
      reliability: analytics.avg_reliability_score,
      communication: analytics.avg_communication_rating,
      quality: analytics.avg_quality_rating,
      responseTime: analytics.avg_response_time_hours,
      costVariance: analytics.avg_cost_variance,
      onTimeDelivery:
        Math.round(
          (analytics.on_time_deliveries /
            (analytics.on_time_deliveries + analytics.delayed_deliveries)) *
            100,
        ) || 0,
    }));
  }, [data?.analytics]);

  const deliveryStatusData = useMemo(() => {
    if (!data?.analytics) return [];

    const totalOnTime = data.analytics.reduce(
      (sum, analytics) => sum + analytics.on_time_deliveries,
      0,
    );
    const totalDelayed = data.analytics.reduce(
      (sum, analytics) => sum + analytics.delayed_deliveries,
      0,
    );
    const totalCompleted = data.analytics.reduce(
      (sum, analytics) => sum + analytics.completed_vendors,
      0,
    );
    const totalActive = data.analytics.reduce(
      (sum, analytics) => sum + analytics.active_vendors,
      0,
    );

    return [
      { name: 'On Time', value: totalOnTime, color: '#22C55E' },
      { name: 'Delayed', value: totalDelayed, color: '#EF4444' },
      { name: 'In Progress', value: totalActive, color: '#F59E0B' },
    ];
  }, [data?.analytics]);

  const costVarianceData = useMemo(() => {
    if (!data?.analytics) return [];

    return data.analytics
      .map((analytics) => ({
        category: analytics.vendor_category,
        budgetedTotal: analytics.total_quoted,
        actualTotal: analytics.total_actual,
        variance: analytics.avg_cost_variance,
        varianceAmount: analytics.total_actual - analytics.total_quoted,
      }))
      .filter((item) => item.budgetedTotal > 0);
  }, [data?.analytics]);

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= -10) return 'text-green-600';
    if (variance <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchVendorAnalytics()}
          className="ml-2"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading vendor analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-analytics-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Vendor Performance Analytics
          </h2>
          <p className="text-muted-foreground">
            Track vendor ratings, delivery times, and cost management
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value: any) => setSelectedCategory(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="catering">Catering</SelectItem>
              <SelectItem value="photography">Photography</SelectItem>
              <SelectItem value="videography">Videography</SelectItem>
              <SelectItem value="florals">Florals</SelectItem>
              <SelectItem value="venue">Venue</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="transportation">Transportation</SelectItem>
              <SelectItem value="attire">Attire</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="decorations">Decorations</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value: any) => setSortBy(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reliability">Reliability</SelectItem>
              <SelectItem value="rating">Quality Rating</SelectItem>
              <SelectItem value="cost_variance">Cost Variance</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => fetchVendorAnalytics()}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Overview Charts */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceByCategory}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 5]} tick={false} />
                  <Radar
                    name="Reliability"
                    dataKey="reliability"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Quality"
                    dataKey="quality"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Communication"
                    dataKey="communication"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Delivery Status */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deliveryStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deliveryStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value}`, 'Deliveries']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cost Variance Analysis */}
      {costVarianceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Variance by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costVarianceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="budgetedTotal" fill="#3B82F6" name="Budgeted" />
                <Bar dataKey="actualTotal" fill="#EF4444" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Individual Vendor Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Vendor Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{vendor.vendor_name}</h4>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor:
                          VENDOR_CATEGORY_COLORS[vendor.vendor_category],
                        color: VENDOR_CATEGORY_COLORS[vendor.vendor_category],
                      }}
                    >
                      {vendor.vendor_category}
                    </Badge>
                    <Badge
                      variant={
                        vendor.vendor_status === 'delivered'
                          ? 'default'
                          : vendor.vendor_status === 'in_progress'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {vendor.vendor_status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span
                        className={getPerformanceColor(
                          vendor.reliability_score,
                        )}
                      >
                        {vendor.reliability_score.toFixed(1)}/5.0
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>{vendor.response_time_hours}h response</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className={getVarianceColor(vendor.cost_variance)}>
                        {vendor.cost_variance > 0 ? '+' : ''}
                        {vendor.cost_variance.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {vendor.delivery_delay_days ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <span>
                        {vendor.delivery_delay_days
                          ? `${vendor.delivery_delay_days} days late`
                          : 'On time'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="font-semibold">
                      ${vendor.actual_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      vs ${vendor.quoted_amount.toLocaleString()} quoted
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= vendor.quality_rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {vendor.quality_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorPerformanceAnalyticsComponent;
