'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Camera,
  Music,
  Utensils,
  Flower,
  Car,
  Building,
  Award,
  Target,
  Activity,
  BarChart3,
} from 'lucide-react';

interface VendorMetrics {
  vendorId: string;
  name: string;
  category:
    | 'photography'
    | 'videography'
    | 'catering'
    | 'venue'
    | 'flowers'
    | 'music'
    | 'transport'
    | 'other';
  rating: number;
  totalReviews: number;
  responseRate: number;
  availability: number;
  pricePoint: 'budget' | 'mid-range' | 'premium' | 'luxury';
  bookingTrend: 'increasing' | 'stable' | 'decreasing';
  seasonalDemand: Array<{
    month: string;
    demand: number;
    avgPrice: number;
  }>;
  performanceScore: number;
  reliability: number;
  customerSatisfaction: number;
  growthPotential: number;
  riskFactors: string[];
  strengths: string[];
  weaknesses: string[];
  predictedRevenue: number;
  bookingProbability: number;
  competitorAnalysis: {
    marketPosition: number;
    priceCompetitiveness: number;
    serviceQuality: number;
  };
}

interface VendorPerformanceData {
  topPerformers: VendorMetrics[];
  categoryAnalysis: Array<{
    category: string;
    avgRating: number;
    totalVendors: number;
    demandTrend: 'up' | 'down' | 'stable';
    avgPrice: number;
    saturation: number;
    growthOpportunity: number;
  }>;
  marketTrends: Array<{
    month: string;
    totalBookings: number;
    avgRating: number;
    avgPrice: number;
    cancellationRate: number;
  }>;
  regionalInsights: Array<{
    region: string;
    vendorCount: number;
    avgRating: number;
    demandLevel: number;
    priceIndex: number;
  }>;
  riskAlerts: Array<{
    vendorId: string;
    vendorName: string;
    riskType: 'quality' | 'availability' | 'pricing' | 'reliability';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  predictions: {
    nextMonthBookings: number;
    revenueProjection: number;
    marketGrowth: number;
    topGrowthCategories: string[];
  };
}

interface VendorPerformanceAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  category?: string;
  region?: string;
  priceRange?: 'all' | 'budget' | 'mid-range' | 'premium' | 'luxury';
  onVendorSelect?: (vendor: VendorMetrics) => void;
}

const CATEGORY_COLORS = {
  photography: '#8B5CF6',
  videography: '#06B6D4',
  catering: '#10B981',
  venue: '#F59E0B',
  flowers: '#EC4899',
  music: '#EF4444',
  transport: '#6366F1',
  other: '#6B7280',
};

const CATEGORY_ICONS = {
  photography: Camera,
  videography: Camera,
  catering: Utensils,
  venue: Building,
  flowers: Flower,
  music: Music,
  transport: Car,
  other: Star,
};

