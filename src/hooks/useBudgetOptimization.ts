/**
 * Budget Optimization Hook for WS-245 Wedding Budget Optimizer System
 * Provides AI-powered budget optimization, recommendations, and market data integration
 * Built for React 19, TypeScript 5.9, and comprehensive budget management
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  BudgetAllocation,
  BudgetCategory,
  CostSavingRecommendation,
  MarketPriceData,
  OptimizationGoal,
  BudgetOptimizationRequest,
  BudgetOptimizationResponse,
  UseBudgetOptimizationReturn,
  CostSavingRecommendationType,
  BUDGET_CATEGORY_COLORS,
  RECOMMENDATION_PRIORITY,
} from '@/types/budget';

// Mock AI optimization service (replace with actual API calls)
const mockOptimizationService = {
  async optimizeBudget(
    request: BudgetOptimizationRequest,
  ): Promise<BudgetOptimizationResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock optimization logic
    const optimizedCategories = request.currentBudget.categories.map(
      (category) => ({
        ...category,
        allocatedAmount: category.allocatedAmount * 0.95, // 5% reduction
        isOptimizable: true,
      }),
    );

    const mockRecommendations: CostSavingRecommendation[] = [
      {
        id: '1',
        type: 'vendor-alternative',
        title: 'Consider Alternative Photographers',
        description:
          'We found 3 photographers with similar portfolios who are 20% less expensive',
        category: 'photography',
        potentialSavings: 800,
        confidence: 85,
        impact: 'medium',
        effort: 'easy',
        timelineWeeks: 2,
        isApplied: false,
        actionItems: [
          'Review alternative photographer portfolios',
          'Schedule consultations with top 2 choices',
          'Compare package details and contract terms',
        ],
        pros: [
          'Significant cost savings',
          'Similar quality and style',
          'Available for your date',
        ],
        cons: [
          'Need to research new vendors',
          'May require travel for meetings',
          'Different editing style',
        ],
        aiExplanation:
          'Based on your location, wedding date, and style preferences, these photographers offer excellent value while maintaining quality standards.',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      {
        id: '2',
        type: 'timing-optimization',
        title: 'Off-Season Venue Discount Available',
        description:
          'Moving your reception 1 hour earlier could save 15% on venue costs',
        category: 'venue',
        potentialSavings: 1200,
        confidence: 92,
        impact: 'high',
        effort: 'easy',
        timelineWeeks: 1,
        isApplied: false,
        actionItems: [
          'Confirm guest availability for earlier time',
          'Negotiate with venue for off-peak pricing',
          'Adjust catering timeline accordingly',
        ],
        pros: [
          'Immediate savings',
          'No quality compromise',
          'Earlier end time for guests',
        ],
        cons: [
          'Less evening celebration time',
          'May affect guest attendance',
          'Need to coordinate with vendors',
        ],
        aiExplanation:
          'Venues often offer significant discounts for off-peak hours. Your 4-6 PM reception slot qualifies for this discount.',
      },
      {
        id: '3',
        type: 'category-reallocation',
        title: 'Reallocate Florals to Photography',
        description:
          'Reduce floral budget by 30% and enhance photography package for better long-term value',
        category: 'flowers',
        potentialSavings: 0, // Net neutral but better value
        confidence: 78,
        impact: 'medium',
        effort: 'moderate',
        timelineWeeks: 3,
        isApplied: false,
        actionItems: [
          'Explore minimalist floral designs',
          'Upgrade photography to premium package',
          'Consider silk or dried flower alternatives',
        ],
        pros: [
          'Better long-term value (photos last forever)',
          'Modern minimalist aesthetic',
          'Reduced day-of logistics',
        ],
        cons: [
          'Less dramatic floral impact',
          'May require design adjustments',
          'Guest expectations management',
        ],
        aiExplanation:
          'Photography provides lasting memories while flowers are temporary. This reallocation maximizes your investment value.',
      },
    ];

    return {
      optimizedBudget: {
        ...request.currentBudget,
        categories: optimizedCategories,
        allocatedBudget: optimizedCategories.reduce(
          (sum, cat) => sum + cat.allocatedAmount,
          0,
        ),
        savingsOpportunity: 2000,
        optimizationScore: 85,
      },
      recommendations: mockRecommendations,
      analysis: {
        totalSavings: 2000,
        categoryImpacts: [
          {
            category: 'photography',
            oldAmount: 4000,
            newAmount: 3200,
            savings: 800,
            confidence: 85,
          },
          {
            category: 'venue',
            oldAmount: 8000,
            newAmount: 6800,
            savings: 1200,
            confidence: 92,
          },
        ],
        riskFactors: ['Vendor availability', 'Quality consistency'],
        implementationComplexity: 'medium',
        expectedTimeline: '2-4 weeks',
      },
      marketInsights: [],
      confidence: 85,
      estimatedSavings: 2000,
    };
  },

  async getMarketData(
    categories: string[],
    region: string,
  ): Promise<MarketPriceData[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return categories.map((category) => ({
      category,
      region,
      season: 'peak' as const,
      averagePrice: Math.floor(Math.random() * 5000) + 1000,
      priceRange: {
        p25: Math.floor(Math.random() * 2000) + 500,
        p50: Math.floor(Math.random() * 3000) + 1000,
        p75: Math.floor(Math.random() * 4000) + 2000,
        p90: Math.floor(Math.random() * 6000) + 3000,
      },
      trends: {
        direction: Math.random() > 0.5 ? 'up' : 'down',
        percentage: Math.floor(Math.random() * 15) + 5,
        period: 'last 6 months',
      },
      factors: [
        'Seasonal demand',
        'Vendor availability',
        'Economic conditions',
      ],
      lastUpdated: new Date(),
    }));
  },
};

export function useBudgetOptimization(
  initialBudget?: BudgetAllocation,
  coupleId?: string,
): UseBudgetOptimizationReturn {
  // State
  const [budgetData, setBudgetData] = useState<BudgetAllocation | null>(
    initialBudget || null,
  );
  const [recommendations, setRecommendations] = useState<
    CostSavingRecommendation[]
  >([]);
  const [marketData, setMarketData] = useState<MarketPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const optimizationScore = useMemo(() => {
    if (!budgetData) return 0;
    return budgetData.optimizationScore || 0;
  }, [budgetData]);

  // Helper function to generate mock budget data if none provided
  const generateMockBudgetData = useCallback((): BudgetAllocation => {
    const categories: BudgetCategory[] = [
      'venue',
      'catering',
      'photography',
      'flowers',
      'music',
      'attire',
    ].map((name, index) => ({
      id: `cat-${index}`,
      name,
      allocatedAmount: Math.floor(Math.random() * 5000) + 1000,
      spentAmount: Math.floor(Math.random() * 1000),
      plannedAmount: Math.floor(Math.random() * 4000) + 500,
      isOptimizable: true,
      priority: Math.random() > 0.5 ? 'high' : 'medium',
      color: BUDGET_CATEGORY_COLORS[name] || '#667085',
      marketPriceRange: {
        min: 500,
        max: 8000,
        average: 3000,
      },
    }));

    const allocatedBudget = categories.reduce(
      (sum, cat) => sum + cat.allocatedAmount,
      0,
    );
    const spentBudget = categories.reduce(
      (sum, cat) => sum + cat.spentAmount,
      0,
    );

    return {
      id: 'mock-budget',
      coupleId: coupleId || 'mock-couple',
      totalBudget: 25000,
      allocatedBudget,
      spentBudget,
      remainingBudget: 25000 - allocatedBudget,
      categories,
      lastUpdated: new Date(),
      optimizationScore: Math.floor(Math.random() * 40) + 60, // 60-100
      savingsOpportunity: Math.floor(Math.random() * 3000) + 500,
    };
  }, [coupleId]);

  // Initialize budget data if not provided
  useEffect(() => {
    if (!budgetData && !isLoading) {
      setBudgetData(generateMockBudgetData());
    }
  }, [budgetData, isLoading, generateMockBudgetData]);

  // Actions
  const optimizeBudget = useCallback(
    async (goals: OptimizationGoal[]) => {
      if (!budgetData) return;

      setIsOptimizing(true);
      setError(null);

      try {
        const request: BudgetOptimizationRequest = {
          coupleId: budgetData.coupleId,
          currentBudget: budgetData,
          goals,
          preferences: {
            riskTolerance: 'medium',
            timeframe: 12,
            priorities: goals.flatMap((g) => g.priorityCategories),
          },
        };

        const response = await mockOptimizationService.optimizeBudget(request);

        setBudgetData(response.optimizedBudget);
        setRecommendations(
          response.recommendations.sort(
            (a, b) =>
              RECOMMENDATION_PRIORITY[a.type] - RECOMMENDATION_PRIORITY[b.type],
          ),
        );
        setMarketData(response.marketInsights);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Optimization failed');
      } finally {
        setIsOptimizing(false);
      }
    },
    [budgetData],
  );

  const applyRecommendation = useCallback(
    async (recommendationId: string) => {
      const recommendation = recommendations.find(
        (r) => r.id === recommendationId,
      );
      if (!recommendation || !budgetData) return;

      setIsLoading(true);
      setError(null);

      try {
        // Apply the recommendation to the budget
        const updatedCategories = budgetData.categories.map((category) => {
          if (category.name === recommendation.category) {
            return {
              ...category,
              allocatedAmount: Math.max(
                0,
                category.allocatedAmount - recommendation.potentialSavings,
              ),
              plannedAmount: Math.max(
                0,
                category.plannedAmount - recommendation.potentialSavings,
              ),
            };
          }
          return category;
        });

        const updatedBudget: BudgetAllocation = {
          ...budgetData,
          categories: updatedCategories,
          allocatedBudget: updatedCategories.reduce(
            (sum, cat) => sum + cat.allocatedAmount,
            0,
          ),
          savingsOpportunity: Math.max(
            0,
            budgetData.savingsOpportunity - recommendation.potentialSavings,
          ),
          optimizationScore: Math.min(100, budgetData.optimizationScore + 5),
          lastUpdated: new Date(),
        };

        setBudgetData(updatedBudget);

        // Mark recommendation as applied
        setRecommendations((prev) =>
          prev.map((rec) =>
            rec.id === recommendationId ? { ...rec, isApplied: true } : rec,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to apply recommendation',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [recommendations, budgetData],
  );

  const dismissRecommendation = useCallback((recommendationId: string) => {
    setRecommendations((prev) =>
      prev.filter((rec) => rec.id !== recommendationId),
    );
  }, []);

  const updateAllocation = useCallback(
    async (categories: BudgetCategory[]) => {
      if (!budgetData) return;

      setIsLoading(true);
      setError(null);

      try {
        const allocatedBudget = categories.reduce(
          (sum, cat) => sum + cat.allocatedAmount,
          0,
        );
        const spentBudget = categories.reduce(
          (sum, cat) => sum + cat.spentAmount,
          0,
        );

        const updatedBudget: BudgetAllocation = {
          ...budgetData,
          categories,
          allocatedBudget,
          spentBudget,
          remainingBudget: budgetData.totalBudget - allocatedBudget,
          lastUpdated: new Date(),
        };

        setBudgetData(updatedBudget);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update allocation',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [budgetData],
  );

  const refreshMarketData = useCallback(async () => {
    if (!budgetData) return;

    setIsLoading(true);
    setError(null);

    try {
      const categories = budgetData.categories.map((cat) => cat.name);
      const data = await mockOptimizationService.getMarketData(
        categories,
        'US-National',
      );
      setMarketData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to refresh market data',
      );
    } finally {
      setIsLoading(false);
    }
  }, [budgetData]);

  const generateNewRecommendations = useCallback(async () => {
    if (!budgetData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generate new recommendations based on current budget state
      const goals: OptimizationGoal[] = [
        {
          type: 'reduce-costs',
          priorityCategories: budgetData.categories
            .filter((cat) => cat.isOptimizable)
            .map((cat) => cat.name),
          constraints: [],
          preferences: {
            diyWillingness: 50,
            travelWillingness: 30,
            flexibilityScore: 70,
          },
        },
      ];

      await optimizeBudget(goals);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate recommendations',
      );
    } finally {
      setIsLoading(false);
    }
  }, [budgetData, optimizeBudget]);

  // Utility functions
  const calculateSavings = useCallback((): number => {
    if (!budgetData) return 0;
    return recommendations
      .filter((rec) => !rec.isApplied)
      .reduce((sum, rec) => sum + rec.potentialSavings, 0);
  }, [budgetData, recommendations]);

  const getOptimizationInsights = useCallback((): string[] => {
    if (!budgetData) return [];

    const insights: string[] = [];

    if (budgetData.optimizationScore < 70) {
      insights.push('Your budget has significant optimization opportunities');
    }

    if (budgetData.savingsOpportunity > 1000) {
      insights.push(
        `Potential savings of $${budgetData.savingsOpportunity.toLocaleString()} identified`,
      );
    }

    const overspentCategories = budgetData.categories.filter(
      (cat) => cat.spentAmount > cat.allocatedAmount,
    );

    if (overspentCategories.length > 0) {
      insights.push(`${overspentCategories.length} categories are over budget`);
    }

    return insights;
  }, [budgetData]);

  const validateBudgetAllocation = useCallback(
    (categories: BudgetCategory[]): string[] => {
      const errors: string[] = [];

      const totalAllocated = categories.reduce(
        (sum, cat) => sum + cat.allocatedAmount,
        0,
      );

      if (totalAllocated > (budgetData?.totalBudget || 0)) {
        errors.push('Total allocation exceeds budget');
      }

      const negativeCategories = categories.filter(
        (cat) => cat.allocatedAmount < 0,
      );
      if (negativeCategories.length > 0) {
        errors.push('Categories cannot have negative allocations');
      }

      const missingEssentials = categories.filter(
        (cat) =>
          ['venue', 'catering'].includes(cat.name) && cat.allocatedAmount === 0,
      );

      if (missingEssentials.length > 0) {
        errors.push(
          'Essential categories (venue, catering) must have budget allocation',
        );
      }

      return errors;
    },
    [budgetData],
  );

  return {
    // State
    budgetData,
    recommendations: recommendations.filter((rec) => !rec.isApplied),
    marketData,
    optimizationScore,
    isLoading,
    isOptimizing,
    error,

    // Actions
    optimizeBudget,
    applyRecommendation,
    dismissRecommendation,
    updateAllocation,
    refreshMarketData,
    generateNewRecommendations,

    // Utilities
    calculateSavings,
    getOptimizationInsights,
    validateBudgetAllocation,
  };
}
