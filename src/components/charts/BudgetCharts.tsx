'use client';

/**
 * WS-224: Progress Charts System - Budget Charts Component
 * Budget allocation and spending analysis with trend visualizations
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  BudgetItem,
  ProgressOverview,
  WeddingMilestone,
} from '@/types/charts';

interface BudgetChartsProps {
  budget: BudgetItem[];
  overview: ProgressOverview | null;
  milestones: WeddingMilestone[];
  className?: string;
}

export function BudgetCharts({
  budget,
  overview,
  milestones,
  className,
}: BudgetChartsProps) {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'breakdown' | 'trends' | 'variance'
  >('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calculate budget statistics
  const totalBudget = budget.reduce(
    (sum, item) => sum + item.budgetedAmount,
    0,
  );
  const totalSpent = budget.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalVariance = budget.reduce((sum, item) => sum + item.variance, 0);
  const budgetUtilization =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const overBudgetItems = budget.filter((item) => item.variance > 0).length;
  const remainingBudget = totalBudget - totalSpent;

  // Get unique categories
  const categories = Array.from(new Set(budget.map((item) => item.category)));

  // Filter budget by category
  const filteredBudget =
    selectedCategory === 'all'
      ? budget
      : budget.filter((item) => item.category === selectedCategory);

  // Budget allocation by category
  const categoryData = categories
    .map((category) => {
      const categoryItems = budget.filter((item) => item.category === category);
      const budgeted = categoryItems.reduce(
        (sum, item) => sum + item.budgetedAmount,
        0,
      );
      const actual = categoryItems.reduce(
        (sum, item) => sum + item.actualAmount,
        0,
      );
      const variance = categoryItems.reduce(
        (sum, item) => sum + item.variance,
        0,
      );

      return {
        name: category,
        budgeted,
        actual,
        variance,
        percentage: totalBudget > 0 ? (budgeted / totalBudget) * 100 : 0,
        utilization: budgeted > 0 ? (actual / budgeted) * 100 : 0,
      };
    })
    .sort((a, b) => b.budgeted - a.budgeted);

  // Spending trend over time (simulate monthly data)
  const getSpendingTrend = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    });

    // Simulate cumulative spending data
    const cumulativeSpending = months.map((month, index) => {
      const monthlySpend =
        totalSpent * ((index + 1) / 12) +
        (Math.random() - 0.5) * (totalSpent * 0.1);
      return {
        month,
        cumulative: Math.max(0, monthlySpend),
        monthly:
          index === 0
            ? monthlySpend
            : Math.max(0, monthlySpend - totalSpent * (index / 12)),
        budget: totalBudget * ((index + 1) / 12),
      };
    });

    return cumulativeSpending;
  };

  const spendingTrendData = getSpendingTrend();

  // Status colors
  const getStatusColor = (status: BudgetItem['status']) => {
    switch (status) {
      case 'paid':
        return '#22c55e';
      case 'confirmed':
        return '#3b82f6';
      case 'pending':
        return '#f59e0b';
      case 'overbudget':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Variance analysis
  const varianceData = categoryData
    .map((cat) => ({
      name: cat.name,
      variance: cat.variance,
      percentageVariance:
        cat.budgeted > 0 ? (cat.variance / cat.budgeted) * 100 : 0,
    }))
    .filter((item) => Math.abs(item.variance) > 0);

  // Budget allocation pie chart colors
  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884D8',
    '#82CA9D',
    '#FFC658',
    '#FF7C7C',
    '#8DD1E1',
    '#D084C4',
    '#87D068',
    '#FFA500',
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with view controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Budget Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Track spending, analyze variances, and monitor budget utilization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {['overview', 'breakdown', 'trends', 'variance'].map((view) => (
              <Button
                key={view}
                variant={selectedView === view ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView(view as any)}
                className="capitalize"
              >
                {view}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">Allocated budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetUtilization.toFixed(0)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            {remainingBudget < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                remainingBudget < 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatCurrency(Math.abs(remainingBudget))}
            </div>
            <p className="text-xs text-muted-foreground">
              {remainingBudget < 0 ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Over Budget Items
            </CardTitle>
            {overBudgetItems > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Target className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                overBudgetItems > 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {overBudgetItems}
            </div>
            <p className="text-xs text-muted-foreground">
              {overBudgetItems === 0 ? 'All within budget' : 'Need attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alert */}
      {budgetUtilization > 90 && (
        <Alert variant={budgetUtilization > 100 ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {budgetUtilization > 100
              ? `You're ${(budgetUtilization - 100).toFixed(0)}% over budget! Consider reviewing expenses or increasing budget.`
              : `You've used ${budgetUtilization.toFixed(0)}% of your budget. Monitor remaining expenses carefully.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* View Content */}
      {selectedView === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Budget Allocation Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation</CardTitle>
              <CardDescription>
                Distribution of budget across categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="budgeted"
                    label={({ name, percentage }) =>
                      `${name}: ${percentage.toFixed(0)}%`
                    }
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending</CardTitle>
              <CardDescription>
                Comparison of planned vs actual expenses by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
                  <Bar dataKey="actual" fill="#22c55e" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'breakdown' && (
        <div className="space-y-4">
          {filteredBudget.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{item.description}</h4>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: getStatusColor(item.status),
                          color: 'white',
                        }}
                      >
                        {item.status}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Budgeted
                        </p>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.budgetedAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Actual</p>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.actualAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Variance
                        </p>
                        <p
                          className={cn(
                            'text-sm font-medium',
                            item.variance > 0
                              ? 'text-red-600'
                              : item.variance < 0
                                ? 'text-green-600'
                                : 'text-gray-600',
                          )}
                        >
                          {item.variance > 0 ? '+' : ''}
                          {formatCurrency(item.variance)}
                        </p>
                      </div>
                    </div>

                    {item.dueDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedView === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>
              Cumulative spending vs budget over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={spendingTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="budget"
                  fill="#e5e7eb"
                  stroke="#9ca3af"
                  name="Budget"
                  fillOpacity={0.3}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Cumulative Spending"
                />
                <Bar dataKey="monthly" fill="#22c55e" name="Monthly Spending" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {selectedView === 'variance' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Variance Analysis</CardTitle>
              <CardDescription>
                Budget variances by category (over/under spending)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={varianceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === 'variance'
                        ? formatCurrency(value)
                        : `${value.toFixed(1)}%`,
                      name === 'variance' ? 'Variance' : 'Variance %',
                    ]}
                  />
                  <Bar
                    dataKey="variance"
                    fill={(entry: any) =>
                      entry.variance > 0 ? '#dc2626' : '#22c55e'
                    }
                    name="Variance"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Performance</CardTitle>
              <CardDescription>Utilization rate by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">
                        {category.name}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          category.utilization > 100
                            ? 'text-red-600'
                            : category.utilization > 90
                              ? 'text-yellow-600'
                              : 'text-green-600',
                        )}
                      >
                        {category.utilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all duration-300',
                            category.utilization > 100
                              ? 'bg-red-500'
                              : category.utilization > 90
                                ? 'bg-yellow-500'
                                : 'bg-green-500',
                          )}
                          style={{
                            width: `${Math.min(100, category.utilization)}%`,
                          }}
                        />
                      </div>
                      {category.utilization > 100 && (
                        <div className="absolute -right-1 top-0 h-2 w-3 bg-red-500 rounded-r-full" />
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(category.actual)}</span>
                      <span>{formatCurrency(category.budgeted)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default BudgetCharts;