export default function VendorPerformanceAnalytics({
  timeRange = '30d',
  category = 'all',
  region = 'all',
  priceRange = 'all',
  onVendorSelect,
}: VendorPerformanceAnalyticsProps) {
  const [performanceData, setPerformanceData] =
    useState<VendorPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'performers' | 'categories' | 'risks' | 'trends'
  >('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedRegion, setSelectedRegion] = useState(region);
  const [error, setError] = useState<string | null>(null);

  const fetchVendorPerformance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/vendor-performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: selectedTimeRange,
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          region: selectedRegion === 'all' ? undefined : selectedRegion,
          priceRange: priceRange === 'all' ? undefined : priceRange,
          includeRiskAnalysis: true,
          includePredictions: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendor performance data');
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Vendor performance error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorPerformance();
  }, [selectedTimeRange, selectedCategory, selectedRegion, priceRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    const Icon =
      CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Star;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Vendor Performance Analytics
          </CardTitle>
          <CardDescription>
            Analyzing vendor performance, ratings, and market trends...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading vendor performance data: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchVendorPerformance}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!performanceData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            Vendor Performance Analytics
          </CardTitle>
          <CardDescription>
            AI-powered vendor performance analysis and market intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Range
              </label>
              <Select
                value={selectedTimeRange}
                onValueChange={setSelectedTimeRange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="videography">Videography</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="venue">Venues</SelectItem>
                  <SelectItem value="flowers">Flowers</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="southeast">South East</SelectItem>
                  <SelectItem value="southwest">South West</SelectItem>
                  <SelectItem value="midlands">Midlands</SelectItem>
                  <SelectItem value="north">North</SelectItem>
                  <SelectItem value="scotland">Scotland</SelectItem>
                  <SelectItem value="wales">Wales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchVendorPerformance} className="w-full">
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Predicted Bookings
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {performanceData.predictions.nextMonthBookings}
                </p>
                <p className="text-sm text-gray-500">next month</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Revenue Projection
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    performanceData.predictions.revenueProjection,
                  )}
                </p>
                <p className="text-sm text-gray-500">projected</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Market Growth
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  +{performanceData.predictions.marketGrowth.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">year over year</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  High Risk Vendors
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {
                    performanceData.riskAlerts.filter(
                      (r) => r.severity === 'high',
                    ).length
                  }
                </p>
                <p className="text-sm text-gray-500">need attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={selectedView} onValueChange={setSelectedView as any}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performers">Top Performers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Score Distribution</CardTitle>
                <CardDescription>
                  Vendor performance across all categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: 'Excellent (85-100)',
                          value: 25,
                          color: '#10B981',
                        },
                        { name: 'Good (70-84)', value: 45, color: '#F59E0B' },
                        {
                          name: 'Average (50-69)',
                          value: 25,
                          color: '#6B7280',
                        },
                        { name: 'Poor (<50)', value: 5, color: '#EF4444' },
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                    >
                      {[
                        { color: '#10B981' },
                        { color: '#F59E0B' },
                        { color: '#6B7280' },
                        { color: '#EF4444' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>
                  Average ratings and demand trends by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.categoryAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgRating" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Growth Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>Growth Opportunities</CardTitle>
              <CardDescription>
                Categories with highest growth potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {performanceData.predictions.topGrowthCategories
                  .slice(0, 3)
                  .map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-4 border rounded-lg"
                    >
                      {getCategoryIcon(category)}
                      <div>
                        <h3 className="font-medium capitalize">{category}</h3>
                        <p className="text-sm text-gray-600">
                          High growth potential
                        </p>
                      </div>
                      <Badge variant="default">#{index + 1}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vendors</CardTitle>
              <CardDescription>
                Highest rated vendors with detailed performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {performanceData.topPerformers
                  .slice(0, 10)
                  .map((vendor, index) => (
                    <div
                      key={vendor.vendorId}
                      className="border rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={`/api/vendors/${vendor.vendorId}/avatar`}
                            />
                            <AvatarFallback>
                              {vendor.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{vendor.name}</h3>
                              <Badge variant="outline">#{index + 1}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getCategoryIcon(vendor.category)}
                              <span className="text-sm text-gray-600 capitalize">
                                {vendor.category}
                              </span>
                              <Badge>{vendor.pricePoint}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onVendorSelect?.(vendor)}
                        >
                          View Details
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {vendor.rating.toFixed(1)}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({vendor.totalReviews})
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Performance</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${getPerformanceColor(vendor.performanceScore)}`}
                            >
                              {vendor.performanceScore}
                            </span>
                            <Progress
                              value={vendor.performanceScore}
                              className="h-2 flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Availability</p>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {vendor.availability}%
                            </span>
                            <Badge
                              variant={
                                vendor.availability > 70
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {vendor.availability > 70 ? 'Available' : 'Busy'}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Response Rate</p>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {vendor.responseRate}%
                            </span>
                            {vendor.responseRate > 90 ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-600" />
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Booking Trend</p>
                          <div className="flex items-center gap-2">
                            {vendor.bookingTrend === 'increasing' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : vendor.bookingTrend === 'decreasing' ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <Activity className="h-4 w-4 text-gray-600" />
                            )}
                            <span className="text-sm capitalize">
                              {vendor.bookingTrend}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-green-600 mb-2">
                            Strengths
                          </p>
                          <div className="space-y-1">
                            {vendor.strengths
                              .slice(0, 3)
                              .map((strength, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  {strength}
                                </div>
                              ))}
                          </div>
                        </div>

                        {vendor.weaknesses.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-yellow-600 mb-2">
                              Areas for Improvement
                            </p>
                            <div className="space-y-1">
                              {vendor.weaknesses
                                .slice(0, 3)
                                .map((weakness, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                    {weakness}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {performanceData.categoryAnalysis.map((category, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(category.category)}
                    <span className="capitalize">{category.category}</span>
                    <Badge
                      variant={
                        category.demandTrend === 'up'
                          ? 'default'
                          : category.demandTrend === 'down'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {category.demandTrend}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {category.totalVendors} vendors • Avg: £
                    {category.avgPrice.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Average Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {category.avgRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Market Saturation
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {category.saturation}%
                          </span>
                          <Progress
                            value={category.saturation}
                            className="h-2 flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Growth Opportunity
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={category.growthOpportunity}
                          className="h-3 flex-1"
                        />
                        <span className="text-sm font-medium">
                          {category.growthOpportunity}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Risk Analysis
              </CardTitle>
              <CardDescription>
                Vendors requiring attention and risk mitigation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performanceData.riskAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-medium">
                    No Critical Risks Detected
                  </p>
                  <p className="text-gray-600">
                    All vendors are performing within acceptable parameters
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {performanceData.riskAlerts.map((alert, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              alert.severity === 'high'
                                ? 'text-red-600'
                                : alert.severity === 'medium'
                                  ? 'text-yellow-600'
                                  : 'text-gray-600'
                            }`}
                          />
                          <div>
                            <h3 className="font-medium">{alert.vendorName}</h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {alert.riskType} Risk
                            </p>
                          </div>
                        </div>
                        <Badge variant={getRiskColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>

                      <p className="text-sm mb-3">{alert.description}</p>

                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Recommendation:</strong>{' '}
                          {alert.recommendation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Market Trends</CardTitle>
              <CardDescription>
                Booking patterns, pricing, and quality trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceData.marketTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'avgPrice'
                        ? formatCurrency(value as number)
                        : value,
                      name === 'totalBookings'
                        ? 'Total Bookings'
                        : name === 'avgRating'
                          ? 'Avg Rating'
                          : name === 'avgPrice'
                            ? 'Avg Price'
                            : 'Cancellation Rate',
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalBookings" fill="#8B5CF6" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgRating"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgPrice"
                    stroke="#F59E0B"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cancellationRate"
                    stroke="#EF4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Performance</CardTitle>
                <CardDescription>Vendor performance by region</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.regionalInsights.map((region, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium capitalize">
                            {region.region}
                          </p>
                          <p className="text-sm text-gray-600">
                            {region.vendorCount} vendors
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">
                            {region.avgRating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Price Index: {region.priceIndex.toFixed(2)}x
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demand Heatmap</CardTitle>
                <CardDescription>
                  High-demand regions and categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {performanceData.regionalInsights
                    .sort((a, b) => b.demandLevel - a.demandLevel)
                    .slice(0, 5)
                    .map((region, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Badge variant={index < 2 ? 'default' : 'secondary'}>
                          #{index + 1}
                        </Badge>
                        <span className="capitalize flex-1">
                          {region.region}
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={region.demandLevel}
                            className="h-2 w-20"
                          />
                          <span className="text-sm font-medium">
                            {region.demandLevel}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
