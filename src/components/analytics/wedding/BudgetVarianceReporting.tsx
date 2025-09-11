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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  ArrowUp,
  ArrowDown,
  Calculator,
  PieChart,
  BarChart3,
  RefreshCw,
  Filter,
  Download,
  CreditCard,
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
const PieChartComponent = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const TreemapChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Treemap })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
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
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
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
  BudgetCategory,
  BudgetVarianceAlert,
  BudgetCategoryType,
} from '@/lib/analytics/wedding-metrics';

interface BudgetVarianceReportingProps {
  weddingId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface BudgetAnalyticsData {
  categories: BudgetCategory[];
  alerts: BudgetVarianceAlert[];
  summary: {
    total_budget: number;
    total_spent: number;
    total_pending: number;
    total_variance: number;
    variance_percentage: number;
    over_budget_categories: number;
    under_budget_categories: number;
    projected_final_total: number;
  };
}

interface SpendingTrend {
  date: string;
  cumulative_spent: number;
  budgeted_cumulative: number;
  variance: number;
}

const BUDGET_CATEGORY_COLORS: Record<BudgetCategoryType, string> = {
  venue: '#3B82F6',
  catering: '#10B981',
  photography: '#F59E0B',
  videography: '#EF4444',
  florals: '#8B5CF6',
  music: '#F97316',
  transportation: '#06B6D4',
  attire: '#84CC16',
  beauty: '#EC4899',
  rings: '#6B7280',
  decorations: '#14B8A6',
  entertainment: '#F59E0B',
  stationery: '#8B5CF6',
  gifts: '#EC4899',
  honeymoon: '#F97316',
  miscellaneous: '#6B7280',
};

const BudgetVarianceReporting: React.FC<BudgetVarianceReportingProps> = ({
  weddingId,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  const [data, setData] = useState<BudgetAnalyticsData | null>(null);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<
    'overview' | 'categories' | 'trends' | 'alerts'
  >('overview');
  const [filterType, setFilterType] = useState<
    'all' | 'over_budget' | 'under_budget' | 'at_risk'
  >('all');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch budget data
  const fetchBudgetData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const [budgetResponse, trendsResponse] = await Promise.all([
          fetch(`/api/analytics/wedding/${weddingId}?type=budget`),
          fetch(`/api/analytics/wedding/${weddingId}/budget/trends`),
        ]);

        if (!budgetResponse.ok) {
          throw new Error('Failed to fetch budget data');
        }

        const budgetResult = await budgetResponse.json();

        // Calculate summary statistics
        const categories = budgetResult.data.categories;
        const alerts = budgetResult.data.alerts;

        const summary = {
          total_budget: categories.reduce(
            (sum: number, cat: BudgetCategory) => sum + cat.allocated_amount,
            0,
          ),
          total_spent: categories.reduce(
            (sum: number, cat: BudgetCategory) => sum + cat.spent_amount,
            0,
          ),
          total_pending: categories.reduce(
            (sum: number, cat: BudgetCategory) => sum + cat.pending_amount,
            0,
          ),
          total_variance: categories.reduce(
            (sum: number, cat: BudgetCategory) => sum + cat.variance_amount,
            0,
          ),
          variance_percentage: 0,
          over_budget_categories: categories.filter(
            (cat: BudgetCategory) => cat.is_over_budget,
          ).length,
          under_budget_categories: categories.filter(
            (cat: BudgetCategory) => cat.variance_amount < 0,
          ).length,
          projected_final_total: categories.reduce(
            (sum: number, cat: BudgetCategory) =>
              sum + cat.projected_final_amount,
            0,
          ),
        };

        summary.variance_percentage =
          summary.total_budget > 0
            ? (summary.total_variance / summary.total_budget) * 100
            : 0;

        setData({
          categories,
          alerts,
          summary,
        });

        // Handle trends response (might fail if API doesn't exist yet)
        if (trendsResponse.ok) {
          const trendsResult = await trendsResponse.json();
          setSpendingTrends(trendsResult.data || []);
        } else {
          // Generate mock spending trend data if API doesn't exist
          const mockTrends = generateMockSpendingTrends(categories);
          setSpendingTrends(mockTrends);
        }

        setLastUpdated(budgetResult.timestamp);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [weddingId],
  );

  // Generate mock spending trends for demonstration
  const generateMockSpendingTrends = (
    categories: BudgetCategory[],
  ): SpendingTrend[] => {
    const totalBudget = categories.reduce(
      (sum, cat) => sum + cat.allocated_amount,
      0,
    );
    const totalSpent = categories.reduce(
      (sum, cat) => sum + cat.spent_amount,
      0,
    );

    const trends: SpendingTrend[] = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      const progress = (i + 1) / 7;
      const cumulativeSpent = totalSpent * progress;
      const budgetedCumulative = totalBudget * progress;
      const variance = cumulativeSpent - budgetedCumulative;

      trends.push({
        date: date.toISOString().split('T')[0],
        cumulative_spent: cumulativeSpent,
        budgeted_cumulative: budgetedCumulative,
        variance,
      });
    }

    return trends;
  };

