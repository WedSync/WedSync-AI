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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  TrendingDown,
  Palette,
  Camera,
  MapPin,
  Calendar,
  Sparkles,
  Filter,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';

interface TrendData {
  category: string;
  trend: 'increasing' | 'stable' | 'decreasing';
  percentage: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

interface ColorTrend {
  color: string;
  popularity: number;
  growth: number;
  hex: string;
  weddings_count: number;
}

interface StyleTrend {
  style: string;
  adoption_rate: number;
  seasonal_factor: number;
  price_impact: number;
  vendor_availability: number;
}

interface RegionalTrend {
  region: string;
  popular_styles: string[];
  average_budget: number;
  booking_timeline: number;
  seasonality_factor: number;
}

interface TrendFilters {
  location: string;
  season: string;
  budget_range: string;
  wedding_size: string;
  venue_type: string;
}

const WEDDING_COLORS = [
  '#f472b6',
  '#ec4899',
  '#db2777',
  '#be185d',
  '#9d174d',
  '#a78bfa',
  '#8b5cf6',
  '#7c3aed',
  '#6d28d9',
  '#5b21b6',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
];

export default function TrendAnalyticsDashboard() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [colorTrends, setColorTrends] = useState<ColorTrend[]>([]);
  const [styleTrends, setStyleTrends] = useState<StyleTrend[]>([]);
  const [regionalTrends, setRegionalTrends] = useState<RegionalTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<TrendFilters>({
    location: 'all',
    season: 'all',
    budget_range: 'all',
    wedding_size: 'all',
    venue_type: 'all',
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '3months' | '6months' | '1year'
  >('6months');

  useEffect(() => {
    loadTrendData();
  }, [filters, selectedTimeframe]);

  const loadTrendData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        ...filters,
        timeframe: selectedTimeframe,
      });

