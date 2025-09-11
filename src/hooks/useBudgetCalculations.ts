/**
 * Budget Calculations Hook for WS-245 Wedding Budget Optimizer System
 * Provides real-time budget calculations, projections, and analysis utilities
 * Built for React 19, TypeScript 5.9, and comprehensive budget management
 */

'use client';

import { useMemo } from 'react';
import {
  BudgetCategory,
  BudgetAllocation,
  UseBudgetCalculationsReturn,
} from '@/types/budget';

export function useBudgetCalculations(
  budgetData?: BudgetAllocation | null,
  categories?: BudgetCategory[],
): UseBudgetCalculationsReturn {
  const activeCategories = categories || budgetData?.categories || [];
  const totalBudget = budgetData?.totalBudget || 0;

  // Core calculations
  const calculations = useMemo(() => {
    const totalAllocated = activeCategories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    const totalSpent = activeCategories.reduce(
      (sum, cat) => sum + cat.spentAmount,
      0,
    );
    const totalPlanned = activeCategories.reduce(
      (sum, cat) => sum + cat.plannedAmount,
      0,
    );
    const remainingBudget = Math.max(0, totalBudget - totalAllocated);
    const overspentAmount = Math.max(0, totalAllocated - totalBudget);

    return {
      totalAllocated,
      totalSpent,
      totalPlanned,
      remainingBudget,
      overspentAmount,
    };
  }, [activeCategories, totalBudget]);

  // Usage rates and completion metrics
  const metrics = useMemo(() => {
    const { totalAllocated, totalSpent } = calculations;

    const utilizationRate =
      totalBudget > 0 ? (totalAllocated / totalBudget) * 100 : 0;
    const spendingRate =
      totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    // Calculate completion rate based on categories with allocated budgets
    const allocatedCategories = activeCategories.filter(
      (cat) => cat.allocatedAmount > 0,
    );
    const completedCategories = allocatedCategories.filter(
      (cat) => cat.spentAmount > 0,
    );
    const completionRate =
      allocatedCategories.length > 0
        ? (completedCategories.length / allocatedCategories.length) * 100
        : 0;

    return {
      utilizationRate: Math.min(100, utilizationRate),
      spendingRate: Math.min(100, spendingRate),
      completionRate,
    };
  }, [calculations, totalBudget, activeCategories]);

  // Budget projections
  const projections = useMemo(() => {
    const { totalAllocated, totalSpent } = calculations;

    // Calculate average spending velocity
    const spentCategories = activeCategories.filter(
      (cat) => cat.spentAmount > 0,
    );
    const averageSpendingRatio =
      spentCategories.length > 0
        ? spentCategories.reduce(
            (sum, cat) =>
              sum + cat.spentAmount / Math.max(cat.allocatedAmount, 1),
            0,
          ) / spentCategories.length
        : 0;

    // Project total spending based on current velocity
    const projectedTotal =
      totalAllocated > 0
        ? Math.max(
            totalSpent,
            totalAllocated * Math.max(averageSpendingRatio, 0.8),
          )
        : totalSpent;

    const projectedOverrun = Math.max(0, projectedTotal - totalBudget);

    // Calculate potential savings opportunity
    const optimizableCategories = activeCategories.filter(
      (cat) => cat.isOptimizable,
    );
    const savingsOpportunity = optimizableCategories.reduce((sum, cat) => {
      const marketSavings = cat.marketPriceRange
        ? Math.max(0, cat.allocatedAmount - cat.marketPriceRange.average * 0.9)
        : cat.allocatedAmount * 0.1; // Assume 10% optimization potential
      return sum + marketSavings;
    }, 0);

    return {
      projectedTotal,
      projectedOverrun,
      savingsOpportunity,
    };
  }, [calculations, activeCategories, totalBudget]);

  // Category analysis
  const categoryAnalysis = useMemo(() => {
    return activeCategories.map((category) => {
      const { allocatedAmount, spentAmount, plannedAmount } = category;
      const variance = spentAmount - allocatedAmount;
      const variancePercentage =
        allocatedAmount > 0 ? (variance / allocatedAmount) * 100 : 0;

      let status: 'on-track' | 'over-budget' | 'under-budget';
      if (Math.abs(variancePercentage) <= 10) {
        status = 'on-track';
      } else if (variancePercentage > 10) {
        status = 'over-budget';
      } else {
        status = 'under-budget';
      }

      // Calculate confidence based on market data and planning completeness
      let confidence = 70; // Base confidence

      if (category.marketPriceRange) {
        const marketAlignment =
          Math.abs(allocatedAmount - category.marketPriceRange.average) /
          category.marketPriceRange.average;
        confidence += Math.max(0, 20 - marketAlignment * 100); // Boost for market alignment
      }

      if (spentAmount > 0) {
        confidence += 10; // Boost for actual spending data
      }

      return {
        category: category.name,
        status,
        variance,
        confidence: Math.min(100, Math.max(0, confidence)),
      };
    });
  }, [activeCategories]);

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value)}%`;
  };

  const calculatePercentage = (amount: number, total: number): number => {
    return total > 0 ? (amount / total) * 100 : 0;
  };

  const getCategoryStatus = (
    category: BudgetCategory,
  ): 'on-track' | 'over-budget' | 'under-budget' => {
    const analysis = categoryAnalysis.find((a) => a.category === category.name);
    return analysis?.status || 'on-track';
  };

  // Format large numbers with K/M notation
  const formatCompactCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 1000000) {
      return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
      return `${sign}$${(absAmount / 1000).toFixed(1)}K`;
    } else {
      return formatCurrency(amount);
    }
  };

  // Calculate budget health score
  const budgetHealthScore = useMemo(() => {
    let score = 100;

    // Penalize for over-allocation
    if (calculations.overspentAmount > 0) {
      const overallocationPenalty = Math.min(
        50,
        (calculations.overspentAmount / totalBudget) * 100,
      );
      score -= overallocationPenalty;
    }

    // Penalize for poor category distribution
    const categoryCount = activeCategories.length;
    if (categoryCount > 0) {
      const averageAllocation = calculations.totalAllocated / categoryCount;
      const imbalanceCategories = activeCategories.filter(
        (cat) =>
          Math.abs(cat.allocatedAmount - averageAllocation) >
          averageAllocation * 2,
      );

      if (imbalanceCategories.length > categoryCount * 0.3) {
        score -= 15; // Penalize for poor distribution
      }
    }

    // Reward for good market alignment
    const marketAlignedCategories = activeCategories.filter((cat) => {
      if (!cat.marketPriceRange) return true;
      return (
        cat.allocatedAmount >= cat.marketPriceRange.min &&
        cat.allocatedAmount <= cat.marketPriceRange.max
      );
    });

    if (marketAlignedCategories.length === activeCategories.length) {
      score += 10; // Bonus for market alignment
    }

    return Math.max(0, Math.min(100, score));
  }, [calculations, totalBudget, activeCategories]);

  return {
    // Core calculations
    totalAllocated: calculations.totalAllocated,
    totalSpent: calculations.totalSpent,
    remainingBudget: calculations.remainingBudget,
    overspentAmount: calculations.overspentAmount,
    utilizationRate: metrics.utilizationRate,
    completionRate: metrics.completionRate,

    // Projections
    projectedTotal: projections.projectedTotal,
    projectedOverrun: projections.projectedOverrun,
    savingsOpportunity: projections.savingsOpportunity,

    // Analysis
    categoryAnalysis,

    // Additional metrics
    budgetHealthScore,
    spendingVelocity: metrics.spendingRate,

    // Utility functions
    formatCurrency,
    formatPercentage: formatPercentage,
    formatCompactCurrency,
    calculatePercentage,
    getCategoryStatus,

    // Helper functions for charts and visualizations
    getCategoryPercentages: () =>
      activeCategories.map((cat) => ({
        category: cat.name,
        percentage: calculatePercentage(
          cat.allocatedAmount,
          calculations.totalAllocated,
        ),
        amount: cat.allocatedAmount,
        color: cat.color,
      })),

    getSpendingProgress: () =>
      activeCategories.map((cat) => ({
        category: cat.name,
        allocated: cat.allocatedAmount,
        spent: cat.spentAmount,
        remaining: Math.max(0, cat.allocatedAmount - cat.spentAmount),
        progress: calculatePercentage(cat.spentAmount, cat.allocatedAmount),
      })),

    getBudgetSummary: () => ({
      totalBudget,
      allocated: calculations.totalAllocated,
      spent: calculations.totalSpent,
      remaining: calculations.remainingBudget,
      overrun: calculations.overspentAmount,
      utilizationRate: metrics.utilizationRate,
      completionRate: metrics.completionRate,
      healthScore: budgetHealthScore,
      projectedTotal: projections.projectedTotal,
      savingsOpportunity: projections.savingsOpportunity,
    }),
  };
}
