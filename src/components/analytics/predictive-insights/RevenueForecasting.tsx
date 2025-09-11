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
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  Users,
  Crown,
  Zap,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Banknote,
  CreditCard,
  Wallet,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface RevenueMetrics {
  currentMRR: number;
  projectedMRR: number;
  arrGrowthRate: number;
  churnImpact: number;
  newCustomerRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
  reactivationRevenue: number;
  netRevenueRetention: number;
  grossRevenueRetention: number;
  customerAcquisitionCost: number;
  lifetimeValue: number;
  paybackPeriod: number;
  burnRate: number;
  runwayMonths: number;
}

interface RevenueForecast {
  month: string;
  projectedRevenue: number;
  conservativeEstimate: number;
  optimisticEstimate: number;
  actualRevenue?: number;
  newCustomers: number;
  churn: number;
  expansion: number;
  confidenceLevel: number;
  seasonalAdjustment: number;
  marketFactors: number;
}

interface TierContribution {
  tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  currentRevenue: number;
  projectedRevenue: number;
  customerCount: number;
  avgRevenuePerCustomer: number;
  growthRate: number;
  churnRate: number;
  expansionOpportunity: number;
}

interface RevenueScenario {
  name: string;
  description: string;
  probability: number;
  impact: number;
  revenueMultiplier: number;
  timeframe: string;
  keyFactors: string[];
}

interface RevenueData {
  metrics: RevenueMetrics;
  forecast: RevenueForecast[];
  tierBreakdown: TierContribution[];
  scenarios: RevenueScenario[];
  seasonalPatterns: Array<{
    month: string;
    historicalMultiplier: number;
    weddingSeasonImpact: number;
    marketingEfficiency: number;
  }>;
  cohortRevenue: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
    ltv: number;
  }>;
  revenueDrivers: Array<{
    driver: string;
    impact: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    category: 'acquisition' | 'retention' | 'expansion' | 'pricing';
  }>;
}

interface RevenueForecastingProps {
  timeHorizon?: '6m' | '1y' | '2y' | '5y';
  scenario?: 'conservative' | 'realistic' | 'optimistic';
  includeSeasonality?: boolean;
  onForecastUpdate?: (forecast: RevenueData) => void;
}

const TIER_COLORS = {
  free: '#6B7280',
  starter: '#8B5CF6',
  professional: '#06B6D4',
  scale: '#10B981',
  enterprise: '#F59E0B',
};

const SCENARIO_COLORS = {
  conservative: '#EF4444',
  realistic: '#06B6D4',
  optimistic: '#10B981',
};

