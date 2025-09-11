'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Calculator,
  Eye,
  EyeOff,
  Settings,
  Info,
  ArrowUp,
  ArrowDown,
  Users,
  Star,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  addMonths,
} from 'date-fns';

interface BudgetAnalytics {
  totalBudget: number;
  totalSpent: number;
  totalPredicted: number;
  spentPercentage: number;
  projectedOverrun: number;
  savingsOpportunities: number;
  avgMonthlySpend: number;
  categoryPerformance: CategoryPerformance[];
  spendingTrends: SpendingTrend[];
  predictions: BudgetPrediction[];
  seasonalPatterns: SeasonalPattern[];
  vendorComparisons: VendorComparison[];
  insights: BudgetInsight[];
  kpis: AnalyticsKPI[];
  lastUpdated: Date;
}

interface CategoryPerformance {
  category: string;
  budgeted: number;
  spent: number;
  predicted: number;
  variance: number;
  efficiency: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

interface SpendingTrend {
  period: string;
  actual: number;
  predicted: number;
  budget: number;
  cumulative: number;
  variance: number;
  monthIndex: number;
}

interface BudgetPrediction {
  month: string;
  amount: number;
  confidence: number;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  factors: string[];
}

interface SeasonalPattern {
  month: string;
  multiplier: number;
  typical_spend: number;
  vendor_availability: 'high' | 'medium' | 'low';
  price_level: 'low' | 'medium' | 'high';
}

interface VendorComparison {
  vendor: string;
  category: string;
  amount: number;
  marketPosition: 'below' | 'average' | 'above';
  valueScore: number;
  recommendedAction: string;
}

interface BudgetInsight {
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
  value?: number;
}

interface AnalyticsKPI {
  key: string;
  label: string;
  value: number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  format: 'currency' | 'percentage' | 'number';
  target?: number;
}

interface AdvancedAnalyticsProps {
  clientId: string;
  className?: string;
  timeRange?: 'last3months' | 'last6months' | 'last12months' | 'all';
  onInsightAction?: (insight: BudgetInsight) => void;
}

const CHART_COLORS = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: '#6B7280',
};

const CATEGORY_COLORS = [
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#84CC16',
  '#F97316',
  '#06B6D4',
  '#8B5A2B',
];

