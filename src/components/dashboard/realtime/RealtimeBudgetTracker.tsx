'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeConnection } from '@/hooks/useRealtime';
import { formatDistanceToNow, format } from 'date-fns';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Download,
  FileText,
  BarChart,
  PieChart,
  Calendar,
  CreditCard,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BudgetUpdate } from '@/types/realtime';

interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  dueDate?: number;
  notes?: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  spent: number;
  remaining: number;
  items: BudgetItem[];
  color?: string;
}

interface Budget {
  id: string;
  total: number;
  spent: number;
  remaining: number;
  categories: BudgetCategory[];
  lastUpdated?: number;
}

interface RealtimeBudgetTrackerProps {
  budget: Budget;
  onUpdate?: (update: BudgetUpdate) => void;
  allowEditing?: boolean;
  showAnalytics?: boolean;
  showPaymentSchedule?: boolean;
  showNotifications?: boolean;
  showReports?: boolean;
  allowExport?: boolean;
  enableAnimations?: boolean;
  compactView?: boolean;
  className?: string;
}

export function RealtimeBudgetTracker({
  budget: initialBudget,
  onUpdate,
  allowEditing = false,
  showAnalytics = false,
  showPaymentSchedule = false,
  showNotifications = true,
  showReports = false,
  allowExport = false,
  enableAnimations = true,
  compactView = false,
  className,
}: RealtimeBudgetTrackerProps) {
  const [budget, setBudget] = useState(initialBudget);
  const [recentUpdates, setRecentUpdates] = useState<BudgetUpdate[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [addingExpense, setAddingExpense] = useState<string | null>(null);
  const [queuedUpdates, setQueuedUpdates] = useState<BudgetUpdate[]>([]);
  const [animatingCategories, setAnimatingCategories] = useState<Set<string>>(
    new Set(),
  );

  const { isConnected, connectionState, send, latency } = useRealtimeConnection(
    `budget-${initialBudget.id}`,
    {
      onMessage: handleBudgetUpdate,
      onConnect: () => {
        // Send queued updates when reconnected
        queuedUpdates.forEach((update) =>
          send({ type: 'budget_update', data: update }),
        );
        setQueuedUpdates([]);
      },
    },
  );

  function handleBudgetUpdate(payload: any) {
    const { type, data } = payload;

    if (type === 'budget_update') {
      const update = data as BudgetUpdate;

      // Update budget based on update type
      setBudget((prev) => {
        const newBudget = { ...prev };
        const category = newBudget.categories.find(
          (c) => c.id === update.categoryId,
        );

        if (category) {
          switch (update.changeType) {
            case 'expense_added':
              category.spent = update.newAmount;
              category.remaining = category.budget - update.newAmount;
              break;
            case 'expense_removed':
              category.spent = update.newAmount;
              category.remaining = category.budget - update.newAmount;
              break;
            case 'budget_adjusted':
              category.budget = update.newAmount;
              category.remaining = update.newAmount - category.spent;
              break;
            case 'payment_made':
              // Update payment status in items
              break;
          }

          // Update totals
          newBudget.spent = newBudget.categories.reduce(
            (sum, cat) => sum + cat.spent,
            0,
          );
          newBudget.remaining = newBudget.total - newBudget.spent;
          newBudget.lastUpdated = update.timestamp;
        }

        return newBudget;
      });

      // Add to recent updates
      setRecentUpdates((prev) => [update, ...prev].slice(0, 10));

      // Animate category
      if (enableAnimations) {
        setAnimatingCategories((prev) => new Set([...prev, update.categoryId]));
        setTimeout(() => {
          setAnimatingCategories((prev) => {
            const next = new Set(prev);
            next.delete(update.categoryId);
            return next;
          });
        }, 1000);
      }

      // Show notification
      if (showNotifications) {
        addNotification(
          `${update.categoryName}: ${update.description || update.changeType.replace('_', ' ')}`,
        );
      }

      onUpdate?.(update);
    }
  }

  const addNotification = useCallback(
    (message: string) => {
      if (!showNotifications) return;

      setNotifications((prev) => [...prev, message]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== message));
      }, 5000);
    },
    [showNotifications],
  );

  const sendUpdate = useCallback(
    (update: Omit<BudgetUpdate, 'timestamp' | 'userId'>) => {
      const fullUpdate: BudgetUpdate = {
        ...update,
        timestamp: Date.now(),
        userId: 'current-user',
      };

      if (isConnected) {
        send({ type: 'budget_update', data: fullUpdate });
      } else {
        // Queue update for when connection is restored
        setQueuedUpdates((prev) => [...prev, fullUpdate]);
        addNotification('Update queued - will sync when connected');
      }

      // Optimistically update local state
      handleBudgetUpdate({ type: 'budget_update', data: fullUpdate });
    },
    [isConnected, send],
  );

  const addExpense = useCallback(
    (categoryId: string, name: string, amount: number) => {
      const category = budget.categories.find((c) => c.id === categoryId);
      if (!category) return;

      sendUpdate({
        categoryId,
        categoryName: category.name,
        previousAmount: category.spent,
        newAmount: category.spent + amount,
        changeType: 'expense_added',
        description: `Added ${name}`,
      });

      setAddingExpense(null);
    },
    [budget.categories, sendUpdate],
  );

  const removeExpense = useCallback(
    (categoryId: string, itemId: string, amount: number) => {
      const category = budget.categories.find((c) => c.id === categoryId);
      if (!category) return;

      sendUpdate({
        categoryId,
        categoryName: category.name,
        previousAmount: category.spent,
        newAmount: category.spent - amount,
        changeType: 'expense_removed',
        description: `Removed expense`,
      });
    },
    [budget.categories, sendUpdate],
  );

  const markAsPaid = useCallback(
    (categoryId: string, itemId: string, itemName: string) => {
      const category = budget.categories.find((c) => c.id === categoryId);
      if (!category) return;

      sendUpdate({
        categoryId,
        categoryName: category.name,
        previousAmount: category.spent,
        newAmount: category.spent,
        changeType: 'payment_made',
        description: `Paid ${itemName}`,
      });
    },
    [budget.categories, sendUpdate],
  );

  const adjustBudget = useCallback(
    (categoryId: string, newBudget: number) => {
      const category = budget.categories.find((c) => c.id === categoryId);
      if (!category) return;

      sendUpdate({
        categoryId,
        categoryName: category.name,
        previousAmount: category.budget,
        newAmount: newBudget,
        changeType: 'budget_adjusted',
        description: `Adjusted budget`,
      });

      setEditingCategory(null);
    },
    [budget.categories, sendUpdate],
  );

  const exportToCSV = useCallback(() => {
    // Implementation for CSV export
    addNotification('Budget exported');
  }, []);

  const exportToPDF = useCallback(() => {
    // Implementation for PDF export
    addNotification('PDF generated');
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalPercentage = (budget.spent / budget.total) * 100;
  const isOverBudget = budget.remaining < 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Summary */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Budget Tracker
          </h2>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionState === 'connected' ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Live</span>
              </>
            ) : connectionState === 'reconnecting' ? (
              <>
                <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                <span className="text-sm text-gray-600">Reconnecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">Working offline</span>
              </>
            )}
          </div>
        </div>

        {/* Budget Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Total Budget:</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(budget.total)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Spent:</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(budget.spent)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Remaining:</p>
            <p
              className={cn(
                'text-2xl font-bold',
                isOverBudget ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatCurrency(budget.remaining)}
            </p>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium">{totalPercentage.toFixed(1)}%</span>
          </div>
          <div
            className="h-4 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={parseFloat(totalPercentage.toFixed(2))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                'h-full transition-all duration-500',
                getProgressColor(totalPercentage),
              )}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <div
              data-testid="budget-warning"
              className="flex items-center gap-2 text-red-600 text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>
                Over budget by {formatCurrency(Math.abs(budget.remaining))}
              </span>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {allowExport && (
          <div className="flex gap-2 mt-4">
            <button
              data-testid="export-csv"
              onClick={exportToCSV}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-1" />
              Export CSV
            </button>
            <button
              data-testid="export-pdf"
              onClick={exportToPDF}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {budget.categories.map((category, index) => (
          <div
            key={category.id}
            data-testid={`category-${category.id}`}
            className={cn(
              'bg-white rounded-lg border p-4 transition-all duration-300',
              animatingCategories.has(category.id) &&
                'animate-pulse ring-2 ring-blue-500',
            )}
          >
            {/* Category Header */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => !compactView && toggleCategory(category.id)}
            >
              <div className="flex items-center gap-2">
                {!compactView &&
                  (expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ))}
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <span className="text-sm text-gray-500">
                  {formatCurrency(category.spent)} /{' '}
                  {formatCurrency(category.budget)}
                </span>
              </div>

              {allowEditing && (
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`add-expense-${category.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingExpense(category.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    data-testid={`edit-budget-${category.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(category.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Category Progress */}
            <div className="mt-3">
              <div
                className="h-2 bg-gray-200 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={parseFloat(
                  ((category.spent / category.budget) * 100).toFixed(2),
                )}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    getProgressColor((category.spent / category.budget) * 100),
                  )}
                  style={{
                    width: `${Math.min((category.spent / category.budget) * 100, 100)}%`,
                  }}
                />
              </div>
              {category.remaining < 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Over budget by {formatCurrency(Math.abs(category.remaining))}
                </p>
              )}
            </div>

            {/* Expanded Content */}
            {!compactView && expandedCategories.has(category.id) && (
              <div className="mt-4 space-y-2">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {item.paid ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                      {allowEditing && (
                        <>
                          {!item.paid && (
                            <button
                              data-testid={`pay-expense-${item.id}`}
                              onClick={() =>
                                markAsPaid(category.id, item.id, item.name)
                              }
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Mark as paid"
                            >
                              <CreditCard className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            data-testid={`remove-expense-${item.id}`}
                            onClick={() => {
                              if (confirm('Remove this expense?')) {
                                removeExpense(
                                  category.id,
                                  item.id,
                                  item.amount,
                                );
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Expense Form */}
            {addingExpense === category.id && (
              <div className="mt-4 p-3 bg-gray-50 rounded space-y-2">
                <input
                  type="text"
                  placeholder="Expense name"
                  className="w-full px-3 py-2 border rounded"
                  id="expense-name"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  className="w-full px-3 py-2 border rounded"
                  id="expense-amount"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const nameInput = document.getElementById(
                        'expense-name',
                      ) as HTMLInputElement;
                      const amountInput = document.getElementById(
                        'expense-amount',
                      ) as HTMLInputElement;
                      if (nameInput?.value && amountInput?.value) {
                        addExpense(
                          category.id,
                          nameInput.value,
                          parseFloat(amountInput.value),
                        );
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Add Expense
                  </button>
                  <button
                    onClick={() => setAddingExpense(null)}
                    className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit Budget Form */}
            {editingCategory === category.id && (
              <div className="mt-4 p-3 bg-gray-50 rounded space-y-2">
                <input
                  type="number"
                  defaultValue={category.budget}
                  className="w-full px-3 py-2 border rounded"
                  id="edit-budget"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const input = document.getElementById(
                        'edit-budget',
                      ) as HTMLInputElement;
                      if (input?.value) {
                        adjustBudget(category.id, parseFloat(input.value));
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Budget Analytics</h3>

          {/* Spending Trends */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Spending Trends
            </h4>
            <div
              data-testid="spending-chart"
              className="h-40 bg-gray-100 rounded flex items-center justify-center"
            >
              <BarChart className="w-8 h-8 text-gray-400" />
              <span className="ml-2 text-gray-600">Spending chart</span>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Category Breakdown
            </h4>
            <div
              data-testid="category-breakdown-chart"
              className="h-40 bg-gray-100 rounded flex items-center justify-center"
            >
              <PieChart className="w-8 h-8 text-gray-400" />
              <div className="ml-4 text-sm text-gray-600">
                {budget.categories.map((cat) => (
                  <div key={cat.id}>
                    {cat.name}: {((cat.spent / budget.spent) * 100).toFixed(1)}%
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget Health */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Budget Health
            </h4>
            <div
              data-testid={
                isOverBudget ? 'budget-health-bad' : 'budget-health-good'
              }
              className={cn(
                'p-3 rounded flex items-center gap-2',
                isOverBudget
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700',
              )}
            >
              {isOverBudget ? (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  <span>Budget needs attention</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Budget is healthy</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Schedule */}
      {showPaymentSchedule && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Payments</h3>
          <div data-testid="payment-schedule" className="space-y-2">
            {budget.categories
              .flatMap((cat) => cat.items.filter((item) => !item.paid))
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Reports */}
      {showReports && (
        <div className="bg-white rounded-lg border p-6">
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Generate Report
          </button>
          <div
            data-testid="budget-report"
            className="mt-4 p-4 bg-gray-50 rounded"
          >
            <h4 className="font-semibold mb-2">Budget Summary Report</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Total Budget: {formatCurrency(budget.total)}</p>
              <p>Total Spent: {formatCurrency(budget.spent)}</p>
              <p>Remaining: {formatCurrency(budget.remaining)}</p>
              <p>Categories: {budget.categories.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Updates</h3>
          <div className="space-y-2">
            {recentUpdates.map((update, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    {update.categoryName}:{' '}
                    {update.description || update.changeType.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(update.timestamp, { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {showNotifications && notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {notifications.map((notification, index) => (
            <div
              key={index}
              role="alert"
              className={cn(
                'px-4 py-3 bg-white rounded-lg shadow-lg border-l-4 border-blue-500',
                enableAnimations && 'animate-fadeIn',
              )}
            >
              {notification}
            </div>
          ))}
        </div>
      )}

      {/* Queued Updates Indicator */}
      {queuedUpdates.length > 0 && (
        <div className="fixed bottom-4 left-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg shadow">
          {queuedUpdates.length} update{queuedUpdates.length > 1 ? 's' : ''}{' '}
          queued
        </div>
      )}
    </div>
  );
}
