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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertCircle,
  DollarSign,
  PiggyBank,
  Calculator,
  Sparkles,
  Clock,
  Users,
  MapPin,
  Calendar,
} from 'lucide-react';

interface BudgetCategory {
  category: string;
  currentAllocation: number;
  recommendedAllocation: number;
  variance: number;
  seasonalAdjustment: number;
  regionalFactor: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

interface BudgetOptimizationData {
  totalBudget: number;
  optimizedBudget: number;
  potentialSavings: number;
  categories: BudgetCategory[];
  seasonalFactors: Array<{
    month: string;
    multiplier: number;
    demand: number;
  }>;
  regionalInsights: Array<{
    region: string;
    avgBudget: number;
    priceIndex: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  venueTypeAnalysis: Array<{
    type: string;
    avgCost: number;
    popularity: number;
    seasonalVariation: number;
  }>;
  recommendations: Array<{
    category: string;
    action: 'increase' | 'decrease' | 'maintain';
    reason: string;
    impact: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface BudgetOptimizationPanelProps {
  budgetRange?: 'low' | 'medium' | 'high' | 'luxury';
  guestCount?: number;
  region?: string;
  venueType?: 'outdoor' | 'indoor' | 'destination' | 'church' | 'registry';
  weddingMonth?: number;
  onOptimizationApply?: (optimization: BudgetOptimizationData) => void;
}

const CATEGORY_COLORS = {
  venue: '#8B5CF6',
  catering: '#06B6D4',
  photography: '#10B981',
  flowers: '#F59E0B',
  music: '#EF4444',
  attire: '#EC4899',
  transport: '#6366F1',
  stationery: '#84CC16',
  other: '#6B7280',
};

const BUDGET_RANGES = {
  low: { min: 5000, max: 15000, label: '£5K - £15K' },
  medium: { min: 15000, max: 35000, label: '£15K - £35K' },
  high: { min: 35000, max: 75000, label: '£35K - £75K' },
  luxury: { min: 75000, max: 200000, label: '£75K+' },
};

export default function BudgetOptimizationPanel({
  budgetRange = 'medium',
  guestCount = 100,
  region = 'london',
  venueType = 'indoor',
  weddingMonth = 6,
  onOptimizationApply,
}: BudgetOptimizationPanelProps) {
  const [optimizationData, setOptimizationData] =
    useState<BudgetOptimizationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'categories' | 'seasonal' | 'regional'
  >('overview');
  const [selectedBudgetRange, setSelectedBudgetRange] = useState(budgetRange);
  const [selectedGuestCount, setSelectedGuestCount] = useState(guestCount);
  const [selectedRegion, setSelectedRegion] = useState(region);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgetOptimization = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/budget-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          budgetRange: selectedBudgetRange,
          guestCount: selectedGuestCount,
          region: selectedRegion,
          venueType,
          weddingMonth,
          includeSeasonalFactors: true,
          includeRegionalAnalysis: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch budget optimization');
      }

      const data = await response.json();
      setOptimizationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Budget optimization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetOptimization();
  }, [
    selectedBudgetRange,
    selectedGuestCount,
    selectedRegion,
    venueType,
    weddingMonth,
  ]);