export function AdvancedAnalytics({
  clientId,
  className,
  timeRange = 'last6months',
  onInsightAction,
}: AdvancedAnalyticsProps) {
  // State
  const [analytics, setAnalytics] = useState<BudgetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'trends' | 'predictions' | 'categories' | 'vendors'
  >('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load analytics data
  useEffect(() => {
    loadAnalytics();
  }, [clientId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/budget?client_id=${clientId}&time_range=${timeRange}`,
      );
      if (!response.ok) throw new Error('Failed to load analytics');

      const data = await response.json();
      setAnalytics({
        ...data,
        lastUpdated: new Date(data.lastUpdated),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    try {
      // Trigger recalculation
      await fetch(`/api/analytics/budget/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });
      await loadAnalytics();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh analytics',
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered data based on category selection
  const filteredData = useMemo(() => {
    if (!analytics || selectedCategory === 'all') return analytics;

    return {
      ...analytics,
      categoryPerformance: analytics.categoryPerformance.filter(
        (c) => c.category === selectedCategory,
      ),
      vendorComparisons: analytics.vendorComparisons.filter(
        (v) => v.category === selectedCategory,
      ),
    };
  }, [analytics, selectedCategory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getInsightIcon = (type: BudgetInsight['type']) => {
    switch (type) {
      case 'success':
        return <ThumbsUp className="w-4 h-4 text-success-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-600" />;
      case 'error':
        return <ThumbsDown className="w-4 h-4 text-error-600" />;
      default:
        return <Info className="w-4 h-4 text-info-600" />;
    }
  };

  const getKPIIcon = (changeType: AnalyticsKPI['changeType']) => {
    switch (changeType) {
      case 'positive':
        return <ArrowUp className="w-4 h-4 text-success-600" />;
      case 'negative':
        return <ArrowDown className="w-4 h-4 text-error-600" />;
      default:
        return <TrendingUp className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-error-400 mx-auto mb-3" />
          <p className="text-error-600 mb-2">
            {error || 'No analytics data available'}
          </p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Advanced Budget Analytics
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered insights and predictions for your wedding budget
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'trends', label: 'Trends', icon: LineChartIcon },
                { key: 'predictions', label: 'Predictions', icon: TrendingUp },
                { key: 'categories', label: 'Categories', icon: PieChartIcon },
                { key: 'vendors', label: 'Vendors', icon: Users },
              ].map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.key}
                    onClick={() => setSelectedView(view.key as any)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1',
                      selectedView === view.key
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900',
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {view.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={cn('w-4 h-4', refreshing && 'animate-spin')}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {analytics.categoryPerformance.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowConfidenceIntervals(!showConfidenceIntervals)
              }
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showConfidenceIntervals ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              Confidence Intervals
            </button>
          </div>

          <div className="ml-auto text-xs text-gray-500">
            Last updated: {format(analytics.lastUpdated, 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analytics.kpis.map((kpi) => (
            <div key={kpi.key} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-gray-600">
                  {kpi.label}
                </h4>
                {getKPIIcon(kpi.changeType)}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-gray-900">
                  {kpi.format === 'currency'
                    ? formatCurrency(kpi.value)
                    : kpi.format === 'percentage'
                      ? `${kpi.value.toFixed(1)}%`
                      : kpi.value.toLocaleString()}
                </p>
                {kpi.change !== 0 && (
                  <p
                    className={cn(
                      'text-xs font-medium',
                      kpi.changeType === 'positive'
                        ? 'text-success-600'
                        : kpi.changeType === 'negative'
                          ? 'text-error-600'
                          : 'text-gray-600',
                    )}
                  >
                    {formatPercentage(kpi.change)} vs last period
                  </p>
                )}
                {kpi.target && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Target:{' '}
                      {kpi.format === 'currency'
                        ? formatCurrency(kpi.target)
                        : kpi.target.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Spending vs Budget Chart */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Budget Performance Overview
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="budget"
                      fill={CHART_COLORS.gray}
                      fillOpacity={0.3}
                      name="Budget"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      name="Actual Spending"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke={CHART_COLORS.warning}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted"
                    />
                    {analytics.spendingTrends.some((t) => t.variance > 0) && (
                      <ReferenceLine
                        y={0}
                        stroke={CHART_COLORS.error}
                        strokeDasharray="3 3"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Budget Insights */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Key Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.insights.slice(0, 6).map((insight, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border',
                      insight.type === 'success'
                        ? 'bg-success-50 border-success-200'
                        : insight.type === 'warning'
                          ? 'bg-warning-50 border-warning-200'
                          : insight.type === 'error'
                            ? 'bg-error-50 border-error-200'
                            : 'bg-info-50 border-info-200',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-medium text-gray-900">
                          {insight.title}
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {insight.description}
                        </p>
                        {insight.recommendation && (
                          <p className="text-xs text-gray-700 mt-2 font-medium">
                            Recommendation: {insight.recommendation}
                          </p>
                        )}
                        {insight.actionable && onInsightAction && (
                          <button
                            onClick={() => onInsightAction(insight)}
                            className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
                          >
                            Take Action →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'trends' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Spending Trends Analysis
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stackId="1"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.6}
                      name="Cumulative Spending"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Monthly Variance Analysis
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Bar
                      dataKey="variance"
                      fill={(entry: any) =>
                        entry.variance > 0
                          ? CHART_COLORS.error
                          : CHART_COLORS.success
                      }
                      name="Budget Variance"
                    />
                    <ReferenceLine y={0} stroke="#374151" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'predictions' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                AI Budget Predictions
              </h4>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.predictions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '']}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="scenarios.pessimistic"
                      stackId="1"
                      stroke={CHART_COLORS.error}
                      fill={CHART_COLORS.error}
                      fillOpacity={0.1}
                      name="Pessimistic"
                    />
                    <Area
                      type="monotone"
                      dataKey="scenarios.optimistic"
                      stackId="1"
                      stroke={CHART_COLORS.success}
                      fill={CHART_COLORS.success}
                      fillOpacity={0.1}
                      name="Optimistic"
                    />
                    <Line
                      type="monotone"
                      dataKey="scenarios.realistic"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      name="Most Likely"
                    />
                    <Line
                      type="monotone"
                      dataKey="confidence"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      name="Confidence %"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Seasonal Patterns
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={analytics.seasonalPatterns}
                    innerRadius="20%"
                    outerRadius="80%"
                  >
                    <RadialBar
                      dataKey="multiplier"
                      cornerRadius={10}
                      fill={CHART_COLORS.primary}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${(value * 100).toFixed(0)}%`,
                        'Seasonal Multiplier',
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                      }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'categories' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Category Performance
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredData?.categoryPerformance || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, spent }) =>
                          `${category}: ${formatCurrency(spent)}`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="spent"
                      >
                        {(filteredData?.categoryPerformance || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                              }
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          'Spent',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredData?.categoryPerformance || []}
                      layout="horizontal"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={formatCurrency}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          '',
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                        }}
                      />
                      <Bar
                        dataKey="budgeted"
                        fill={CHART_COLORS.gray}
                        fillOpacity={0.3}
                        name="Budgeted"
                      />
                      <Bar
                        dataKey="spent"
                        fill={CHART_COLORS.primary}
                        name="Spent"
                      />
                      <Bar
                        dataKey="predicted"
                        fill={CHART_COLORS.warning}
                        name="Predicted"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Category Efficiency Scores
              </h4>
              <div className="space-y-3">
                {(filteredData?.categoryPerformance || []).map(
                  (category, index) => (
                    <div
                      key={category.category}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                            }}
                          />
                          <span className="font-medium text-gray-900">
                            {category.category}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-full',
                              category.trend === 'up'
                                ? 'bg-error-100 text-error-700'
                                : category.trend === 'down'
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-gray-100 text-gray-700',
                            )}
                          >
                            {category.trend === 'up'
                              ? '↗ Increasing'
                              : category.trend === 'down'
                                ? '↘ Decreasing'
                                : '→ Stable'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {category.efficiency.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Efficiency
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Budgeted: </span>
                          <span className="font-medium">
                            {formatCurrency(category.budgeted)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Spent: </span>
                          <span className="font-medium">
                            {formatCurrency(category.spent)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Variance: </span>
                          <span
                            className={cn(
                              'font-medium',
                              category.variance > 0
                                ? 'text-error-600'
                                : 'text-success-600',
                            )}
                          >
                            {formatPercentage(category.variance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'vendors' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Vendor Value Analysis
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={analytics.vendorComparisons}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      dataKey="amount"
                      name="Amount"
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis
                      type="number"
                      dataKey="valueScore"
                      name="Value Score"
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-medium">{data.vendor}</p>
                              <p className="text-sm text-gray-600">
                                {data.category}
                              </p>
                              <p className="text-sm">
                                Amount: {formatCurrency(data.amount)}
                              </p>
                              <p className="text-sm">
                                Value Score: {data.valueScore}/10
                              </p>
                              <p className="text-sm">
                                Position: {data.marketPosition}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter dataKey="valueScore" fill={CHART_COLORS.primary} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Vendor Recommendations
              </h4>
              <div className="space-y-3">
                {analytics.vendorComparisons.map((vendor, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="font-medium text-gray-900">
                            {vendor.vendor}
                          </h5>
                          <span className="text-xs text-gray-500">
                            {vendor.category}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-full',
                              vendor.marketPosition === 'below'
                                ? 'bg-success-100 text-success-700'
                                : vendor.marketPosition === 'above'
                                  ? 'bg-error-100 text-error-700'
                                  : 'bg-gray-100 text-gray-700',
                            )}
                          >
                            {vendor.marketPosition === 'below'
                              ? 'Below Market'
                              : vendor.marketPosition === 'above'
                                ? 'Above Market'
                                : 'Market Rate'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {vendor.recommendedAction}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Amount: {formatCurrency(vendor.amount)}</span>
                          <span>Value Score: {vendor.valueScore}/10</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                              {vendor.valueScore.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500">Score</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
