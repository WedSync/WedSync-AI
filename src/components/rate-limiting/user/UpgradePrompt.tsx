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
  StarIcon,
  CheckCircleIcon,
  XIcon,
  HeartIcon,
  ZapIcon,
  CrownIcon,
  ShieldIcon,
  TrendingUpIcon,
  CalendarIcon,
  GiftIcon,
  DollarSignIcon,
  ClockIcon,
  SparklesIcon,
} from 'lucide-react';
import {
  SubscriptionTier,
  TierLimits,
  UsageMetrics,
  UpgradeRecommendation,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface UpgradePromptProps {
  currentTier: SubscriptionTier;
  recommendedTier: SubscriptionTier;
  currentUsage?: UsageMetrics;
  currentTierData?: TierLimits;
  recommendedTierData?: TierLimits;
  upgradeRecommendation?: UpgradeRecommendation;
  onUpgrade?: (tier: SubscriptionTier) => void;
  onDismiss?: () => void;
  onLearnMore?: () => void;
  trigger?:
    | 'usage_high'
    | 'limit_exceeded'
    | 'wedding_deadline'
    | 'seasonal_offer'
    | 'manual';
  urgentMode?: boolean;
  showComparison?: boolean;
  dismissible?: boolean;
  className?: string;
}

export default function UpgradePrompt({
  currentTier,
  recommendedTier,
  currentUsage,
  currentTierData,
  recommendedTierData,
  upgradeRecommendation,
  onUpgrade,
  onDismiss,
  onLearnMore,
  trigger = 'manual',
  urgentMode = false,
  showComparison = true,
  dismissible = true,
  className = '',
}: UpgradePromptProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  // Limited time offer countdown
  useEffect(() => {
    if (trigger === 'seasonal_offer' || (isWeddingSeason && urgentMode)) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const updateCountdown = () => {
        const now = new Date().getTime();
        const end = endOfDay.getTime();
        const remaining = Math.max(0, Math.floor((end - now) / 1000));
        setTimeRemaining(remaining);
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [trigger, isWeddingSeason, urgentMode]);

  if (dismissed) return null;

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

  const getTierColor = (tier: SubscriptionTier): string => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'text-gray-600 bg-gray-100';
      case SubscriptionTier.STARTER:
        return 'text-blue-600 bg-blue-100';
      case SubscriptionTier.PROFESSIONAL:
        return 'text-green-600 bg-green-100';
      case SubscriptionTier.SCALE:
        return 'text-purple-600 bg-purple-100';
      case SubscriptionTier.ENTERPRISE:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getPromptTitle = (): string => {
    switch (trigger) {
      case 'usage_high':
        return 'High Usage Detected';
      case 'limit_exceeded':
        return 'Rate Limit Exceeded';
      case 'wedding_deadline':
        return 'Wedding Deadline Approaching';
      case 'seasonal_offer':
        return 'Limited Time: Wedding Season Offer';
      default:
        return 'Upgrade Your Plan';
    }
  };

  const getPromptMessage = (): string => {
    switch (trigger) {
      case 'usage_high':
        return `You're using ${currentUsage ? Math.round((currentUsage.totalRequests / (currentTierData?.monthlyRequestLimit || 1)) * 100) : 0}% of your ${currentTier} plan. Upgrade to avoid hitting limits.`;
      case 'limit_exceeded':
        return `Your ${currentTier} plan limits have been exceeded. Upgrade to ${recommendedTier} for uninterrupted access.`;
      case 'wedding_deadline':
        return 'Critical wedding deadlines require reliable API access. Upgrade to ensure smooth operations.';
      case 'seasonal_offer':
        return `Special wedding season pricing! Get ${seasonalMultiplier}x capacity at a limited-time discount.`;
      default:
        return (
          upgradeRecommendation?.customMessage ||
          `Upgrade from ${currentTier} to ${recommendedTier} for enhanced features and capacity.`
        );
    }
  };

  const getUrgencyLevel = (): 'low' | 'medium' | 'high' | 'urgent' => {
    if (trigger === 'limit_exceeded' || trigger === 'wedding_deadline')
      return 'urgent';
    if (trigger === 'usage_high' || urgentMode) return 'high';
    if (trigger === 'seasonal_offer') return 'medium';
    return 'low';
  };

  const getUrgencyColor = (
    urgency: 'low' | 'medium' | 'high' | 'urgent',
  ): string => {
    switch (urgency) {
      case 'urgent':
        return 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50';
      case 'high':
        return 'border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50';
      case 'medium':
        return 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-green-50';
      case 'low':
        return 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const calculateSavings = (): number => {
    if (!currentTierData || !recommendedTierData || !currentUsage) return 0;

    // Calculate based on projected overages vs upgrade cost
    const projectedMonthlyUsage = currentUsage.totalRequests * 1.5; // Assume 50% growth
    if (projectedMonthlyUsage > currentTierData.monthlyRequestLimit) {
      const overage =
        projectedMonthlyUsage - currentTierData.monthlyRequestLimit;
      const overageCost = (overage / 1000) * 0.1; // Assume $0.10 per 1k extra requests
      const upgradeDifference =
        recommendedTierData.price - currentTierData.price;
      return Math.max(0, overageCost - upgradeDifference);
    }

    return upgradeRecommendation?.monthlySavings || 0;
  };

  const urgency = getUrgencyLevel();
  const savings = calculateSavings();

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card
      className={`${className} ${getUrgencyColor(urgency)} border-2 shadow-lg`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white shadow-sm">
              <ArrowUpIcon
                className={`w-6 h-6 ${
                  urgency === 'urgent'
                    ? 'text-red-500'
                    : urgency === 'high'
                      ? 'text-orange-500'
                      : urgency === 'medium'
                        ? 'text-yellow-500'
                        : 'text-blue-500'
                }`}
              />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                {getPromptTitle()}
              </CardTitle>
              <CardDescription className="text-sm">
                {currentTier} → {recommendedTier}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {urgency === 'urgent' && (
              <Badge variant="destructive" className="animate-pulse">
                URGENT
              </Badge>
            )}

            {trigger === 'seasonal_offer' && (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <SparklesIcon className="w-3 h-3 mr-1" />
                Special Offer
              </Badge>
            )}

            {isWeddingSeason && (
              <Badge
                variant="outline"
                className="border-purple-300 text-purple-700"
              >
                <HeartIcon className="w-3 h-3 mr-1" />
                Wedding Season
              </Badge>
            )}

            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Limited Time Countdown */}
        {timeRemaining !== null && (
          <Alert className="border-purple-200 bg-purple-50">
            <ClockIcon className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-700">
              ⏰ Limited time offer ends in:{' '}
              <span className="font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Message */}
        <div className="p-4 bg-white rounded-lg border shadow-sm">
          <p className="font-medium text-gray-900 mb-2">{getPromptMessage()}</p>

          {currentUsage && currentTierData && (
            <div className="text-sm text-gray-600">
              Current usage: {formatNumber(currentUsage.totalRequests)} /{' '}
              {formatNumber(currentTierData.monthlyRequestLimit)} requests
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="text-center p-3 bg-white rounded-lg border">
            <ZapIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-green-600">
              {recommendedTierData
                ? `${formatNumber(recommendedTierData.monthlyRequestLimit)}`
                : 'Unlimited'}
            </p>
            <p className="text-xs text-gray-600">Monthly Requests</p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <TrendingUpIcon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-blue-600">
              {upgradeRecommendation?.additionalFeatures.length || '5+'}
            </p>
            <p className="text-xs text-gray-600">New Features</p>
          </div>

          <div className="text-center p-3 bg-white rounded-lg border">
            <DollarSignIcon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="font-bold text-lg text-purple-600">
              {savings > 0 ? `$${savings.toFixed(0)}` : 'Better Value'}
            </p>
            <p className="text-xs text-gray-600">
              {savings > 0 ? 'Potential Savings' : 'Enhanced ROI'}
            </p>
          </div>
        </div>

        {/* Wedding Season Benefits */}
        {isWeddingSeason && recommendedTierData && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HeartIcon className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-purple-800">
                Wedding Season Bonus
              </span>
            </div>
            <p className="text-sm text-purple-700">
              Get {recommendedTierData.weddingSeasonMultiplier}x requests during
              peak wedding season - that's{' '}
              {formatNumber(
                recommendedTierData.monthlyRequestLimit *
                  (recommendedTierData.weddingSeasonMultiplier - 1),
              )}
              bonus requests automatically!
            </p>
          </div>
        )}

        {/* Plan Comparison */}
        {showComparison &&
          showDetails &&
          currentTierData &&
          recommendedTierData && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-medium text-gray-900 text-center">
                Plan Comparison
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="font-medium text-gray-700">Feature</div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div
                        className={`p-1 rounded ${getTierColor(currentTier)}`}
                      >
                        {getTierIcon(currentTier)}
                      </div>
                      <span className="font-medium">{currentTier}</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div
                        className={`p-1 rounded ${getTierColor(recommendedTier)}`}
                      >
                        {getTierIcon(recommendedTier)}
                      </div>
                      <span className="font-medium">{recommendedTier}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    {
                      feature: 'Monthly Requests',
                      current: formatNumber(
                        currentTierData.monthlyRequestLimit,
                      ),
                      recommended: formatNumber(
                        recommendedTierData.monthlyRequestLimit,
                      ),
                    },
                    {
                      feature: 'Rate Limit (/min)',
                      current: currentTierData.rateLimitPerMinute.toString(),
                      recommended:
                        recommendedTierData.rateLimitPerMinute.toString(),
                    },
                    {
                      feature: 'Wedding Season Multiplier',
                      current: `${currentTierData.weddingSeasonMultiplier}x`,
                      recommended: `${recommendedTierData.weddingSeasonMultiplier}x`,
                    },
                    {
                      feature: 'Monthly Price',
                      current: `$${currentTierData.price}`,
                      recommended: `$${recommendedTierData.price}`,
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-3 gap-4 py-2 border-t"
                    >
                      <div className="font-medium">{item.feature}</div>
                      <div className="text-center">{item.current}</div>
                      <div className="text-center font-bold text-green-600">
                        {item.recommended}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* New Features */}
        {upgradeRecommendation?.additionalFeatures && (
          <div className="space-y-2">
            <p className="font-semibold text-gray-900">What You'll Get:</p>
            <div className="flex flex-wrap gap-2">
              {upgradeRecommendation.additionalFeatures
                .slice(0, showDetails ? undefined : 4)
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
              {!showDetails &&
                upgradeRecommendation.additionalFeatures.length > 4 && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setShowDetails(true)}
                  >
                    +{upgradeRecommendation.additionalFeatures.length - 4} more
                  </Badge>
                )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => onUpgrade?.(recommendedTier)}
            className="w-full"
            size="lg"
            variant={
              urgency === 'urgent' || urgency === 'high' ? 'default' : 'outline'
            }
          >
            <ArrowUpIcon className="w-4 h-4 mr-2" />
            {trigger === 'seasonal_offer'
              ? 'Claim Special Offer'
              : `Upgrade to ${recommendedTier}`}
          </Button>

          <div className="flex gap-2">
            {onLearnMore && (
              <Button
                variant="outline"
                onClick={onLearnMore}
                className="flex-1"
              >
                Learn More
              </Button>
            )}

            {!showDetails && showComparison && (
              <Button
                variant="ghost"
                onClick={() => setShowDetails(true)}
                className="flex-1"
              >
                Compare Plans
              </Button>
            )}
          </div>
        </div>

        {/* Special Offers */}
        {trigger === 'seasonal_offer' && (
          <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm font-bold text-green-800 mb-1">
              🎉 Wedding Season Special: Save 25% for 3 months!
            </p>
            <p className="text-xs text-green-600">
              Use code WEDDING2025 - Valid until{' '}
              {new Date().toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Value Proposition */}
        {savings > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm font-semibold text-green-800">
              💰 You could save ${savings.toFixed(0)}/month by upgrading now!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Avoid overage charges and get better value for your growing
              business
            </p>
          </div>
        )}

        {/* Urgency Messages */}
        {trigger === 'wedding_deadline' && (
          <Alert variant="destructive">
            <CalendarIcon className="h-4 w-4" />
            <AlertDescription>
              Your client's wedding is approaching. Ensure uninterrupted service
              by upgrading now.
            </AlertDescription>
          </Alert>
        )}

        {urgency === 'urgent' && trigger === 'limit_exceeded' && (
          <Alert variant="destructive">
            <AlertDescription>
              Your API access is currently limited. Upgrade immediately to
              restore full functionality.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
