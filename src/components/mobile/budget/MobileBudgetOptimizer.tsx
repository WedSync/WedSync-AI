'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { TouchBudgetAllocation } from './TouchBudgetAllocation';
import { MobileBudgetVisualization } from './MobileBudgetVisualization';
import { QuickBudgetEntry } from './QuickBudgetEntry';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  color: string;
  percentage: number;
}

interface MobileBudgetOptimizerProps {
  totalBudget: number;
  offlineCapable: boolean;
  touchOptimized: boolean;
  collaborativeMode: boolean;
  weddingId: string;
  organizationId: string;
}

interface ViewMode {
  mode: 'overview' | 'allocation' | 'visualization' | 'entry';
  title: string;
  icon: string;
}

const viewModes: ViewMode[] = [
  { mode: 'overview', title: 'Overview', icon: '📊' },
  { mode: 'allocation', title: 'Allocate', icon: '💰' },
  { mode: 'visualization', title: 'Charts', icon: '📈' },
  { mode: 'entry', title: 'Quick Add', icon: '➕' },
];

export function MobileBudgetOptimizer({
  totalBudget,
  offlineCapable,
  touchOptimized,
  collaborativeMode,
  weddingId,
  organizationId,
}: MobileBudgetOptimizerProps) {
  const [currentView, setCurrentView] = useState<ViewMode['mode']>('overview');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [categories, setCategories] = useState<BudgetCategory[]>([
    {
      id: '1',
      name: 'Venue',
      allocated: 40000,
      spent: 35000,
      color: '#8B5CF6',
      percentage: 40,
    },
    {
      id: '2',
      name: 'Catering',
      allocated: 25000,
      spent: 20000,
      color: '#06B6D4',
      percentage: 25,
    },
    {
      id: '3',
      name: 'Photography',
      allocated: 15000,
      spent: 12000,
      color: '#F59E0B',
      percentage: 15,
    },
    {
      id: '4',
      name: 'Flowers',
      allocated: 8000,
      spent: 5000,
      color: '#EF4444',
      percentage: 8,
    },
    {
      id: '5',
      name: 'Music',
      allocated: 5000,
      spent: 4000,
      color: '#10B981',
      percentage: 5,
    },
    {
      id: '6',
      name: 'Other',
      allocated: 7000,
      spent: 3000,
      color: '#6B7280',
      percentage: 7,
    },
  ]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate budget metrics
  const budgetMetrics = useMemo(() => {
    const totalAllocated = categories.reduce(
      (sum, cat) => sum + cat.allocated,
      0,
    );
    const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
    const remaining = totalBudget - totalSpent;
    const spentPercentage = (totalSpent / totalBudget) * 100;
    const allocatedPercentage = (totalAllocated / totalBudget) * 100;

    return {
      totalAllocated,
      totalSpent,
      remaining,
      spentPercentage,
      allocatedPercentage,
      isOverBudget: totalSpent > totalBudget,
      isOverAllocated: totalAllocated > totalBudget,
    };
  }, [categories, totalBudget]);

  // Handle swipe navigation between views
  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const currentIndex = viewModes.findIndex((v) => v.mode === currentView);
      if (direction === 'left' && currentIndex < viewModes.length - 1) {
        setCurrentView(viewModes[currentIndex + 1].mode);
      } else if (direction === 'right' && currentIndex > 0) {
        setCurrentView(viewModes[currentIndex - 1].mode);
      }
    },
    [currentView],
  );

  // Handle pan gesture for view switching
  const handlePanEnd = useCallback(
    (event: any, info: PanInfo) => {
      const threshold = 50; // minimum distance for swipe
      if (Math.abs(info.offset.x) > threshold) {
        if (info.offset.x > 0) {
          handleSwipe('right');
        } else {
          handleSwipe('left');
        }
      }
    },
    [handleSwipe],
  );

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Haptic feedback for interactions
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator && touchOptimized) {
      navigator.vibrate(10); // Light haptic feedback
    }
  }, [touchOptimized]);

  const handleCategoryUpdate = useCallback(
    (updatedCategories: BudgetCategory[]) => {
      setCategories(updatedCategories);
      triggerHaptic();
      setLastSync(new Date());
    },
    [triggerHaptic],
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Status Bar */}
      {isOffline && offlineCapable && (
        <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
          <div className="flex items-center gap-2 text-orange-800 text-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span>Working offline - changes will sync when connected</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Wedding Budget</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {collaborativeMode && <span>👥 Shared</span>}
            <span>Last sync: {lastSync.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-xs text-gray-500">Total Budget</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-lg font-bold',
                budgetMetrics.isOverBudget ? 'text-red-600' : 'text-green-600',
              )}
            >
              {formatCurrency(budgetMetrics.totalSpent)}
            </div>
            <div className="text-xs text-gray-500">Spent</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-lg font-bold',
                budgetMetrics.remaining < 0 ? 'text-red-600' : 'text-blue-600',
              )}
            >
              {formatCurrency(Math.abs(budgetMetrics.remaining))}
            </div>
            <div className="text-xs text-gray-500">
              {budgetMetrics.remaining < 0 ? 'Over' : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget Progress</span>
            <span>{Math.round(budgetMetrics.spentPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={cn(
                'h-2 rounded-full transition-colors',
                budgetMetrics.spentPercentage > 100
                  ? 'bg-red-500'
                  : budgetMetrics.spentPercentage > 80
                    ? 'bg-orange-500'
                    : 'bg-green-500',
              )}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(budgetMetrics.spentPercentage, 100)}%`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {viewModes.map((view) => (
            <button
              key={view.mode}
              onClick={() => {
                setCurrentView(view.mode);
                triggerHaptic();
              }}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all',
                'flex items-center justify-center gap-2',
                currentView === view.mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900',
              )}
            >
              <span>{view.icon}</span>
              <span className="hidden sm:inline">{view.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div
        className="flex-1 overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onPanEnd={handlePanEnd}
        dragElastic={0.1}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="h-full"
          >
            {currentView === 'overview' && (
              <BudgetOverview
                categories={categories}
                metrics={budgetMetrics}
                formatCurrency={formatCurrency}
              />
            )}

            {currentView === 'allocation' && (
              <TouchBudgetAllocation
                categories={categories}
                totalBudget={totalBudget}
                onCategoriesUpdate={handleCategoryUpdate}
                gestureEnabled={touchOptimized}
                hapticFeedback={touchOptimized}
              />
            )}

            {currentView === 'visualization' && (
              <MobileBudgetVisualization
                budgetData={{
                  categories: categories.map((cat) => ({
                    name: cat.name,
                    value: cat.spent,
                    color: cat.color,
                    percentage: (cat.spent / budgetMetrics.totalSpent) * 100,
                  })),
                  total: budgetMetrics.totalSpent,
                }}
                chartType="pie"
                compactMode={true}
                touchInteractive={touchOptimized}
              />
            )}

            {currentView === 'entry' && (
              <QuickBudgetEntry
                categories={categories}
                weddingId={weddingId}
                organizationId={organizationId}
                onEntryAdded={(newEntry) => {
                  // Update category spending
                  const updatedCategories = categories.map((cat) =>
                    cat.name === newEntry.category
                      ? { ...cat, spent: cat.spent + newEntry.amount }
                      : cat,
                  );
                  handleCategoryUpdate(updatedCategories);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Bottom Action Bar - Only show on mobile */}
      <div className="md:hidden bg-white border-t px-4 py-3 safe-area-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentView('entry');
              triggerHaptic();
            }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium"
          >
            + Add Expense
          </button>
          <button
            onClick={() => {
              // Trigger sync or other action
              triggerHaptic();
            }}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            disabled={isOffline}
          >
            {isOffline ? '🔄' : '☁️'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Overview component
function BudgetOverview({
  categories,
  metrics,
  formatCurrency,
}: {
  categories: BudgetCategory[];
  metrics: any;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Alert Messages */}
      {metrics.isOverBudget && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <div>
              <h3 className="font-medium text-red-800">Budget Exceeded</h3>
              <p className="text-sm text-red-600">
                You're {formatCurrency(Math.abs(metrics.remaining))} over budget
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Cards */}
      <div className="space-y-3">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h3 className="font-medium text-gray-900">{category.name}</h3>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  {formatCurrency(category.spent)}
                </div>
                <div className="text-xs text-gray-500">
                  of {formatCurrency(category.allocated)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>
                  {Math.round((category.spent / category.allocated) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((category.spent / category.allocated) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
