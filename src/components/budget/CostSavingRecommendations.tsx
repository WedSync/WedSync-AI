/**
 * CostSavingRecommendations Component for WS-245 Wedding Budget Optimizer System
 * AI-powered cost-saving recommendations with detailed analysis and one-click application
 * Built for React 19, TypeScript 5.9, Untitled UI, and intelligent budget optimization
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Star,
  Target,
  Users,
  Calendar,
  MapPin,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Info,
} from 'lucide-react';
import {
  CostSavingRecommendationsProps,
  CostSavingRecommendation,
  CostSavingRecommendationType,
} from '@/types/budget';

// Recommendation type icons and colors
const RECOMMENDATION_CONFIG: Record<
  CostSavingRecommendationType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  'vendor-alternative': {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Vendor Alternative',
  },
  'category-reallocation': {
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Budget Reallocation',
  },
  'timing-optimization': {
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Timing Optimization',
  },
  'feature-substitution': {
    icon: Star,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Feature Alternative',
  },
  'bulk-booking': {
    icon: DollarSign,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    label: 'Bulk Discount',
  },
  'seasonal-discount': {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Seasonal Savings',
  },
  'diy-opportunity': {
    icon: Sparkles,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    label: 'DIY Option',
  },
};

// Individual recommendation card
interface RecommendationCardProps {
  recommendation: CostSavingRecommendation;
  onApply: (recommendation: CostSavingRecommendation) => void;
  onDismiss?: (recommendationId: string) => void;
  onViewDetails?: (recommendation: CostSavingRecommendation) => void;
  isLoading?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onApply,
  onDismiss,
  onViewDetails,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const config = RECOMMENDATION_CONFIG[recommendation.type];
  const Icon = config.icon;

  const handleApply = useCallback(() => {
    onApply(recommendation);
  }, [recommendation, onApply]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(recommendation.id);
  }, [recommendation.id, onDismiss]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(recommendation);
  }, [recommendation, onViewDetails]);

  // Calculate days until expiry
  const daysUntilExpiry = useMemo(() => {
    if (!recommendation.expiresAt) return null;
    const now = new Date();
    const expiry = new Date(recommendation.expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [recommendation.expiresAt]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {recommendation.title}
                </h3>
                <span
                  className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${config.bgColor} ${config.color}
                `}
                >
                  {config.label}
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-3">
                {recommendation.description}
              </p>

              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <TrendingDown className="w-4 h-4 text-success-600" />
                  <span className="font-semibold text-success-700">
                    ${recommendation.potentialSavings.toLocaleString()} saved
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-600">
                    {recommendation.confidence}% confidence
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    {recommendation.timelineWeeks}w timeline
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {daysUntilExpiry && daysUntilExpiry <= 7 && (
              <div className="flex items-center space-x-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>{daysUntilExpiry}d left</span>
              </div>
            )}

            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Impact indicators */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500">Impact:</span>
            <div
              className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${
                recommendation.impact === 'high'
                  ? 'bg-red-50 text-red-700'
                  : recommendation.impact === 'medium'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-green-50 text-green-700'
              }
            `}
            >
              {recommendation.impact}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500">Effort:</span>
            <div
              className={`
              px-2 py-1 rounded-full text-xs font-medium
              ${
                recommendation.effort === 'complex'
                  ? 'bg-red-50 text-red-700'
                  : recommendation.effort === 'moderate'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-green-50 text-green-700'
              }
            `}
            >
              {recommendation.effort}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleApply}
              disabled={isLoading || recommendation.isApplied}
              className="
                inline-flex items-center px-4 py-2
                bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300
                text-white font-medium text-sm rounded-lg
                shadow-xs hover:shadow-sm transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-primary-100
                disabled:cursor-not-allowed
              "
            >
              {recommendation.isApplied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Applied
                </>
              ) : isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                  />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Recommendation
                </>
              )}
            </button>

            {onViewDetails && (
              <button
                onClick={handleViewDetails}
                className="
                  inline-flex items-center px-3 py-2
                  text-gray-700 hover:text-gray-900 font-medium text-sm
                  border border-gray-300 rounded-lg hover:bg-gray-50
                  transition-colors duration-200
                "
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Details
              </button>
            )}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              inline-flex items-center px-3 py-2
              text-gray-500 hover:text-gray-700 font-medium text-sm
              rounded-lg hover:bg-gray-50 transition-colors duration-200
            "
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Less Details
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 mr-1" />
                More Details
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-6 space-y-4">
              {/* AI Explanation */}
              <div className="bg-white rounded-lg p-4 border border-gray-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <h4 className="font-medium text-gray-900">AI Analysis</h4>
                </div>
                <p className="text-sm text-gray-700">
                  {recommendation.aiExplanation}
                </p>
              </div>

              {/* Pros and Cons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="font-medium text-success-900 mb-2 flex items-center">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Pros
                  </h4>
                  <ul className="space-y-1">
                    {recommendation.pros.map((pro, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-start"
                      >
                        <CheckCircle className="w-3 h-3 text-success-600 mr-2 mt-0.5 flex-shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Considerations
                  </h4>
                  <ul className="space-y-1">
                    {recommendation.cons.map((con, index) => (
                      <li
                        key={index}
                        className="text-sm text-gray-700 flex items-start"
                      >
                        <Info className="w-3 h-3 text-orange-600 mr-2 mt-0.5 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Items */}
              {recommendation.actionItems.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Action Items
                  </h4>
                  <div className="space-y-2">
                    {recommendation.actionItems.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 flex-1">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Vendors */}
              {recommendation.alternativeVendors &&
                recommendation.alternativeVendors.length > 0 && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Alternative Vendors
                    </h4>
                    <div className="space-y-3">
                      {recommendation.alternativeVendors
                        .slice(0, 3)
                        .map((vendor, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="font-medium text-gray-900">
                                  {vendor.name}
                                </h5>
                                <div className="flex items-center space-x-1">
                                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-gray-600">
                                    {vendor.rating}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                                <span>
                                  ${vendor.averagePrice.toLocaleString()}
                                </span>
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {vendor.location}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-success-600">
                                ${vendor.savings.toLocaleString()} saved
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Feedback */}
              {!showFeedback ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
                >
                  Was this recommendation helpful?
                </button>
              ) : (
                <div className="flex items-center justify-center space-x-4 py-2">
                  <button className="flex items-center space-x-2 text-sm text-success-600 hover:text-success-700">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful</span>
                  </button>
                  <button className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700">
                    <ThumbsDown className="w-4 h-4" />
                    <span>Not Helpful</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main component
export const CostSavingRecommendations: React.FC<
  CostSavingRecommendationsProps
> = ({
  currentBudget,
  aiRecommendations,
  potentialSavings,
  onRecommendationApply,
  onRecommendationDismiss,
  onViewDetails,
  isLoading = false,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<
    CostSavingRecommendationType | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<'savings' | 'confidence' | 'impact'>(
    'savings',
  );

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = aiRecommendations;

    if (filterType !== 'all') {
      filtered = filtered.filter((rec) => rec.type === filterType);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'savings':
          return b.potentialSavings - a.potentialSavings;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          const impactWeight = { high: 3, medium: 2, low: 1 };
          return impactWeight[b.impact] - impactWeight[a.impact];
        default:
          return 0;
      }
    });
  }, [aiRecommendations, filterType, sortBy]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            AI Recommendations
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRecommendations.length} recommendations • $
            {potentialSavings.toLocaleString()} potential savings
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full"
            />
            <span>Generating recommendations...</span>
          </div>
        )}
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="
                text-sm border border-gray-300 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-primary-500
                bg-white
              "
            >
              <option value="all">All Types</option>
              {Object.entries(RECOMMENDATION_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="
                text-sm border border-gray-300 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-primary-500
                bg-white
              "
            >
              <option value="savings">Potential Savings</option>
              <option value="confidence">Confidence</option>
              <option value="impact">Impact Level</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredRecommendations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No recommendations available
              </h4>
              <p className="text-gray-600">
                {filterType !== 'all'
                  ? 'Try changing your filter to see more recommendations.'
                  : 'Your budget is already well optimized! New recommendations will appear as market conditions change.'}
              </p>
            </motion.div>
          ) : (
            filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onApply={onRecommendationApply}
                onDismiss={onRecommendationDismiss}
                onViewDetails={onViewDetails}
                isLoading={isLoading}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