  const handleOptimizationApply = () => {
    if (optimizationData && onOptimizationApply) {
      onOptimizationApply(optimizationData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetHealthColor = (variance: number) => {
    if (variance > 10) return 'text-red-600';
    if (variance > 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      venue: MapPin,
      catering: Users,
      photography: Camera,
      flowers: Sparkles,
      music: Volume2,
      attire: Shirt,
      transport: Car,
      stationery: FileText,
      other: MoreHorizontal,
    };
    const Icon = icons[category] || Target;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Budget Optimization Analysis
          </CardTitle>
          <CardDescription>
            Analyzing budget allocation and optimization opportunities...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error loading budget optimization: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchBudgetOptimization}
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

  if (!optimizationData) {
    return null;
  }

  const savingsPercentage =
    (optimizationData.potentialSavings / optimizationData.totalBudget) * 100;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Budget Optimization Analysis
          </CardTitle>
          <CardDescription>
            AI-powered wedding budget allocation and optimization
            recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Budget Range
              </label>
              <Select
                value={selectedBudgetRange}
                onValueChange={setSelectedBudgetRange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUDGET_RANGES).map(([key, range]) => (
                    <SelectItem key={key} value={key}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Guest Count
              </label>
              <Select
                value={selectedGuestCount.toString()}
                onValueChange={(value) =>
                  setSelectedGuestCount(parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 guests</SelectItem>
                  <SelectItem value="75">75 guests</SelectItem>
                  <SelectItem value="100">100 guests</SelectItem>
                  <SelectItem value="150">150 guests</SelectItem>
                  <SelectItem value="200">200 guests</SelectItem>
                  <SelectItem value="300">300+ guests</SelectItem>
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
              <Button onClick={handleOptimizationApply} className="w-full">
                Apply Optimization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Budget
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(optimizationData.totalBudget)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Optimized Budget
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(optimizationData.optimizedBudget)}
                </p>
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
                  Potential Savings
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(optimizationData.potentialSavings)}
                </p>
                <p className="text-sm text-gray-500">
                  {savingsPercentage.toFixed(1)}% savings
                </p>
              </div>
              <PiggyBank className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Optimization Score
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    (1 -
                      optimizationData.potentialSavings /
                        optimizationData.totalBudget) *
                      100,
                  )}
                </p>
                <p className="text-sm text-gray-500">out of 100</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs value={selectedView} onValueChange={setSelectedView as any}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Allocation Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
                <CardDescription>
                  Current vs Recommended allocation by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={optimizationData.categories.map((cat) => ({
                        name: cat.category,
                        current: cat.currentAllocation,
                        recommended: cat.recommendedAllocation,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="current"
                    >
                      {optimizationData.categories.map((cat, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CATEGORY_COLORS[
                              cat.category as keyof typeof CATEGORY_COLORS
                            ] || '#6B7280'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Top Recommendations</CardTitle>
                <CardDescription>
                  AI-powered optimization suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationData.recommendations
                    .slice(0, 5)
                    .map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {rec.priority}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(rec.category)}
                            <span className="font-medium capitalize">
                              {rec.category}
                            </span>
                            {rec.action === 'increase' ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : rec.action === 'decrease' ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{rec.reason}</p>
                          <p className="text-sm font-medium text-green-600 mt-1">
                            Potential impact: {formatCurrency(rec.impact)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of budget categories with optimization
                recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {optimizationData.categories.map((category, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(category.category)}
                        <h3 className="font-semibold capitalize">
                          {category.category}
                        </h3>
                        <Badge
                          variant={
                            category.trend === 'up'
                              ? 'default'
                              : category.trend === 'down'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {category.trend}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Confidence</p>
                        <p className="font-medium">
                          {Math.round(category.confidence * 100)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Current</p>
                        <p className="font-semibold">
                          {formatCurrency(category.currentAllocation)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Recommended</p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(category.recommendedAllocation)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Variance</p>
                        <p
                          className={`font-semibold ${getBudgetHealthColor(Math.abs(category.variance))}`}
                        >
                          {category.variance > 0 ? '+' : ''}
                          {category.variance.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Regional Factor</p>
                        <p className="font-semibold">
                          {category.regionalFactor.toFixed(2)}x
                        </p>
                      </div>
                    </div>

                    <Progress
                      value={Math.min(
                        (category.currentAllocation /
                          category.recommendedAllocation) *
                          100,
                        100,
                      )}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Budget Factors</CardTitle>
              <CardDescription>
                How wedding costs vary throughout the year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={optimizationData.seasonalFactors}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'multiplier'
                        ? `${(value as number).toFixed(2)}x`
                        : `${value}%`,
                      name === 'multiplier'
                        ? 'Cost Multiplier'
                        : 'Demand Level',
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="multiplier"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.3}
                    name="Cost Multiplier"
                  />
                  <Line
                    type="monotone"
                    dataKey="demand"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    name="Demand Level"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Regional Price Comparison</CardTitle>
                <CardDescription>
                  Average wedding costs by region
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={optimizationData.regionalInsights}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="avgBudget" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Venue Type Analysis</CardTitle>
                <CardDescription>
                  Cost and popularity by venue type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationData.venueTypeAnalysis.map((venue, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium capitalize">{venue.type}</h4>
                        <p className="text-sm text-gray-600">
                          Popularity: {venue.popularity}% | Seasonal Variation:
                          ±{venue.seasonalVariation}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(venue.avgCost)}
                        </p>
                        <p className="text-sm text-gray-600">avg cost</p>
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
