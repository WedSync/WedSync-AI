/**
 * WS-163: Mobile Budget Dashboard
 * Touch-optimized budget management with real-time spending alerts
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PlusCircle,
  Settings,
  BarChart3,
  Bell,
  CreditCard,
  Wallet,
  Target,
  ArrowRight,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { notificationManager } from '@/lib/mobile/notification-manager';

interface BudgetCategory {
  id: string;
  name: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  color: string;
  icon: string;
  lastUpdated: string;
  alertThreshold: number;
  recentTransactions?: Transaction[];
}

interface Transaction {
  id: string;
  amount: number;
  vendor: string;
  description: string;
  date: string;
  categoryId: string;
  type: 'expense' | 'refund';
  paymentMethod: string;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentageSpent: number;
  monthlyBurn: number;
  projectedTotal: number;
  daysUntilWedding: number;
}

interface MobileBudgetDashboardProps {
  coupleId: string;
  weddingDate: string;
}

export default function MobileBudgetDashboard({
  coupleId,
  weddingDate,
}: MobileBudgetDashboardProps) {
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<
    'overview' | 'categories' | 'trends'
  >('overview');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClientComponentClient();

  // Load budget data
  const loadBudgetData = useCallback(async () => {
    setLoading(true);
    try {
      // Load categories with spending data
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('budget_categories')
        .select(
          `
          *,
          transactions:budget_transactions(
            id,
            amount,
            vendor,
            description,
            transaction_date,
            payment_method,
            type
          )
        `,
        )
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Process categories data
      const processedCategories = processCategories(categoriesData || []);
      setCategories(processedCategories);

      // Calculate summary
      const budgetSummary = calculateBudgetSummary(
        processedCategories,
        weddingDate,
      );
      setSummary(budgetSummary);

      // Check for alerts
      const budgetAlerts = checkBudgetAlerts(processedCategories);
      setAlerts(budgetAlerts);

      // Send push notifications for new alerts
      for (const alert of budgetAlerts.filter((a) => a.isNew)) {
        await notificationManager.sendBudgetAlert({
          coupleId,
          categoryId: alert.categoryId,
          categoryName: alert.categoryName,
          percentage: alert.percentage,
          amountSpent: alert.amountSpent,
          budgetLimit: alert.budgetLimit,
          severity: alert.severity,
          type: alert.type,
        });
      }
    } catch (error) {
      console.error('[MobileBudget] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [coupleId, weddingDate, supabase]);

  // Initial load
  useEffect(() => {
    loadBudgetData();
  }, [loadBudgetData]);

  // Process categories data
  const processCategories = (data: any[]): BudgetCategory[] => {
    return data.map((category) => {
      const transactions = category.transactions || [];
      const spentAmount = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

      const refundAmount = transactions
        .filter((t: any) => t.type === 'refund')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const netSpent = spentAmount - refundAmount;
      const remainingAmount = category.budgeted_amount - netSpent;
      const percentageUsed = (netSpent / category.budgeted_amount) * 100;

      return {
        id: category.id,
        name: category.name,
        budgetedAmount: category.budgeted_amount,
        spentAmount: netSpent,
        remainingAmount: Math.max(remainingAmount, 0),
        percentageUsed: Math.min(percentageUsed, 100),
        color: category.color || getRandomColor(),
        icon: category.icon || 'DollarSign',
        lastUpdated: category.updated_at,
        alertThreshold: category.alert_threshold || 80,
        recentTransactions: transactions
          .sort(
            (a: any, b: any) =>
              new Date(b.transaction_date).getTime() -
              new Date(a.transaction_date).getTime(),
          )
          .slice(0, 3),
      };
    });
  };

  // Calculate budget summary
  const calculateBudgetSummary = (
    categories: BudgetCategory[],
    weddingDate: string,
  ): BudgetSummary => {
    const totalBudget = categories.reduce(
      (sum, cat) => sum + cat.budgetedAmount,
      0,
    );
    const totalSpent = categories.reduce(
      (sum, cat) => sum + cat.spentAmount,
      0,
    );
    const totalRemaining = totalBudget - totalSpent;
    const percentageSpent = (totalSpent / totalBudget) * 100;

    // Calculate monthly burn rate
    const now = new Date();
    const wedding = new Date(weddingDate);
    const daysUntilWedding = Math.ceil(
      (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const monthsUntilWedding = Math.max(daysUntilWedding / 30, 1);
    const monthlyBurn = totalSpent / Math.max((365 - daysUntilWedding) / 30, 1);
    const projectedTotal = totalSpent + monthlyBurn * monthsUntilWedding;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      percentageSpent,
      monthlyBurn,
      projectedTotal,
      daysUntilWedding,
    };
  };

  // Check for budget alerts
  const checkBudgetAlerts = (categories: BudgetCategory[]) => {
    const alerts: any[] = [];

    categories.forEach((category) => {
      if (category.percentageUsed >= 100) {
        alerts.push({
          id: `overspent_${category.id}`,
          categoryId: category.id,
          categoryName: category.name,
          type: 'overspend',
          severity: 'critical',
          percentage: category.percentageUsed,
          amountSpent: category.spentAmount,
          budgetLimit: category.budgetedAmount,
          message: `You've exceeded your ${category.name} budget by $${(category.spentAmount - category.budgetedAmount).toFixed(2)}`,
          isNew: true,
        });
      } else if (category.percentageUsed >= category.alertThreshold) {
        alerts.push({
          id: `warning_${category.id}`,
          categoryId: category.id,
          categoryName: category.name,
          type: 'approaching_limit',
          severity: 'warning',
          percentage: category.percentageUsed,
          amountSpent: category.spentAmount,
          budgetLimit: category.budgetedAmount,
          message: `${category.name} is ${category.percentageUsed.toFixed(1)}% spent`,
          isNew: category.percentageUsed >= category.alertThreshold + 10,
        });
      }
    });

    return alerts;
  };

  // Refresh data with haptic feedback
  const handleRefresh = async () => {
    setRefreshing(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    await loadBudgetData();
    setRefreshing(false);
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Get alert color
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Get progress bar color
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">Budget</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 disabled:animate-spin"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
            {(['overview', 'categories', 'trends'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveView(tab)}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                  activeView === tab
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b">
          <div className="flex items-start space-x-3">
            <Bell className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                Budget Alerts
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {alerts.length}{' '}
                {alerts.length === 1 ? 'category needs' : 'categories need'}{' '}
                attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeView === 'overview' && summary && (
        <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${summary.totalBudget.toLocaleString()}
                  </p>
                </div>
                <Target className="h-8 w-8 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Spent</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${summary.totalSpent.toLocaleString()}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${summary.totalRemaining.toLocaleString()}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Days Left</p>
                  <p className="text-xl font-bold text-gray-900">
                    {summary.daysUntilWedding}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Budget Progress</h3>
              <span className="text-sm text-gray-600">
                {summary.percentageSpent.toFixed(1)}% used
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(summary.percentageSpent)}`}
                style={{ width: `${Math.min(summary.percentageSpent, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-600">
              <span>$0</span>
              <span>${summary.totalBudget.toLocaleString()}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-700 rounded-lg py-3 px-4 text-sm font-medium">
                <PlusCircle className="h-4 w-4" />
                <span>Add Expense</span>
              </button>

              <button className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 rounded-lg py-3 px-4 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                <span>View Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeView === 'categories' && (
        <div className="p-4 space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ${category.spentAmount.toLocaleString()} of $
                        {category.budgetedAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {category.percentageUsed.toFixed(1)}%
                      </p>
                      <p
                        className={`text-xs ${category.percentageUsed >= 80 ? 'text-red-600' : 'text-gray-500'}`}
                      >
                        ${category.remainingAmount.toLocaleString()} left
                      </p>
                    </div>

                    {expandedCategory === category.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(category.percentageUsed)}`}
                    style={{
                      width: `${Math.min(category.percentageUsed, 100)}%`,
                    }}
                  />
                </div>
              </button>

              {/* Expanded Content */}
              {expandedCategory === category.id && (
                <div className="border-t border-gray-100 p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Recent Transactions
                      </span>
                      <button className="text-xs text-indigo-600 hover:text-indigo-700">
                        View All
                      </button>
                    </div>

                    {category.recentTransactions &&
                    category.recentTransactions.length > 0 ? (
                      <div className="space-y-2">
                        {category.recentTransactions.map(
                          (transaction, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {transaction.vendor}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(
                                    transaction.date,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <span
                                className={`text-sm font-semibold ${
                                  transaction.type === 'expense'
                                    ? 'text-red-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {transaction.type === 'expense' ? '-' : '+'}$
                                {Math.abs(transaction.amount).toFixed(2)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No transactions yet
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trends Tab */}
      {activeView === 'trends' && summary && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Spending Trends
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Burn Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${summary.monthlyBurn.toLocaleString()}/month
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Projected Total</span>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-sm font-semibold ${
                      summary.projectedTotal > summary.totalBudget
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    ${summary.projectedTotal.toLocaleString()}
                  </span>
                  {summary.projectedTotal > summary.totalBudget ? (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>

              {summary.projectedTotal > summary.totalBudget && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Budget Warning
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        You're projected to exceed your budget by $
                        {(
                          summary.projectedTotal - summary.totalBudget
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Spending Categories */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Top Spending Categories
            </h3>
            <div className="space-y-3">
              {categories
                .sort((a, b) => b.spentAmount - a.spentAmount)
                .slice(0, 5)
                .map((category, index) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">
                        #{index + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-900">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ${category.spentAmount.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-4">
        <button className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors">
          <PlusCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

// Helper function to get random colors for categories
function getRandomColor(): string {
  const colors = [
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