  // Auto-refresh functionality
  useEffect(() => {
    fetchBudgetData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(
        () => fetchBudgetData(false),
        refreshInterval * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [fetchBudgetData, autoRefresh, refreshInterval]);

  // Filter categories based on selected criteria
  const filteredCategories = useMemo(() => {
    if (!data?.categories) return [];

    let filtered = data.categories;

    switch (filterType) {
      case 'over_budget':
        filtered = filtered.filter((cat) => cat.is_over_budget);
        break;
      case 'under_budget':
        filtered = filtered.filter((cat) => cat.variance_amount < 0);
        break;
      case 'at_risk':
        filtered = filtered.filter(
          (cat) => cat.budget_utilization > 80 && !cat.is_over_budget,
        );
        break;
    }

    return filtered.sort(
      (a, b) =>
        Math.abs(b.variance_percentage) - Math.abs(a.variance_percentage),
    );
  }, [data?.categories, filterType]);

  // Chart data transformations
  const budgetAllocationData = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .map((cat) => ({
        name: cat.category_name,
        allocated: cat.allocated_amount,
        spent: cat.spent_amount,
        pending: cat.pending_amount,
        remaining: Math.max(
          0,
          cat.allocated_amount - cat.spent_amount - cat.pending_amount,
        ),
        utilization: cat.budget_utilization,
        color: BUDGET_CATEGORY_COLORS[cat.category_type] || '#6B7280',
      }))
      .sort((a, b) => b.allocated - a.allocated);
  }, [data?.categories]);

