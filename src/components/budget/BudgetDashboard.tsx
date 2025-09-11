'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  differenceInDays,
} from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Download,
  Filter,
} from 'lucide-react';

interface BudgetCategory {
  id: string;
  name: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  color: string;
  icon: string;
  percentage_used: number;
  status: 'on_track' | 'caution' | 'warning' | 'over_budget';
}

interface BudgetTotals {
  total_budget: number;
  total_allocated: number;
  total_spent: number;
  total_remaining: number;
  allocation_percentage: number;
  spending_percentage: number;
}

interface PaymentMilestone {
  id: string;
  milestone_name: string;
  amount: number;
  due_date: string;
  payment_status: string;
  vendor_name?: string;
}

export default function BudgetDashboard() {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [totals, setTotals] = useState<BudgetTotals | null>(null);
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'categories' | 'timeline' | 'analytics'
  >('overview');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  const supabase = await createClient();

  useEffect(() => {
    fetchBudgetData();
  }, [dateRange]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch budget categories with calculations
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Calculate percentages and status for each category
      const enrichedCategories =
        categoriesData?.map((cat) => ({
          ...cat,
          percentage_used:
            cat.allocated_amount > 0
              ? Math.round((cat.spent_amount / cat.allocated_amount) * 100)
              : 0,
          status: getStatus(cat.spent_amount, cat.allocated_amount),
        })) || [];

      setCategories(enrichedCategories);

      // Fetch budget totals
      const { data: totalsData, error: totalsError } = await supabase
        .rpc('calculate_budget_totals', { p_user_id: user.id })
        .single();

      if (!totalsError && totalsData) {
        setTotals(totalsData);
      }

      // Fetch upcoming payment milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('budget_payment_milestones')
        .select('*, vendors(business_name)')
        .eq('user_id', user.id)
        .in('payment_status', ['pending', 'scheduled'])
        .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
        .order('due_date')
        .limit(10);

      if (!milestonesError) {
        setMilestones(milestonesData || []);
      }
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (
    spent: number,
    allocated: number,
  ): 'on_track' | 'caution' | 'warning' | 'over_budget' => {
    if (allocated === 0) return 'on_track';
    const percentage = spent / allocated;
    if (percentage > 1) return 'over_budget';
    if (percentage > 0.9) return 'warning';
    if (percentage > 0.8) return 'caution';
    return 'on_track';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return '#10B981';
      case 'caution':
        return '#F59E0B';
      case 'warning':
        return '#F97316';
      case 'over_budget':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Prepare data for charts
  const pieChartData = categories.map((cat) => ({
    name: cat.name,
    value: cat.spent_amount,
    color: cat.color,
  }));

  const barChartData = categories.map((cat) => ({
    name: cat.name,
    allocated: cat.allocated_amount,
    spent: cat.spent_amount,
    remaining: cat.remaining_amount,
  }));

  const radarChartData = categories.map((cat) => ({
    category: cat.name,
    allocated: cat.allocated_amount,
    spent: cat.spent_amount,
    percentage: cat.percentage_used,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Budget Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your wedding budget across {categories.length} categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {['overview', 'categories', 'timeline', 'analytics'].map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              selectedView === view
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Total Budget Overview Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Budget
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${totals.total_budget.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${totals.total_spent.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totals.spending_percentage}% of budget
                </p>
              </div>
              <div className="p-3 bg-error-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-error-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${totals.total_remaining.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(100 - totals.spending_percentage).toFixed(1)}% available
                </p>
              </div>
              <div className="p-3 bg-success-100 rounded-lg">
                <Activity className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {categories.filter((c) => c.status === 'over_budget').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">Over budget</p>
              </div>
              <div className="p-3 bg-warning-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending by Category Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Spending by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Budget vs Spending Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Budget vs Actual
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="allocated" fill="#9E77ED" name="Allocated" />
                <Bar dataKey="spent" fill="#F59E0B" name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {selectedView === 'categories' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Category Details
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spent
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${category.allocated_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${category.spent_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      ${category.remaining_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="w-full max-w-[100px]">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>{category.percentage_used}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(category.percentage_used, 100)}%`,
                                backgroundColor: getStatusColor(
                                  category.status,
                                ),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.status === 'on_track'
                            ? 'bg-success-50 text-success-700 border border-success-200'
                            : category.status === 'caution'
                              ? 'bg-warning-50 text-warning-700 border border-warning-200'
                              : category.status === 'warning'
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-error-50 text-error-700 border border-error-200'
                        }`}
                      >
                        {category.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedView === 'timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Payment Milestones
          </h3>
          <div className="space-y-4">
            {milestones.map((milestone) => {
              const daysUntilDue = differenceInDays(
                new Date(milestone.due_date),
                new Date(),
              );
              const isOverdue = daysUntilDue < 0;
              const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

              return (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-lg border ${
                    isOverdue
                      ? 'border-error-200 bg-error-50'
                      : isDueSoon
                        ? 'border-warning-200 bg-warning-50'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {milestone.milestone_name}
                          </p>
                          {milestone.vendor_name && (
                            <p className="text-sm text-gray-500">
                              {milestone.vendor_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${milestone.amount.toLocaleString()}
                      </p>
                      <p
                        className={`text-sm ${
                          isOverdue
                            ? 'text-error-600'
                            : isDueSoon
                              ? 'text-warning-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                            ? 'Due today'
                            : `Due in ${daysUntilDue} days`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Radar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Category Performance
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarChartData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="% Spent"
                  dataKey="percentage"
                  stroke="#9E77ED"
                  fill="#9E77ED"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Spending Trend Line Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Monthly Spending Trend
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={[
                  { month: 'Jan', spent: 3500, projected: 3750 },
                  { month: 'Feb', spent: 5200, projected: 5500 },
                  { month: 'Mar', spent: 8900, projected: 9250 },
                  { month: 'Apr', spent: 12400, projected: 13000 },
                  { month: 'May', spent: 16800, projected: 17500 },
                  { month: 'Jun', spent: 21200, projected: 22000 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stackId="1"
                  stroke="#F59E0B"
                  fill="#FEF3C7"
                  name="Actual Spent"
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  stackId="2"
                  stroke="#9E77ED"
                  fill="#EDE9FE"
                  name="Projected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
