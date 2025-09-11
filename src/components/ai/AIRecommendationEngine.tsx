'use client';

/**
 * AI Recommendation Engine Component
 * Team A: Frontend/UI Development - WS-341
 *
 * Display and interact with AI-generated wedding recommendations
 * Includes filtering, detailed views, and recommendation management
 */

import React, { useState, useMemo } from 'react';
import {
  Brain,
  Plus,
  Filter,
  ArrowRight,
  Info,
  X,
  Check,
  Loader2,
  DollarSign,
  Clock,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Star,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Import our types
import type {
  AIRecommendationEngineProps,
  AIRecommendation,
  RecommendationFilter,
  WeddingContext,
  RecommendationCriteria,
} from '@/types/ai-wedding-optimization';

/**
 * AI Recommendation Engine Component
 * Displays, filters, and manages AI-generated wedding recommendations
 */
export function AIRecommendationEngine({
  recommendations,
  weddingContext,
  onAcceptRecommendation,
  onDeclineRecommendation,
  onRequestMoreRecommendations,
  isLoading,
}: AIRecommendationEngineProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<
    string | null
  >(null);
  const [filterCriteria, setFilterCriteria] =
    useState<RecommendationFilter>('all');

  // Filter recommendations based on selected criteria
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (filterCriteria === 'all') return true;
      return rec.category === filterCriteria;
    });
  }, [recommendations, filterCriteria]);

  // Sort recommendations by priority and confidence
  const sortedRecommendations = useMemo(() => {
    return [...filteredRecommendations].sort((a, b) => {
      // First sort by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by confidence (higher first)
      return b.confidence - a.confidence;
    });
  }, [filteredRecommendations]);

  return (
    <div className="ai-recommendation-engine space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            AI Recommendations
          </h2>
          <p className="text-gray-600 mt-1">
            Personalized suggestions to optimize your wedding planning
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <RecommendationStatsDisplay recommendations={recommendations} />
        </div>
      </div>

      {/* Recommendation Filters */}
      <div className="flex flex-wrap gap-2">
        <RecommendationFilterButton
          label="All Recommendations"
          value="all"
          count={recommendations.length}
          selected={filterCriteria === 'all'}
          onSelect={setFilterCriteria}
          icon={<Sparkles className="w-4 h-4" />}
        />
        <RecommendationFilterButton
          label="Budget Savings"
          value="budget"
          count={recommendations.filter((r) => r.category === 'budget').length}
          selected={filterCriteria === 'budget'}
          onSelect={setFilterCriteria}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <RecommendationFilterButton
          label="Vendor Matches"
          value="vendor"
          count={recommendations.filter((r) => r.category === 'vendor').length}
          selected={filterCriteria === 'vendor'}
          onSelect={setFilterCriteria}
          icon={<Users className="w-4 h-4" />}
        />
        <RecommendationFilterButton
          label="Timeline Fixes"
          value="timeline"
          count={
            recommendations.filter((r) => r.category === 'timeline').length
          }
          selected={filterCriteria === 'timeline'}
          onSelect={setFilterCriteria}
          icon={<Clock className="w-4 h-4" />}
        />
        <RecommendationFilterButton
          label="Experience"
          value="experience"
          count={
            recommendations.filter((r) => r.category === 'experience').length
          }
          selected={filterCriteria === 'experience'}
          onSelect={setFilterCriteria}
          icon={<Target className="w-4 h-4" />}
        />
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {isLoading ? (
          <RecommendationsLoadingState />
        ) : sortedRecommendations.length === 0 ? (
          <EmptyRecommendationsState
            onRequestMore={onRequestMoreRecommendations}
            weddingContext={weddingContext}
            filterCriteria={filterCriteria}
          />
        ) : (
          sortedRecommendations.map((recommendation) => (
            <AIRecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              selected={selectedRecommendation === recommendation.id}
              onSelect={setSelectedRecommendation}
              onAccept={onAcceptRecommendation}
              onDecline={onDeclineRecommendation}
              weddingContext={weddingContext}
            />
          ))
        )}
      </div>

      {/* Smart Recommendation Request */}
      {!isLoading && (
        <SmartRecommendationRequestCard
          onRequestMore={onRequestMoreRecommendations}
          weddingContext={weddingContext}
          currentCount={recommendations.length}
        />
      )}
    </div>
  );
}