export default function RevenueForecasting({
  timeHorizon = '1y',
  scenario = 'realistic',
  includeSeasonality = true,
  onForecastUpdate,
}: RevenueForecastingProps) {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'forecast' | 'tiers' | 'scenarios' | 'drivers'
  >('overview');
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState(timeHorizon);
  const [selectedScenario, setSelectedScenario] = useState(scenario);
  const [selectedSeasonality, setSelectedSeasonality] =
    useState(includeSeasonality);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueForecasting = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/revenue-forecasting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeHorizon: selectedTimeHorizon,
          scenario: selectedScenario,
          includeSeasonality: selectedSeasonality,
          includeScenarioAnalysis: true,
          includeCohortAnalysis: true,
          includeRevenueDrivers: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue forecasting data');
      }

      const data = await response.json();
      setRevenueData(data);

      if (onForecastUpdate) {
        onForecastUpdate(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Revenue forecasting error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenueForecasting();
  }, [selectedTimeHorizon, selectedScenario, selectedSeasonality]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatLargeCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `£${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 5) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (rate < -5) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getHealthColor = (
    value: number,
    type: 'nrr' | 'grr' | 'ltv' | 'cac' | 'payback',
  ) => {
    switch (type) {
      case 'nrr':
        if (value >= 110) return 'text-green-600';
        if (value >= 100) return 'text-yellow-600';
        return 'text-red-600';
      case 'grr':
        if (value >= 90) return 'text-green-600';
        if (value >= 80) return 'text-yellow-600';
        return 'text-red-600';
      case 'ltv':
        if (value >= 3000) return 'text-green-600';
        if (value >= 1500) return 'text-yellow-600';
        return 'text-red-600';
      case 'cac':
        if (value <= 300) return 'text-green-600';
        if (value <= 600) return 'text-yellow-600';
        return 'text-red-600';
      case 'payback':
        if (value <= 6) return 'text-green-600';
        if (value <= 12) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Revenue Forecasting
          </CardTitle>
          <CardDescription>
            Analyzing revenue patterns and generating growth projections...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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
              Error loading revenue forecasting: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRevenueForecasting}
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

  if (!revenueData) {
    return null;
  }

  const projectedGrowth =
    ((revenueData.metrics.projectedMRR - revenueData.metrics.currentMRR) /
      revenueData.metrics.currentMRR) *
    100;
  const totalProjectedARR = revenueData.metrics.projectedMRR * 12;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Revenue Forecasting & Growth Analytics
          </CardTitle>
          <CardDescription>
            AI-powered revenue projections and business growth modeling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Horizon
              </label>
              <Select
                value={selectedTimeHorizon}
                onValueChange={setSelectedTimeHorizon}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6m">6 months</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                  <SelectItem value="2y">2 years</SelectItem>
                  <SelectItem value="5y">5 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Scenario</label>
              <Select
                value={selectedScenario}
                onValueChange={setSelectedScenario}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="realistic">Realistic</SelectItem>
                  <SelectItem value="optimistic">Optimistic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Include Seasonality
              </label>
              <Select
                value={selectedSeasonality ? 'yes' : 'no'}
                onValueChange={(value) =>
                  setSelectedSeasonality(value === 'yes')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchRevenueForecasting} className="w-full">
                Update Forecast
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
                <p className="text-sm font-medium text-gray-600">Current MRR</p>
                <p className="text-2xl font-bold">
                  {formatLargeCurrency(revenueData.metrics.currentMRR)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-gray-500">
                    ARR:{' '}
                    {formatLargeCurrency(revenueData.metrics.currentMRR * 12)}
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Projected MRR
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatLargeCurrency(revenueData.metrics.projectedMRR)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {getGrowthIcon(projectedGrowth)}
                  <span className="text-xs text-gray-500">
                    {projectedGrowth > 0 ? '+' : ''}
                    {projectedGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  ARR Growth Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {revenueData.metrics.arrGrowthRate.toFixed(1)}%
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
                  Net Revenue Retention
                </p>
                <p
                  className={`text-2xl font-bold ${getHealthColor(revenueData.metrics.netRevenueRetention, 'nrr')}`}
                >
                  {revenueData.metrics.netRevenueRetention.toFixed(0)}%
                </p>
                <p className="text-sm text-gray-500">expansion impact</p>
              </div>
              <Activity className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unit Economics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer LTV</span>
                <span
                  className={`font-medium ${getHealthColor(revenueData.metrics.lifetimeValue, 'ltv')}`}
                >
                  {formatCurrency(revenueData.metrics.lifetimeValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Customer CAC</span>
                <span
                  className={`font-medium ${getHealthColor(revenueData.metrics.customerAcquisitionCost, 'cac')}`}
                >
                  {formatCurrency(revenueData.metrics.customerAcquisitionCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">LTV:CAC Ratio</span>
                <span className="font-medium text-blue-600">
                  {(
                    revenueData.metrics.lifetimeValue /
                    revenueData.metrics.customerAcquisitionCost
                  ).toFixed(1)}
                  :1
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payback Period</span>
                <span
                  className={`font-medium ${getHealthColor(revenueData.metrics.paybackPeriod, 'payback')}`}
                >
                  {revenueData.metrics.paybackPeriod.toFixed(1)} months
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  New Customer Revenue
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(revenueData.metrics.newCustomerRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expansion Revenue</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(revenueData.metrics.expansionRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Contraction Revenue
                </span>
                <span className="font-medium text-yellow-600">
                  -{formatCurrency(revenueData.metrics.contractionRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Churn Impact</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(revenueData.metrics.churnImpact)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Business Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Gross Revenue Retention
                </span>
                <span
                  className={`font-medium ${getHealthColor(revenueData.metrics.grossRevenueRetention, 'grr')}`}
                >
                  {revenueData.metrics.grossRevenueRetention.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Burn Rate</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(revenueData.metrics.burnRate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Runway</span>
                <span className="font-medium text-purple-600">
                  {revenueData.metrics.runwayMonths.toFixed(1)} months
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Reactivation Revenue
                </span>
                <span className="font-medium text-cyan-600">
                  {formatCurrency(revenueData.metrics.reactivationRevenue)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics */}
      <Tabs value={selectedView} onValueChange={setSelectedView as any}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="tiers">Tier Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="drivers">Growth Drivers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Growth Trend</CardTitle>
                <CardDescription>
                  Monthly recurring revenue progression
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData.forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatLargeCurrency} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="actualRevenue"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                      name="Actual Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="projectedRevenue"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      fillOpacity={0.2}
                      name="Projected Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Seasonal Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Revenue Impact</CardTitle>
                <CardDescription>
                  Wedding season effect on business growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData.seasonalPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historicalMultiplier"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      name="Historical Pattern"
                    />
                    <Line
                      type="monotone"
                      dataKey="weddingSeasonImpact"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Wedding Season Impact"
                    />
                    <Line
                      type="monotone"
                      dataKey="marketingEfficiency"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Marketing Efficiency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cohort Revenue Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Cohort Revenue Analysis</CardTitle>
              <CardDescription>
                Revenue generation by customer acquisition cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cohort</th>
                      <th className="text-center p-2">Month 0</th>
                      <th className="text-center p-2">Month 1</th>
                      <th className="text-center p-2">Month 3</th>
                      <th className="text-center p-2">Month 6</th>
                      <th className="text-center p-2">Month 12</th>
                      <th className="text-center p-2">LTV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueData.cohortRevenue.map((cohort, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        <td className="text-center p-2">
                          {formatCurrency(cohort.month0)}
                        </td>
                        <td className="text-center p-2">
                          {formatCurrency(cohort.month1)}
                        </td>
                        <td className="text-center p-2">
                          {formatCurrency(cohort.month3)}
                        </td>
                        <td className="text-center p-2">
                          {formatCurrency(cohort.month6)}
                        </td>
                        <td className="text-center p-2">
                          {formatCurrency(cohort.month12)}
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="default">
                            {formatCurrency(cohort.ltv)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast with Confidence Intervals</CardTitle>
              <CardDescription>
                Projected revenue with conservative, realistic, and optimistic
                scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={revenueData.forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={formatLargeCurrency} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    formatter={(value, name) => [
                      typeof value === 'number' ? formatCurrency(value) : value,
                      name === 'projectedRevenue'
                        ? 'Projected Revenue'
                        : name === 'conservativeEstimate'
                          ? 'Conservative'
                          : name === 'optimisticEstimate'
                            ? 'Optimistic'
                            : name === 'confidenceLevel'
                              ? 'Confidence Level'
                              : name === 'newCustomers'
                                ? 'New Customers'
                                : name,
                    ]}
                  />
                  <Legend />

                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="conservativeEstimate"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.1}
                    name="Conservative"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="optimisticEstimate"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    name="Optimistic"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="projectedRevenue"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    name="Projected Revenue"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="confidenceLevel"
                    fill="#8B5CF6"
                    opacity={0.3}
                    name="Confidence Level"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Components Breakdown</CardTitle>
                <CardDescription>
                  Monthly contribution by revenue type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData.forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatLargeCurrency} />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="newCustomers"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      name="New Customers"
                    />
                    <Area
                      type="monotone"
                      dataKey="expansion"
                      stackId="1"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      name="Expansion"
                    />
                    <Area
                      type="monotone"
                      dataKey="churn"
                      stackId="2"
                      stroke="#EF4444"
                      fill="#EF4444"
                      name="Churn Loss"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confidence & Seasonality</CardTitle>
                <CardDescription>
                  Prediction confidence and seasonal adjustments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData.forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="confidenceLevel"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      name="Confidence Level (%)"
                    />
                    <Line
                      type="monotone"
                      dataKey="seasonalAdjustment"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Seasonal Adjustment"
                    />
                    <Line
                      type="monotone"
                      dataKey="marketFactors"
                      stroke="#EF4444"
                      strokeWidth={2}
                      name="Market Factors"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Tier</CardTitle>
                <CardDescription>Current revenue distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueData.tierBreakdown.map((tier) => ({
                        name: tier.tier,
                        value: tier.currentRevenue,
                        color: TIER_COLORS[tier.tier],
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                    >
                      {revenueData.tierBreakdown.map((tier, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={TIER_COLORS[tier.tier]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tier Growth Comparison</CardTitle>
                <CardDescription>
                  Growth rate by subscription tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData.tierBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => `${(value as number).toFixed(1)}%`}
                    />
                    <Bar dataKey="growthRate" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Tier Analysis</CardTitle>
              <CardDescription>
                Comprehensive metrics for each subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {revenueData.tierBreakdown.map((tier, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: TIER_COLORS[tier.tier] }}
                        />
                        <h3 className="font-semibold capitalize">
                          {tier.tier} Tier
                        </h3>
                        <Badge
                          variant={
                            tier.tier === 'enterprise' ? 'default' : 'secondary'
                          }
                        >
                          {tier.customerCount} customers
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Revenue Growth</p>
                        <div className="flex items-center gap-1">
                          {getGrowthIcon(tier.growthRate)}
                          <span className="font-medium">
                            {tier.growthRate > 0 ? '+' : ''}
                            {tier.growthRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Current Revenue</p>
                        <p className="font-semibold">
                          {formatCurrency(tier.currentRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Projected Revenue
                        </p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(tier.projectedRevenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ARPC</p>
                        <p className="font-semibold">
                          {formatCurrency(tier.avgRevenuePerCustomer)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Churn Rate</p>
                        <p className="font-semibold text-red-600">
                          {tier.churnRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Expansion Opportunity
                        </p>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={tier.expansionOpportunity}
                            className="h-2 flex-1"
                          />
                          <span className="text-sm font-medium">
                            {tier.expansionOpportunity.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Scenarios</CardTitle>
              <CardDescription>
                Different growth scenarios based on market conditions and
                business decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {revenueData.scenarios
                  .sort((a, b) => b.probability - a.probability)
                  .map((scenario, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{scenario.name}</h3>
                            <Badge
                              variant={
                                scenario.probability > 70
                                  ? 'default'
                                  : scenario.probability > 40
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {scenario.probability}% probability
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {scenario.description}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Timeframe:</strong> {scenario.timeframe}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">
                            Revenue Impact
                          </p>
                          <p className="text-xl font-bold">
                            {scenario.revenueMultiplier > 1 ? '+' : ''}
                            {((scenario.revenueMultiplier - 1) * 100).toFixed(
                              0,
                            )}
                            %
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatLargeCurrency(
                              revenueData.metrics.projectedMRR *
                                scenario.revenueMultiplier *
                                12,
                            )}{' '}
                            ARR
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-blue-600 mb-2">
                          Key Factors
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {scenario.keyFactors.map((factor, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CheckCircle className="h-3 w-3 text-blue-600" />
                              {factor}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth Drivers</CardTitle>
              <CardDescription>
                Key factors influencing revenue growth and their impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries({
                  acquisition: 'Customer Acquisition',
                  retention: 'Customer Retention',
                  expansion: 'Revenue Expansion',
                  pricing: 'Pricing Strategy',
                }).map(([category, title]) => (
                  <div key={category}>
                    <h3 className="font-medium mb-4">{title}</h3>
                    <div className="space-y-3">
                      {revenueData.revenueDrivers
                        .filter((driver) => driver.category === category)
                        .sort((a, b) => b.impact - a.impact)
                        .map((driver, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                {driver.trend === 'increasing' ? (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                ) : driver.trend === 'decreasing' ? (
                                  <TrendingDown className="h-4 w-4 text-red-600" />
                                ) : (
                                  <Minus className="h-4 w-4 text-gray-600" />
                                )}
                                <Badge
                                  variant={
                                    driver.trend === 'increasing'
                                      ? 'default'
                                      : driver.trend === 'decreasing'
                                        ? 'destructive'
                                        : 'secondary'
                                  }
                                >
                                  {driver.trend}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium">
                                {driver.driver}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={driver.impact}
                                className="h-2 w-16"
                              />
                              <span className="text-sm font-medium">
                                {driver.impact.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
