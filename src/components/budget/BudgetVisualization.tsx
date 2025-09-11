/**
 * BudgetVisualization Component for WS-245 Wedding Budget Optimizer System
 * Interactive charts and graphs for comprehensive budget data visualization
 * Built for React 19, TypeScript 5.9, Recharts, and responsive design
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Treemap,
} from 'recharts';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Grid3X3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Settings,
} from 'lucide-react';
import {
  BudgetVisualizationProps,
  BudgetCategory,
  BudgetVisualizationMode,
} from '@/types/budget';
import { useBudgetCalculations } from '@/hooks/useBudgetCalculations';

// Custom tooltip component for charts
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900">{label || data.name}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: $${entry.value?.toLocaleString() || 0}`}
          </p>
        ))}
        {data.percentage && (
          <p className="text-sm text-gray-600">
            {data.percentage.toFixed(1)}% of budget
          </p>
        )}
      </div>
    );
  }
  return null;
};

// View mode selector component
interface ViewModeSelectorProps {
  currentMode: BudgetVisualizationMode;
  onModeChange: (mode: BudgetVisualizationMode) => void;
  disabled?: boolean;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
}) => {
  const modes = [
    { key: 'pie', label: 'Pie Chart', icon: PieIcon },
    { key: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { key: 'timeline', label: 'Timeline', icon: Calendar },
    { key: 'treemap', label: 'Treemap', icon: Grid3X3 },
    { key: 'comparison', label: 'Comparison', icon: TrendingUp },
  ] as const;

  return (
    <div className="flex items-center space-x-1 bg-gray-50 p-1 rounded-lg">
      {modes.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onModeChange(key)}
          disabled={disabled}
          className={`
            flex items-center px-3 py-2 rounded-md text-sm font-medium
            transition-all duration-200
            ${
              currentMode === key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:block ml-2">{label}</span>
        </button>
      ))}
    </div>
  );
};

// Budget trend indicator
interface TrendIndicatorProps {
  value: number;
  comparison: number;
  label: string;
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  value,
  comparison,
  label,
}) => {
  const change = value - comparison;
  const changePercentage = comparison !== 0 ? (change / comparison) * 100 : 0;
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

  const trendConfig = {
    up: { color: 'text-error-600', bg: 'bg-error-50', icon: ArrowUpRight },
    down: {
      color: 'text-success-600',
      bg: 'bg-success-50',
      icon: ArrowDownRight,
    },
    neutral: { color: 'text-gray-600', bg: 'bg-gray-50', icon: Minus },
  };

  const config = trendConfig[trend];
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-2">
      <div className={`p-1 rounded ${config.bg}`}>
        <Icon className={`w-3 h-3 ${config.color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          ${value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          {changePercentage !== 0 && (
            <span className={config.color}>
              {changePercentage > 0 ? '+' : ''}
              {changePercentage.toFixed(1)}%
            </span>
          )}{' '}
          {label}
        </p>
      </div>
    </div>
  );
};

export const BudgetVisualization: React.FC<BudgetVisualizationProps> = ({
  budgetData,
  viewMode: initialViewMode = 'pie',
  interactiveMode = true,
  onCategorySelect,
  onModeChange,
  showComparisons = false,
  showTrends = false,
  className = '',
}) => {
  // State
  const [currentViewMode, setCurrentViewMode] =
    useState<BudgetVisualizationMode>(initialViewMode);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Calculations
  const calculations = useBudgetCalculations(null, budgetData);

  // Process data for charts
  const chartData = useMemo(() => {
    const totalAllocated = calculations.totalAllocated;

    return budgetData.map((category, index) => ({
      name: category.name,
      value: category.allocatedAmount,
      spent: category.spentAmount,
      planned: category.plannedAmount,
      color: category.color,
      percentage:
        totalAllocated > 0
          ? (category.allocatedAmount / totalAllocated) * 100
          : 0,
      remaining: Math.max(0, category.allocatedAmount - category.spentAmount),
      utilization:
        category.allocatedAmount > 0
          ? (category.spentAmount / category.allocatedAmount) * 100
          : 0,
    }));
  }, [budgetData, calculations.totalAllocated]);

  // Timeline data (mock data for demonstration)
  const timelineData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      planned: (index + 1) * 2000,
      actual: (index + 1) * 1800 + Math.random() * 400,
      budget: 12000,
    }));
  }, []);

  // Comparison data
  const comparisonData = useMemo(() => {
    return budgetData.map((category) => ({
      category: category.name,
      yourBudget: category.allocatedAmount,
      averageBudget:
        category.marketPriceRange?.average || category.allocatedAmount * 1.1,
      recommendedBudget:
        category.marketPriceRange?.average || category.allocatedAmount * 0.9,
    }));
  }, [budgetData]);

  // Handlers
  const handleModeChange = useCallback(
    (mode: BudgetVisualizationMode) => {
      setCurrentViewMode(mode);
      onModeChange?.(mode);
    },
    [onModeChange],
  );

  const handleCategoryClick = useCallback(
    (entry: any) => {
      if (!interactiveMode) return;

      const category = budgetData.find((cat) => cat.name === entry.name);
      if (category) {
        setSelectedCategory(entry.name);
        onCategorySelect?.(category);
      }
    },
    [interactiveMode, budgetData, onCategorySelect],
  );

  // Render different chart types
  const renderChart = () => {
    switch (currentViewMode) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) =>
                  percentage > 5 ? `${name} (${percentage.toFixed(1)}%)` : ''
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                onClick={handleCategoryClick}
                className={interactiveMode ? 'cursor-pointer' : ''}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={
                      selectedCategory === entry.name ? '#4F46E5' : 'none'
                    }
                    strokeWidth={selectedCategory === entry.name ? 3 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Allocated" fill="#9E77ED" />
              <Bar dataKey="spent" name="Spent" fill="#F79009" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={timelineData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="budget"
                stackId="1"
                stroke="#E5E7EB"
                fill="#F3F4F6"
                name="Total Budget"
              />
              <Area
                type="monotone"
                dataKey="planned"
                stackId="2"
                stroke="#9E77ED"
                fill="#E9D7FE"
                name="Planned Spending"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#F79009"
                strokeWidth={3}
                name="Actual Spending"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'comparison':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={comparisonData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="yourBudget" name="Your Budget" fill="#9E77ED" />
              <Bar
                dataKey="averageBudget"
                name="Market Average"
                fill="#F79009"
              />
              <Bar
                dataKey="recommendedBudget"
                name="Recommended"
                fill="#12B76A"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={chartData}
              dataKey="value"
              ratio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Treemap>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Budget Overview
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Interactive visualization of your wedding budget allocation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {interactiveMode && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <ViewModeSelector
            currentMode={currentViewMode}
            onModeChange={handleModeChange}
            disabled={!interactiveMode}
          />
        </div>
      </div>

      {/* Summary Statistics */}
      {showTrends && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <TrendIndicator
              value={calculations.totalAllocated}
              comparison={calculations.totalAllocated * 0.95}
              label="vs last month"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <TrendIndicator
              value={calculations.totalSpent}
              comparison={calculations.totalSpent * 0.9}
              label="spending rate"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <TrendIndicator
              value={calculations.remainingBudget}
              comparison={calculations.remainingBudget * 1.1}
              label="budget remaining"
            />
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentViewMode}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            {renderChart()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chart Legend/Details */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-primary-900 capitalize">
              {selectedCategory} Details
            </h4>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-primary-600 hover:text-primary-800"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {(() => {
            const categoryData = chartData.find(
              (c) => c.name === selectedCategory,
            );
            if (!categoryData) return null;

            return (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-primary-700 font-medium">Allocated</p>
                  <p className="text-primary-900">
                    ${categoryData.value.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-primary-700 font-medium">Spent</p>
                  <p className="text-primary-900">
                    ${categoryData.spent.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-primary-700 font-medium">Remaining</p>
                  <p className="text-primary-900">
                    ${categoryData.remaining.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-primary-700 font-medium">Utilization</p>
                  <p className="text-primary-900">
                    {categoryData.utilization.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <h4 className="font-medium text-gray-900 mb-3">
              Visualization Settings
            </h4>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={showTrends}
                  onChange={(e) => {
                    // This would be handled by parent component
                    console.log('Toggle trends:', e.target.checked);
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Show trend indicators
                </span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={showComparisons}
                  onChange={(e) => {
                    console.log('Toggle comparisons:', e.target.checked);
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Show market comparisons
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