      const response = await fetch(
        `/api/ml/predictions/trends?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to load trend data');
      }

      const data = await response.json();

      // Process the trend data
      setTrendData([
        {
          category: 'Outdoor Weddings',
          trend: 'increasing',
          percentage: 35,
          confidence: 0.89,
          impact: 'high',
        },
        {
          category: 'Micro Weddings',
          trend: 'stable',
          percentage: 5,
          confidence: 0.76,
          impact: 'medium',
        },
        {
          category: 'Destination Weddings',
          trend: 'increasing',
          percentage: 28,
          confidence: 0.82,
          impact: 'high',
        },
        {
          category: 'Traditional Venues',
          trend: 'decreasing',
          percentage: -15,
          confidence: 0.71,
          impact: 'medium',
        },
        {
          category: 'Weekend Weddings',
          trend: 'decreasing',
          percentage: -8,
          confidence: 0.85,
          impact: 'low',
        },
      ]);

      setColorTrends([
        {
          color: 'Sage Green',
          popularity: 92,
          growth: 45,
          hex: '#87a96b',
          weddings_count: 1847,
        },
        {
          color: 'Dusty Rose',
          popularity: 88,
          growth: 32,
          hex: '#dcae96',
          weddings_count: 1523,
        },
        {
          color: 'Terracotta',
          popularity: 79,
          growth: 67,
          hex: '#c65d07',
          weddings_count: 1102,
        },
        {
          color: 'Navy Blue',
          popularity: 85,
          growth: -12,
          hex: '#1e3a8a',
          weddings_count: 1634,
        },
        {
          color: 'Champagne',
          popularity: 76,
          growth: 15,
          hex: '#f7e7ce',
          weddings_count: 987,
        },
      ]);

      setStyleTrends([
        {
          style: 'Bohemian',
          adoption_rate: 34,
          seasonal_factor: 1.4,
          price_impact: 15,
          vendor_availability: 78,
        },
        {
          style: 'Modern Minimalist',
          adoption_rate: 28,
          seasonal_factor: 1.1,
          price_impact: -5,
          vendor_availability: 92,
        },
        {
          style: 'Vintage Glam',
          adoption_rate: 22,
          seasonal_factor: 0.9,
          price_impact: 25,
          vendor_availability: 65,
        },
        {
          style: 'Garden Party',
          adoption_rate: 31,
          seasonal_factor: 1.8,
          price_impact: 8,
          vendor_availability: 71,
        },
        {
          style: 'Industrial Chic',
          adoption_rate: 18,
          seasonal_factor: 0.8,
          price_impact: 12,
          vendor_availability: 83,
        },
      ]);

      setRegionalTrends([
        {
          region: 'London',
          popular_styles: ['Modern Minimalist', 'Industrial Chic'],
          average_budget: 28500,
          booking_timeline: 14,
          seasonality_factor: 1.2,
        },
        {
          region: 'South England',
          popular_styles: ['Garden Party', 'Bohemian'],
          average_budget: 22300,
          booking_timeline: 12,
          seasonality_factor: 1.4,
        },
        {
          region: 'Scotland',
          popular_styles: ['Vintage Glam', 'Traditional'],
          average_budget: 19800,
          booking_timeline: 16,
          seasonality_factor: 0.9,
        },
        {
          region: 'Wales',
          popular_styles: ['Bohemian', 'Garden Party'],
          average_budget: 18200,
          booking_timeline: 15,
          seasonality_factor: 1.1,
        },
      ]);
    } catch (err) {
      console.error('Trend data loading error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load trend data',
      );
      toast.error('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const exportTrendReport = async () => {
    try {
      const reportData = {
        trends: trendData,
        colors: colorTrends,
        styles: styleTrends,
        regional: regionalTrends,
        filters,
        generated_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wedding-trends-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Trend report exported successfully');
    } catch (err) {
      toast.error('Failed to export trend report');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'decreasing':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <p className="text-lg text-red-600">Failed to load trend data</p>
          <Button onClick={loadTrendData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const chartData = trendData.map((trend, index) => ({
    name: trend.category,
    value: Math.abs(trend.percentage),
    growth: trend.percentage,
    confidence: trend.confidence * 100,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Wedding Trend Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            AI-powered insights into wedding industry trends and predictions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={selectedTimeframe}
            onValueChange={(value) => setSelectedTimeframe(value as any)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportTrendReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Trend Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm">
                Location
              </Label>
              <Select
                value={filters.location}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, location: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="south">South England</SelectItem>
                  <SelectItem value="north">North England</SelectItem>
                  <SelectItem value="scotland">Scotland</SelectItem>
                  <SelectItem value="wales">Wales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="season" className="text-sm">
                Season
              </Label>
              <Select
                value={filters.season}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, season: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="autumn">Autumn</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget" className="text-sm">
                Budget Range
              </Label>
              <Select
                value={filters.budget_range}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, budget_range: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Budgets</SelectItem>
                  <SelectItem value="budget">£5k - £15k</SelectItem>
                  <SelectItem value="mid">£15k - £30k</SelectItem>
                  <SelectItem value="luxury">£30k+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size" className="text-sm">
                Wedding Size
              </Label>
              <Select
                value={filters.wedding_size}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, wedding_size: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  <SelectItem value="intimate">{'<'} 50 guests</SelectItem>
                  <SelectItem value="medium">50-150 guests</SelectItem>
                  <SelectItem value="large">150+ guests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue" className="text-sm">
                Venue Type
              </Label>
              <Select
                value={filters.venue_type}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, venue_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Venues</SelectItem>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="destination">Destination</SelectItem>
                  <SelectItem value="religious">Religious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Trend Analysis */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="colors">Color Trends</TabsTrigger>
          <TabsTrigger value="styles">Style Trends</TabsTrigger>
          <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Trend Overview Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trend Direction</CardTitle>
                <CardDescription>
                  Wedding category trends over the selected timeframe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'growth' ? `${value}%` : `${value}%`,
                        name === 'growth' ? 'Growth Rate' : 'Confidence',
                      ]}
                    />
                    <Bar dataKey="growth" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Trends List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Trends</CardTitle>
                <CardDescription>
                  Most significant changes in wedding preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {trendData.slice(0, 5).map((trend, index) => (
                  <div
                    key={trend.category}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getTrendIcon(trend.trend)}
                      <div>
                        <p className="font-medium">{trend.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {(trend.confidence * 100).toFixed(0)}% confidence
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getTrendColor(trend.trend)}>
                        {trend.percentage > 0 ? '+' : ''}
                        {trend.percentage}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {trend.impact} impact
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Popular Wedding Colors
                </CardTitle>
                <CardDescription>
                  Trending color palettes for weddings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {colorTrends.map((color, index) => (
                  <div
                    key={color.color}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-200"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div>
                        <p className="font-medium">{color.color}</p>
                        <p className="text-sm text-muted-foreground">
                          {color.weddings_count.toLocaleString()} weddings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {color.popularity}%
                      </div>
                      <Badge
                        variant={color.growth > 0 ? 'default' : 'secondary'}
                      >
                        {color.growth > 0 ? '+' : ''}
                        {color.growth}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Color Popularity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={colorTrends}
                      dataKey="popularity"
                      nameKey="color"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {colorTrends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="styles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Wedding Style Trends
                </CardTitle>
                <CardDescription>
                  Popular wedding styles and their adoption rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {styleTrends.map((style) => (
                  <div key={style.style} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{style.style}</h4>
                      <Badge variant="outline">
                        {style.adoption_rate}% adoption
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Seasonal Factor</p>
                        <p className="font-medium">{style.seasonal_factor}x</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Price Impact</p>
                        <p
                          className={`font-medium ${style.price_impact > 0 ? 'text-red-600' : 'text-green-600'}`}
                        >
                          {style.price_impact > 0 ? '+' : ''}
                          {style.price_impact}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Vendor Availability
                        </p>
                        <p className="font-medium">
                          {style.vendor_availability}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Style Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={styleTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="style"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="adoption_rate"
                      fill="#8b5cf6"
                      name="Adoption Rate %"
                    />
                    <Bar
                      dataKey="vendor_availability"
                      fill="#06b6d4"
                      name="Vendor Availability %"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Regional Wedding Trends
                </CardTitle>
                <CardDescription>
                  How wedding preferences vary by location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {regionalTrends.map((region) => (
                  <div key={region.region} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{region.region}</h4>
                      <Badge variant="outline">
                        £{region.average_budget.toLocaleString()} avg
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Popular Styles:
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {region.popular_styles.map((style) => (
                            <Badge
                              key={style}
                              variant="secondary"
                              className="text-xs"
                            >
                              {style}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Booking Timeline
                          </p>
                          <p className="font-medium">
                            {region.booking_timeline} months
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Seasonality</p>
                          <p className="font-medium">
                            {region.seasonality_factor}x factor
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Regional Budget Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionalTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [
                        `£${Number(value).toLocaleString()}`,
                        'Average Budget',
                      ]}
                    />
                    <Bar dataKey="average_budget" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
