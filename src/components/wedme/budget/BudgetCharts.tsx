'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
  DollarSign,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  color: string;
}

interface BudgetTransaction {
  id: string;
  amount: number;
  category: string;
  date: Date;
  vendor?: string;
}

interface SpendingTrend {
  period: string;
  totalSpent: number;
  categoryBreakdown: Record<string, number>;
  budgeted: number;
  remaining: number;
}

interface BudgetChartsProps {
  clientId: string;
  categories: BudgetCategory[];
  totalBudget: number;
  className?: string;
}

const CHART_COLORS = [
  '#9E77ED',
  '#2E90FA',
  '#12B76A',
  '#F79009',
  '#F04438',
  '#7F56D9',
  '#06AED4',
  '#84CAFF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
];

export function BudgetCharts({
  clientId,
  categories,
  totalBudget,
  className,
}: BudgetChartsProps) {
  // State
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<
    'pie' | 'bar' | 'trends' | 'progress'
  >('pie');

  // Load data
  useEffect(() => {
    loadChartData();
  }, [clientId, categories]);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load transactions
      const transactionsResponse = await fetch(
        `/api/budget/transactions?client_id=${clientId}&limit=1000`,
      );
      if (!transactionsResponse.ok)
        throw new Error('Failed to load transactions');

      const transactionsData = await transactionsResponse.json();
      const transactionsList = (transactionsData.transactions || []).map(
        (t: any) => ({
          ...t,
          date: new Date(t.transaction_date),
        }),
      );
      setTransactions(transactionsList);

      // Calculate spending trends
      const trends = calculateSpendingTrends(transactionsList, 6);
      setSpendingTrends(trends);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load chart data',
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateSpendingTrends = (
    transactions: BudgetTransaction[],
    months: number,
  ): SpendingTrend[] => {
    const trends: SpendingTrend[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));

      const monthTransactions = transactions.filter(
        (t) => t.date >= monthStart && t.date <= monthEnd,
      );

      const totalSpent = monthTransactions.reduce(
        (sum, t) => sum + t.amount,
        0,
      );
      const monthlyBudget = totalBudget / 12; // Assuming annual budget

      // Category breakdown
      const categoryBreakdown: Record<string, number> = {};
      monthTransactions.forEach((t) => {
        categoryBreakdown[t.category] =
          (categoryBreakdown[t.category] || 0) + t.amount;
      });

      trends.unshift({
        period: format(monthStart, 'MMM yyyy'),
        totalSpent,
        categoryBreakdown,
        budgeted: monthlyBudget,
        remaining: monthlyBudget - totalSpent,
      });
    }

    return trends;
  };

  // Prepare chart data
  const pieChartData = categories.map((category, index) => ({
    name: category.name,
    value: category.spent_amount,
    budgeted: category.budgeted_amount,
    percentage: category.percentage_of_total,
    fill: category.color || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const barChartData = categories.map((category, index) => ({
    name:
      category.name.length > 10
        ? category.name.substring(0, 10) + '...'
        : category.name,
    spent: category.spent_amount,
    budgeted: category.budgeted_amount,
    remaining: Math.max(0, category.budgeted_amount - category.spent_amount),
    fill: category.color || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const progressChartData = categories.map((category, index) => {
    const spentPercentage =
      category.budgeted_amount > 0
        ? Math.min(
            (category.spent_amount / category.budgeted_amount) * 100,
            100,
          )
        : 0;

    return {
      name: category.name,
      percentage: spentPercentage,
      spent: category.spent_amount,
      budgeted: category.budgeted_amount,
      fill:
        spentPercentage > 100
          ? '#F04438'
          : spentPercentage > 85
            ? '#F79009'
            : category.color || CHART_COLORS[index % CHART_COLORS.length],
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Custom Tooltip components
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Spent: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Budget: {formatCurrency(data.budgeted)}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {formatPercentage(data.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'spent'
                ? 'Spent'
                : entry.dataKey === 'budgeted'
                  ? 'Budgeted'
                  : 'Remaining'}
              : {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const TrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-semibold text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'totalSpent'
                ? 'Spent'
                : entry.dataKey === 'budgeted'
                  ? 'Budgeted'
                  : 'Remaining'}
              : {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Charts
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadChartData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
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
      {/* Header with Chart Type Selector */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Analytics
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Visual insights into your wedding spending
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'pie', icon: PieChartIcon, label: 'Distribution' },
              { key: 'bar', icon: BarChart3, label: 'Comparison' },
              { key: 'trends', icon: TrendingUp, label: 'Trends' },
              { key: 'progress', icon: Target, label: 'Progress' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setSelectedChart(key as any)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  selectedChart === key
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-6">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">No budget data available</p>
            <p className="text-sm text-gray-400">
              Set up budget categories to see analytics
            </p>
          </div>
        ) : (
          <div className="h-80">
            {/* Pie Chart - Spending Distribution */}
            {selectedChart === 'pie' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value: string) =>
                      value.length > 15 ? value.substring(0, 15) + '...' : value
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Bar Chart - Budget vs Spent */}
            {selectedChart === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(value).replace('.00', '')
                    }
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="budgeted"
                    name="Budgeted"
                    fill="#E5E7EB"
                    radius={[0, 0, 4, 4]}
                  />
                  <Bar
                    dataKey="spent"
                    name="Spent"
                    fill="#9E77ED"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Line Chart - Spending Trends */}
            {selectedChart === 'trends' && spendingTrends.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={spendingTrends}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="spentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#9E77ED" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#9E77ED"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient
                      id="budgetGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#2E90FA" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#2E90FA"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(value).replace('.00', '')
                    }
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="budgeted"
                    stroke="#2E90FA"
                    strokeWidth={2}
                    fill="url(#budgetGradient)"
                    name="Monthly Budget"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalSpent"
                    stroke="#9E77ED"
                    strokeWidth={2}
                    fill="url(#spentGradient)"
                    name="Total Spent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {/* Progress Chart - Category Progress */}
            {selectedChart === 'progress' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={progressChartData}
                  layout="horizontal"
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      name === 'percentage'
                        ? `${value.toFixed(1)}%`
                        : formatCurrency(props.payload.spent),
                      name === 'percentage' ? 'Progress' : 'Spent',
                    ]}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Bar
                    dataKey="percentage"
                    fill="#9E77ED"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Empty state for trends when no data */}
            {selectedChart === 'trends' && spendingTrends.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-1">
                    No spending trends available
                  </p>
                  <p className="text-sm text-gray-400">
                    Add transactions to see spending patterns
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Insights */}
      {categories.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              Key Insights
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {/* Highest spending category */}
              {(() => {
                const highestSpending = categories.reduce(
                  (max, cat) =>
                    cat.spent_amount > max.spent_amount ? cat : max,
                  categories[0],
                );
                return (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: highestSpending.color }}
                    />
                    <span className="text-gray-600">
                      Highest:{' '}
                      <span className="font-medium">
                        {highestSpending.name}
                      </span>
                    </span>
                  </div>
                );
              })()}

              {/* Categories over budget */}
              {(() => {
                const overBudgetCount = categories.filter(
                  (cat) => cat.spent_amount > cat.budgeted_amount,
                ).length;
                return (
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        'w-3 h-3',
                        overBudgetCount > 0
                          ? 'text-error-500'
                          : 'text-success-500',
                      )}
                    />
                    <span className="text-gray-600">
                      Over budget:{' '}
                      <span className="font-medium">
                        {overBudgetCount} categories
                      </span>
                    </span>
                  </div>
                );
              })()}

              {/* Total spent percentage */}
              {(() => {
                const totalSpent = categories.reduce(
                  (sum, cat) => sum + cat.spent_amount,
                  0,
                );
                const spentPercentage =
                  totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
                return (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-primary-500" />
                    <span className="text-gray-600">
                      Budget used:{' '}
                      <span className="font-medium">
                        {formatPercentage(spentPercentage)}
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
