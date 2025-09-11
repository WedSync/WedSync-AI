'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  DollarSign,
  PieChart,
  AlertTriangle,
} from 'lucide-react';

interface BudgetOptimizationWidgetProps {
  totalBudget?: number;
  spent?: number;
  categories?: Array<{
    name: string;
    budgeted: number;
    spent: number;
    color: string;
  }>;
}

export default function BudgetOptimizationWidget({
  totalBudget = 25000,
  spent = 18500,
  categories = [
    { name: 'Venue', budgeted: 12000, spent: 11500, color: 'bg-blue-500' },
    { name: 'Catering', budgeted: 8000, spent: 6800, color: 'bg-green-500' },
    {
      name: 'Photography',
      budgeted: 3000,
      spent: 3200,
      color: 'bg-purple-500',
    },
    { name: 'Flowers', budgeted: 2000, spent: 1500, color: 'bg-pink-500' },
  ],
}: BudgetOptimizationWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const remaining = totalBudget - spent;
  const percentSpent = (spent / totalBudget) * 100;

  const getOptimizationTips = () => {
    const tips = [];

    categories.forEach((category) => {
      const overBudget = category.spent > category.budgeted;
      const percentUsed = (category.spent / category.budgeted) * 100;

      if (overBudget) {
        tips.push({
          type: 'warning',
          category: category.name,
          message: `${category.name} is £${category.spent - category.budgeted} over budget`,
        });
      } else if (percentUsed < 50) {
        tips.push({
          type: 'opportunity',
          category: category.name,
          message: `Consider reallocating from ${category.name} (only ${percentUsed.toFixed(0)}% used)`,
        });
      }
    });

    return tips;
  };

  const optimizationTips = getOptimizationTips();

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingDown className="text-green-500" size={20} />
          Budget Optimization
        </h3>
        <div className="text-sm text-gray-500">
          {percentSpent.toFixed(1)}% spent
        </div>
      </div>

      {/* Overall Budget Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Total Budget Progress
          </span>
          <span className="text-lg font-bold text-gray-900">
            £{spent.toLocaleString()} / £{totalBudget.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              percentSpent > 90
                ? 'bg-red-500'
                : percentSpent > 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-sm">
          <span
            className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {remaining >= 0
              ? `£${remaining.toLocaleString()} remaining`
              : `£${Math.abs(remaining).toLocaleString()} over budget`}
          </span>
          <span className="text-gray-500">
            {remaining >= 0 ? 'On track' : 'Over budget'}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Category Breakdown</h4>
        <div className="grid gap-3">
          {categories.map((category) => {
            const percentUsed = (category.spent / category.budgeted) * 100;
            const isOverBudget = category.spent > category.budgeted;

            return (
              <div
                key={category.name}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  selectedCategory === category.name
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === category.name ? null : category.name,
                  )
                }
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">
                    {category.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-600'}`}
                  >
                    £{category.spent.toLocaleString()} / £
                    {category.budgeted.toLocaleString()}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverBudget
                        ? 'bg-red-500'
                        : percentUsed > 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{percentUsed.toFixed(1)}% used</span>
                  {isOverBudget && (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Over budget
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optimization Tips */}
      {optimizationTips.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Optimization Tips</h4>
          <div className="space-y-2">
            {optimizationTips.map((tip, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm ${
                  tip.type === 'warning'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                <div className="flex items-start gap-2">
                  {tip.type === 'warning' ? (
                    <AlertTriangle
                      size={16}
                      className="text-red-600 mt-0.5 flex-shrink-0"
                    />
                  ) : (
                    <TrendingDown
                      size={16}
                      className="text-blue-600 mt-0.5 flex-shrink-0"
                    />
                  )}
                  <span>{tip.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button className="flex-1 bg-blue-50 text-blue-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
          <PieChart size={16} />
          View Details
        </button>
        <button className="flex-1 bg-gray-50 text-gray-700 text-sm font-medium py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
          <DollarSign size={16} />
          Adjust Budget
        </button>
      </div>
    </div>
  );
}
