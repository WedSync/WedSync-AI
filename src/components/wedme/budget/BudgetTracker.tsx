'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  BarChart3,
  FileText,
  RefreshCw,
  Download,
  Upload,
} from 'lucide-react';
import { BudgetOverview } from './BudgetOverview';
import { CategoryManager } from './CategoryManager';
import { TransactionEntry } from './TransactionEntry';
import { BudgetCharts } from './BudgetCharts';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  budgeted_amount: number;
  spent_amount: number;
  percentage_of_total: number;
  color: string;
}

interface BudgetTrackerProps {
  clientId: string;
  totalBudget: number;
  className?: string;
  onBudgetChange?: (newBudget: number) => void;
}

export function BudgetTracker({
  clientId,
  totalBudget,
  className,
  onBudgetChange,
}: BudgetTrackerProps) {
  // State
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'categories' | 'transactions' | 'analytics'
  >('overview');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [clientId, refreshKey]);

  const loadCategories = async () => {
    try {
      const response = await fetch(
        `/api/budget/categories?client_id=${clientId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCategoriesChange = (newCategories: BudgetCategory[]) => {
    setCategories(newCategories);
  };

  const handleTransactionAdded = () => {
    setShowTransactionForm(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/budget/export?client_id=${clientId}&format=csv`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Tracker</h1>
          <p className="text-gray-600 mt-1">
            Manage your wedding budget and track expenses
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

          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'categories', label: 'Categories', icon: Settings },
            { key: 'transactions', label: 'Transactions', icon: FileText },
            { key: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <BudgetOverview
            clientId={clientId}
            totalBudget={totalBudget}
            onAddTransaction={() => setShowTransactionForm(true)}
            onManageCategories={() => setActiveTab('categories')}
            key={refreshKey}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManager
            clientId={clientId}
            totalBudget={totalBudget}
            onCategoriesChange={handleCategoriesChange}
            key={refreshKey}
          />
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <TransactionEntry
              clientId={clientId}
              categories={categories}
              onTransactionAdded={handleTransactionAdded}
            />

            {/* Transaction List would go here */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Transactions
              </h3>
              <p className="text-gray-500 text-center py-8">
                Transaction history component would be implemented here
              </p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <BudgetCharts
            clientId={clientId}
            categories={categories}
            totalBudget={totalBudget}
            key={refreshKey}
          />
        )}
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <TransactionEntry
              clientId={clientId}
              categories={categories}
              onTransactionAdded={handleTransactionAdded}
              onClose={() => setShowTransactionForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
