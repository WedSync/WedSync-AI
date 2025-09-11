'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  TrendingDown,
  Lightbulb,
  DollarSign,
  Calendar,
  Users,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  TrendingUp,
  Calculator,
  PieChart,
  Filter,
  RefreshCw,
  Download,
  Share,
  Bookmark,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, differenceInDays } from 'date-fns';

interface OptimizationSuggestion {
  id: string;
  type:
    | 'vendor_negotiation'
    | 'timing_optimization'
    | 'category_reallocation'
    | 'bulk_purchasing'
    | 'alternative_vendor'
    | 'seasonal_booking'
    | 'payment_timing'
    | 'feature_reduction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  potential_savings: number;
  confidence: number;
  category: string;
  vendor?: string;
  timeline_days: number;
  prerequisites: string[];
  risks: string[];
  steps: OptimizationStep[];
  status: 'new' | 'in_progress' | 'completed' | 'dismissed';
  implemented_date?: Date;
  actual_savings?: number;
  ai_reasoning: string;
  market_data?: MarketBenchmark;
  seasonal_factor?: number;
  priority_score: number;
  created_at: Date;
}

interface OptimizationStep {
  id: string;
  description: string;
  estimated_time: number;
  completed: boolean;
  notes?: string;
}

interface MarketBenchmark {
  market_average: number;
  your_price: number;
  percentile: number;
  comparison_vendors: string[];
  price_range: {
    min: number;
    max: number;
    median: number;
  };
}

interface OptimizationCampaign {
  id: string;
  name: string;
  target_savings: number;
  current_savings: number;
  suggestions: string[];
  status: 'planning' | 'active' | 'completed';
  deadline?: Date;
  created_at: Date;
}

interface BudgetOptimizerProps {
  clientId: string;
  className?: string;
  totalBudget: number;
  currentSpent: number;
  onSuggestionImplemented?: (suggestion: OptimizationSuggestion) => void;
}

const SUGGESTION_TYPES = {
  vendor_negotiation: {
    icon: Users,
    color: 'bg-blue-500',
    label: 'Vendor Negotiation',
  },
  timing_optimization: {
    icon: Calendar,
    color: 'bg-green-500',
    label: 'Timing Optimization',
  },
  category_reallocation: {
    icon: PieChart,
    color: 'bg-purple-500',
    label: 'Budget Reallocation',
  },
  bulk_purchasing: {
    icon: TrendingDown,
    color: 'bg-orange-500',
    label: 'Bulk Purchasing',
  },
  alternative_vendor: {
    icon: Star,
    color: 'bg-pink-500',
    label: 'Alternative Vendor',
  },
  seasonal_booking: {
    icon: Calendar,
    color: 'bg-indigo-500',
    label: 'Seasonal Booking',
  },
  payment_timing: {
    icon: DollarSign,
    color: 'bg-yellow-500',
    label: 'Payment Timing',
  },
  feature_reduction: {
    icon: Target,
    color: 'bg-red-500',
    label: 'Feature Optimization',
  },
};

const IMPACT_COLORS = {
  high: 'text-success-700 bg-success-100',
  medium: 'text-warning-700 bg-warning-100',
  low: 'text-gray-700 bg-gray-100',
};

const EFFORT_COLORS = {
  low: 'text-success-700 bg-success-100',
  medium: 'text-warning-700 bg-warning-100',
  high: 'text-error-700 bg-error-100',
};