/**
 * Recommendation Filter Button Component
 */
interface RecommendationFilterButtonProps {
  label: string;
  value: RecommendationFilter;
  count: number;
  selected: boolean;
  onSelect: (value: RecommendationFilter) => void;
  icon: React.ReactNode;
}

function RecommendationFilterButton({
  label,
  value,
  count,
  selected,
  onSelect,
  icon,
}: RecommendationFilterButtonProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-center space-x-2',
        selected
          ? 'bg-rose-500 hover:bg-rose-600 text-white'
          : 'hover:bg-rose-50 hover:border-rose-200',
      )}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            'ml-1 text-xs',
            selected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600',
          )}
        >
          {count}
        </Badge>
      )}
    </Button>
  );
}

/**
 * Recommendation Stats Display
 */
interface RecommendationStatsDisplayProps {
  recommendations: AIRecommendation[];
}

function RecommendationStatsDisplay({
  recommendations,
}: RecommendationStatsDisplayProps) {
  const stats = useMemo(() => {
    const totalSavings = recommendations.reduce(
      (sum, rec) => sum + rec.potentialSavings,
      0,
    );
    const averageConfidence =
      recommendations.length > 0
        ? recommendations.reduce((sum, rec) => sum + rec.confidence, 0) /
          recommendations.length
        : 0;
    const highImpactCount = recommendations.filter(
      (rec) => rec.impact === 'high' || rec.impact === 'critical',
    ).length;

    return {
      totalSavings,
      averageConfidence,
      highImpactCount,
    };
  }, [recommendations]);

  if (recommendations.length === 0) return null;

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-1 text-green-600">
        <DollarSign className="w-4 h-4" />
        <span className="font-medium">
          £{stats.totalSavings.toLocaleString()} potential savings
        </span>
      </div>
      <div className="flex items-center space-x-1 text-blue-600">
        <Star className="w-4 h-4" />
        <span className="font-medium">
          {Math.round(stats.averageConfidence)}% confidence
        </span>
      </div>
      {stats.highImpactCount > 0 && (
        <div className="flex items-center space-x-1 text-orange-600">
          <Zap className="w-4 h-4" />
          <span className="font-medium">
            {stats.highImpactCount} high impact
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * AI Recommendation Card Component
 */
interface AIRecommendationCardProps {
  recommendation: AIRecommendation;
  selected: boolean;
  onSelect: (id: string) => void;
  onAccept: (recommendation: AIRecommendation) => Promise<void>;
  onDecline: (recommendation: AIRecommendation, reason?: string) => void;
  weddingContext: WeddingContext;
}

function AIRecommendationCard({
  recommendation,
  selected,
  onSelect,
  onAccept,
  onDecline,
  weddingContext,
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
    onDecline(recommendation, 'Not interested');
  };

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-200 cursor-pointer',
        selected
          ? 'border-rose-300 shadow-lg'
          : 'border-gray-200 hover:border-rose-200 hover:shadow-md',
        recommendation.status === 'accepted' && 'bg-green-50 border-green-300',
        recommendation.status === 'declined' &&
          'bg-gray-50 border-gray-300 opacity-75',
      )}
      onClick={() => onSelect(recommendation.id)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <RecommendationIcon
              type={recommendation.category}
              confidence={recommendation.confidence}
              status={recommendation.status}
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
            {recommendation.status === 'accepted' && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Accepted
              </Badge>
            )}
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

          {recommendation.timeSavings && (
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">
                Time Savings:{' '}
                <span className="font-medium text-purple-600">
                  {recommendation.timeSavings} hours
                </span>
              </span>
            </div>
          )}

          {recommendation.benefits && (
            <div className="flex flex-wrap gap-2">
              {recommendation.benefits.slice(0, 3).map((benefit, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-green-100 text-green-800 text-xs"
                >
                  {benefit}
                </Badge>
              ))}
              {recommendation.benefits.length > 3 && (
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-600 text-xs"
                >
                  +{recommendation.benefits.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Detailed Analysis
              </h4>
              <p className="text-sm text-gray-700">
                {recommendation.detailedAnalysis}
              </p>
            </div>

            {recommendation.risks && recommendation.risks.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mr-1" />
                  Considerations
                </h5>
                <ul className="space-y-1">
                  {recommendation.risks.map((risk, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-start"
                    >
                      <ArrowRight className="w-3 h-3 mt-0.5 mr-2 text-yellow-500" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendation.alternatives && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">
                  Alternative Options
                </h5>
                <ul className="space-y-2">
                  {recommendation.alternatives.map((alt, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 bg-white rounded p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{alt.title}</span>
                        <span className="text-green-600">
                          £{alt.cost.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {alt.description}
                      </p>
                      <div className="flex items-center mt-1 space-x-1">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {alt.confidence}% confidence
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {recommendation.status === 'pending' && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(!showDetails);
              }}
            >
              <Info className="w-4 h-4 mr-2" />
              {showDetails ? 'Less Details' : 'More Details'}
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDecline();
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAccept();
                }}
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
        )}

        {recommendation.status === 'accepted' && (
          <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">
              Recommendation accepted and being implemented
            </span>
          </div>
        )}
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
  status,
}: {
  type: string;
  confidence: number;
  status?: string;
}) {
  const iconClass = cn(
    'w-6 h-6',
    status === 'accepted' && 'text-green-600',
    status === 'declined' && 'text-gray-400',
    !status &&
      (confidence > 80
        ? 'text-green-600'
        : confidence > 60
          ? 'text-yellow-600'
          : 'text-gray-600'),
  );

  switch (type) {
    case 'budget':
      return <DollarSign className={iconClass} />;
    case 'timeline':
      return <Clock className={iconClass} />;
    case 'vendor':
      return <Users className={iconClass} />;
    case 'experience':
      return <Target className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
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
 * Loading and Empty States
 */
function RecommendationsLoadingState() {
  return (
    <div className="grid gap-4">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className="border-2 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div>
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex space-x-2 mb-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-18" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

interface EmptyRecommendationsStateProps {
  onRequestMore: (criteria: RecommendationCriteria) => Promise<void>;
  weddingContext: WeddingContext;
  filterCriteria: RecommendationFilter;
}

function EmptyRecommendationsState({
  onRequestMore,
  weddingContext,
  filterCriteria,
}: EmptyRecommendationsStateProps) {
  const handleRequestRecommendations = () => {
    const criteria: RecommendationCriteria = {
      type: 'personalized',
      maxRecommendations: 10,
      categories: filterCriteria === 'all' ? undefined : [filterCriteria],
    };
    onRequestMore(criteria);
  };

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <Brain className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {filterCriteria === 'all'
          ? 'No recommendations yet'
          : `No ${filterCriteria} recommendations`}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {filterCriteria === 'all'
          ? 'Start an AI optimization to get personalized recommendations for your wedding.'
          : `We haven't found any ${filterCriteria} optimization opportunities yet. Try requesting more recommendations or exploring other categories.`}
      </p>
      <Button
        onClick={handleRequestRecommendations}
        className="bg-rose-500 hover:bg-rose-600 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Get AI Recommendations
      </Button>
    </div>
  );
}

/**
 * Smart Recommendation Request Card
 */
interface SmartRecommendationRequestCardProps {
  onRequestMore: (criteria: RecommendationCriteria) => Promise<void>;
  weddingContext: WeddingContext;
  currentCount: number;
}

function SmartRecommendationRequestCard({
  onRequestMore,
  weddingContext,
  currentCount,
}: SmartRecommendationRequestCardProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = async (
    type: 'personalized' | 'budget-focused' | 'time-focused',
  ) => {
    setIsRequesting(true);
    try {
      const criteria: RecommendationCriteria = {
        type,
        maxRecommendations: 5,
        prioritizeBy:
          type === 'budget-focused'
            ? 'savings'
            : type === 'time-focused'
              ? 'time'
              : 'satisfaction',
      };
      await onRequestMore(criteria);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Need more recommendations?
              </h3>
              <p className="text-sm text-gray-600">
                {currentCount === 0
                  ? 'AI can generate personalized suggestions based on your preferences'
                  : `You have ${currentCount} recommendations. Get more personalized suggestions.`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRequest('budget-focused')}
              disabled={isRequesting}
              className="bg-white"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Budget Focus
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRequest('time-focused')}
              disabled={isRequesting}
              className="bg-white"
            >
              <Clock className="w-4 h-4 mr-1" />
              Time Focus
            </Button>
            <Button
              onClick={() => handleRequest('personalized')}
              disabled={isRequesting}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isRequesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Get More Ideas
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIRecommendationEngine;
