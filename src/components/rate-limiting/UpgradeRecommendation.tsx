'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowUpIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  StarIcon,
  ZapIcon,
  HeartIcon,
  ClockIcon,
  TrendingUpIcon,
  CrownIcon,
  ShieldIcon,
  GiftIcon,
  CalendarIcon,
  DollarSignIcon,
} from 'lucide-react';
import {
  UpgradeRecommendation as UpgradeRecommendationType,
  SubscriptionTier,
  TierLimits,
  UsageMetrics,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface UpgradeRecommendationProps {
  recommendation: UpgradeRecommendationType;
  currentTierData?: TierLimits;
  recommendedTierData?: TierLimits;
  currentUsage?: UsageMetrics;
  onUpgrade?: (tier: SubscriptionTier) => void;
  onDismiss?: () => void;
  onLearnMore?: (tier: SubscriptionTier) => void;
  showComparison?: boolean;
  urgentMode?: boolean;
  className?: string;
}

export default function UpgradeRecommendation({
  recommendation,
  currentTierData,
  recommendedTierData,
  currentUsage,
  onUpgrade,
  onDismiss,
  onLearnMore,
  showComparison = true,
  urgentMode = false,
  className = '',
}: UpgradeRecommendationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissCountdown, setDismissCountdown] = useState<number | null>(null);

  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  // Auto-dismiss countdown for urgent recommendations
  useEffect(() => {
    if (urgentMode && recommendation.urgencyScore > 90) {
      setDismissCountdown(30); // 30 seconds countdown

      const interval = setInterval(() => {
        setDismissCountdown((prev) => {
          if (prev && prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [urgentMode, recommendation.urgencyScore]);

  const getPriorityLevel = (): 'low' | 'medium' | 'high' | 'urgent' => {
    if (recommendation.urgencyScore >= 90) return 'urgent';
    if (recommendation.urgencyScore >= 70) return 'high';
    if (recommendation.urgencyScore >= 50) return 'medium';
    return 'low';
  };

  const getPriorityColor = (
    priority: 'low' | 'medium' | 'high' | 'urgent',
  ): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
    }
  };

  const getTierIcon = (tier: SubscriptionTier) => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return <GiftIcon className="w-5 h-5" />;
      case SubscriptionTier.STARTER:
        return <StarIcon className="w-5 h-5" />;
      case SubscriptionTier.PROFESSIONAL:
        return <ShieldIcon className="w-5 h-5" />;
      case SubscriptionTier.SCALE:
        return <ZapIcon className="w-5 h-5" />;
      case SubscriptionTier.ENTERPRISE:
        return <CrownIcon className="w-5 h-5" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getUrgencyMessage = (): string => {
    const priority = getPriorityLevel();

    if (recommendation.weddingDeadlineImpact) {
      return 'Wedding deadline approaching - upgrade recommended to ensure uninterrupted service';
    }

    switch (priority) {
      case 'urgent':
        return 'Critical: Rate limits being exceeded frequently';
      case 'high':
        return 'High usage detected - upgrade recommended soon';
      case 'medium':
        return 'Consider upgrading to accommodate growth';
      case 'low':
        return 'Upgrade available for additional features';
    }
  };

  const calculateSavings = (): number => {
    if (!currentTierData || !recommendedTierData) return 0;

    const currentCostPerRequest =
      currentTierData.price > 0
        ? currentTierData.price / currentTierData.monthlyRequestLimit
        : 0;
    const recommendedCostPerRequest =
      recommendedTierData.price / recommendedTierData.monthlyRequestLimit;

    if (currentUsage) {
      const projectedUsage = currentUsage.totalRequests * 1.2; // Assume 20% growth
      const currentProjectedCost = projectedUsage * currentCostPerRequest;
      const recommendedProjectedCost = recommendedTierData.price;

      if (currentProjectedCost > recommendedProjectedCost) {
        return currentProjectedCost - recommendedProjectedCost;
      }
    }

    return recommendation.monthlySavings || 0;
  };

  const priority = getPriorityLevel();
  const savings = calculateSavings();

  return (
    <Card
      className={`${className} ${
        priority === 'urgent'
          ? 'border-red-300 bg-red-50'
          : priority === 'high'
            ? 'border-orange-300 bg-orange-50'
            : priority === 'medium'
              ? 'border-yellow-300 bg-yellow-50'
              : 'border-blue-300 bg-blue-50'
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowUpIcon
              className={`w-6 h-6 ${
                priority === 'urgent'
                  ? 'text-red-600'
                  : priority === 'high'
                    ? 'text-orange-600'
                    : priority === 'medium'
                      ? 'text-yellow-600'
                      : 'text-blue-600'
              }`}
            />
            <div>
              <CardTitle className="text-lg">Upgrade Recommendation</CardTitle>
              <CardDescription>
                {recommendation.currentTier} → {recommendation.recommendedTier}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recommendation.weddingDeadlineImpact && (
              <Badge variant="destructive" className="animate-pulse">
                <HeartIcon className="w-3 h-3 mr-1" />
                Wedding Impact
              </Badge>
            )}

            <Badge className={getPriorityColor(priority)}>
              {priority.toUpperCase()}
            </Badge>

            {dismissCountdown && (
              <Badge variant="secondary">
                <ClockIcon className="w-3 h-3 mr-1" />
                {dismissCountdown}s
              </Badge>
            )}
          </div>
        </div>

        {/* Urgency Alert */}
        {priority === 'urgent' && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{getUrgencyMessage()}</AlertDescription>
          </Alert>
        )}

        {/* Wedding Season Alert */}
        {isWeddingSeason && recommendation.weddingDeadlineImpact && (
          <Alert>
            <HeartIcon className="h-4 w-4" />
            <AlertDescription>
              Peak wedding season + deadline pressure detected. Upgrade to avoid
              service interruptions.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Message */}
        <div className="p-4 rounded-lg bg-white border">
          <p className="font-medium text-gray-900 mb-2">
            {recommendation.customMessage}
          </p>
          <p className="text-sm text-gray-600">{getUrgencyMessage()}</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <ZapIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-green-600">
              +{formatNumber(recommendation.additionalRequests)}
            </p>
            <p className="text-xs text-gray-600">Additional Requests</p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <TrendingUpIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-blue-600">
              {recommendation.additionalFeatures.length}
            </p>
            <p className="text-xs text-gray-600">New Features</p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <DollarSignIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-purple-600">
              {savings > 0 ? `$${savings.toFixed(0)}` : 'Value'}
            </p>
            <p className="text-xs text-gray-600">
              {savings > 0 ? 'Monthly Savings' : 'Enhanced Features'}
            </p>
          </div>
        </div>

        {/* Urgency Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Urgency Score</span>
            <span className="text-gray-600">
              {recommendation.urgencyScore}/100
            </span>
          </div>
          <Progress
            value={recommendation.urgencyScore}
            className="h-3"
            style={{
              backgroundColor:
                priority === 'urgent'
                  ? '#fee2e2'
                  : priority === 'high'
                    ? '#fef3c7'
                    : priority === 'medium'
                      ? '#ddd6fe'
                      : '#dbeafe',
            }}
          />
          <p className="text-xs text-gray-500 text-center">
            {priority === 'urgent' && 'Immediate action recommended'}
            {priority === 'high' && 'Upgrade recommended within 24 hours'}
            {priority === 'medium' && 'Upgrade recommended within a week'}
            {priority === 'low' && 'Upgrade at your convenience'}
          </p>
        </div>

        {/* Feature Comparison */}
        {showComparison &&
          showDetails &&
          currentTierData &&
          recommendedTierData && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-medium text-gray-900">
                Plan Comparison
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="font-medium text-gray-700">Feature</div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getTierIcon(recommendation.currentTier)}
                      <span className="font-medium">
                        {recommendation.currentTier}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getTierIcon(recommendation.recommendedTier)}
                      <span className="font-medium">
                        {recommendation.recommendedTier}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-2 border-t">
                  <div>Monthly Requests</div>
                  <div className="text-center">
                    {formatNumber(currentTierData.monthlyRequestLimit)}
                  </div>
                  <div className="text-center font-bold text-green-600">
                    {formatNumber(recommendedTierData.monthlyRequestLimit)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-2 border-t">
                  <div>Rate Limit (/min)</div>
                  <div className="text-center">
                    {currentTierData.rateLimitPerMinute}
                  </div>
                  <div className="text-center font-bold text-green-600">
                    {recommendedTierData.rateLimitPerMinute}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-2 border-t">
                  <div>Wedding Season Multiplier</div>
                  <div className="text-center">
                    {currentTierData.weddingSeasonMultiplier}x
                  </div>
                  <div className="text-center font-bold text-green-600">
                    {recommendedTierData.weddingSeasonMultiplier}x
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-2 border-t">
                  <div>Monthly Price</div>
                  <div className="text-center">${currentTierData.price}</div>
                  <div className="text-center font-bold text-blue-600">
                    ${recommendedTierData.price}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* New Features */}
        {recommendation.additionalFeatures.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-gray-900">
              New Features You'll Get:
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendation.additionalFeatures
                .slice(0, showDetails ? undefined : 3)
                .map((feature, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    {feature}
                  </Badge>
                ))}
              {!showDetails && recommendation.additionalFeatures.length > 3 && (
                <Badge
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setShowDetails(true)}
                >
                  +{recommendation.additionalFeatures.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Wedding Season Benefits */}
        {isWeddingSeason && recommendedTierData && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">
                Wedding Season Benefits
              </span>
            </div>
            <p className="text-sm text-purple-700">
              Get {recommendedTierData.weddingSeasonMultiplier}x request
              multiplier (
              {formatNumber(
                recommendedTierData.monthlyRequestLimit *
                  (recommendedTierData.weddingSeasonMultiplier - 1),
              )}
              extra requests) during peak wedding season.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              onClick={() => onUpgrade?.(recommendation.recommendedTier)}
              className="flex-1"
              size="lg"
              variant={
                priority === 'urgent' || priority === 'high'
                  ? 'default'
                  : 'outline'
              }
            >
              <ArrowUpIcon className="w-4 h-4 mr-2" />
              Upgrade to {recommendation.recommendedTier}
            </Button>

            {onLearnMore && (
              <Button
                variant="outline"
                onClick={() => onLearnMore(recommendation.recommendedTier)}
              >
                Learn More
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!showDetails && showComparison && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="flex-1"
              >
                Show Comparison
              </Button>
            )}

            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="flex-1"
              >
                {dismissCountdown
                  ? `Dismiss (${dismissCountdown}s)`
                  : 'Dismiss'}
              </Button>
            )}
          </div>
        </div>

        {/* Value Proposition */}
        {savings > 0 && (
          <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              💰 You could save ${savings.toFixed(0)}/month with this upgrade!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Better value for your growing usage patterns
            </p>
          </div>
        )}

        {/* Deadline Warning */}
        {recommendation.weddingDeadlineImpact && (
          <div className="text-center p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CalendarIcon className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">
                Wedding Deadline Impact
              </span>
            </div>
            <p className="text-sm text-red-700">
              This upgrade is recommended to ensure smooth operations during
              your client's wedding preparations.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
