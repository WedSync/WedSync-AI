'use client';

/**
 * Budget Optimization Panel Component
 * Team A: Frontend/UI Development - WS-341
 *
 * AI-powered budget optimization interface with savings visualization
 * Displays current vs optimized budget, savings opportunities, and controls
 */

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Star,
  Target,
  Zap,
  Lightbulb,
  Calculator,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Import our types
import type {
  BudgetOptimizationPanelProps,
  WeddingBudget,
  OptimizedBudget,
  BudgetSavings,
  BudgetOptimization,
  BudgetCategory,
} from '@/types/ai-wedding-optimization';

/**
 * Budget Optimization Panel Component
 * Comprehensive budget optimization interface with AI-powered suggestions
 */
export function BudgetOptimizationPanel({
  currentBudget,
  optimizedBudget,
  savings,
  onApplyOptimization,
  onRejectOptimization,
}: BudgetOptimizationPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [viewMode, setViewMode] = useState<
    'overview' | 'categories' | 'timeline'
  >('overview');

  // Calculate optimization metrics
  const optimizationMetrics = useMemo(() => {
    const totalSavings = optimizedBudget.total - currentBudget.total;
    const savingsPercentage = Math.abs(
      (totalSavings / currentBudget.total) * 100,
    );
    const categoriesOptimized = optimizedBudget.optimizedCategories.filter(
      (cat) => cat.savings > 0,
    ).length;
    const highImpactSavings = savings.filter((s) => s.savings > 500).length;

    return {
      totalSavings: Math.abs(totalSavings),
      savingsPercentage,
      categoriesOptimized,
      highImpactSavings,
      riskLevel: calculateOverallRisk(savings),
    };
  }, [currentBudget, optimizedBudget, savings]);

  const toggleDetails = (savingId: string) => {
    setShowDetails((prev) => ({
      ...prev,
      [savingId]: !prev[savingId],
    }));
  };

  return (
    <div className="budget-optimization-panel space-y-6">
      {/* Header with Key Metrics */}
      <Card className="shadow-lg border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Budget Optimization
                </CardTitle>
                <p className="text-gray-600">
                  AI-powered cost management and savings
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                £{optimizationMetrics.totalSavings.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {optimizationMetrics.savingsPercentage.toFixed(1)}% potential
                savings
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Badge className="bg-green-100 text-green-800">
                  {optimizationMetrics.categoriesOptimized} categories optimized
                </Badge>
                <RiskIndicator level={optimizationMetrics.riskLevel} />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Budget Comparison Overview */}
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as any)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <PieChart className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="flex items-center space-x-2"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Categories</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>Timeline</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BudgetComparisonCard
              current={currentBudget}
              optimized={optimizedBudget}
            />
            <SavingsBreakdownCard
              savings={savings}
              totalSavings={optimizationMetrics.totalSavings}
            />
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <CategoryOptimizationGrid
            currentCategories={currentBudget.categories}
            optimizedCategories={optimizedBudget.optimizedCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <BudgetTimelineView
            savings={savings}
            onApplyOptimization={onApplyOptimization}
          />
        </TabsContent>
      </Tabs>

      {/* Optimization Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Optimization Opportunities
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {savings.length} opportunities found
              </Badge>
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                £{optimizationMetrics.totalSavings.toLocaleString()} total
                potential
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {savings
            .sort((a, b) => b.savings - a.savings) // Sort by savings amount
            .map((saving) => (
              <BudgetSavingCard
                key={saving.id}
                saving={saving}
                showDetails={showDetails[saving.id]}
                onToggleDetails={() => toggleDetails(saving.id)}
                onApply={onApplyOptimization}
                onReject={onRejectOptimization}
              />
            ))}
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <BudgetInsightsCard
        currentBudget={currentBudget}
        optimizedBudget={optimizedBudget}
        savings={savings}
        metrics={optimizationMetrics}
      />
    </div>
  );
}

/**
 * Budget Comparison Card Component
 */
interface BudgetComparisonCardProps {
  current: WeddingBudget;
  optimized: OptimizedBudget;
}

function BudgetComparisonCard({
  current,
  optimized,
}: BudgetComparisonCardProps) {
  const savingsAmount = current.total - optimized.total;
  const savingsPercentage = (savingsAmount / current.total) * 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-blue-600" />
          Budget Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Budget</span>
            <span className="text-lg font-semibold">
              £{current.total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Optimized Budget</span>
            <span className="text-lg font-semibold text-green-600">
              £{optimized.total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium text-gray-900">Savings</span>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                £{savingsAmount.toLocaleString()}
              </div>
              <div className="text-sm text-green-600">
                {savingsPercentage.toFixed(1)}% reduction
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Optimization Progress</span>
            <span>
              {Math.round((optimized.projectedSavings / savingsAmount) * 100)}%
            </span>
          </div>
          <Progress
            value={(optimized.projectedSavings / savingsAmount) * 100}
            className="h-3"
          />
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Star className="w-4 h-4 text-yellow-500" />
          <span>Confidence Score: {optimized.confidenceScore}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Savings Breakdown Card Component
 */
interface SavingsBreakdownCardProps {
  savings: BudgetSavings[];
  totalSavings: number;
}

function SavingsBreakdownCard({
  savings,
  totalSavings,
}: SavingsBreakdownCardProps) {
  const categoryBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    savings.forEach((saving) => {
      breakdown[saving.category] =
        (breakdown[saving.category] || 0) + saving.savings;
    });
    return Object.entries(breakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 categories
  }, [savings]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <TrendingDown className="w-5 h-5 mr-2 text-green-600" />
          Savings Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryBreakdown.map(([category, amount]) => {
          const percentage = (amount / totalSavings) * 100;
          return (
            <div key={category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{category}</span>
                <span className="font-medium">£{amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Progress value={percentage} className="flex-1 h-2" />
                <span className="text-xs text-gray-500 w-12">
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total Savings</span>
            <span className="text-green-600">
              £{totalSavings.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Budget Saving Card Component
 */
interface BudgetSavingCardProps {
  saving: BudgetSavings;
  showDetails: boolean;
  onToggleDetails: () => void;
  onApply: (optimization: BudgetOptimization) => Promise<void>;
  onReject: (optimization: BudgetOptimization) => void;
}

function BudgetSavingCard({
  saving,
  showDetails,
  onToggleDetails,
  onApply,
  onReject,
}: BudgetSavingCardProps) {
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const optimization: BudgetOptimization = {
        id: saving.id,
        category: saving.category,
        currentAmount: saving.currentCost,
        optimizedAmount: saving.optimizedCost,
        savings: saving.savings,
        reasoning: saving.reasoning,
        confidence: saving.confidence,
      };
      await onApply(optimization);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    const optimization: BudgetOptimization = {
      id: saving.id,
      category: saving.category,
      currentAmount: saving.currentCost,
      optimizedAmount: saving.optimizedCost,
      savings: saving.savings,
      reasoning: saving.reasoning,
      confidence: saving.confidence,
    };
    onReject(optimization);
  };

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-200',
        saving.riskLevel === 'low' && 'border-green-200 bg-green-50/50',
        saving.riskLevel === 'medium' && 'border-yellow-200 bg-yellow-50/50',
        saving.riskLevel === 'high' && 'border-red-200 bg-red-50/50',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <CategoryIcon category={saving.category} />
            <div>
              <h4 className="font-semibold text-gray-900 capitalize">
                {saving.category}
              </h4>
              <p className="text-sm text-gray-600">{saving.reasoning}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green-600">
              £{saving.savings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {saving.savingsPercentage.toFixed(1)}% savings
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-semibold">
              £{saving.currentCost.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Current</div>
          </div>
          <div className="text-center">
            <ArrowRight className="w-6 h-6 text-gray-400 mx-auto" />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              £{saving.optimizedCost.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Optimized</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <ConfidenceIndicator confidence={saving.confidence} />
            <RiskIndicator level={saving.riskLevel} />
            <DifficultyIndicator level={saving.implementationDifficulty} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDetails}
            className="text-blue-600 hover:text-blue-800"
          >
            {showDetails ? (
              <>
                <EyeOff className="w-4 h-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>

        {showDetails && (
          <div className="bg-white rounded-lg p-4 mb-4 border space-y-3">
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Alternatives</h5>
              <div className="space-y-2">
                {saving.alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{alt.title}</div>
                      <div className="text-xs text-gray-500">
                        {alt.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        £{alt.cost.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600">
                        {alt.confidence}% confidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="text-gray-600 hover:text-gray-800"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
          <Button
            onClick={handleApply}
            disabled={isApplying}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {isApplying ? (
              <>
                <Calculator className="w-4 h-4 mr-1 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Apply Optimization
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper Components
 */
function CategoryIcon({ category }: { category: string }) {
  const iconClass = 'w-8 h-8 p-1.5 rounded-lg';

  switch (category.toLowerCase()) {
    case 'venue':
      return (
        <div className={`${iconClass} bg-blue-100 text-blue-600`}>
          <Target className="w-5 h-5" />
        </div>
      );
    case 'catering':
      return (
        <div className={`${iconClass} bg-orange-100 text-orange-600`}>
          <DollarSign className="w-5 h-5" />
        </div>
      );
    case 'photography':
      return (
        <div className={`${iconClass} bg-purple-100 text-purple-600`}>
          <Star className="w-5 h-5" />
        </div>
      );
    case 'flowers':
      return (
        <div className={`${iconClass} bg-pink-100 text-pink-600`}>
          <Zap className="w-5 h-5" />
        </div>
      );
    default:
      return (
        <div className={`${iconClass} bg-gray-100 text-gray-600`}>
          <DollarSign className="w-5 h-5" />
        </div>
      );
  }
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const color =
    confidence > 80
      ? 'text-green-600'
      : confidence > 60
        ? 'text-yellow-600'
        : 'text-red-600';
  return (
    <div className={`flex items-center space-x-1 text-sm ${color}`}>
      <Star className="w-4 h-4" />
      <span>{confidence}%</span>
    </div>
  );
}

function RiskIndicator({ level }: { level: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return <Badge className={`${colors[level]} text-xs`}>{level} risk</Badge>;
}

function DifficultyIndicator({ level }: { level: 'easy' | 'medium' | 'hard' }) {
  const colors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={`${colors[level]} text-xs`}>{level} to implement</Badge>
  );
}

/**
 * Additional Components (Simplified implementations)
 */
function CategoryOptimizationGrid({
  currentCategories,
  optimizedCategories,
  selectedCategory,
  onSelectCategory,
}: any) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {optimizedCategories.map((category: any) => (
        <Card
          key={category.id}
          className={cn(
            'cursor-pointer transition-colors',
            selectedCategory === category.id
              ? 'border-rose-500 bg-rose-50'
              : 'border-gray-200',
          )}
          onClick={() => onSelectCategory(category.id)}
        >
          <CardContent className="p-4 text-center">
            <h3 className="font-medium capitalize">{category.name}</h3>
            <div className="text-2xl font-bold text-green-600">
              £{category.savings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">
              {category.savingsPercentage}% saved
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BudgetTimelineView({ savings, onApplyOptimization }: any) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <Lightbulb className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Implementation Timeline</h3>
        <p className="text-gray-600">
          Apply optimizations in the recommended order for maximum impact
        </p>
      </div>
      {savings.slice(0, 3).map((saving: any, index: number) => (
        <Card key={saving.id} className="p-4">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {index + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-medium">{saving.category}</h4>
              <p className="text-sm text-gray-600">
                Save £{saving.savings.toLocaleString()}
              </p>
            </div>
            <Button size="sm" onClick={() => onApplyOptimization(saving)}>
              Apply Now
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BudgetInsightsCard({
  currentBudget,
  optimizedBudget,
  savings,
  metrics,
}: any) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.categoriesOptimized}
            </div>
            <div className="text-sm text-gray-600">
              Categories can be optimized
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {metrics.savingsPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Average savings across categories
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.highImpactSavings}
            </div>
            <div className="text-sm text-gray-600">
              High-impact opportunities
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Utility Functions
 */
function calculateOverallRisk(
  savings: BudgetSavings[],
): 'low' | 'medium' | 'high' {
  const riskScores = savings.map((s) =>
    s.riskLevel === 'high' ? 3 : s.riskLevel === 'medium' ? 2 : 1,
  );
  const averageRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

  return averageRisk > 2.5 ? 'high' : averageRisk > 1.5 ? 'medium' : 'low';
}

export default BudgetOptimizationPanel;