export function BudgetOptimizer({
  clientId,
  className,
  totalBudget,
  currentSpent,
  onSuggestionImplemented,
}: BudgetOptimizerProps) {
  // State
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [campaigns, setCampaigns] = useState<OptimizationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'high_impact' | 'quick_wins' | 'ai_recommended'
  >('all');
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<OptimizationSuggestion | null>(null);
  const [showImplementationModal, setShowImplementationModal] = useState(false);
  const [generatingNew, setGeneratingNew] = useState(false);

  // Load optimization suggestions
  useEffect(() => {
    loadOptimizations();
  }, [clientId]);

  const loadOptimizations = async () => {
    setLoading(true);
    setError(null);

    try {
      const [suggestionsRes, campaignsRes] = await Promise.all([
        fetch(`/api/budget/optimizations?client_id=${clientId}`),
        fetch(`/api/budget/optimization-campaigns?client_id=${clientId}`),
      ]);

      if (!suggestionsRes.ok || !campaignsRes.ok) {
        throw new Error('Failed to load optimization data');
      }

      const [suggestionsData, campaignsData] = await Promise.all([
        suggestionsRes.json(),
        campaignsRes.json(),
      ]);

      setSuggestions(
        suggestionsData.suggestions.map((s: any) => ({
          ...s,
          created_at: new Date(s.created_at),
          implemented_date: s.implemented_date
            ? new Date(s.implemented_date)
            : undefined,
        })),
      );

      setCampaigns(
        campaignsData.campaigns.map((c: any) => ({
          ...c,
          created_at: new Date(c.created_at),
          deadline: c.deadline ? new Date(c.deadline) : undefined,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load optimization data',
      );
    } finally {
      setLoading(false);
    }
  };

  const generateNewSuggestions = async () => {
    setGeneratingNew(true);
    setError(null);

    try {
      const response = await fetch('/api/budget/optimizations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          total_budget: totalBudget,
          current_spent: currentSpent,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate new suggestions');

      await loadOptimizations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate suggestions',
      );
    } finally {
      setGeneratingNew(false);
    }
  };

  const implementSuggestion = async (suggestionId: string, notes?: string) => {
    try {
      const response = await fetch(
        `/api/budget/optimizations/${suggestionId}/implement`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in_progress',
            notes,
          }),
        },
      );

      if (!response.ok) throw new Error('Failed to implement suggestion');

      await loadOptimizations();
      setShowImplementationModal(false);
      setSelectedSuggestion(null);

      const suggestion = suggestions.find((s) => s.id === suggestionId);
      if (suggestion) {
        onSuggestionImplemented?.(suggestion);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to implement suggestion',
      );
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      const response = await fetch(
        `/api/budget/optimizations/${suggestionId}/dismiss`,
        {
          method: 'PATCH',
        },
      );

      if (!response.ok) throw new Error('Failed to dismiss suggestion');

      await loadOptimizations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to dismiss suggestion',
      );
    }
  };

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions;

    switch (selectedFilter) {
      case 'high_impact':
        filtered = filtered.filter((s) => s.impact === 'high');
        break;
      case 'quick_wins':
        filtered = filtered.filter(
          (s) => s.effort === 'low' && s.potential_savings > 200,
        );
        break;
      case 'ai_recommended':
        filtered = filtered.filter(
          (s) => s.confidence > 0.7 && s.priority_score > 0.8,
        );
        break;
      default:
        // 'all' - no filter
        break;
    }

    return filtered.sort((a, b) => b.priority_score - a.priority_score);
  }, [suggestions, selectedFilter]);

  // Optimization statistics
  const stats = useMemo(() => {
    const totalPotentialSavings = suggestions.reduce(
      (sum, s) => sum + s.potential_savings,
      0,
    );
    const implementedSavings = suggestions
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + (s.actual_savings || s.potential_savings), 0);
    const inProgressSavings = suggestions
      .filter((s) => s.status === 'in_progress')
      .reduce((sum, s) => sum + s.potential_savings, 0);

    const quickWins = suggestions.filter(
      (s) => s.effort === 'low' && s.potential_savings > 200,
    ).length;
    const highImpact = suggestions.filter((s) => s.impact === 'high').length;

    return {
      totalPotentialSavings,
      implementedSavings,
      inProgressSavings,
      quickWins,
      highImpact,
      savingsPercentage:
        totalBudget > 0 ? (totalPotentialSavings / totalBudget) * 100 : 0,
    };
  }, [suggestions, totalBudget]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSuggestionIcon = (type: OptimizationSuggestion['type']) => {
    const config = SUGGESTION_TYPES[type];
    const Icon = config.icon;
    return <Icon className="w-4 h-4" />;
  };

  const getPriorityColor = (score: number) => {
    if (score > 0.8) return 'text-error-600 bg-error-50';
    if (score > 0.6) return 'text-warning-600 bg-warning-50';
    return 'text-success-600 bg-success-50';
  };

  if (loading) {
    return (
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-xl p-6',
          className,
        )}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Budget Optimizer
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered suggestions to maximize your wedding budget efficiency
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateNewSuggestions}
              disabled={generatingNew}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles
                className={cn('w-4 h-4', generatingNew && 'animate-spin')}
              />
              {generatingNew ? 'Analyzing...' : 'Generate Ideas'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Optimization Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-success-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-xs text-success-600 font-medium">
                  Potential Savings
                </p>
                <p className="text-lg font-bold text-success-900">
                  {formatCurrency(stats.totalPotentialSavings)}
                </p>
                <p className="text-xs text-success-600">
                  {stats.savingsPercentage.toFixed(1)}% of budget
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Implemented</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(stats.implementedSavings)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-warning-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-xs text-warning-600 font-medium">
                  Quick Wins
                </p>
                <p className="text-lg font-bold text-warning-900">
                  {stats.quickWins}
                </p>
                <p className="text-xs text-warning-600">
                  Low effort, high value
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">
                  High Impact
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {stats.highImpact}
                </p>
                <p className="text-xs text-purple-600">Major opportunities</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All Suggestions' },
              { key: 'high_impact', label: 'High Impact' },
              { key: 'quick_wins', label: 'Quick Wins' },
              { key: 'ai_recommended', label: 'AI Recommended' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key as any)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  selectedFilter === filter.key
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="p-6">
        {filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">
              No optimization suggestions found
            </p>
            <p className="text-sm text-gray-400">
              {selectedFilter === 'all'
                ? 'Click "Generate Ideas" to get AI-powered suggestions'
                : 'Try adjusting your filter or generate new suggestions'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-white',
                          SUGGESTION_TYPES[suggestion.type].color,
                        )}
                      >
                        {getSuggestionIcon(suggestion.type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {suggestion.title}
                          </h4>
                          <span
                            className={cn(
                              'text-xs px-2 py-1 rounded-full font-medium',
                              getPriorityColor(suggestion.priority_score),
                            )}
                          >
                            Priority:{' '}
                            {(suggestion.priority_score * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full font-medium',
                              IMPACT_COLORS[suggestion.impact],
                            )}
                          >
                            {suggestion.impact.toUpperCase()} IMPACT
                          </span>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full font-medium',
                              EFFORT_COLORS[suggestion.effort],
                            )}
                          >
                            {suggestion.effort.toUpperCase()} EFFORT
                          </span>
                          <span className="text-gray-600">
                            {suggestion.timeline_days} days
                          </span>
                          <span className="text-gray-600">
                            {suggestion.confidence * 100}% confidence
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">
                      {suggestion.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-success-600">
                        Save {formatCurrency(suggestion.potential_savings)}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSuggestion(suggestion);
                            setShowImplementationModal(true);
                          }}
                          className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Implement
                        </button>

                        <button
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>

                    {suggestion.market_data && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            Market Comparison
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-blue-700">Your Price: </span>
                            <span className="font-medium">
                              {formatCurrency(
                                suggestion.market_data.your_price,
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">Market Avg: </span>
                            <span className="font-medium">
                              {formatCurrency(
                                suggestion.market_data.market_average,
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">Percentile: </span>
                            <span className="font-medium">
                              {suggestion.market_data.percentile}th
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {suggestion.ai_reasoning && (
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">
                            AI Analysis
                          </span>
                        </div>
                        <p className="text-sm text-purple-800">
                          {suggestion.ai_reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Implementation Modal */}
      {showImplementationModal && selectedSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Implement Optimization
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedSuggestion.title}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Savings Potential */}
              <div className="bg-success-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-success-600" />
                  <div>
                    <p className="font-semibold text-success-900">
                      Potential Savings:{' '}
                      {formatCurrency(selectedSuggestion.potential_savings)}
                    </p>
                    <p className="text-sm text-success-700">
                      Timeline: {selectedSuggestion.timeline_days} days •
                      Confidence:{' '}
                      {(selectedSuggestion.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Implementation Steps */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Implementation Steps
                </h4>
                <div className="space-y-2">
                  {selectedSuggestion.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          {step.description}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Estimated time: {step.estimated_time} hours
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites */}
              {selectedSuggestion.prerequisites.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Prerequisites
                  </h4>
                  <ul className="space-y-1">
                    {selectedSuggestion.prerequisites.map((prereq, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {selectedSuggestion.risks.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    Potential Risks
                  </h4>
                  <ul className="space-y-1">
                    {selectedSuggestion.risks.map((risk, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-warning-600 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowImplementationModal(false);
                    setSelectedSuggestion(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => implementSuggestion(selectedSuggestion.id)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Start Implementation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
