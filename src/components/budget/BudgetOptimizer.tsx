/**
 * BudgetOptimizer Component for WS-245 Wedding Budget Optimizer System
 * Main AI-powered budget optimization interface with recommendations and visualizations
 * Built for React 19, TypeScript 5.9, Untitled UI, and comprehensive budget management
 */

'use client';

import React, { useState, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Target,
  Lightbulb,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import {
  BudgetOptimizerProps,
  OptimizationGoal,
  CostSavingRecommendation,
  BudgetCategory,
} from '@/types/budget';
import { useBudgetOptimization } from '@/hooks/useBudgetOptimization';
import { useBudgetCalculations } from '@/hooks/useBudgetCalculations';
import { BudgetVisualization } from './BudgetVisualization';
import { CostSavingRecommendations } from './CostSavingRecommendations';
import { BudgetAllocation } from './BudgetAllocation';

interface OptimizationSummaryCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

const OptimizationSummaryCard: React.FC<OptimizationSummaryCardProps> = ({
  title,
  value,
  change,
  trend = 'neutral',
  icon: Icon,
  className = '',
}) => {
  const trendColors = {
    up: 'text-success-600 bg-success-50',
    down: 'text-error-600 bg-error-50',
    neutral: 'text-gray-600 bg-gray-50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-white border border-gray-200 rounded-xl p-6
        hover:shadow-md transition-all duration-200
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`
          p-2 rounded-lg
          ${
            trend === 'up'
              ? 'bg-success-50 text-success-600'
              : trend === 'down'
                ? 'bg-error-50 text-error-600'
                : 'bg-primary-50 text-primary-600'
          }
        `}
        >
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <div
            className={`
            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
            ${trendColors[trend]}
          `}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
            {change}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </motion.div>
  );
};

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  totalBudget,
  currentAllocations,
  optimizationGoals,
  onOptimizationApplied,
  onRecommendationApplied,
  isLoading: externalLoading = false,
  className = '',
}) => {
  // State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'allocations' | 'recommendations'
  >('overview');
  const [optimizationMode, setOptimizationMode] = useState<'auto' | 'manual'>(
    'auto',
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Hooks
  const budgetOptimization = useBudgetOptimization({
    id: 'current-budget',
    coupleId: 'current-couple',
    totalBudget,
    allocatedBudget: currentAllocations.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    ),
    spentBudget: currentAllocations.reduce(
      (sum, cat) => sum + cat.spentAmount,
      0,
    ),
    remainingBudget:
      totalBudget -
      currentAllocations.reduce((sum, cat) => sum + cat.allocatedAmount, 0),
    categories: currentAllocations,
    lastUpdated: new Date(),
    optimizationScore: 75,
    savingsOpportunity: 2000,
  });

  const calculations = useBudgetCalculations(budgetOptimization.budgetData);

  // Handlers
  const handleOptimization = useCallback(async () => {
    startTransition(async () => {
      try {
        await budgetOptimization.optimizeBudget(optimizationGoals);
        if (budgetOptimization.budgetData) {
          onOptimizationApplied(budgetOptimization.budgetData);
        }
      } catch (error) {
        console.error('Optimization failed:', error);
      }
    });
  }, [budgetOptimization, optimizationGoals, onOptimizationApplied]);

  const handleRecommendationApply = useCallback(
    async (recommendation: CostSavingRecommendation) => {
      startTransition(async () => {
        try {
          await budgetOptimization.applyRecommendation(recommendation.id);
          onRecommendationApplied?.(recommendation);
        } catch (error) {
          console.error('Failed to apply recommendation:', error);
        }
      });
    },
    [budgetOptimization, onRecommendationApplied],
  );

  const handleAllocationChange = useCallback(
    async (categories: BudgetCategory[]) => {
      startTransition(async () => {
        try {
          await budgetOptimization.updateAllocation(categories);
          if (budgetOptimization.budgetData) {
            onOptimizationApplied(budgetOptimization.budgetData);
          }
        } catch (error) {
          console.error('Failed to update allocation:', error);
        }
      });
    },
    [budgetOptimization, onOptimizationApplied],
  );

  const isLoading =
    externalLoading ||
    budgetOptimization.isLoading ||
    budgetOptimization.isOptimizing ||
    isPending;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Budget Optimizer
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered recommendations to optimize your wedding budget
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="
              p-2 text-gray-400 hover:text-gray-600 
              rounded-lg hover:bg-gray-50
              transition-colors duration-200
            "
            disabled={isLoading}
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={handleOptimization}
            disabled={isLoading}
            className="
              inline-flex items-center px-4 py-2
              bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300
              text-white font-medium text-sm
              rounded-lg shadow-xs hover:shadow-sm
              transition-all duration-200
              focus:outline-none focus:ring-4 focus:ring-primary-100
              disabled:cursor-not-allowed
            "
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Optimize Budget
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {budgetOptimization.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="
            bg-error-50 border border-error-200 rounded-xl p-4
            flex items-start space-x-3
          "
        >
          <AlertTriangle className="w-5 h-5 text-error-600 mt-0.5" />
          <div>
            <p className="font-medium text-error-900">Optimization Error</p>
            <p className="text-sm text-error-700 mt-1">
              {budgetOptimization.error}
            </p>
          </div>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OptimizationSummaryCard
          title="Optimization Score"
          value={`${budgetOptimization.optimizationScore}%`}
          change={budgetOptimization.optimizationScore > 80 ? '+5%' : '-3%'}
          trend={budgetOptimization.optimizationScore > 80 ? 'up' : 'down'}
          icon={Target}
        />

        <OptimizationSummaryCard
          title="Potential Savings"
          value={calculations.formatCurrency(
            budgetOptimization.calculateSavings(),
          )}
          change="vs last analysis"
          trend="up"
          icon={TrendingDown}
        />

        <OptimizationSummaryCard
          title="Budget Utilization"
          value={calculations.formatPercentage(calculations.utilizationRate)}
          change={
            calculations.utilizationRate < 100 ? 'Within budget' : 'Over budget'
          }
          trend={calculations.utilizationRate < 100 ? 'up' : 'down'}
          icon={DollarSign}
        />

        <OptimizationSummaryCard
          title="Active Recommendations"
          value={budgetOptimization.recommendations.length.toString()}
          change="Ready to apply"
          trend={
            budgetOptimization.recommendations.length > 0 ? 'up' : 'neutral'
          }
          icon={Lightbulb}
        />
      </div>

      {/* Optimization Insights */}
      {budgetOptimization.getOptimizationInsights().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-50 border border-primary-200 rounded-xl p-4"
        >
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-primary-100 rounded-lg">
              <Lightbulb className="w-4 h-4 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-primary-900 mb-2">
                Key Insights
              </h3>
              <ul className="space-y-1">
                {budgetOptimization
                  .getOptimizationInsights()
                  .map((insight, index) => (
                    <li
                      key={index}
                      className="text-sm text-primary-800 flex items-center"
                    >
                      <CheckCircle className="w-3 h-3 text-primary-600 mr-2 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', count: null },
            {
              key: 'allocations',
              label: 'Allocations',
              count: currentAllocations.length,
            },
            {
              key: 'recommendations',
              label: 'Recommendations',
              count: budgetOptimization.recommendations.length,
            },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                transition-colors duration-200
              `}
            >
              {label}
              {count !== null && (
                <span
                  className={`
                  ml-2 py-0.5 px-2 rounded-full text-xs
                  ${
                    activeTab === key
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }
                `}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <BudgetVisualization
                budgetData={currentAllocations}
                viewMode="pie"
                interactiveMode={true}
                onCategorySelect={(category) => {
                  console.log('Selected category:', category);
                }}
                showComparisons={true}
                showTrends={true}
                className="bg-white border border-gray-200 rounded-xl"
              />
            </div>
          )}

          {activeTab === 'allocations' && (
            <div className="space-y-6">
              <BudgetAllocation
                categories={currentAllocations}
                totalBudget={totalBudget}
                onAllocationChange={handleAllocationChange}
                showPercentages={true}
                showTargets={true}
                isEditable={!isLoading}
                className="bg-white border border-gray-200 rounded-xl"
              />
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <CostSavingRecommendations
                currentBudget={budgetOptimization.budgetData!}
                aiRecommendations={budgetOptimization.recommendations}
                potentialSavings={budgetOptimization.calculateSavings()}
                onRecommendationApply={handleRecommendationApply}
                onRecommendationDismiss={
                  budgetOptimization.dismissRecommendation
                }
                isLoading={isLoading}
                className="space-y-4"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="
              fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm
              flex items-center justify-center p-4
            "
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="
                bg-white rounded-2xl max-w-md w-full
                shadow-xl overflow-hidden
              "
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Optimization Settings
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Optimization Mode
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { key: 'auto', label: 'Automatic' },
                      { key: 'manual', label: 'Manual' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setOptimizationMode(key as any)}
                        className={`
                          px-3 py-2 text-sm font-medium rounded-lg
                          ${
                            optimizationMode === key
                              ? 'bg-primary-100 text-primary-700 border-primary-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                          border transition-colors duration-200
                        `}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="
                    px-4 py-2 text-sm font-medium text-gray-700
                    bg-white border border-gray-300 rounded-lg
                    hover:bg-gray-50 transition-colors duration-200
                  "
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="
                    px-4 py-2 text-sm font-medium text-white
                    bg-primary-600 hover:bg-primary-700 rounded-lg
                    transition-colors duration-200
                  "
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
