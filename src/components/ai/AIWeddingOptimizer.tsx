'use client';

/**
 * AI Wedding Optimizer - Main Interface Component
 * Team A: Frontend/UI Development - WS-341
 *
 * Central AI-powered wedding planning optimization interface
 * Provides intelligent recommendations for budget, timeline, vendor matching, and experience enhancement
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Wand2,
  Loader2,
  DollarSign,
  Clock,
  Users,
  Target,
  TrendingUp,
  Brain,
  Plus,
  ArrowRight,
  Info,
  X,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Import our comprehensive types
import type {
  AIWeddingOptimizerProps,
  OptimizationType,
  AIRecommendation,
  OptimizationResult,
  AIInsight,
  OptimizationHistory,
  WeddingProgress,
  BudgetHealth,
  AIFeedback,
  OptimizationRequest,
} from '@/types/ai-wedding-optimization';

// Import our custom hook
import { useAIOptimization } from '@/hooks/ai/useAIOptimization';

/**
 * Main AI Wedding Optimizer Component
 * Provides comprehensive AI-powered wedding planning optimization
 */
export function AIWeddingOptimizer({
  weddingId,
  couplePreferences,
  budget,
  timeline,
  currentOptimizations,
  onOptimizationRequest,
  onAcceptRecommendation,
  onFeedback,
  isOptimizing,
}: AIWeddingOptimizerProps) {
  const [selectedOptimization, setSelectedOptimization] =
    useState<OptimizationType>('comprehensive');
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
  const { optimizationHistory, error } = useAIOptimization(weddingId);

  // Calculate wedding progress and budget health
  const weddingProgress = useMemo(
    () => calculateWeddingProgress(timeline),
    [timeline],
  );
  const budgetHealth = useMemo(() => calculateBudgetHealth(budget), [budget]);

  const handleOptimizationRequest = async (
    request: Partial<OptimizationRequest>,
  ) => {
    const fullRequest: OptimizationRequest = {
      type: selectedOptimization,
      priority: 'high',
      ...request,
    };
    await onOptimizationRequest(fullRequest);
  };

  return (
    <div className="ai-wedding-optimizer min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 p-6">
      {/* AI Optimization Header */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-rose-100 p-8 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Wedding Optimizer
                </h1>
                <p className="text-gray-600 mt-1">
                  Intelligent optimization for your perfect wedding
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <OptimizationStatus isOptimizing={isOptimizing} />
              <Button
                onClick={() =>
                  handleOptimizationRequest({
                    type: 'comprehensive',
                    priority: 'high',
                  })
                }
                disabled={isOptimizing}
                className="bg-gradient-to-r from-rose-500 to-purple-600 text-white px-6 py-3"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Start AI Optimization
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">
              <strong>Error:</strong> {error.message}
            </p>
          </div>
        )}

        {/* Optimization Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <OptimizationCategory
            icon={<DollarSign className="w-8 h-8" />}
            title="Budget Optimization"
            description="Smart cost management and savings"
            optimizationType="budget"
            selected={selectedOptimization === 'budget'}
            onSelect={setSelectedOptimization}
            savingsPotential="up to 30%"
          />
          <OptimizationCategory
            icon={<Clock className="w-8 h-8" />}
            title="Timeline Optimization"
            description="Perfect scheduling and coordination"
            optimizationType="timeline"
            selected={selectedOptimization === 'timeline'}
            onSelect={setSelectedOptimization}
            timeSavings="40+ hours"
          />
          <OptimizationCategory
            icon={<Users className="w-8 h-8" />}
            title="Vendor Matching"
            description="AI-powered vendor recommendations"
            optimizationType="vendor"
            selected={selectedOptimization === 'vendor'}
            onSelect={setSelectedOptimization}
            matchAccuracy="95%"
          />
          <OptimizationCategory
            icon={<Target className="w-8 h-8" />}
            title="Experience Enhancement"
            description="Personalized wedding improvements"
            optimizationType="experience"
            selected={selectedOptimization === 'experience'}
            onSelect={setSelectedOptimization}
            satisfactionBoost="90%+"
          />
        </div>

        {/* AI Recommendations Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Optimization Panel */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    AI Recommendations
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    {currentOptimizations.length} Active Optimizations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {currentOptimizations.length === 0 ? (
                  <AIOptimizationPlaceholder
                    onStartOptimization={handleOptimizationRequest}
                  />
                ) : (
                  <div className="space-y-6">
                    {currentOptimizations.map((optimization) => (
                      <div key={optimization.id} className="space-y-4">
                        {optimization.recommendations.map((recommendation) => (
                          <AIRecommendationCard
                            key={recommendation.id}
                            recommendation={recommendation}
                            onAccept={onAcceptRecommendation}
                            onFeedback={onFeedback}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            <AIInsightsPanel
              insights={aiInsights}
              weddingProgress={weddingProgress}
              budgetHealth={budgetHealth}
            />

            <OptimizationHistoryWidget
              history={optimizationHistory}
              onReapplyOptimization={handleOptimizationRequest}
            />

            <AIPerformanceMetricsCard
              acceptanceRate={92}
              averageSavings={28}
              timeReduction={42}
            />
          </div>
        </div>

        {/* Real-time Optimization Progress */}
        {isOptimizing && (
          <div className="fixed bottom-6 right-6 z-50">
            <OptimizationProgressCard />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Optimization Category Selection Component
 */
interface OptimizationCategoryProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  optimizationType: OptimizationType;
  selected: boolean;
  onSelect: (type: OptimizationType) => void;
  savingsPotential?: string;
  timeSavings?: string;
  matchAccuracy?: string;
  satisfactionBoost?: string;
}

function OptimizationCategory({
  icon,
  title,
  description,
  optimizationType,
  selected,
  onSelect,
  savingsPotential,
  timeSavings,
  matchAccuracy,
  satisfactionBoost,
}: OptimizationCategoryProps) {
  const benefit =
    savingsPotential || timeSavings || matchAccuracy || satisfactionBoost;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-xl p-6 border-2 transition-all duration-200',
        'hover:shadow-lg hover:border-rose-300 hover:scale-105',
        selected
          ? 'border-rose-500 bg-rose-50 shadow-lg scale-105'
          : 'border-gray-200 bg-white',
      )}
      onClick={() => onSelect(optimizationType)}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-colors',
          selected
            ? 'bg-gradient-to-br from-rose-500 to-purple-600 text-white'
            : 'bg-gray-100 text-gray-600',
        )}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      {benefit && (
        <div className="flex items-center">
          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-sm font-medium text-green-600">{benefit}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Optimization Status Indicator
 */
interface OptimizationStatusProps {
  isOptimizing: boolean;
}

function OptimizationStatus({ isOptimizing }: OptimizationStatusProps) {
  if (!isOptimizing) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
        <span className="text-sm">Ready to optimize</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
      <span className="text-sm font-medium">AI analyzing...</span>
    </div>
  );
}

/**
 * AI Optimization Placeholder Component
 */
interface AIOptimizationPlaceholderProps {
  onStartOptimization: (request: Partial<OptimizationRequest>) => Promise<void>;
}

function AIOptimizationPlaceholder({
  onStartOptimization,
}: AIOptimizationPlaceholderProps) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Brain className="w-10 h-10 text-rose-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Ready to optimize your wedding?
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Let our AI analyze your wedding plans and provide personalized
        recommendations to save time, money, and reduce stress.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <Button
          onClick={() => onStartOptimization({ type: 'budget' })}
          variant="outline"
          className="w-full"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Optimize Budget
        </Button>
        <Button
          onClick={() => onStartOptimization({ type: 'timeline' })}
          variant="outline"
          className="w-full"
        >
          <Clock className="w-4 h-4 mr-2" />
          Optimize Timeline
        </Button>
      </div>
    </div>
  );
}

/**
 * AI Recommendation Card Component
 */
interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  onAccept: (recommendation: AIRecommendation) => Promise<void>;
  onFeedback: (feedback: AIFeedback) => void;
}

function AIRecommendationCard({
  recommendation,
  onAccept,
  onFeedback,
}: AIRecommendationCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept(recommendation);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    onFeedback({
      recommendationId: recommendation.id,
      type: 'negative',
      reason: 'Not interested',
    });
  };

  return (
    <Card className="border-2 border-gray-200 hover:border-rose-200 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <RecommendationIcon
              type={recommendation.category}
              confidence={recommendation.confidence}
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {recommendation.title}
              </h3>
              <p className="text-gray-600 text-sm">{recommendation.summary}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ConfidenceIndicator confidence={recommendation.confidence} />
            <ImpactBadge impact={recommendation.impact} />
          </div>
        </div>

        {/* Recommendation Details */}
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">
                Potential Savings:{' '}
                <span className="font-medium text-green-600">
                  £{recommendation.potentialSavings.toLocaleString()}
                </span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">
                Implementation:{' '}
                <span className="font-medium">
                  {recommendation.implementationTime}
                </span>
              </span>
            </div>
          </div>

          {recommendation.benefits && (
            <div className="flex flex-wrap gap-2">
              {recommendation.benefits.map((benefit, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-green-100 text-green-800 text-xs"
                >
                  {benefit}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Detailed Analysis
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              {recommendation.detailedAnalysis}
            </p>

            {recommendation.alternatives && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">
                  Alternative Options
                </h5>
                <ul className="space-y-1">
                  {recommendation.alternatives.map((alt, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-center"
                    >
                      <ArrowRight className="w-3 h-3 mr-2" />
                      {alt.title} - £{alt.cost.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Info className="w-4 h-4 mr-2" />
            {showDetails ? 'Less Details' : 'More Details'}
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4 mr-1" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Accept
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper Components
 */
function RecommendationIcon({
  type,
  confidence,
}: {
  type: string;
  confidence: number;
}) {
  const iconClass =
    confidence > 80
      ? 'text-green-600'
      : confidence > 60
        ? 'text-yellow-600'
        : 'text-gray-600';

  switch (type) {
    case 'budget':
      return <DollarSign className={`w-6 h-6 ${iconClass}`} />;
    case 'timeline':
      return <Clock className={`w-6 h-6 ${iconClass}`} />;
    case 'vendor':
      return <Users className={`w-6 h-6 ${iconClass}`} />;
    case 'experience':
      return <Target className={`w-6 h-6 ${iconClass}`} />;
    default:
      return <Sparkles className={`w-6 h-6 ${iconClass}`} />;
  }
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const color =
    confidence > 80
      ? 'bg-green-500'
      : confidence > 60
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div className="flex items-center space-x-1">
      <div className={`w-2 h-2 rounded-full ${color}`}></div>
      <span className="text-xs text-gray-500">{confidence}%</span>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={`${colors[impact as keyof typeof colors]} text-xs`}>
      {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
    </Badge>
  );
}

/**
 * Sidebar Components
 */
interface AIInsightsPanelProps {
  insights: AIInsight[];
  weddingProgress: WeddingProgress;
  budgetHealth: BudgetHealth;
}

function AIInsightsPanel({
  insights,
  weddingProgress,
  budgetHealth,
}: AIInsightsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Wedding Progress</span>
            <span className="text-sm font-medium">
              {weddingProgress.overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-rose-500 to-purple-600 h-2 rounded-full"
              style={{ width: `${weddingProgress.overallProgress}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Budget Health</span>
            <Badge
              className={
                budgetHealth.overallHealth === 'excellent'
                  ? 'bg-green-100 text-green-800'
                  : budgetHealth.overallHealth === 'good'
                    ? 'bg-blue-100 text-blue-800'
                    : budgetHealth.overallHealth === 'concerning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
              }
            >
              {budgetHealth.overallHealth}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {budgetHealth.onTrack ? 'On track' : 'Needs attention'}
          </p>
        </div>

        {insights.slice(0, 3).map((insight) => (
          <div key={insight.id} className="p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900">
              {insight.title}
            </h4>
            <p className="text-xs text-blue-700 mt-1">{insight.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface OptimizationHistoryWidgetProps {
  history: OptimizationHistory[];
  onReapplyOptimization: (
    request: Partial<OptimizationRequest>,
  ) => Promise<void>;
}

function OptimizationHistoryWidget({
  history,
  onReapplyOptimization,
}: OptimizationHistoryWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Optimizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <div className="text-sm font-medium">{item.request.type}</div>
              <div className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReapplyOptimization(item.request)}
            >
              Reapply
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface AIPerformanceMetricsCardProps {
  acceptanceRate: number;
  averageSavings: number;
  timeReduction: number;
}

function AIPerformanceMetricsCard({
  acceptanceRate,
  averageSavings,
  timeReduction,
}: AIPerformanceMetricsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {acceptanceRate}%
          </div>
          <div className="text-xs text-gray-500">Acceptance Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {averageSavings}%
          </div>
          <div className="text-xs text-gray-500">Average Savings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {timeReduction}h
          </div>
          <div className="text-xs text-gray-500">Time Saved</div>
        </div>
      </CardContent>
    </Card>
  );
}

function OptimizationProgressCard() {
  return (
    <Card className="w-80 shadow-xl">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <div>
            <div className="font-medium">AI Analyzing Wedding...</div>
            <div className="text-sm text-gray-500">
              This may take a few moments
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-rose-500 to-purple-600 h-2 rounded-full animate-pulse"
              style={{ width: '60%' }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Utility functions
 */
function calculateWeddingProgress(timeline: any): WeddingProgress {
  // Mock implementation - replace with actual logic
  return {
    overallProgress: 65,
    categories: [],
    upcomingDeadlines: [],
    criticalTasks: [],
    completedMilestones: [],
  };
}

function calculateBudgetHealth(budget: any): BudgetHealth {
  // Mock implementation - replace with actual logic
  return {
    overallHealth: 'good',
    onTrack: true,
    projectedOverrun: 0,
    savingsOpportunities: 3,
    riskFactors: [],
    recommendations: [],
  };
}

export default AIWeddingOptimizer;
