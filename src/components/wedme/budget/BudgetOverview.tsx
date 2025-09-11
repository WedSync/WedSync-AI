'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  PiggyBank,
  CreditCard,
  Receipt,
  Plus,
  Filter,
  Calendar,
  Download,
} from 'lucide-react';
import {
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  color: string;
  transaction_count?: number;
  last_transaction_date?: Date;
}

interface BudgetTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  vendor?: string;
  receipt_url?: string;
  tags?: string[];
}

interface BudgetOverviewProps {
  clientId: string;
  totalBudget: number;
  className?: string;
  onAddTransaction?: () => void;
  onManageCategories?: () => void;
}

export function BudgetOverview({
  clientId,
  totalBudget,
  className,
  onAddTransaction,
  onManageCategories,
}: BudgetOverviewProps) {
  // State
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<
    BudgetTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    'week' | 'month' | 'quarter'
  >('month');

  // Calculated values
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const spentPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = totalSpent > totalBudget;

  // Categories at risk (>85% spent)
  const categoriesAtRisk = categories.filter(
    (cat) =>
      cat.budgeted_amount > 0 && cat.spent_amount / cat.budgeted_amount > 0.85,
  );

  // Load budget data
  useEffect(() => {
    loadBudgetData();
  }, [clientId, selectedPeriod]);

  const loadBudgetData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load budget categories with spending data
      const categoriesResponse = await fetch(
        `/api/budget/categories?client_id=${clientId}`,
      );
      if (!categoriesResponse.ok) throw new Error('Failed to load categories');
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData.categories || []);

      // Load recent transactions
      const transactionsResponse = await fetch(
        `/api/budget/transactions?client_id=${clientId}&limit=10&sort=date_desc`,
      );
      if (!transactionsResponse.ok)
        throw new Error('Failed to load transactions');
      const transactionsData = await transactionsResponse.json();
      setRecentTransactions(transactionsData.transactions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load budget data',
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getBudgetStatusColor = () => {
    if (isOverBudget) return 'text-error-600 bg-error-50 border-error-200';
    if (spentPercentage > 85)
      return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-success-600 bg-success-50 border-success-200';
  };

  const getCategoryStatusColor = (category: BudgetCategory) => {
    const spentPercent =
      category.budgeted_amount > 0
        ? (category.spent_amount / category.budgeted_amount) * 100
        : 0;

    if (spentPercent >= 100) return 'text-error-600';
    if (spentPercent > 85) return 'text-warning-600';
    return 'text-success-600';
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
          <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
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
            Failed to Load Budget
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadBudgetData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget Overview</h2>
          <p className="text-gray-600 mt-1">
            Track your wedding spending and stay on budget
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  selectedPeriod === period
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={onAddTransaction}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <Target className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalBudget)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalSpent)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={cn(
                'px-2 py-1 rounded-full text-xs font-medium border',
                getBudgetStatusColor(),
              )}
            >
              {formatPercentage(spentPercentage)}
            </div>
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success-50 rounded-lg">
              <PiggyBank className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Remaining</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  totalRemaining >= 0 ? 'text-success-600' : 'text-error-600',
                )}
              >
                {formatCurrency(Math.abs(totalRemaining))}
              </p>
            </div>
          </div>
          {totalRemaining < 0 && (
            <div className="flex items-center gap-1 text-xs text-error-600 mt-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Over budget</span>
            </div>
          )}
        </div>

        {/* Categories at Risk */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-warning-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">At Risk</p>
              <p className="text-2xl font-bold text-gray-900">
                {categoriesAtRisk.length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Categories over 85% spent</p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Overall Progress
          </h3>
          <span className="text-sm text-gray-600">
            {formatPercentage(spentPercentage)} of budget used
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={cn(
              'h-3 rounded-full transition-all duration-300',
              isOverBudget
                ? 'bg-error-500'
                : spentPercentage > 85
                  ? 'bg-warning-500'
                  : 'bg-success-500',
            )}
            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatCurrency(0)}</span>
          <span>{formatCurrency(totalBudget)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Categories
            </h3>
            <button
              onClick={onManageCategories}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Manage
            </button>
          </div>

          <div className="space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No budget categories set up yet</p>
                <button
                  onClick={onManageCategories}
                  className="mt-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Set up categories
                </button>
              </div>
            ) : (
              categories.map((category) => {
                const spentPercent =
                  category.budgeted_amount > 0
                    ? Math.min(
                        (category.spent_amount / category.budgeted_amount) *
                          100,
                        100,
                      )
                    : 0;
                const remaining =
                  category.budgeted_amount - category.spent_amount;

                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(category.spent_amount)} /{' '}
                          {formatCurrency(category.budgeted_amount)}
                        </p>
                        <p
                          className={cn(
                            'text-xs',
                            getCategoryStatusColor(category),
                          )}
                        >
                          {formatCurrency(Math.abs(remaining))}{' '}
                          {remaining >= 0 ? 'left' : 'over'}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          spentPercent >= 100
                            ? 'bg-error-500'
                            : spentPercent > 85
                              ? 'bg-warning-500'
                              : 'bg-success-500',
                        )}
                        style={{ width: `${spentPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No transactions yet</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Receipt className="w-4 h-4 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {transaction.vendor || transaction.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{transaction.category}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(transaction.date, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      -{formatCurrency(transaction.amount)}
                    </p>
                    {transaction.receipt_url && (
                      <Receipt className="w-3 h-3 text-green-500 ml-auto mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(isOverBudget || categoriesAtRisk.length > 0) && (
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-warning-800 mb-1">
                Budget Alerts
              </h4>
              <ul className="text-sm text-warning-700 space-y-1">
                {isOverBudget && (
                  <li>
                    • You are {formatCurrency(Math.abs(totalRemaining))} over
                    your total budget
                  </li>
                )}
                {categoriesAtRisk.map((category) => (
                  <li key={category.id}>
                    • {category.name} is{' '}
                    {formatPercentage(
                      (category.spent_amount / category.budgeted_amount) * 100,
                    )}{' '}
                    spent
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
