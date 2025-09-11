'use client';

import React, { useState, useMemo } from 'react';
import { CostTrackingDashboardProps } from '@/types/ai-features';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  Settings,
  Bell,
  X,
  Filter,
  Download,
} from 'lucide-react';

/**
 * Cost Tracking Dashboard Component
 * Real-time usage and cost monitoring with wedding season projections
 */
export function CostTrackingDashboard({
  usage,
  alerts,
  weddingSeasonConfig,
  currency,
  onSetBudget,
  onDismissAlert,
}: CostTrackingDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<
    'current_month' | 'last_month' | 'last_3_months'
  >('current_month');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const currentMonth = new Date().getMonth() + 1;
  const isWeddingSeason = weddingSeasonConfig.peakMonths.includes(currentMonth);

  // Calculate totals and trends
  const totals = useMemo(() => {
    const filteredUsage = usage.filter((u) => u.period === selectedPeriod);
    const totalCost = filteredUsage.reduce((sum, u) => sum + u.totalCost, 0);
    const totalUsage = filteredUsage.reduce((sum, u) => sum + u.totalUsage, 0);
    const projectedCost = filteredUsage.reduce(
      (sum, u) => sum + u.projectedMonthlyCost,
      0,
    );

    return {
      totalCost,
      totalUsage,
      projectedCost,
      averageCostPerUse: totalUsage > 0 ? totalCost / totalUsage : 0,
    };
  }, [usage, selectedPeriod]);

  // Get trend data
  const trendData = useMemo(() => {
    const currentData = usage.filter((u) => u.period === 'current_month');
    const lastMonthData = usage.filter((u) => u.period === 'last_month');

    const currentTotal = currentData.reduce((sum, u) => sum + u.totalCost, 0);
    const lastMonthTotal = lastMonthData.reduce(
      (sum, u) => sum + u.totalCost,
      0,
    );

    const trend =
      lastMonthTotal > 0
        ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    return {
      trend,
      isIncreasing: trend > 0,
      percentageChange: Math.abs(trend),
    };
  }, [usage]);

  // Group usage by category
  const categoryBreakdown = useMemo(() => {
    const filtered = usage.filter((u) => u.period === selectedPeriod);
    // Mock categorization - in real app, this would come from feature definitions
    const categories = filtered.reduce(
      (acc, u) => {
        const category = u.featureId.includes('photo')
          ? 'Analysis'
          : u.featureId.includes('description')
            ? 'Content'
            : u.featureId.includes('menu')
              ? 'Automation'
              : u.featureId.includes('timeline')
                ? 'Automation'
                : 'Other';

        if (!acc[category]) {
          acc[category] = { cost: 0, usage: 0, count: 0 };
        }
        acc[category].cost += u.totalCost;
        acc[category].usage += u.totalUsage;
        acc[category].count += 1;

        return acc;
      },
      {} as Record<string, { cost: number; usage: number; count: number }>,
    );

    return Object.entries(categories).map(([name, data]) => ({
      name,
      cost: data.cost,
      usage: data.usage,
      count: data.count,
      percentage:
        totals.totalCost > 0 ? (data.cost / totals.totalCost) * 100 : 0,
    }));
  }, [usage, selectedPeriod, totals.totalCost]);

  const handleSetBudget = () => {
    if (selectedFeature && budgetAmount) {
      onSetBudget(selectedFeature, parseFloat(budgetAmount));
      setShowBudgetModal(false);
      setBudgetAmount('');
      setSelectedFeature(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'current_month':
        return 'This Month';
      case 'last_month':
        return 'Last Month';
      case 'last_3_months':
        return 'Last 3 Months';
      default:
        return period;
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start p-4 rounded-lg border ${
                alert.alertType === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : alert.alertType === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 mt-0.5 mr-3 ${
                  alert.alertType === 'critical'
                    ? 'text-red-500'
                    : alert.alertType === 'warning'
                      ? 'text-yellow-500'
                      : 'text-blue-500'
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    alert.alertType === 'critical'
                      ? 'text-red-800'
                      : alert.alertType === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                  }`}
                >
                  {alert.message}
                </p>
                {alert.triggeredAt && (
                  <p
                    className={`text-xs mt-1 ${
                      alert.alertType === 'critical'
                        ? 'text-red-600'
                        : alert.alertType === 'warning'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                    }`}
                  >
                    Triggered {new Date(alert.triggeredAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => onDismissAlert(alert.id)}
                className={`p-1 rounded hover:bg-opacity-20 ${
                  alert.alertType === 'critical'
                    ? 'hover:bg-red-200'
                    : alert.alertType === 'warning'
                      ? 'hover:bg-yellow-200'
                      : 'hover:bg-blue-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Period Controls and Wedding Season Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['current_month', 'last_month', 'last_3_months'] as const).map(
              (period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    selectedPeriod === period
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {getPeriodLabel(period)}
                </button>
              ),
            )}
          </div>

          {isWeddingSeason && (
            <div className="flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-1" />
              Wedding Season Active
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spend</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totals.totalCost)}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                trendData.isIncreasing ? 'bg-red-100' : 'bg-green-100'
              }`}
            >
              <DollarSign
                className={`w-6 h-6 ${
                  trendData.isIncreasing ? 'text-red-600' : 'text-green-600'
                }`}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {trendData.isIncreasing ? (
              <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
            )}
            <span
              className={
                trendData.isIncreasing ? 'text-red-600' : 'text-green-600'
              }
            >
              {trendData.percentageChange.toFixed(1)}%
            </span>
            <span className="text-gray-600 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usage</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {totals.totalUsage.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {formatCurrency(totals.averageCostPerUse)} avg per use
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projected</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(totals.projectedCost)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Monthly projection
            {isWeddingSeason && (
              <span className="text-orange-600 font-medium ml-1">
                (+{((weddingSeasonConfig.multiplier - 1) * 100).toFixed(0)}%
                season boost)
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Features
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {usage.length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">Features with usage</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Cost by Category
            </h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {categoryBreakdown.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 rounded-full mr-3 ${
                      category.name === 'Analysis'
                        ? 'bg-blue-500'
                        : category.name === 'Content'
                          ? 'bg-green-500'
                          : category.name === 'Automation'
                            ? 'bg-purple-500'
                            : 'bg-gray-500'
                    }`}
                  ></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.count} features
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(category.cost)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Feature Usage</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {usage
              .filter((u) => u.period === selectedPeriod)
              .sort((a, b) => b.totalCost - a.totalCost)
              .slice(0, 5)
              .map((item) => (
                <div key={item.featureId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {item.featureId.replace('-', ' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(item.totalCost)}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{
                        width: `${Math.max(5, (item.totalCost / Math.max(...usage.map((u) => u.totalCost))) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{item.totalUsage} uses</span>
                    <button
                      onClick={() => {
                        setSelectedFeature(item.featureId);
                        setShowBudgetModal(true);
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium flex items-center"
                    >
                      <Bell className="w-3 h-3 mr-1" />
                      Set Budget
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Wedding Season Planning */}
      {isWeddingSeason && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start">
            <TrendingUp className="w-6 h-6 text-orange-500 mt-1" />
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-orange-900 mb-2">
                Wedding Season Planning
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-sm text-orange-700 font-medium">
                    Expected Increase
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {((weddingSeasonConfig.multiplier - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-sm text-orange-700 font-medium">
                    Projected Monthly
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {formatCurrency(
                      totals.projectedCost * weddingSeasonConfig.multiplier,
                    )}
                  </div>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-sm text-orange-700 font-medium">
                    Recommended Budget
                  </div>
                  <div className="text-xl font-bold text-orange-900">
                    {formatCurrency(
                      totals.projectedCost *
                        weddingSeasonConfig.budgetAdjustment,
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-orange-800">
                Consider upgrading to client-managed features for unlimited
                usage during peak season, or set budget alerts to avoid
                unexpected overages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Setting Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Budget Alert
                </h3>
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feature:{' '}
                    {selectedFeature
                      ?.replace('-', ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="budget"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Monthly Budget ({currency})
                  </label>
                  <input
                    type="number"
                    id="budget"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetBudget}
                    disabled={!budgetAmount}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    Set Alert
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
