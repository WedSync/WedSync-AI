'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  PieChart,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-untitled';
import { cn } from '@/lib/utils';
import { DashboardSection } from '@/lib/services/dashboardTemplateService';

interface BudgetTrackerSectionProps {
  section: DashboardSection;
  clientId: string;
  clientData?: {
    budget_range?: string;
    package_price?: number;
    deposit_amount?: number;
    balance_due?: number;
  };
  customConfig?: any;
  onInteraction?: (action: string, data?: any) => void;
}

interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  spent: number;
  color: string;
  icon: string;
}

// Mock budget data - in production this would come from the database
const mockBudgetData: BudgetCategory[] = [
  {
    id: 'venue',
    name: 'Venue',
    budgeted: 15000,
    spent: 15000,
    color: '#7F56D9',
    icon: '🏰',
  },
  {
    id: 'catering',
    name: 'Catering',
    budgeted: 12000,
    spent: 8500,
    color: '#2E90FA',
    icon: '🍽️',
  },
  {
    id: 'photography',
    name: 'Photography',
    budgeted: 5000,
    spent: 2500,
    color: '#F79009',
    icon: '📸',
  },
  {
    id: 'flowers',
    name: 'Flowers',
    budgeted: 3000,
    spent: 0,
    color: '#12B76A',
    icon: '🌸',
  },
  {
    id: 'music',
    name: 'Music & DJ',
    budgeted: 2500,
    spent: 0,
    color: '#F04438',
    icon: '🎵',
  },
  {
    id: 'attire',
    name: 'Attire',
    budgeted: 4000,
    spent: 1800,
    color: '#9E77ED',
    icon: '👗',
  },
];

export default function BudgetTrackerSection({
  section,
  clientId,
  clientData,
  customConfig,
  onInteraction,
}: BudgetTrackerSectionProps) {
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const config = { ...section.section_config, ...customConfig };

  const budgetData = mockBudgetData; // In production: fetch from API

  // Calculate totals
  const totalBudget = budgetData.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = budgetData.reduce((sum, cat) => sum + cat.spent, 0);
  const remainingBudget = totalBudget - totalSpent;
  const percentageSpent = Math.round((totalSpent / totalBudget) * 100);

  // Identify over-budget categories
  const overBudgetCategories = budgetData.filter(
    (cat) => cat.spent > cat.budgeted,
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: config.currency || 'GBP',
    }).format(amount);
  };

  const getSpendingStatus = (budgeted: number, spent: number) => {
    const percentage = (spent / budgeted) * 100;
    if (spent > budgeted) return 'over';
    if (percentage > 90) return 'warning';
    if (percentage > 50) return 'good';
    return 'low';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            <p className="text-sm text-gray-600">{section.description}</p>
          </div>
        </div>

        {overBudgetCategories.length > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {overBudgetCategories.length} over budget
          </Badge>
        )}
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Budget */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Total Budget
            </span>
            <PieChart className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(totalBudget)}
          </p>
        </div>

        {/* Total Spent */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">
              Total Spent
            </span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-sm text-green-600 mt-1">
            {percentageSpent}% of budget
          </p>
        </div>

        {/* Remaining Budget */}
        <div
          className={cn(
            'rounded-lg p-4',
            remainingBudget >= 0 ? 'bg-purple-50' : 'bg-red-50',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={cn(
                'text-sm font-medium',
                remainingBudget >= 0 ? 'text-purple-700' : 'text-red-700',
              )}
            >
              {remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
            </span>
            {remainingBudget >= 0 ? (
              <TrendingUp className="h-4 w-4 text-purple-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <p
            className={cn(
              'text-2xl font-bold',
              remainingBudget >= 0 ? 'text-purple-900' : 'text-red-900',
            )}
          >
            {formatCurrency(Math.abs(remainingBudget))}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {config.show_progress !== false && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Budget Progress
            </span>
            <span className="text-sm text-gray-600">{percentageSpent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                'h-3 rounded-full transition-all duration-300',
                percentageSpent > 100
                  ? 'bg-red-500'
                  : percentageSpent > 90
                    ? 'bg-orange-500'
                    : 'bg-green-500',
              )}
              style={{ width: `${Math.min(percentageSpent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Budget Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Budget Breakdown</h4>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                viewMode === 'overview'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                viewMode === 'detailed'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              Detailed
            </button>
          </div>
        </div>

        {budgetData.map((category) => {
          const status = getSpendingStatus(category.budgeted, category.spent);
          const percentage = Math.min(
            (category.spent / category.budgeted) * 100,
            100,
          );

          return (
            <div
              key={category.id}
              className={cn(
                'border rounded-lg p-4 cursor-pointer transition-all duration-200',
                'hover:shadow-md',
                getStatusColor(status),
              )}
              onClick={() => onInteraction?.('view_category', { category })}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{category.icon}</span>
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {category.name}
                    </h5>
                    {viewMode === 'detailed' && (
                      <p className="text-sm text-gray-600">
                        {formatCurrency(category.spent)} of{' '}
                        {formatCurrency(category.budgeted)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {viewMode === 'overview' ? (
                    <span className="font-semibold">
                      {formatCurrency(category.spent)}
                    </span>
                  ) : (
                    <div>
                      <span className="font-semibold">
                        {formatCurrency(category.budgeted - category.spent)}
                      </span>
                      <p className="text-sm text-gray-500">remaining</p>
                    </div>
                  )}
                </div>
              </div>

              {viewMode === 'detailed' && (
                <div className="space-y-2">
                  <div className="w-full bg-white rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{Math.round(percentage)}% used</span>
                    {category.spent > category.budgeted && (
                      <span className="text-red-600 font-medium">
                        Over by{' '}
                        {formatCurrency(category.spent - category.budgeted)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Add */}
      {config.allow_quick_add !== false && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => onInteraction?.('add_expense', {})}
            >
              Add Expense
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onInteraction?.('view_detailed', {})}
            >
              View Detailed Budget
            </Button>
          </div>
        </div>
      )}

      {/* Budget Alerts */}
      {overBudgetCategories.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Budget Alert</p>
              <p className="text-sm text-red-700">
                {overBudgetCategories.length === 1
                  ? `${overBudgetCategories[0].name} is over budget`
                  : `${overBudgetCategories.length} categories are over budget`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