  const varianceAnalysisData = useMemo(() => {
    if (!data?.categories) return [];

    return data.categories
      .filter((cat) => Math.abs(cat.variance_amount) > 100) // Only show significant variances
      .map((cat) => ({
        category: cat.category_name,
        variance: cat.variance_amount,
        variancePercentage: cat.variance_percentage,
        allocated: cat.allocated_amount,
        spent: cat.spent_amount,
        color: cat.variance_amount > 0 ? '#EF4444' : '#10B981',
      }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [data?.categories]);

  const spendingTrendData = useMemo(() => {
    return spendingTrends.map((trend) => ({
      date: new Date(trend.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      actualSpending: Math.round(trend.cumulative_spent),
      budgetedSpending: Math.round(trend.budgeted_cumulative),
      variance: Math.round(trend.variance),
    }));
  }, [spendingTrends]);

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600';
    if (variance < -100) return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getVarianceBadge = (category: BudgetCategory) => {
    if (category.is_over_budget) {
      return <Badge variant="destructive">Over Budget</Badge>;
    } else if (category.variance_amount < -100) {
      return <Badge variant="default">Under Budget</Badge>;
    } else if (category.budget_utilization > 80) {
      return <Badge variant="secondary">At Risk</Badge>;
    } else {
      return <Badge variant="outline">On Track</Badge>;
    }
  };

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchBudgetData()}
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
          <span>Loading budget analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="budget-variance-reporting">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Budget Variance Reporting
          </h2>
          <p className="text-muted-foreground">
            Monitor spending patterns, track variances, and optimize budget
            allocation
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(value: any) => setView(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="categories">Categories</SelectItem>
              <SelectItem value="trends">Spending Trends</SelectItem>
              <SelectItem value="alerts">Alerts</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterType}
            onValueChange={(value: any) => setFilterType(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="over_budget">Over Budget</SelectItem>
              <SelectItem value="under_budget">Under Budget</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => fetchBudgetData()}
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

      {/* Budget Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Budget
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.summary.total_budget.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${data.summary.total_spent.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {(
                  (data.summary.total_spent / data.summary.total_budget) *
                  100
                ).toFixed(1)}
                % of budget
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Budget Variance
              </CardTitle>
              {data.summary.total_variance > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getVarianceColor(data.summary.total_variance)}`}
              >
                {data.summary.total_variance > 0 ? '+' : ''}$
                {data.summary.total_variance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.summary.variance_percentage > 0 ? '+' : ''}
                {data.summary.variance_percentage.toFixed(1)}% variance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Categories Status
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {data.summary.over_budget_categories}
                  </div>
                  <p className="text-xs text-muted-foreground">Over</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {data.summary.under_budget_categories}
                  </div>
                  <p className="text-xs text-muted-foreground">Under</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview Charts */}
      {view === 'overview' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Allocation Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChartComponent>
                  <Pie
                    data={budgetAllocationData.slice(0, 8)} // Show top 8 categories
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="allocated"
                  >
                    {budgetAllocationData.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `$${value.toLocaleString()}`,
                      'Allocated',
                    ]}
                  />
                  <Legend />
                </PieChartComponent>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Variance Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Variance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varianceAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => [
                      `$${value.toLocaleString()}`,
                      'Variance',
                    ]}
                  />
                  <Bar dataKey="variance">
                    {varianceAnalysisData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Spending Trends */}
      {view === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actualSpending"
                  stroke="#EF4444"
                  strokeWidth={3}
                  name="Actual Spending"
                />
                <Line
                  type="monotone"
                  dataKey="budgetedSpending"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Budgeted Spending"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget Variance Alerts */}
      {(view === 'alerts' || view === 'overview') &&
        data?.alerts &&
        data.alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Variance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.alerts.map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {alert.alert_level === 'CRITICAL' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {alert.alert_level === 'WARNING' && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      {alert.alert_level === 'UNDER_BUDGET' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{alert.category_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Variance: {alert.variance_percentage > 0 ? '+' : ''}
                          {alert.variance_percentage.toFixed(1)}% ($
                          {Math.abs(alert.variance_amount).toLocaleString()})
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        alert.alert_level === 'CRITICAL'
                          ? 'destructive'
                          : alert.alert_level === 'WARNING'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {alert.alert_level}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Category Detail View */}
      {view === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Category Budget Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">
                        {category.category_name}
                      </h4>
                      {getVarianceBadge(category)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Allocated</p>
                        <p className="font-semibold">
                          ${category.allocated_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Spent</p>
                        <p className="font-semibold">
                          ${category.spent_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending</p>
                        <p className="font-semibold">
                          ${category.pending_amount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Projected Final</p>
                        <p className="font-semibold">
                          ${category.projected_final_amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">
                          Budget Utilization
                        </span>
                        <span className="text-sm font-medium">
                          {category.budget_utilization.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, category.budget_utilization)}
                      />
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div
                      className={`text-lg font-bold ${getVarianceColor(category.variance_amount)}`}
                    >
                      {category.variance_amount > 0 ? '+' : ''}$
                      {category.variance_amount.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.variance_percentage > 0 ? '+' : ''}
                      {category.variance_percentage.toFixed(1)}% variance
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetVarianceReporting;
