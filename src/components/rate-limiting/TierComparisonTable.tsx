'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CrownIcon,
  ShieldIcon,
  ZapIcon,
  GiftIcon,
  ArrowUpIcon,
  HeartIcon,
  TrendingUpIcon,
  InfoIcon,
} from 'lucide-react';
import {
  TierLimits,
  SubscriptionTier,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface TierComparisonTableProps {
  tiers: TierLimits[];
  currentTier?: SubscriptionTier;
  recommendedTier?: SubscriptionTier;
  onSelectTier?: (tier: SubscriptionTier) => void;
  onUpgrade?: (tier: SubscriptionTier) => void;
  showPricing?: boolean;
  highlightDifferences?: boolean;
  compactMode?: boolean;
  className?: string;
}

export default function TierComparisonTable({
  tiers,
  currentTier,
  recommendedTier,
  onSelectTier,
  onUpgrade,
  showPricing = true,
  highlightDifferences = false,
  compactMode = false,
  className = '',
}: TierComparisonTableProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'limits' | 'pricing'>(
    'features',
  );

  // Sort tiers by hierarchy
  const tierOrder = [
    SubscriptionTier.FREE,
    SubscriptionTier.STARTER,
    SubscriptionTier.PROFESSIONAL,
    SubscriptionTier.SCALE,
    SubscriptionTier.ENTERPRISE,
  ];

  const sortedTiers = tiers.sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier),
  );

  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

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
        return 'border-gray-300 bg-gray-50';
      case SubscriptionTier.STARTER:
        return 'border-blue-300 bg-blue-50';
      case SubscriptionTier.PROFESSIONAL:
        return 'border-green-300 bg-green-50';
      case SubscriptionTier.SCALE:
        return 'border-purple-300 bg-purple-50';
      case SubscriptionTier.ENTERPRISE:
        return 'border-yellow-300 bg-yellow-50';
    }
  };

  const getTierTextColor = (tier: SubscriptionTier): string => {
    switch (tier) {
      case SubscriptionTier.FREE:
        return 'text-gray-700';
      case SubscriptionTier.STARTER:
        return 'text-blue-700';
      case SubscriptionTier.PROFESSIONAL:
        return 'text-green-700';
      case SubscriptionTier.SCALE:
        return 'text-purple-700';
      case SubscriptionTier.ENTERPRISE:
        return 'text-yellow-700';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getValueScore = (tier: TierLimits): number => {
    if (tier.price === 0) return 5; // Free is always good value
    return Math.min(5, Math.ceil(tier.monthlyRequestLimit / tier.price / 1000));
  };

  const getWeddingSeasonBenefit = (tier: TierLimits): string => {
    if (tier.weddingSeasonMultiplier <= 1) return 'None';
    const bonus = Math.round(
      tier.monthlyRequestLimit * (tier.weddingSeasonMultiplier - 1),
    );
    return `+${formatNumber(bonus)} requests`;
  };

  const isCurrentTier = (tier: SubscriptionTier): boolean => {
    return currentTier === tier;
  };

  const isRecommended = (tier: SubscriptionTier): boolean => {
    return recommendedTier === tier;
  };

  if (compactMode) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(5, sortedTiers.length)} gap-4 ${className}`}
      >
        {sortedTiers.map((tierData) => (
          <Card
            key={tierData.tier}
            className={`relative ${getTierColor(tierData.tier)} ${
              isCurrentTier(tierData.tier) ? 'ring-2 ring-blue-500' : ''
            } ${isRecommended(tierData.tier) ? 'ring-2 ring-green-500' : ''}`}
          >
            {isRecommended(tierData.tier) && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600">
                Recommended
              </Badge>
            )}
            {isCurrentTier(tierData.tier) && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600">
                Current
              </Badge>
            )}

            <CardContent className="p-4 text-center">
              <div
                className={`inline-flex p-3 rounded-full mb-3 ${getTierColor(tierData.tier)}`}
              >
                <div className={getTierTextColor(tierData.tier)}>
                  {getTierIcon(tierData.tier)}
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1">{tierData.tier}</h3>

              {showPricing && (
                <div className="mb-3">
                  <span className="text-2xl font-bold">${tierData.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">
                    {formatNumber(tierData.monthlyRequestLimit)}
                  </span>
                  <span className="text-gray-600"> requests/month</span>
                </div>
                <div>
                  <span className="font-medium">
                    {tierData.rateLimitPerMinute}
                  </span>
                  <span className="text-gray-600"> per minute</span>
                </div>
              </div>

              {!isCurrentTier(tierData.tier) && onUpgrade && (
                <Button
                  className="w-full mt-4"
                  size="sm"
                  variant={isRecommended(tierData.tier) ? 'default' : 'outline'}
                  onClick={() => onUpgrade(tierData.tier)}
                >
                  {isRecommended(tierData.tier) ? 'Upgrade' : 'Select'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Subscription Tier Comparison</CardTitle>
        <CardDescription>
          Compare features, limits, and pricing across all subscription tiers
        </CardDescription>

        {/* Wedding Season Notice */}
        {isWeddingSeason && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <HeartIcon className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">
                Peak Wedding Season Active
              </span>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              All plans include {seasonalMultiplier}x request multiplier during
              wedding season
            </p>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as any)}
        >
          <TabsList>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Value</TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium min-w-[200px]">
                      Feature
                    </th>
                    {sortedTiers.map((tierData) => (
                      <th
                        key={tierData.tier}
                        className="text-center p-4 min-w-[120px]"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`p-2 rounded-lg ${getTierColor(tierData.tier)}`}
                          >
                            <div className={getTierTextColor(tierData.tier)}>
                              {getTierIcon(tierData.tier)}
                            </div>
                          </div>
                          <span className="font-medium">{tierData.tier}</span>
                          {isCurrentTier(tierData.tier) && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {isRecommended(tierData.tier) && (
                            <Badge className="text-xs bg-green-600">
                              Recommended
                            </Badge>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">API Access</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Wedding Season Boost</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        {tierData.weddingSeasonMultiplier > 1 ? (
                          <div>
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto mb-1" />
                            <span className="text-xs text-green-600 font-medium">
                              {tierData.weddingSeasonMultiplier}x
                            </span>
                          </div>
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Burst Allowance</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <div>
                          <span className="font-medium">
                            {tierData.burstAllowance}
                          </span>
                          <span className="text-xs text-gray-500 block">
                            requests
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Priority Support</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        {tierData.tier === SubscriptionTier.PROFESSIONAL ||
                        tierData.tier === SubscriptionTier.SCALE ||
                        tierData.tier === SubscriptionTier.ENTERPRISE ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Custom Rate Limits</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        {tierData.tier === SubscriptionTier.SCALE ||
                        tierData.tier === SubscriptionTier.ENTERPRISE ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="limits" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Limit Type</th>
                    {sortedTiers.map((tierData) => (
                      <th key={tierData.tier} className="text-center p-4">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`p-2 rounded-lg ${getTierColor(tierData.tier)}`}
                          >
                            <div className={getTierTextColor(tierData.tier)}>
                              {getTierIcon(tierData.tier)}
                            </div>
                          </div>
                          <span className="font-medium">{tierData.tier}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Monthly Requests</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <span className="font-bold text-lg">
                          {formatNumber(tierData.monthlyRequestLimit)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Daily Requests</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <span className="font-bold text-lg">
                          {formatNumber(tierData.dailyRequestLimit)}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Rate Limit (per minute)</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <span className="font-bold text-lg">
                          {tierData.rateLimitPerMinute}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Wedding Season Bonus</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <span className="font-medium text-purple-600">
                          {getWeddingSeasonBenefit(tierData)}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">
                      Pricing Detail
                    </th>
                    {sortedTiers.map((tierData) => (
                      <th key={tierData.tier} className="text-center p-4">
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={`p-2 rounded-lg ${getTierColor(tierData.tier)}`}
                          >
                            <div className={getTierTextColor(tierData.tier)}>
                              {getTierIcon(tierData.tier)}
                            </div>
                          </div>
                          <span className="font-medium">{tierData.tier}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Monthly Price</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            ${tierData.price}
                          </span>
                          <span className="text-gray-600 block text-sm">
                            /month
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Cost per 1K Requests</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <span className="font-medium">
                          {tierData.price === 0
                            ? 'Free'
                            : `$${((tierData.price / tierData.monthlyRequestLimit) * 1000).toFixed(3)}`}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b">
                    <td className="p-4 font-medium">Value Score</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        <div className="flex items-center justify-center">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-4 h-4 ${
                                i < getValueScore(tierData)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="p-4 font-medium">Action</td>
                    {sortedTiers.map((tierData) => (
                      <td key={tierData.tier} className="text-center p-4">
                        {isCurrentTier(tierData.tier) ? (
                          <Badge variant="secondary">Current Plan</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={
                              isRecommended(tierData.tier)
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() => {
                              onUpgrade?.(tierData.tier);
                              onSelectTier?.(tierData.tier);
                            }}
                            className="w-full"
                          >
                            {isRecommended(tierData.tier) && (
                              <ArrowUpIcon className="w-4 h-4 mr-1" />
                            )}
                            {isRecommended(tierData.tier)
                              ? 'Upgrade'
                              : 'Select'}
                          </Button>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>

      {/* Wedding Season CTA */}
      {isWeddingSeason && (
        <CardContent className="pt-0">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUpIcon className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-purple-900">
                    Limited Time: Wedding Season Bonus
                  </h4>
                  <p className="text-sm text-purple-700">
                    All paid plans get {seasonalMultiplier}x requests during
                    peak wedding season
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <InfoIcon className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-600">Auto-applied</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
