'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Settings,
  Plus,
  BarChart3,
  FileText,
  RefreshCw,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface BudgetCategory {
  id: string;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  color: string;
  alert_threshold?: number;
}

interface BudgetAlert {
  id: string;
  categoryId: string;
  categoryName: string;
  type: 'overspend' | 'approaching_limit' | 'on_track';
  severity: 'critical' | 'warning' | 'info';
  percentage: number;
  amountSpent: number;
  budgetLimit: number;
  message: string;
  isNew: boolean;
}

interface BudgetCalculation {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  percentageSpent: number;
  monthlyBurn: number;
  projectedTotal: number;
  daysUntilWedding: number;
}

interface BudgetTrackerProps {
  clientId: string;
  totalBudget: number;
  weddingDate?: Date;
  className?: string;
  onBudgetChange?: (newBudget: number) => void;
}

// Separate helper functions to reduce complexity
const calculateDaysUntilWedding = (weddingDate: Date): number => {
  const now = new Date();
  const timeDiff = weddingDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
};

const calculateMonthsUntilWedding = (daysUntilWedding: number): number => {
  return Math.max(daysUntilWedding / 30, 1);
};

const calculateMonthlyBurn = (totalSpent: number, daysUntilWedding: number): number => {
  const daysPassed = Math.max(365 - daysUntilWedding, 1);
  const monthsPassed = daysPassed / 30;
  return totalSpent / Math.max(monthsPassed, 1);
};

const calculateProjectedTotal = (
  totalSpent: number,
  monthlyBurn: number,
  monthsUntilWedding: number
): number => {
  return totalSpent + monthlyBurn * monthsUntilWedding;
};

// Extract budget calculation logic into pure function
const calculateBudgetMetrics = (
  categories: BudgetCategory[],
  totalBudget: number,
  weddingDate: Date
): BudgetCalculation => {
  // Calculate totals
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Calculate time-based metrics
  const daysUntilWedding = calculateDaysUntilWedding(weddingDate);
  const monthsUntilWedding = calculateMonthsUntilWedding(daysUntilWedding);
  const monthlyBurn = calculateMonthlyBurn(totalSpent, daysUntilWedding);
  const projectedTotal = calculateProjectedTotal(totalSpent, monthlyBurn, monthsUntilWedding);

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

// Extract alert creation logic
const createOverspendAlert = (category: BudgetCategory): BudgetAlert => {
  const overspendAmount = category.spent_amount - category.budgeted_amount;
  return {
    id: `overspent_${category.id}`,
    categoryId: category.id,
    categoryName: category.name,
    type: 'overspend',
    severity: 'critical',
    percentage: (category.spent_amount / category.budgeted_amount) * 100,
    amountSpent: category.spent_amount,
    budgetLimit: category.budgeted_amount,
    message: `You've exceeded your ${category.name} budget by $${overspendAmount.toFixed(2)}`,
    isNew: true,
  };
};

const createWarningAlert = (category: BudgetCategory): BudgetAlert => {
  const percentageUsed = (category.spent_amount / category.budgeted_amount) * 100;
  return {
    id: `warning_${category.id}`,
    categoryId: category.id,
    categoryName: category.name,
    type: 'approaching_limit',
    severity: 'warning',
    percentage: percentageUsed,
    amountSpent: category.spent_amount,
    budgetLimit: category.budgeted_amount,
    message: `${category.name} is ${percentageUsed.toFixed(1)}% spent`,
    isNew: percentageUsed >= (category.alert_threshold || 80) + 10,
  };
};

const createOnTrackAlert = (category: BudgetCategory): BudgetAlert => {
  const percentageUsed = (category.spent_amount / category.budgeted_amount) * 100;
  return {
    id: `ontrack_${category.id}`,
    categoryId: category.id,
    categoryName: category.name,
    type: 'on_track',
    severity: 'info',
    percentage: percentageUsed,
    amountSpent: category.spent_amount,
    budgetLimit: category.budgeted_amount,
    message: `${category.name} spending is on track`,
    isNew: false,
  };
};

// Simplified alert checking with extracted logic
const checkCategoryAlert = (category: BudgetCategory): BudgetAlert | null => {
  if (category.budgeted_amount <= 0) {
    return null;
  }

  const percentageUsed = (category.spent_amount / category.budgeted_amount) * 100;
  const alertThreshold = category.alert_threshold || 80;

  if (percentageUsed >= 100) {
    return createOverspendAlert(category);
  }
  
  if (percentageUsed >= alertThreshold) {
    return createWarningAlert(category);
  }
  
  if (percentageUsed < alertThreshold) {
    return createOnTrackAlert(category);
  }

  return null;
};

// Main component with reduced complexity
export function BudgetTracker({
  clientId,
  totalBudget,
  weddingDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
  className,
  onBudgetChange,
}: BudgetTrackerProps) {
  // State
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'analytics'>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [clientId, refreshKey]);

  // Simplified load function
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budget/categories?client_id=${clientId}`);
      if (!response.ok) throw new Error('Failed to load categories');
      
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Memoized calculations
  const budgetMetrics = useMemo(
    () => calculateBudgetMetrics(categories, totalBudget, weddingDate),
    [categories, totalBudget, weddingDate]
  );

  // Memoized alerts
  const budgetAlerts = useMemo(() => {
    return categories
      .map(checkCategoryAlert)
      .filter((alert): alert is BudgetAlert => alert !== null)
      .filter(alert => alert.severity !== 'info'); // Only show warnings and critical
  }, [categories]);

  // Simple handlers
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/budget/export?client_id=${clientId}&format=csv`
      );
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budget-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [clientId]);

  // Render helpers
  const renderHeader = () => (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Budget Tracker</h1>
        <p className="text-gray-600 mt-1">
          Manage your wedding budget efficiently
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <button
          onClick={handleExport}
          className="px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {[
          { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { key: 'categories' as const, label: 'Categories', icon: Settings },
          { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900">
            ${budgetMetrics.totalBudget.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900">
            ${budgetMetrics.totalSpent.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-2xl font-bold text-green-600">
            ${budgetMetrics.totalRemaining.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Days Until Wedding</p>
          <p className="text-2xl font-bold text-primary-600">
            {budgetMetrics.daysUntilWedding}
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
          {budgetAlerts.map(alert => (
            <div
              key={alert.id}
              className={cn(
                'p-4 rounded-lg border',
                alert.severity === 'critical' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              )}
            >
              <p className={cn(
                'font-medium',
                alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
              )}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Budget Categories
          </h3>
          <div className="space-y-4">
            {categories.map(category => {
              const percentage = category.budgeted_amount > 0
                ? (category.spent_amount / category.budgeted_amount) * 100
                : 0;
              
              return (
                <div key={category.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      ${category.spent_amount.toLocaleString()} / ${category.budgeted_amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        percentage >= 100 ? 'bg-red-500' :
                        percentage >= 80 ? 'bg-yellow-500' :
                        'bg-green-500'
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Manage Categories
      </h3>
      <p className="text-gray-500">
        Category management interface would be implemented here
      </p>
    </div>
  );

  const renderAnalytics = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Budget Analytics
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-500 mb-2">Monthly Burn Rate</p>
          <p className="text-xl font-bold text-gray-900">
            ${budgetMetrics.monthlyBurn.toFixed(2)}/month
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-2">Projected Total</p>
          <p className="text-xl font-bold text-gray-900">
            ${budgetMetrics.projectedTotal.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className={cn('space-y-6', className)}>
      {renderHeader()}
      {renderTabs()}
      
      <div className="min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'categories' && renderCategories()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </div>
    </div>
  );
}